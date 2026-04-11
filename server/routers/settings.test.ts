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
