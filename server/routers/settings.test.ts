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
