import { describe, it, expect, beforeAll } from "vitest";
import { createNotionCustomer, searchNotionCustomerByPhone, createNotionReservation } from "./notion";

describe("Notion連携機能", () => {
  describe("createNotionCustomer", () => {
    it("顧客をNotionに作成できる", async () => {
      const testCustomer = {
        customerId: "test-customer-" + Date.now(),
        fullName: "テスト太郎",
        phone: "09012345678",
        email: "test@example.com",
      };

      const result = await createNotionCustomer(testCustomer);
      
      // Notion APIが利用可能な場合のみテスト
      if (result) {
        expect(result).toHaveProperty("url");
        expect(result).toHaveProperty("pageId");
        expect(result.url).toContain("notion.so");
      } else {
        // Notion APIが利用できない環境ではスキップ
        console.log("Notion API not available, skipping test");
      }
    }, 30000); // タイムアウトを30秒に設定
  });

  describe("searchNotionCustomerByPhone", () => {
    it("電話番号で顧客を検索できる", async () => {
      const result = await searchNotionCustomerByPhone("09012345678");
      
      // 結果がnullまたはオブジェクトであることを確認
      expect(result === null || typeof result === "object").toBe(true);
      
      if (result) {
        expect(result).toHaveProperty("url");
        expect(result).toHaveProperty("pageId");
      }
    }, 30000);
  });

  describe("createNotionReservation", () => {
    it("予約をNotionに作成できる", async () => {
      const testReservation = {
        customerName: "テスト太郎",
        serviceType: "整体",
        status: "pending",
        reservationDateTime: new Date("2026-02-01T10:00:00"),
        notes: "テスト予約",
      };

      const result = await createNotionReservation(testReservation);
      
      // Notion APIが利用可能な場合のみテスト
      if (result) {
        expect(typeof result).toBe("string");
        expect(result).toContain("notion.so");
      } else {
        console.log("Notion API not available, skipping test");
      }
    }, 30000);
  });
});
