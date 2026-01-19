/**
 * Cronジョブスケジューラー
 * 
 * 定期的に実行されるジョブを管理します。
 */

import cron from "node-cron";
import { syncNotionCustomers } from "../cron/sync-notion-customers";
import { linkReservationsAutomatically } from "../cron/link-reservations";
import { cleanupOldLogs } from "../cron/cleanup-old-logs";
import { sendReservationReminders } from "../cron/send-reminders";
import { expirePoints } from "../cron/expire-points";
import { notifyExpiringPoints } from "../cron/notify-expiring-points";

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

  // 予約リマインダー送信（毎日午前9時に実行）
  cron.schedule("0 9 * * *", async () => {
    console.log("[Scheduler] Starting reservation reminders...");
    try {
      await sendReservationReminders();
      console.log("[Scheduler] Reservation reminders completed");
    } catch (error) {
      console.error("[Scheduler] Reservation reminders failed:", error);
    }
  });

  // ポイント有効期限事前通知（毎日午前10時に実行）
  cron.schedule("0 10 * * *", async () => {
    console.log("[Scheduler] Starting expiring points notification...");
    try {
      await notifyExpiringPoints();
      console.log("[Scheduler] Expiring points notification completed");
    } catch (error) {
      console.error("[Scheduler] Expiring points notification failed:", error);
    }
  });

  // 期限切れポイント自動失効（毎日午前11時に実行）
  cron.schedule("0 11 * * *", async () => {
    console.log("[Scheduler] Starting expired points cleanup...");
    try {
      await expirePoints();
      console.log("[Scheduler] Expired points cleanup completed");
    } catch (error) {
      console.error("[Scheduler] Expired points cleanup failed:", error);
    }
  });

  console.log("[Scheduler] Cron jobs initialized");
  console.log("  - Old logs cleanup: Daily at 2:00 AM");
  console.log("  - Notion customer sync: Daily at 3:00 AM");
  console.log("  - Reservation linking: Daily at 4:00 AM");
  console.log("  - Reservation reminders: Daily at 9:00 AM");
  console.log("  - Expiring points notification: Daily at 10:00 AM");
  console.log("  - Expired points cleanup: Daily at 11:00 AM");
}
