/**
 * 来院履歴と月次統計のGoogle Sheetsテスト
 */

import { describe, it, expect } from "vitest";
import { google } from "googleapis";

const GOOGLE_SHEETS_CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS;
const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

describe("Visit Google Sheets Integration", () => {
  it("should have visit data in Google Sheets", async () => {
    if (!GOOGLE_SHEETS_CREDENTIALS || !GOOGLE_SHEETS_SPREADSHEET_ID) {
      console.log("Skipping test: Google Sheets credentials not configured");
      return;
    }

    const credentials = JSON.parse(GOOGLE_SHEETS_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 来院履歴シートからデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range: "来院履歴!A:F",
    });

    const rows = response.data.values || [];
    console.log("来院履歴シートの行数:", rows.length);
    
    if (rows.length > 1) {
      console.log("最新の来院記録:", rows[rows.length - 1]);
    }

    expect(rows.length).toBeGreaterThan(0); // ヘッダー行が存在
  });

  it("should have monthly summary data in Google Sheets", async () => {
    if (!GOOGLE_SHEETS_CREDENTIALS || !GOOGLE_SHEETS_SPREADSHEET_ID) {
      console.log("Skipping test: Google Sheets credentials not configured");
      return;
    }

    const credentials = JSON.parse(GOOGLE_SHEETS_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 月次来院統計シートからデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range: "月次来院統計!A:E",
    });

    const rows = response.data.values || [];
    console.log("月次来院統計シートの行数:", rows.length);
    
    if (rows.length > 1) {
      console.log("最新の月次統計:", rows[rows.length - 1]);
    }

    expect(rows.length).toBeGreaterThan(0); // ヘッダー行が存在
  });
});
