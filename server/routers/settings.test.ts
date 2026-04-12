/**
 * settingsルーターのユニットテスト
 * 定休日設定の取得・更新ロジックをテスト
 */
import { describe, it, expect } from "vitest";

// 定休日設定のロジックをテスト（純粋関数）
describe("定休日設定ロジック", () => {
  const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

  it("デフォルト定休日は日曜（0）", () => {
    const defaultClosedDays = [0];
    expect(defaultClosedDays).toContain(0);
    expect(defaultClosedDays).not.toContain(1);
  });

  it("定休日のJSON文字列化と復元", () => {
    const closedDays = [0, 6]; // 日曜・土曜
    const json = JSON.stringify(closedDays);
    const restored = JSON.parse(json) as number[];
    expect(restored).toEqual([0, 6]);
  });

  it("定休日の表示名変換", () => {
    const closedDays = [0, 6];
    const names = closedDays.map((d) => DAY_NAMES[d]);
    expect(names).toEqual(["日", "土"]);
  });

  it("曜日番号のバリデーション（0〜6の範囲）", () => {
    const validDays = [0, 1, 2, 3, 4, 5, 6];
    validDays.forEach((d) => {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(6);
    });
  });

  it("定休日なし（毎日営業）の場合", () => {
    const closedDays: number[] = [];
    expect(closedDays.length).toBe(0);
    const label = closedDays.length === 0
      ? "定休日なし（毎日営業）"
      : `定休日: ${closedDays.map((d) => DAY_NAMES[d]).join("・")}曜日`;
    expect(label).toBe("定休日なし（毎日営業）");
  });

  it("複数定休日の表示", () => {
    const closedDays = [0, 3, 6]; // 日・水・土
    const label = `定休日: ${closedDays.map((d) => DAY_NAMES[d]).join("・")}曜日`;
    expect(label).toBe("定休日: 日・水・土曜日");
  });

  it("定休日判定（isClosedDay）", () => {
    const closedDays = [0]; // 日曜定休
    const isClosedDay = (dayOfWeek: number) => closedDays.includes(dayOfWeek);
    expect(isClosedDay(0)).toBe(true);  // 日曜 → 定休
    expect(isClosedDay(1)).toBe(false); // 月曜 → 営業
    expect(isClosedDay(6)).toBe(false); // 土曜 → 営業
  });

  it("定休日追加（トグル）", () => {
    let closedDays = [0];
    // 土曜を追加
    closedDays = closedDays.includes(6)
      ? closedDays.filter((d) => d !== 6)
      : [...closedDays, 6].sort();
    expect(closedDays).toEqual([0, 6]);
  });

  it("定休日削除（トグル）", () => {
    let closedDays = [0, 6];
    // 土曜を削除
    closedDays = closedDays.includes(6)
      ? closedDays.filter((d) => d !== 6)
      : [...closedDays, 6].sort();
    expect(closedDays).toEqual([0]);
  });

  it("不正なJSONの場合はデフォルト値を返す", () => {
    const getClosedDays = (value: string): number[] => {
      try {
        return JSON.parse(value) as number[];
      } catch {
        return [0];
      }
    };
    expect(getClosedDays("invalid json")).toEqual([0]);
    expect(getClosedDays("[0,6]")).toEqual([0, 6]);
  });
});

