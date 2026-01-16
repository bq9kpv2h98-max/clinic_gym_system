/**
 * cronジョブ管理機能のユニットテスト
 */

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { cronJobLogs } from "../drizzle/schema";
import { desc } from "drizzle-orm";

describe("cronJobs router", () => {
  it("認証が必要（getLogs）", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.cronJobs.getLogs({ limit: 10, offset: 0 })
    ).rejects.toThrow();
  });

  it("認証が必要（getLatestLogs）", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(caller.cronJobs.getLatestLogs()).rejects.toThrow();
  });

  it("認証が必要（runJob）", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.cronJobs.runJob({ jobName: "sync-notion-customers" })
    ).rejects.toThrow();
  });

  it("cronジョブ実行履歴を取得できる", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "test-user", name: "Test User", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const logs = await caller.cronJobs.getLogs({ limit: 10, offset: 0 });
    expect(Array.isArray(logs)).toBe(true);
  });

  it("最新のcronジョブ実行履歴を取得できる", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "test-user", name: "Test User", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const latestLogs = await caller.cronJobs.getLatestLogs();
    expect(latestLogs).toHaveProperty("syncCustomers");
    expect(latestLogs).toHaveProperty("linkReservations");
  });

  it("cronジョブを手動実行できる（sync-notion-customers）", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "test-user", name: "Test User", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.cronJobs.runJob({
      jobName: "sync-notion-customers",
    });

    expect(result.success).toBe(true);
    expect(result.jobName).toBe("sync-notion-customers");
    expect(result.result).toHaveProperty("totalCustomers");
    expect(result.result).toHaveProperty("successCount");
    expect(result.result).toHaveProperty("errorCount");

    // 実行履歴が記録されているか確認
    const db = await getDb();
    if (db) {
      const logs = await db
        .select()
        .from(cronJobLogs)
        .where(cronJobLogs.jobName === "sync-notion-customers" as any)
        .orderBy(desc(cronJobLogs.createdAt))
        .limit(1);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].jobName).toBe("sync-notion-customers");
    }
  }, 120000); // 120秒のタイムアウト

  it("cronジョブを手動実行できる（link-reservations）", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "test-user", name: "Test User", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.cronJobs.runJob({
      jobName: "link-reservations",
    });

    expect(result.success).toBe(true);
    expect(result.jobName).toBe("link-reservations");
    expect(result.result).toHaveProperty("totalReservations");
    expect(result.result).toHaveProperty("successCount");
    expect(result.result).toHaveProperty("failedCount");

    // 実行履歴が記録されているか確認
    const db = await getDb();
    if (db) {
      const logs = await db
        .select()
        .from(cronJobLogs)
        .where(cronJobLogs.jobName === "link-reservations" as any)
        .orderBy(desc(cronJobLogs.createdAt))
        .limit(1);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].jobName).toBe("link-reservations");
    }
  }, 120000); // 120秒のタイムアウト
});
