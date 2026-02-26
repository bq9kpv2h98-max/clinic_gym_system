import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

function createPublicContext(): TrpcContext {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
  return ctx;
}

describe("Dashboard Analytics APIs", () => {
  describe("getDashboardMetrics", () => {
    it("returns dashboard metrics with expected fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getDashboardMetrics();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalCustomers");
      expect(result).toHaveProperty("thisMonthNewCustomers");
      expect(result).toHaveProperty("newCustomersChange");
      expect(result).toHaveProperty("thisMonthTotalSales");
      expect(result).toHaveProperty("salesChange");
      expect(result).toHaveProperty("thisMonthAvgSale");
      expect(result).toHaveProperty("avgSaleChange");
    });

    it("returns numeric values for all metrics", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getDashboardMetrics();

      expect(typeof result.totalCustomers).toBe("number");
      expect(typeof result.thisMonthNewCustomers).toBe("number");
      expect(typeof result.newCustomersChange).toBe("number");
      expect(typeof result.thisMonthTotalSales).toBe("number");
      expect(typeof result.salesChange).toBe("number");
      expect(typeof result.thisMonthAvgSale).toBe("number");
      expect(typeof result.avgSaleChange).toBe("number");
    });

    it("returns non-negative totalCustomers", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getDashboardMetrics();

      expect(result.totalCustomers).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getRealtimeStats", () => {
    it("returns realtime stats with expected fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getRealtimeStats();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("todayVisits");
      expect(result).toHaveProperty("pendingReservations");
    });

    it("returns non-negative values", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getRealtimeStats();

      expect(result.todayVisits).toBeGreaterThanOrEqual(0);
      expect(result.pendingReservations).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getRevenueChart", () => {
    it("returns array of 6 months revenue data", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getRevenueChart();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(6);
    });

    it("each month has month, revenue, and count fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getRevenueChart();

      for (const item of result) {
        expect(item).toHaveProperty("month");
        expect(item).toHaveProperty("revenue");
        expect(item).toHaveProperty("count");
        expect(typeof item.month).toBe("string");
        expect(typeof item.revenue).toBe("number");
        expect(typeof item.count).toBe("number");
      }
    });

    it("month labels end with '月'", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getRevenueChart();

      for (const item of result) {
        expect(item.month).toMatch(/^\d+月$/);
      }
    });
  });

  describe("getCustomerAcquisition", () => {
    it("returns array of acquisition data", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getCustomerAcquisition();

      expect(Array.isArray(result)).toBe(true);
    });

    it("each item has name and value fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getCustomerAcquisition();

      for (const item of result) {
        expect(item).toHaveProperty("name");
        expect(item).toHaveProperty("value");
        expect(typeof item.name).toBe("string");
        expect(typeof item.value).toBe("number");
      }
    });
  });

  describe("getChannelMetrics", () => {
    it("returns array of channel metrics", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getChannelMetrics();

      expect(Array.isArray(result)).toBe(true);
    });

    it("each channel has expected fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getChannelMetrics();

      for (const item of result) {
        expect(item).toHaveProperty("channelName");
        expect(item).toHaveProperty("totalExpense");
        expect(item).toHaveProperty("newCustomers");
        expect(item).toHaveProperty("cpa");
        expect(item).toHaveProperty("roas");
        expect(typeof item.channelName).toBe("string");
        expect(typeof item.totalExpense).toBe("number");
        expect(typeof item.newCustomers).toBe("number");
        expect(typeof item.cpa).toBe("number");
        expect(typeof item.roas).toBe("number");
      }
    });
  });

  describe("getTodayTasks", () => {
    it("returns tasks and summary", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getTodayTasks();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("tasks");
      expect(result).toHaveProperty("summary");
      expect(Array.isArray(result.tasks)).toBe(true);
    });

    it("summary has expected fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getTodayTasks();

      expect(result.summary).toHaveProperty("pendingReservations");
      expect(result.summary).toHaveProperty("expiringPoints");
      expect(result.summary).toHaveProperty("dormantCustomers");
      expect(result.summary).toHaveProperty("total");
    });

    it("tasks are sorted by priority (high first)", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getTodayTasks();

      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < result.tasks.length; i++) {
        const prevPriority = priorityOrder[result.tasks[i - 1].priority] ?? 3;
        const currPriority = priorityOrder[result.tasks[i].priority] ?? 3;
        expect(prevPriority).toBeLessThanOrEqual(currPriority);
      }
    });

    it("each task has required fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getTodayTasks();

      for (const task of result.tasks) {
        expect(task).toHaveProperty("type");
        expect(task).toHaveProperty("title");
        expect(task).toHaveProperty("description");
        expect(task).toHaveProperty("priority");
        expect(task).toHaveProperty("link");
        expect(["reservation", "expiring_points", "dormant"]).toContain(task.type);
        expect(["high", "medium", "low"]).toContain(task.priority);
      }
    });

    it("total equals sum of individual counts", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getTodayTasks();

      const expectedTotal =
        result.summary.pendingReservations +
        result.summary.expiringPoints +
        result.summary.dormantCustomers;
      expect(result.summary.total).toBe(expectedTotal);
    });
  });
});
