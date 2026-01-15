import { int, mysqlEnum, mysqlTable, timestamp, varchar, decimal, date, tinyint, float, text } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 100 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 顧客マスタテーブル
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  customerId: varchar("customerId", { length: 64 }).notNull().unique(), // UUID
  fullName: varchar("fullName", { length: 100 }).notNull(),
  dateOfBirth: date("dateOfBirth").notNull(),
  gender: mysqlEnum("gender", ["male", "female", "other", "prefer_not_to_say"]).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  postalCode: varchar("postalCode", { length: 10 }).notNull(),
  prefecture: varchar("prefecture", { length: 50 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  addressLine1: varchar("addressLine1", { length: 200 }).notNull(),
  addressLine2: varchar("addressLine2", { length: 200 }),
  qrCodeData: varchar("qrCodeData", { length: 512 }).notNull().unique(),
  qrCodeImageUrl: varchar("qrCodeImageUrl", { length: 512 }),
  totalPoints: int("totalPoints").default(0).notNull(),
  lifetimePoints: int("lifetimePoints").default(0).notNull(),
  lastPointActivityDate: timestamp("lastPointActivityDate"),
  pointExpirationDate: date("pointExpirationDate"),
  visitCount: int("visitCount").default(0).notNull(),
  lastVisitDate: timestamp("lastVisitDate"),
  totalSpent: decimal("totalSpent", { precision: 12, scale: 2 }).default("0"),
  customFields: varchar("customFields", { length: 1000 }),
  isActive: int("isActive").default(1).notNull(),
  registrationDate: timestamp("registrationDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * 来院履歴テーブル
 */
export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  visitId: varchar("visitId", { length: 64 }).notNull().unique(),
  customerId: varchar("customerId", { length: 64 }).notNull(),
  visitDate: timestamp("visitDate").defaultNow().notNull(),
  staffId: varchar("staffId", { length: 64 }),
  visitType: varchar("visitType", { length: 50 }),
  pointsEarned: int("pointsEarned").default(0),
  notes: varchar("notes", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

/**
 * ポイント取引履歴テーブル
 */
export const pointTransactions = mysqlTable("pointTransactions", {
  id: int("id").autoincrement().primaryKey(),
  transactionId: varchar("transactionId", { length: 64 }).notNull().unique(),
  customerId: varchar("customerId", { length: 64 }).notNull(),
  transactionType: mysqlEnum("transactionType", ["earn", "redeem", "expire", "adjust", "bonus", "rollback"]).notNull(),
  points: int("points").notNull(),
  balanceAfter: int("balanceAfter").notNull(),
  description: varchar("description", { length: 500 }),
  staffId: varchar("staffId", { length: 64 }),
  staffName: varchar("staffName", { length: 100 }),
  adjustmentReason: varchar("adjustmentReason", { length: 500 }),
  extendedExpirationTo: date("extendedExpirationTo"),
  transactionDate: timestamp("transactionDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = typeof pointTransactions.$inferInsert;

/**
 * スタッフマスタテーブル
 */
export const staff = mysqlTable("staff", {
  id: int("id").autoincrement().primaryKey(),
  staffId: varchar("staffId", { length: 64 }).notNull().unique(),
  staffCode: varchar("staffCode", { length: 50 }),
  fullName: varchar("fullName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["admin", "manager", "staff"]).default("staff").notNull(),
  permissions: varchar("permissions", { length: 1000 }),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = typeof staff.$inferInsert;


/**
 * 顧客セグメント定義テーブル
 */
export const customerSegments = mysqlTable("customerSegments", {
  id: int("id").autoincrement().primaryKey(),
  segmentId: varchar("segmentId", { length: 64 }).notNull().unique(),
  segmentName: varchar("segmentName", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  segmentType: mysqlEnum("segmentType", [
    "birthday",
    "visit_frequency",
    "points_balance",
    "region",
    "lifetime_value",
    "custom",
  ]).notNull(),
  criteria: varchar("criteria", { length: 1000 }).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomerSegment = typeof customerSegments.$inferSelect;
export type InsertCustomerSegment = typeof customerSegments.$inferInsert;

/**
 * メッセージテンプレートテーブル
 */
export const messageTemplates = mysqlTable("messageTemplates", {
  id: int("id").autoincrement().primaryKey(),
  templateId: varchar("templateId", { length: 64 }).notNull().unique(),
  templateName: varchar("templateName", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  messageType: mysqlEnum("messageType", ["push", "sms", "email"]).notNull(),
  subject: varchar("subject", { length: 200 }),
  content: varchar("content", { length: 2000 }).notNull(),
  variables: varchar("variables", { length: 500 }),
  isActive: int("isActive").default(1).notNull(),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = typeof messageTemplates.$inferInsert;

/**
 * メッセージキャンペーンテーブル
 */
export const messageCampaigns = mysqlTable("messageCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: varchar("campaignId", { length: 64 }).notNull().unique(),
  campaignName: varchar("campaignName", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  segmentId: varchar("segmentId", { length: 64 }).notNull(),
  templateId: varchar("templateId", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["draft", "scheduled", "sent", "failed", "cancelled"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  sentAt: timestamp("sentAt"),
  totalRecipients: int("totalRecipients").default(0),
  sentCount: int("sentCount").default(0),
  failedCount: int("failedCount").default(0),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MessageCampaign = typeof messageCampaigns.$inferSelect;
export type InsertMessageCampaign = typeof messageCampaigns.$inferInsert;

/**
 * メッセージ送信履歴テーブル
 */
export const messageLogs = mysqlTable("messageLogs", {
  id: int("id").autoincrement().primaryKey(),
  logId: varchar("logId", { length: 64 }).notNull().unique(),
  campaignId: varchar("campaignId", { length: 64 }).notNull(),
  customerId: varchar("customerId", { length: 64 }).notNull(),
  messageType: mysqlEnum("messageType", ["push", "sms", "email"]).notNull(),
  status: mysqlEnum("status", ["sent", "failed", "bounced", "opened", "clicked"]).notNull(),
  content: varchar("content", { length: 2000 }),
  errorMessage: varchar("errorMessage", { length: 500 }),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  openedAt: timestamp("openedAt"),
  clickedAt: timestamp("clickedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MessageLog = typeof messageLogs.$inferSelect;
export type InsertMessageLog = typeof messageLogs.$inferInsert;


/**
 * ファミリーグループテーブル
 */
export const familyGroups = mysqlTable("familyGroups", {
  id: int("id").autoincrement().primaryKey(),
  groupId: varchar("groupId", { length: 64 }).notNull().unique(),
  groupName: varchar("groupName", { length: 100 }).notNull(),
  parentCustomerId: varchar("parentCustomerId", { length: 64 }).notNull(),
  totalFamilyPoints: int("totalFamilyPoints").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FamilyGroup = typeof familyGroups.$inferSelect;
export type InsertFamilyGroup = typeof familyGroups.$inferInsert;

/**
 * ファミリーメンバーテーブル
 */
export const familyMembers = mysqlTable("familyMembers", {
  id: int("id").autoincrement().primaryKey(),
  memberId: varchar("memberId", { length: 64 }).notNull().unique(),
  groupId: varchar("groupId", { length: 64 }).notNull(),
  customerId: varchar("customerId", { length: 64 }).notNull(),
  relationshipType: mysqlEnum("relationshipType", ["parent", "child", "spouse", "other"]).notNull(),
  isPointShared: int("isPointShared").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertFamilyMember = typeof familyMembers.$inferInsert;


/**
 * 施設テーブル（マルチ施設対応）
 */
export const facilities = mysqlTable("facilities", {
  id: int("id").autoincrement().primaryKey(),
  facilityId: varchar("facilityId", { length: 64 }).notNull().unique(),
  facilityName: varchar("facilityName", { length: 100 }).notNull(),
  facilityType: mysqlEnum("facilityType", ["clinic", "gym", "wellness", "other"]).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  postalCode: varchar("postalCode", { length: 10 }),
  prefecture: varchar("prefecture", { length: 50 }),
  city: varchar("city", { length: 100 }),
  addressLine1: varchar("addressLine1", { length: 200 }),
  addressLine2: varchar("addressLine2", { length: 200 }),
  airRegId: varchar("airRegId", { length: 100 }), // エアレジ店舗ID
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = typeof facilities.$inferInsert;

/**
 * ユーザー・施設間の結合テーブル（権限管理用）
 */
export const userFacilityRoles = mysqlTable("userFacilityRoles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  role: mysqlEnum("role", ["owner", "manager", "staff", "viewer"]).default("staff").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserFacilityRole = typeof userFacilityRoles.$inferSelect;
export type InsertUserFacilityRole = typeof userFacilityRoles.$inferInsert;

/**
 * 売上テーブル（エアレジから取得）
 */
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  saleId: varchar("saleId", { length: 64 }).notNull().unique(),
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  customerId: varchar("customerId", { length: 64 }), // 顧客が特定できない場合はNULL
  transactionId: varchar("transactionId", { length: 100 }).notNull(), // エアレジのトランザクションID
  amount: int("amount").notNull(), // 売上金額（円）
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "credit_card", "qr_code", "other"]).notNull(),
  itemCount: int("itemCount").default(0).notNull(),
  taxAmount: int("taxAmount").default(0).notNull(),
  discountAmount: int("discountAmount").default(0).notNull(),
  notes: varchar("notes", { length: 500 }),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(), // エアレジから同期された時刻
  saleDate: date("saleDate").notNull(), // 売上日
  saleTime: varchar("saleTime", { length: 10 }), // 売上時刻（HH:MM:SS）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

/**
 * 売上集計テーブル（日次集計用）
 */
export const dailySalesAggregation = mysqlTable("dailySalesAggregation", {
  id: int("id").autoincrement().primaryKey(),
  aggregationId: varchar("aggregationId", { length: 64 }).notNull().unique(),
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  saleDate: date("saleDate").notNull(),
  totalSales: int("totalSales").default(0).notNull(), // 合計売上
  totalTransactions: int("totalTransactions").default(0).notNull(), // 取引件数
  totalCustomers: int("totalCustomers").default(0).notNull(), // 顧客数
  averageTransactionAmount: int("averageTransactionAmount").default(0).notNull(), // 平均取引額
  totalTax: int("totalTax").default(0).notNull(), // 合計税額
  totalDiscount: int("totalDiscount").default(0).notNull(), // 合計割引額
  paymentMethodBreakdown: varchar("paymentMethodBreakdown", { length: 1000 }), // JSON形式の支払い方法別集計
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailySalesAggregation = typeof dailySalesAggregation.$inferSelect;
export type InsertDailySalesAggregation = typeof dailySalesAggregation.$inferInsert;

/**
 * エアレジ同期ログテーブル
 */
export const airRegSyncLogs = mysqlTable("airRegSyncLogs", {
  id: int("id").autoincrement().primaryKey(),
  syncId: varchar("syncId", { length: 64 }).notNull().unique(),
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  syncType: mysqlEnum("syncType", ["full", "incremental"]).notNull(),
  status: mysqlEnum("status", ["success", "failed", "pending"]).default("pending").notNull(),
  recordsProcessed: int("recordsProcessed").default(0).notNull(),
  recordsSucceeded: int("recordsSucceeded").default(0).notNull(),
  recordsFailed: int("recordsFailed").default(0).notNull(),
  errorMessage: varchar("errorMessage", { length: 1000 }),
  syncStartTime: timestamp("syncStartTime").notNull(),
  syncEndTime: timestamp("syncEndTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AirRegSyncLog = typeof airRegSyncLogs.$inferSelect;
export type InsertAirRegSyncLog = typeof airRegSyncLogs.$inferInsert;


/**
 * 広告チャネルテーブル
 */
export const advertisingChannels = mysqlTable("advertisingChannels", {
  id: int("id").autoincrement().primaryKey(),
  channelId: varchar("channelId", { length: 64 }).notNull().unique(),
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  channelName: varchar("channelName", { length: 100 }).notNull(), // Google広告、Facebook、チラシなど
  channelType: mysqlEnum("channelType", ["google_ads", "facebook", "instagram", "flyer", "word_of_mouth", "other"]).notNull(),
  description: varchar("description", { length: 500 }),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdvertisingChannel = typeof advertisingChannels.$inferSelect;
export type InsertAdvertisingChannel = typeof advertisingChannels.$inferInsert;

/**
 * 広告費テーブル
 */
export const advertisingExpenses = mysqlTable("advertisingExpenses", {
  id: int("id").autoincrement().primaryKey(),
  expenseId: varchar("expenseId", { length: 64 }).notNull().unique(),
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  channelId: varchar("channelId", { length: 64 }).notNull(),
  expenseDate: date("expenseDate").notNull(), // 広告費の日付
  amount: int("amount").notNull(), // 広告費（円）
  budget: int("budget"), // 予算（円）
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdvertisingExpense = typeof advertisingExpenses.$inferSelect;
export type InsertAdvertisingExpense = typeof advertisingExpenses.$inferInsert;

/**
 * 顧客獲得チャネルテーブル
 */
export const customerAcquisitionChannels = mysqlTable("customerAcquisitionChannels", {
  id: int("id").autoincrement().primaryKey(),
  acquisitionId: varchar("acquisitionId", { length: 64 }).notNull().unique(),
  customerId: varchar("customerId", { length: 64 }).notNull(),
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  channelId: varchar("channelId", { length: 64 }).notNull(),
  acquisitionDate: timestamp("acquisitionDate").defaultNow().notNull(), // 顧客獲得日時
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomerAcquisitionChannel = typeof customerAcquisitionChannels.$inferSelect;
export type InsertCustomerAcquisitionChannel = typeof customerAcquisitionChannels.$inferInsert;

/**
 * 広告効果分析テーブル（キャッシュ用）
 */
export const advertisingMetrics = mysqlTable("advertisingMetrics", {
  id: int("id").autoincrement().primaryKey(),
  metricsId: varchar("metricsId", { length: 64 }).notNull().unique(),
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  channelId: varchar("channelId", { length: 64 }).notNull(),
  metricsDate: date("metricsDate").notNull(),
  totalExpense: int("totalExpense").default(0).notNull(), // 広告費合計
  newCustomers: int("newCustomers").default(0).notNull(), // 新規顧客数
  cpa: int("cpa").default(0).notNull(), // CPA（顧客獲得単価）
  totalRevenue: int("totalRevenue").default(0).notNull(), // 売上合計
  roas: int("roas").default(0).notNull(), // ROAS（広告費用対効果）
  ltv: int("ltv").default(0).notNull(), // LTV（顧客生涯価値）
  ltvCacRatio: int("ltvCacRatio").default(0).notNull(), // LTV/CAC比率
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdvertisingMetrics = typeof advertisingMetrics.$inferSelect;
export type InsertAdvertisingMetrics = typeof advertisingMetrics.$inferInsert;


/**
 * QRコード管理テーブル（セルフレジストレーション用）
 */
export const registrationQrCodes = mysqlTable("registrationQrCodes", {
  id: int("id").autoincrement().primaryKey(),
  qrCodeId: varchar("qrCodeId", { length: 64 }).notNull().unique(), // UUID
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  facilityName: varchar("facilityName", { length: 100 }).notNull(),
  qrCodeData: varchar("qrCodeData", { length: 512 }).notNull(), // QRコード内容
  qrCodeImageUrl: varchar("qrCodeImageUrl", { length: 512 }), // QRコード画像URL
  registrationUrl: varchar("registrationUrl", { length: 512 }).notNull(), // 登録フォームURL
  isActive: tinyint("isActive").default(1).notNull(), // 有効/無効
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  expiresAt: timestamp("expiresAt"), // 有効期限
});

export type RegistrationQrCode = typeof registrationQrCodes.$inferSelect;
export type InsertRegistrationQrCode = typeof registrationQrCodes.$inferInsert;

/**
 * セルフレジストレーション履歴テーブル
 */
export const registrationAttempts = mysqlTable("registrationAttempts", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: varchar("attemptId", { length: 64 }).notNull().unique(), // UUID
  qrCodeId: varchar("qrCodeId", { length: 64 }).notNull(),
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  customerId: varchar("customerId", { length: 64 }), // 登録完了時のみ設定
  status: mysqlEnum("status", ["initiated", "in_progress", "completed", "abandoned"]).default("initiated").notNull(),
  sessionToken: varchar("sessionToken", { length: 256 }).notNull(), // セッション管理用
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  abandonedAt: timestamp("abandonedAt"),
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4/IPv6対応
  userAgent: varchar("userAgent", { length: 512 }),
});

export type RegistrationAttempt = typeof registrationAttempts.$inferSelect;
export type InsertRegistrationAttempt = typeof registrationAttempts.$inferInsert;

/**
 * 顧客離反予測結果テーブル
 */
export const churnPredictions = mysqlTable("churnPredictions", {
  id: int("id").autoincrement().primaryKey(),
  predictionId: varchar("predictionId", { length: 64 }).notNull().unique(),
  customerId: varchar("customerId", { length: 64 }).notNull(),
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  churnRiskScore: float("churnRiskScore").notNull(),
  riskLevel: varchar("riskLevel", { length: 20 }).notNull(),
  predictionReason: text("predictionReason").notNull(),
  recommendedActions: text("recommendedActions").notNull(),
  lastVisitDaysAgo: int("lastVisitDaysAgo"),
  visitFrequency: float("visitFrequency"),
  pointBalance: int("pointBalance"),
  totalSpent: int("totalSpent"),
  predictedAt: timestamp("predictedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type ChurnPrediction = typeof churnPredictions.$inferSelect;
export type InsertChurnPrediction = typeof churnPredictions.$inferInsert;

/**
 * 予約テーブル
 */
export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  reservationId: varchar("reservationId", { length: 64 }).notNull().unique(),
  customerId: varchar("customerId", { length: 64 }), // 予約時に自動作成
  facilityId: varchar("facilityId", { length: 64 }).notNull(),
  
  // 予約者情報（予約時点の情報）
  customerName: varchar("customerName", { length: 100 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  
  // 予約日時（最大3つの希望）
  firstChoiceDate: timestamp("firstChoiceDate").notNull(),
  firstChoiceTimeSlot: varchar("firstChoiceTimeSlot", { length: 50 }).notNull(), // '10:00-13:00', '13:00-17:00', '17:00-'
  
  secondChoiceDate: timestamp("secondChoiceDate"),
  secondChoiceTimeSlot: varchar("secondChoiceTimeSlot", { length: 50 }),
  
  thirdChoiceDate: timestamp("thirdChoiceDate"),
  thirdChoiceTimeSlot: varchar("thirdChoiceTimeSlot", { length: 50 }),
  
  // 確定日時（スタッフが第1-3希望から選択）
  confirmedDate: timestamp("confirmedDate"),
  confirmedTimeSlot: varchar("confirmedTimeSlot", { length: 50 }),
  
  // ステータス
  status: mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled", "no_show"]).default("pending").notNull(),
  
  // メモ
  notes: varchar("notes", { length: 1000 }),
  staffNotes: varchar("staffNotes", { length: 1000 }), // スタッフ用メモ
  
  // タイムスタンプ
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;


/**
 * 月次経費テーブル（10カテゴリ・暦月運用）
 * 
 * 簡易PL計算式:
 * - 売上総利益（粗利）= 売上高 - (costProductSales + costTreatmentMaterials)
 * - 営業利益 = 粗利 - (laborCosts + rent + utilities + otherExpenses + advertisingTotal)
 */
export const monthlyExpenses = mysqlTable("monthlyExpenses", {
  id: int("id").autoincrement().primaryKey(),
  expenseId: varchar("expenseId", { length: 64 }).notNull().unique(),
  
  // 年月（YYYY-MM形式）
  yearMonth: varchar("yearMonth", { length: 7 }).notNull(),
  
  // 売上（自動集計）
  revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  
  // 原価（2種）
  costProductSales: decimal("costProductSales", { precision: 12, scale: 2 }).default("0").notNull(), // 物販仕入
  costTreatmentMaterials: decimal("costTreatmentMaterials", { precision: 12, scale: 2 }).default("0").notNull(), // 施術材料
  
  // 経費（6種）
  laborCosts: decimal("laborCosts", { precision: 12, scale: 2 }).default("0").notNull(), // 人件費
  rent: decimal("rent", { precision: 12, scale: 2 }).default("0").notNull(), // 家賃
  utilities: decimal("utilities", { precision: 12, scale: 2 }).default("0").notNull(), // 水道光熱費
  trainingExpenses: decimal("trainingExpenses", { precision: 12, scale: 2 }).default("0").notNull(), // 研修費
  travelExpenses: decimal("travelExpenses", { precision: 12, scale: 2 }).default("0").notNull(), // 交通費
  otherExpenses: decimal("otherExpenses", { precision: 12, scale: 2 }).default("0").notNull(), // その他経費
  
  // 広告宣伝費（合計）
  advertisingTotal: decimal("advertisingTotal", { precision: 12, scale: 2 }).default("0").notNull(),
  
  // 計算フィールド（自動計算）
  grossProfit: decimal("grossProfit", { precision: 12, scale: 2 }).default("0").notNull(), // 売上総利益
  operatingIncome: decimal("operatingIncome", { precision: 12, scale: 2 }).default("0").notNull(), // 営業利益
  
  // メモ
  notes: varchar("notes", { length: 1000 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonthlyExpense = typeof monthlyExpenses.$inferSelect;
export type InsertMonthlyExpense = typeof monthlyExpenses.$inferInsert;

/**
 * 広告内訳テーブル（Meta/Google/チラシ）
 */
export const advertisingBreakdown = mysqlTable("advertisingBreakdown", {
  id: int("id").autoincrement().primaryKey(),
  breakdownId: varchar("breakdownId", { length: 64 }).notNull().unique(),
  
  // 関連する月次経費ID
  expenseId: varchar("expenseId", { length: 64 }).notNull(),
  
  // 広告媒体
  channel: mysqlEnum("channel", ["meta", "google", "flyer"]).notNull(),
  
  // 金額
  amount: decimal("amount", { precision: 12, scale: 2 }).default("0").notNull(),
  
  // メモ
  notes: varchar("notes", { length: 500 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdvertisingBreakdown = typeof advertisingBreakdown.$inferSelect;
export type InsertAdvertisingBreakdown = typeof advertisingBreakdown.$inferInsert;
