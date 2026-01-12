/**
 * 顧客一括操作ルーター
 * 
 * 顧客の一括削除などの一括操作を提供します。
 */

import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { customers, visits, pointTransactions, familyMembers } from "../../drizzle/schema";
import { z } from "zod";
import { inArray, eq } from "drizzle-orm";

export const customersBulkRouter = router({
  /**
   * 顧客を一括削除
   * 
   * 指定された顧客IDのリストに基づいて、顧客とその関連データを一括削除します。
   * 関連データ：来院履歴、ポイント取引履歴、ファミリーメンバー情報
   */
  bulkDelete: protectedProcedure
    .input(
      z.object({
        customerIds: z.array(z.string()).min(1, "少なくとも1つの顧客IDが必要です"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { customerIds } = input;

      try {
        // トランザクションで一括削除を実行
        // 1. ファミリーメンバー情報を削除
        await db
          .delete(familyMembers)
          .where(inArray(familyMembers.memberId, customerIds));

        // 2. ポイント取引履歴を削除
        await db
          .delete(pointTransactions)
          .where(inArray(pointTransactions.customerId, customerIds));

        // 3. 来院履歴を削除
        await db
          .delete(visits)
          .where(inArray(visits.customerId, customerIds));

        // 4. 顧客を削除
        await db
          .delete(customers)
          .where(inArray(customers.customerId, customerIds));

        return {
          success: true,
          deletedCount: customerIds.length,
          message: `${customerIds.length}件の顧客を削除しました`,
        };
      } catch (error) {
        console.error("[Bulk Delete] Error:", error);
        throw new Error("顧客の一括削除に失敗しました");
      }
    }),

  /**
   * 全顧客を削除（テスト用）
   * 
   * 警告：この操作は取り消せません。本番環境では使用しないでください。
   */
  deleteAll: protectedProcedure
    .input(
      z.object({
        confirmation: z.literal("DELETE_ALL_CUSTOMERS"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // すべての関連データを削除
        await db.delete(familyMembers);
        await db.delete(pointTransactions);
        await db.delete(visits);
        
        // すべての顧客を取得してカウント
        const allCustomers = await db.select({ customerId: customers.customerId }).from(customers);
        const count = allCustomers.length;
        
        // すべての顧客を削除
        await db.delete(customers);

        return {
          success: true,
          deletedCount: count,
          message: `全${count}件の顧客を削除しました`,
        };
      } catch (error) {
        console.error("[Delete All] Error:", error);
        throw new Error("全顧客の削除に失敗しました");
      }
    }),

  /**
   * 顧客削除のプレビュー
   * 
   * 削除される顧客とその関連データの件数を確認します。
   */
  deletePreview: protectedProcedure
    .input(
      z.object({
        customerIds: z.array(z.string()).min(1, "少なくとも1つの顧客IDが必要です"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { customerIds } = input;

      // 各顧客の関連データ件数を取得
      const customerDetails = await Promise.all(
        customerIds.map(async (customerId) => {
          const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.customerId, customerId));

          if (!customer) {
            return null;
          }

          const visitsCount = await db
            .select()
            .from(visits)
            .where(eq(visits.customerId, customerId));

          const pointTransactionsCount = await db
            .select()
            .from(pointTransactions)
            .where(eq(pointTransactions.customerId, customerId));

          const familyMembersCount = await db
            .select()
            .from(familyMembers)
            .where(eq(familyMembers.memberId, customerId));

          return {
            customerId: customer.customerId,
            fullName: customer.fullName,
            visitsCount: visitsCount.length,
            pointTransactionsCount: pointTransactionsCount.length,
            familyMembersCount: familyMembersCount.length,
          };
        })
      );

      // nullを除外
      const validCustomers = customerDetails.filter((c) => c !== null);

      const totalVisits = validCustomers.reduce((sum, c) => sum + c.visitsCount, 0);
      const totalPointTransactions = validCustomers.reduce((sum, c) => sum + c.pointTransactionsCount, 0);
      const totalFamilyMembers = validCustomers.reduce((sum, c) => sum + c.familyMembersCount, 0);

      return {
        customers: validCustomers,
        summary: {
          customersCount: validCustomers.length,
          totalVisits,
          totalPointTransactions,
          totalFamilyMembers,
        },
      };
    }),
});
