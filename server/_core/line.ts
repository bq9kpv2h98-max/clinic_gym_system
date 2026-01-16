/**
 * LINE Messaging APIヘルパー
 * 
 * LINE Messaging APIを使用してメッセージを送信します。
 * 環境変数LINE_CHANNEL_ACCESS_TOKENとLINE_NOTIFY_USER_IDが必要です。
 */

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
