/**
 * 期限切れポイント自動失効cronジョブ
 * 
 * 毎日実行され、有効期限が切れたポイントを自動的に失効させます。
 */

import { getDb } from "../db";
import { pointTransactions, customers, cronJobLogs } from "../../drizzle/schema";
import { and, lte, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * 期限切れポイントを失効させる
 */
export async function expirePoints() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTime = new Date();
  let successCount = 0;
  let errorCount = 0;
  let totalExpiredPoints = 0;
  const errors: string[] = [];

  try {
    console.log("期限切れポイント自動失効ジョブを開始します...");

    // 有効期限が切れたポイント取引を取得（transactionType = 'earn' かつ expiresAt < 現在日時）
    const expiredTransactions = await db
      .select()
      .from(pointTransactions)
      .where(
        and(
          eq(pointTransactions.transactionType, "earn"),
          lte(pointTransactions.expiresAt, new Date())
        )
      );

    console.log(`期限切れポイント取引: ${expiredTransactions.length}件`);

    // 顧客ごとにグループ化して失効処理
    const customerGroups = new Map<string, typeof expiredTransactions>();
    for (const transaction of expiredTransactions) {
      const existing = customerGroups.get(transaction.customerId) || [];
      existing.push(transaction);
      customerGroups.set(transaction.customerId, existing);
    }

    // 各顧客のポイントを失効
    for (const [customerId, transactions] of customerGroups.entries()) {
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

        // 失効するポイント数を計算
        const expiredPoints = transactions.reduce((sum, t) => sum + t.points, 0);
        totalExpiredPoints += expiredPoints;

        // ポイント残高を更新
        const newTotalPoints = Math.max(0, customer.totalPoints - expiredPoints);

        // 失効取引を記録
        const transactionId = nanoid();
        await db.insert(pointTransactions).values({
          transactionId,
          customerId,
          transactionType: "expire",
          points: -expiredPoints,
          balanceAfter: newTotalPoints,
          description: `ポイント失効（${transactions.length}件）`,
          transactionDate: new Date(),
        });

        // 顧客のポイント残高を更新
        await db
          .update(customers)
          .set({
            totalPoints: newTotalPoints,
          })
          .where(eq(customers.customerId, customerId));

        // 失効済みの取引を削除（オプション：履歴として残す場合はコメントアウト）
        for (const transaction of transactions) {
          await db
            .delete(pointTransactions)
            .where(eq(pointTransactions.transactionId, transaction.transactionId));
        }

        successCount++;
        console.log(`顧客 ${customer.fullName} のポイント ${expiredPoints}pt を失効しました`);
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`顧客 ${customerId} の失効処理エラー: ${errorMessage}`);
        console.error(`顧客 ${customerId} の失効処理エラー:`, error);
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // cronジョブ実行履歴を記録
    await db.insert(cronJobLogs).values({
      logId: nanoid(),
      jobName: "expire-points",
      jobDescription: "期限切れポイント自動失効",
      status: errorCount === 0 ? "success" : "partial_success",
      startTime,
      endTime,
      duration,
      successCount,
      errorCount,
      details: JSON.stringify({
        totalExpiredPoints,
        expiredTransactionsCount: expiredTransactions.length,
        customersProcessed: customerGroups.size,
        errors: errors.slice(0, 10), // 最初の10件のみ記録
      }),
    });

    console.log(`期限切れポイント自動失効ジョブが完了しました`);
    console.log(`  成功: ${successCount}件`);
    console.log(`  エラー: ${errorCount}件`);
    console.log(`  失効ポイント合計: ${totalExpiredPoints}pt`);
    console.log(`  実行時間: ${duration}ms`);

    return {
      success: true,
      successCount,
      errorCount,
      totalExpiredPoints,
      duration,
    };
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const errorMessage = error instanceof Error ? error.message : String(error);

    // エラーログを記録
    await db.insert(cronJobLogs).values({
      logId: nanoid(),
      jobName: "expire-points",
      jobDescription: "期限切れポイント自動失効",
      status: "error",
      startTime,
      endTime,
      duration,
      successCount,
      errorCount,
      errorMessage,
      details: JSON.stringify({ errors }),
    });

    console.error("期限切れポイント自動失効ジョブでエラーが発生しました:", error);
    throw error;
  }
}

// スクリプトとして直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  expirePoints()
    .then(() => {
      console.log("期限切れポイント自動失効ジョブが正常に完了しました");
      process.exit(0);
    })
    .catch((error) => {
      console.error("期限切れポイント自動失効ジョブでエラーが発生しました:", error);
      process.exit(1);
    });
}
