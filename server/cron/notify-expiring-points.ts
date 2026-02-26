/**
 * ポイント有効期限事前通知cronジョブ
 * 
 * 毎日実行され、7日後に有効期限が切れるポイントを持つ顧客にLINE通知を送信します。
 */

import { getDb } from "../db";
import { pointTransactions, customers, cronJobLogs } from "../../drizzle/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { notifyOwnerViaLine } from "../_core/line";

/**
 * 有効期限7日前のポイントを持つ顧客に通知
 */
export async function notifyExpiringPoints() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTime = new Date();
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    console.log("ポイント有効期限事前通知ジョブを開始します...");

    // 7日後の日付を計算
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    sevenDaysLater.setHours(0, 0, 0, 0);

    const eightDaysLater = new Date(sevenDaysLater);
    eightDaysLater.setDate(eightDaysLater.getDate() + 1);

    // 7日後に有効期限が切れるポイント取引を取得
    const expiringTransactions = await db
      .select()
      .from(pointTransactions)
      .where(
        and(
          eq(pointTransactions.transactionType, "earn"),
          gte(pointTransactions.expiresAt, sevenDaysLater),
          lte(pointTransactions.expiresAt, eightDaysLater)
        )
      );

    console.log(`7日後に期限切れとなるポイント取引: ${expiringTransactions.length}件`);

    // 顧客ごとにグループ化
    const customerGroups = new Map<string, typeof expiringTransactions>();
    for (const transaction of expiringTransactions) {
      const existing = customerGroups.get(transaction.customerId) || [];
      existing.push(transaction);
      customerGroups.set(transaction.customerId, existing);
    }

    // 各顧客に通知を送信
    for (const [customerId, transactions] of Array.from(customerGroups.entries())) {
      try {
        // 顧客情報を取得
        const [customer] = await db
          .select()
          .from(customers)
          .where(eq(customers.customerId, customerId))
          .limit(1);

        if (!customer) {
          console.error(`顧客が見つかりません: ${customerId}`);
          errorCount++;
          errors.push(`顧客が見つかりません: ${customerId}`);
          continue;
        }

        // 期限切れとなるポイント数を計算
        const expiringPoints = transactions.reduce((sum: number, t: any) => sum + t.points, 0);

        // 有効期限を取得（最初の取引の有効期限）
        const expirationDate = transactions[0].expiresAt;
        const formattedDate = expirationDate
          ? new Date(expirationDate).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "不明";

        // LINE通知を送信（現在は店舗オーナーに通知）
        const message = `${customer.fullName}様\n\n${expiringPoints}ポイントが${formattedDate}に有効期限を迎えます。\n\nお早めにご利用ください。`;

        await notifyOwnerViaLine({
          title: "ポイント有効期限のお知らせ",
          content: message,
        });

        successCount++;
        console.log(`顧客 ${customer.fullName} に有効期限通知を送信しました（${expiringPoints}pt）`);
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`顧客 ${customerId} の通知送信エラー: ${errorMessage}`);
        console.error(`顧客 ${customerId} の通知送信エラー:`, error);
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // cronジョブ実行履歴を記録
    await db.insert(cronJobLogs).values({
      logId: nanoid(),
      jobName: "notify-expiring-points",
      jobDescription: "ポイント有効期限事前通知",
      status: errorCount === 0 ? "success" : "partial_success",
      startTime,
      endTime,
      duration,
      successCount,
      errorCount,
      details: JSON.stringify({
        expiringTransactionsCount: expiringTransactions.length,
        customersNotified: customerGroups.size,
        errors: errors.slice(0, 10), // 最初の10件のみ記録
      }),
    });

    console.log(`ポイント有効期限事前通知ジョブが完了しました`);
    console.log(`  成功: ${successCount}件`);
    console.log(`  エラー: ${errorCount}件`);
    console.log(`  実行時間: ${duration}ms`);

    return {
      success: true,
      successCount,
      errorCount,
      duration,
    };
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const errorMessage = error instanceof Error ? error.message : String(error);

    // エラーログを記録
    await db.insert(cronJobLogs).values({
      logId: nanoid(),
      jobName: "notify-expiring-points",
      jobDescription: "ポイント有効期限事前通知",
      status: "error",
      startTime,
      endTime,
      duration,
      successCount,
      errorCount,
      errorMessage,
      details: JSON.stringify({ errors }),
    });

    console.error("ポイント有効期限事前通知ジョブでエラーが発生しました:", error);
    throw error;
  }
}

// スクリプトとして直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  notifyExpiringPoints()
    .then(() => {
      console.log("ポイント有効期限事前通知ジョブが正常に完了しました");
      process.exit(0);
    })
    .catch((error) => {
      console.error("ポイント有効期限事前通知ジョブでエラーが発生しました:", error);
      process.exit(1);
    });
}
