/**
 * 予約前日リマインダーAPI
 * 
 * スケジュールタスクから毎日20時に呼び出され、
 * 翌日に確定予約がある顧客へリマインダーメールを送信します。
 */

import { router, publicProcedure } from "../_core/trpc";
import { getTomorrowConfirmedReservations } from "../db/reservations";
import { sendReservationReminderEmail } from "../_core/email";

export const reminderRouter = router({
  /**
   * 翌日の確定予約に対してリマインダーメールを送信
   * スケジュールタスクから呼び出されるため publicProcedure を使用
   */
  sendTomorrowReminders: publicProcedure
    .mutation(async () => {
      const reservations = await getTomorrowConfirmedReservations();

      let sent = 0;
      let skipped = 0;
      let failed = 0;

      for (const reservation of reservations) {
        if (!reservation.customerEmail) {
          skipped++;
          continue;
        }
        if (!reservation.confirmedDate || !reservation.confirmedTimeSlot) {
          skipped++;
          continue;
        }

        try {
          const success = await sendReservationReminderEmail({
            to: reservation.customerEmail,
            customerName: reservation.customerName,
            reservationId: reservation.reservationId,
            confirmedDate: reservation.confirmedDate,
            confirmedTimeSlot: reservation.confirmedTimeSlot,
          });

          if (success) {
            sent++;
            console.log(`[Reminder] Sent to ${reservation.customerEmail} (${reservation.reservationId})`);
          } else {
            failed++;
            console.error(`[Reminder] Failed to send to ${reservation.customerEmail}`);
          }
        } catch (err) {
          failed++;
          console.error(`[Reminder] Error sending to ${reservation.customerEmail}:`, err);
        }
      }

      console.log(`[Reminder] Done: ${sent} sent, ${skipped} skipped, ${failed} failed`);
      return { success: true, sent, skipped, failed, total: reservations.length };
    }),
});
