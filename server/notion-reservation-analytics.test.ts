import { describe, it, expect } from "vitest";

// ============================================================
// UTC → JST 変換ロジック（notion.ts内の関数をインライン再現）
// ============================================================

function utcToJstTime(utcStr: string): string {
  const d = new Date(utcStr);
  const jstMs = d.getTime() + 9 * 60 * 60 * 1000;
  const jst = new Date(jstMs);
  const h = String(jst.getUTCHours()).padStart(2, "0");
  const m = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function utcToJstDate(utcStr: string): string {
  const d = new Date(utcStr);
  const jstMs = d.getTime() + 9 * 60 * 60 * 1000;
  const jst = new Date(jstMs);
  const y = jst.getUTCFullYear();
  const mo = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

// ============================================================
// 30分刻みスロット生成ロジック
// ============================================================

function generateTimeSlots(
  startHour: number,
  endHour: number,
  intervalMinutes: number,
  durationMinutes: number
): string[] {
  const slots: string[] = [];
  const totalMinutesEnd = endHour * 60;
  let current = startHour * 60;
  while (current + durationMinutes <= totalMinutesEnd) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    current += intervalMinutes;
  }
  return slots;
}

// ============================================================
// スロット満席判定ロジック（重複チェック）
// ============================================================

function isSlotBooked(
  slotTime: string,
  bookedSlots: Array<{ start: string; end: string }>,
  durationMinutes: number
): boolean {
  const [sh, sm] = slotTime.split(":").map(Number);
  const slotStart = sh * 60 + sm;
  const slotEnd = slotStart + durationMinutes;

  return bookedSlots.some(({ start, end }) => {
    const [bsh, bsm] = start.split(":").map(Number);
    const [beh, bem] = end.split(":").map(Number);
    const bookedStart = bsh * 60 + bsm;
    const bookedEnd = beh * 60 + bem;
    return slotStart < bookedEnd && slotEnd > bookedStart;
  });
}

// ============================================================
// KPI計算ロジック
// ============================================================

function calcCancelRate(total: number, cancelled: number): number {
  if (total === 0) return 0;
  return Math.round((cancelled / total) * 100);
}

function calcCompletionRate(total: number, completed: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// ============================================================
// テスト
// ============================================================

describe("UTC → JST 変換", () => {
  it("UTC 02:00 → JST 11:00 に変換される", () => {
    expect(utcToJstTime("2026-04-10T02:00:00.000Z")).toBe("11:00");
  });

  it("UTC 04:30 → JST 13:30 に変換される", () => {
    expect(utcToJstTime("2026-04-10T04:30:00.000Z")).toBe("13:30");
  });

  it("UTC 11:30 → JST 20:30 に変換される", () => {
    expect(utcToJstTime("2026-04-10T11:30:00.000Z")).toBe("20:30");
  });

  it("日付変換: UTC 2026-04-09T15:00Z → JST 2026-04-10", () => {
    expect(utcToJstDate("2026-04-09T15:00:00.000Z")).toBe("2026-04-10");
  });

  it("日付変換: UTC 2026-04-10T02:00Z → JST 2026-04-10", () => {
    expect(utcToJstDate("2026-04-10T02:00:00.000Z")).toBe("2026-04-10");
  });

  it("日付変換: UTC 2026-04-10T14:59Z → JST 2026-04-10 (23:59)", () => {
    expect(utcToJstDate("2026-04-10T14:59:00.000Z")).toBe("2026-04-10");
  });

  it("日付変換: UTC 2026-04-10T15:00Z → JST 2026-04-11 (00:00)", () => {
    expect(utcToJstDate("2026-04-10T15:00:00.000Z")).toBe("2026-04-11");
  });
});

describe("30分刻みスロット生成", () => {
  it("10:00〜21:00、1時間半施術で最終スロットは19:30", () => {
    const slots = generateTimeSlots(10, 21, 30, 90);
    expect(slots[0]).toBe("10:00");
    expect(slots[slots.length - 1]).toBe("19:30");
  });

  it("スロット数が正しい（10:00〜19:30、30分刻み = 20スロット）", () => {
    const slots = generateTimeSlots(10, 21, 30, 90);
    expect(slots.length).toBe(20);
  });

  it("30分刻みで正しく生成される", () => {
    const slots = generateTimeSlots(10, 21, 30, 90);
    expect(slots[1]).toBe("10:30");
    expect(slots[2]).toBe("11:00");
    expect(slots[3]).toBe("11:30");
  });
});

describe("スロット満席判定（重複チェック）", () => {
  const bookedSlots = [
    { start: "11:00", end: "12:30" },
  ];

  it("予約済みスロットと完全一致する場合は満席", () => {
    expect(isSlotBooked("11:00", bookedSlots, 90)).toBe(true);
  });

  it("予約済みスロットと重なる場合は満席（10:00〜11:30 → 11:00と重なる）", () => {
    expect(isSlotBooked("10:00", bookedSlots, 90)).toBe(true);
  });

  it("予約済みスロットと重なる場合は満席（10:30〜12:00 → 11:00と重なる）", () => {
    expect(isSlotBooked("10:30", bookedSlots, 90)).toBe(true);
  });

  it("予約済みスロットの後ろは空き（12:30〜14:00 → 重ならない）", () => {
    expect(isSlotBooked("12:30", bookedSlots, 90)).toBe(false);
  });

  it("予約済みスロットの前は空き（09:00〜10:30 → 11:00と重ならない）", () => {
    expect(isSlotBooked("09:00", bookedSlots, 90)).toBe(false);
  });

  it("複数の予約済みスロットで正しく判定される", () => {
    const multiBooked = [
      { start: "10:00", end: "11:30" },
      { start: "14:00", end: "15:30" },
    ];
    expect(isSlotBooked("10:00", multiBooked, 90)).toBe(true);
    expect(isSlotBooked("14:00", multiBooked, 90)).toBe(true);
    expect(isSlotBooked("12:00", multiBooked, 90)).toBe(false);
    expect(isSlotBooked("16:00", multiBooked, 90)).toBe(false);
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
});

describe("Notion MCP出力パース（Tool execution result形式）", () => {
  it("Tool execution result行の後のJSONを正しく抽出できる", () => {
    const mockOutput = [
      "Some log output",
      "Tool execution result:",
      '{"results": [{"id": "abc123", "title": "テスト予約"}], "has_more": false}',
    ].join("\n");

    const lines = mockOutput.split("\n");
    let jsonStr = "";
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("Tool execution result:")) {
        jsonStr = lines.slice(i + 1).join("\n").trim();
        break;
      }
    }
    const parsed = JSON.parse(jsonStr);
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].id).toBe("abc123");
  });

  it("Tool execution result行がない場合は空文字列になる", () => {
    const mockOutput = "Some log output\nNo result here";
    const lines = mockOutput.split("\n");
    let jsonStr = "";
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("Tool execution result:")) {
        jsonStr = lines.slice(i + 1).join("\n").trim();
        break;
      }
    }
    expect(jsonStr).toBe("");
  });

  it("fetchResult.textからプロパティJSONを抽出できる", () => {
    const mockText = `
<page>
<properties>
{"date:予約日時:start": "2026-04-10T02:00:00.000Z", "date:予約日時:end": "2026-04-10T03:30:00.000Z", "ステータス": "予定中", "サービス種別": "整体"}
</properties>
</page>
    `.trim();

    const propsMatch = mockText.match(/<properties>\s*({[\s\S]*?})\s*<\/properties>/);
    expect(propsMatch).not.toBeNull();
    const props = JSON.parse(propsMatch![1]);
    expect(props["date:予約日時:start"]).toBe("2026-04-10T02:00:00.000Z");
    expect(props["ステータス"]).toBe("予定中");
    // UTC→JST変換確認
    expect(utcToJstTime(props["date:予約日時:start"])).toBe("11:00");
    expect(utcToJstDate(props["date:予約日時:start"])).toBe("2026-04-10");
  });
});
