import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import * as churnDb from "../db/churn";
import * as llm from "../_core/llm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("顧客離反予測API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("顧客の離反リスクを予測できる", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    // モックデータ
    const mockCustomerData = {
      customer: {
        customerId: "test-customer-id",
        name: "テスト顧客",
        phone: "090-1234-5678",
        totalPoints: 100,
        registrationDate: new Date("2024-01-01"),
      },
      visitHistory: [
        {
          visitDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          pointsEarned: 10,
        },
        {
          visitDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          pointsEarned: 10,
        },
      ],
      salesHistory: [
        {
          saleDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          totalAmount: 5000,
        },
      ],
      pointTransactions: [
        {
          transactionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          pointsUsed: 10,
        },
      ],
      pointHistory: [
        {
          transactionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          pointsUsed: 10,
        },
      ],
      stats: {
        lastVisitDaysAgo: 7,
        visitFrequency: 2.5,
        avgSpendPerVisit: 5000,
        pointUsageRate: 0.1,
        customerLifetimeDays: 365,
        totalSpent: 50000,
        pointBalance: 100,
      },
    };

    const mockLLMResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              churnRiskScore: 45,
              riskLevel: "medium",
              predictionReason: ["来院頻度が低下傾向", "ポイント利用が少ない"],
              recommendedActions: ["特別キャンペーンの案内", "フォローアップ連絡"],
            }),
          },
        },
      ],
    };

    // モック設定
    vi.spyOn(churnDb, "getCustomerChurnData").mockResolvedValue(mockCustomerData as any);
    vi.spyOn(llm, "invokeLLM").mockResolvedValue(mockLLMResponse as any);
    vi.spyOn(churnDb, "saveChurnPrediction").mockResolvedValue(undefined);

    const result = await caller.churn.predictChurn({
      customerId: "test-customer-id",
      facilityId: "test-facility-id",
    });

    expect(result).toBeDefined();
    expect(result.predictionId).toBeDefined();
    expect(result.churnRiskScore).toBe(45);
    expect(result.riskLevel).toBe("medium");
    expect(result.predictionReason).toEqual(["来院頻度が低下傾向", "ポイント利用が少ない"]);
    expect(result.recommendedActions).toEqual(["特別キャンペーンの案内", "フォローアップ連絡"]);
  });

  it("最新の予測結果を取得できる", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const mockPrediction = {
      predictionId: "test-prediction-id",
      customerId: "test-customer-id",
      facilityId: "test-facility-id",
      riskScore: 65,
      riskLevel: "high" as const,
        reasons: ["30日以上来院なし"],
        recommendedActions: JSON.stringify(["緊急フォローアップ"]),
      predictedAt: new Date(),
    };

    vi.spyOn(churnDb, "getLatestChurnPrediction").mockResolvedValue(mockPrediction);

    const result = await caller.churn.getLatestPrediction({
      customerId: "test-customer-id",
    });

    expect(result).toBeDefined();
    expect(result?.customerId).toBe("test-customer-id");
    expect(result?.riskScore).toBe(65);
    expect(result?.riskLevel).toBe("high");
  });

  it("施設の全予測結果を取得できる", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const mockPredictions = [
      {
        predictionId: "pred-1",
        customerId: "customer-1",
        facilityId: "test-facility-id",
        riskScore: 75,
        riskLevel: "high" as const,
        reasons: ["来院なし"],
        recommendedActions: JSON.stringify(["連絡する"]),
        predictedAt: new Date(),
        customer: {
          customerId: "customer-1",
          name: "顧客1",
          phone: "090-1111-1111",
          email: "customer1@example.com",
        },
      },
      {
        predictionId: "pred-2",
        customerId: "customer-2",
        facilityId: "test-facility-id",
        riskScore: 35,
        riskLevel: "low" as const,
        reasons: ["定期来院"],
        recommendedActions: JSON.stringify(["現状維持"]),
        predictedAt: new Date(),
        customer: {
          customerId: "customer-2",
          name: "顧客2",
          phone: "090-2222-2222",
          email: "customer2@example.com",
        },
      },
    ];

    vi.spyOn(churnDb, "getChurnPredictionsByFacility").mockResolvedValue(mockPredictions as any);

    const result = await caller.churn.getAllPredictions({
      facilityId: "test-facility-id",
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].customerId).toBe("customer-1");
    expect(result[0].customer.name).toBe("顧客1");
  });

  it("高リスク顧客を取得できる", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const mockHighRiskCustomers = [
      {
        predictionId: "pred-1",
        customerId: "customer-1",
        facilityId: "test-facility-id",
        riskScore: 85,
        riskLevel: "critical" as const,
        reasons: ["60日以上来院なし"],
        recommendedActions: JSON.stringify(["緊急対応"]),
        predictedAt: new Date(),
        customer: {
          customerId: "customer-1",
          name: "高リスク顧客",
          phone: "090-9999-9999",
          email: "highrisk@example.com",
        },
      },
    ];

    vi.spyOn(churnDb, "getHighRiskCustomers").mockResolvedValue(mockHighRiskCustomers as any);

    const result = await caller.churn.getHighRiskCustomers({
      facilityId: "test-facility-id",
      minRiskScore: 70,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].riskScore).toBeGreaterThanOrEqual(70);
    expect(result[0].riskLevel).toBe("critical");
  });

  it("リスクレベルが正しく分類される", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const testCases = [
      { score: 25, expectedLevel: "low" },
      { score: 45, expectedLevel: "medium" },
      { score: 70, expectedLevel: "high" },
      { score: 90, expectedLevel: "critical" },
    ];

    for (const testCase of testCases) {
      const mockCustomerData = {
        customer: {
          customerId: "test-customer-id",
          name: "テスト顧客",
          phone: "090-1234-5678",
          totalPoints: 100,
          registrationDate: new Date("2024-01-01"),
        },
        visitHistory: [],
        salesHistory: [],
        pointTransactions: [],
        pointHistory: [],
        stats: {
          lastVisitDaysAgo: 30,
          visitFrequency: 1.0,
          avgSpendPerVisit: 5000,
          pointUsageRate: 0.1,
          customerLifetimeDays: 365,
          totalSpent: 50000,
          pointBalance: 100,
        },
      };

      const mockLLMResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                churnRiskScore: testCase.score,
                riskLevel: testCase.expectedLevel,
                predictionReason: ["テスト理由"],
                recommendedActions: ["テストアクション"],
              }),
            },
          },
        ],
      };

      vi.spyOn(churnDb, "getCustomerChurnData").mockResolvedValue(mockCustomerData as any);
      vi.spyOn(llm, "invokeLLM").mockResolvedValue(mockLLMResponse as any);
      vi.spyOn(churnDb, "saveChurnPrediction").mockResolvedValue(undefined);

      const result = await caller.churn.predictChurn({
        customerId: "test-customer-id",
        facilityId: "test-facility-id",
      });

      expect(result.churnRiskScore).toBe(testCase.score);
      expect(result.riskLevel).toBe(testCase.expectedLevel);
    }
  });

  it("存在しない顧客の予測でエラーになる", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    vi.spyOn(churnDb, "getCustomerChurnData").mockRejectedValue(
      new Error("Customer not found")
    );

    await expect(
      caller.churn.predictChurn({
        customerId: "non-existent-customer",
        facilityId: "test-facility-id",
      })
    ).rejects.toThrow();
  });

  it("LLMレスポンスのパースエラーを処理できる", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const mockCustomerData = {
      customer: {
        customerId: "test-customer-id",
        name: "テスト顧客",
        phone: "090-1234-5678",
        totalPoints: 100,
        registrationDate: new Date("2024-01-01"),
      },
      visitHistory: [],
      salesHistory: [],
      pointTransactions: [],
    };

    const mockLLMResponse = {
      choices: [
        {
          message: {
            content: "invalid json",
          },
        },
      ],
    };

    vi.spyOn(churnDb, "getCustomerChurnData").mockResolvedValue(mockCustomerData as any);
    vi.spyOn(llm, "invokeLLM").mockResolvedValue(mockLLMResponse as any);

    await expect(
      caller.churn.predictChurn({
        customerId: "test-customer-id",
        facilityId: "test-facility-id",
      })
    ).rejects.toThrow();
  });

  it("予測結果に顧客情報が含まれる", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const mockPredictions = [
      {
        predictionId: "pred-1",
        customerId: "customer-1",
        facilityId: "test-facility-id",
        riskScore: 50,
        riskLevel: "medium" as const,
        reasons: ["テスト"],
        recommendedActions: JSON.stringify(["テスト"]),
        predictedAt: new Date(),
        customer: {
          customerId: "customer-1",
          name: "テスト顧客",
          phone: "090-1234-5678",
          email: "test@example.com",
        },
      },
    ];

    vi.spyOn(churnDb, "getChurnPredictionsByFacility").mockResolvedValue(mockPredictions as any);

    const result = await caller.churn.getAllPredictions({
      facilityId: "test-facility-id",
    });

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].customer).toBeDefined();
    expect(result[0].customer.name).toBe("テスト顧客");
    expect(result[0].customer.phone).toBe("090-1234-5678");
  });
});
