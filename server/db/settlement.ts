import { getDb } from "../db";
import { sales, customers, pointTransactions, advertisingExpenses } from "../../drizzle/schema";
import { eq, gte, lte, and } from "drizzle-orm";

/**
 * 決算書類生成用のデータ構造
 */
export interface SettlementData {
  month: string;
  year: number;
  facilityId: string;
  facilityName: string;
  
  // 売上集計
  totalSales: number;
  totalTransactions: number;
  totalCustomers: number;
  averageTransactionAmount: number;
  totalTax: number;
  totalDiscount: number;
  
  // 支払い方法別
  paymentMethodBreakdown: {
    cash: number;
    creditCard: number;
    qrCode: number;
    other: number;
  };
  
  // 顧客分析
  newCustomers: number;
  returningCustomers: number;
  
  // ポイント分析
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  
  // 広告費分析
  totalAdvertisingExpense: number;
  cpa: number;
  roas: number;
  
  // 日別データ
  dailyData: Array<{
    date: string;
    sales: number;
    transactions: number;
    customers: number;
  }>;
  
  // 顧客別売上Top10
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalSpent: number;
    visitCount: number;
  }>;
}

/**
 * 月次決算データを集計
 */
export async function getMonthlySettlementData(
  facilityId: string,
  year: number,
  month: number,
  facilityName: string
): Promise<SettlementData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // 売上データ取得
  const salesData = await db
    .select()
    .from(sales)
    .where(
      and(
        eq(sales.facilityId, facilityId),
        gte(sales.saleDate, startDate),
        lte(sales.saleDate, endDate)
      )
    );

  // 顧客データ取得
  const customerData = await db
    .select()
    .from(customers);

  // ポイント取引データ取得
  const pointData = await db
    .select()
    .from(pointTransactions)
    .where(
      and(
        gte(pointTransactions.transactionDate, startDate),
        lte(pointTransactions.transactionDate, endDate)
      )
    );

  // 広告費データ取得
  const adExpenseData = await db
    .select()
    .from(advertisingExpenses)
    .where(
      and(
        eq(advertisingExpenses.facilityId, facilityId),
        gte(advertisingExpenses.expenseDate, startDate),
        lte(advertisingExpenses.expenseDate, endDate)
      )
    );

  // 集計計算
  const totalSales = salesData.reduce((sum, s) => sum + s.amount, 0);
  const totalTransactions = salesData.length;
  const totalCustomers = new Set(salesData.map((s) => s.customerId)).size;
  const averageTransactionAmount =
    totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0;
  const totalTax = salesData.reduce((sum, s) => sum + s.taxAmount, 0);
  const totalDiscount = salesData.reduce((sum, s) => sum + s.discountAmount, 0);

  // 支払い方法別集計
  const paymentMethodBreakdown = {
    cash: 0,
    creditCard: 0,
    qrCode: 0,
    other: 0,
  };

  salesData.forEach((s) => {
    if (s.paymentMethod === "cash") paymentMethodBreakdown.cash += s.amount;
    else if (s.paymentMethod === "credit_card") paymentMethodBreakdown.creditCard += s.amount;
    else if (s.paymentMethod === "qr_code") paymentMethodBreakdown.qrCode += s.amount;
    else paymentMethodBreakdown.other += s.amount;
  });

  // 新規顧客数（今月初来院）
  const newCustomerIds = new Set(
    customerData
      .filter((c) => c.registrationDate >= startDate && c.registrationDate <= endDate)
      .map((c) => c.customerId)
  );
  const newCustomers = newCustomerIds.size;
  const returningCustomers = totalCustomers - newCustomers;

  // ポイント分析
  const totalPointsEarned = pointData
    .filter((p) => p.transactionType === "earn")
    .reduce((sum, p) => sum + p.points, 0);
  const totalPointsRedeemed = pointData
    .filter((p) => p.transactionType === "redeem")
    .reduce((sum, p) => sum + p.points, 0);

  // 広告費分析
  const totalAdvertisingExpense = adExpenseData.reduce((sum, a) => sum + a.amount, 0);
  const cpa = newCustomers > 0 ? Math.round(totalAdvertisingExpense / newCustomers) : 0;
  const roas = totalAdvertisingExpense > 0 ? Math.round((totalSales / totalAdvertisingExpense) * 100) : 0;

  // 日別データ
  const dailyDataMap = new Map<string, { sales: number; transactions: number; customers: Set<string> }>();
  salesData.forEach((s) => {
    const dateStr = s.saleDate.toISOString().split("T")[0];
    if (!dailyDataMap.has(dateStr)) {
      dailyDataMap.set(dateStr, { sales: 0, transactions: 0, customers: new Set() });
    }
    const daily = dailyDataMap.get(dateStr)!;
    daily.sales += s.amount;
    daily.transactions += 1;
    if (s.customerId) daily.customers.add(s.customerId);
  });

  const dailyData = Array.from(dailyDataMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      sales: data.sales,
      transactions: data.transactions,
      customers: data.customers.size,
    }));

  // 顧客別売上Top10
  const customerSalesMap = new Map<string, { name: string; spent: number; visits: number }>();
  salesData.forEach((s) => {
    if (s.customerId) {
      if (!customerSalesMap.has(s.customerId)) {
        const customer = customerData.find((c) => c.customerId === s.customerId);
        customerSalesMap.set(s.customerId, {
          name: customer?.fullName || "Unknown",
          spent: 0,
          visits: 0,
        });
      }
      const entry = customerSalesMap.get(s.customerId)!;
      entry.spent += s.amount;
      entry.visits += 1;
    }
  });

  const topCustomers = Array.from(customerSalesMap.entries())
    .map(([customerId, data]) => ({
      customerId,
      customerName: data.name,
      totalSpent: data.spent,
      visitCount: data.visits,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  return {
    month: new Date(year, month - 1).toLocaleString("ja-JP", { month: "long" }),
    year,
    facilityId,
    facilityName,
    totalSales,
    totalTransactions,
    totalCustomers,
    averageTransactionAmount,
    totalTax,
    totalDiscount,
    paymentMethodBreakdown,
    newCustomers,
    returningCustomers,
    totalPointsEarned,
    totalPointsRedeemed,
    totalAdvertisingExpense,
    cpa,
    roas,
    dailyData,
    topCustomers,
  };
}

/**
 * 消費税計算（日本の消費税対応）
 */
export function calculateTaxes(grossAmount: number, taxRate: number = 0.1): {
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
} {
  const taxableAmount = Math.round(grossAmount / (1 + taxRate));
  const taxAmount = grossAmount - taxableAmount;
  return {
    taxableAmount,
    taxAmount,
    totalAmount: grossAmount,
  };
}

/**
 * 月次レポート用のサマリー
 */
export interface SettlementSummary {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  customerAcquisitionCost: number;
  returnOnAdSpend: number;
}

export function generateSettlementSummary(data: SettlementData): SettlementSummary {
  const totalExpenses = data.totalAdvertisingExpense + data.totalDiscount;
  const netProfit = data.totalSales - totalExpenses;
  const profitMargin = data.totalSales > 0 ? Math.round((netProfit / data.totalSales) * 100) : 0;

  return {
    period: `${data.year}年${data.month}`,
    totalRevenue: data.totalSales,
    totalExpenses,
    netProfit,
    profitMargin,
    customerAcquisitionCost: data.cpa,
    returnOnAdSpend: data.roas,
  };
}
