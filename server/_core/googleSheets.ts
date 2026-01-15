/**
 * Google Sheets API連携ヘルパー
 * 
 * 予約情報とQRコード登録情報をGoogle Sheetsに自動保存します。
 */

import { google } from "googleapis";

// 環境変数から認証情報を取得
const GOOGLE_SHEETS_CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS;
const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

// Google Sheets APIクライアントを初期化
let sheetsClient: any = null;

async function getSheetsClient() {
  if (!GOOGLE_SHEETS_CREDENTIALS || !GOOGLE_SHEETS_SPREADSHEET_ID) {
    console.warn("Google Sheets credentials not configured. Skipping sheets sync.");
    return null;
  }

  if (sheetsClient) {
    return sheetsClient;
  }

  try {
    const credentials = JSON.parse(GOOGLE_SHEETS_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheetsClient = google.sheets({ version: "v4", auth });
    console.log("Google Sheets client initialized successfully");
    return sheetsClient;
  } catch (error) {
    console.error("Failed to initialize Google Sheets client:", error);
    return null;
  }
}

/**
 * スプレッドシートに行を追加する共通関数
 */
async function appendRowToSheet(sheetName: string, values: any[]) {
  try {
    const client = await getSheetsClient();
    if (!client) {
      console.warn("Google Sheets client not available. Skipping sync.");
      return false;
    }

    console.log(`Attempting to append row to sheet: ${sheetName}`);
    console.log(`Values:`, values);

    const response = await client.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [values],
      },
    });

    console.log(`Successfully appended row to sheet: ${sheetName}`, response.data);
    return true;
  } catch (error: any) {
    console.error(`Failed to append row to sheet ${sheetName}:`, error.message || error);
    if (error.response) {
      console.error(`API Error Response:`, error.response.data);
    }
    return false;
  }
}

/**
 * 予約情報をスプレッドシートに保存
 */
export async function saveReservationToSheets(data: {
  reservationId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  firstChoiceDate: Date;
  firstChoiceTimeSlot: string;
  secondChoiceDate?: Date | null;
  secondChoiceTimeSlot?: string | null;
  thirdChoiceDate?: Date | null;
  thirdChoiceTimeSlot?: string | null;
  notes?: string | null;
  createdAt: Date;
}) {
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const values = [
    new Date().toLocaleString("ja-JP"), // 登録日時
    data.reservationId,
    data.customerName,
    data.customerPhone,
    data.customerEmail,
    formatDate(data.firstChoiceDate),
    data.firstChoiceTimeSlot,
    formatDate(data.secondChoiceDate),
    data.secondChoiceTimeSlot || "",
    formatDate(data.thirdChoiceDate),
    data.thirdChoiceTimeSlot || "",
    data.notes || "",
  ];

  return await appendRowToSheet("予約情報", values);
}

/**
 * QRコード登録情報をスプレッドシートに保存
 */
export async function saveCustomerRegistrationToSheets(data: {
  customerId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  dateOfBirth: Date;
  gender: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
  addressLine2?: string | null;
  createdAt: Date;
}) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const genderMap: Record<string, string> = {
    male: "男性",
    female: "女性",
    other: "その他",
    prefer_not_to_say: "回答しない",
  };

  const values = [
    new Date().toLocaleString("ja-JP"), // 登録日時
    data.customerId,
    data.fullName,
    data.phone,
    data.email || "",
    formatDate(data.dateOfBirth),
    genderMap[data.gender] || data.gender,
    data.postalCode,
    data.prefecture,
    data.city,
    data.addressLine1,
    data.addressLine2 || "",
  ];

  return await appendRowToSheet("顧客登録情報", values);
}

/**
 * スプレッドシートのヘッダー行を初期化（初回のみ実行）
 */
export async function initializeSheetHeaders() {
  try {
    const client = await getSheetsClient();
    if (!client) {
      console.warn("Google Sheets client not available. Skipping header initialization.");
      return false;
    }

    // 予約情報シートのヘッダー
    const reservationHeaders = [
      "登録日時",
      "予約ID",
      "顧客名",
      "電話番号",
      "メールアドレス",
      "第1希望日",
      "第1希望時間帯",
      "第2希望日",
      "第2希望時間帯",
      "第3希望日",
      "第3希望時間帯",
      "症状・お悩み",
    ];

    // 顧客登録情報シートのヘッダー
    const customerHeaders = [
      "登録日時",
      "顧客ID",
      "氏名",
      "電話番号",
      "メールアドレス",
      "生年月日",
      "性別",
      "郵便番号",
      "都道府県",
      "市区町村",
      "住所1",
      "住所2",
    ];

    // ヘッダーを追加（既存のデータがある場合はスキップ）
    await client.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range: "予約情報!A1:L1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [reservationHeaders],
      },
    });

    await client.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range: "顧客登録情報!A1:L1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [customerHeaders],
      },
    });

    console.log("Successfully initialized sheet headers");
    return true;
  } catch (error) {
    console.error("Failed to initialize sheet headers:", error);
    return false;
  }
}

/**
 * 来院記録をスプレッドシートに保存
 */
