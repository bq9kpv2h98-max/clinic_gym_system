/**
 * Cronジョブスケジューラー
 * 
 * 定期的に実行されるジョブを管理します。
 */

import cron from "node-cron";
import { syncNotionCustomers } from "../cron/sync-notion-customers";
import { linkReservationsAutomatically } from "../cron/link-reservations";
import { cleanupOldLogs } from "../cron/cleanup-old-logs";

export function initializeScheduler() {
  console.log("[Scheduler] Initializing cron jobs...");

  // Notion顧客情報の同期（毎日午前3時に実行）
  cron.schedule("0 3 * * *", async () => {
    console.log("[Scheduler] Starting Notion customer sync...");
    try {
      await syncNotionCustomers("scheduled");
      console.log("[Scheduler] Notion customer sync completed");
    } catch (error) {
      console.error("[Scheduler] Notion customer sync failed:", error);
    }
  });

  // Notion予約紐付け（毎日午前4時に実行）
  cron.schedule("0 4 * * *", async () => {
    console.log("[Scheduler] Starting reservation linking...");
    try {
      await linkReservationsAutomatically();
      console.log("[Scheduler] Reservation linking completed");
    } catch (error) {
      console.error("[Scheduler] Reservation linking failed:", error);
    }
  });

  // 古いログ削除（毎日午前2時に実行）
  cron.schedule("0 2 * * *", async () => {
    console.log("[Scheduler] Starting old logs cleanup...");
    try {
      await cleanupOldLogs();
      console.log("[Scheduler] Old logs cleanup completed");
    } catch (error) {
      console.error("[Scheduler] Old logs cleanup failed:", error);
    }
  });

  console.log("[Scheduler] Cron jobs initialized");
  console.log("  - Old logs cleanup: Daily at 2:00 AM");
  console.log("  - Notion customer sync: Daily at 3:00 AM");
  console.log("  - Reservation linking: Daily at 4:00 AM");
}