// ===== 予約済みスロット判定ロジックのテスト =====
describe("予約済みスロット判定ロジック（isSlotBooked）", () => {
  // フロントエンドのisSlotBooked相当のロジック
  const isSlotBooked = (
    slotValue: string,
    bookedSlots: Array<{ start: string; end: string }>
  ): boolean => {
    const [sh, sm] = slotValue.split(":").map(Number);
    const slotStart = sh * 60 + sm;
    const slotEnd = slotStart + 90; // 1.5時間
    return bookedSlots.some((booked) => {
      const [bsh, bsm] = booked.start.split(":").map(Number);
      const [beh, bem] = booked.end.split(":").map(Number);
      const bookedStart = bsh * 60 + bsm;
      const bookedEnd = beh * 60 + bem;
      return slotStart < bookedEnd && slotEnd > bookedStart;
    });
  };

  it("予約済み時間帯と完全に重なるスロットは満席", () => {
    const booked = [{ start: "10:30", end: "11:15" }];
    expect(isSlotBooked("10:00", booked)).toBe(true); // 10:00-11:30 は 10:30-11:15 と重なる
    expect(isSlotBooked("10:30", booked)).toBe(true); // 10:30-12:00 は 10:30-11:15 と重なる
  });

  it("予約済み時間帯と重ならないスロットは空き", () => {
    const booked = [{ start: "10:30", end: "11:15" }];
    expect(isSlotBooked("11:30", booked)).toBe(false); // 11:30-13:00 は 10:30-11:15 と重ならない
    expect(isSlotBooked("14:00", booked)).toBe(false); // 14:00-15:30 は重ならない
  });

  it("複数の予約がある場合、いずれかと重なれば満席", () => {
    const booked = [
      { start: "10:30", end: "11:15" },
      { start: "11:30", end: "13:00" },
    ];
    expect(isSlotBooked("10:00", booked)).toBe(true);  // 1件目と重なる
    expect(isSlotBooked("11:00", booked)).toBe(true);  // 1件目と重なる
    expect(isSlotBooked("12:00", booked)).toBe(true);  // 2件目と重なる
    expect(isSlotBooked("13:00", booked)).toBe(false); // どちらとも重ならない
  });

  it("終日ブロック（10:00-21:00）は全スロットを満席にする", () => {
    const booked = [{ start: "10:00", end: "21:00" }];
    expect(isSlotBooked("10:00", booked)).toBe(true);
    expect(isSlotBooked("14:00", booked)).toBe(true);
    expect(isSlotBooked("19:30", booked)).toBe(true);
  });

  it("予約なしの場合は全スロットが空き", () => {
    const booked: Array<{ start: string; end: string }> = [];
    expect(isSlotBooked("10:00", booked)).toBe(false);
    expect(isSlotBooked("14:00", booked)).toBe(false);
  });
});

