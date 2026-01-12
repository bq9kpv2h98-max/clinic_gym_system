import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  advertisingChannels,
  advertisingExpenses,
  customerAcquisitionChannels,
  advertisingMetrics,
  customers,
  sales,
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const advertisingRouter = router({
  // 広告チャネル作成
  createChannel: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        channelName: z.string(),
        channelType: z.enum([
          "google_ads",
          "facebook",
          "instagram",
          "flyer",
          "word_of_mouth",
          "other",
        ]),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const channelId = nanoid();
      await db.insert(advertisingChannels).values({
        channelId,
        facilityId: input.facilityId,
        channelName: input.channelName,
        channelType: input.channelType,
        description: input.description,
      });

      return { channelId };
    }),

  // 広告費登録
  recordExpense: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        channelId: z.string(),
        expenseDate: z.string(),
        amount: z.number(),
        budget: z.number().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const expenseId = nanoid();
      await db.insert(advertisingExpenses).values({
        expenseId,
        facilityId: input.facilityId,
        channelId: input.channelId,
        expenseDate: new Date(input.expenseDate),
        amount: input.amount,
        budget: input.budget,
        description: input.description,
      });

      return { expenseId };
    }),

  // 顧客獲得チャネル記録
  recordCustomerAcquisition: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        facilityId: z.string(),
        channelId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const acquisitionId = nanoid();
      await db.insert(customerAcquisitionChannels).values({
        acquisitionId,
        customerId: input.customerId,
        facilityId: input.facilityId,
        channelId: input.channelId,
      });

      return { acquisitionId };
    }),

  // チャネル別ROI分析
  getChannelMetrics: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        channelId: z.string(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // 広告費合計
      const expenses = await db
        .select()
        .from(advertisingExpenses)
        .where(
          and(
            eq(advertisingExpenses.channelId, input.channelId),
            gte(advertisingExpenses.expenseDate, startDate),
            lte(advertisingExpenses.expenseDate, endDate)
          )
        );

      const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

      // 新規顧客数
      const newCustomers = await db
        .select()
        .from(customerAcquisitionChannels)
        .where(
          and(
            eq(customerAcquisitionChannels.channelId, input.channelId),
            gte(customerAcquisitionChannels.acquisitionDate, startDate),
            lte(customerAcquisitionChannels.acquisitionDate, endDate)
          )
        );

      const newCustomerCount = newCustomers.length;

      // CPA計算
      const cpa =
        newCustomerCount > 0 ? Math.round(totalExpense / newCustomerCount) : 0;

      // 売上合計（新規顧客から）
      const customerIds = newCustomers.map((nc) => nc.customerId);
      let totalRevenue = 0;

      if (customerIds.length > 0) {
        const salesData = await db
          .select()
          .from(sales)
          .where(
            and(
              customerIds.length > 0
                ? sales.customerId
                  ? eq(sales.customerId, customerIds[0])
                  : undefined
                : undefined,
              gte(sales.saleDate, startDate),
              lte(sales.saleDate, endDate)
            )
          );

        totalRevenue = salesData.reduce((sum, s) => sum + s.amount, 0);
      }

      // ROAS計算
      const roas =
        totalExpense > 0 ? Math.round((totalRevenue / totalExpense) * 100) : 0;

      return {
        channelId: input.channelId,
        totalExpense,
        newCustomerCount,
        cpa,
        totalRevenue,
        roas,
      };
    }),

  // 施設別全チャネルROI分析
  getFacilityMetrics: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // 全チャネル取得
      const channels = await db
        .select()
        .from(advertisingChannels)
        .where(eq(advertisingChannels.facilityId, input.facilityId));

      const metrics = await Promise.all(
        channels.map(async (channel) => {
          const expenses = await db
            .select()
            .from(advertisingExpenses)
            .where(
              and(
                eq(advertisingExpenses.channelId, channel.channelId),
                gte(advertisingExpenses.expenseDate, startDate),
                lte(advertisingExpenses.expenseDate, endDate)
              )
            );

          const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

          const newCustomers = await db
            .select()
            .from(customerAcquisitionChannels)
            .where(
              and(
                eq(customerAcquisitionChannels.channelId, channel.channelId),
                gte(customerAcquisitionChannels.acquisitionDate, startDate),
                lte(customerAcquisitionChannels.acquisitionDate, endDate)
              )
            );

          const newCustomerCount = newCustomers.length;
          const cpa =
            newCustomerCount > 0
              ? Math.round(totalExpense / newCustomerCount)
              : 0;

          return {
            channelId: channel.channelId,
            channelName: channel.channelName,
            channelType: channel.channelType,
            totalExpense,
            newCustomerCount,
            cpa,
          };
        })
      );

      return metrics;
    }),

  // 広告チャネル一覧
  listChannels: protectedProcedure
    .input(z.object({ facilityId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return await db
        .select()
        .from(advertisingChannels)
        .where(eq(advertisingChannels.facilityId, input.facilityId));
    }),

  // 広告費一覧
  listExpenses: protectedProcedure
    .input(
      z.object({
        facilityId: z.string(),
        channelId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(advertisingExpenses.facilityId, input.facilityId)];

      if (input.channelId) {
        conditions.push(eq(advertisingExpenses.channelId, input.channelId));
      }

      if (input.startDate) {
        conditions.push(
          gte(advertisingExpenses.expenseDate, new Date(input.startDate))
        );
      }

      if (input.endDate) {
        conditions.push(
          lte(advertisingExpenses.expenseDate, new Date(input.endDate))
        );
      }

      return await db
        .select()
        .from(advertisingExpenses)
        .where(and(...conditions))
        .orderBy(desc(advertisingExpenses.expenseDate));
    }),
});
