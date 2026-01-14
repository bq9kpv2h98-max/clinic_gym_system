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
        customerPhone: z.string().min(10, "電話番号を入力してください"),
        customerEmail: z.string().email("有効なメールアドレスを入力してください").min(1, "メールアドレスを入力してください"),
        firstChoiceDate: z.date(),
        firstChoiceTimeSlot: z.enum(["10:00-13:00", "13:00-17:00", "17:00-"]),
        secondChoiceDate: z.date().optional(),
        secondChoiceTimeSlot: z.enum(["10:00-13:00", "13:00-17:00", "17:00-"]).optional(),
        thirdChoiceDate: z.date().optional(),
        thirdChoiceTimeSlot: z.enum(["10:00-13:00", "13:00-17:00", "17:00-"]).optional(),
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
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        firstChoiceDate: input.firstChoiceDate,
        firstChoiceTimeSlot: input.firstChoiceTimeSlot,
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
});
