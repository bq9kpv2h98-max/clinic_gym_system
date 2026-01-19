import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customers, visits, reservations, pointTransactions } from "../../drizzle/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getNotionReservationsByCustomer } from "../notion";

/**
 * NotionステータスをシステムステータスID に変換
 */
function convertNotionStatusToSystem(notionStatus: string): string {
  const mapping: Record<string, string> = {
    "予定中": "pending",
    "来店待ち": "confirmed",
    "完了": "completed",
    "キャンセル": "cancelled",
    "キャンセル済み": "cancelled",
  };
  return mapping[notionStatus] || "pending";
}

export const mypageRouter = router({
  /**
   * 電話番号でログイン
   */
  login: publicProcedure
    .input(
      z.object({
        phone: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, input.phone))
        .limit(1)
        .then((rows) => rows[0]);

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "登録されていない電話番号です" });
      }

      return {
        customerId: customer.customerId,
        fullName: customer.fullName,
        totalPoints: customer.totalPoints,
      };
    }),

  /**
   * マイページデータ取得
   */
  getMyPageData: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, input.customerId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "顧客が見つかりません" });
      }

      // 来院履歴を取得
      const visitHistory = await db
        .select()
        .from(visits)
        .where(eq(visits.customerId, input.customerId))
        .orderBy(desc(visits.visitDate))
        .limit(10);

      // システム内の予約を取得
      const systemReservations = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.customerId, input.customerId),
            or(
              eq(reservations.status, "pending"),
              eq(reservations.status, "confirmed")
            )
          )
        )
        .orderBy(desc(reservations.createdAt))
        .limit(5);

      // Notionから予約を取得
      const notionReservations = await getNotionReservationsByCustomer(customer.fullName);

      // Notion予約をシステム形式に変換
      const convertedNotionReservations = notionReservations.map((nr: any) => ({
        reservationId: nr.id,
        customerId: input.customerId,
        status: convertNotionStatusToSystem(nr.status),
        firstChoiceDate: new Date(nr.reservationDate),
        firstChoiceTimeSlot: "",
        confirmedDate: nr.status === "来店待ち" || nr.status === "完了" ? new Date(nr.reservationDate) : null,
        confirmedTimeSlot: "",
        notes: nr.notes,
        createdAt: new Date(nr.reservationDate),
        notionUrl: nr.url,
      }));

      // システム予約とNotion予約を統合
      const upcomingReservations = [...systemReservations, ...convertedNotionReservations]
        .sort((a, b) => {
          const dateA = a.confirmedDate || a.firstChoiceDate;
          const dateB = b.confirmedDate || b.firstChoiceDate;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
        .slice(0, 5);

      // ポイント履歴を取得
      const pointHistory = await db
        .select()
        .from(pointTransactions)
        .where(eq(pointTransactions.customerId, input.customerId))
        .orderBy(desc(pointTransactions.createdAt))
        .limit(20);

      return {
        customer,
        visitHistory,
        upcomingReservations,
        pointHistory,
      };
    }),

  /**
   * 来院履歴取得
   */
  getVisitHistory: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
        limit: z.number().default(10),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const visitHistory = await db
        .select()
        .from(visits)
        .where(eq(visits.customerId, input.customerId))
        .orderBy(desc(visits.visitDate))
        .limit(input.limit)
        .offset(input.offset);

      return visitHistory;
    }),

  /**
   * ポイント残高取得
   */
  getPointBalance: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const customer = await db
        .select({
          totalPoints: customers.totalPoints,
          lifetimePoints: customers.lifetimePoints,
        })
        .from(customers)
        .where(eq(customers.customerId, input.customerId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "顧客が見つかりません" });
      }

      return customer;
    }),

  /**
   * 予約履歴取得
   */
  getReservationHistory: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
        limit: z.number().default(10),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const reservationHistory = await db
        .select()
        .from(reservations)
        .where(eq(reservations.customerId, input.customerId))
        .orderBy(desc(reservations.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return reservationHistory;
    }),
});
