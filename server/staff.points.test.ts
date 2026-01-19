import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { customers, pointTransactions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Staff Points Management", () => {
  let testCustomerId: string;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // テスト用顧客を作成
    const customerId = `test-${Date.now()}`;
    await db.insert(customers).values({
      customerId,
      fullName: "テスト顧客",
      phone: `090${Date.now().toString().slice(-8)}`,
      email: `test${Date.now()}@example.com`,
      dateOfBirth: new Date("1990-01-01"),
      gender: "male",
      postalCode: "1500001",
      prefecture: "東京都",
      city: "渋谷区",
      addressLine1: "神宮前1-1-1",
      qrCodeData: `test-qr-${Date.now()}`,
      totalPoints: 100,
    });
    testCustomerId = customerId;
  });

  it("should add points to customer", async () => {
    const caller = appRouter.createCaller({ user: null });
    const result = await caller.staff.addPoints({
      customerId: testCustomerId,
      points: 50,
      description: "テストポイント付与",
    });

    expect(result.transactionId).toBeDefined();
    expect(result.newTotalPoints).toBe(150);

    // データベースを確認
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.customerId, testCustomerId))
      .limit(1)
      .then((rows) => rows[0]);

    expect(customer.totalPoints).toBe(150);

    // トランザクション履歴を確認
    const transactions = await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.customerId, testCustomerId));

    expect(transactions.length).toBeGreaterThan(0);
    const latestTransaction = transactions[transactions.length - 1];
    expect(latestTransaction.transactionType).toBe("earn");
    expect(latestTransaction.points).toBe(50);
  });

  it("should redeem points from customer", async () => {
    const caller = appRouter.createCaller({ user: null });
    const result = await caller.staff.redeemPoints({
      customerId: testCustomerId,
      points: 30,
      description: "テストポイント使用",
    });

    expect(result.transactionId).toBeDefined();
    expect(result.newTotalPoints).toBe(120);

    // データベースを確認
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.customerId, testCustomerId))
      .limit(1)
      .then((rows) => rows[0]);

    expect(customer.totalPoints).toBe(120);
  });

  it("should fail to redeem more points than available", async () => {
    const caller = appRouter.createCaller({ user: null });

    await expect(
      caller.staff.redeemPoints({
        customerId: testCustomerId,
        points: 200,
        description: "テストポイント使用（失敗）",
      })
    ).rejects.toThrow("ポイント残高が不足しています");
  });

  it("should fail to add negative points", async () => {
    const caller = appRouter.createCaller({ user: null });

    await expect(
      caller.staff.addPoints({
        customerId: testCustomerId,
        points: -10,
        description: "テストポイント付与（失敗）",
      })
    ).rejects.toThrow();
  });
});
