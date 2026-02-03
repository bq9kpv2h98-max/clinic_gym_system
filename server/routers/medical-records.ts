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
import { upsertConfluencePage } from "../atlassian";
import { getDb } from "../db";
import { customers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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

      // Confluence自動バックアップ
      try {
        const db = await getDb();
        if (db) {
          const [customer] = await db.select().from(customers).where(eq(customers.customerId, input.customerId));
          if (customer) {
            const pageTitle = `カルテ - ${customer.fullName}`;
            const content = generateConfluenceContent(customer, [record]);
            await upsertConfluencePage(pageTitle, content);
          }
        }
      } catch (error) {
        console.error("Confluence backup failed:", error);
        // エラーが発生してもカルテ作成は成功させる
      }

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

      // Confluence自動バックアップ
      try {
        const db = await getDb();
        if (db) {
          const [customer] = await db.select().from(customers).where(eq(customers.customerId, record.customerId));
          if (customer) {
            const allRecords = await getMedicalRecordsByCustomerId(record.customerId);
            const pageTitle = `カルテ - ${customer.fullName}`;
            const content = generateConfluenceContent(customer, allRecords);
            await upsertConfluencePage(pageTitle, content);
          }
        }
      } catch (error) {
        console.error("Confluence backup failed:", error);
        // エラーが発生してもカルテ更新は成功させる
      }

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

/**
 * Confluence用のカルテコンテンツを生成
 */
function generateConfluenceContent(customer: any, records: any[]): string {
  let html = `<h1>カルテ - ${customer.fullName}</h1>`;
  html += `<p><strong>顧客ID:</strong> ${customer.customerId}</p>`;
  html += `<p><strong>電話番号:</strong> ${customer.phone || "未登録"}</p>`;
  html += `<p><strong>メールアドレス:</strong> ${customer.email || "未登録"}</p>`;
  html += `<p><strong>最終更新:</strong> ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>`;
  html += `<hr/>`;

  // カルテを新しい順にソート
  const sortedRecords = records.sort((a, b) => 
    new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
  );

  sortedRecords.forEach((record, index) => {
    html += `<h2>${index + 1}. ${new Date(record.visitDate).toLocaleDateString("ja-JP")}</h2>`;
    
    if (record.summary) {
      html += `<h3>要約</h3>`;
      html += `<p>${escapeHtml(record.summary)}</p>`;
    }

    if (record.transcription) {
      html += `<h3>書き起こし</h3>`;
      html += `<p>${escapeHtml(record.transcription).replace(/\n/g, "<br/>")}</p>`;
    }

    if (record.notes) {
      html += `<h3>メモ</h3>`;
      html += `<p>${escapeHtml(record.notes)}</p>`;
    }

    if (record.tags) {
      html += `<p><strong>タグ:</strong> ${escapeHtml(record.tags)}</p>`;
    }

    if (record.staffName) {
      html += `<p><strong>担当者:</strong> ${escapeHtml(record.staffName)}</p>`;
    }

    html += `<hr/>`;
  });

  return html;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
