/**
 * 経費管理APIのテストスイート
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { monthlyExpenses, advertisingBreakdown, sales } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

describe("経費管理機能", () => {
  let testExpenseId: string;
  const testYearMonth = "2026-01";

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // テスト用の売上データを作成
    const testSaleId = nanoid();
    await db.insert(sales).values({
      saleId: testSaleId,
      facilityId: "test_facility",
      transactionId: `test_txn_${Date.now()}`,
      amount: 100000,
      paymentMethod: "cash",
      saleDate: new Date("2026-01-15"),
    });
  });

  it("月次経費を作成できる", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    testExpenseId = nanoid();

    // 経費データを作成
    await db.insert(monthlyExpenses).values({
      expenseId: testExpenseId,
      yearMonth: testYearMonth,
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
        expenseId: testExpenseId,
        channel: "meta",
        amount: "8000",
      },
      {
        breakdownId: nanoid(),
        expenseId: testExpenseId,
        channel: "google",
        amount: "5000",
      },
      {
        breakdownId: nanoid(),
        expenseId: testExpenseId,
        channel: "flyer",
        amount: "2000",
      },
    ]);

    // 作成されたデータを確認
    const expense = await db
      .select()
      .from(monthlyExpenses)
      .where(eq(monthlyExpenses.expenseId, testExpenseId))
      .limit(1);

    expect(expense.length).toBe(1);
    expect(expense[0].yearMonth).toBe(testYearMonth);
    expect(parseFloat(expense[0].revenue)).toBe(100000);
    expect(parseFloat(expense[0].grossProfit)).toBe(85000);
    expect(parseFloat(expense[0].operatingIncome)).toBe(5000);

    console.log("✅ 月次経費の作成に成功");
  });

  it("広告内訳を取得できる", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const breakdown = await db
      .select()
      .from(advertisingBreakdown)
      .where(eq(advertisingBreakdown.expenseId, testExpenseId));

    expect(breakdown.length).toBe(3);

    const metaExpense = breakdown.find((b) => b.channel === "meta");
    const googleExpense = breakdown.find((b) => b.channel === "google");
    const flyerExpense = breakdown.find((b) => b.channel === "flyer");

    expect(metaExpense).toBeDefined();
    expect(parseFloat(metaExpense!.amount)).toBe(8000);

    expect(googleExpense).toBeDefined();
    expect(parseFloat(googleExpense!.amount)).toBe(5000);

    expect(flyerExpense).toBeDefined();
    expect(parseFloat(flyerExpense!.amount)).toBe(2000);

    console.log("✅ 広告内訳の取得に成功");
  });

  it("簡易PLの計算が正しい", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const expense = await db
      .select()
      .from(monthlyExpenses)
      .where(eq(monthlyExpenses.expenseId, testExpenseId))
      .limit(1);

    expect(expense.length).toBe(1);

    const revenue = parseFloat(expense[0].revenue);
    const costProductSales = parseFloat(expense[0].costProductSales);
    const costTreatmentMaterials = parseFloat(expense[0].costTreatmentMaterials);
    const laborCosts = parseFloat(expense[0].laborCosts);
    const rent = parseFloat(expense[0].rent);
    const utilities = parseFloat(expense[0].utilities);
    const otherExpenses = parseFloat(expense[0].otherExpenses);
    const advertisingTotal = parseFloat(expense[0].advertisingTotal);

    // 売上総利益 = 売上高 - 原価
    const expectedGrossProfit = revenue - (costProductSales + costTreatmentMaterials);
    expect(parseFloat(expense[0].grossProfit)).toBe(expectedGrossProfit);

    // 営業利益 = 粗利 - 販管費
    const expectedOperatingIncome =
      expectedGrossProfit - (laborCosts + rent + utilities + otherExpenses + advertisingTotal);
    expect(parseFloat(expense[0].operatingIncome)).toBe(expectedOperatingIncome);

    console.log("✅ 簡易PLの計算が正しい");
    console.log(`  売上高: ${revenue}円`);
    console.log(`  売上総利益: ${expectedGrossProfit}円`);
    console.log(`  営業利益: ${expectedOperatingIncome}円`);
  });

  it("月次経費を更新できる", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 経費を更新
    await db
      .update(monthlyExpenses)
      .set({
        laborCosts: "35000",
        grossProfit: "85000",
        operatingIncome: "0",
      })
      .where(eq(monthlyExpenses.expenseId, testExpenseId));

    // 更新されたデータを確認
    const expense = await db
      .select()
      .from(monthlyExpenses)
      .where(eq(monthlyExpenses.expenseId, testExpenseId))
      .limit(1);

    expect(expense.length).toBe(1);
    expect(parseFloat(expense[0].laborCosts)).toBe(35000);
    expect(parseFloat(expense[0].operatingIncome)).toBe(0);

    console.log("✅ 月次経費の更新に成功");
  });

  it("月次経費を削除できる", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 広告内訳を削除
    await db
      .delete(advertisingBreakdown)
      .where(eq(advertisingBreakdown.expenseId, testExpenseId));

    // 経費を削除
    await db
      .delete(monthlyExpenses)
      .where(eq(monthlyExpenses.expenseId, testExpenseId));

    // 削除されたことを確認
    const expense = await db
      .select()
      .from(monthlyExpenses)
      .where(eq(monthlyExpenses.expenseId, testExpenseId));

    expect(expense.length).toBe(0);

    const breakdown = await db
      .select()
      .from(advertisingBreakdown)
      .where(eq(advertisingBreakdown.expenseId, testExpenseId));

    expect(breakdown.length).toBe(0);

    console.log("✅ 月次経費の削除に成功");
  });
});
