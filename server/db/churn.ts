import { eq, and, sql, desc } from "drizzle-orm";
import { getDb } from "../db";
import { customers, visits, sales, pointTransactions, churnPredictions } from "../../drizzle/schema";

/**
 * 顧客の離反予測に必要なデータを収集
 */
export async function getCustomerChurnData(customerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  // 顧客基本情報
  const customer = await db.select().from(customers).where(eq(customers.customerId, customerId)).limit(1);
  if (!customer || customer.length === 0) {
    return null;
  }

  // 来院履歴
  const visitHistory = await db
    .select()
    .from(visits)
    .where(eq(visits.customerId, customerId))
    .orderBy(desc(visits.visitDate))
    .limit(10);

  // 売上履歴
  const salesHistory = await db
    .select()
    .from(sales)
    .where(eq(sales.customerId, customerId))
    .orderBy(desc(sales.saleDate))
    .limit(10);

  // ポイント取引履歴
  const pointHistory = await db
    .select()
    .from(pointTransactions)
    .where(eq(pointTransactions.customerId, customerId))
    .orderBy(desc(pointTransactions.transactionDate))
    .limit(10);

  // 統計情報計算
  const now = new Date();
  const lastVisit = visitHistory.length > 0 ? visitHistory[0].visitDate : null;
  const lastVisitDaysAgo = lastVisit ? Math.floor((now.getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24)) : null;

  // 来院頻度（過去3ヶ月の平均）
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const recentVisits = visitHistory.filter(v => new Date(v.visitDate) >= threeMonthsAgo);
  const visitFrequency = recentVisits.length > 0 ? (recentVisits.length / 3) : 0; // 回/月

  // 累計支出額
  const totalSpent = salesHistory.reduce((sum, sale) => sum + (sale.amount || 0), 0);

  // ポイント残高
  const pointBalance = customer[0].totalPoints || 0;

  return {
    customer: customer[0],
    visitHistory,
    salesHistory,
    pointHistory,
    stats: {
      lastVisitDaysAgo,
      visitFrequency,
      totalSpent,
      pointBalance,
    },
  };
}

/**
 * 離反予測結果を保存
 */
export async function saveChurnPrediction(prediction: {
  predictionId: string;
  customerId: string;
  facilityId: string;
  churnRiskScore: number;
  riskLevel: string;
  predictionReason: string;
  recommendedActions: string;
  lastVisitDaysAgo: number | null;
  visitFrequency: number;
  pointBalance: number;
  totalSpent: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  // 有効期限を7日後に設定
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(churnPredictions).values({
    ...prediction,
    expiresAt,
  });
}

/**
 * 顧客の最新の離反予測を取得
 */
export async function getLatestChurnPrediction(customerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const predictions = await db
    .select()
    .from(churnPredictions)
    .where(eq(churnPredictions.customerId, customerId))
    .orderBy(desc(churnPredictions.predictedAt))
    .limit(1);

  return predictions.length > 0 ? predictions[0] : null;
}

/**
 * 施設の全顧客の離反予測を取得
 */
export async function getChurnPredictionsByFacility(facilityId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const predictions = await db
    .select()
    .from(churnPredictions)
    .where(eq(churnPredictions.facilityId, facilityId))
    .orderBy(desc(churnPredictions.churnRiskScore));

  return predictions;
}

/**
 * 高リスク顧客を取得
 */
export async function getHighRiskCustomers(facilityId: string, minRiskScore: number = 70) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const predictions = await db
    .select()
    .from(churnPredictions)
    .where(
      and(
        eq(churnPredictions.facilityId, facilityId),
        sql`${churnPredictions.churnRiskScore} >= ${minRiskScore}`
      )
    )
    .orderBy(desc(churnPredictions.churnRiskScore));

  return predictions;
}
