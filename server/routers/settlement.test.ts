import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import {
  getMonthlySettlementData,
  generateSettlementSummary,
} from "../db/settlement";
import { sales, customers, pointTransactions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Settlement Router", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");
  });

  afterAll(async () => {
    // クリーンアップ
  });

  it("should retrieve monthly settlement data", async () => {
    const facilityId = "test_facility_001";
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const data = await getMonthlySettlementData(
      facilityId,
      year,
      month,
      "テスト施設"
    );

    expect(data).toBeDefined();
    expect(data.year).toBe(year);
    expect(data.month).toBeDefined();
    expect(data.totalSales).toBeGreaterThanOrEqual(0);
    expect(data.totalTransactions).toBeGreaterThanOrEqual(0);
    expect(data.totalCustomers).toBeGreaterThanOrEqual(0);
  });

  it("should calculate settlement summary correctly", async () => {
    const facilityId = "test_facility_001";
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const data = await getMonthlySettlementData(
      facilityId,
      year,
      month,
      "テスト施設"
    );
    const summary = generateSettlementSummary(data);

    expect(summary).toBeDefined();
    expect(summary.period).toBeDefined();
    expect(summary.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(summary.totalExpenses).toBeGreaterThanOrEqual(0);
    expect(summary.netProfit).toBeDefined();
    expect(summary.profitMargin).toBeGreaterThanOrEqual(-100);
    expect(summary.profitMargin).toBeLessThanOrEqual(100);
  });

  it("should handle empty data gracefully", async () => {
    const facilityId = "nonexistent_facility";
    const year = 2024;
    const month = 1;

    const data = await getMonthlySettlementData(
      facilityId,
      year,
      month,
      "存在しない施設"
    );

    expect(data).toBeDefined();
    expect(data.totalSales).toBe(0);
    expect(data.totalTransactions).toBe(0);
    expect(data.totalCustomers).toBe(0);
  });

  it("should calculate CPA correctly", async () => {
    const facilityId = "test_facility_001";
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const data = await getMonthlySettlementData(
      facilityId,
      year,
      month,
      "テスト施設"
    );

    if (data.newCustomers > 0 && data.totalAdvertisingExpense > 0) {
      expect(data.cpa).toBeGreaterThan(0);
    } else {
      expect(data.cpa).toBeGreaterThanOrEqual(0);
    }
  });

  it("should calculate ROAS correctly", async () => {
    const facilityId = "test_facility_001";
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const data = await getMonthlySettlementData(
      facilityId,
      year,
      month,
      "テスト施設"
    );

    if (data.totalAdvertisingExpense > 0) {
      expect(data.roas).toBeGreaterThan(0);
    } else {
      expect(data.roas).toBe(0);
    }
  });

  it("should include daily data", async () => {
    const facilityId = "test_facility_001";
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const data = await getMonthlySettlementData(
      facilityId,
      year,
      month,
      "テスト施設"
    );

    expect(Array.isArray(data.dailyData)).toBe(true);
    data.dailyData.forEach((daily) => {
      expect(daily.date).toBeDefined();
      expect(daily.sales).toBeGreaterThanOrEqual(0);
      expect(daily.transactions).toBeGreaterThanOrEqual(0);
      expect(daily.customers).toBeGreaterThanOrEqual(0);
    });
  });

  it("should include top customers", async () => {
    const facilityId = "test_facility_001";
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const data = await getMonthlySettlementData(
      facilityId,
      year,
      month,
      "テスト施設"
    );

    expect(Array.isArray(data.topCustomers)).toBe(true);
    expect(data.topCustomers.length).toBeLessThanOrEqual(10);
    data.topCustomers.forEach((customer) => {
      expect(customer.customerId).toBeDefined();
      expect(customer.customerName).toBeDefined();
      expect(customer.totalSpent).toBeGreaterThanOrEqual(0);
      expect(customer.visitCount).toBeGreaterThanOrEqual(0);
    });
  });

  it("should calculate payment method breakdown", async () => {
    const facilityId = "test_facility_001";
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const data = await getMonthlySettlementData(
      facilityId,
      year,
      month,
      "テスト施設"
    );

    const total =
      data.paymentMethodBreakdown.cash +
      data.paymentMethodBreakdown.creditCard +
      data.paymentMethodBreakdown.qrCode +
      data.paymentMethodBreakdown.other;

    expect(total).toBe(data.totalSales);
  });
});
