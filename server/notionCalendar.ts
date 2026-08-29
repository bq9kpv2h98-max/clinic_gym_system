/**
 * Notionを予約の正本として扱うカレンダー連携。
 * 公開環境で利用できるNotion REST APIのみを使用し、開発用CLIには依存しない。
 */
const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_API_VERSION = "2026-03-11";

const RESERVATION_DATA_SOURCE_ID =
  process.env.NOTION_RESERVATION_DATA_SOURCE_ID ?? "2c7fc32c-8e8e-8168-b217-000bd01e5ca4";
const SCHEDULE_DATA_SOURCE_ID =
  process.env.NOTION_SCHEDULE_DATA_SOURCE_ID ?? "6d510b2b-4128-4b34-9d2f-7e93afffb267";

export type ReservationStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export type NotionBlockedSlot = {
  startAt: Date;
  endAt: Date;
  source: "reservation" | "schedule";
};

export type NotionCalendarReservation = {
  pageId: string;
  pageUrl: string;
  customerName: string;
  serviceType: string | null;
  status: ReservationStatus;
  startAt: Date;
  endAt: Date;
  notes: string;
  staffNotes: string;
};

type NotionPage = {
  id: string;
  url: string;
  properties: Record<string, unknown>;
};

type NotionListResponse = {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

function getNotionToken(): string {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error("NOTION_TOKEN is not set. Set the Notion integration token before accepting reservations.");
  }
  return token;
}

