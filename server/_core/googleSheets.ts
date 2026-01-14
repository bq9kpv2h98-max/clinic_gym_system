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
