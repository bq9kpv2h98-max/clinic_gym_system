import { describe, it, expect } from "vitest";
import { google } from "googleapis";

// Google Sheets APIクライアントを初期化
async function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS!);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function readFromGoogleSheet(range: string) {
  const client = await getSheetsClient();
  const response = await client.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range,
  });
  return response.data.values || [];
}

describe("Google Sheets Integration", () => {
  it("should read data from Google Sheets", async () => {
    const data = await readFromGoogleSheet("顧客登録情報!A1:L10");
    console.log("Google Sheets data:", data);
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });

  it("should have customer data in Google Sheets", async () => {
    const data = await readFromGoogleSheet("顧客登録情報!A1:L100");
    console.log("Total rows:", data.length);
    
    // ヘッダー行を除いて、データ行が存在するか確認
    expect(data.length).toBeGreaterThan(1);
    
    // 最新の登録データを確認
    if (data.length > 1) {
      const latestRow = data[data.length - 1];
      console.log("Latest customer data:", latestRow);
      expect(latestRow.length).toBeGreaterThan(0);
    }
  });
});
