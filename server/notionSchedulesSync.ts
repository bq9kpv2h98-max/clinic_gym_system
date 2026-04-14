/**
 * Notion予定DB → notionSchedulesテーブル 自動同期
 *
 * Notion「予定」データベース（ID: 6d510b2b41284b349d2f7e93afffb267）から
 * 今日以降の予定を取得し、DBのnotionSchedulesテーブルをupsertする。
 *
 * 呼び出し方:
 *   - 定期実行: server起動時 + 1時間ごと
 */

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { notionSchedules } from "../drizzle/schema";
import { eq } from "drizzle-orm";
const NOTION_SCHEDULE_DB_ID = "6d510b2b41284b349d2f7e93afffb267";
const NOTION_API_VERSION = "2022-06-28";

interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
}

interface SyncResult {
  total: number;
  upserted: number;
  skipped: number;
  errors: number;
}

/**
 * Notion予定DBから今日以降のページを取得する（ページネーション対応）
 */
async function fetchAllNotionSchedules(token: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined = undefined;

  // 今日の日付（JST基準）
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const todayJst = jstNow.toISOString().slice(0, 10);

  const filter = {
    property: "開始日時",
    date: {
      on_or_after: todayJst,
    },
  };

  do {
    const body: Record<string, unknown> = {
      page_size: 100,
      filter,
    };
    if (cursor) body.start_cursor = cursor;

    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_SCHEDULE_DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_API_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Notion API error: ${response.status} ${errText}`);
    }

    const data = (await response.json()) as {
      results: NotionPage[];
      has_more: boolean;
      next_cursor?: string;
    };

    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return pages;
}

/**
 * NotionページのプロパティからISO日時文字列を取得
 */
function getDateValue(
  props: Record<string, unknown>,
  key: string
): string | null {
  const prop = props[key] as
    | { type: string; date?: { start?: string } }
    | undefined;
  if (!prop || prop.type !== "date" || !prop.date?.start) return null;
  return prop.date.start;
}

/**
 * Notionページのプロパティからタイトルテキストを取得
 */
function getTitleText(
  props: Record<string, unknown>,
  key: string
): string {
  const prop = props[key] as
    | { type: string; title?: Array<{ plain_text?: string }> }
    | undefined;
  if (!prop || prop.type !== "title" || !prop.title?.length) return "（無題）";
  return prop.title.map((t) => t.plain_text ?? "").join("");
}

/**
 * Notionページのプロパティからリッチテキストを取得
 */
function getRichText(
  props: Record<string, unknown>,
  key: string
): string | null {
  const prop = props[key] as
    | { type: string; rich_text?: Array<{ plain_text?: string }> }
    | undefined;
  if (!prop || prop.type !== "rich_text" || !prop.rich_text?.length)
    return null;
  return prop.rich_text.map((t) => t.plain_text ?? "").join("");
}

/**
 * ISO日時文字列をUTC Dateに変換（JST文字列の場合はオフセット補正）
 */
function parseToUtcDate(isoStr: string): Date {
  // "2026-04-16T15:00:00.000+09:00" → UTCに変換
  // "2026-04-16T06:00:00.000Z" → そのまま
  return new Date(isoStr);
}

/**
 * Notion予定DBをnotionSchedulesテーブルに同期する
 */
export async function syncNotionSchedules(): Promise<SyncResult> {
  const result: SyncResult = { total: 0, upserted: 0, skipped: 0, errors: 0 };

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    console.warn("[ScheduleSync] NOTION_TOKEN not set, skipping sync");
    return result;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[ScheduleSync] DATABASE_URL not set, skipping sync");
    return result;
  }

  console.log("[ScheduleSync] Fetching schedules from Notion...");
  const pages = await fetchAllNotionSchedules(token);
  result.total = pages.length;
  console.log(`[ScheduleSync] Fetched ${pages.length} pages from Notion`);

  const pool = mysql.createPool({ uri: dbUrl, timezone: "+00:00" });
  const db = drizzle(pool);

  for (const page of pages) {
    try {
      const props = page.properties;
      const title = getTitleText(props, "予定名");
      const startStr = getDateValue(props, "開始日時");
      const endStr = getDateValue(props, "終了日時");
      const memo = getRichText(props, "メモ");

      if (!startStr || !endStr) {
        result.skipped++;
        continue;
      }

      const startAt = parseToUtcDate(startStr);
      const endAt = parseToUtcDate(endStr);

      // upsert: notionPageIdが一致するレコードを更新、なければ挿入
      const existing = await db
        .select({ id: notionSchedules.id })
        .from(notionSchedules)
        .where(eq(notionSchedules.notionPageId, page.id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(notionSchedules)
          .set({ title, startAt, endAt, memo, syncedAt: new Date() })
          .where(eq(notionSchedules.notionPageId, page.id));
      } else {
        await db.insert(notionSchedules).values({
          notionPageId: page.id,
          title,
          startAt,
          endAt,
          memo,
          syncedAt: new Date(),
        });
      }

      result.upserted++;
    } catch (err) {
      console.error(`[ScheduleSync] Error processing page ${page.id}:`, err);
      result.errors++;
    }
  }

  await pool.end();
  console.log(
    `[ScheduleSync] Sync complete: ${result.upserted} upserted, ${result.skipped} skipped, ${result.errors} errors`
  );
  return result;
}
