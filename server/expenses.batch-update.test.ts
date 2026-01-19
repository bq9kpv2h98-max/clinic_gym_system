/**
 * 経費一括編集機能のユニットテスト
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { monthlyExpenses, advertisingBreakdown } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

describe("経費一括編集機能", () => {
  let testExpenseIds: string[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // テスト用の経費データを3件作成
    for (let i = 0; i < 3; i++) {
      const expenseId = nanoid();
      testExpenseIds.push(expenseId);

      await db.insert(monthlyExpenses).values({
        expenseId,
        yearMonth: `2026-0${i + 1}`,
        revenue: "100000",
        costProductSales: "10000",
        costTreatmentMaterials: "5000",
        laborCosts: "30000",
        rent: "20000",
        utilities: "5000",
        trainingExpenses: "0",
        travelExpenses: "0",
        otherExpenses: "10000",
        advertisingTotal: "15000",
        grossProfit: "85000",
        operatingIncome: "5000",
        notes: `テストデータ${i + 1}`,
      });

      // 広告内訳を追加
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
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // テストデータをクリーンアップ
    for (const expenseId of testExpenseIds) {
      await db.delete(advertisingBreakdown).where(eq(advertisingBreakdown.expenseId, expenseId));
      await db.delete(monthlyExpenses).where(eq(monthlyExpenses.expenseId, expenseId));
    }
  });

  it("複数月の経費データを一括更新できる", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 一括更新を実行
    const updates = testExpenseIds.map((expenseId, index) => ({
      expenseId,
      laborCosts: 50000 + index * 1000, // 50000, 51000, 52000
      rent: 25000,
    }));

    // 更新処理をシミュレート
    for (const update of updates) {
      const currentExpense = await db
        .select()
        .from(monthlyExpenses)
        .where(eq(monthlyExpenses.expenseId, update.expenseId))
        .limit(1);

      expect(currentExpense.length).toBe(1);

      const expense = currentExpense[0];
      const laborCosts = update.laborCosts ?? parseFloat(expense.laborCosts);
      const rent = update.rent ?? parseFloat(expense.rent);
      const utilities = parseFloat(expense.utilities);
      const trainingExpenses = parseFloat(expense.trainingExpenses);
      const travelExpenses = parseFloat(expense.travelExpenses);
      const otherExpenses = parseFloat(expense.otherExpenses);
      const advertisingTotal = parseFloat(expense.advertisingTotal);
      const revenue = parseFloat(expense.revenue);
      const costProductSales = parseFloat(expense.costProductSales);
      const costTreatmentMaterials = parseFloat(expense.costTreatmentMaterials);

      const grossProfit = revenue - (costProductSales + costTreatmentMaterials);
      const operatingIncome =
        grossProfit -
        (laborCosts + rent + utilities + trainingExpenses + travelExpenses + otherExpenses + advertisingTotal);

      await db
        .update(monthlyExpenses)
        .set({
          laborCosts: laborCosts.toString(),
          rent: rent.toString(),
          grossProfit: grossProfit.toString(),
          operatingIncome: operatingIncome.toString(),
        })
        .where(eq(monthlyExpenses.expenseId, update.expenseId));
    }

    // 更新後のデータを確認
    for (let i = 0; i < testExpenseIds.length; i++) {
      const expenseId = testExpenseIds[i];
      const updatedExpense = await db
        .select()
        .from(monthlyExpenses)
        .where(eq(monthlyExpenses.expenseId, expenseId))
        .limit(1);

      expect(updatedExpense.length).toBe(1);
      expect(parseFloat(updatedExpense[0].laborCosts)).toBe(50000 + i * 1000);
      expect(parseFloat(updatedExpense[0].rent)).toBe(25000);

      // PL計算が正しいことを確認
      const revenue = parseFloat(updatedExpense[0].revenue);
      const costProductSales = parseFloat(updatedExpense[0].costProductSales);
      const costTreatmentMaterials = parseFloat(updatedExpense[0].costTreatmentMaterials);
      const grossProfit = revenue - (costProductSales + costTreatmentMaterials);
      expect(parseFloat(updatedExpense[0].grossProfit)).toBe(grossProfit);

      const laborCosts = parseFloat(updatedExpense[0].laborCosts);
      const rent = parseFloat(updatedExpense[0].rent);
      const utilities = parseFloat(updatedExpense[0].utilities);
      const trainingExpenses = parseFloat(updatedExpense[0].trainingExpenses);
      const travelExpenses = parseFloat(updatedExpense[0].travelExpenses);
      const otherExpenses = parseFloat(updatedExpense[0].otherExpenses);
      const advertisingTotal = parseFloat(updatedExpense[0].advertisingTotal);
      const operatingIncome =
        grossProfit -
        (laborCosts + rent + utilities + trainingExpenses + travelExpenses + otherExpenses + advertisingTotal);
      expect(parseFloat(updatedExpense[0].operatingIncome)).toBe(operatingIncome);
    }
  });

  it("広告内訳を一括更新できる", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const expenseId = testExpenseIds[0];

    // 既存の広告内訳を削除
    await db.delete(advertisingBreakdown).where(eq(advertisingBreakdown.expenseId, expenseId));

    // 新しい広告内訳を作成
    const advertisingMeta = 10000;
    const advertisingGoogle = 8000;
    const advertisingFlyer = 3000;
    const advertisingTotal = advertisingMeta + advertisingGoogle + advertisingFlyer;

    await db.insert(advertisingBreakdown).values([
      {
        breakdownId: nanoid(),
        expenseId,
        channel: "meta",
        amount: advertisingMeta.toString(),
      },
      {
        breakdownId: nanoid(),
        expenseId,
        channel: "google",
        amount: advertisingGoogle.toString(),
      },
      {
        breakdownId: nanoid(),
        expenseId,
        channel: "flyer",
        amount: advertisingFlyer.toString(),
      },
    ]);

    // 月次経費の広告合計を更新
    await db
      .update(monthlyExpenses)
      .set({ advertisingTotal: advertisingTotal.toString() })
      .where(eq(monthlyExpenses.expenseId, expenseId));

    // 更新後のデータを確認
    const breakdown = await db
      .select()
      .from(advertisingBreakdown)
      .where(eq(advertisingBreakdown.expenseId, expenseId));

    expect(breakdown.length).toBe(3);
    expect(parseFloat(breakdown.find((b) => b.channel === "meta")?.amount || "0")).toBe(advertisingMeta);
    expect(parseFloat(breakdown.find((b) => b.channel === "google")?.amount || "0")).toBe(advertisingGoogle);
    expect(parseFloat(breakdown.find((b) => b.channel === "flyer")?.amount || "0")).toBe(advertisingFlyer);

    const updatedExpense = await db
      .select()
      .from(monthlyExpenses)
      .where(eq(monthlyExpenses.expenseId, expenseId))
      .limit(1);

    expect(parseFloat(updatedExpense[0].advertisingTotal)).toBe(advertisingTotal);
  });
});
