/**
 * 予約管理tRPCルーター
 * 
 * 予約の作成、取得、更新、削除などのAPI endpointsを提供します。
 */

import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import HolidayJp from "@holiday-jp/holiday_jp";
import {
  createReservation,
  getReservationById,
  getReservationsByCustomerId,
  getReservationsByFacilityId,
  getReservationsByStatus,
  getReservationsByDateRange,
  updateReservation,
  updateReservationStatus,
  deleteReservation,
  findCustomerByPhone,
  getReservationWithCustomer,
  getReservationsWithCustomers,
} from "../db/reservations";
import { getDb } from "../db";
import { customers } from "../../drizzle/schema";
import QRCode from "qrcode";
import { storagePut } from "../storage";
import { eq } from "drizzle-orm";
import { sendReservationConfirmationEmail, sendReservationConfirmedEmail } from "../_core/email";
import { saveReservationToSheets } from "../_core/googleSheets";
import { getReservationAnalytics } from "../notion";
import {
  createNotionCalendarReservation,
  getNotionBlockedSlotsForDate,
  getNotionMonthlyAvailability,
  listNotionCalendarReservations,
  updateNotionCalendarReservation,
} from "../notionCalendar";
import { notifyOwner } from "../_core/notification";
import { siteConfig } from "../../shared/siteConfig";

function formatJstDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function getJstReservationWindow(date: Date, timeSlot: string): { startAt: Date; endAt: Date } {
  const match = timeSlot.match(/^(\d{1,2}):(\d{2})/);
  if (!match) throw new Error("予約時間の形式が正しくありません");
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes % siteConfig.slotIntervalMinutes !== 0) {
    throw new Error(`${siteConfig.slotIntervalMinutes}分刻みの時間を選択してください。`);
  }
  const jstDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (siteConfig.closedDays.includes(jstDate.getUTCDay()) || HolidayJp.isHoliday(jstDate)) {
    throw new Error("日曜・祝日は休業日のため予約できません。");
  }
  const startAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours - 9, minutes, 0));
  const endAt = new Date(startAt.getTime() + siteConfig.appointmentDurationMinutes * 60 * 1000);
  const [openHour, openMinute] = siteConfig.openTime.split(":").map(Number);
  const [closeHour, closeMinute] = siteConfig.closeTime.split(":").map(Number);
  const selectedStart = hours * 60 + minutes;
  const selectedEnd = selectedStart + siteConfig.appointmentDurationMinutes;
  const opening = openHour * 60 + openMinute;
  const closing = closeHour * 60 + closeMinute;
  if (selectedStart < opening || selectedEnd > closing) {
    throw new Error(`営業時間（${siteConfig.openTime}〜${siteConfig.closeTime}）内で選択してください。`);
  }
  return { startAt, endAt };
}

async function ensureNotionSlotIsAvailable(date: Date, timeSlot: string): Promise<{ startAt: Date; endAt: Date }> {
  const window = getJstReservationWindow(date, timeSlot);
  const blockedSlots = await getNotionBlockedSlotsForDate(formatJstDate(date));
  const overlaps = blockedSlots.some((slot) => window.startAt < slot.endAt && window.endAt > slot.startAt);
  if (overlaps) throw new Error("選択された時間帯はすでに埋まっています。別の時間を選択してください。");
  return window;
}

