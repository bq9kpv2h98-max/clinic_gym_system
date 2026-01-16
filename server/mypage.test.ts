import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { customers, visits, reservations } from "../drizzle/schema";
import { nanoid } from "nanoid";

/**
 * マイページ機能のテスト
 * 
 * テスト内容:
 * 1. 電話番号でのログイン
 * 2. マイページデータの取得
 * 3. 来院履歴の取得
 * 4. ポイント残高の取得
 */

describe("Mypage Router", () => {
  let testCustomerId: string;
  let testPhone: string;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // テスト用顧客データを作成
    testCustomerId = nanoid();
    testPhone = "09012345678";

    await db.insert(customers).values({
      customerId: testCustomerId,
      fullName: "テスト太郎",
      dateOfBirth: "1990-01-01",
      gender: "male",
      phone: testPhone,
      postalCode: "1000001",
      prefecture: "東京都",
      city: "千代田区",
      addressLine1: "千代田1-1-1",
      qrCodeData: JSON.stringify({ id: testCustomerId, type: "customer" }),
      qrCodeImageUrl: "https://example.com/qr.png",
      totalPoints: 100,
      lifetimePoints: 500,
      visitCount: 5,
      lastVisitDate: new Date(),
      registrationDate: new Date(),
    });

    // テスト用来院履歴を作成
    await db.insert(visits).values({
      visitId: nanoid(),
      customerId: testCustomerId,
      visitDate: new Date(),
      visitType: "整体",
      pointsEarned: 10,
      notes: "テスト来院",
    });

    // テスト用予約を作成
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    await db.insert(reservations).values({
      reservationId: nanoid(),
      customerId: testCustomerId,
      status: "confirmed",
      firstChoiceDate: futureDate,
      firstChoiceTimeSlot: "10:00-11:00",
      confirmedDate: futureDate,
      confirmedTimeSlot: "10:00-11:00",
      notes: "テスト予約",
      createdAt: new Date(),
    });
  });

  it("should login with phone number", async () => {
    const mockContext: TrpcContext = {
      req: {} as any,
      res: {} as any,
      user: null,
    };

    const caller = appRouter.createCaller(mockContext);
    const result = await caller.mypage.login({ phone: testPhone });

    expect(result).toBeDefined();
    expect(result.customerId).toBe(testCustomerId);
    expect(result.fullName).toBe("テスト太郎");
    expect(result.totalPoints).toBe(100);
  });

  it("should fail login with invalid phone", async () => {
    const mockContext: TrpcContext = {
      req: {} as any,
      res: {} as any,
      user: null,
    };

    const caller = appRouter.createCaller(mockContext);

    await expect(
      caller.mypage.login({ phone: "09099999999" })
    ).rejects.toThrow();
  });

  it("should get mypage data", async () => {
    const mockContext: TrpcContext = {
      req: {} as any,
      res: {} as any,
      user: null,
    };

    const caller = appRouter.createCaller(mockContext);
    const result = await caller.mypage.getMyPageData({ customerId: testCustomerId });

    expect(result).toBeDefined();
    expect(result.customer).toBeDefined();
    expect(result.customer.customerId).toBe(testCustomerId);
    expect(result.customer.totalPoints).toBe(100);
    expect(result.visitHistory).toBeDefined();
    expect(result.visitHistory.length).toBeGreaterThan(0);
    expect(result.upcomingReservations).toBeDefined();
    expect(result.upcomingReservations.length).toBeGreaterThan(0);
  });

  it("should get visit history", async () => {
    const mockContext: TrpcContext = {
      req: {} as any,
      res: {} as any,
      user: null,
    };

    const caller = appRouter.createCaller(mockContext);
    const result = await caller.mypage.getVisitHistory({
      customerId: testCustomerId,
      limit: 10,
      offset: 0,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should get point balance", async () => {
    const mockContext: TrpcContext = {
      req: {} as any,
      res: {} as any,
      user: null,
    };

    const caller = appRouter.createCaller(mockContext);
    const result = await caller.mypage.getPointBalance({ customerId: testCustomerId });

    expect(result).toBeDefined();
    expect(result.totalPoints).toBe(100);
    expect(result.lifetimePoints).toBe(500);
  });
});
