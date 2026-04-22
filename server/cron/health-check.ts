/**
 * 本番サーバー死活監視
 * 
 * /api/health エンドポイントを定期的にチェックし、
 * サーバーが応答しない場合にLINE通知を送信します。
 */

import { notifyOwnerViaLine } from "../_core/line";

// 連続失敗回数を追跡（再起動後にリセット）
let consecutiveFailures = 0;
let lastAlertSentAt: Date | null = null;

// アラート送信間隔（30分に1回）
const ALERT_INTERVAL_MS = 30 * 60 * 1000;

/**
 * 本番サーバーのヘルスチェックを実行
 */
export async function checkServerHealth(): Promise<void> {
  const healthUrl = process.env.HEALTH_CHECK_URL || "https://ulu-connect.com/api/health";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

    const response = await fetch(healthUrl, {
      method: "GET",
      signal: controller.signal,
      headers: { "Cache-Control": "no-cache" },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      // 正常応答 → 連続失敗カウントをリセット
      if (consecutiveFailures > 0) {
        console.log(`[HealthCheck] Server recovered after ${consecutiveFailures} failures`);
        // 復旧通知
        await notifyOwnerViaLine({
          title: "🟢 サーバー復旧",
          content: `本番サーバーが復旧しました。\n\n${consecutiveFailures}回の失敗後に正常応答を確認しました。\n確認時刻: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
        }).catch(() => {});
      }
      consecutiveFailures = 0;
      console.log(`[HealthCheck] OK - ${new Date().toISOString()}`);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    consecutiveFailures++;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[HealthCheck] FAILED (${consecutiveFailures} consecutive): ${errorMessage}`);

    // 3回連続失敗でアラート送信（30分に1回まで）
    if (consecutiveFailures >= 3) {
      const now = new Date();
      const shouldSendAlert =
        !lastAlertSentAt ||
        now.getTime() - lastAlertSentAt.getTime() > ALERT_INTERVAL_MS;

      if (shouldSendAlert) {
        lastAlertSentAt = now;
        const jstTime = now.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

        console.log("[HealthCheck] Sending LINE alert...");
        await notifyOwnerViaLine({
          title: "🔴 サーバー障害アラート",
          content: `本番サーバーが応答していません！\n\n連続失敗回数: ${consecutiveFailures}回\nエラー: ${errorMessage}\n検知時刻: ${jstTime}\n\nURL: https://ulu-connect.com\n\n管理画面から再デプロイをお試しください。`,
        }).catch((e) => {
          console.error("[HealthCheck] Failed to send LINE alert:", e);
        });
      }
    }
  }
}
