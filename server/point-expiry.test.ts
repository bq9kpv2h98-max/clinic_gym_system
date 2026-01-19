/**
 * ポイント有効期限機能のテストスイート
 */

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { customers, pointTransactions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

describe("ポイント有効期限機能", () => {
  let testCustomerId: string;

  it("ポイント付与時に有効期限を設定できる", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // テスト用顧客を作成
    testCustomerId = nanoid();
    await db.insert(customers).values({
      customerId: testCustomerId,
      fullName: "テスト顧客",
      dateOfBirth: new Date("1990-01-01"),
      gender: "male",
      phone: "09012345678",
      postalCode: "1000001",
      prefecture: "東京都",
      city: "千代田区",
      addressLine1: "千代田1-1-1",
      qrCodeData: `test-qr-${testCustomerId}`,
      totalPoints: 0,
      lifetimePoints: 0,
      visitCount: 0,
    });

    const caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "test-user",
        name: "Test User",
        email: "test@example.com",
        role: "admin",
      },
    });

    // 有効期限を6ヶ月後に設定
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    const result = await caller.staff.addPoints({
      customerId: testCustomerId,
      points: 100,
      description: "テストポイント付与",
      expiresAt: expiresAt.toISOString(),
    });

    expect(result.points).toBe(100);
    expect(result.newTotalPoints).toBe(100);

    // ポイント取引履歴を確認
    const transactions = await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.customerId, testCustomerId));

    expect(transactions.length).toBe(1);
    expect(transactions[0].points).toBe(100);
    expect(transactions[0].expiresAt).toBeTruthy();

    console.log("✅ ポイント付与時に有効期限を設定できる");
  });

  it("有効期限が指定されない場合はデフォルト6ヶ月後に設定される", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "test-user",
        name: "Test User",
        email: "test@example.com",
        role: "admin",
      },
    });

    // 有効期限を指定せずにポイント付与
    await caller.staff.addPoints({
      customerId: testCustomerId,
      points: 50,
      description: "デフォルト有効期限テスト",
    });

    // ポイント取引履歴を確認
    const transactions = await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.customerId, testCustomerId))
      .orderBy(pointTransactions.createdAt);

    expect(transactions.length).toBe(2);
    const latestTransaction = transactions[1];
    expect(latestTransaction.points).toBe(50);
    expect(latestTransaction.expiresAt).toBeTruthy();

    // 有効期限が約6ヶ月後であることを確認
    const expiryDate = new Date(latestTransaction.expiresAt!);
    const now = new Date();
    const diffInMonths = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    expect(diffInMonths).toBeGreaterThan(5);
    expect(diffInMonths).toBeLessThan(7);

    console.log("✅ 有効期限が指定されない場合はデフォルト6ヶ月後に設定される");
  });

  it("期限切れポイントを失効できる", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 期限切れのポイントを作成
    const expiredCustomerId = nanoid();
    await db.insert(customers).values({
      customerId: expiredCustomerId,
      fullName: "期限切れテスト顧客",
      dateOfBirth: new Date("1990-01-01"),
      gender: "male",
      phone: "09087654321",
      postalCode: "1000001",
      prefecture: "東京都",
      city: "千代田区",
      addressLine1: "千代田1-1-1",
      qrCodeData: `test-qr-${expiredCustomerId}`,
      totalPoints: 100,
      lifetimePoints: 100,
      visitCount: 0,
    });

    // 期限切れのポイント取引を作成
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1); // 昨日が有効期限

    await db.insert(pointTransactions).values({
      transactionId: nanoid(),
      customerId: expiredCustomerId,
      transactionType: "earn",
      points: 100,
      balanceAfter: 100,
      description: "期限切れテストポイント",
      expiresAt: expiredDate,
    });

    // 期限切れポイント自動失効関数をインポートして実行
    const { expirePoints } = await import("./cron/expire-points");
    const result = await expirePoints();

    expect(result.success).toBe(true);
    expect(result.successCount).toBeGreaterThan(0);

    // 顧客のポイント残高が0になっていることを確認
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.customerId, expiredCustomerId))
      .limit(1);

    expect(customer.totalPoints).toBe(0);

    console.log("✅ 期限切れポイントを失効できる");
  });

  it("有効期限7日前の通知を送信できる", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 7日後に期限切れとなるポイントを作成
    const expiringCustomerId = nanoid();
    await db.insert(customers).values({
      customerId: expiringCustomerId,
      fullName: "期限切れ間近テスト顧客",
      dateOfBirth: new Date("1990-01-01"),
      gender: "male",
      phone: "09011112222",
      postalCode: "1000001",
      prefecture: "東京都",
      city: "千代田区",
      addressLine1: "千代田1-1-1",
      qrCodeData: `test-qr-${expiringCustomerId}`,
      totalPoints: 50,
      lifetimePoints: 50,
      visitCount: 0,
    });

    // 7日後に期限切れとなるポイント取引を作成
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 7);

    await db.insert(pointTransactions).values({
      transactionId: nanoid(),
      customerId: expiringCustomerId,
      transactionType: "earn",
      points: 50,
      balanceAfter: 50,
      description: "期限切れ間近テストポイント",
      expiresAt: expiringDate,
    });

    // 有効期限事前通知関数をインポートして実行
    const { notifyExpiringPoints } = await import("./cron/notify-expiring-points");
    const result = await notifyExpiringPoints();

    expect(result.success).toBe(true);
    expect(result.successCount).toBeGreaterThan(0);

    console.log("✅ 有効期限7日前の通知を送信できる");
  });
});
