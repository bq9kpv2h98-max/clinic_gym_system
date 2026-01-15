/**
 * 経費管理APIルーター
 * 
 * 10カテゴリの経費管理と簡易PL自動計算を提供します。
 */

import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { monthlyExpenses, advertisingBreakdown, sales } from "../../drizzle/schema";
import { nanoid } from "nanoid";

export const expensesRouter = router({
  /**
   * 過去12ヶ月の経費推移を取得
   */
  getTrend: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 過去12ヶ月の年月を生成
    const now = new Date();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(yearMonth);
    }

    // 各月の経費データを取得
    const expensesList = await db
      .select()
      .from(monthlyExpenses)
      .where(sql`${monthlyExpenses.yearMonth} IN (${sql.join(months.map(m => sql`${m}`), sql`, `)})`)
      .orderBy(monthlyExpenses.yearMonth);

    // 各経費の広告内訳を取得
    const expenseIds = expensesList.map(e => e.expenseId);
    const breakdowns = expenseIds.length > 0 ? await db
      .select()
      .from(advertisingBreakdown)
      .where(sql`${advertisingBreakdown.expenseId} IN (${sql.join(expenseIds.map(id => sql`${id}`), sql`, `)})`) : [];

    // 月別のデータを整形
    const trendData = months.map(month => {
      const expense = expensesList.find(e => e.yearMonth === month);
      if (!expense) {
        return {
          yearMonth: month,
          revenue: 0,
          costProductSales: 0,
          costTreatmentMaterials: 0,
          laborCosts: 0,
          rent: 0,
          utilities: 0,
          otherExpenses: 0,
          advertisingTotal: 0,
          advertisingMeta: 0,
          advertisingGoogle: 0,
          advertisingFlyer: 0,
          grossProfit: 0,
          operatingProfit: 0,
        };
      }

      // 広告内訳を集計
      const expenseBreakdowns = breakdowns.filter(b => b.expenseId === expense.expenseId);
      const advertisingMeta = parseFloat(expenseBreakdowns.find(b => b.channel === "meta")?.amount || "0");
      const advertisingGoogle = parseFloat(expenseBreakdowns.find(b => b.channel === "google")?.amount || "0");
      const advertisingFlyer = parseFloat(expenseBreakdowns.find(b => b.channel === "flyer")?.amount || "0");

      const revenue = parseFloat(expense.revenue);
      const costProductSales = parseFloat(expense.costProductSales);
      const costTreatmentMaterials = parseFloat(expense.costTreatmentMaterials);
      const laborCosts = parseFloat(expense.laborCosts);
      const rent = parseFloat(expense.rent);
      const utilities = parseFloat(expense.utilities);
      const otherExpenses = parseFloat(expense.otherExpenses);
      const advertisingTotal = parseFloat(expense.advertisingTotal);

      return {
        yearMonth: month,
        revenue,
        costProductSales,
        costTreatmentMaterials,
        laborCosts,
        rent,
        utilities,
        otherExpenses,
        advertisingTotal,
        advertisingMeta,
        advertisingGoogle,
        advertisingFlyer,
        grossProfit: revenue - (costProductSales + costTreatmentMaterials),
        operatingProfit: revenue - (costProductSales + costTreatmentMaterials + laborCosts + rent + utilities + otherExpenses + advertisingTotal),
      };
    });

    return trendData;
  }),

  /**
   * 月次経費を作成
   */
  create: protectedProcedure
    .input(
      z.object({
        yearMonth: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM形式
        costProductSales: z.number().min(0).default(0),
        costTreatmentMaterials: z.number().min(0).default(0),
        laborCosts: z.number().min(0).default(0),
        rent: z.number().min(0).default(0),
        utilities: z.number().min(0).default(0),
        otherExpenses: z.number().min(0).default(0),
        advertisingMeta: z.number().min(0).default(0),
        advertisingGoogle: z.number().min(0).default(0),
        advertisingFlyer: z.number().min(0).default(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const expenseId = nanoid();

      // 売上を集計（yearMonthに一致する売上データから）
      const revenueResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${sales.amount}), 0)`,
        })
        .from(sales)
        .where(
          sql`DATE_FORMAT(${sales.saleDate}, '%Y-%m') = ${input.yearMonth}`
        );

      const revenue = revenueResult[0]?.total || 0;

      // 広告宣伝費合計
      const advertisingTotal =
        input.advertisingMeta + input.advertisingGoogle + input.advertisingFlyer;

      // 簡易PL計算
      const grossProfit =
        revenue - (input.costProductSales + input.costTreatmentMaterials);
      const operatingIncome =
        grossProfit -
        (input.laborCosts +
          input.rent +
          input.utilities +
          input.otherExpenses +
          advertisingTotal);

      // 月次経費を作成
      await db.insert(monthlyExpenses).values({
        expenseId,
        yearMonth: input.yearMonth,
        revenue: revenue.toString(),
        costProductSales: input.costProductSales.toString(),
        costTreatmentMaterials: input.costTreatmentMaterials.toString(),
        laborCosts: input.laborCosts.toString(),
        rent: input.rent.toString(),
        utilities: input.utilities.toString(),
        otherExpenses: input.otherExpenses.toString(),
        advertisingTotal: advertisingTotal.toString(),
        grossProfit: grossProfit.toString(),
        operatingIncome: operatingIncome.toString(),
        notes: input.notes,
      });

      // 広告内訳を作成
      if (input.advertisingMeta > 0) {
        await db.insert(advertisingBreakdown).values({
          breakdownId: nanoid(),
          expenseId,
          channel: "meta",
          amount: input.advertisingMeta.toString(),
        });
      }

      if (input.advertisingGoogle > 0) {
        await db.insert(advertisingBreakdown).values({
          breakdownId: nanoid(),
          expenseId,
          channel: "google",
          amount: input.advertisingGoogle.toString(),
        });
      }

      if (input.advertisingFlyer > 0) {
        await db.insert(advertisingBreakdown).values({
          breakdownId: nanoid(),
          expenseId,
          channel: "flyer",
          amount: input.advertisingFlyer.toString(),
        });
      }

      return {
        expenseId,
        yearMonth: input.yearMonth,
        revenue,
        grossProfit,
        operatingIncome,
      };
    }),

  /**
   * 月次経費一覧を取得
   */
  list: protectedProcedure
    .input(
      z.object({
        yearMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
        limit: z.number().min(1).max(100).default(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      let query = db.select().from(monthlyExpenses);

      if (input.yearMonth) {
        query = query.where(eq(monthlyExpenses.yearMonth, input.yearMonth)) as any;
      }

      const expenses = await query
        .orderBy(desc(monthlyExpenses.yearMonth))
        .limit(input.limit);

      // 各経費の広告内訳を取得
      const expensesWithBreakdown = await Promise.all(
        expenses.map(async (expense: any) => {
          const breakdown = await db
            .select()
            .from(advertisingBreakdown)
            .where(eq(advertisingBreakdown.expenseId, expense.expenseId));

          return {
            ...expense,
            advertisingBreakdown: breakdown,
          };
        })
      );

      return expensesWithBreakdown;
    }),

  /**
   * 月次経費を取得（ID指定）
   */
  get: protectedProcedure
    .input(z.object({ expenseId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const expense = await db
        .select()
        .from(monthlyExpenses)
        .where(eq(monthlyExpenses.expenseId, input.expenseId))
        .limit(1);

      if (expense.length === 0) {
        throw new Error("Expense not found");
      }

      // 広告内訳を取得
      const breakdown = await db
        .select()
        .from(advertisingBreakdown)
        .where(eq(advertisingBreakdown.expenseId, input.expenseId));

      return {
        ...expense[0],
        advertisingBreakdown: breakdown,
      };
    }),

  /**
   * 月次経費を更新
   */
  update: protectedProcedure
    .input(
      z.object({
        expenseId: z.string(),
        costProductSales: z.number().min(0).optional(),
        costTreatmentMaterials: z.number().min(0).optional(),
        laborCosts: z.number().min(0).optional(),
        rent: z.number().min(0).optional(),
        utilities: z.number().min(0).optional(),
        otherExpenses: z.number().min(0).optional(),
        advertisingMeta: z.number().min(0).optional(),
        advertisingGoogle: z.number().min(0).optional(),
        advertisingFlyer: z.number().min(0).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // 既存の経費を取得
      const existing = await db
        .select()
        .from(monthlyExpenses)
        .where(eq(monthlyExpenses.expenseId, input.expenseId))
        .limit(1);

      if (existing.length === 0) {
        throw new Error("Expense not found");
      }

      const currentExpense = existing[0];

      // 更新する値を準備
      const costProductSales =
        input.costProductSales !== undefined
          ? input.costProductSales
          : parseFloat(currentExpense.costProductSales);
      const costTreatmentMaterials =
        input.costTreatmentMaterials !== undefined
          ? input.costTreatmentMaterials
          : parseFloat(currentExpense.costTreatmentMaterials);
      const laborCosts =
        input.laborCosts !== undefined
          ? input.laborCosts
          : parseFloat(currentExpense.laborCosts);
      const rent =
        input.rent !== undefined ? input.rent : parseFloat(currentExpense.rent);
      const utilities =
        input.utilities !== undefined
          ? input.utilities
          : parseFloat(currentExpense.utilities);
      const otherExpenses =
        input.otherExpenses !== undefined
          ? input.otherExpenses
          : parseFloat(currentExpense.otherExpenses);

      // 広告内訳を更新
      if (
        input.advertisingMeta !== undefined ||
        input.advertisingGoogle !== undefined ||
        input.advertisingFlyer !== undefined
      ) {
        // 既存の広告内訳を削除
        await db
          .delete(advertisingBreakdown)
          .where(eq(advertisingBreakdown.expenseId, input.expenseId));

        // 新しい広告内訳を作成
        if (input.advertisingMeta && input.advertisingMeta > 0) {
          await db.insert(advertisingBreakdown).values({
            breakdownId: nanoid(),
            expenseId: input.expenseId,
            channel: "meta",
            amount: input.advertisingMeta.toString(),
          });
        }

        if (input.advertisingGoogle && input.advertisingGoogle > 0) {
          await db.insert(advertisingBreakdown).values({
            breakdownId: nanoid(),
            expenseId: input.expenseId,
            channel: "google",
            amount: input.advertisingGoogle.toString(),
          });
        }

        if (input.advertisingFlyer && input.advertisingFlyer > 0) {
          await db.insert(advertisingBreakdown).values({
            breakdownId: nanoid(),
            expenseId: input.expenseId,
            channel: "flyer",
            amount: input.advertisingFlyer.toString(),
          });
        }
      }

      // 広告宣伝費合計を再計算
      const breakdownResult = await db
        .select()
        .from(advertisingBreakdown)
        .where(eq(advertisingBreakdown.expenseId, input.expenseId));

      const advertisingTotal = breakdownResult.reduce(
        (sum: number, item: any) => sum + parseFloat(item.amount),
        0
      );

      // 売上を取得
      const revenue = parseFloat(currentExpense.revenue);

      // 簡易PL計算
      const grossProfit = revenue - (costProductSales + costTreatmentMaterials);
      const operatingIncome =
        grossProfit -
        (laborCosts + rent + utilities + otherExpenses + advertisingTotal);

      // 月次経費を更新
      await db
        .update(monthlyExpenses)
        .set({
          costProductSales: costProductSales.toString(),
          costTreatmentMaterials: costTreatmentMaterials.toString(),
          laborCosts: laborCosts.toString(),
          rent: rent.toString(),
          utilities: utilities.toString(),
          otherExpenses: otherExpenses.toString(),
          advertisingTotal: advertisingTotal.toString(),
          grossProfit: grossProfit.toString(),
          operatingIncome: operatingIncome.toString(),
          notes: input.notes !== undefined ? input.notes : currentExpense.notes,
        })
        .where(eq(monthlyExpenses.expenseId, input.expenseId));

      return {
        expenseId: input.expenseId,
        grossProfit,
        operatingIncome,
      };
    }),

  /**
   * 月次経費を削除
   */
  delete: protectedProcedure
    .input(z.object({ expenseId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // 広告内訳を削除
      await db
        .delete(advertisingBreakdown)
        .where(eq(advertisingBreakdown.expenseId, input.expenseId));

      // 月次経費を削除
      await db
        .delete(monthlyExpenses)
        .where(eq(monthlyExpenses.expenseId, input.expenseId));

      return { success: true };
    }),

  /**
   * 簡易PLを取得（年月指定）
   */
  getPL: protectedProcedure
    .input(z.object({ yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const expense = await db
        .select()
        .from(monthlyExpenses)
        .where(eq(monthlyExpenses.yearMonth, input.yearMonth))
        .limit(1);

      if (expense.length === 0) {
        // 経費データが存在しない場合、売上のみ集計して返す
        const revenueResult = await db
          .select({
            total: sql<number>`COALESCE(SUM(${sales.amount}), 0)`,
          })
          .from(sales)
          .where(
            sql`DATE_FORMAT(${sales.saleDate}, '%Y-%m') = ${input.yearMonth}`
          );

        const revenue = revenueResult[0]?.total || 0;

        return {
          yearMonth: input.yearMonth,
          revenue,
          costProductSales: 0,
          costTreatmentMaterials: 0,
          laborCosts: 0,
          rent: 0,
          utilities: 0,
          otherExpenses: 0,
          advertisingTotal: 0,
          grossProfit: revenue,
          operatingIncome: revenue,
          advertisingBreakdown: [],
        };
      }

      // 広告内訳を取得
      const breakdown = await db
        .select()
        .from(advertisingBreakdown)
        .where(eq(advertisingBreakdown.expenseId, expense[0].expenseId));

      return {
        ...expense[0],
        advertisingBreakdown: breakdown,
      };
    }),
});
