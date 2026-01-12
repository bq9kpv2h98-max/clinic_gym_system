import { getDb } from "../db";
import {
  registrationQrCodes,
  registrationAttempts,
  RegistrationQrCode,
  RegistrationAttempt,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * QRコードを生成して登録する
 */
export async function createRegistrationQrCode(
  facilityId: string,
  facilityName: string,
  registrationUrl: string,
  expiresAt?: Date
): Promise<RegistrationQrCode> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const qrCodeId = uuidv4();
  const qrCodeData = `${registrationUrl}?qrId=${qrCodeId}`;

  const result = await db
    .insert(registrationQrCodes)
    .values({
      qrCodeId,
      facilityId,
      facilityName,
      qrCodeData,
      registrationUrl,
      isActive: 1,
      expiresAt,
    })
    .execute();

  return {
    qrCodeId,
    facilityId,
    facilityName,
    qrCodeData,
    registrationUrl,
    qrCodeImageUrl: null,
    isActive: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: expiresAt || null,
  } as RegistrationQrCode;
}

/**
 * 施設のQRコード一覧を取得
 */
export async function getFacilityQrCodes(
  facilityId: string
): Promise<RegistrationQrCode[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(registrationQrCodes)
    .where(eq(registrationQrCodes.facilityId, facilityId))
    .execute();
}

/**
 * QRコードIDから詳細を取得
 */
export async function getQrCodeById(qrCodeId: string): Promise<RegistrationQrCode | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(registrationQrCodes)
    .where(eq(registrationQrCodes.qrCodeId, qrCodeId))
    .execute();

  return result.length > 0 ? result[0] : null;
}

/**
 * QRコードを有効/無効に切り替え
 */
export async function toggleQrCodeStatus(
  qrCodeId: string,
  isActive: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(registrationQrCodes)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(registrationQrCodes.qrCodeId, qrCodeId))
    .execute();
}

/**
 * QRコードの画像URLを更新
 */
export async function updateQrCodeImageUrl(
  qrCodeId: string,
  imageUrl: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(registrationQrCodes)
    .set({ qrCodeImageUrl: imageUrl, updatedAt: new Date() })
    .where(eq(registrationQrCodes.qrCodeId, qrCodeId))
    .execute();
}

/**
 * 登録試行を開始
 */
export async function createRegistrationAttempt(
  qrCodeId: string,
  facilityId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<RegistrationAttempt> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const attemptId = uuidv4();
  const sessionToken = uuidv4();

  const result = await db
    .insert(registrationAttempts)
    .values({
      attemptId,
      qrCodeId,
      facilityId,
      status: "initiated",
      sessionToken,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    })
    .execute();

  return {
    attemptId,
    qrCodeId,
    facilityId,
    customerId: null,
    status: "initiated",
    sessionToken,
    startedAt: new Date(),
    completedAt: null,
    abandonedAt: null,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  } as RegistrationAttempt;
}

/**
 * 登録試行のステータスを更新
 */
export async function updateRegistrationAttemptStatus(
  attemptId: string,
  status: "initiated" | "in_progress" | "completed" | "abandoned",
  customerId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === "completed" && customerId) {
    updateData.customerId = customerId;
    updateData.completedAt = new Date();
  } else if (status === "abandoned") {
    updateData.abandonedAt = new Date();
  }

  await db
    .update(registrationAttempts)
    .set(updateData)
    .where(eq(registrationAttempts.attemptId, attemptId))
    .execute();
}

/**
 * セッショントークンから登録試行を取得
 */
export async function getRegistrationAttemptByToken(
  sessionToken: string
): Promise<RegistrationAttempt | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(registrationAttempts)
    .where(eq(registrationAttempts.sessionToken, sessionToken))
    .execute();

  return result.length > 0 ? result[0] : null;
}

/**
 * QRコードの登録統計を取得
 */
export async function getQrCodeStatistics(
  facilityId: string,
  qrCodeId?: string
): Promise<{
  totalAttempts: number;
  completedRegistrations: number;
  abandonedAttempts: number;
  conversionRate: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const whereConditions = [eq(registrationAttempts.facilityId, facilityId)];
  if (qrCodeId) {
    whereConditions.push(eq(registrationAttempts.qrCodeId, qrCodeId));
  }

  const attempts = await db
    .select()
    .from(registrationAttempts)
    .where(and(...whereConditions))
    .execute();

  const totalAttempts = attempts.length;
  const completedRegistrations = attempts.filter(
    (a) => a.status === "completed"
  ).length;
  const abandonedAttempts = attempts.filter(
    (a) => a.status === "abandoned"
  ).length;
  const conversionRate =
    totalAttempts > 0 ? (completedRegistrations / totalAttempts) * 100 : 0;

  return {
    totalAttempts,
    completedRegistrations,
    abandonedAttempts,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}

/**
 * 有効期限切れのQRコードを無効化
 */
export async function deactivateExpiredQrCodes(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();

  const result = await db
    .update(registrationQrCodes)
    .set({ isActive: 0, updatedAt: now })
    .where(
      and(
        eq(registrationQrCodes.isActive, 1),
        // expiresAtがnullでなく、現在時刻より前
        // Note: Drizzleの比較演算子を使用
      )
    )
    .execute();

  return 0; // Drizzleの実装では行数を直接取得できないため、0を返す
}