export async function saveVisitToSheets(data: {
  visitId: string;
  customerId: string;
  customerName: string;
  visitDate: Date;
  pointsEarned: number;
  notes?: string | null;
}) {
  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const values = [
    formatDateTime(data.visitDate), // 来院日時
    data.visitId,
    data.customerId,
    data.customerName,
    data.pointsEarned,
    data.notes || "",
  ];

  return await appendRowToSheet("来院履歴", values);
}

/**
 * 月次サマリーをスプレッドシートに更新
 * 既存の行があれば更新、なければ新規追加
 */
export async function updateMonthlySummaryInSheets(data: {
  customerId: string;
  customerName: string;
  yearMonth: string; // "2026/01" 形式
  visitCount: number;
  lastVisitDate: Date;
}) {
  try {
    const client = await getSheetsClient();
    if (!client) {
      console.warn("Google Sheets client not available. Skipping monthly summary update.");
      return false;
    }

    const sheetName = "月次来院統計";
    
    // 既存データを取得
    const existingData = await client.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range: `${sheetName}!A:E`,
    });

    const rows = existingData.data.values || [];
    
    // ヘッダー行を除外
    const dataRows = rows.slice(1);
    
    // 既存の行を検索（年月 + 顧客IDで一致）
    const existingRowIndex = dataRows.findIndex(
      (row: any[]) => row[0] === data.yearMonth && row[1] === data.customerId
    );

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    };

    const newValues = [
      data.yearMonth,
      data.customerId,
      data.customerName,
      data.visitCount,
      formatDate(data.lastVisitDate),
    ];

    if (existingRowIndex >= 0) {
      // 既存行を更新
      const rowNumber = existingRowIndex + 2; // ヘッダー行 + 0-indexed
      await client.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
        range: `${sheetName}!A${rowNumber}:E${rowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [newValues],
        },
      });
      console.log(`Updated monthly summary for ${data.customerName} (${data.yearMonth})`);
    } else {
      // 新規行を追加
      await appendRowToSheet(sheetName, newValues);
      console.log(`Added new monthly summary for ${data.customerName} (${data.yearMonth})`);
    }

    return true;
  } catch (error: any) {
    console.error(`Failed to update monthly summary:`, error.message || error);
    if (error.response) {
      console.error(`API Error Response:`, error.response.data);
    }
    return false;
  }
}

/**
 * 来院履歴と月次統計のヘッダーを初期化
 */
export async function initializeVisitSheetHeaders() {
  try {
    const client = await getSheetsClient();
    if (!client) {
      console.warn("Google Sheets client not available. Skipping header initialization.");
      return false;
    }

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

    // ヘッダーを追加
    await client.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range: "来院履歴!A1:F1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [visitHeaders],
      },
    });

    await client.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range: "月次来院統計!A1:E1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [monthlySummaryHeaders],
      },
    });

    console.log("Successfully initialized visit sheet headers");
    return true;
  } catch (error) {
    console.error("Failed to initialize visit sheet headers:", error);
    return false;
  }
}


/**
 * 全データをGoogle Sheetsにバックアップする
 * 
 * @param data バックアップするデータ
 * @param sheetName バックアップ先のシート名
 * @returns 成功した場合はtrue、失敗した場合はfalse
 */
export async function backupDataToSheets(data: any[], sheetName: string): Promise<boolean> {
  try {
    const client = await getSheetsClient();
    if (!client) {
      console.warn("Google Sheets client not available. Skipping backup.");
      return false;
    }

    if (!data || data.length === 0) {
      console.log(`No data to backup for sheet: ${sheetName}`);
      return true;
    }

    // データをCSV形式に変換
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return "";
      if (value instanceof Date) return value.toISOString();
      return String(value);
    }));

    // シートをクリアしてから新しいデータを書き込む
    await client.spreadsheets.values.clear({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range: `${sheetName}!A1:ZZ`,
    });

    await client.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      resource: {
        values: [headers, ...rows],
      },
    });

    console.log(`Successfully backed up ${data.length} rows to ${sheetName}`);
    return true;
  } catch (error) {
    console.error(`Failed to backup data to ${sheetName}:`, error);
    return false;
  }
}

/**
 * 全データベースをGoogle Sheetsにバックアップする
 * 
 * @param db データベースインスタンス
 * @returns 成功した場合はtrue、失敗した場合はfalse
 */
export async function backupAllDataToSheets(db: any): Promise<boolean> {
  try {
    console.log("Starting full database backup to Google Sheets...");

    // 顧客データをバックアップ
    const customers = await db.select().from(db.schema.customers);
    await backupDataToSheets(customers, "バックアップ：顧客");

    // 売上データをバックアップ
    const sales = await db.select().from(db.schema.sales);
    await backupDataToSheets(sales, "バックアップ：売上");

    // 経費データをバックアップ
    const expenses = await db.select().from(db.schema.monthlyExpenses);
    await backupDataToSheets(expenses, "バックアップ：経費");

    // 予約データをバックアップ
    const reservations = await db.select().from(db.schema.reservations);
    await backupDataToSheets(reservations, "バックアップ：予約");

    console.log("Full database backup completed successfully");
    return true;
  } catch (error) {
    console.error("Failed to backup all data:", error);
    return false;
  }
}
