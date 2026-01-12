import { int, mysqlEnum, mysqlTable, timestamp, varchar, decimal, date } from "drizzle-orm/mysql-core";
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
