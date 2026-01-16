/**
 * Notion顧客情報の定期同期スクリプト
 * 
 * 1日1回実行され、Notionと紐付けられている全顧客の情報を同期します。
 * 電話番号、メールアドレスなどの変更をNotionからシステムに反映します。
 */

import { getDb } from "../db";
import { customers, notionSyncLogs } from "../../drizzle/schema";
import { eq, isNotNull } from "drizzle-orm";
import { getNotionCustomerDetails } from "../notion";
import { nanoid } from "nanoid";

interface SyncLog {
  timestamp: Date;
  totalCustomers: number;
  successCount: number;
  errorCount: number;
  updatedFields: Record<string, string[]>;
  errors: string[];
}

export async function syncNotionCustomers(syncType: "manual" | "scheduled" = "scheduled"): Promise<SyncLog> {
  const startTime = Date.now();
  const log: SyncLog = {
    timestamp: new Date(),
    totalCustomers: 0,
    successCount: 0,
    errorCount: 0,
    updatedFields: {},
    errors: [],
  };

  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Notionと紐付けられている顧客を取得
    const linkedCustomers = await db
      .select()
      .from(customers)
      .where(isNotNull(customers.notionPageId));

    log.totalCustomers = linkedCustomers.length;
    console.log(`[Notion同期] ${log.totalCustomers}件の顧客を同期します`);

    for (const customer of linkedCustomers) {
      if (!customer.notionPageId) continue;

      try {
        // Notionから最新情報を取得
        const notionCustomer = await getNotionCustomerDetails(customer.notionPageId);
        
        if (!notionCustomer) {
          log.errorCount++;
          log.errors.push(`${customer.fullName}: Notion顧客が見つかりません`);
          continue;
        }

        // 更新が必要なフィールドを検出
        const updates: any = {};
        const updatedFieldsList: string[] = [];
        
        if (notionCustomer.phone && notionCustomer.phone !== customer.phone) {
          updates.phone = notionCustomer.phone;
          updatedFieldsList.push("電話番号");
        }
        
        if (notionCustomer.email && notionCustomer.email !== customer.email) {
          updates.email = notionCustomer.email;
          updatedFieldsList.push("メールアドレス");
        }

        // 更新がある場合のみデータベースを更新
        if (Object.keys(updates).length > 0) {
          await db
            .update(customers)
            .set(updates)
            .where(eq(customers.customerId, customer.customerId));
          
          log.successCount++;
          log.updatedFields[customer.fullName] = updatedFieldsList;
          
          console.log(`[Notion同期] ${customer.fullName}: ${updatedFieldsList.join(", ")}を更新`);
        }
      } catch (error) {
        log.errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.errors.push(`${customer.fullName}: ${errorMessage}`);
        console.error(`[Notion同期エラー] ${customer.fullName}:`, error);
      }
    }

    console.log(`[Notion同期完了] 成功: ${log.successCount}, エラー: ${log.errorCount}`);
    
    // 同期履歴をデータベースに記録
    const executionTime = Date.now() - startTime;
    const syncId = nanoid();
    
    try {
      await db.insert(notionSyncLogs).values({
        syncId,
        syncType,
        status: log.errorCount === 0 ? "success" : (log.successCount > 0 ? "partial" : "failed"),
        totalCustomers: log.totalCustomers,
        successCount: log.successCount,
        errorCount: log.errorCount,
        updatedFields: JSON.stringify(log.updatedFields),
        errors: JSON.stringify(log.errors),
        executionTime,
      });
      console.log(`[同期履歴記録] ID: ${syncId}`);
    } catch (error) {
      console.error("[同期履歴記録エラー]", error);
    }
    
    return log;
  } catch (error) {
    console.error("[Notion同期エラー]", error);
    log.errors.push(`システムエラー: ${error instanceof Error ? error.message : String(error)}`);
    return log;
  }
}

// スクリプトとして直接実行された場合
if (require.main === module) {
  syncNotionCustomers()
    .then((log) => {
      console.log("\n=== 同期結果 ===");
      console.log(`対象顧客数: ${log.totalCustomers}`);
      console.log(`成功: ${log.successCount}`);
      console.log(`エラー: ${log.errorCount}`);
      
      if (Object.keys(log.updatedFields).length > 0) {
        console.log("\n更新された顧客:");
        for (const [name, fields] of Object.entries(log.updatedFields)) {
          console.log(`  - ${name}: ${fields.join(", ")}`);
        }
      }
      
      if (log.errors.length > 0) {
        console.log("\nエラー:");
        log.errors.forEach((error) => console.log(`  - ${error}`));
      }
      
      process.exit(log.errorCount > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("同期スクリプト実行エラー:", error);
      process.exit(1);
    });
}
