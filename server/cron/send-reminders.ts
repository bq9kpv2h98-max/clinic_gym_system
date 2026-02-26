import { getConfirmedReservationsForTomorrow } from "../notion";
import { sendReservationReminder } from "../_core/line";
import { getDb } from "../db";
import { cronJobLogs } from "../../drizzle/schema";

/**
 * 予約リマインダーcronジョブ
 * 毎日午前9時に実行され、翌日の確定済み予約の顧客にLINE通知を送信します
 */
export async function sendReservationReminders() {
  const startTime = Date.now();
  const jobName = "send-reminders";
  
  console.log(`[${jobName}] Starting reservation reminder job...`);

  try {
    // Notion予約履歴から翌日の確定済み予約を取得
    const reservations = await getConfirmedReservationsForTomorrow();
    
    console.log(`[${jobName}] Found ${reservations.length} reservations for tomorrow`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // 各予約にリマインダーを送信
    for (const reservation of reservations) {
      try {
        // 顧客の電話番号がない場合はスキップ
        if (!reservation.customerPhone) {
          console.log(`[${jobName}] Skipping reservation ${reservation.id} - no customer phone`);
          errorCount++;
          errors.push(`予約ID ${reservation.id}: 顧客の電話番号がありません`);
          continue;
        }

        // LINE通知を送信
        const success = await sendReservationReminder({
          customerPhone: reservation.customerPhone,
          customerName: reservation.customerName,
          serviceType: reservation.serviceType,
          reservationDateTime: reservation.reservationDateTime,
          notes: reservation.notes,
        });

        if (success) {
          successCount++;
          console.log(`[${jobName}] Reminder sent to ${reservation.customerName}`);
        } else {
          errorCount++;
          errors.push(`予約ID ${reservation.id}: LINE通知の送信に失敗しました`);
          console.error(`[${jobName}] Failed to send reminder to ${reservation.customerName}`);
        }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`予約ID ${reservation.id}: ${errorMessage}`);
        console.error(`[${jobName}] Error sending reminder:`, error);
      }
    }

    const completedAt = new Date();
    const duration = Date.now() - startTime;
    const status = errorCount === 0 ? "success" : "failed";

    // cronジョブ実行履歴を記録
    const db = await getDb();
    if (db) {
      await db.insert(cronJobLogs).values({
        logId: `send-reminders-${Date.now()}`,
        jobName,
        jobDescription: "予約リマインダー送信",
        status,
        startTime: new Date(startTime),
        endTime: completedAt,
        duration,
        successCount,
        errorCount,
        errorMessage: errors.length > 0 ? errors[0] : null,
        details: errors.length > 0 ? JSON.stringify(errors) : null,
      });
    }

    console.log(`[${jobName}] Job completed: ${successCount} success, ${errorCount} errors, ${duration}ms`);
  } catch (error) {
    const completedAt = new Date();
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // エラーログを記録
    const db = await getDb();
    if (db) {
      await db.insert(cronJobLogs).values({
        logId: `send-reminders-err-${Date.now()}`,
        jobName,
        jobDescription: "予約リマインダー送信",
        status: "failed",
        startTime: new Date(startTime),
        endTime: completedAt,
        duration,
        successCount: 0,
        errorCount: 1,
        errorMessage,
        details: JSON.stringify([errorMessage]),
      });
    }

    console.error(`[${jobName}] Job failed:`, error);
  }
}

// 直接実行された場合（手動実行）
if (import.meta.url === `file://${process.argv[1]}`) {
  sendReservationReminders()
    .then(() => {
      console.log("Reservation reminder job completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Reservation reminder job failed:", error);
      process.exit(1);
    });
}
