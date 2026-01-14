/**
 * Google Sheetsのヘッダー行を初期化するスクリプト
 * 
 * 来院履歴と月次来院統計のシートにヘッダーを追加します。
 */

import { google } from "googleapis";
import dotenv from "dotenv";

// 環境変数を読み込み
dotenv.config();

const GOOGLE_SHEETS_CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS;
const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

async function initializeHeaders() {
  if (!GOOGLE_SHEETS_CREDENTIALS || !GOOGLE_SHEETS_SPREADSHEET_ID) {
    console.error("❌ Google Sheets credentials not configured");
    process.exit(1);
  }

  try {
    const credentials = JSON.parse(GOOGLE_SHEETS_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 来院履歴シートのヘッダー
    const visitHeaders = [
      "来院日時",
      "来院ID",
      "顧客ID",
      "顧客名",
      "獲得ポイント",
      "備考",
    ];

    // 月次来院統計シートのヘッダー
    const monthlySummaryHeaders = [
      "年月",
      "顧客ID",
      "顧客名",
      "来院回数",
      "最終来院日",
    ];

    console.log("📝 Initializing sheet headers...");

    // スプレッドシートの情報を取得
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
    });

    const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    console.log("📊 現在のシート:", existingSheets);

    // 必要なシートを作成
    const sheetsToCreate = [
      { title: "来院履歴", headers: visitHeaders, range: "A1:F1" },
      { title: "月次来院統計", headers: monthlySummaryHeaders, range: "A1:E1" },
    ];

    for (const sheetConfig of sheetsToCreate) {
      if (!existingSheets.includes(sheetConfig.title)) {
        console.log(`🆕 シート「${sheetConfig.title}」を作成中...`);
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetConfig.title,
                  },
                },
              },
            ],
          },
        });
        console.log(`✅ シート「${sheetConfig.title}」を作成しました`);
      }

      // ヘッダーを追加
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
        range: `${sheetConfig.title}!${sheetConfig.range}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [sheetConfig.headers],
        },
      });
      console.log(`✅ シート「${sheetConfig.title}」のヘッダーを初期化しました`);
    }

    console.log("🎉 All headers initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize headers:", error);
    process.exit(1);
  }
}

initializeHeaders();
