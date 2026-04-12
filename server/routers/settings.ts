import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { syncNotionReservationsToDB } from "../notionSync";
import { getDb } from "../db";
import { clinicSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const CLOSED_DAYS_KEY = "closedDays";
const CUTOFF_HOURS_KEY = "bookingCutoffHours";
const BLOCKED_DATES_KEY = "blockedDates";

// 設定値を取得するヘルパー
async function getSetting(key: string, defaultValue: unknown) {
  const db = await getDb();
  if (!db) return defaultValue;
  const row = await db.select().from(clinicSettings).where(eq(clinicSettings.key, key)).limit(1);
  if (row.length === 0) return defaultValue;
  try {
    return JSON.parse(row[0].value);
  } catch {
    return defaultValue;
  }
}

// 設定値を保存するヘルパー
async function upsertSetting(key: string, value: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const jsonValue = JSON.stringify(value);
  const existing = await db.select().from(clinicSettings).where(eq(clinicSettings.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(clinicSettings).set({ value: jsonValue }).where(eq(clinicSettings.key, key));
  } else {
    await db.insert(clinicSettings).values({ key, value: jsonValue });
  }
}

export const settingsRouter = router({
  // 全設定を取得（公開 - 予約フォームから参照するため）
  getClinicSettings: publicProcedure.query(async () => {
    const closedDays = (await getSetting(CLOSED_DAYS_KEY, [0])) as number[];
    const bookingCutoffHours = (await getSetting(CUTOFF_HOURS_KEY, 4)) as number;
    const blockedDates = (await getSetting(BLOCKED_DATES_KEY, [])) as string[];
    return { closedDays, bookingCutoffHours, blockedDates };
  }),

  // 定休日設定を更新（管理者のみ）
  updateClosedDays: protectedProcedure
    .input(z.object({ closedDays: z.array(z.number().min(0).max(6)) }))
    .mutation(async ({ input }) => {
      await upsertSetting(CLOSED_DAYS_KEY, input.closedDays);
      return { success: true, closedDays: input.closedDays };
    }),

  // 受付締切時間を更新（管理者のみ）
  updateBookingCutoffHours: protectedProcedure
    .input(z.object({ hours: z.number().min(0).max(72) }))
    .mutation(async ({ input }) => {
      await upsertSetting(CUTOFF_HOURS_KEY, input.hours);
      return { success: true, hours: input.hours };
    }),

  // 臨時休業日（ブロック日）を追加（管理者のみ）
  addBlockedDate: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .mutation(async ({ input }) => {
      const current = (await getSetting(BLOCKED_DATES_KEY, [])) as string[];
      if (!current.includes(input.date)) {
        current.push(input.date);
        current.sort();
        await upsertSetting(BLOCKED_DATES_KEY, current);
      }
      return { success: true, blockedDates: current };
    }),

  // 臨時休業日を削除（管理者のみ）
  removeBlockedDate: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .mutation(async ({ input }) => {
      const current = (await getSetting(BLOCKED_DATES_KEY, [])) as string[];
      const updated = current.filter((d) => d !== input.date);
      await upsertSetting(BLOCKED_DATES_KEY, updated);
      return { success: true, blockedDates: updated };
    }),

  // Notion予約DBを手動同期（管理者のみ）
  syncNotionReservations: protectedProcedure.mutation(async () => {
    const result = await syncNotionReservationsToDB();
    return result;
  }),
});
