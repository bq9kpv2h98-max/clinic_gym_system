import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createDatabaseBackup,
  restoreDatabaseFromBackup,
  verifyBackup,
} from "../db/backup";
import { getDb } from "../db";
import { backupAllDataToSheets } from "../_core/googleSheets";
import { customers, sales, monthlyExpenses, reservations } from "../../drizzle/schema";

export const backupRouter = router({
  /**
   * データベース全体をバックアップ
   */
  createBackup: protectedProcedure.mutation(async () => {
    const result = await createDatabaseBackup();
    return result;
  }),

  /**
   * バックアップからデータベースを復元
   */
  restoreBackup: protectedProcedure
    .input(
      z.object({
        backupUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }: any) => {
      const result = await restoreDatabaseFromBackup(input.backupUrl);
      return result;
    }),

  /**
   * バックアップの健全性チェック
   */
  verifyBackup: protectedProcedure
    .input(
      z.object({
        backupUrl: z.string().url(),
      })
    )
    .query(async ({ input }: any) => {
      const result = await verifyBackup(input.backupUrl);
      return result;
    }),

  /**
   * Google Sheetsへの全データバックアップ
   */
  backupToSheets: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const success = await backupAllDataToSheets(db);
    
    if (!success) {
      throw new Error("Backup failed");
    }

    return {
      success: true,
      message: "全データをGoogle Sheetsにバックアップしました",
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * 顧客データのCSVエクスポート
   */
  exportCustomersCSV: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const data = await db.select().from(customers);
    
    const headers = Object.keys(data[0] || {});
    const rows = data.map((row: any) => 
      headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (value instanceof Date) return value.toISOString();
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    
    return {
      filename: `customers_${new Date().toISOString().split("T")[0]}.csv`,
      data: csv,
      rowCount: data.length,
    };
  }),

  /**
   * 売上データのCSVエクスポート
   */
  exportSalesCSV: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const data = await db.select().from(sales);
    
    const headers = Object.keys(data[0] || {});
    const rows = data.map((row: any) => 
      headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (value instanceof Date) return value.toISOString();
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    
    return {
      filename: `sales_${new Date().toISOString().split("T")[0]}.csv`,
      data: csv,
      rowCount: data.length,
    };
  }),

  /**
   * 経費データのCSVエクスポート
   */
  exportExpensesCSV: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const data = await db.select().from(monthlyExpenses);
    
    const headers = Object.keys(data[0] || {});
    const rows = data.map((row: any) => 
      headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (value instanceof Date) return value.toISOString();
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    
    return {
      filename: `expenses_${new Date().toISOString().split("T")[0]}.csv`,
      data: csv,
      rowCount: data.length,
    };
  }),

  /**
   * 予約データのCSVエクスポート
   */
  exportReservationsCSV: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const data = await db.select().from(reservations);
    
    const headers = Object.keys(data[0] || {});
    const rows = data.map((row: any) => 
      headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (value instanceof Date) return value.toISOString();
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    
    return {
      filename: `reservations_${new Date().toISOString().split("T")[0]}.csv`,
      data: csv,
      rowCount: data.length,
    };
  }),
});
