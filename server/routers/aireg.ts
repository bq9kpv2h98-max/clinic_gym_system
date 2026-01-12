import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { airegApiClient, type AiregTransaction } from "../services/airegService";
import { getDb } from "../db.js";
import { sales, customers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * エアレジAPI連携ルーター
 */
export const airegRouter = router({
  /**
   * エアレジから売上データを取得して同期
   */
  syncSalesData: protectedProcedure
    .input(
      z.object({
        startDate: z.string().describe("開始日（YYYY-MM-DD形式）"),
        endDate: z.string().describe("終了日（YYYY-MM-DD形式）"),
      })
    )
    .mutation(async ({ input }) => {
      const { startDate, endDate } = input;

      try {
        // エアレジAPIから売上データを取得
        const response = await airegApiClient.getSalesData(startDate, endDate);

        if (!response.success) {
          throw new Error("Failed to fetch sales data from Aireg API");
        }

        const transactions = response.data.transactions;
        let syncedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        // 各トランザクションをデータベースに保存
        for (const transaction of transactions) {
          try {
            await syncTransaction(transaction);
            syncedCount++;
          } catch (error) {
            console.error(`Failed to sync transaction ${transaction.transactionId}:`, error);
            errors.push(`Transaction ${transaction.transactionId}: ${error instanceof Error ? error.message : "Unknown error"}`);
            skippedCount++;
          }
        }

        return {
          success: true,
          message: `同期完了: ${syncedCount}件成功, ${skippedCount}件スキップ`,
          syncedCount,
          skippedCount,
          totalCount: transactions.length,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (error) {
        console.error("Error syncing sales data:", error);
        throw new Error(`売上データの同期に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  /**
   * 最後の同期日時を取得
   */
  getLastSyncTime: protectedProcedure.query(async () => {
    // 最新の売上データの作成日時を取得
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const latestSale = await db
      .select()
      .from(sales)
      .orderBy(sales.createdAt)
      .limit(1);

    return {
      lastSyncTime: latestSale[0]?.createdAt || null,
    };
  }),

  /**
   * エアレジAPI接続テスト
   */
  testConnection: protectedProcedure.query(async () => {
    try {
      // 今日の日付で1件だけ取得してテスト
      const today = new Date().toISOString().split("T")[0];
      const response = await airegApiClient.getSalesData(today, today, 1, 1);

      return {
        success: response.success,
        message: response.success
          ? "エアレジAPIに正常に接続できました"
          : "エアレジAPIへの接続に失敗しました",
      };
    } catch (error) {
      console.error("Error testing Aireg API connection:", error);
      return {
        success: false,
        message: `接続テストに失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }),
});

/**
 * トランザクションをデータベースに同期
 */
async function syncTransaction(transaction: AiregTransaction): Promise<void> {
  // 電話番号から顧客を検索
  let customerId: number | null = null;

  if (transaction.customerPhone) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const existingCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, transaction.customerPhone))
      .limit(1);

    if (existingCustomers.length > 0) {
      customerId = existingCustomers[0].id;
    }
  }

  // 売上データを挿入（重複チェック）
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existingSales = await db
    .select()
    .from(sales)
    .where(eq(sales.transactionId, transaction.transactionId))
    .limit(1);

  if (existingSales.length > 0) {
    // すでに同期済みの場合はスキップ
    console.log(`Transaction ${transaction.transactionId} already synced, skipping...`);
    return;
  }

  // 新しい売上データを挿入
  const saleDate = new Date(transaction.transactionDate);
  const saleTime = saleDate.toTimeString().split(" ")[0]; // HH:MM:SS
  
  await db.insert(sales).values({
    saleId: `SALE-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    facilityId: transaction.storeId,
    customerId: customerId ? String(customerId) : undefined,
    transactionId: transaction.transactionId,
    amount: transaction.totalAmount,
    taxAmount: transaction.taxAmount,
    paymentMethod: transaction.paymentMethod as "cash" | "credit_card" | "qr_code" | "other",
    itemCount: transaction.items.length,
    discountAmount: 0,
    saleDate: new Date(saleDate.toISOString().split("T")[0]),
    saleTime: saleTime,
    syncedAt: new Date(),
    createdAt: new Date(),
  });

  console.log(`Transaction ${transaction.transactionId} synced successfully`);
}
