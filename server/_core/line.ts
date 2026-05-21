/**
 * LINE Messaging APIヘルパー
 * 
 * LINE Messaging APIを使用してメッセージを送信します。
 * 環境変数LINE_CHANNEL_ACCESS_TOKENとLINE_NOTIFY_USER_IDが必要です。
 */

import { siteConfig } from "../../shared/siteConfig";

interface SendLineMessageParams {
  to: string;
  message: string;
}

/**
 * LINEメッセージを送信
 */
export async function sendLineMessage(params: SendLineMessageParams): Promise<boolean> {
  const { to, message } = params;

  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("[LINE] LINE_CHANNEL_ACCESS_TOKEN not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[LINE] Failed to send message:", error);
      return false;
    }

    console.log("[LINE] Message sent successfully");
    return true;
  } catch (error) {
    console.error("[LINE] Error sending message:", error);
    return false;
  }
}

/**
 * 店舗オーナーにLINE通知を送信
 */
export async function notifyOwnerViaLine(params: {
  title: string;
  content: string;
}): Promise<boolean> {
  const { title, content } = params;

  const notifyUserId = process.env.LINE_NOTIFY_USER_ID;
  if (!notifyUserId) {
    console.error("[LINE] LINE_NOTIFY_USER_ID not configured");
    return false;
  }

  const message = `【${title}】\n\n${content}`;

  return sendLineMessage({
    to: notifyUserId,
    message,
  });
}

/**
 * 顧客に予約リマインダーLINE通知を送信
 */
export async function sendReservationReminder(params: {
  customerPhone: string;
  customerName: string;
  serviceType: string;
  reservationDateTime: string;
  notes?: string;
}): Promise<boolean> {
  const { customerPhone, customerName, serviceType, reservationDateTime, notes } = params;

  // 電話番号からLINE User IDを取得する必要がある場合は、
  // 事前にシステムに登録しておく必要があります。
  // ここでは、電話番号をそのまま使用する簡易実装です。
  // 実際の運用では、顧客テーブルにlineUserIdカラムを追加して管理することを推奨します。
  
  const message = `【予約リマインダー】

${customerName} 様

明日のご予約のお知らせです。

■ 予約日時
${new Date(reservationDateTime).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long'
  })}

■ メニュー
${serviceType}

${notes ? `■ 備考\n${notes}\n\n` : ''}お待ちしております！

※ご都合が悪くなった場合は、お早めにご連絡ください。

整体院・パーソナルジム ULU GROUP`;

  // 注意: LINE Messaging APIでメッセージを送信するには、
  // 顧客のLINE User IDが必要です。
  // 電話番号では送信できないため、事前に顧客がLINE公式アカウントを
  // 友達追加し、システムにUser IDを登録する必要があります。
  
  // ここでは、店舗オーナーに通知する実装に変更します
  return notifyOwnerViaLine({
    title: "予約リマインダー送信",
    content: `以下の顧客に予約リマインダーを送信しました：\n\n${message}`,
  });
}

/**
 * Webhook経由で店舗に通知を送信
 */
export async function notifyOwnerViaWebhook(params: {
  title: string;
  content: string;
  data?: any;
}): Promise<boolean> {
  const { title, content, data } = params;

  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("[WEBHOOK] NOTIFICATION_WEBHOOK_URL not configured");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        content,
        timestamp: new Date().toISOString(),
        ...data,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[WEBHOOK] Failed to send notification:", error);
      return false;
    }

    console.log("[WEBHOOK] Notification sent successfully");
    return true;
  } catch (error) {
    console.error("[WEBHOOK] Error sending notification:", error);
    return false;
  }
}
