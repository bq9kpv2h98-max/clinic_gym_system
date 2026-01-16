/**
 * 古いcronジョブ実行履歴を自動削除するcronジョブ
 * 30日以上前のデータを削除してデータベースの肥大化を防ぐ
 */

import { getDb } from "../db";
import { cronJobLogs, reservationLinkLogs, notionSyncLogs } from "../../drizzle/schema";
import { lt } from "drizzle-orm";

export async function cleanupOldLogs() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection failed");
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let totalDeleted = 0;

  try {
    // 削除前の件数をカウント
    const cronLogsCountBefore = await db
      .select({ count: cronJobLogs.id })
      .from(cronJobLogs)
      .where(lt(cronJobLogs.createdAt, thirtyDaysAgo));
    const cronLogsCount = cronLogsCountBefore.length;

    const reservationLogsCountBefore = await db
      .select({ count: reservationLinkLogs.id })
      .from(reservationLinkLogs)
      .where(lt(reservationLinkLogs.createdAt, thirtyDaysAgo));
    const reservationLogsCount = reservationLogsCountBefore.length;

    const syncLogsCountBefore = await db
      .select({ count: notionSyncLogs.id })
      .from(notionSyncLogs)
      .where(lt(notionSyncLogs.createdAt, thirtyDaysAgo));
    const syncLogsCount = syncLogsCountBefore.length;

    totalDeleted = cronLogsCount + reservationLogsCount + syncLogsCount;

    // 実際に削除する
    if (cronLogsCount > 0) {
      await db.delete(cronJobLogs).where(lt(cronJobLogs.createdAt, thirtyDaysAgo));
    }
    if (reservationLogsCount > 0) {
      await db.delete(reservationLinkLogs).where(lt(reservationLinkLogs.createdAt, thirtyDaysAgo));
    }
    if (syncLogsCount > 0) {
      await db.delete(notionSyncLogs).where(lt(notionSyncLogs.createdAt, thirtyDaysAgo));
    }

    console.log(`[cleanup-old-logs] 古いログを削除しました: cronジョブ=${cronLogsCount}件, 予約紐付け=${reservationLogsCount}件, Notion同期=${syncLogsCount}件, 合計=${totalDeleted}件`);

    return {
      success: true,
      totalDeleted,
      cronLogsCount,
      reservationLogsCount,
      syncLogsCount,
    };
  } catch (error) {
    console.error("[cleanup-old-logs] エラー:", error);
    throw error;
  }
}

// スクリプトとして直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupOldLogs()
    .then((result) => {
      console.log("古いログの削除が完了しました:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("古いログの削除に失敗しました:", error);
      process.exit(1);
    });
}