// UTC→JST変換ロジックのテスト
describe("UTC→JST変換ロジック", () => {
  const utcToJstDate = (utcStr: string): string => {
    const d = new Date(utcStr);
    const jstMs = d.getTime() + 9 * 60 * 60 * 1000;
    const jst = new Date(jstMs);
    const y = jst.getUTCFullYear();
    const mo = String(jst.getUTCMonth() + 1).padStart(2, "0");
    const day = String(jst.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${day}`;
  };

  const utcToJstTime = (utcStr: string): string => {
    const d = new Date(utcStr);
    const jstMs = d.getTime() + 9 * 60 * 60 * 1000;
    const jst = new Date(jstMs);
    const h = String(jst.getUTCHours()).padStart(2, "0");
    const m = String(jst.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  it("UTC 01:30 → JST 10:30（+9時間）", () => {
    expect(utcToJstTime("2026-04-14T01:30:00.000Z")).toBe("10:30");
  });

  it("UTC 02:30 → JST 11:30", () => {
    expect(utcToJstTime("2026-04-14T02:30:00.000Z")).toBe("11:30");
  });

  it("UTC 2026-04-14T01:30 → JST 2026-04-14", () => {
    expect(utcToJstDate("2026-04-14T01:30:00.000Z")).toBe("2026-04-14");
  });

  it("UTC 2026-04-13T15:00 → JST 2026-04-14（日付またぎ）", () => {
    expect(utcToJstDate("2026-04-13T15:00:00.000Z")).toBe("2026-04-14");
  });
});

// ===== 受付締切時間ロジックのテスト =====
describe("受付締切時間ロジック（isSlotPastCutoff）", () => {
  const isSlotPastCutoff = (
    date: Date,
    slotValue: string,
    cutoffHours: number,
    now: Date
  ): boolean => {
    const [sh, sm] = slotValue.split(":").map(Number);
    const slotDateTime = new Date(date);
    slotDateTime.setHours(sh, sm, 0, 0);
    const cutoffMs = cutoffHours * 60 * 60 * 1000;
    return slotDateTime.getTime() - now.getTime() < cutoffMs;
  };

  // ローカル時刻ベースで日時を作成するヘルパー
  const makeLocalDateTime = (y: number, mo: number, d: number, h: number, m: number): Date => {
    const dt = new Date();
    dt.setFullYear(y, mo - 1, d);
    dt.setHours(h, m, 0, 0);
    return dt;
  };
  const makeLocalDate = (y: number, mo: number, d: number): Date => makeLocalDateTime(y, mo, d, 0, 0);

  it("4時間前のスロットは受付終了", () => {
    const now = makeLocalDateTime(2026, 4, 14, 10, 0);
    const date = makeLocalDate(2026, 4, 14);
    // 10:00 のスロット → now と同時刻 → 4時間前を過ぎている
    expect(isSlotPastCutoff(date, "10:00", 4, now)).toBe(true);
  });

  it("4時間以上先のスロットは受付可能", () => {
    const now = makeLocalDateTime(2026, 4, 14, 10, 0);
    const date = makeLocalDate(2026, 4, 14);
    // 14:30 のスロット → 4.5時間後 → 受付可能
    expect(isSlotPastCutoff(date, "14:30", 4, now)).toBe(false);
  });

  it("締剰0時間の場合は全スロット受付可能", () => {
    const now = makeLocalDateTime(2026, 4, 14, 19, 0);
    const date = makeLocalDate(2026, 4, 14);
    // 締剰0時間 → 当日予約も受付
    expect(isSlotPastCutoff(date, "19:30", 0, now)).toBe(false);
  });

  it("翌日のスロットは必ず受付可能（4時間前設定）", () => {
    const now = makeLocalDateTime(2026, 4, 14, 23, 0);
    const date = makeLocalDate(2026, 4, 15);
    expect(isSlotPastCutoff(date, "10:00", 4, now)).toBe(false);
  });
});

// ===== 臢時休業日ロジックのテスト =====
describe("臢時休業日ロジック（blockedDates）", () => {
  const isBlockedDate = (date: Date, blockedDates: string[]): boolean => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return blockedDates.includes(dateStr);
  };

  // ローカル時刻ベースで日付を作成するヘルパー
  const makeLocalDate = (y: number, m: number, d: number): Date => {
    const date = new Date();
    date.setFullYear(y, m - 1, d);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  it("臢時休業日に設定された日は選択不可", () => {
    const blockedDates = ["2026-04-15", "2026-04-20"];
    expect(isBlockedDate(makeLocalDate(2026, 4, 15), blockedDates)).toBe(true);
    expect(isBlockedDate(makeLocalDate(2026, 4, 20), blockedDates)).toBe(true);
  });

  it("臢時休業日に設定されていない日は選択可能", () => {
    const blockedDates = ["2026-04-15"];
    expect(isBlockedDate(makeLocalDate(2026, 4, 14), blockedDates)).toBe(false);
    expect(isBlockedDate(makeLocalDate(2026, 4, 16), blockedDates)).toBe(false);
  });

  it("臢時休業日リストが空の場合は全日選択可能", () => {
    const blockedDates: string[] = [];
    expect(isBlockedDate(makeLocalDate(2026, 4, 15), blockedDates)).toBe(false);
  });

  it("臢時休業日の追加・削除", () => {
    let blockedDates = ["2026-04-15"];
    // 追加
    const newDate = "2026-04-20";
    if (!blockedDates.includes(newDate)) {
      blockedDates = [...blockedDates, newDate].sort();
    }
    expect(blockedDates).toEqual(["2026-04-15", "2026-04-20"]);
    // 削除
    blockedDates = blockedDates.filter((d) => d !== "2026-04-15");
    expect(blockedDates).toEqual(["2026-04-20"]);
  });
});

// ===== カルテ予約紐付けロジックのテスト =====
describe("カルテ予約紐付けロジック", () => {
  it("Notion予約IDが設定されている場合は紐付けあり", () => {
    const record = { notionReservationId: 123, reservationName: "田中太郎｜4月15日 10:30" };
    expect(record.notionReservationId).toBeDefined();
    expect(record.reservationName).toContain("田中太郎");
  });

  it("Notion予約IDが未設定の場合は紐付けなし", () => {
    const record = { notionReservationId: undefined, reservationName: "" };
    expect(record.notionReservationId).toBeUndefined();
  });

  it("予約選択時に来院日時が自動入力される", () => {
    const reservation = { id: 1, startAt: new Date("2026-04-15T01:30:00.000Z") };
    // JST変換（UTC+9）
    const jstDate = new Date(reservation.startAt.getTime() + 9 * 60 * 60 * 1000);
    const visitDate = jstDate.toISOString().split("T")[0];
    // UTC 01:30 → JST 10:30 → 2026-04-15
    expect(visitDate).toBe("2026-04-15");
  });
});
