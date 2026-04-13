/**
 * Notion予約DB → notionReservationsテーブル 自動同期
 *
 * Notion Integration Token（NOTION_TOKEN）を使って予約DBの全件を取得し、
 * DBのnotionReservationsテーブルをupsertする。
 *
 * 呼び出し方:
 *   - tRPC: admin.syncNotionReservations
 *   - 定期実行: server起動時 + 1時間ごと
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { notionReservations } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";

const NOTION_DB_ID = "2c7fc32c8e8e81a0b588e4fd6e93cb16";
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
 * Notion予約DBから今日以降のページを取得する（ページネーション対応）
 * 過去分はCSVインポート済みのため、未来の予約のみを同期して処理量を削減する
 */
async function fetchAllNotionReservations(token: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined = undefined;

  // 今日の日付（JST基準でYYYY-MM-DD形式）
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // UTC+9
  const jstNow = new Date(now.getTime() + jstOffset);
  const todayJst = jstNow.toISOString().slice(0, 10); // "YYYY-MM-DD"

  // Notion API フィルター: 予約日時が今日以降
  const filter = {
    property: "予約日時",
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
      `https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`,
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
      const err = await response.json();
      throw new Error(`Notion API error: ${JSON.stringify(err)}`);
    }

    const data = (await response.json()) as {
      object: string;
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    };

    pages.push(...data.results);
    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);

  return pages;
}

/**
 * Notionページから予約日時を抽出してUTC Dateに変換
 */
function extractDates(page: NotionPage): { startAt: Date; endAt: Date } | null {
  const dateProp = (page.properties as Record<string, { type: string; date?: { start?: string; end?: string } }>)["予約日時"];
  if (!dateProp?.date?.start) return null;

  const startAt = new Date(dateProp.date.start);
  let endAt: Date;

  if (dateProp.date.end) {
    endAt = new Date(dateProp.date.end);
  } else {
    // 終了時刻がない場合は開始+90分
    endAt = new Date(startAt.getTime() + 90 * 60 * 1000);
  }

  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) return null;
  return { startAt, endAt };
}

/**
 * Notionページからステータスを抽出
 */
function extractStatus(page: NotionPage): string | null {
  const statusProp = (page.properties as Record<string, { type: string; select?: { name?: string } }>)["ステータス"];
  return statusProp?.select?.name ?? null;
}

/**
 * Notionページからサービス種別を抽出
 */
function extractServiceType(page: NotionPage): string | null {
  const prop = (page.properties as Record<string, { type: string; select?: { name?: string } }>)["サービス種別"];
  return prop?.select?.name ?? null;
}

/**
 * Notionページから顧客名を抽出
 */
function extractCustomerName(page: NotionPage): string | null {
  const nameProp = (page.properties as Record<string, { type: string; title?: Array<{ plain_text?: string }>; rich_text?: Array<{ plain_text?: string }> }>)["顧客名"];
  if (nameProp?.title?.[0]?.plain_text) return nameProp.title[0].plain_text;
  if (nameProp?.rich_text?.[0]?.plain_text) return nameProp.rich_text[0].plain_text;
  return null;
}

/**
 * Notion予約DBをDBにフル同期する
 */
export async function syncNotionReservationsToDB(): Promise<SyncResult> {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error("NOTION_TOKEN is not set");
  }

  const connection = await mysql.createConnection(ENV.databaseUrl);
  const db = drizzle(connection);

  let upserted = 0;
  let skipped = 0;
  let errors = 0;

  try {
    console.log("[NotionSync] Fetching all reservations from Notion...");
    const pages = await fetchAllNotionReservations(token);
    console.log(`[NotionSync] Fetched ${pages.length} pages from Notion`);

    for (const page of pages) {
      try {
        const dates = extractDates(page);
        if (!dates) {
          skipped++;
          continue;
        }

        const status = extractStatus(page);
        const serviceType = extractServiceType(page);
        const customerName = extractCustomerName(page);

        // upsert: notionPageIdで重複チェック
        const existing = await db
          .select({ id: notionReservations.id })
          .from(notionReservations)
          .where(eq(notionReservations.notionPageId, page.id))
          .limit(1);

        const resolvedName = customerName ?? "不明";

        if (existing.length > 0) {
          // 既存レコードを更新
          await db
            .update(notionReservations)
            .set({
              startAt: dates.startAt,
              endAt: dates.endAt,
              status: status,
              serviceType: serviceType,
              customerName: resolvedName,
              updatedAt: new Date(),
            })
            .where(eq(notionReservations.notionPageId, page.id));
        } else {
          // 新規レコードを挿入
          await db.insert(notionReservations).values({
            notionPageId: page.id ?? undefined,
            startAt: dates.startAt,
            endAt: dates.endAt,
            status: status,
            serviceType: serviceType,
            customerName: resolvedName,
          });
        }
        upserted++;
      } catch (err) {
        console.error(`[NotionSync] Error processing page ${page.id}:`, err);
        errors++;
      }
    }

    console.log(`[NotionSync] Sync complete: ${upserted} upserted, ${skipped} skipped, ${errors} errors`);
    return { total: pages.length, upserted, skipped, errors };
  } finally {
    await connection.end();
  }
}
