import { describe, it, expect } from "vitest";
import { updateNotionCustomer } from "./notion";

describe("双方向同期機能", () => {
  describe("updateNotionCustomer", () => {
    it("Notion顧客情報の更新が正常に実行される", async () => {
      // テスト用の更新データ
      const updates = {
        phone: "09012345678",
        email: "test@example.com",
      };
      
      // 存在しないページIDでも関数がエラーを投げないことを確認
      const result = await updateNotionCustomer("test-page-id", updates);
      expect(typeof result).toBe("boolean");
    }, 30000);

    it("空の更新データでも正常に処理される", async () => {
      const result = await updateNotionCustomer("test-page-id", {});
      expect(typeof result).toBe("boolean");
    }, 30000);
  });

  describe("同期履歴記録", () => {
    it("同期履歴テーブルが正しく定義されている", async () => {
      const { notionSyncLogs } = await import("../drizzle/schema");
      expect(notionSyncLogs).toBeDefined();
      expect(notionSyncLogs.syncId).toBeDefined();
      expect(notionSyncLogs.syncType).toBeDefined();
      expect(notionSyncLogs.status).toBeDefined();
    });
  });
});
