import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { customers, visits } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

describe("Staff Scanner", () => {
  let testCustomerId: string;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // テスト用顧客を作成
    const customerId = nanoid();
    await db
      .insert(customers)
      .values({
        customerId,
        fullName: "テスト顧客",
        phone: "09099999999",
        email: "test@example.com",
        gender: "male",
        dateOfBirth: new Date("1990-01-01"),
        postalCode: "1500001",
        prefecture: "東京都",
        city: "渋谷区",
        addressLine1: "神宮前1-1-1",
        qrCodeData: customerId,
        totalPoints: 50,
        qrCodeImageUrl: "https://example.com/qr.png",
      });

    testCustomerId = customerId;
  });

  it("should get customer by QR code", async () => {
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    const result = await caller.staff.getCustomerByQR({
      customerId: testCustomerId,
    });

    expect(result.customer).toBeDefined();
    expect(result.customer.fullName).toBe("テスト顧客");
    expect(result.customer.totalPoints).toBe(50);
    expect(result.visitHistory).toBeDefined();
    expect(Array.isArray(result.visitHistory)).toBe(true);
  });

  it("should record visit and add points", async () => {
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    const result = await caller.staff.recordVisit({
      customerId: testCustomerId,
      pointsEarned: 10,
    });

    expect(result.visitId).toBeDefined();
    expect(result.pointsEarned).toBe(10);
    expect(result.newTotalPoints).toBe(60); // 50 + 10

    // データベースを確認
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.customerId, testCustomerId))
      .limit(1);

    expect(customer.totalPoints).toBe(60);

    const visitRecords = await db
      .select()
      .from(visits)
      .where(eq(visits.customerId, testCustomerId));

    expect(visitRecords.length).toBeGreaterThan(0);
    expect(visitRecords[0].pointsEarned).toBe(10);
  });

  it("should throw error for non-existent customer", async () => {
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    await expect(
      caller.staff.getCustomerByQR({
        customerId: "non-existent-id",
      })
    ).rejects.toThrow("顧客が見つかりません");
  });

  it("should throw error when recording visit for non-existent customer", async () => {
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    await expect(
      caller.staff.recordVisit({
        customerId: "non-existent-id",
        pointsEarned: 10,
      })
    ).rejects.toThrow("顧客が見つかりません");
  });
});
