import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customers, notionSyncLogs } from "../../drizzle/schema";
import { eq, isNull, or, like, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  searchNotionCustomersByName,
  getNotionCustomerDetails,
  updateNotionCustomer,
} from "../notion";
import { nanoid } from "nanoid";
import { desc } from "drizzle-orm";

export const notionLinkRouter = router({
  /**
   * Notionと未連携の顧客一覧を取得
   */
  getUnlinkedCustomers: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 検索条件を構築
      const conditions = [
        or(
          isNull(customers.notionPageUrl),
          eq(customers.notionPageUrl, "")
        )
      ];

      if (input.search) {
        conditions.push(
          or(
            like(customers.fullName, `%${input.search}%`),
            like(customers.phone, `%${input.search}%`),
            like(customers.email, `%${input.search}%`)
          )
        );
      }

      const unlinkedCustomers = await db
        .select()
        .from(customers)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .limit(input.limit)
        .offset(input.offset);

      return unlinkedCustomers;
    }),

  /**
   * Notion顧客を検索
   */
  searchNotionCustomers: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const notionCustomers = await searchNotionCustomersByName(input.name);
      return notionCustomers;
    }),

  /**
   * Notion顧客の詳細を取得
   */
  getNotionCustomerDetails: protectedProcedure
    .input(
      z.object({
        pageId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const details = await getNotionCustomerDetails(input.pageId);
      if (!details) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notion顧客が見つかりません" });
      }
      return details;
    }),

  /**
   * 既存顧客とNotion顧客を紐付け
   */
  linkCustomerToNotion: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        notionPageId: z.string(),
        notionPageUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 顧客が存在するか確認
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, input.customerId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "顧客が見つかりません" });
      }

      // Notion顧客情報を取得
      const notionCustomer = await getNotionCustomerDetails(input.notionPageId);
      if (!notionCustomer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notion顧客が見つかりません" });
      }

      // 紐付けを保存
      await db
        .update(customers)
        .set({
          notionPageUrl: input.notionPageUrl,
          notionPageId: input.notionPageId,
        })
        .where(eq(customers.customerId, input.customerId));

      return {
        success: true,
        message: "顧客とNotionを紐付けました",
      };
    }),

  /**
   * 紐付けを解除
   */
  unlinkCustomerFromNotion: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(customers)
        .set({
          notionPageUrl: null,
          notionPageId: null,
        })
        .where(eq(customers.customerId, input.customerId));

      return {
        success: true,
        message: "紐付けを解除しました",
      };
    }),

  /**
   * Notionから顧客情報を同期
   */
  syncCustomerFromNotion: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 顧客情報を取得
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, input.customerId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "顧客が見つかりません" });
      }

      if (!customer.notionPageId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Notionと紐付けられていません" });
      }

      // Notionから最新情報を取得
      const notionCustomer = await getNotionCustomerDetails(customer.notionPageId);
      if (!notionCustomer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notion顧客が見つかりません" });
      }

      // システムの顧客情報を更新
      const updates: any = {};
      
      if (notionCustomer.phone && notionCustomer.phone !== customer.phone) {
        updates.phone = notionCustomer.phone;
      }
      
      if (notionCustomer.email && notionCustomer.email !== customer.email) {
        updates.email = notionCustomer.email;
      }

      if (Object.keys(updates).length > 0) {
        await db
          .update(customers)
          .set(updates)
          .where(eq(customers.customerId, input.customerId));
      }

      return {
        success: true,
        message: "Notionから顧客情報を同期しました",
        updatedFields: Object.keys(updates),
      };
    }),

  /**
   * 同期履歴一覧を取得
   */
  getSyncLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const logs = await db
        .select()
        .from(notionSyncLogs)
        .orderBy(desc(notionSyncLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return logs;
    }),

  /**
   * 全ての紐付け済み顧客をNotionから同期
   */
  syncAllCustomersFromNotion: protectedProcedure.mutation(async () => {
    const startTime = Date.now();
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Notionと紐付けられている顧客を取得
    const linkedCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.notionPageId, customers.notionPageId)); // notionPageIdがnullでない

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const customer of linkedCustomers) {
      if (!customer.notionPageId) continue;

      try {
        // Notionから最新情報を取得
        const notionCustomer = await getNotionCustomerDetails(customer.notionPageId);
        if (!notionCustomer) {
          errorCount++;
          errors.push(`${customer.fullName}: Notion顧客が見つかりません`);
          continue;
        }

        // システムの顧客情報を更新
        const updates: any = {};
        
        if (notionCustomer.phone && notionCustomer.phone !== customer.phone) {
          updates.phone = notionCustomer.phone;
        }
        
        if (notionCustomer.email && notionCustomer.email !== customer.email) {
          updates.email = notionCustomer.email;
        }

        if (Object.keys(updates).length > 0) {
          await db
            .update(customers)
            .set(updates)
            .where(eq(customers.customerId, customer.customerId));
          successCount++;
        }
      } catch (error) {
        errorCount++;
        errors.push(`${customer.fullName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 同期履歴をデータベースに記録
    const executionTime = Date.now() - startTime;
    const syncId = nanoid();
    
    try {
      await db.insert(notionSyncLogs).values({
        syncId,
        syncType: "manual",
        status: errorCount === 0 ? "success" : (successCount > 0 ? "partial" : "failed"),
        totalCustomers: linkedCustomers.length,
        successCount,
        errorCount,
        updatedFields: JSON.stringify({}),
        errors: JSON.stringify(errors),
        executionTime,
      });
    } catch (error) {
      console.error("[同期履歴記録エラー]", error);
    }

    return {
      success: true,
      message: `${successCount}件の顧客情報を同期しました`,
      successCount,
      errorCount,
      errors,
    };
  }),
});
