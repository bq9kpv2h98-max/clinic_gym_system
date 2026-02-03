/**
 * Monthly Report Generation
 * 
 * Generates comprehensive monthly reports for Confluence.
 */

import { getDb } from "./db";
import { visits, sales, monthlyExpenses, advertisingExpenses, customers } from "../drizzle/schema";
import { and, gte, lte } from "drizzle-orm";

/**
 * Generate monthly report data
 */
export async function generateMonthlyReport(year: number, month: number): Promise<{
  period: string;
  summary: {
    totalSales: number;
    totalExpenses: number;
    totalAdSpend: number;
    netProfit: number;
    visitCount: number;
    newCustomerCount: number;
    adROI: number;
  };
  salesData: any[];
  expensesData: any[];
  adData: any[];
  visitData: any[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Get sales data
  const salesData = await db
    .select()
    .from(sales)
    .where(and(gte(sales.saleDate, startDate), lte(sales.saleDate, endDate)));

  const totalSales = salesData.reduce((sum, sale) => sum + Number(sale.amount), 0);

  // Get monthly expenses data
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  const expensesData = await db
    .select()
    .from(monthlyExpenses)
    .where(and(gte(monthlyExpenses.yearMonth, yearMonth), lte(monthlyExpenses.yearMonth, yearMonth)));

  // Calculate total expenses from all categories
  const totalExpenses = expensesData.reduce((sum, expense) => {
    return sum +
      Number(expense.costProductSales || 0) +
      Number(expense.costTreatmentMaterials || 0) +
      Number(expense.laborCosts || 0) +
      Number(expense.rent || 0) +
      Number(expense.utilities || 0) +
      Number(expense.communicationCosts || 0) +
      Number(expense.consumablesCosts || 0) +
      Number(expense.trainingExpenses || 0) +
      Number(expense.travelExpenses || 0) +
      Number(expense.bankRepayment || 0) +
      Number(expense.insuranceCosts || 0) +
      Number(expense.leaseCosts || 0) +
      Number(expense.repairCosts || 0) +
      Number(expense.welfareCosts || 0) +
      Number(expense.depreciationCosts || 0) +
      Number(expense.accountingCosts || 0) +
      Number(expense.miscellaneousCosts || 0) +
      Number(expense.otherExpenses || 0);
  }, 0);

  // Get advertising expenses data
  const adData = await db
    .select()
    .from(advertisingExpenses)
    .where(and(gte(advertisingExpenses.expenseDate, startDate), lte(advertisingExpenses.expenseDate, endDate)));

  const totalAdSpend = adData.reduce((sum, ad) => sum + Number(ad.amount), 0);

  // Get visit data
  const visitData = await db
    .select()
    .from(visits)
    .where(and(gte(visits.visitDate, startDate), lte(visits.visitDate, endDate)));

  const visitCount = visitData.length;

  // Get new customer data
  const customerData = await db
    .select()
    .from(customers)
    .where(and(gte(customers.createdAt, startDate), lte(customers.createdAt, endDate)));

  const newCustomerCount = customerData.length;

  // Calculate net profit and ROI
  const netProfit = totalSales - totalExpenses - totalAdSpend;
  const adROI = totalAdSpend > 0 ? ((totalSales - totalAdSpend) / totalAdSpend) * 100 : 0;

  return {
    period: `${year}年${month}月`,
    summary: {
      totalSales,
      totalExpenses,
      totalAdSpend,
      netProfit,
      visitCount,
      newCustomerCount,
      adROI,
    },
    salesData,
    expensesData,
    adData,
    visitData,
  };
}

/**
 * Format monthly report as Confluence HTML
 */
export function formatMonthlyReportHTML(report: Awaited<ReturnType<typeof generateMonthlyReport>>): string {
  let html = `<h1>月次レポート - ${report.period}</h1>`;
  html += `<p><strong>生成日時:</strong> ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>`;
  html += `<hr/>`;

  // Summary section
  html += `<h2>📊 サマリー</h2>`;
  html += `<table><tbody>`;
  html += `<tr><td><strong>売上高</strong></td><td>¥${report.summary.totalSales.toLocaleString()}</td></tr>`;
  html += `<tr><td><strong>経費</strong></td><td>¥${report.summary.totalExpenses.toLocaleString()}</td></tr>`;
  html += `<tr><td><strong>広告費</strong></td><td>¥${report.summary.totalAdSpend.toLocaleString()}</td></tr>`;
  html += `<tr><td><strong>純利益</strong></td><td>¥${report.summary.netProfit.toLocaleString()}</td></tr>`;
  html += `<tr><td><strong>来院数</strong></td><td>${report.summary.visitCount}回</td></tr>`;
  html += `<tr><td><strong>新規顧客数</strong></td><td>${report.summary.newCustomerCount}人</td></tr>`;
  html += `<tr><td><strong>広告ROI</strong></td><td>${report.summary.adROI.toFixed(2)}%</td></tr>`;
  html += `</tbody></table>`;
  html += `<hr/>`;

  // Sales breakdown
  html += `<h2>💰 売上内訳</h2>`;
  if (report.salesData.length > 0) {
    html += `<table><thead><tr><th>日付</th><th>金額</th><th>メモ</th></tr></thead><tbody>`;
    report.salesData.forEach((sale) => {
      html += `<tr>`;
      html += `<td>${new Date(sale.saleDate).toLocaleDateString("ja-JP")}</td>`;
      html += `<td>¥${Number(sale.amount).toLocaleString()}</td>`;
      html += `<td>${sale.notes || "-"}</td>`;
      html += `</tr>`;
    });
    html += `</tbody></table>`;
  } else {
    html += `<p>売上データがありません。</p>`;
  }
  html += `<hr/>`;

  // Expenses breakdown
  html += `<h2>💸 経費内訳</h2>`;
  if (report.expensesData.length > 0) {
    html += `<table><thead><tr><th>カテゴリ</th><th>金額</th></tr></thead><tbody>`;
    report.expensesData.forEach((expense) => {
      html += `<tr><td>原価：物販仕入</td><td>¥${Number(expense.costProductSales || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>原価：施術材料</td><td>¥${Number(expense.costTreatmentMaterials || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>人件費</td><td>¥${Number(expense.laborCosts || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>家賃</td><td>¥${Number(expense.rent || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>水道光熱費</td><td>¥${Number(expense.utilities || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>通信費</td><td>¥${Number(expense.communicationCosts || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>消耗品費</td><td>¥${Number(expense.consumablesCosts || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>研修費</td><td>¥${Number(expense.trainingExpenses || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>交通費</td><td>¥${Number(expense.travelExpenses || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>銀行返済</td><td>¥${Number(expense.bankRepayment || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>保険料</td><td>¥${Number(expense.insuranceCosts || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>リース料</td><td>¥${Number(expense.leaseCosts || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>修繕費</td><td>¥${Number(expense.repairCosts || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>福利厚生費</td><td>¥${Number(expense.welfareCosts || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>減価償却費</td><td>¥${Number(expense.depreciationCosts || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>税理士・会計士費用</td><td>¥${Number(expense.accountingCosts || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>雑費</td><td>¥${Number(expense.miscellaneousCosts || 0).toLocaleString()}</td></tr>`;
      html += `<tr><td>その他経費</td><td>¥${Number(expense.otherExpenses || 0).toLocaleString()}</td></tr>`;
    });
    html += `</tbody></table>`;
  } else {
    html += `<p>経費データがありません。</p>`;
  }
  html += `<hr/>`;

  // Ad expenses
  html += `<h2>📢 広告費詳細</h2>`;
  if (report.adData.length > 0) {
    html += `<table><thead><tr><th>日付</th><th>金額</th><th>説明</th></tr></thead><tbody>`;
    report.adData.forEach((ad) => {
      html += `<tr>`;
      html += `<td>${new Date(ad.expenseDate).toLocaleDateString("ja-JP")}</td>`;
      html += `<td>¥${Number(ad.amount).toLocaleString()}</td>`;
      html += `<td>${ad.description || "-"}</td>`;
      html += `</tr>`;
    });
    html += `</tbody></table>`;
  } else {
    html += `<p>広告費データがありません。</p>`;
  }
  html += `<hr/>`;

  // Visit statistics
  html += `<h2>🏥 来院統計</h2>`;
  html += `<p><strong>総来院数:</strong> ${report.summary.visitCount}回</p>`;
  html += `<p><strong>新規顧客数:</strong> ${report.summary.newCustomerCount}人</p>`;

  return html;
}
