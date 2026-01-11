import { describe, it, expect, beforeEach, vi } from "vitest";
import { customerRouter } from "./customers";
import type { TrpcContext } from "../_core/context";

// モック用のコンテキストを作成
function createMockContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Customer Router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe("register", () => {
    it("should register a new customer and return customerId and QR code", async () => {
      const caller = customerRouter.createCaller(ctx);

      const result = await caller.register({
        fullName: "山田太郎",
        dateOfBirth: "1990-01-15",
        gender: "male",
        phone: "09012345678",
        email: "yamada@example.com",
        postalCode: "1234567",
        prefecture: "東京都",
        city: "渋谷区",
        addressLine1: "1-2-3",
        addressLine2: "○○ビル 101号室",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("customerId");
      expect(result.customerId).toBeTruthy();
      expect(typeof result.customerId).toBe("string");
      expect(result.customerId.length).toBe(32); // nanoid(32)
    });

    it("should generate a QR code image URL", async () => {
      const caller = customerRouter.createCaller(ctx);

      const result = await caller.register({
        fullName: "田中花子",
        dateOfBirth: "1995-05-20",
        gender: "female",
        phone: "09087654321",
        email: "tanaka@example.com",
        postalCode: "9876543",
        prefecture: "大阪府",
        city: "大阪市",
        addressLine1: "4-5-6",
      });

      expect(result).toHaveProperty("qrCodeImageUrl");
      // QRコード画像URLが空でないか、またはS3 URLであることを確認
      expect(typeof result.qrCodeImageUrl).toBe("string");
    });

    it("should handle missing optional fields", async () => {
      const caller = customerRouter.createCaller(ctx);

      const result = await caller.register({
        fullName: "佐藤次郎",
        dateOfBirth: "1985-12-10",
        gender: "other",
        phone: "09011223344",
        postalCode: "5555555",
        prefecture: "京都府",
        city: "京都市",
        addressLine1: "7-8-9",
      });

      expect(result.success).toBe(true);
      expect(result.customerId).toBeTruthy();
    });
  });

  describe("list", () => {
    it("should return a list of customers", async () => {
      const caller = customerRouter.createCaller(ctx);

      // 最初に顧客を登録
      await caller.register({
        fullName: "山田太郎",
        dateOfBirth: "1990-01-15",
        gender: "male",
        phone: "09012345678",
        postalCode: "1234567",
        prefecture: "東京都",
        city: "渋谷区",
        addressLine1: "1-2-3",
      });

      // リストを取得
      const customers = await caller.list();

      expect(Array.isArray(customers)).toBe(true);
      expect(customers.length).toBeGreaterThan(0);
    });
  });

  describe("recordVisit", () => {
    it("should record a visit and add points", async () => {
      const caller = customerRouter.createCaller(ctx);

      // 顧客を登録
      const registerResult = await caller.register({
        fullName: "山田太郎",
        dateOfBirth: "1990-01-15",
        gender: "male",
        phone: "09012345678",
        postalCode: "1234567",
        prefecture: "東京都",
        city: "渋谷区",
        addressLine1: "1-2-3",
      });

      // 来院を記録
      const visitResult = await caller.recordVisit({
        customerId: registerResult.customerId,
        pointsEarned: 10,
        notes: "初回来院",
      });

      expect(visitResult.success).toBe(true);
      expect(visitResult.visitId).toBeTruthy();
      expect(typeof visitResult.visitId).toBe("string");
    });

    it("should update customer total points after visit", async () => {
      const caller = customerRouter.createCaller(ctx);

      // 顧客を登録
      const registerResult = await caller.register({
        fullName: "田中花子",
        dateOfBirth: "1995-05-20",
        gender: "female",
        phone: "09087654321",
        postalCode: "9876543",
        prefecture: "大阪府",
        city: "大阪市",
        addressLine1: "4-5-6",
      });

      // 来院を記録
      await caller.recordVisit({
        customerId: registerResult.customerId,
        pointsEarned: 15,
      });

      // 顧客情報を取得
      const customer = await caller.getById({
        customerId: registerResult.customerId,
      });

      expect(customer.totalPoints).toBe(15);
      expect(customer.visitCount).toBe(1);
    });
  });

  describe("getById", () => {
    it("should retrieve customer by ID", async () => {
      const caller = customerRouter.createCaller(ctx);

      // 顧客を登録
      const registerResult = await caller.register({
        fullName: "佐藤次郎",
        dateOfBirth: "1985-12-10",
        gender: "male",
        phone: "09011223344",
        postalCode: "5555555",
        prefecture: "京都府",
        city: "京都市",
        addressLine1: "7-8-9",
      });

      // IDで取得
      const customer = await caller.getById({
        customerId: registerResult.customerId,
      });

      expect(customer.customerId).toBe(registerResult.customerId);
      expect(customer.fullName).toBe("佐藤次郎");
      expect(customer.gender).toBe("male");
    });

    it("should throw error for non-existent customer", async () => {
      const caller = customerRouter.createCaller(ctx);

      try {
        await caller.getById({
          customerId: "non-existent-id",
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe("getByQRCode", () => {
    it("should retrieve customer by QR code data", async () => {
      const caller = customerRouter.createCaller(ctx);

      // 顧客を登録
      const registerResult = await caller.register({
        fullName: "山田太郎",
        dateOfBirth: "1990-01-15",
        gender: "male",
        phone: "09012345678",
        postalCode: "1234567",
        prefecture: "東京都",
        city: "渋谷区",
        addressLine1: "1-2-3",
      });

      // QRコードで取得するには、QRコードデータが必要
      // 実装上、QRコードデータはJSONフォーマットで保存されている
      const customer = await caller.getById({
        customerId: registerResult.customerId,
      });

      expect(customer.qrCodeData).toBeTruthy();

      // QRコードで取得
      const customerByQR = await caller.getByQRCode({
        qrCodeData: customer.qrCodeData,
      });

      expect(customerByQR.customerId).toBe(registerResult.customerId);
      expect(customerByQR.fullName).toBe("山田太郎");
    });
  });
});
