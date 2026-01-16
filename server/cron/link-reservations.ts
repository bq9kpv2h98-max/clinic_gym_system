/**
 * Notion予約履歴の定期紐付けスクリプト
 * 
 * 1日1回実行され、顧客リレーションが空の予約を自動的に顧客マスターと紐付けます。
 */

import { getDb } from "../db";
import { reservationLinkLogs } from "../../drizzle/schema";
import { getAllNotionReservationsWithoutCustomer, searchNotionCustomerByName, linkReservationToCustomer } from "../notion";
import { nanoid } from "nanoid";

interface LinkLog {
  timestamp: Date;
  totalReservations: number;
  successCount: number;
  failedCount: number;
  details: Array<{ reservationTitle: string; customerName: string; status: string; error?: string }>;
}

export async function linkReservationsAutomatically(): Promise<LinkLog> {
  const startTime = Date.now();
  const log: LinkLog = {
    timestamp: new Date(),
    totalReservations: 0,
    successCount: 0,
    failedCount: 0,
    details: [],
  };

  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // 顧客リレーションが空の予約を取得
    const reservations = await getAllNotionReservationsWithoutCustomer();
    log.totalReservations = reservations.length;
    
    console.log(`[予約紐付け] ${log.totalReservations}件の予約を処理します`);

    for (const reservation of reservations) {
      if (!reservation.customerName) {
        log.failedCount++;
        log.details.push({
          reservationTitle: reservation.title,
          customerName: "",
          status: "failed",
          error: "Customer name is empty",
        });
        continue;
      }

      try {
        // 顧客名で顧客マスターを検索
        const customerPageId = await searchNotionCustomerByName(reservation.customerName);
        
        if (!customerPageId) {
          log.failedCount++;
          log.details.push({
            reservationTitle: reservation.title,
            customerName: reservation.customerName,
            status: "failed",
            error: "Customer not found in master",
          });
          continue;
        }

        // 予約と顧客を紐付け
        const linked = await linkReservationToCustomer(reservation.id, customerPageId);
        
        if (linked) {
          log.successCount++;
          log.details.push({
            reservationTitle: reservation.title,
            customerName: reservation.customerName,
            status: "success",
          });
          console.log(`[予約紐付け] ${reservation.title} を ${reservation.customerName} と紐付けました`);
        } else {
          log.failedCount++;
          log.details.push({
            reservationTitle: reservation.title,
            customerName: reservation.customerName,
            status: "failed",
            error: "Failed to update relation",
          });
        }
      } catch (error) {
        log.failedCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.details.push({
          reservationTitle: reservation.title,
          customerName: reservation.customerName,
          status: "failed",
          error: errorMessage,
        });
        console.error(`[予約紐付けエラー] ${reservation.title}:`, error);
      }
    }

    console.log(`[予約紐付け完了] 成功: ${log.successCount}, 失敗: ${log.failedCount}`);
    
    // 紐付け履歴をデータベースに記録
    const executionTime = Date.now() - startTime;
    const linkId = nanoid();
    
    try {
      await db.insert(reservationLinkLogs).values({
        linkId,
        linkType: "scheduled",
        status: log.failedCount === 0 ? "success" : (log.successCount > 0 ? "partial" : "failed"),
        totalReservations: log.totalReservations,
        successCount: log.successCount,
        failedCount: log.failedCount,
        details: log.details,
        errors: log.details.filter(d => d.status === "failed").map(d => ({ title: d.reservationTitle, error: d.error })),
        executionTime,
      });
      console.log(`[紐付け履歴記録] ID: ${linkId}`);
    } catch (error) {
      console.error("[紐付け履歴記録エラー]", error);
    }
    
    return log;
  } catch (error) {
    console.error("[予約紐付けエラー]", error);
    return log;
  }
}

// スクリプトとして直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  linkReservationsAutomatically()
    .then((log) => {
      console.log("\n=== 紐付け結果 ===");
      console.log(`対象予約数: ${log.totalReservations}`);
      console.log(`成功: ${log.successCount}`);
      console.log(`失敗: ${log.failedCount}`);
      
      if (log.details.filter(d => d.status === "success").length > 0) {
        console.log("\n紐付けされた予約:");
        log.details.filter(d => d.status === "success").forEach((detail) => {
          console.log(`  - ${detail.reservationTitle} (${detail.customerName})`);
        });
      }
      
      if (log.details.filter(d => d.status === "failed").length > 0) {
        console.log("\n失敗した予約:");
        log.details.filter(d => d.status === "failed").forEach((detail) => {
          console.log(`  - ${detail.reservationTitle} (${detail.customerName}): ${detail.error}`);
        });
      }
      
      process.exit(log.failedCount > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("紐付けスクリプト実行エラー:", error);
      process.exit(1);
    });
}
