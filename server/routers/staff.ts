import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customers, visits } from "../../drizzle/schema";
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

  // 来院記録を登録
  recordVisit: publicProcedure
    .input(
      z.object({
        customerId: z.string().min(1),
        pointsEarned: z.number().int().min(0).default(10),
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
          pointsEarned: input.pointsEarned,
        });

      // 顧客のポイント残高を更新
      await db
        .update(customers)
        .set({
          totalPoints: customer.totalPoints + input.pointsEarned,
        })
        .where(eq(customers.customerId, input.customerId));

      return {
        visitId,
        pointsEarned: input.pointsEarned,
        newTotalPoints: customer.totalPoints + input.pointsEarned,
      };
    }),
});
