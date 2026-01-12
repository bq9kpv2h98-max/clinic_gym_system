/**
 * エアレジAPI連携サービス
 * 
 * 注意: 現在はモック実装です。実際のエアレジAPIが利用可能になった際に、
 * BASE_URLとエンドポイントを実際のものに差し替えてください。
 */

// 環境変数から認証情報を取得
const AIREG_API_KEY = process.env.AIREG_API_KEY || "";
const AIREG_API_TOKEN = process.env.AIREG_API_TOKEN || "";

// モックAPIのベースURL（実際のエアレジAPIのURLに差し替える）
const BASE_URL = "https://api.airregi.jp/v1"; // 仮のURL

/**
 * エアレジAPIのレスポンス型定義
 */
export interface AiregTransaction {
  transactionId: string;
  storeId: string;
  customerId?: string;
  customerPhone?: string;
  transactionDate: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  status: "completed" | "cancelled" | "refunded";
}

export interface AiregSalesResponse {
  success: boolean;
  data: {
    transactions: AiregTransaction[];
    totalCount: number;
    page: number;
    pageSize: number;
  };
}

/**
 * エアレジAPIクライアント
 */
class AiregApiClient {
  private apiKey: string;
  private apiToken: string;
  private baseUrl: string;

  constructor(apiKey: string, apiToken: string, baseUrl: string = BASE_URL) {
    this.apiKey = apiKey;
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
  }

  /**
   * 認証ヘッダーを生成
   */
  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-Api-Key": this.apiKey,
      "X-Api-Token": this.apiToken,
    };
  }

  /**
   * 売上データを取得
   * @param startDate 開始日（YYYY-MM-DD形式）
   * @param endDate 終了日（YYYY-MM-DD形式）
   * @param page ページ番号
   * @param pageSize ページサイズ
   */
  async getSalesData(
    startDate: string,
    endDate: string,
    page: number = 1,
    pageSize: number = 100
  ): Promise<AiregSalesResponse> {
    // モック実装: 実際のAPIが利用可能になったら、以下のコメントを解除してください
    /*
    try {
      const response = await fetch(
        `${this.baseUrl}/transactions?start_date=${startDate}&end_date=${endDate}&page=${page}&page_size=${pageSize}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching sales data from Aireg API:", error);
      throw error;
    }
    */

    // モックデータを返す
    return this.getMockSalesData(startDate, endDate, page, pageSize);
  }

  /**
   * モックデータ生成（開発・テスト用）
   */
  private getMockSalesData(
    startDate: string,
    endDate: string,
    page: number,
    pageSize: number
  ): AiregSalesResponse {
    // モックトランザクションデータを生成
    const mockTransactions: AiregTransaction[] = [
      {
        transactionId: "TXN-2024-001",
        storeId: "STORE-001",
        customerId: undefined,
        customerPhone: "09012345678",
        transactionDate: "2024-01-10T10:30:00Z",
        totalAmount: 8000,
        taxAmount: 800,
        paymentMethod: "cash",
        items: [
          {
            itemId: "ITEM-001",
            itemName: "整体施術（60分）",
            quantity: 1,
            unitPrice: 8000,
            totalPrice: 8000,
          },
        ],
        status: "completed",
      },
      {
        transactionId: "TXN-2024-002",
        storeId: "STORE-001",
        customerId: undefined,
        customerPhone: "08098765432",
        transactionDate: "2024-01-10T14:00:00Z",
        totalAmount: 12000,
        taxAmount: 1200,
        paymentMethod: "credit_card",
        items: [
          {
            itemId: "ITEM-002",
            itemName: "パーソナルトレーニング（90分）",
            quantity: 1,
            unitPrice: 12000,
            totalPrice: 12000,
          },
        ],
        status: "completed",
      },
      {
        transactionId: "TXN-2024-003",
        storeId: "STORE-001",
        customerId: undefined,
        customerPhone: "07011112222",
        transactionDate: "2024-01-11T11:00:00Z",
        totalAmount: 5000,
        taxAmount: 500,
        paymentMethod: "cash",
        items: [
          {
            itemId: "ITEM-003",
            itemName: "整体施術（30分）",
            quantity: 1,
            unitPrice: 5000,
            totalPrice: 5000,
          },
        ],
        status: "completed",
      },
    ];

    return {
      success: true,
      data: {
        transactions: mockTransactions,
        totalCount: mockTransactions.length,
        page,
        pageSize,
      },
    };
  }

  /**
   * 特定の取引の詳細を取得
   * @param transactionId 取引ID
   */
  async getTransactionDetail(transactionId: string): Promise<AiregTransaction | null> {
    // モック実装
    const mockData = this.getMockSalesData("2024-01-01", "2024-12-31", 1, 100);
    const transaction = mockData.data.transactions.find(
      (t) => t.transactionId === transactionId
    );
    return transaction || null;
  }
}

// シングルトンインスタンスをエクスポート
export const airegApiClient = new AiregApiClient(AIREG_API_KEY, AIREG_API_TOKEN);
