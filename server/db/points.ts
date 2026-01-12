import { getDb } from "../db";
import { customers, pointTransactions, sales } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * ポイント使用ルール
 */
export const POINT_RULES = {
  POINTS_PER_YEN: 1, // 1円=1ポイント
  MIN_USE_POINTS: 1, // 最小使用ポイント数
  POINT_VALUE: 1, // 1ポイント=1円
};

/**
 * 顧客のポイント残高を取得
 */
export async function getCustomerPointBalance(customerId: string) {
  const db = await getDb();
  if (!db) throw new Error("データベース接続エラー");
  const customer = await db
    .select()
    .from(customers)
    .where(eq(customers.customerId, customerId))
    .limit(1);

  if (customer.length === 0) {
    throw new Error("顧客が見つかりません");
  }

  return customer[0].totalPoints;
}

/**
 * ポイントを使用する
 */
export async function usePoints(params: {
  customerId: string;
  points: number;
  saleId?: string;
  description?: string;
}) {
  const { customerId, points, saleId, description } = params;

  if (points < POINT_RULES.MIN_USE_POINTS) {
    throw new Error(`最小使用ポイント数は${POINT_RULES.MIN_USE_POINTS}ポイントです`);
  }

  const db = await getDb();
  if (!db) throw new Error("データベース接続エラー");

  // 現在のポイント残高を取得
  const currentBalance = await getCustomerPointBalance(customerId);

  if (currentBalance < points) {
    throw new Error("ポイント残高が不足しています");
  }

  const newBalance = currentBalance - points;

  // 顧客のポイント残高を更新
  await db
    .update(customers)
    .set({
      totalPoints: newBalance,
      lastPointActivityDate: new Date(),
    })
    .where(eq(customers.customerId, customerId));

  // ポイント使用履歴を記録
  const transactionId = uuidv4();
  await db.insert(pointTransactions).values({
    transactionId,
    customerId,
    transactionType: "redeem",
    points: -points, // 負の値で使用を表現
    balanceAfter: newBalance,
    description: description || `ポイント使用: ${points}ポイント`,
    transactionDate: new Date(),
  });

  return {
    transactionId,
    pointsUsed: points,
    balanceAfter: newBalance,
    discountAmount: points * POINT_RULES.POINT_VALUE,
  };
}

/**
 * ポイント取引履歴を取得
 */
export async function getPointTransactionHistory(customerId: string) {
  const db = await getDb();
  if (!db) throw new Error("データベース接続エラー");
  const transactions = await db
    .select()
    .from(pointTransactions)
    .where(eq(pointTransactions.customerId, customerId))
    .orderBy(desc(pointTransactions.createdAt));

  return transactions;
}

/**
 * ポイント使用をロールバック（キャンセル）
 */
export async function rollbackPointUse(transactionId: string) {
  const db = await getDb();
  if (!db) throw new Error("データベース接続エラー");

  // 元の取引を取得
  const originalTransaction = await db
    .select()
    .from(pointTransactions)
    .where(eq(pointTransactions.transactionId, transactionId))
    .limit(1);

  if (originalTransaction.length === 0) {
    throw new Error("取引が見つかりません");
  }

  const transaction = originalTransaction[0];

  if (transaction.transactionType !== "redeem") {
    throw new Error("使用取引のみロールバック可能です");
  }

  // ポイントを返却
  const pointsToReturn = Math.abs(transaction.points);
  const customerId = transaction.customerId;

  const currentBalance = await getCustomerPointBalance(customerId);
  const newBalance = currentBalance + pointsToReturn;

  // 顧客のポイント残高を更新
  await db
    .update(customers)
    .set({
      totalPoints: newBalance,
      lastPointActivityDate: new Date(),
    })
    .where(eq(customers.customerId, customerId));

  // ロールバック履歴を記録
  const rollbackTransactionId = uuidv4();
  await db.insert(pointTransactions).values({
    transactionId: rollbackTransactionId,
    customerId,
    transactionType: "rollback",
    points: pointsToReturn,
    balanceAfter: newBalance,
    description: `ポイント使用のロールバック (元の取引: ${transactionId})`,
    transactionDate: new Date(),
  });

  return {
    transactionId: rollbackTransactionId,
    pointsReturned: pointsToReturn,
    balanceAfter: newBalance,
  };
}
