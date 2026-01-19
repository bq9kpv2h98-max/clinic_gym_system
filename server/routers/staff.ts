import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customers, visits, pointTransactions } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export const staffRouter = router({
  // QRコードから顧客情報を取得
  getCustomerByQR: publicProcedure
    .input(
      z.object({
        customerId: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 顧客情報を取得
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, input.customerId))
        .limit(1);

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "顧客が見つかりません",
        });
      }

      // 来院履歴を取得
      const visitHistory = await db
        .select()
        .from(visits)
        .where(eq(visits.customerId, input.customerId))
        .orderBy(desc(visits.visitDate))
        .limit(10);

      return {
        customer,
        visitHistory,
      };
    }),

  // 来院記録を登録（ポイント付与なし）
  recordVisit: publicProcedure
    .input(
      z.object({
        customerId: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 顧客が存在するか確認
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, input.customerId))
        .limit(1);

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "顧客が見つかりません",
        });
      }

      // 来院記録を登録
      const visitId = nanoid();
      await db
        .insert(visits)
        .values({
          visitId,
          customerId: input.customerId,
          visitDate: new Date(),
        });

      return {
        visitId,
      };
    }),

  // ポイント付与
  addPoints: publicProcedure
    .input(
      z.object({
        customerId: z.string().min(1),
        points: z.number().int().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 顧客が存在するか確認
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, input.customerId))
        .limit(1);

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "顧客が見つかりません",
        });
      }

      const newTotalPoints = customer.totalPoints + input.points;

      // ポイント取引履歴を記録
      const transactionId = nanoid();
      await db
        .insert(pointTransactions)
        .values({
          transactionId,
          customerId: input.customerId,
          transactionType: "earn",
          points: input.points,
          balanceAfter: newTotalPoints,
          description: input.description || "ポイント付与",
        });

      // 顧客のポイント残高を更新
      await db
        .update(customers)
        .set({
          totalPoints: newTotalPoints,
          lifetimePoints: customer.lifetimePoints + input.points,
        })
        .where(eq(customers.customerId, input.customerId));

      return {
        transactionId,
        points: input.points,
        newTotalPoints,
      };
    }),

  // ポイント消化
  redeemPoints: publicProcedure
    .input(
      z.object({
        customerId: z.string().min(1),
        points: z.number().int().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 顧客が存在するか確認
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, input.customerId))
        .limit(1);

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "顧客が見つかりません",
        });
      }

      // ポイント残高が不足していないか確認
      if (customer.totalPoints < input.points) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ポイント残高が不足しています",
        });
      }

      const newTotalPoints = customer.totalPoints - input.points;

      // ポイント取引履歴を記録
      const transactionId = nanoid();
      await db
        .insert(pointTransactions)
        .values({
          transactionId,
          customerId: input.customerId,
          transactionType: "redeem",
          points: -input.points,
          balanceAfter: newTotalPoints,
          description: input.description || "ポイント使用",
        });

      // 顧客のポイント残高を更新
      await db
        .update(customers)
        .set({
          totalPoints: newTotalPoints,
        })
        .where(eq(customers.customerId, input.customerId));

      return {
        transactionId,
        points: input.points,
        newTotalPoints,
      };
    }),
});
