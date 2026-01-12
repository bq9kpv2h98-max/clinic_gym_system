import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sales, dailySalesAggregation, airRegSyncLogs } from "../../drizzle/schema";
import { AiregClient, fetchAndSyncSalesData } from "../integrations/aireg";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export const salesRouter = router({
  /**
   * 売上データを取得（日付範囲指定）
   */
  getSales: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.facilityId, input.facilityId),
            sql`DATE(${sales.saleDate}) >= ${input.fromDate}`,
            sql`DATE(${sales.saleDate}) <= ${input.toDate}`
          )
        )
        .orderBy(sales.saleDate);

      return result;
    }),

  /**
   * 日次売上集計を取得
   */
  getDailySalesAggregation: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(dailySalesAggregation)
        .where(
          and(
            eq(dailySalesAggregation.facilityId, input.facilityId),
            sql`DATE(${dailySalesAggregation.saleDate}) >= ${input.fromDate}`,
            sql`DATE(${dailySalesAggregation.saleDate}) <= ${input.toDate}`
          )
        )
        .orderBy(dailySalesAggregation.saleDate);

      return result;
    }),

  /**
   * エアレジから売上データを同期
   */
  syncSalesFromAireg: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        airRegStoreId: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const syncId = nanoid();
      const syncStartTime = new Date();

      try {
        // エアレジからデータを取得
        const airegData = await fetchAndSyncSalesData(
          input.airRegStoreId,
          input.fromDate,
          input.toDate
        );

        let recordsSucceeded = 0;
        let recordsFailed = 0;

        // 取得したデータをDBに保存
        if (airegData && Array.isArray(airegData)) {
          for (const saleData of airegData) {
            try {
              const saleId = nanoid();
              const saleDate = saleData.date || new Date().toISOString().split("T")[0];
              const saleTime = saleData.time || "00:00:00";

              await db.insert(sales).values({
                saleId,
                facilityId: input.facilityId,
                customerId: saleData.customerId || undefined,
                transactionId: saleData.transactionId || saleId,
                amount: Math.round(saleData.amount || 0),
                paymentMethod: saleData.paymentMethod || "cash",
                itemCount: saleData.itemCount || 0,
                taxAmount: Math.round(saleData.taxAmount || 0),
                discountAmount: Math.round(saleData.discountAmount || 0),
                notes: saleData.notes || undefined,
                saleDate,
                saleTime,
              });

              recordsSucceeded++;
            } catch (error) {
              console.error("Failed to save sale record:", error);
              recordsFailed++;
            }
          }
        }

        // 同期ログを記録
        await db.insert(airRegSyncLogs).values({
          syncId,
          facilityId: input.facilityId,
          syncType: "incremental",
          status: "success",
          recordsProcessed: airegData?.length || 0,
          recordsSucceeded,
          recordsFailed,
          syncStartTime,
          syncEndTime: new Date(),
        });

        return {
          success: true,
          syncId,
          recordsProcessed: airegData?.length || 0,
          recordsSucceeded,
          recordsFailed,
        };
      } catch (error) {
        // エラーログを記録
        await db.insert(airRegSyncLogs).values({
          syncId,
          facilityId: input.facilityId,
          syncType: "incremental",
          status: "failed",
          recordsProcessed: 0,
          recordsSucceeded: 0,
          recordsFailed: 0,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          syncStartTime,
          syncEndTime: new Date(),
        });

        throw error;
      }
    }),

  /**
   * 日次売上集計を計算して保存
   */
  aggregateDailySales: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        saleDate: z.string(), // YYYY-MM-DD
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // その日の売上データを取得
      const daySales = await db
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.facilityId, input.facilityId),
            sql`DATE(${sales.saleDate}) = ${input.saleDate}`
          )
        );

      if (daySales.length === 0) {
        return { success: false, message: "No sales data for this date" };
      }

      // 集計を計算
      const totalSales = daySales.reduce((sum, s) => sum + s.amount, 0);
      const totalTransactions = daySales.length;
      const uniqueCustomers = new Set(
        daySales.map((s) => s.customerId).filter(Boolean)
      ).size;
      const averageTransactionAmount =
        totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0;
      const totalTax = daySales.reduce((sum, s) => sum + s.taxAmount, 0);
      const totalDiscount = daySales.reduce((sum, s) => sum + s.discountAmount, 0);

      // 支払い方法別集計
      const paymentMethodBreakdown: Record<string, number> = {};
      for (const sale of daySales) {
        paymentMethodBreakdown[sale.paymentMethod] =
          (paymentMethodBreakdown[sale.paymentMethod] || 0) + sale.amount;
      }

      const aggregationId = nanoid();

      // 斲存の集計があれば削除
      await db
        .delete(dailySalesAggregation)
        .where(
          and(
            eq(dailySalesAggregation.facilityId, input.facilityId),
            sql`DATE(${dailySalesAggregation.saleDate}) = ${input.saleDate}`
          )
        );

      // 新しい集計を保存
      await db.insert(dailySalesAggregation).values({
        aggregationId,
        facilityId: input.facilityId,
        saleDate: new Date(input.saleDate),
        totalSales,
        totalTransactions,
        totalCustomers: uniqueCustomers,
        averageTransactionAmount,
        totalTax,
        totalDiscount,
        paymentMethodBreakdown: JSON.stringify(paymentMethodBreakdown),
      });

      return {
        success: true,
        aggregationId,
        totalSales,
        totalTransactions,
        totalCustomers: uniqueCustomers,
        averageTransactionAmount,
      };
    }),

  /**
   * 月次売上集計を取得
   */
  getMonthlySalesSummary: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        year: z.number(),
        month: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const fromDate = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
      const toDate = new Date(input.year, input.month, 0)
        .toISOString()
        .split("T")[0];

      const monthlySales = await db
        .select()
        .from(dailySalesAggregation)
        .where(
          and(
            eq(dailySalesAggregation.facilityId, input.facilityId),
            sql`DATE(${dailySalesAggregation.saleDate}) >= ${fromDate}`,
            sql`DATE(${dailySalesAggregation.saleDate}) <= ${toDate}`
          )
        );

      const totalSales = monthlySales.reduce((sum, s) => sum + s.totalSales, 0);
      const totalTransactions = monthlySales.reduce(
        (sum, s) => sum + s.totalTransactions,
        0
      );
      const totalCustomers = monthlySales.reduce(
        (sum, s) => sum + s.totalCustomers,
        0
      );
      const totalTax = monthlySales.reduce((sum, s) => sum + s.totalTax, 0);
      const totalDiscount = monthlySales.reduce(
        (sum, s) => sum + s.totalDiscount,
        0
      );

      return {
        year: input.year,
        month: input.month,
        totalSales,
        totalTransactions,
        totalCustomers,
        totalTax,
        totalDiscount,
        averageTransactionAmount:
          totalTransactions > 0
            ? Math.round(totalSales / totalTransactions)
            : 0,
        dailyBreakdown: monthlySales,
      };
    }),

  /**
   * 売上情報を更新
   */
  update: protectedProcedure
    .input(
      z.object({
        saleId: z.string(),
        amount: z.number(),
        paymentMethod: z.enum(["cash", "credit_card", "qr_code", "other"]),
        saleDate: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(sales)
        .set({
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          saleDate: input.saleDate,
        })
        .where(eq(sales.saleId, input.saleId));

      return { success: true };
    }),

  /**
   * 売上を削除
   */
  delete: protectedProcedure
    .input(
      z.object({
        saleId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(sales).where(eq(sales.saleId, input.saleId));

      return { success: true };
    }),

  /**
   * 全売上データを取得
   */
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.select().from(sales).orderBy(sales.saleDate);

    return result;
  }),
});