async function notionRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${NOTION_API_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${getNotionToken()}`,
          "Notion-Version": NOTION_API_VERSION,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });

      if (response.ok) return (await response.json()) as T;

      const body = await response.text();
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`Notion API request failed (${response.status}): ${body}`);
      }
      lastError = new Error(`Notion API request failed (${response.status}): ${body}`);
      const delay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error("Notion API request failed");
      if (normalizedError.message.includes("(4") && !normalizedError.message.includes("(429")) throw normalizedError;
      lastError = normalizedError;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
  throw lastError ?? new Error("Notion API request failed after retries");
}

function dateOnlyInJst(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
}

function jstDayBounds(dateString: string): { startAt: Date; endAt: Date } {
  const [year, month, day] = dateString.split("-").map(Number);
  const startAt = new Date(Date.UTC(year, month - 1, day, -9, 0, 0));
  const endAt = new Date(Date.UTC(year, month - 1, day + 1, -9, 0, 0));
  return { startAt, endAt };
}

function getDateRange(properties: Record<string, unknown>, propertyName: string) {
  const property = properties[propertyName] as
    | { type?: string; date?: { start?: string | null; end?: string | null } | null }
    | undefined;
  if (!property?.date?.start) return null;

  const startAt = new Date(property.date.start);
  const endAt = property.date.end ? new Date(property.date.end) : new Date(startAt.getTime() + 90 * 60 * 1000);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return null;
  return { startAt, endAt };
}

function getSelectValue(properties: Record<string, unknown>, propertyName: string): string | null {
  const property = properties[propertyName] as { select?: { name?: string } | null } | undefined;
  return property?.select?.name ?? null;
}

function getTextValue(properties: Record<string, unknown>, propertyName: string): string {
  const property = properties[propertyName] as
    | { title?: Array<{ plain_text?: string }>; rich_text?: Array<{ plain_text?: string }> }
    | undefined;
  const items = property?.title ?? property?.rich_text ?? [];
  return items.map((item) => item.plain_text ?? "").join("");
}

function statusFromNotion(status: string | null): ReservationStatus {
  if (status === "予約リクエスト") return "pending";
  if (status === "完了") return "completed";
  if (status === "キャンセル") return "cancelled";
  // 既存の予定には予約状態が未設定のため、予約済みとして扱う。
  return "confirmed";
}

async function queryDataSource(
  dataSourceId: string,
  propertyName: string,
  startAt: Date,
  endAt: Date
): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const data = await notionRequest<NotionListResponse>(`/data_sources/${dataSourceId}/query`, {
      method: "POST",
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor,
        filter: {
          and: [
            { property: propertyName, date: { on_or_after: startAt.toISOString() } },
            { property: propertyName, date: { before: endAt.toISOString() } },
          ],
        },
      }),
    });
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor ?? undefined : undefined;
  } while (cursor);

  return pages;
}

function overlapsDay(slot: { startAt: Date; endAt: Date }, bounds: { startAt: Date; endAt: Date }): boolean {
  return slot.startAt < bounds.endAt && slot.endAt > bounds.startAt;
}

function statusToNotion(status: ReservationStatus): "予約リクエスト" | "確定" | "キャンセル" | "完了" {
  if (status === "confirmed") return "確定";
  if (status === "completed") return "完了";
  if (status === "cancelled" || status === "no_show") return "キャンセル";
  return "予約リクエスト";
}

/** Notionの予約と予定の両方を読み、予約不可の時刻範囲を返す。 */
export async function getNotionBlockedSlotsForDate(dateString: string): Promise<NotionBlockedSlot[]> {
  const bounds = jstDayBounds(dateString);
  const [reservationPages, schedulePages] = await Promise.all([
    queryDataSource(RESERVATION_DATA_SOURCE_ID, "予約日時", bounds.startAt, bounds.endAt),
    queryDataSource(SCHEDULE_DATA_SOURCE_ID, "終了日時", bounds.startAt, bounds.endAt),
  ]);

  const reservations = reservationPages.flatMap((page) => {
    if (getSelectValue(page.properties, "予約状態") === "キャンセル") return [];
    const range = getDateRange(page.properties, "予約日時");
    return range && overlapsDay(range, bounds) ? [{ ...range, source: "reservation" as const }] : [];
  });

  const schedules = schedulePages.flatMap((page) => {
    const range = getDateRange(page.properties, "終了日時") ?? getDateRange(page.properties, "開始日時");
    return range && overlapsDay(range, bounds) ? [{ ...range, source: "schedule" as const }] : [];
  });

  return [...reservations, ...schedules];
}

/** 月間のNotion予約・予定件数をカレンダーの補助表示に使う。 */
export async function getNotionMonthlyAvailability(year: number, month: number): Promise<Record<string, number>> {
  const startAt = new Date(Date.UTC(year, month - 1, 1, -9, 0, 0));
  const endAt = new Date(Date.UTC(year, month, 1, -9, 0, 0));
  const [reservationPages, schedulePages] = await Promise.all([
    queryDataSource(RESERVATION_DATA_SOURCE_ID, "予約日時", startAt, endAt),
    queryDataSource(SCHEDULE_DATA_SOURCE_ID, "終了日時", startAt, endAt),
  ]);

  const counts: Record<string, number> = {};
  for (const page of reservationPages) {
    if (getSelectValue(page.properties, "予約状態") === "キャンセル") continue;
    const range = getDateRange(page.properties, "予約日時");
    if (!range) continue;
    const key = dateOnlyInJst(range.startAt);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  for (const page of schedulePages) {
    const range = getDateRange(page.properties, "終了日時") ?? getDateRange(page.properties, "開始日時");
    if (!range) continue;
    const key = dateOnlyInJst(range.startAt);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** スタッフ画面用に、Notion正本の予約一覧を日時順で返す。 */
export async function listNotionCalendarReservations(startDate: Date, endDate: Date): Promise<NotionCalendarReservation[]> {
  const pages = await queryDataSource(RESERVATION_DATA_SOURCE_ID, "予約日時", startDate, endDate);
  return pages.flatMap((page) => {
    const range = getDateRange(page.properties, "予約日時");
    if (!range) return [];
    return [{
      pageId: page.id,
      pageUrl: page.url,
      customerName: getTextValue(page.properties, "Name") || "（氏名未入力）",
      serviceType: getSelectValue(page.properties, "サービス種別"),
      status: statusFromNotion(getSelectValue(page.properties, "予約状態")),
      startAt: range.startAt,
      endAt: range.endAt,
      notes: getTextValue(page.properties, "予約メモ"),
      staffNotes: getTextValue(page.properties, "スタッフメモ"),
    }];
  }).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

export async function createNotionCalendarReservation(input: {
  customerName: string;
  serviceType: "整体" | "マッサージ" | "パーソナルトレーニング" | "グループレッスン" | "その他";
  startAt: Date;
  endAt: Date;
  notes?: string | null;
}): Promise<{ pageId: string; pageUrl: string }> {
  const properties: Record<string, unknown> = {
    Name: { title: [{ type: "text", text: { content: input.customerName } }] },
    "サービス種別": { select: { name: input.serviceType } },
    "予約日時": { date: { start: input.startAt.toISOString(), end: input.endAt.toISOString() } },
    "予約状態": { select: { name: "予約リクエスト" } },
  };
  if (input.notes?.trim()) {
    properties["予約メモ"] = { rich_text: [{ type: "text", text: { content: input.notes.trim() } }] };
  }

  const page = await notionRequest<NotionPage>("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { data_source_id: RESERVATION_DATA_SOURCE_ID },
      properties,
    }),
  });
  return { pageId: page.id, pageUrl: page.url };
}

export async function updateNotionCalendarReservation(
  pageId: string,
  updates: { status?: ReservationStatus; staffNotes?: string }
): Promise<void> {
  const properties: Record<string, unknown> = {};
  if (updates.status) properties["予約状態"] = { select: { name: statusToNotion(updates.status) } };
  if (updates.staffNotes !== undefined) {
    properties["スタッフメモ"] = updates.staffNotes.trim()
      ? { rich_text: [{ type: "text", text: { content: updates.staffNotes.trim() } }] }
      : { rich_text: [] };
  }
  if (Object.keys(properties).length === 0) return;

  await notionRequest<NotionPage>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}
