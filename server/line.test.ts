/**
 * LINE Messaging APIのテスト
 */

import { describe, it, expect } from "vitest";
import { sendLineMessage, notifyOwnerViaLine, notifyOwnerViaWebhook } from "./_core/line";

describe("LINE Messaging API", () => {
  it("should have LINE_CHANNEL_ACCESS_TOKEN configured", () => {
    expect(process.env.LINE_CHANNEL_ACCESS_TOKEN).toBeDefined();
    expect(process.env.LINE_CHANNEL_ACCESS_TOKEN).not.toBe("");
  });

  it("should have LINE_NOTIFY_USER_ID configured", () => {
    expect(process.env.LINE_NOTIFY_USER_ID).toBeDefined();
    expect(process.env.LINE_NOTIFY_USER_ID).not.toBe("");
  });

  it("should send LINE message to owner", async () => {
    const result = await notifyOwnerViaLine({
      title: "テスト通知",
      content: "これはテスト通知です。システムが正常に動作しています。",
    });

    expect(result).toBe(true);
  }, 30000);
});