export const reservationsRouter = router({
  /**
   * 予約を作成（顧客用・公開API）
   * 
   * 新規顧客の場合は自動的に顧客データベースに登録し、診察券QRコードを発行します。
   */
  create: publicProcedure
    .input(
      z.object({
        facilityId: z.string(),
        customerName: z.string().min(1, "お名前を入力してください"),
        customerFurigana: z.string().optional(), // フリガナ（カタカナ）
        customerPhone: z.string().min(10, "電話番号を入力してください"),
        customerEmail: z.string().email("有効なメールアドレスを入力してください").min(1, "メールアドレスを入力してください"),
        // 住所情報（任意）
        postalCode: z.string().optional(),
        prefecture: z.string().optional(),
        city: z.string().optional(),
        addressLine: z.string().optional(),
        firstChoiceDate: z.union([z.date(), z.string().transform(s => new Date(s))]),
        firstChoiceTimeSlot: z.string(),
        firstChoiceTimeDetail: z.string().optional(),
        secondChoiceDate: z.union([z.date(), z.string().transform(s => new Date(s))]).optional(),
        secondChoiceTimeSlot: z.string().optional(),
        thirdChoiceDate: z.union([z.date(), z.string().transform(s => new Date(s))]).optional(),
        thirdChoiceTimeSlot: z.string().optional(),
        notes: z.string().optional(),
        serviceType: z.enum(["整体", "マッサージ", "パーソナルトレーニング", "グループレッスン", "その他"]).default("整体"),
      })
    )
    .mutation(async ({ input }) => {
      const reservationId = nanoid();
      const reservationWindow = await ensureNotionSlotIsAvailable(input.firstChoiceDate, input.firstChoiceTimeDetail || input.firstChoiceTimeSlot);
      const notionReservation = await createNotionCalendarReservation({
        customerName: input.customerName,
        serviceType: input.serviceType,
        startAt: reservationWindow.startAt,
        endAt: reservationWindow.endAt,
        notes: input.notes,
      });

      // 電話番号で既存顧客をチェック
      let customerId: string | undefined;
      const existingCustomer = await findCustomerByPhone(input.customerPhone);

      if (existingCustomer) {
        // 既存顧客の場合
        customerId = existingCustomer.customerId;
      } else {
        // 新規顧客の場合、顧客データベースに登録
        customerId = nanoid();
        
        // QRコード生成
        const qrPayload = {
          id: customerId,
          type: "customer",
          timestamp: Date.now(),
          version: "1.0",
        };
        const qrCodeData = JSON.stringify(qrPayload);
        
        // QRコード画像を生成
        const qrCodeDataURL = await QRCode.toDataURL(qrCodeData, {
          errorCorrectionLevel: "H",
          width: 400,
          margin: 2,
        });
        
        // S3にアップロード
        let qrCodeImageUrl = "";
        try {
          const qrImageBuffer = Buffer.from(qrCodeDataURL.split(",")[1], "base64");
          const result = await storagePut(
            `qr-codes/${customerId}.png`,
            qrImageBuffer,
            "image/png"
          );
          qrCodeImageUrl = result.url;
        } catch (error) {
          console.warn("QR code image upload failed:", error);
        }
        
        // 顧客情報をDBに保存
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.insert(customers).values({
          customerId,
          fullName: input.customerName,
          phone: input.customerPhone,
          email: input.customerEmail,
          qrCodeData,
          qrCodeImageUrl,
          // 仮の値（後で更新可能）
          dateOfBirth: new Date("2000-01-01"),
          gender: "prefer_not_to_say",
          postalCode: "000-0000",
          prefecture: "未設定",
          city: "未設定",
          addressLine1: "未設定",
        });
      }

      // 予約を作成
      await createReservation({
        reservationId,
        customerId,
        facilityId: input.facilityId,
        customerName: input.customerName,
        customerFurigana: input.customerFurigana || null,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        postalCode: input.postalCode || null,
        prefecture: input.prefecture || null,
        city: input.city || null,
        addressLine: input.addressLine || null,
        firstChoiceDate: input.firstChoiceDate,
        firstChoiceTimeSlot: input.firstChoiceTimeSlot,
        firstChoiceTimeDetail: input.firstChoiceTimeDetail || null,
        secondChoiceDate: input.secondChoiceDate || null,
        secondChoiceTimeSlot: input.secondChoiceTimeSlot || null,
        thirdChoiceDate: input.thirdChoiceDate || null,
        thirdChoiceTimeSlot: input.thirdChoiceTimeSlot || null,
        notes: input.notes || null,
        status: "pending",
        notionPageId: notionReservation.pageId,
        notionPageUrl: notionReservation.pageUrl,
      });

      // 確認メールを送信
      let emailSent = false;
      {
        // 顧客情報を取得してQRコードURLを含める
        const db = await getDb();
        if (db) {
          const customerData = await db
            .select()
            .from(customers)
            .where(eq(customers.customerId, customerId))
            .limit(1);
          
          if (customerData.length > 0) {
            emailSent = await sendReservationConfirmationEmail({
              to: input.customerEmail,
              customerName: input.customerName,
              reservationId,
              firstChoiceDate: input.firstChoiceDate,
              firstChoiceTimeSlot: input.firstChoiceTimeSlot,
              secondChoiceDate: input.secondChoiceDate,
              secondChoiceTimeSlot: input.secondChoiceTimeSlot,
              thirdChoiceDate: input.thirdChoiceDate,
              thirdChoiceTimeSlot: input.thirdChoiceTimeSlot,
              qrCodeImageUrl: customerData[0].qrCodeImageUrl || undefined,
            });
          }
        }
      }

      // Google Sheetsに保存（エラーがあってもシステムは続行）
      try {
        await saveReservationToSheets({
          reservationId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          firstChoiceDate: input.firstChoiceDate,
          firstChoiceTimeSlot: input.firstChoiceTimeSlot,
          secondChoiceDate: input.secondChoiceDate,
          secondChoiceTimeSlot: input.secondChoiceTimeSlot,
          thirdChoiceDate: input.thirdChoiceDate,
          thirdChoiceTimeSlot: input.thirdChoiceTimeSlot,
          notes: input.notes,
          createdAt: new Date(),
        });
      } catch (error) {
        console.error("Failed to save reservation to Google Sheets:", error);
      }

      // スタッフに通知
      try {
        const formatDate = (date: Date) => {
          // DBはUTCで保存されているが、フォーム送信時にJSTの日付をUTCとして保存しているため
          // UTCの年月日をそのまま使用する（サーバータイムゾーンに依存しない）
          const d = new Date(date);
          const year = d.getUTCFullYear();
          const month = d.getUTCMonth() + 1;
          const day = d.getUTCDate();
          const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
          const weekday = weekdays[d.getUTCDay()];
          return `${year}年${month}月${day}日(${weekday})`;
        };

        let notificationContent = `新しい予約リクエストが届きました。\n\n`;
        notificationContent += `お客様名: ${input.customerName}\n`;
        notificationContent += `電話番号: ${input.customerPhone}\n`;
        notificationContent += `メール: ${input.customerEmail}\n\n`;
        // スロット値から終了時刻を計算（例: "10:00" → "10:00～11:30"）
        const calcEndTime = (startStr: string): string => {
          const [h, m] = startStr.split(":").map(Number);
          if (isNaN(h) || isNaN(m)) return startStr;
          const totalMin = h * 60 + m + 90;
          const endH = String(Math.floor(totalMin / 60)).padStart(2, "0");
          const endM = String(totalMin % 60).padStart(2, "0");
          return `${startStr}～${endH}:${endM}`;
        };
        const fmt1stTime = input.firstChoiceTimeDetail
          ? calcEndTime(input.firstChoiceTimeDetail)
          : calcEndTime(input.firstChoiceTimeSlot);
        notificationContent += `第1希望: ${formatDate(input.firstChoiceDate)} ${fmt1stTime}\n`;
        if (input.secondChoiceDate && input.secondChoiceTimeSlot) {
          notificationContent += `第2希望: ${formatDate(input.secondChoiceDate)} ${input.secondChoiceTimeSlot}\n`;
        }
        if (input.thirdChoiceDate && input.thirdChoiceTimeSlot) {
          notificationContent += `第3希望: ${formatDate(input.thirdChoiceDate)} ${input.thirdChoiceTimeSlot}\n`;
        }
        if (input.notes) {
          notificationContent += `\n備考: ${input.notes}`;
        }

        // Manusシステム通知
        await notifyOwner({
          title: "新しい予約リクエスト",
          content: notificationContent,
        });

        // LINE Bot通知
        const { notifyOwnerViaLine } = await import("../_core/line");
        await notifyOwnerViaLine({
          title: "新しい予約リクエスト",
          content: notificationContent,
        });
      } catch (error) {
        console.error("Failed to send notification to owner:", error);
      }

      return {
        success: true,
        reservationId,
        customerId,
        isNewCustomer: !existingCustomer,
        emailSent,
      };
    }),

  /**
   * 予約IDで予約を取得
   */
  getById: publicProcedure
    .input(z.object({ reservationId: z.string() }))
    .query(async ({ input }) => {
      const reservation = await getReservationWithCustomer(input.reservationId);
      return reservation;
    }),

  /**
   * 顧客IDで予約一覧を取得
   */
  getByCustomerId: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ input }) => {
      const reservations = await getReservationsByCustomerId(input.customerId);
      return reservations;
    }),

  /**
   * 施設の全予約を取得（スタッフ用）
   */
  listByFacility: protectedProcedure
    .input(z.object({ facilityId: z.string() }))
    .query(async ({ input }) => {
      const reservations = await getReservationsWithCustomers(input.facilityId);
      return reservations;
    }),

  /**
   * Notionを正本とするスタッフ用予約一覧。
   * 手動でNotionカレンダーに加えた予約も同じ一覧へ表示する。
   */
  listNotion: publicProcedure
    .input(z.object({ startDate: z.date(), endDate: z.date() }))
    .query(async ({ input }) => {
      return listNotionCalendarReservations(input.startDate, input.endDate);
    }),

  /**
   * ステータスで予約一覧を取得（スタッフ用）
   */
  listByStatus: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
      })
    )
    .query(async ({ input }) => {
      const reservations = await getReservationsByStatus(input.facilityId, input.status);
      return reservations;
    }),

  /**
   * 日付範囲で予約一覧を取得（スタッフ用）
   */
  listByDateRange: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const reservations = await getReservationsByDateRange(
        input.facilityId,
        input.startDate,
        input.endDate
      );
      return reservations;
    }),

  /**
   * 予約を更新（スタッフ用）
   */
  update: protectedProcedure
    .input(
      z.object({
        reservationId: z.string(),
        confirmedDate: z.date().optional(),
        confirmedTimeSlot: z.enum(["10:00-13:00", "13:00-17:00", "17:00-"]).optional(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).optional(),
        staffNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { reservationId, ...data } = input;
      const reservation = await getReservationById(reservationId);
      if (!reservation) throw new Error("予約が見つかりません");
      if (reservation.notionPageId) {
        await updateNotionCalendarReservation(reservation.notionPageId, {
          status: data.status,
          staffNotes: data.staffNotes,
        });
      }
      await updateReservation(reservationId, data);
      return { success: true };
    }),

  /** Notion予約履歴の状態とスタッフメモを直接更新する。 */
  updateNotion: publicProcedure
    .input(z.object({
      pageId: z.string(),
      status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).optional(),
      staffNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await updateNotionCalendarReservation(input.pageId, {
        status: input.status,
        staffNotes: input.staffNotes,
      });
      return { success: true };
    }),

  /**
   * 予約ステータスを更新
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        reservationId: z.string(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
      })
    )
    .mutation(async ({ input }) => {
      const reservation = await getReservationById(input.reservationId);
      if (!reservation) throw new Error("予約が見つかりません");
      if (reservation.notionPageId) {
        await updateNotionCalendarReservation(reservation.notionPageId, { status: input.status });
      }
      await updateReservationStatus(input.reservationId, input.status);

      // 確定時に顧客へ確定通知メールを送信
      if (input.status === "confirmed") {
        try {
          if (reservation && reservation.customerEmail) {
            // 確定日時が設定されている場合はそれを使用、なければ第1希望を使用
            const confirmedDate = reservation.confirmedDate ?? reservation.firstChoiceDate;
            const confirmedTimeSlot = reservation.confirmedTimeSlot ?? reservation.firstChoiceTimeSlot;
            await sendReservationConfirmedEmail({
              to: reservation.customerEmail,
              customerName: reservation.customerName,
              reservationId: reservation.reservationId,
              confirmedDate,
              confirmedTimeSlot,
            });
            console.log(`[Reservation] Confirmation email sent to ${reservation.customerEmail}`);
          }
        } catch (emailError) {
          // メール送信エラーはステータス更新の成功に影響しない
          console.error("[Reservation] Failed to send confirmation email:", emailError);
        }
      }

      return { success: true };
    }),

  /**
   * 予約をキャンセル（顧客用・公開API）
   */
  cancel: publicProcedure
    .input(
      z.object({
        reservationId: z.string(),
        customerPhone: z.string(), // 本人確認用
      })
    )
    .mutation(async ({ input }) => {
      // 予約を取得して電話番号を確認
      const reservation = await getReservationById(input.reservationId);
      
      if (!reservation) {
        throw new Error("予約が見つかりません");
      }

      if (reservation.customerPhone !== input.customerPhone) {
        throw new Error("電話番号が一致しません");
      }

      if (reservation.notionPageId) {
        await updateNotionCalendarReservation(reservation.notionPageId, { status: "cancelled" });
      }
      await updateReservationStatus(input.reservationId, "cancelled");
      return { success: true };
    }),

  /**
   * 予約を削除（スタッフ用）
   */
  delete: protectedProcedure
    .input(z.object({ reservationId: z.string() }))
    .mutation(async ({ input }) => {
      await deleteReservation(input.reservationId);
      return { success: true };
    }),

  /**
   * 特定日の予約済みスロットをDBから取得（予約フォーム用・公開アピィ）
   * DBのみ使用（Notionフォールバック廃止で高速化）
   */
  getBookedSlots: publicProcedure
    .input(z.object({ date: z.string() })) // YYYY-MM-DD
    .query(async ({ input }) => {
      const notionSlots = await getNotionBlockedSlotsForDate(input.date);
      // JST時刻のHH:MM形式に変換（フロントエンドの形式に合わせる）
      const toJstHHMM = (d: Date): string => {
        const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        const h = jst.getUTCHours().toString().padStart(2, '0');
        const m = jst.getUTCMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
      };
      const slots = notionSlots.map(s => ({
        start: toJstHHMM(s.startAt),
        end: toJstHHMM(s.endAt),
        status: 'booked',
        serviceType: s.source,
      }));
      return { slots, source: 'notion' as const };
    }),

  /**
   * 電話番号で既存顧客を検索（顧客フォーム用・公開API）
   */
  lookupByPhone: publicProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const customer = await findCustomerByPhone(input.phone);
      if (!customer) return null;
      return {
        fullName: customer.fullName,
        email: customer.email || '',
      };
    }),

  /**
   * 月間空き状況を取得（顧客カレンダー表示用・公開API）
   */
  getMonthlyAvailability: publicProcedure
    .input(z.object({
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12),
    }))
    .query(async ({ input }) => {
      return getNotionMonthlyAvailability(input.year, input.month);
    }),

  /**
   * 予約分析データをNotionから取得（スタッフ用）
   */
  getAnalytics: protectedProcedure
    .input(z.object({
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12),
    }))
    .query(async ({ input }) => {
      const analytics = await getReservationAnalytics(input.year, input.month);
      return analytics;
    }),
});
