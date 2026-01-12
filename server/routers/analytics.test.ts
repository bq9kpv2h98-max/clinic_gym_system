import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
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

describe("analytics router", () => {
  it("getCustomersByAge returns age groups", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.getCustomersByAge({
      facilityId: "test-facility",
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("10-19");
    expect(result).toHaveProperty("20-29");
    expect(result).toHaveProperty("30-39");
    expect(result).toHaveProperty("40-49");
    expect(result).toHaveProperty("50-59");
    expect(result).toHaveProperty("60+");
  });

  it("getCustomersByGender returns gender distribution", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.getCustomersByGender({
      facilityId: "test-facility",
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("getCustomersByPrefecture returns prefecture distribution", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.getCustomersByPrefecture({
      facilityId: "test-facility",
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("getVisitPatterns returns visit patterns", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 1);
    const toDate = new Date();

    const result = await caller.analytics.getVisitPatterns({
      facilityId: "test-facility",
      fromDate: fromDate.toISOString().split("T")[0],
      toDate: toDate.toISOString().split("T")[0],
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("getCustomerSegments returns customer segments", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 1);
    const toDate = new Date();

    const result = await caller.analytics.getCustomerSegments({
      facilityId: "test-facility",
      fromDate: fromDate.toISOString().split("T")[0],
      toDate: toDate.toISOString().split("T")[0],
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("VIP");
    expect(result).toHaveProperty("リピーター");
    expect(result).toHaveProperty("新規");
  });

  it("getCustomerLTV returns LTV data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.getCustomerLTV({
      facilityId: "test-facility",
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("getPointUsagePatterns returns point usage patterns", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 1);
    const toDate = new Date();

    const result = await caller.analytics.getPointUsagePatterns({
      facilityId: "test-facility",
      fromDate: fromDate.toISOString().split("T")[0],
      toDate: toDate.toISOString().split("T")[0],
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("getChurnRiskCustomers returns churn risk customers", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.getChurnRiskCustomers({
      facilityId: "test-facility",
      daysInactive: 60,
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("getVisitFrequencyTrend returns visit frequency trend", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 1);
    const toDate = new Date();

    const result = await caller.analytics.getVisitFrequencyTrend({
      facilityId: "test-facility",
      fromDate: fromDate.toISOString().split("T")[0],
      toDate: toDate.toISOString().split("T")[0],
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("getCustomerSatisfactionMetrics returns satisfaction metrics", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.getCustomerSatisfactionMetrics({
      facilityId: "test-facility",
    });

    expect(Array.isArray(result)).toBe(true);
  });
});
