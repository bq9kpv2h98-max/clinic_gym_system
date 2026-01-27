import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import QRCode from "qrcode";

export const qrPrintRouter = router({
  // QRコード画像を生成（Data URL形式）
  generateQRCodeImage: publicProcedure
    .input(
      z.object({
        url: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        // QRコードをData URL形式で生成
        const dataUrl = await QRCode.toDataURL(input.url, {
          width: 400,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        return { dataUrl };
      } catch (error) {
        throw new Error("QRコード生成に失敗しました");
      }
    }),
});
