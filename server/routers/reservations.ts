/**
 * 予約管理tRPCルーター
 * 
 * 予約の作成、取得、更新、削除などのAPI endpointsを提供します。
 */

import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
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
import { sendReservationConfirmationEmail } from "../_core/email";
import { saveReservationToSheets } from "../_core/googleSheets";
import { createNotionReservation, createNotionCustomer, getBookedSlotsForDate, getReservationAnalytics } from "../notion";
import { notifyOwner } from "../_core/notification";
import { getBookedSlotsFromDB } from "../db";

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
      })
    )
    .mutation(async ({ input }) => {
      const reservationId = nanoid();

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

      // Notion予約履歴に同期（バックグラウンドで非同期実行・エラーがあってもシステムは続行）
      void (async () => {
        try {
          const db = await getDb();
          if (db) {
            const customerData = await db
              .select()
              .from(customers)
              .where(eq(customers.customerId, customerId))
              .limit(1);
            
            if (customerData.length > 0) {
              const customer = customerData[0];
              
              if (!customer.notionPageUrl) {
                const notionCustomer = await createNotionCustomer({
                  customerId: customer.customerId,
                  fullName: customer.fullName,
                  phone: customer.phone,
                  email: customer.email || undefined,
                });
                
                if (notionCustomer) {
                  await db.update(customers)
                    .set({
                      notionPageUrl: notionCustomer.url,
                      notionPageId: notionCustomer.pageId,
                    })
                    .where(eq(customers.customerId, customerId));
                }
              }
              
              await createNotionReservation({
                customerName: input.customerName,
                serviceType: "整体",
                status: "pending",
                reservationDateTime: input.firstChoiceDate,
                notes: input.notes,
              });
            }
          }
        } catch (error) {
          console.error("Notion sync error (background):", error);
        }
      })();

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
      await updateReservation(reservationId, data);
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
      await updateReservationStatus(input.reservationId, input.status);
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
      // DBのみから取得（高速・全件対応）
      const dbSlots = await getBookedSlotsFromDB(input.date);
      // JST時刻のHH:MM形式に変換（フロントエンドの形式に合わせる）
      const toJstHHMM = (d: Date): string => {
        const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        const h = jst.getUTCHours().toString().padStart(2, '0');
        const m = jst.getUTCMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
      };
      const slots = dbSlots.map(s => ({
        start: toJstHHMM(s.startAt),
        end: s.endAt ? toJstHHMM(s.endAt) : toJstHHMM(new Date(s.startAt.getTime() + 90 * 60 * 1000)),
        status: 'booked',
        serviceType: '',
      }));
      return { slots, source: 'db' as const };
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
