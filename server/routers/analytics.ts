import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customers, visits, pointTransactions, sales, reservations } from "../../drizzle/schema";
import { eq, and, sql, count, sum, avg, gte, lte } from "drizzle-orm";

export const analyticsRouter = router({
  /**
   * ダッシュボードメトリクスを取得（前月比付き）
   */
  getDashboardMetrics: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // 総顧客数
    const [totalCustomersResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(customers);
    const totalCustomers = totalCustomersResult?.count || 0;

    // 今月の新規顧客数
    const [thisMonthNewCustomersResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(customers)
      .where(gte(customers.createdAt, thisMonthStart));
    const thisMonthNewCustomers = thisMonthNewCustomersResult?.count || 0;

    // 先月の新規顧客数
    const [lastMonthNewCustomersResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(customers)
      .where(
        and(
          gte(customers.createdAt, lastMonthStart),
          lte(customers.createdAt, lastMonthEnd)
        )
      );
    const lastMonthNewCustomers = lastMonthNewCustomersResult?.count || 0;

    // 今月の総売上
    const [thisMonthSalesResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${sales.amount}), 0)` })
      .from(sales)
      .where(gte(sales.saleDate, thisMonthStart));
    const thisMonthTotalSales = thisMonthSalesResult?.total || 0;

    // 先月の総売上
    const [lastMonthSalesResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${sales.amount}), 0)` })
      .from(sales)
      .where(
        and(
          gte(sales.saleDate, lastMonthStart),
          lte(sales.saleDate, lastMonthEnd)
        )
      );
    const lastMonthTotalSales = lastMonthSalesResult?.total || 0;

    // 今月の平均単価
    const [thisMonthAvgResult] = await db
      .select({ avg: sql<number>`COALESCE(AVG(${sales.amount}), 0)` })
      .from(sales)
      .where(gte(sales.saleDate, thisMonthStart));
    const thisMonthAvgSale = thisMonthAvgResult?.avg || 0;

    // 先月の平均単価
    const [lastMonthAvgResult] = await db
      .select({ avg: sql<number>`COALESCE(AVG(${sales.amount}), 0)` })
      .from(sales)
      .where(
        and(
          gte(sales.saleDate, lastMonthStart),
          lte(sales.saleDate, lastMonthEnd)
        )
      );
    const lastMonthAvgSale = lastMonthAvgResult?.avg || 0;

    // 前月比計算
    const newCustomersChange =
      lastMonthNewCustomers > 0
        ? ((thisMonthNewCustomers - lastMonthNewCustomers) / lastMonthNewCustomers) * 100
        : 0;
    const salesChange =
      lastMonthTotalSales > 0
        ? ((thisMonthTotalSales - lastMonthTotalSales) / lastMonthTotalSales) * 100
        : 0;
    const avgSaleChange =
      lastMonthAvgSale > 0
        ? ((thisMonthAvgSale - lastMonthAvgSale) / lastMonthAvgSale) * 100
        : 0;

    return {
      totalCustomers,
      thisMonthNewCustomers,
      newCustomersChange: Math.round(newCustomersChange * 10) / 10,
      thisMonthTotalSales,
      salesChange: Math.round(salesChange * 10) / 10,
      thisMonthAvgSale: Math.round(thisMonthAvgSale),
      avgSaleChange: Math.round(avgSaleChange * 10) / 10,
    };
  }),

  /**
   * リアルタイム統計を取得
   */
  getRealtimeStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 今日の来院数
    const [todayVisitsResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(visits)
      .where(gte(visits.visitDate, today));
    const todayVisits = todayVisitsResult?.count || 0;

    // 未確認予約数（ステータスが"pending"の予約）
    const [pendingReservationsResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reservations)
      .where(eq(reservations.status, "pending"));
    const pendingReservations = pendingReservationsResult?.count || 0;

    return {
      todayVisits,
      pendingReservations,
    };
  }),

  /**
   * 年齢別顧客分析
   */
  getCustomersByAge: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 顧客の年齢を計算して分類
      const customerData = await db
        .select({
          customerId: customers.customerId,
          dateOfBirth: customers.dateOfBirth,
          gender: customers.gender,
          prefecture: customers.prefecture,
        })
        .from(customers);

      // 年齢別に分類
      const ageGroups: Record<string, number> = {
        "10-19": 0,
        "20-29": 0,
        "30-39": 0,
        "40-49": 0,
        "50-59": 0,
        "60+": 0,
      };

      const today = new Date();

      for (const customer of customerData) {
        if (!customer.dateOfBirth) continue;

        const birthDate = new Date(customer.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }

        if (age < 20) {
          ageGroups["10-19"]++;
        } else if (age < 30) {
          ageGroups["20-29"]++;
        } else if (age < 40) {
          ageGroups["30-39"]++;
        } else if (age < 50) {
          ageGroups["40-49"]++;
        } else if (age < 60) {
          ageGroups["50-59"]++;
        } else {
          ageGroups["60+"]++;
        }
      }

      return ageGroups;
    }),

  /**
   * 性別別顧客分析
   */
  getCustomersByGender: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          gender: customers.gender,
          count: count(),
        })
        .from(customers)
        .groupBy(customers.gender);

      return result;
    }),

  /**
   * 地域別顧客分析
   */
  getCustomersByPrefecture: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          prefecture: customers.prefecture,
          count: count(),
        })
        .from(customers)
        .groupBy(customers.prefecture)
        .orderBy(sql`count DESC`);

      return result;
    }),

  /**
   * 来院パターン分析
   */
  getVisitPatterns: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          customerId: visits.customerId,
          visitCount: count(),
          firstVisit: sql`MIN(${visits.visitDate})`,
          lastVisit: sql`MAX(${visits.visitDate})`,
        })
        .from(visits)
        .where(
          and(
            sql`DATE(${visits.visitDate}) >= ${input.fromDate}`,
            sql`DATE(${visits.visitDate}) <= ${input.toDate}`
          )
        )
        .groupBy(visits.customerId);

      return result;
    }),

  /**
   * 顧客セグメント分析（VIP、リピーター、新規など）
   */
  getCustomerSegments: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 来院パターンを取得
      const visitPatterns = await db
        .select({
          customerId: visits.customerId,
          visitCount: count(),
          lastVisit: sql`MAX(${visits.visitDate})`,
        })
        .from(visits)
        .where(
          and(
            sql`DATE(${visits.visitDate}) >= ${input.fromDate}`,
            sql`DATE(${visits.visitDate}) <= ${input.toDate}`
          )
        )
        .groupBy(visits.customerId);

      // セグメント分類
      const segments: Record<string, number> = {
        VIP: 0, // 10回以上来院
        リピーター: 0, // 3-9回来院
        新規: 0, // 1-2回来院
      };

      for (const pattern of visitPatterns) {
        if (pattern.visitCount >= 10) {
          segments.VIP++;
        } else if (pattern.visitCount >= 3) {
          segments.リピーター++;
        } else {
          segments.新規++;
        }
      }

      return segments;
    }),

  /**
   * LTV（顧客生涯価値）分析
   */
  getCustomerLTV: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 顧客ごとの売上合計を計算
      const result = await db
        .select({
          customerId: sales.customerId,
          visitCount: count(),
          totalSpent: sum(sales.amount),
          avgSpent: avg(sales.amount),
        })
        .from(sales)
        .where(eq(sales.facilityId, input.facilityId))
        .groupBy(sales.customerId)
        .orderBy(sql`totalSpent DESC`);

      return result;
    }),

  /**
   * ポイント利用パターン分析
   */
  getPointUsagePatterns: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          customerId: pointTransactions.customerId,
          totalPointsEarned: sum(
            sql`CASE WHEN ${pointTransactions.transactionType} = 'earn' THEN ${pointTransactions.points} ELSE 0 END`
          ),
          totalPointsUsed: sum(
            sql`CASE WHEN ${pointTransactions.transactionType} IN ('redeem', 'expire') THEN ${pointTransactions.points} ELSE 0 END`
          ),
          transactionCount: count(),
        })
        .from(pointTransactions)
        .where(
          and(
            sql`DATE(${pointTransactions.transactionDate}) >= ${input.fromDate}`,
            sql`DATE(${pointTransactions.transactionDate}) <= ${input.toDate}`
          )
        )
        .groupBy(pointTransactions.customerId);

      return result;
    }),

  /**
   * 顧客離反予測
   */
  getChurnRiskCustomers: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        daysInactive: z.number().default(60), // 60日以上来院なしを離反リスク
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.daysInactive);
      const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

      // 60日以上来院がない顧客を取得
      const result = await db
        .select({
          customerId: visits.customerId,
          lastVisitDate: sql`MAX(${visits.visitDate})`,
          visitCount: count(),
        })
        .from(visits)
        .groupBy(visits.customerId)
        .having(sql`MAX(${visits.visitDate}) < ${cutoffDateStr}`);

      return result;
    }),

  /**
   * 来院頻度トレンド
   */
  getVisitFrequencyTrend: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          date: sql`DATE(${visits.visitDate})`,
          visitCount: count(),
        })
        .from(visits)
        .where(
          and(
            sql`DATE(${visits.visitDate}) >= ${input.fromDate}`,
            sql`DATE(${visits.visitDate}) <= ${input.toDate}`
          )
        )
        .groupBy(sql`DATE(${visits.visitDate})`)
        .orderBy(sql`DATE(${visits.visitDate})`);

      return result;
    }),

  /**
   * 顧客満足度分析（来院回数、ポイント使用率など）
   */
  getCustomerSatisfactionMetrics: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 顧客ごとの来院回数とポイント使用率を計算
      const visitStats = await db
        .select({
          customerId: visits.customerId,
          visitCount: count(),
        })
        .from(visits)
        .groupBy(visits.customerId);

      const pointStats = await db
        .select({
          customerId: pointTransactions.customerId,
          pointsEarned: sum(
            sql`CASE WHEN ${pointTransactions.transactionType} = 'earn' THEN ${pointTransactions.points} ELSE 0 END`
          ),
          pointsUsed: sum(
            sql`CASE WHEN ${pointTransactions.transactionType} IN ('redeem', 'expire') THEN ${pointTransactions.points} ELSE 0 END`
          ),
        })
        .from(pointTransactions)
        .groupBy(pointTransactions.customerId);

      // マージして返す
      const metrics = visitStats.map((visit) => {
        const points = pointStats.find((p) => p.customerId === visit.customerId);
        const pointsEarned = Number(points?.pointsEarned || 0);
        const pointsUsed = Number(points?.pointsUsed || 0);
        const pointUsageRate =
          pointsEarned > 0 ? Math.round((pointsUsed / pointsEarned) * 100) : 0;

        return {
          customerId: visit.customerId,
          visitCount: visit.visitCount,
          pointsEarned,
          pointsUsed,
          pointUsageRate,
        };
      });

      return metrics;
    }),
});
