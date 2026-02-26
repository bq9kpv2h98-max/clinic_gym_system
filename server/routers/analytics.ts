import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customers, visits, pointTransactions, sales, reservations, advertisingExpenses, advertisingChannels, customerAcquisitionChannels } from "../../drizzle/schema";
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
    const thisMonthStr = thisMonthStart.toISOString().split('T')[0];
    const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];
    const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

    // 顧客データとセールスデータを並列で取得（2クエリに統合）
    const [customerStats, salesStats] = await Promise.all([
      db.execute(
        sql`SELECT
          COUNT(*) as totalCustomers,
          SUM(CASE WHEN createdAt >= ${thisMonthStr} THEN 1 ELSE 0 END) as thisMonthNew,
          SUM(CASE WHEN createdAt >= ${lastMonthStartStr} AND createdAt <= ${lastMonthEndStr} THEN 1 ELSE 0 END) as lastMonthNew
        FROM customers`
      ),
      db.execute(
        sql`SELECT
          COALESCE(SUM(CASE WHEN \`saleDate\` >= ${thisMonthStr} THEN amount ELSE 0 END), 0) as thisMonthTotal,
          COALESCE(SUM(CASE WHEN \`saleDate\` >= ${lastMonthStartStr} AND \`saleDate\` <= ${lastMonthEndStr} THEN amount ELSE 0 END), 0) as lastMonthTotal,
          COALESCE(AVG(CASE WHEN \`saleDate\` >= ${thisMonthStr} THEN amount ELSE NULL END), 0) as thisMonthAvg,
          COALESCE(AVG(CASE WHEN \`saleDate\` >= ${lastMonthStartStr} AND \`saleDate\` <= ${lastMonthEndStr} THEN amount ELSE NULL END), 0) as lastMonthAvg
        FROM sales`
      ),
    ]);

    const cRow = ((customerStats as any)[0] || customerStats) as any;
    const c = Array.isArray(cRow) ? cRow[0] : cRow;
    const sRow = ((salesStats as any)[0] || salesStats) as any;
    const s = Array.isArray(sRow) ? sRow[0] : sRow;

    const totalCustomers = Number(c?.totalCustomers) || 0;
    const thisMonthNewCustomers = Number(c?.thisMonthNew) || 0;
    const lastMonthNewCustomers = Number(c?.lastMonthNew) || 0;
    const thisMonthTotalSales = Number(s?.thisMonthTotal) || 0;
    const lastMonthTotalSales = Number(s?.lastMonthTotal) || 0;
    const thisMonthAvgSale = Number(s?.thisMonthAvg) || 0;
    const lastMonthAvgSale = Number(s?.lastMonthAvg) || 0;

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
    const todayVisits = Number(todayVisitsResult?.count) || 0;

    // 未確認予約数（ステータスが"pending"の予約）
    const [pendingReservationsResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reservations)
      .where(eq(reservations.status, "pending"));
    const pendingReservations = Number(pendingReservationsResult?.count) || 0;

    return {
      todayVisits,
      pendingReservations,
    };
  }),

  /**
   * 売上推移データ（過去6ヶ月）
   */
  getRevenueChart: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Use raw SQL to avoid only_full_group_by issues
    const result = await db.execute(
      sql`SELECT DATE_FORMAT(\`saleDate\`, '%Y-%m') as yearMonth, COALESCE(SUM(amount), 0) as revenue, COUNT(*) as \`count\` FROM sales WHERE \`saleDate\` >= ${sixMonthsAgo.toISOString().split('T')[0]} GROUP BY DATE_FORMAT(\`saleDate\`, '%Y-%m') ORDER BY DATE_FORMAT(\`saleDate\`, '%Y-%m')`
    ) as any;
    const rows = (result[0] || result) as Array<{ yearMonth: string; revenue: number; count: number }>;

    // 過去6ヶ月分のデータを埋める（データがない月は0）
    const months: { month: string; revenue: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${d.getMonth() + 1}月`;
      const found = rows.find((r: any) => r.yearMonth === ym);
      months.push({
        month: monthLabel,
        revenue: found ? Number(found.revenue) : 0,
        count: found ? Number(found.count) : 0,
      });
    }

    return months;
  }),

  /**
   * 顧客獲得チャネル別データ（howDidYouKnowフィールドから集計）
   */
  getCustomerAcquisition: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        source: customers.howDidYouKnow,
        count: sql<number>`COUNT(*)`,
      })
      .from(customers)
      .where(sql`${customers.howDidYouKnow} IS NOT NULL AND ${customers.howDidYouKnow} != ''`)
      .groupBy(customers.howDidYouKnow)
      .orderBy(sql`COUNT(*) DESC`);

    return result.map((r) => ({
      name: r.source || '不明',
      value: Number(r.count),
    }));
  }),

  /**
   * 広告チャネル別メトリクス（CPA・ROAS）
   */
  getChannelMetrics: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthStartStr = thisMonthStart.toISOString().split('T')[0];

    // 広告チャネル一覧を取得
    const channels = await db
      .select({
        channelId: advertisingChannels.channelId,
        channelName: advertisingChannels.channelName,
      })
      .from(advertisingChannels)
      .where(eq(advertisingChannels.isActive, 1));

    if (channels.length === 0) return [];

    // チャネル別の広告費合計
    const expenses = await db
      .select({
        channelId: advertisingExpenses.channelId,
        totalExpense: sql<number>`COALESCE(SUM(${advertisingExpenses.amount}), 0)`,
      })
      .from(advertisingExpenses)
      .where(sql`${advertisingExpenses.expenseDate} >= ${thisMonthStartStr}`)
      .groupBy(advertisingExpenses.channelId);

    // チャネル別の新規顧客数
    const acquisitions = await db
      .select({
        channelId: customerAcquisitionChannels.channelId,
        newCustomers: sql<number>`COUNT(*)`,
      })
      .from(customerAcquisitionChannels)
      .where(gte(customerAcquisitionChannels.acquisitionDate, thisMonthStart))
      .groupBy(customerAcquisitionChannels.channelId);

    // 今月の総売上（ROAS計算用）
    const [salesResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${sales.amount}), 0)` })
      .from(sales)
      .where(sql`${sales.saleDate} >= ${thisMonthStartStr}`);
    const totalSales = salesResult?.total || 0;

    return channels.map((ch) => {
      const expense = expenses.find((e) => e.channelId === ch.channelId);
      const acq = acquisitions.find((a) => a.channelId === ch.channelId);
      const totalExpense = expense ? Number(expense.totalExpense) : 0;
      const newCustomers = acq ? Number(acq.newCustomers) : 0;
      const cpa = newCustomers > 0 ? Math.round(totalExpense / newCustomers) : 0;
      // ROAS = (売上 / 広告費) * 100
      const roas = totalExpense > 0 ? Math.round((totalSales / totalExpense) * 100) : 0;

      return {
        channelName: ch.channelName,
        totalExpense,
        newCustomers,
        cpa,
        roas,
      };
    });
  }),

  /**
   * 今日のタスク（未確認予約、期限切れ間近ポイント、休眠顧客）
   */
  getTodayTasks: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // 1. 未確認予約（ステータスがpending） - JOINで顧客名も同時取得
    const pendingReservationsRaw = await db.execute(
      sql`SELECT r.id, r.\`customerId\`, r.\`firstChoiceDate\`, c.\`fullName\`
        FROM reservations r
        LEFT JOIN customers c ON r.\`customerId\` = c.\`customerId\`
        WHERE r.status = 'pending'
        LIMIT 20`
    ) as any;
    const pendingRows = (Array.isArray((pendingReservationsRaw as any)[0]) ? (pendingReservationsRaw as any)[0] : pendingReservationsRaw) as any[];

    const pendingWithNames = (pendingRows || []).map((r: any) => ({
      type: 'reservation' as const,
      title: `未確認予約: ${r.fullName || '不明'}`,
      description: `希望日: ${r.firstChoiceDate || '未設定'}`,
      priority: 'high' as const,
      link: '/staff-reservations',
    }));

    // 2. ポイント期限切れ間近（7日以内）
    const expiringPoints = await db
      .select({
        customerId: customers.customerId,
        fullName: customers.fullName,
        totalPoints: customers.totalPoints,
        pointExpirationDate: customers.pointExpirationDate,
      })
      .from(customers)
      .where(
        and(
          sql`${customers.pointExpirationDate} IS NOT NULL`,
          sql`${customers.pointExpirationDate} <= ${sevenDaysLater.toISOString().split('T')[0]}`,
          sql`${customers.pointExpirationDate} >= ${today.toISOString().split('T')[0]}`,
          sql`${customers.totalPoints} > 0`
        )
      )
      .limit(20);

    const expiringTasks = expiringPoints.map((c) => ({
      type: 'expiring_points' as const,
      title: `ポイント期限切れ間近: ${c.fullName}`,
      description: `${c.totalPoints}pt（期限: ${c.pointExpirationDate}）`,
      priority: 'medium' as const,
      link: `/customers`,
    }));

    // 3. 休眠顧客（60日以上来院なし、過去に2回以上来院）
    const dormantCustomers = await db
      .select({
        customerId: customers.customerId,
        fullName: customers.fullName,
        lastVisitDate: customers.lastVisitDate,
        visitCount: customers.visitCount,
      })
      .from(customers)
      .where(
        and(
          sql`${customers.lastVisitDate} IS NOT NULL`,
          sql`${customers.lastVisitDate} < ${sixtyDaysAgo.toISOString()}`,
          sql`${customers.visitCount} >= 2`,
          eq(customers.isActive, 1)
        )
      )
      .limit(10);

    const dormantTasks = dormantCustomers.map((c) => {
      const lastVisit = c.lastVisitDate ? new Date(c.lastVisitDate) : null;
      const daysSince = lastVisit ? Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return {
        type: 'dormant' as const,
        title: `休眠顧客: ${c.fullName}`,
        description: `最終来院: ${daysSince}日前（来院${c.visitCount}回）`,
        priority: 'low' as const,
        link: `/customers`,
      };
    });

    // 全タスクをまとめて優先度順にソート
    const allTasks = [...pendingWithNames, ...expiringTasks, ...dormantTasks];
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    allTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return {
      tasks: allTasks,
      summary: {
        pendingReservations: pendingWithNames.length,
        expiringPoints: expiringTasks.length,
        dormantCustomers: dormantTasks.length,
        total: allTasks.length,
      },
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
