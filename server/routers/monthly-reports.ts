/**
 * Monthly Reports Router
 * 
 * Handles monthly report generation and Confluence posting.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { generateMonthlyReport, formatMonthlyReportHTML } from "../monthlyReport";
import { upsertConfluencePage } from "../atlassian";

export const monthlyReportsRouter = router({
  /**
   * Generate and post monthly report to Confluence
   */
  generateAndPost: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Generate report data
        const report = await generateMonthlyReport(input.year, input.month);

        // Format as HTML
        const html = formatMonthlyReportHTML(report);

        // Post to Confluence
        const pageTitle = `月次レポート - ${report.period}`;
        const result = await upsertConfluencePage(pageTitle, html);

        return {
          success: true,
          report,
          confluencePageId: result.pageId,
          confluenceUrl: result.url,
        };
      } catch (error) {
        console.error("Failed to generate and post monthly report:", error);
        throw new Error(error instanceof Error ? error.message : String(error));
      }
    }),

  /**
   * Generate monthly report (without posting to Confluence)
   */
  generate: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      try {
        const report = await generateMonthlyReport(input.year, input.month);
        return report;
      } catch (error) {
        console.error("Failed to generate monthly report:", error);
        throw new Error(error instanceof Error ? error.message : String(error));
      }
    }),

  /**
   * Generate previous month report and post to Confluence
   * (For cron job)
   */
  generatePreviousMonth: protectedProcedure.mutation(async () => {
    try {
      // Calculate previous month
      const now = new Date();
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = now.getMonth() === 0 ? 12 : now.getMonth();

      // Generate report data
      const report = await generateMonthlyReport(year, month);

      // Format as HTML
      const html = formatMonthlyReportHTML(report);

      // Post to Confluence
      const pageTitle = `月次レポート - ${report.period}`;
      const result = await upsertConfluencePage(pageTitle, html);

      return {
        success: true,
        report,
        confluencePageId: result.pageId,
        confluenceUrl: result.url,
      };
    } catch (error) {
      console.error("Failed to generate and post previous month report:", error);
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }),
});
