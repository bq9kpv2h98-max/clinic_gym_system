import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import {
  advertisingChannels,
  advertisingExpenses,
  customerAcquisitionChannels,
  facilities,
  customers,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

describe("Advertising Router", () => {
  let db: any;
  let facilityId: string;
  let channelId: string;
  let customerId: string;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // テスト用施設を作成
    facilityId = nanoid();
    await db.insert(facilities).values({
      facilityId,
      facilityName: "Test Facility",
      facilityType: "clinic",
    });

    // テスト用顧客を作成
    customerId = nanoid();
    const qrCodeData = `CUSTOMER_${customerId}`;
    await db.insert(customers).values({
      customerId,
      fullName: "Test Customer",
      dateOfBirth: new Date("1990-01-01"),
      gender: "male",
      phone: "09012345678",
      email: "test@example.com",
      postalCode: "150-0001",
      prefecture: "Tokyo",
      city: "Shibuya",
      addressLine1: "1-1-1",
      qrCodeData,
    });
  });

  afterAll(async () => {
    // クリーンアップ
    if (db) {
      await db
        .delete(customerAcquisitionChannels)
        .where(eq(customerAcquisitionChannels.facilityId, facilityId));
      await db
        .delete(advertisingExpenses)
        .where(eq(advertisingExpenses.facilityId, facilityId));
      await db
        .delete(advertisingChannels)
        .where(eq(advertisingChannels.facilityId, facilityId));
      await db
        .delete(customers)
        .where(eq(customers.customerId, customerId));
      await db
        .delete(facilities)
        .where(eq(facilities.facilityId, facilityId));
    }
  });

  it("should create advertising channel", async () => {
    channelId = nanoid();
    const result = await db.insert(advertisingChannels).values({
      channelId,
      facilityId,
      channelName: "Google Ads",
      channelType: "google_ads",
      description: "Test channel",
    });

    const channel = await db
      .select()
      .from(advertisingChannels)
      .where(eq(advertisingChannels.channelId, channelId));

    expect(channel).toHaveLength(1);
    expect(channel[0].channelName).toBe("Google Ads");
  });

  it("should record advertising expense", async () => {
    const expenseId = nanoid();
    await db.insert(advertisingExpenses).values({
      expenseId,
      facilityId,
      channelId,
      expenseDate: new Date("2024-01-15"),
      amount: 10000,
      budget: 50000,
      description: "Test expense",
    });

    const expense = await db
      .select()
      .from(advertisingExpenses)
      .where(eq(advertisingExpenses.expenseId, expenseId));

    expect(expense).toHaveLength(1);
    expect(expense[0].amount).toBe(10000);
  });

  it("should record customer acquisition channel", async () => {
    const acquisitionId = nanoid();
    await db.insert(customerAcquisitionChannels).values({
      acquisitionId,
      customerId,
      facilityId,
      channelId,
    });

    const acquisition = await db
      .select()
      .from(customerAcquisitionChannels)
      .where(eq(customerAcquisitionChannels.acquisitionId, acquisitionId));

    expect(acquisition).toHaveLength(1);
    expect(acquisition[0].customerId).toBe(customerId);
  });

  it("should list advertising channels", async () => {
    const channels = await db
      .select()
      .from(advertisingChannels)
      .where(eq(advertisingChannels.facilityId, facilityId));

    expect(channels.length).toBeGreaterThan(0);
    expect(channels[0].facilityId).toBe(facilityId);
  });

  it("should list advertising expenses", async () => {
    const expenses = await db
      .select()
      .from(advertisingExpenses)
      .where(eq(advertisingExpenses.facilityId, facilityId));

    expect(expenses.length).toBeGreaterThan(0);
    expect(expenses[0].facilityId).toBe(facilityId);
  });

  it("should calculate CPA correctly", async () => {
    // 広告費: 10000円
    // 新規顧客: 1人
    // CPA = 10000 / 1 = 10000

    const expenses = await db
      .select()
      .from(advertisingExpenses)
      .where(eq(advertisingExpenses.channelId, channelId));

    const totalExpense = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

    const acquisitions = await db
      .select()
      .from(customerAcquisitionChannels)
      .where(eq(customerAcquisitionChannels.channelId, channelId));

    const newCustomerCount = acquisitions.length;
    const cpa = newCustomerCount > 0 ? Math.round(totalExpense / newCustomerCount) : 0;

    expect(cpa).toBe(10000);
  });
});
