/**
 * Resend APIキーの動作確認テスト
 * 実際にメールを送信せず、APIキーが有効かどうかを確認する
 */
import { describe, it, expect } from "vitest";

describe("Resend API Key Validation", () => {
  it("RESEND_API_KEY が設定されていること", () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(apiKey!.length).toBeGreaterThan(0);
  });

  it("Resend API に接続できること（ドメイン一覧取得）", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    // 401 = 無効なAPIキー, 200 = 有効
    expect(response.status).not.toBe(401);
    expect([200, 403]).toContain(response.status); // 403はアクセス制限だが認証は通っている
  });
});
