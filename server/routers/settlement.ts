import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getMonthlySettlementData,
  generateSettlementSummary,
  SettlementData,
  SettlementSummary,
} from "../db/settlement";
import { generatePDF, generateExcel, generateHTML } from "../services/reportGenerator";

export const settlementRouter = router({
  // 月次決算データ取得
  getMonthlyData: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        facilityName: z.string(),
        year: z.number(),
        month: z.number(),
      })
    )
    .query(async ({ input }) => {
      const settlementData = await getMonthlySettlementData(
        input.facilityId,
        input.year,
        input.month,
        input.facilityName
      );
      const summary = generateSettlementSummary(settlementData);

      return {
        data: settlementData,
        summary,
      };
    }),

  // PDF生成
  generatePDF: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        facilityName: z.string(),
        year: z.number(),
        month: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const settlementData = await getMonthlySettlementData(
        input.facilityId,
        input.year,
        input.month,
        input.facilityName
      );

      const pdfBuffer = await generatePDF(settlementData);
      const filename = `settlement_${input.year}_${String(input.month).padStart(2, "0")}.pdf`;

      return {
        filename,
        buffer: pdfBuffer.toString("base64"),
      };
    }),

  // Excel生成
  generateExcel: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        facilityName: z.string(),
        year: z.number(),
        month: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const settlementData = await getMonthlySettlementData(
        input.facilityId,
        input.year,
        input.month,
        input.facilityName
      );

      const excelBuffer = await generateExcel(settlementData);
      const filename = `settlement_${input.year}_${String(input.month).padStart(2, "0")}.xlsx`;

      return {
        filename,
        buffer: excelBuffer.toString("base64"),
      };
    }),

  // HTML生成
  generateHTML: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        facilityName: z.string(),
        year: z.number(),
        month: z.number(),
      })
    )
    .query(async ({ input }) => {
      const settlementData = await getMonthlySettlementData(
        input.facilityId,
        input.year,
        input.month,
        input.facilityName
      );

      const htmlContent = await generateHTML(settlementData);

      return {
        html: htmlContent,
      };
    }),

  // 複数月の比較データ取得
  getMultiMonthComparison: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        facilityName: z.string(),
        year: z.number(),
        months: z.array(z.number()),
      })
    )
    .query(async ({ input }) => {
      const comparisons = await Promise.all(
        input.months.map(async (month) => {
          const data = await getMonthlySettlementData(
            input.facilityId,
            input.year,
            month,
            input.facilityName
          );
          const summary = generateSettlementSummary(data);
          return {
            month,
            summary,
          };
        })
      );

      return comparisons;
    }),
});
