import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { createDatabaseBackup } from "../db/backup";
import { syncAllToNotion } from "../db/notionSync";
import { notifyOwner } from "../_core/notification";

export const scheduleRouter = router({
  /**
   * 手動でバックアップを実行
   */
  runBackup: protectedProcedure.mutation(async () => {
    try {
      const result = await createDatabaseBackup();
      
      // オーナーに通知
      await notifyOwner({
        title: "バックアップ完了",
        content: `データベースバックアップが正常に完了しました。\n\nテーブル数: ${result.tableCount}\nレコード数: ${result.recordCount}\nサイズ: ${(result.backupSize / 1024 / 1024).toFixed(2)} MB\n\nバックアップURL: ${result.backupUrl}`,
      });

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      await notifyOwner({
        title: "バックアップ失敗",
        content: `データベースバックアップ中にエラーが発生しました。\n\nエラー: ${error.message}`,
      });

      throw error;
    }
  }),

  /**
   * 手動でNotion同期を実行
   */
  runNotionSync: protectedProcedure
    .input(
      z.object({
        customersDatabaseId: z.string(),
        salesDatabaseId: z.string(),
        advertisingDatabaseId: z.string(),
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        const result = await syncAllToNotion(input);

        // オーナーに通知
        await notifyOwner({
          title: "Notion同期完了",
          content: `Notionへのデータ同期が完了しました。\n\n顧客: ${result.results.customers.syncedCount}件\n売上: ${result.results.sales.syncedCount}件\n広告: ${result.results.advertising.syncedCount}件`,
        });

        return result;
      } catch (error: any) {
        await notifyOwner({
          title: "Notion同期失敗",
          content: `Notion同期中にエラーが発生しました。\n\nエラー: ${error.message}`,
        });

        throw error;
      }
    }),

  /**
   * スケジュール設定を取得
   */
  getScheduleConfig: protectedProcedure.query(async () => {
    // Note: 実際の実装では、データベースからスケジュール設定を取得
    return {
      backupSchedule: {
        enabled: true,
        cron: "0 3 * * *", // 毎日深夜3時
        lastRun: null,
        nextRun: null,
      },
      notionSyncSchedule: {
        enabled: true,
        cron: "0 6 * * *", // 毎朝6時
        lastRun: null,
        nextRun: null,
      },
    };
  }),

  /**
   * スケジュール設定を更新
   */
  updateScheduleConfig: protectedProcedure
    .input(
      z.object({
        backupEnabled: z.boolean(),
        backupCron: z.string(),
        notionSyncEnabled: z.boolean(),
        notionSyncCron: z.string(),
      })
    )
    .mutation(async ({ input }: any) => {
      // Note: 実際の実装では、データベースにスケジュール設定を保存
      return {
        success: true,
        message: "スケジュール設定を更新しました",
      };
    }),
});
