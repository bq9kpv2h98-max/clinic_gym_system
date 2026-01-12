/**
 * 予約データベースヘルパー
 * 
 * 予約の作成、取得、更新、削除などのデータベース操作を提供します。
 */

import { getDb } from "../db";
import { reservations, customers, type Reservation, type InsertReservation } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

/**
 * 予約を作成
 */
export async function createReservation(data: InsertReservation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [reservation] = await db.insert(reservations).values(data).$returningId();
  return reservation;
}

/**
 * 予約IDで予約を取得
 */
export async function getReservationById(reservationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.reservationId, reservationId));

  return reservation || null;
}

/**
 * 顧客IDで予約一覧を取得
 */
export async function getReservationsByCustomerId(customerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(reservations)
    .where(eq(reservations.customerId, customerId))
    .orderBy(desc(reservations.createdAt));

  return results;
}

/**
 * 施設IDで予約一覧を取得
 */
export async function getReservationsByFacilityId(facilityId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(reservations)
    .where(eq(reservations.facilityId, facilityId))
    .orderBy(desc(reservations.firstChoiceDate));

  return results;
}

/**
 * ステータスで予約一覧を取得
 */
export async function getReservationsByStatus(
  facilityId: string,
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.facilityId, facilityId),
        eq(reservations.status, status)
      )
    )
    .orderBy(desc(reservations.firstChoiceDate));

  return results;
}

/**
 * 日付範囲で予約一覧を取得
 */
export async function getReservationsByDateRange(
  facilityId: string,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.facilityId, facilityId),
        gte(reservations.firstChoiceDate, startDate),
        lte(reservations.firstChoiceDate, endDate)
      )
    )
    .orderBy(asc(reservations.firstChoiceDate));

  return results;
}

/**
 * 予約を更新
 */
export async function updateReservation(
  reservationId: string,
  data: Partial<Omit<Reservation, "id" | "reservationId" | "createdAt">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(reservations)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(reservations.reservationId, reservationId));

  return true;
}

/**
 * 予約ステータスを更新
 */
export async function updateReservationStatus(
  reservationId: string,
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(reservations)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(reservations.reservationId, reservationId));

  return true;
}

/**
 * 予約を削除
 */
export async function deleteReservation(reservationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(reservations).where(eq(reservations.reservationId, reservationId));

  return true;
}

/**
 * 電話番号で既存顧客を検索
 */
export async function findCustomerByPhone(phone: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone));

  return customer || null;
}

/**
 * 予約と顧客情報を結合して取得
 */
export async function getReservationWithCustomer(reservationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select({
      reservation: reservations,
      customer: customers,
    })
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.customerId))
    .where(eq(reservations.reservationId, reservationId));

  if (results.length === 0) return null;

  return results[0];
}

/**
 * 施設の全予約を顧客情報と結合して取得
 */
export async function getReservationsWithCustomers(facilityId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select({
      reservation: reservations,
      customer: customers,
    })
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.customerId))
    .where(eq(reservations.facilityId, facilityId))
    .orderBy(desc(reservations.firstChoiceDate));

  return results;
}
