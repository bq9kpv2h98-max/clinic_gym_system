/**
 * メール送信ヘルパー
 * 
 * Resend APIを使用してメールを送信します。
 * 環境変数RESEND_API_KEYが必要です。
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * メールを送信
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, subject, html, from = "noreply@manus.space" } = params;

  // Resend API keyが設定されていない場合はログのみ
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[Email] RESEND_API_KEY not configured. Email would be sent:");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  From: ${from}`);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Email] Failed to send email:", error);
      return false;
    }

    const result = await response.json();
    console.log("[Email] Email sent successfully:", result.id);
    return true;
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    return false;
  }
}

/**
 * 予約確認メールを送信
 */
export async function sendReservationConfirmationEmail(params: {
  to: string;
  customerName: string;
  reservationId: string;
  firstChoiceDate: Date;
  firstChoiceTimeSlot: string;
  secondChoiceDate?: Date;
  secondChoiceTimeSlot?: string;
  thirdChoiceDate?: Date;
  thirdChoiceTimeSlot?: string;
  qrCodeImageUrl?: string;
}): Promise<boolean> {
  const {
    to,
    customerName,
    reservationId,
    firstChoiceDate,
    firstChoiceTimeSlot,
    secondChoiceDate,
    secondChoiceTimeSlot,
    thirdChoiceDate,
    thirdChoiceTimeSlot,
    qrCodeImageUrl,
  } = params;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ご予約確認</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">ご予約ありがとうございます</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      ${customerName} 様
    </p>
    
    <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
      この度はご予約いただき、誠にありがとうございます。<br>
      以下の内容でご予約を承りました。
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #667eea;">
      <h2 style="font-size: 18px; color: #667eea; margin-top: 0;">ご予約内容</h2>
      <p style="font-size: 12px; color: #999; margin-bottom: 15px;">予約ID: ${reservationId.slice(0, 8)}</p>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #667eea;">第1希望</strong><br>
        <span style="font-size: 16px;">${formatDate(firstChoiceDate)} ${firstChoiceTimeSlot}</span>
      </div>
      
      ${secondChoiceDate && secondChoiceTimeSlot ? `
      <div style="margin-bottom: 15px;">
        <strong style="color: #666;">第2希望</strong><br>
        <span style="font-size: 14px;">${formatDate(secondChoiceDate)} ${secondChoiceTimeSlot}</span>
      </div>
      ` : ''}
      
      ${thirdChoiceDate && thirdChoiceTimeSlot ? `
      <div style="margin-bottom: 15px;">
        <strong style="color: #666;">第3希望</strong><br>
        <span style="font-size: 14px;">${formatDate(thirdChoiceDate)} ${thirdChoiceTimeSlot}</span>
      </div>
      ` : ''}
    </div>
    
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #ffc107;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>📌 ご確認ください</strong><br>
        確定日時は後ほど担当者よりご連絡いたします。<br>
        ご希望に添えない場合もございますので、予めご了承ください。
      </p>
    </div>
    
    ${qrCodeImageUrl ? `
    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
      <h2 style="font-size: 18px; color: #667eea; margin-top: 0;">診察券QRコード</h2>
      <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
        来院時にこちらのQRコードをご提示ください
      </p>
      <img src="${qrCodeImageUrl}" alt="診察券QRコード" style="width: 200px; height: 200px; border: 2px solid #e5e7eb; border-radius: 8px;">
      <p style="font-size: 12px; color: #999; margin-top: 10px;">
        ※スマートフォンでこのメールを開き、QRコードを表示してください
      </p>
    </div>
    ` : ''}
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <h2 style="font-size: 18px; color: #667eea; margin-top: 0;">来院時のご案内</h2>
      <ul style="font-size: 14px; color: #666; padding-left: 20px;">
        <li>受付で診察券QRコードをご提示ください</li>
        <li>初回の方は問診票のご記入をお願いいたします</li>
        <li>ご予約時間の5分前にお越しください</li>
      </ul>
    </div>
    
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #999; margin: 0;">
        このメールは自動送信されています。<br>
        ご不明な点がございましたら、お気軽にお問い合わせください。
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject: "【ご予約確認】ご予約を承りました",
    html,
  });
}
