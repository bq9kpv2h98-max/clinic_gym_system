import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { syncNotionReservationsToDB } from "../notionSync";
import { getDb } from "../db";
import { clinicSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const CLOSED_DAYS_KEY = "closedDays";

export const settingsRouter = router({
  // 定休日設定を取得（公開 - 予約フォームから参照するため）
  getClinicSettings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { closedDays: [0] };

    const row = await db
      .select()
      .from(clinicSettings)
      .where(eq(clinicSettings.key, CLOSED_DAYS_KEY))
      .limit(1);

    if (row.length === 0) {
      return { closedDays: [0] }; // デフォルト: 日曜定休
    }

    try {
      const closedDays = JSON.parse(row[0].value) as number[];
      return { closedDays };
    } catch {
      return { closedDays: [0] };
    }
  }),

  // 定休日設定を更新（管理者のみ）
  updateClosedDays: protectedProcedure
    .input(
      z.object({
        closedDays: z.array(z.number().min(0).max(6)),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const value = JSON.stringify(input.closedDays);

      const existing = await db
        .select()
        .from(clinicSettings)
        .where(eq(clinicSettings.key, CLOSED_DAYS_KEY))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(clinicSettings)
          .set({ value })
          .where(eq(clinicSettings.key, CLOSED_DAYS_KEY));
      } else {
        await db.insert(clinicSettings).values({
          key: CLOSED_DAYS_KEY,
          value,
        });
      }

      return { success: true, closedDays: input.closedDays };
    }),

  // Notion予約DBを手動同期（管理者のみ）
  syncNotionReservations: protectedProcedure.mutation(async () => {
    const result = await syncNotionReservationsToDB();
    return result;
  }),
});
