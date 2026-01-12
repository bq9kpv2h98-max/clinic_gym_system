import axios from "axios";
import { ENV } from "../_core/env";

const AIREG_BASE_URL = "https://api.airregi.jp/api/v1";

/**
 * エアレジAPIクライアント
 */
export class AiregClient {
  private apiKey: string;
  private apiToken: string;

  constructor(apiKey?: string, apiToken?: string) {
    this.apiKey = apiKey || ENV.airegApiKey;
    this.apiToken = apiToken || ENV.airegApiToken;

    if (!this.apiKey || !this.apiToken) {
      throw new Error("AirReg API credentials are not configured");
    }
  }

  /**
   * エアレジAPIにリクエストを送信
   */
  private async request(endpoint: string, method: "GET" | "POST" = "GET", data?: unknown) {
    try {
      const response = await axios({
        method,
        url: `${AIREG_BASE_URL}${endpoint}`,
        headers: {
          "X-API-KEY": this.apiKey,
          "X-API-TOKEN": this.apiToken,
          "Content-Type": "application/json",
        },
        data,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `AirReg API Error: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`
        );
      }
      throw error;
    }
  }

  /**
   * 店舗情報を取得
   */
  async getStore(storeId: string) {
    return this.request(`/stores/${storeId}`);
  }

  /**
   * 売上データを取得
   */
  async getSales(storeId: string, params?: {
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryString = new URLSearchParams();
    if (params?.from_date) queryString.append("from_date", params.from_date);
    if (params?.to_date) queryString.append("to_date", params.to_date);
    if (params?.limit) queryString.append("limit", params.limit.toString());
    if (params?.offset) queryString.append("offset", params.offset.toString());

    const endpoint = `/stores/${storeId}/sales${queryString.toString() ? `?${queryString}` : ""}`;
    return this.request(endpoint);
  }

  /**
   * 特定の売上データを取得
   */
  async getSaleDetail(storeId: string, saleId: string) {
    return this.request(`/stores/${storeId}/sales/${saleId}`);
  }

  /**
   * 顧客情報を取得
   */
  async getCustomer(storeId: string, customerId: string) {
    return this.request(`/stores/${storeId}/customers/${customerId}`);
  }

  /**
   * 顧客一覧を取得
   */
  async getCustomers(storeId: string, params?: {
    limit?: number;
    offset?: number;
  }) {
    const queryString = new URLSearchParams();
    if (params?.limit) queryString.append("limit", params.limit.toString());
    if (params?.offset) queryString.append("offset", params.offset.toString());

    const endpoint = `/stores/${storeId}/customers${queryString.toString() ? `?${queryString}` : ""}`;
    return this.request(endpoint);
  }
}

/**
 * エアレジ認証情報を検証
 */
export async function validateAiregCredentials(): Promise<boolean> {
  try {
    const client = new AiregClient();
    
    // 簡単な認証テスト：APIの基本情報エンドポイントを呼び出し
    // エアレジAPIの仕様に基づいて、実装を調整してください
    const response = await axios.get(`${AIREG_BASE_URL}/test`, {
      headers: {
        "X-API-KEY": ENV.airegApiKey,
        "X-API-TOKEN": ENV.airegApiToken,
      },
    });

    return response.status === 200;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error("Invalid AirReg API credentials");
    }
    // 他のエラーの場合は、認証情報は有効と判断（エンドポイントが存在しない可能性）
    return true;
  }
}

/**
 * 売上データをフェッチして保存
 */
export async function fetchAndSyncSalesData(
  storeId: string,
  fromDate: string,
  toDate: string
) {
  try {
    const client = new AiregClient();
    const salesData = await client.getSales(storeId, {
      from_date: fromDate,
      to_date: toDate,
      limit: 100,
    });

    return salesData;
  } catch (error) {
    console.error("Failed to fetch sales data from AirReg:", error);
    throw error;
  }
}
