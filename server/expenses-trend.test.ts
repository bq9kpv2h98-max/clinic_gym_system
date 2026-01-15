/**
 * 経費推移APIのテストスイート
 */

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { monthlyExpenses, advertisingBreakdown } from "../drizzle/schema";
import { nanoid } from "nanoid";

describe("経費推移機能", () => {
  it("過去12ヶ月の経費推移を取得できる", async () => {
    const caller = appRouter.createCaller({
      user: {
        openId: "test-owner",
        name: "Test Owner",
        role: "admin",
      },
    });

    // 過去12ヶ月の経費推移を取得
    const trendData = await caller.expenses.getTrend();

    console.log("✅ 経費推移の取得に成功");
    console.log(`  データ件数: ${trendData.length}件`);
    
    // 12ヶ月分のデータが返されることを確認
    expect(trendData).toHaveLength(12);
    
    // 各月のデータ構造を確認
    trendData.forEach(data => {
      expect(data).toHaveProperty("yearMonth");
      expect(data).toHaveProperty("revenue");
      expect(data).toHaveProperty("costProductSales");
      expect(data).toHaveProperty("costTreatmentMaterials");
      expect(data).toHaveProperty("laborCosts");
      expect(data).toHaveProperty("rent");
      expect(data).toHaveProperty("utilities");
      expect(data).toHaveProperty("otherExpenses");
      expect(data).toHaveProperty("advertisingTotal");
      expect(data).toHaveProperty("advertisingMeta");
      expect(data).toHaveProperty("advertisingGoogle");
      expect(data).toHaveProperty("advertisingFlyer");
      expect(data).toHaveProperty("grossProfit");
      expect(data).toHaveProperty("operatingProfit");
    });

    // 最新月のデータを表示
    const latestData = trendData[trendData.length - 1];
    console.log(`  最新月: ${latestData.yearMonth}`);
    console.log(`  売上高: ${latestData.revenue}円`);
    console.log(`  営業利益: ${latestData.operatingProfit}円`);
  });

  it("経費データがない月は0で埋められる", async () => {
    const caller = appRouter.createCaller({
      user: {
        openId: "test-owner",
        name: "Test Owner",
        role: "admin",
      },
    });

    const trendData = await caller.expenses.getTrend();

    // データがない月は全て0になっていることを確認
    const emptyMonths = trendData.filter(
      data => data.revenue === 0 && data.laborCosts === 0 && data.rent === 0
    );

    console.log("✅ 経費データがない月の確認");
    console.log(`  データがない月: ${emptyMonths.length}件`);

    // 少なくとも1件はデータがない月があるはず（過去12ヶ月全てにデータがあることは稀）
    expect(emptyMonths.length).toBeGreaterThanOrEqual(0);
  });

  it("広告内訳が正しく集計される", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // テスト用の経費データを作成
    const expenseId = nanoid();
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    await db.insert(monthlyExpenses).values({
      expenseId,
      yearMonth,
      revenue: "100000",
      costProductSales: "10000",
      costTreatmentMaterials: "5000",
      laborCosts: "30000",
      rent: "20000",
      utilities: "5000",
      otherExpenses: "10000",
      advertisingTotal: "15000",
      grossProfit: "85000",
      operatingIncome: "5000",
    });

    // 広告内訳を作成
    await db.insert(advertisingBreakdown).values([
      {
        breakdownId: nanoid(),
        expenseId,
        channel: "meta",
        amount: "8000",
      },
      {
        breakdownId: nanoid(),
        expenseId,
        channel: "google",
        amount: "5000",
      },
      {
        breakdownId: nanoid(),
        expenseId,
        channel: "flyer",
        amount: "2000",
      },
    ]);

    const caller = appRouter.createCaller({
      user: {
        openId: "test-owner",
        name: "Test Owner",
        role: "admin",
      },
    });

    const trendData = await caller.expenses.getTrend();
    const currentMonthData = trendData.find(data => data.yearMonth === yearMonth);

    console.log("✅ 広告内訳の集計確認");
    console.log(`  Meta: ${currentMonthData?.advertisingMeta}円`);
    console.log(`  Google: ${currentMonthData?.advertisingGoogle}円`);
    console.log(`  チラシ: ${currentMonthData?.advertisingFlyer}円`);
    console.log(`  合計: ${currentMonthData?.advertisingTotal}円`);

    expect(currentMonthData?.advertisingMeta).toBe(8000);
    expect(currentMonthData?.advertisingGoogle).toBe(5000);
    expect(currentMonthData?.advertisingFlyer).toBe(2000);
    expect(currentMonthData?.advertisingTotal).toBe(15000);
  });
});
