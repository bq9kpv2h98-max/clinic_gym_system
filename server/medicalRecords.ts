import { getDb } from "./db";
import { medicalRecords, customers, type InsertMedicalRecord, type MedicalRecord } from "../drizzle/schema";
import { eq, desc, and, like, or } from "drizzle-orm";

/**
 * カルテを作成
 */
export async function createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(medicalRecords).values(record);

  const [created] = await db
    .select()
    .from(medicalRecords)
    .where(eq(medicalRecords.recordId, record.recordId));

  return created;
}

/**
 * カルテを取得（recordIdで）
 */
export async function getMedicalRecordById(recordId: string): Promise<MedicalRecord | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .select()
    .from(medicalRecords)
    .where(eq(medicalRecords.recordId, recordId));

  return record || null;
}

/**
 * 顧客のカルテ一覧を取得
 */
export async function getMedicalRecordsByCustomerId(customerId: string): Promise<MedicalRecord[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const records = await db
    .select()
    .from(medicalRecords)
    .where(eq(medicalRecords.customerId, customerId))
    .orderBy(desc(medicalRecords.visitDate));

  return records;
}

/**
 * カルテ一覧を取得（全顧客・最新順）
 */
export async function getAllMedicalRecords(limit: number = 100): Promise<Array<MedicalRecord & { customerName: string }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const records = await db
    .select({
      id: medicalRecords.id,
      recordId: medicalRecords.recordId,
      customerId: medicalRecords.customerId,
      visitDate: medicalRecords.visitDate,
      staffId: medicalRecords.staffId,
      staffName: medicalRecords.staffName,
      transcription: medicalRecords.transcription,
      summary: medicalRecords.summary,
      notes: medicalRecords.notes,
      tags: medicalRecords.tags,
      createdAt: medicalRecords.createdAt,
      updatedAt: medicalRecords.updatedAt,
      customerName: customers.fullName,
    })
    .from(medicalRecords)
    .leftJoin(customers, eq(medicalRecords.customerId, customers.customerId))
    .orderBy(desc(medicalRecords.visitDate))
    .limit(limit);

  return records as Array<MedicalRecord & { customerName: string }>;
}

/**
 * カルテを検索（顧客名・要約・メモ・タグで検索）
 */
export async function searchMedicalRecords(query: string, limit: number = 100): Promise<Array<MedicalRecord & { customerName: string }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const searchPattern = `%${query}%`;

  const records = await db
    .select({
      id: medicalRecords.id,
      recordId: medicalRecords.recordId,
      customerId: medicalRecords.customerId,
      visitDate: medicalRecords.visitDate,
      staffId: medicalRecords.staffId,
      staffName: medicalRecords.staffName,
      transcription: medicalRecords.transcription,
      summary: medicalRecords.summary,
      notes: medicalRecords.notes,
      tags: medicalRecords.tags,
      createdAt: medicalRecords.createdAt,
      updatedAt: medicalRecords.updatedAt,
      customerName: customers.fullName,
    })
    .from(medicalRecords)
    .leftJoin(customers, eq(medicalRecords.customerId, customers.customerId))
    .where(
      or(
        like(customers.fullName, searchPattern),
        like(medicalRecords.summary, searchPattern),
        like(medicalRecords.notes, searchPattern),
        like(medicalRecords.tags, searchPattern)
      )
    )
    .orderBy(desc(medicalRecords.visitDate))
    .limit(limit);

  return records as Array<MedicalRecord & { customerName: string }>;
}

/**
 * カルテを更新
 */
export async function updateMedicalRecord(
  recordId: string,
  updates: Partial<Omit<InsertMedicalRecord, "recordId" | "customerId">>
): Promise<MedicalRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(medicalRecords)
    .set(updates)
    .where(eq(medicalRecords.recordId, recordId));

  const [updated] = await db
    .select()
    .from(medicalRecords)
    .where(eq(medicalRecords.recordId, recordId));

  return updated;
}

/**
 * カルテを削除
 */
export async function deleteMedicalRecord(recordId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(medicalRecords).where(eq(medicalRecords.recordId, recordId));
}
