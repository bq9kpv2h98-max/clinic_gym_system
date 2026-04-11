import { eq, and, gte, lt, ne, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, notionReservations } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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
 * 指定日付（YYYY-MM-DD、JST）の予約済みスロットをDBから取得
 * キャンセルを除く全ステータスを対象にする
 */
export async function getBookedSlotsFromDB(dateStr: string): Promise<Array<{ startAt: Date; endAt: Date | null }>> {
  const db = await getDb();
  if (!db) return [];

  // JST日付をUTC範囲に変換（JST = UTC+9）
  // dateStr = "2026-04-14" → JST 2026-04-14 00:00 = UTC 2026-04-13 15:00
  const [year, month, day] = dateStr.split('-').map(Number);
  // 当日のJST 00:00 → UTC
  const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 9 * 60 * 60 * 1000);
  // 習日のJST 00:00 → UTC
  const endUTC = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0) - 9 * 60 * 60 * 1000);

  try {
    const rows = await db
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
    return rows;
  } catch (error) {
    console.error('[DB] getBookedSlotsFromDB error:', error);
    return [];
  }
}
