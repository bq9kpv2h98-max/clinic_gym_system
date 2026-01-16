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

describe("予約紐付け機能", () => {
  describe("notionLink.linkExistingReservations", () => {
    it("予約を顧客マスターと自動紐付けできる", async () => {
      const { appRouter } = await import("./routers");
      const mockContext = {
        user: {
          openId: "test-open-id",
          name: "Test User",
          email: "test@example.com",
          avatarUrl: "",
          role: "admin" as const,
        },
      };

      const caller = appRouter.createCaller(mockContext);
      const result = await caller.notionLink.linkExistingReservations();

      // 結果の構造を確認
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("failed");
      expect(result).toHaveProperty("details");

      // totalがsuccessとfailedの合計であることを確認
      expect(result.total).toBe(result.success + result.failed);

      // details配列を確認
      expect(Array.isArray(result.details)).toBe(true);
      if (result.details.length > 0) {
        const firstDetail = result.details[0];
        expect(firstDetail).toHaveProperty("reservationTitle");
        expect(firstDetail).toHaveProperty("customerName");
        expect(firstDetail).toHaveProperty("status");
        expect(["success", "failed"]).toContain(firstDetail.status);
      }
    }, 60000);

    it("紐付け対象の予約がない場合も正常に動作する", async () => {
      const { appRouter } = await import("./routers");
      const mockContext = {
        user: {
          openId: "test-open-id",
          name: "Test User",
          email: "test@example.com",
          avatarUrl: "",
          role: "admin" as const,
        },
      };

      const caller = appRouter.createCaller(mockContext);
      const result = await caller.notionLink.linkExistingReservations();

      // 有効な構造を返すことを確認
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.success).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.details)).toBe(true);
    }, 60000);

    it("認証が必要", async () => {
      const { appRouter } = await import("./routers");
      const mockContext = {
        user: null,
      };

      const caller = appRouter.createCaller(mockContext);

      // UNAUTHORIZED エラーを投げることを確認
      await expect(
        caller.notionLink.linkExistingReservations()
      ).rejects.toThrow();
    }, 30000);
  });
});
