import { eq, and, gte, lt, ne, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, notionReservations, notionSchedules } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // timezone: '+00:00' を指定してmysql2がDateをUTCとして扱うようにする
      // これにより、サーバーのローカルTZに関係なく正確な時刻が得られる
      const pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        timezone: '+00:00',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _db = drizzle(pool) as any;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

/**
 * 指定月の日付ごとの予約数を取得（月間カレンダー表示用）
 * @param year JST年
 * @param month JST月（1-12）
 * @returns { 'YYYY-MM-DD': count } の形式
 */
export async function getMonthlyBookedCounts(year: number, month: number): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) return {};

  // JST月の開始と終了をUTC範囲に変換
  const startUTC = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - 9 * 60 * 60 * 1000);
  const endUTC = new Date(Date.UTC(year, month, 1, 0, 0, 0) - 9 * 60 * 60 * 1000);

  const toJSTDateStr = (d: Date): string => {
    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
  };

  try {
    const reservationRows = await db
      .select({ startAt: notionReservations.startAt })
      .from(notionReservations)
      .where(
        and(
          gte(notionReservations.startAt, startUTC),
          lt(notionReservations.startAt, endUTC),
          or(
            isNull(notionReservations.status),
            ne(notionReservations.status, 'キャンセル')
          )
        )
      );

    const scheduleRows = await db
      .select({ startAt: notionSchedules.startAt })
      .from(notionSchedules)
      .where(
        and(
          gte(notionSchedules.startAt, startUTC),
          lt(notionSchedules.startAt, endUTC)
        )
      );

    const counts: Record<string, number> = {};
    for (const row of [...reservationRows, ...scheduleRows]) {
      const dateStr = toJSTDateStr(row.startAt);
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    }
    return counts;
  } catch (error) {
    console.error('[DB] getMonthlyBookedCounts error:', error);
    return {};
  }
}

/**
 * 指定日付（YYYY-MM-DD、JST）の予約済みスロットをDBから取得
 * キャンセルを除く全ステータスを対象にする
 */
export async function getBookedSlotsFromDB(dateStr: string): Promise<Array<{ startAt: Date; endAt: Date | null }>> {
  const db = await getDb();
  if (!db) return [];

  // JST日付をUTC範囲に変換（JST = UTC+9）
  const [year, month, day] = dateStr.split('-').map(Number);
  const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 9 * 60 * 60 * 1000);
  const endUTC = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0) - 9 * 60 * 60 * 1000);

  try {
    // 予約済みスロット（notionReservations）
    const reservationRows = await db
      .select({ startAt: notionReservations.startAt, endAt: notionReservations.endAt })
      .from(notionReservations)
      .where(
        and(
          gte(notionReservations.startAt, startUTC),
          lt(notionReservations.startAt, endUTC),
          or(
            isNull(notionReservations.status),
            ne(notionReservations.status, 'キャンセル')
          )
        )
      );

    // Notion予定スロット（notionSchedules）—当日に重なる予定も満席扱い
    const scheduleRows = await db
      .select({ startAt: notionSchedules.startAt, endAt: notionSchedules.endAt })
      .from(notionSchedules)
      .where(
        and(
          lt(notionSchedules.startAt, endUTC),
          gte(notionSchedules.endAt, startUTC)
        )
      );

    return [
      ...reservationRows,
      ...scheduleRows.map(r => ({ startAt: r.startAt, endAt: r.endAt as Date | null })),
    ];
  } catch (error) {
    console.error('[DB] getBookedSlotsFromDB error:', error);
    return [];
  }
}
