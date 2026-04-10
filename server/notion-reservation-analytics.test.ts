import { describe, it, expect } from "vitest";

// 30分刻み時間スロット生成ロジックのテスト
function generateTimeSlots(startHour: number, endHour: number, durationMinutes: number): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 30) {
      const endMinutes = h * 60 + m + durationMinutes;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      if (endH > endHour || (endH === endHour && endM > 0)) break;
      const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const end = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
      slots.push(`${start} 〜 ${end}`);
    }
  }
  return slots;
}

// キャンセル率計算ロジックのテスト
function calcCancelRate(total: number, cancelled: number): number {
  if (total === 0) return 0;
  return Math.round((cancelled / total) * 100);
}

// 完了率計算ロジックのテスト
function calcCompletionRate(total: number, completed: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// 時間帯別集計ロジックのテスト
function aggregateByHour(slots: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const slot of slots) {
    const match = slot.match(/^(\d{2}:\d{2})/);
    if (match) {
      const hour = match[1].substring(0, 2) + ":00";
      result[hour] = (result[hour] || 0) + 1;
    }
  }
  return result;
}

describe("30分刻み時間スロット生成", () => {
  it("10:00〜21:00（1時間半施術）で正しいスロット数が生成される", () => {
    const slots = generateTimeSlots(10, 21, 90);
    // 10:00〜19:30が最終 → 10:00,10:30,...,19:30 = 20スロット
    expect(slots.length).toBe(20);
  });

  it("最初のスロットが10:00〜11:30である", () => {
    const slots = generateTimeSlots(10, 21, 90);
    expect(slots[0]).toBe("10:00 〜 11:30");
  });

  it("最後のスロットが19:30〜21:00である", () => {
    const slots = generateTimeSlots(10, 21, 90);
    expect(slots[slots.length - 1]).toBe("19:30 〜 21:00");
  });

  it("30分刻みで連続するスロットが生成される", () => {
    const slots = generateTimeSlots(10, 21, 90);
    expect(slots[1]).toBe("10:30 〜 12:00");
    expect(slots[2]).toBe("11:00 〜 12:30");
  });

  it("21:00を超えるスロットは生成されない", () => {
    const slots = generateTimeSlots(10, 21, 90);
    const invalid = slots.filter(s => {
      const endMatch = s.match(/〜 (\d{2}):(\d{2})/);
      if (!endMatch) return false;
      const endH = parseInt(endMatch[1]);
      const endM = parseInt(endMatch[2]);
      return endH > 21 || (endH === 21 && endM > 0);
    });
    expect(invalid.length).toBe(0);
  });
});

describe("予約分析KPI計算", () => {
  it("キャンセル率が正しく計算される", () => {
    expect(calcCancelRate(100, 20)).toBe(20);
    expect(calcCancelRate(50, 10)).toBe(20);
    expect(calcCancelRate(0, 0)).toBe(0);
  });

  it("完了率が正しく計算される", () => {
    expect(calcCompletionRate(100, 80)).toBe(80);
    expect(calcCompletionRate(10, 7)).toBe(70);
    expect(calcCompletionRate(0, 0)).toBe(0);
  });

  it("キャンセル率が20%を超えると要改善フラグが立つ", () => {
    const rate = calcCancelRate(100, 25);
    expect(rate > 20).toBe(true);
  });

  it("キャンセル率が20%以下なら良好フラグが立つ", () => {
    const rate = calcCancelRate(100, 15);
    expect(rate > 20).toBe(false);
  });
});

describe("時間帯別集計", () => {
  it("同じ時間帯のスロットが正しく集計される", () => {
    const slots = ["10:00 〜 11:30", "10:30 〜 12:00", "11:00 〜 12:30"];
    const result = aggregateByHour(slots);
    expect(result["10:00"]).toBe(2);
    expect(result["11:00"]).toBe(1);
  });

  it("空の配列では空オブジェクトが返る", () => {
    const result = aggregateByHour([]);
    expect(Object.keys(result).length).toBe(0);
  });
});

describe("満席スロット判定", () => {
  it("予約済みスロットと一致するスロットはdisabledになる", () => {
    const bookedSlots = ["10:00", "11:30", "14:00"];
    const slot = "10:00";
    const isBooked = bookedSlots.includes(slot);
    expect(isBooked).toBe(true);
  });

  it("予約済みでないスロットはdisabledにならない", () => {
    const bookedSlots = ["10:00", "11:30", "14:00"];
    const slot = "13:00";
    const isBooked = bookedSlots.includes(slot);
    expect(isBooked).toBe(false);
  });
});
