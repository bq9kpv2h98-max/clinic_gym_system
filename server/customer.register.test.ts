import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import { getDb } from "./db";
import { customers } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("customers.register", () => {
  const mockContext: Context = {
    user: null,
    req: {} as any,
    res: {} as any,
  };

  const caller = appRouter.createCaller(mockContext);

  beforeEach(async () => {
    // テストデータのクリーンアップ
    const db = await getDb();
    if (db) {
      await db.delete(customers).where(eq(customers.phone, "09011112222"));
    }
  });

  it("should register a new customer with valid data", async () => {
    const result = await caller.customers.register({
      fullName: "テスト太郎",
      dateOfBirth: "1990-05-15",
      gender: "male",
      phone: "09011112222",
      email: "test@example.com",
      postalCode: "1500001",
      prefecture: "東京都",
      city: "渋谷区神宮前",
      addressLine1: "1-2-3",
      addressLine2: "テストビル 101号室",
      customFields: {},
    });

    expect(result).toBeDefined();
    expect(result.customerId).toBeDefined();
    expect(result.qrCodeImageUrl).toBeDefined();
    expect(result.qrCodeImageUrl).toMatch(/^(data:image\/png;base64|https:\/\/)/); // Base64 or S3 URL
  });

  it("should register a customer without optional email", async () => {
    const result = await caller.customers.register({
      fullName: "テスト次郎",
      dateOfBirth: "1985-03-20",
      gender: "male",
      phone: "09011112222",
      postalCode: "1500001",
      prefecture: "東京都",
      city: "渋谷区神宮前",
      addressLine1: "1-2-3",
      customFields: {},
    });

    expect(result).toBeDefined();
    expect(result.customerId).toBeDefined();
    expect(result.qrCodeImageUrl).toBeDefined();
  });

  it("should reject registration with invalid phone number", async () => {
    await expect(
      caller.customers.register({
        fullName: "テスト三郎",
        dateOfBirth: "1995-07-10",
        gender: "male",
        phone: "123", // Invalid phone number
        postalCode: "1500001",
        prefecture: "東京都",
        city: "渋谷区神宮前",
        addressLine1: "1-2-3",
        customFields: {},
      })
    ).rejects.toThrow();
  });

  it("should reject registration with missing required fields", async () => {
    await expect(
      caller.customers.register({
        fullName: "",
        dateOfBirth: "1990-01-01",
        gender: "male",
        phone: "09011112222",
        postalCode: "1500001",
        prefecture: "東京都",
        city: "渋谷区神宮前",
        addressLine1: "1-2-3",
        customFields: {},
      })
    ).rejects.toThrow();
  });

  it("should store customer data in database correctly", async () => {
    const result = await caller.customers.register({
      fullName: "テスト花子",
      dateOfBirth: "1992-12-25",
      gender: "female",
      phone: "09011112222",
      email: "hanako@example.com",
      postalCode: "1500001",
      prefecture: "東京都",
      city: "渋谷区神宮前",
      addressLine1: "1-2-3",
      addressLine2: "テストマンション 202号室",
      customFields: {},
    });

    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const [customer] = await db.select().from(customers).where(eq(customers.customerId, result.customerId)).limit(1);

    expect(customer).toBeDefined();
    expect(customer?.fullName).toBe("テスト花子");
    expect(customer?.phone).toBe("09011112222");
    expect(customer?.email).toBe("hanako@example.com");
    expect(customer?.prefecture).toBe("東京都");
    expect(customer?.city).toBe("渋谷区神宮前");
  });
});
