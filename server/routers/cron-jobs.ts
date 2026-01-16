/**
 * cronジョブ管理ルーター
 */

import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { cronJobLogs } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { syncNotionCustomers } from "../cron/sync-notion-customers";
import { linkReservationsAutomatically } from "../cron/link-reservations";

export const cronJobsRouter = router({
  /**
   * cronジョブ実行履歴を取得
   */
  getLogs: protectedProcedure
    .input(
      z.object({
        jobName: z.enum(["sync-notion-customers", "link-reservations", "all"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("データベース接続が利用できません");
      }

      let query = db.select().from(cronJobLogs);

      if (input.jobName && input.jobName !== "all") {
        query = query.where(eq(cronJobLogs.jobName, input.jobName)) as any;
      }

      const logs = await query
        .orderBy(desc(cronJobLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return logs;
    }),

  /**
   * 最新のcronジョブ実行履歴を取得
   */
  getLatestLogs: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("データベース接続が利用できません");
    }

    const syncCustomersLog = await db
      .select()
      .from(cronJobLogs)
      .where(eq(cronJobLogs.jobName, "sync-notion-customers"))
      .orderBy(desc(cronJobLogs.createdAt))
      .limit(1);

    const linkReservationsLog = await db
      .select()
      .from(cronJobLogs)
      .where(eq(cronJobLogs.jobName, "link-reservations"))
      .orderBy(desc(cronJobLogs.createdAt))
      .limit(1);

    return {
      syncCustomers: syncCustomersLog[0] || null,
      linkReservations: linkReservationsLog[0] || null,
    };
  }),

  /**
   * 手動でcronジョブを実行
   */
  runJob: protectedProcedure
    .input(
      z.object({
        jobName: z.enum(["sync-notion-customers", "link-reservations"]),
      })
    )
    .mutation(async ({ input }) => {
      console.log(`[手動実行] ${input.jobName}を実行します`);

      if (input.jobName === "sync-notion-customers") {
        const result = await syncNotionCustomers("manual");
        return {
          success: true,
          jobName: input.jobName,
          result,
        };
      } else if (input.jobName === "link-reservations") {
        const result = await linkReservationsAutomatically();
        return {
          success: true,
          jobName: input.jobName,
          result,
        };
      }

      throw new Error("Invalid job name");
    }),
});
