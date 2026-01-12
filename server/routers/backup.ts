import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createDatabaseBackup,
  restoreDatabaseFromBackup,
  verifyBackup,
} from "../db/backup";

export const backupRouter = router({
  /**
   * データベース全体をバックアップ
   */
  createBackup: protectedProcedure.mutation(async () => {
    const result = await createDatabaseBackup();
    return result;
  }),

  /**
   * バックアップからデータベースを復元
   */
  restoreBackup: protectedProcedure
    .input(
      z.object({
        backupUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }: any) => {
      const result = await restoreDatabaseFromBackup(input.backupUrl);
      return result;
    }),

  /**
   * バックアップの健全性チェック
   */
  verifyBackup: protectedProcedure
    .input(
      z.object({
        backupUrl: z.string().url(),
      })
    )
    .query(async ({ input }: any) => {
      const result = await verifyBackup(input.backupUrl);
      return result;
    }),
});
