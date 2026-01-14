/**
 * 月次統計API
 * 
 * 顧客ごとの月別来院回数、来院頻度ランキング、月別来院推移などを提供します。
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { visits, customers } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export const monthlyStatsRouter = router({
  /**
   * 顧客別月次統計取得
   */
  getCustomerMonthlyStats: publicProcedure
    .input(
      z.object({
        customerId: z.string().optional(),
        yearMonth: z.string().optional(), // "2026-01" 形式
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 年月が指定されている場合、その月の範囲を計算
      let monthStart: Date | undefined;
      let monthEnd: Date | undefined;

      if (input.yearMonth) {
        const [year, month] = input.yearMonth.split("-").map(Number);
        monthStart = new Date(year, month - 1, 1);
        monthEnd = new Date(year, month, 0, 23, 59, 59);
      }

      // 来院記録を取得
      let query = db
        .select({
          customerId: visits.customerId,
          customerName: customers.fullName,
          visitDate: visits.visitDate,
          pointsEarned: visits.pointsEarned,
        })
        .from(visits)
        .leftJoin(customers, eq(visits.customerId, customers.customerId));

      // フィルター条件を追加
      const conditions = [];
      if (input.customerId) {
        conditions.push(eq(visits.customerId, input.customerId));
      }
      if (monthStart && monthEnd) {
        conditions.push(gte(visits.visitDate, monthStart));
        conditions.push(lte(visits.visitDate, monthEnd));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const visitRecords = await query.limit(input.limit);

      // 顧客ごとに集計
      const statsMap = new Map<string, {
        customerId: string;
        customerName: string;
        visitCount: number;
        lastVisitDate: Date;
        totalPointsEarned: number;
      }>();

      for (const record of visitRecords) {
        const key = record.customerId;
        const existing = statsMap.get(key);

        if (existing) {
          existing.visitCount++;
          existing.totalPointsEarned += record.pointsEarned || 0;
          if (new Date(record.visitDate) > existing.lastVisitDate) {
            existing.lastVisitDate = new Date(record.visitDate);
          }
        } else {
          statsMap.set(key, {
            customerId: record.customerId,
            customerName: record.customerName || "不明",
            visitCount: 1,
            lastVisitDate: new Date(record.visitDate),
            totalPointsEarned: record.pointsEarned || 0,
          });
        }
      }

      return Array.from(statsMap.values()).sort((a, b) => b.visitCount - a.visitCount);
    }),

  /**
   * 今月の来院回数ランキング
   */
  getMonthlyRanking: publicProcedure
    .input(
      z.object({
        yearMonth: z.string().optional(), // "2026-01" 形式、未指定の場合は今月
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 年月の範囲を計算
      let year: number;
      let month: number;

      if (input.yearMonth) {
        [year, month] = input.yearMonth.split("-").map(Number);
      } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
      }

      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);

      // 来院記録を取得
      const visitRecords = await db
        .select({
          customerId: visits.customerId,
          customerName: customers.fullName,
          visitDate: visits.visitDate,
        })
        .from(visits)
        .leftJoin(customers, eq(visits.customerId, customers.customerId))
        .where(and(gte(visits.visitDate, monthStart), lte(visits.visitDate, monthEnd)));

      // 顧客ごとに集計
      const statsMap = new Map<string, {
        customerId: string;
        customerName: string;
        visitCount: number;
        lastVisitDate: Date;
      }>();

      for (const record of visitRecords) {
        const key = record.customerId;
        const existing = statsMap.get(key);

        if (existing) {
          existing.visitCount++;
          if (new Date(record.visitDate) > existing.lastVisitDate) {
            existing.lastVisitDate = new Date(record.visitDate);
          }
        } else {
          statsMap.set(key, {
            customerId: record.customerId,
            customerName: record.customerName || "不明",
            visitCount: 1,
            lastVisitDate: new Date(record.visitDate),
          });
        }
      }

      return Array.from(statsMap.values())
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, input.limit);
    }),

  /**
   * 月別来院推移（過去12ヶ月）
   */
  getMonthlyTrend: publicProcedure
    .input(
      z.object({
        months: z.number().default(12), // 過去何ヶ月分を取得するか
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - input.months + 1, 1);

      // 来院記録を取得
      const visitRecords = await db
        .select({
          visitDate: visits.visitDate,
        })
        .from(visits)
        .where(gte(visits.visitDate, startDate));

      // 月ごとに集計
      const monthlyMap = new Map<string, number>();

      for (const record of visitRecords) {
        const date = new Date(record.visitDate);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap.set(yearMonth, (monthlyMap.get(yearMonth) || 0) + 1);
      }

      // 過去N ヶ月分のデータを生成（データがない月は0）
      const result = [];
      for (let i = input.months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        result.push({
          yearMonth,
          visitCount: monthlyMap.get(yearMonth) || 0,
        });
      }

      return result;
    }),
});
