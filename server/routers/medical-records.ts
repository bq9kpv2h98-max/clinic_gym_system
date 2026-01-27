import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  createMedicalRecord,
  getMedicalRecordById,
  getMedicalRecordsByCustomerId,
  getAllMedicalRecords,
  searchMedicalRecords,
  updateMedicalRecord,
  deleteMedicalRecord,
} from "../medicalRecords";

export const medicalRecordsRouter = router({
  /**
   * カルテを作成
   */
  create: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
        visitDate: z.string(), // ISO 8601 format
        staffId: z.string().optional(),
        staffName: z.string().optional(),
        transcription: z.string().optional(),
        summary: z.string().optional(),
        notes: z.string().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const recordId = `REC-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const record = await createMedicalRecord({
        recordId,
        customerId: input.customerId,
        visitDate: new Date(input.visitDate),
        staffId: input.staffId,
        staffName: input.staffName,
        transcription: input.transcription,
        summary: input.summary,
        notes: input.notes,
        tags: input.tags,
      });

      return record;
    }),

  /**
   * カルテを取得（recordIdで）
   */
  getById: publicProcedure
    .input(z.object({ recordId: z.string() }))
    .query(async ({ input }) => {
      const record = await getMedicalRecordById(input.recordId);
      return record;
    }),

  /**
   * 顧客のカルテ一覧を取得
   */
  getByCustomerId: publicProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ input }) => {
      const records = await getMedicalRecordsByCustomerId(input.customerId);
      return records;
    }),

  /**
   * カルテ一覧を取得（全顧客・最新順）
   */
  getAll: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      const records = await getAllMedicalRecords(input.limit);
      return records;
    }),

  /**
   * カルテを検索
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const records = await searchMedicalRecords(input.query, input.limit);
      return records;
    }),

  /**
   * カルテを更新
   */
  update: publicProcedure
    .input(
      z.object({
        recordId: z.string(),
        transcription: z.string().optional(),
        summary: z.string().optional(),
        notes: z.string().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { recordId, ...updates } = input;
      const record = await updateMedicalRecord(recordId, updates);
      return record;
    }),

  /**
   * カルテを削除
   */
  delete: publicProcedure
    .input(z.object({ recordId: z.string() }))
    .mutation(async ({ input }) => {
      await deleteMedicalRecord(input.recordId);
      return { success: true };
    }),
});
