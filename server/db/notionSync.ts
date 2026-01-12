import { exec } from "child_process";
import { promisify } from "util";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

const execAsync = promisify(exec);

/**
 * Notion MCPを使ってデータを同期
 */
async function callNotionMCP(command: string, args: string): Promise<any> {
  try {
    const { stdout, stderr } = await execAsync(
      `manus-mcp-cli tool call ${command} --server notion --input '${args}'`
    );

    if (stderr) {
      console.error("Notion MCP stderr:", stderr);
    }

    return JSON.parse(stdout);
  } catch (error: any) {
    console.error("Notion MCP error:", error);
    throw new Error(`Notion MCP failed: ${error.message}`);
  }
}

/**
 * 顧客情報をNotionに同期
 */
export async function syncCustomersToNotion(databaseId: string): Promise<{
  success: boolean;
  syncedCount: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const errors: string[] = [];
  let syncedCount = 0;

  try {
    // 顧客データを取得
    const customersResult: any = await db.execute(
      sql`SELECT customerId, fullName, dateOfBirth, gender, phone, email, createdAt 
          FROM customers 
          ORDER BY createdAt DESC 
          LIMIT 100`
    );
    const customers = customersResult.rows;

    // Notionに同期
    for (const customer of customers) {
      try {
        const properties = {
          "顧客ID": { title: [{ text: { content: customer.customerId } }] },
          "名前": { rich_text: [{ text: { content: customer.fullName || "" } }] },
          "生年月日": customer.dateOfBirth
            ? { date: { start: customer.dateOfBirth } }
            : undefined,
          "性別": customer.gender
            ? { select: { name: customer.gender } }
            : undefined,
          "電話番号": customer.phone
            ? { phone_number: customer.phone }
            : undefined,
          "メール": customer.email ? { email: customer.email } : undefined,
          "登録日": customer.createdAt
            ? { date: { start: customer.createdAt.toISOString().split("T")[0] } }
            : undefined,
        };

        await callNotionMCP(
          "create_page",
          JSON.stringify({
            database_id: databaseId,
            properties,
          })
        );

        syncedCount++;
      } catch (error: any) {
        errors.push(`Customer ${customer.customerId}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      syncedCount,
      errors,
    };
  } catch (error: any) {
    errors.push(`Sync failed: ${error.message}`);
    return {
      success: false,
      syncedCount,
      errors,
    };
  }
}

/**
 * 売上サマリーをNotionに同期
 */
export async function syncSalesSummaryToNotion(databaseId: string): Promise<{
  success: boolean;
  syncedCount: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const errors: string[] = [];
  let syncedCount = 0;

  try {
    // 月別売上集計を取得
    const salesResult: any = await db.execute(
      sql`SELECT 
            DATE_FORMAT(saleDate, '%Y-%m') as month,
            COUNT(*) as totalSales,
            SUM(totalAmount) as totalRevenue,
            AVG(totalAmount) as avgOrderValue
          FROM sales
          WHERE saleDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
          GROUP BY DATE_FORMAT(saleDate, '%Y-%m')
          ORDER BY month DESC`
    );
    const salesData = salesResult.rows;

    // Notionに同期
    for (const data of salesData) {
      try {
        const properties = {
          "月": { title: [{ text: { content: data.month } }] },
          "売上件数": { number: data.totalSales },
          "総売上": { number: data.totalRevenue },
          "平均客単価": { number: Math.round(data.avgOrderValue) },
        };

        await callNotionMCP(
          "create_page",
          JSON.stringify({
            database_id: databaseId,
            properties,
          })
        );

        syncedCount++;
      } catch (error: any) {
        errors.push(`Month ${data.month}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      syncedCount,
      errors,
    };
  } catch (error: any) {
    errors.push(`Sync failed: ${error.message}`);
    return {
      success: false,
      syncedCount,
      errors,
    };
  }
}

/**
 * 広告データをNotionに同期
 */
export async function syncAdvertisingToNotion(databaseId: string): Promise<{
  success: boolean;
  syncedCount: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const errors: string[] = [];
  let syncedCount = 0;

  try {
    // 広告効果データを取得
    const adResult: any = await db.execute(
      sql`SELECT 
            channelName,
            SUM(totalExpense) as totalExpense,
            COUNT(DISTINCT customerId) as newCustomers,
            ROUND(SUM(totalExpense) / NULLIF(COUNT(DISTINCT customerId), 0)) as cpa,
            ROUND((SUM(totalRevenue) / NULLIF(SUM(totalExpense), 0)) * 100) as roas
          FROM advertisingMetrics
          WHERE metricDate >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
          GROUP BY channelName`
    );
    const adData = adResult.rows;

    // Notionに同期
    for (const data of adData) {
      try {
        const properties = {
          "チャネル": { title: [{ text: { content: data.channelName } }] },
          "広告費": { number: data.totalExpense },
          "新規顧客数": { number: data.newCustomers },
          "CPA": { number: data.cpa || 0 },
          "ROAS": { number: data.roas || 0 },
        };

        await callNotionMCP(
          "create_page",
          JSON.stringify({
            database_id: databaseId,
            properties,
          })
        );

        syncedCount++;
      } catch (error: any) {
        errors.push(`Channel ${data.channelName}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      syncedCount,
      errors,
    };
  } catch (error: any) {
    errors.push(`Sync failed: ${error.message}`);
    return {
      success: false,
      syncedCount,
      errors,
    };
  }
}

/**
 * 全データをNotionに同期
 */
export async function syncAllToNotion(config: {
  customersDatabaseId: string;
  salesDatabaseId: string;
  advertisingDatabaseId: string;
}): Promise<{
  success: boolean;
  results: {
    customers: { syncedCount: number; errors: string[] };
    sales: { syncedCount: number; errors: string[] };
    advertising: { syncedCount: number; errors: string[] };
  };
}> {
  const results = {
    customers: await syncCustomersToNotion(config.customersDatabaseId),
    sales: await syncSalesSummaryToNotion(config.salesDatabaseId),
    advertising: await syncAdvertisingToNotion(config.advertisingDatabaseId),
  };

  const success =
    results.customers.success &&
    results.sales.success &&
    results.advertising.success;

  return {
    success,
    results,
  };
}
