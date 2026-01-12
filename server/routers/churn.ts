import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { 
  getCustomerChurnData, 
  saveChurnPrediction, 
  getLatestChurnPrediction,
  getChurnPredictionsByFacility,
  getHighRiskCustomers
} from "../db/churn";
import { invokeLLM } from "../_core/llm";
import { v4 as uuidv4 } from "uuid";

export const churnRouter = router({
  /**
   * 顧客の離反予測を実行
   */
  predictChurn: protectedProcedure
    .input(z.object({
      customerId: z.string(),
      facilityId: z.string(),
    }))
    .mutation(async ({ input }: { input: { customerId: string; facilityId: string } }) => {
      const { customerId, facilityId } = input;

      // 顧客データを収集
      const churnData = await getCustomerChurnData(customerId);
      if (!churnData) {
        throw new Error("Customer not found");
      }

      const { customer, visitHistory, salesHistory, pointHistory, stats } = churnData;

      // AI分析用のプロンプトを構築
      const prompt = `
あなたは整体院・パーソナルジムの顧客離反予測の専門家です。以下の顧客データを分析して、離反リスクを評価してください。

【顧客情報】
- 顧客ID: ${customer.customerId}
- 氏名: ${customer.fullName}
- 登録日: ${customer.createdAt}

【来院状況】
- 最終来院日からの経過日数: ${stats.lastVisitDaysAgo !== null ? stats.lastVisitDaysAgo + '日' : '来院履歴なし'}
- 来院頻度（過去3ヶ月平均）: ${stats.visitFrequency.toFixed(2)}回/月
- 来院履歴件数: ${visitHistory.length}件

【売上状況】
- 累計支出額: ${stats.totalSpent.toLocaleString()}円
- 売上履歴件数: ${salesHistory.length}件

【ポイント状況】
- 現在のポイント残高: ${stats.pointBalance}ポイント
- ポイント取引履歴件数: ${pointHistory.length}件

【分析タスク】
1. 離反リスクスコアを0-100の数値で算出してください（100が最も高リスク）
2. リスクレベルを以下から選択してください: "low" (0-30), "medium" (31-60), "high" (61-85), "critical" (86-100)
3. 離反リスクの理由を簡潔に説明してください（200文字以内）
4. 離反を防ぐための推奨アクションを3つ提案してください

【出力形式】
以下のJSON形式で出力してください:
{
  "churnRiskScore": <数値>,
  "riskLevel": "<low|medium|high|critical>",
  "predictionReason": "<理由>",
  "recommendedActions": [
    "<アクション1>",
    "<アクション2>",
    "<アクション3>"
  ]
}
`;

      // LLMを呼び出して分析
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a customer churn prediction expert for clinics and gyms." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "churn_prediction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                churnRiskScore: { type: "number", description: "Churn risk score (0-100)" },
                riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Risk level" },
                predictionReason: { type: "string", description: "Reason for the prediction" },
                recommendedActions: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Recommended actions to prevent churn"
                },
              },
              required: ["churnRiskScore", "riskLevel", "predictionReason", "recommendedActions"],
              additionalProperties: false,
            },
          },
        },
      });

      const messageContent = response.choices[0].message.content;
      const contentText = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
      const analysis = JSON.parse(contentText || "{}");

      // 予測結果を保存
      const predictionId = uuidv4();
      await saveChurnPrediction({
        predictionId,
        customerId,
        facilityId,
        churnRiskScore: analysis.churnRiskScore,
        riskLevel: analysis.riskLevel,
        predictionReason: analysis.predictionReason,
        recommendedActions: JSON.stringify(analysis.recommendedActions),
        lastVisitDaysAgo: stats.lastVisitDaysAgo,
        visitFrequency: stats.visitFrequency,
        pointBalance: stats.pointBalance,
        totalSpent: stats.totalSpent,
      });

      return {
        predictionId,
        customerId,
        churnRiskScore: analysis.churnRiskScore,
        riskLevel: analysis.riskLevel,
        predictionReason: analysis.predictionReason,
        recommendedActions: analysis.recommendedActions,
        stats,
      };
    }),

  /**
   * 顧客の最新の離反予測を取得
   */
  getLatestPrediction: protectedProcedure
    .input(z.object({
      customerId: z.string(),
    }))
    .query(async ({ input }: { input: { customerId: string } }) => {
      const prediction = await getLatestChurnPrediction(input.customerId);
      if (!prediction) {
        return null;
      }

      return {
        ...prediction,
        recommendedActions: JSON.parse(prediction.recommendedActions),
      };
    }),

  /**
   * 施設の全顧客の離反予測を取得
   */
  getAllPredictions: protectedProcedure
    .input(z.object({
      facilityId: z.string(),
    }))
    .query(async ({ input }: { input: { facilityId: string } }) => {
      const predictions = await getChurnPredictionsByFacility(input.facilityId);
      
      return predictions.map(p => ({
        ...p,
        recommendedActions: JSON.parse(p.recommendedActions),
      }));
    }),

  /**
   * 高リスク顧客を取得
   */
  getHighRiskCustomers: protectedProcedure
    .input(z.object({
      facilityId: z.string(),
      minRiskScore: z.number().optional(),
    }))
    .query(async ({ input }: { input: { facilityId: string; minRiskScore?: number } }) => {
      const predictions = await getHighRiskCustomers(input.facilityId, input.minRiskScore);
      
      return predictions.map(p => ({
        ...p,
        recommendedActions: JSON.parse(p.recommendedActions),
      }));
    }),
});
