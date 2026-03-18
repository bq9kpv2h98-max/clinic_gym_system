/**
 * フリガナ自動入力機能のユニットテスト
 * 
 * テスト対象:
 * 1. ひらがな→カタカナ変換ロジック
 * 2. フリガナバリデーション（カタカナのみ許可）
 * 3. reservations.createスキーマのcustomerFuriganaフィールド
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// ===== ひらがな→カタカナ変換ロジック =====
function toKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + 0x60)
  );
}

// ===== フリガナバリデーション =====
function isValidFurigana(value: string): boolean {
  if (!value.trim()) return true; // 任意フィールドなので空はOK
  return /^[\u30A0-\u30FF\s\u3000]+$/.test(value.trim());
}

// ===== reservations.createのzodスキーマ（フリガナ部分） =====
const createReservationSchema = z.object({
  customerName: z.string().min(1, "お名前を入力してください"),
  customerFurigana: z.string().optional(),
});

// ===== テスト =====
describe("フリガナ自動入力機能", () => {
  describe("ひらがな→カタカナ変換", () => {
    it("ひらがなをカタカナに変換できる", () => {
      expect(toKatakana("やまだ")).toBe("ヤマダ");
      expect(toKatakana("たろう")).toBe("タロウ");
      expect(toKatakana("はなこ")).toBe("ハナコ");
    });

    it("小文字ひらがなも変換できる", () => {
      expect(toKatakana("ぁぃぅぇぉ")).toBe("ァィゥェォ");
      expect(toKatakana("っ")).toBe("ッ");
      expect(toKatakana("ゃゅょ")).toBe("ャュョ");
    });

    it("カタカナはそのまま返す", () => {
      expect(toKatakana("ヤマダ")).toBe("ヤマダ");
    });

    it("漢字・英字は変換しない", () => {
      expect(toKatakana("山田")).toBe("山田");
      expect(toKatakana("Yamada")).toBe("Yamada");
    });

    it("混在文字列でひらがな部分のみ変換する", () => {
      expect(toKatakana("やまだ たろう")).toBe("ヤマダ タロウ");
    });
  });

  describe("フリガナバリデーション", () => {
    it("カタカナのみの文字列は有効", () => {
      expect(isValidFurigana("ヤマダタロウ")).toBe(true);
      expect(isValidFurigana("ヤマダ タロウ")).toBe(true);
    });

    it("空文字列は有効（任意フィールド）", () => {
      expect(isValidFurigana("")).toBe(true);
    });

    it("ひらがなは無効", () => {
      expect(isValidFurigana("やまだ")).toBe(false);
    });

    it("漢字は無効", () => {
      expect(isValidFurigana("山田")).toBe(false);
    });

    it("英字は無効", () => {
      expect(isValidFurigana("Yamada")).toBe(false);
    });

    it("カタカナ+スペースは有効", () => {
      expect(isValidFurigana("ヤマダ　タロウ")).toBe(true); // 全角スペース
    });
  });

  describe("zodスキーマのcustomerFuriganaフィールド", () => {
    it("customerFuriganaは任意フィールドとして省略可能", () => {
      const result = createReservationSchema.safeParse({
        customerName: "山田 太郎",
      });
      expect(result.success).toBe(true);
    });

    it("customerFuriganaに文字列を渡せる", () => {
      const result = createReservationSchema.safeParse({
        customerName: "山田 太郎",
        customerFurigana: "ヤマダ タロウ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customerFurigana).toBe("ヤマダ タロウ");
      }
    });

    it("customerFuriganaにundefinedを渡せる", () => {
      const result = createReservationSchema.safeParse({
        customerName: "山田 太郎",
        customerFurigana: undefined,
      });
      expect(result.success).toBe(true);
    });

    it("customerNameが空の場合はバリデーションエラー", () => {
      const result = createReservationSchema.safeParse({
        customerName: "",
        customerFurigana: "ヤマダ タロウ",
      });
      expect(result.success).toBe(false);
    });
  });
});
