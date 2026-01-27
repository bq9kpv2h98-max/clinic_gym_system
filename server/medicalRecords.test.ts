import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

// モックコンテキストを作成
const createMockContext = (): Context => ({
  req: {} as any,
  res: {} as any,
  user: {
    id: 1,
    openId: "test-open-id",
    name: "Test User",
    email: "test@example.com",
    role: "admin",
  } as any,
});

describe("Medical Records API", () => {
  const caller = appRouter.createCaller(createMockContext());
  let testRecordId: string;
  const testCustomerId = "TEST-CUSTOMER-ID-" + Date.now();

  it("should create a medical record", async () => {
    const record = await caller.medicalRecords.create({
      customerId: testCustomerId,
      visitDate: new Date().toISOString(),
      staffName: "テストスタッフ",
      transcription: "患者は腰痛を訴えている。左腰部に圧痛あり。",
      summary: "腰痛の症状。骨盤矯正を実施。",
      notes: "次回は1週間後に再診。",
      tags: "腰痛, 骨盤矯正",
    });

    expect(record).toBeDefined();
    expect(record.recordId).toBeDefined();
    expect(record.customerId).toBe(testCustomerId);
    expect(record.staffName).toBe("テストスタッフ");
    expect(record.summary).toBe("腰痛の症状。骨盤矯正を実施。");

    testRecordId = record.recordId;
  });

  it("should get a medical record by ID", async () => {
    const record = await caller.medicalRecords.getById({
      recordId: testRecordId,
    });

    expect(record).toBeDefined();
    expect(record?.recordId).toBe(testRecordId);
    expect(record?.customerId).toBe(testCustomerId);
  });

  it("should get medical records by customer ID", async () => {
    const records = await caller.medicalRecords.getByCustomerId({
      customerId: testCustomerId,
    });

    expect(records).toBeDefined();
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
    expect(records[0].customerId).toBe(testCustomerId);
  });

  it("should get all medical records", async () => {
    const records = await caller.medicalRecords.getAll({ limit: 100 });

    expect(records).toBeDefined();
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
  });

  it("should update a medical record", async () => {
    const updatedRecord = await caller.medicalRecords.update({
      recordId: testRecordId,
      notes: "更新されたメモ: 経過良好",
      tags: "腰痛, 骨盤矯正, 経過良好",
    });

    expect(updatedRecord).toBeDefined();
    expect(updatedRecord.recordId).toBe(testRecordId);
    expect(updatedRecord.notes).toBe("更新されたメモ: 経過良好");
    expect(updatedRecord.tags).toBe("腰痛, 骨盤矯正, 経過良好");
  });

  it("should search medical records", async () => {
    const records = await caller.medicalRecords.search({
      query: "腰痛",
      limit: 100,
    });

    expect(records).toBeDefined();
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
  });

  it("should delete a medical record", async () => {
    const result = await caller.medicalRecords.delete({
      recordId: testRecordId,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);

    // 削除後に取得できないことを確認
    const deletedRecord = await caller.medicalRecords.getById({
      recordId: testRecordId,
    });
    expect(deletedRecord).toBeNull();
  });
});
