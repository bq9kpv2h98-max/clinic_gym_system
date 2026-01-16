import { describe, it, expect, beforeAll } from "vitest";
import { searchNotionCustomersByName, getNotionCustomerDetails, updateNotionCustomer } from "./notion";

describe("Notion連携管理機能", () => {
  describe("searchNotionCustomersByName", () => {
    it("顧客名でNotion顧客を検索できる", async () => {
      const results = await searchNotionCustomersByName("テスト");
      
      // 結果が配列であることを確認
      expect(Array.isArray(results)).toBe(true);
      
      // 結果がある場合、各項目が必要なプロパティを持つことを確認
      if (results.length > 0) {
        const customer = results[0];
        expect(customer).toHaveProperty("id");
        expect(customer).toHaveProperty("name");
        expect(customer).toHaveProperty("url");
      }
    }, 30000);

    it("空の検索クエリでも正常に動作する", async () => {
      const results = await searchNotionCustomersByName("");
      expect(Array.isArray(results)).toBe(true);
    }, 30000);
  });

  describe("getNotionCustomerDetails", () => {
    it("存在しないページIDでnullを返す", async () => {
      const result = await getNotionCustomerDetails("invalid-page-id");
      expect(result).toBeNull();
    }, 30000);
  });

  describe("updateNotionCustomer", () => {
    it("更新が正常に実行される", async () => {
      // テスト用の更新データ
      const updates = {
        phone: "09012345678",
      };
      
      // 存在しないページIDでも関数がエラーを投げないことを確認
      const result = await updateNotionCustomer("test-page-id", updates);
      expect(typeof result).toBe("boolean");
    }, 30000);
  });
});

describe("Notion定期同期機能", () => {
  it("同期スクリプトが正常にインポートできる", async () => {
    const { syncNotionCustomers } = await import("./cron/sync-notion-customers");
    expect(typeof syncNotionCustomers).toBe("function");
  });
});
