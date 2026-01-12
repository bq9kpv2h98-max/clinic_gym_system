import { mysqlTable, varchar, int, timestamp, text, float } from "drizzle-orm/mysql-core";

/**
 * 顧客離反予測結果テーブル
 */
export const churnPredictions = mysqlTable("churnPredictions", {
  id: int("id").autoincrement().primaryKey(),
  predictionId: varchar("predictionId", { length: 64 }).notNull().unique(), // UUID
  customerId: varchar("customerId", { length: 64 }).notNull(),
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  churnRiskScore: float("churnRiskScore").notNull(), // 0-100のスコア
  riskLevel: varchar("riskLevel", { length: 20 }).notNull(), // "low", "medium", "high", "critical"
  predictionReason: text("predictionReason").notNull(), // AI分析による理由
  recommendedActions: text("recommendedActions").notNull(), // 推奨アクション（JSON形式）
  lastVisitDaysAgo: int("lastVisitDaysAgo"), // 最終来院からの日数
  visitFrequency: float("visitFrequency"), // 来院頻度（回/月）
  pointBalance: int("pointBalance"), // ポイント残高
  totalSpent: int("totalSpent"), // 累計支出額
  predictedAt: timestamp("predictedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // 予測の有効期限（7日後など）
});

export type ChurnPrediction = typeof churnPredictions.$inferSelect;
export type InsertChurnPrediction = typeof churnPredictions.$inferInsert;
