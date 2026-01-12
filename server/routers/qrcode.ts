import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createRegistrationQrCode,
  getFacilityQrCodes,
  getQrCodeById,
  toggleQrCodeStatus,
  updateQrCodeImageUrl,
  createRegistrationAttempt,
  updateRegistrationAttemptStatus,
  getRegistrationAttemptByToken,
  getQrCodeStatistics,
} from "../db/qrcode";
import QRCode from "qrcode";
import { storagePut } from "../storage";

export const qrcodeRouter = router({
  /**
   * 施設用：新しいQRコードを生成
   */
  generateQrCode: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        facilityName: z.string(),
        registrationUrl: z.string(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }: any) => {
      const qrCode = await createRegistrationQrCode(
        input.facilityId,
        input.facilityName,
        input.registrationUrl,
        input.expiresAt
      );

      // QRコード画像を生成
      const qrCodeImage: string = await QRCode.toDataURL(qrCode.qrCodeData, {
        errorCorrectionLevel: "H",
        type: "image/png",
        margin: 1,
        width: 300,
      });

      // S3にアップロード
      const base64Data = qrCodeImage.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const { url } = await storagePut(
        `qrcodes/${qrCode.qrCodeId}.png`,
        buffer,
        "image/png"
      );

      // 画像URLを保存
      await updateQrCodeImageUrl(qrCode.qrCodeId, url);

      return {
        qrCodeId: qrCode.qrCodeId,
        qrCodeData: qrCode.qrCodeData,
        qrCodeImageUrl: url,
        registrationUrl: qrCode.registrationUrl,
      };
    }),

  /**
   * 施設用：QRコード一覧を取得
   */
  listQrCodes: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
      })
    )
    .query(async ({ input }: any) => {
      const qrCodes = await getFacilityQrCodes(input.facilityId);
      return qrCodes;
    }),

  /**
   * 施設用：QRコードの統計情報を取得
   */
  getQrCodeStats: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        qrCodeId: z.string().optional(),
      })
    )
    .query(async ({ input }: any) => {
      return await getQrCodeStatistics(input.facilityId, input.qrCodeId);
    }),

  /**
   * 施設用：QRコードを有効/無効に切り替え
   */
  toggleQrCodeStatus: protectedProcedure
    .input(
      z.object({
        qrCodeId: z.string(),
        isActive: z.number().int().min(0).max(1),
      })
    )
    .mutation(async ({ input }: any) => {
      await toggleQrCodeStatus(input.qrCodeId, input.isActive);
      return { success: true };
    }),

  /**
   * 顧客用：QRコードをスキャンして登録を開始
   */
  startRegistration: publicProcedure
    .input(
      z.object({
        qrCodeId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      const qrCode = await getQrCodeById(input.qrCodeId);
      if (!qrCode) {
        throw new Error("QR code not found");
      }

      if (qrCode.isActive === 0) {
        throw new Error("QR code is inactive");
      }

      if (qrCode.expiresAt && new Date() > qrCode.expiresAt) {
        throw new Error("QR code has expired");
      }

      // 登録試行を作成
      const attempt = await createRegistrationAttempt(
        input.qrCodeId,
        qrCode.facilityId,
        ctx.req?.ip,
        ctx.req?.headers["user-agent"]
      );

      return {
        attemptId: attempt.attemptId,
        sessionToken: attempt.sessionToken,
        facilityId: qrCode.facilityId,
        facilityName: qrCode.facilityName,
      };
    }),

  /**
   * 顧客用：登録試行のステータスを更新
   */
  updateRegistrationStatus: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        status: z.enum(["initiated", "in_progress", "completed", "abandoned"]),
        customerId: z.string().optional(),
      })
    )
    .mutation(async ({ input }: any) => {
      const attempt = await getRegistrationAttemptByToken(input.sessionToken);
      if (!attempt) {
        throw new Error("Registration attempt not found");
      }

      await updateRegistrationAttemptStatus(
        attempt.attemptId,
        input.status,
        input.customerId
      );

      return { success: true };
    }),

  /**
   * 顧客用：セッショントークンから登録情報を取得
   */
  getRegistrationSession: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
      })
    )
    .query(async ({ input }: any) => {
      const attempt = await getRegistrationAttemptByToken(input.sessionToken);
      if (!attempt) {
        throw new Error("Registration session not found");
      }

      return {
        attemptId: attempt.attemptId,
        status: attempt.status,
        facilityId: attempt.facilityId,
        customerId: attempt.customerId,
      };
    }),
});
