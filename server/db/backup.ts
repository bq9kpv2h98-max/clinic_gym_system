import { getDb } from "../db";
import { storagePut } from "../storage";
import { sql } from "drizzle-orm";

/**
 * データベース全体をSQLダンプ形式でエクスポート
 */
export async function createDatabaseBackup(): Promise<{
  backupId: string;
  backupUrl: string;
  backupSize: number;
  tableCount: number;
  recordCount: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const backupId = `backup_${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  // バックアップヘッダー
  let sqlDump = `-- Database Backup
-- Generated at: ${timestamp}
-- Backup ID: ${backupId}
-- 
-- This is a complete backup of the clinic_gym_system database
-- To restore: Execute this SQL file in your database

SET FOREIGN_KEY_CHECKS = 0;

`;

  // 全テーブルのリストを取得
  const tables: any = await db.execute(sql`SHOW TABLES`);
  const tableNames = tables.rows.map((row: any) => Object.values(row)[0] as string);
  
  let totalRecords = 0;

  // 各テーブルのデータをダンプ
  for (const tableName of tableNames) {
    sqlDump += `\n-- Table: ${tableName}\n`;
    
    // テーブル構造を取得
    const createTableResult: any = await db.execute(
      sql.raw(`SHOW CREATE TABLE \`${tableName}\``)
    );
    const createTableSQL = (createTableResult.rows[0] as any)["Create Table"];
    sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
    sqlDump += `${createTableSQL};\n\n`;

    // テーブルデータを取得
    const dataResult: any = await db.execute(sql.raw(`SELECT * FROM \`${tableName}\``));
    const rows = dataResult.rows;

    if (rows.length > 0) {
      sqlDump += `-- Data for table ${tableName}\n`;
      
      // カラム名を取得
      const columns = Object.keys(rows[0]);
      const columnList = columns.map(col => `\`${col}\``).join(", ");

      // INSERT文を生成（バッチ処理）
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const values = batch.map((row: any) => {
          const vals = columns.map(col => {
            const val = row[col];
            if (val === null) return "NULL";
            if (typeof val === "string") {
              return `'${val.replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
            }
            if (val instanceof Date) {
              return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
            }
            return val;
          });
          return `(${vals.join(", ")})`;
        }).join(",\n  ");

        sqlDump += `INSERT INTO \`${tableName}\` (${columnList}) VALUES\n  ${values};\n`;
      }

      totalRecords += rows.length;
      sqlDump += `\n`;
    }
  }

  sqlDump += `\nSET FOREIGN_KEY_CHECKS = 1;\n`;
  sqlDump += `\n-- Backup completed at: ${new Date().toISOString()}\n`;
  sqlDump += `-- Total tables: ${tableNames.length}\n`;
  sqlDump += `-- Total records: ${totalRecords}\n`;

  // S3にアップロード
  const fileName = `backups/${backupId}.sql`;
  const buffer = Buffer.from(sqlDump, "utf-8");
  const { url } = await storagePut(fileName, buffer, "application/sql");

  return {
    backupId,
    backupUrl: url,
    backupSize: buffer.length,
    tableCount: tableNames.length,
    recordCount: totalRecords,
  };
}

/**
 * バックアップファイルからデータベースを復元
 */
export async function restoreDatabaseFromBackup(
  backupUrl: string
): Promise<{
  success: boolean;
  restoredTables: number;
  restoredRecords: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // バックアップファイルをダウンロード
  const response = await fetch(backupUrl);
  if (!response.ok) {
    throw new Error(`Failed to download backup: ${response.statusText}`);
  }

  const sqlDump = await response.text();
  const errors: string[] = [];
  let restoredTables = 0;
  let restoredRecords = 0;

  // SQL文を分割して実行
  const statements = sqlDump
    .split(";")
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith("--"));

  for (const statement of statements) {
    try {
      await db.execute(sql.raw(statement));
      
      if (statement.toUpperCase().includes("CREATE TABLE")) {
        restoredTables++;
      } else if (statement.toUpperCase().includes("INSERT INTO")) {
        // INSERT文から挿入された行数を推定
        const matches = statement.match(/VALUES\s*\(/gi);
        if (matches) {
          restoredRecords += matches.length;
        }
      }
    } catch (error: any) {
      errors.push(`Error executing statement: ${error.message}`);
    }
  }

  return {
    success: errors.length === 0,
    restoredTables,
    restoredRecords,
    errors,
  };
}

/**
 * バックアップ履歴を取得（S3から）
 */
export async function listBackups(): Promise<
  Array<{
    backupId: string;
    backupUrl: string;
    createdAt: Date;
  }>
> {
  // Note: S3のリスト機能を使う場合は、別途実装が必要
  // ここでは簡易的な実装として、データベースに履歴を保存することを推奨
  return [];
}

/**
 * 古いバックアップを削除（世代管理）
 */
export async function cleanupOldBackups(retentionDays: number = 30): Promise<number> {
  // Note: S3のオブジェクト削除機能を使う場合は、別途実装が必要
  // ここでは簡易的な実装として、手動削除を推奨
  return 0;
}

/**
 * バックアップの健全性チェック
 */
export async function verifyBackup(backupUrl: string): Promise<{
  isValid: boolean;
  tableCount: number;
  recordCount: number;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const response = await fetch(backupUrl);
    if (!response.ok) {
      errors.push(`Failed to download backup: ${response.statusText}`);
      return { isValid: false, tableCount: 0, recordCount: 0, errors };
    }

    const sqlDump = await response.text();

    // テーブル数をカウント
    const tableMatches = sqlDump.match(/CREATE TABLE/gi);
    const tableCount = tableMatches ? tableMatches.length : 0;

    // レコード数をカウント
    const recordMatches = sqlDump.match(/INSERT INTO/gi);
    const recordCount = recordMatches ? recordMatches.length : 0;

    // 基本的な構文チェック
    if (!sqlDump.includes("-- Database Backup")) {
      errors.push("Invalid backup format: missing header");
    }

    if (tableCount === 0) {
      errors.push("No tables found in backup");
    }

    return {
      isValid: errors.length === 0,
      tableCount,
      recordCount,
      errors,
    };
  } catch (error: any) {
    errors.push(`Verification error: ${error.message}`);
    return { isValid: false, tableCount: 0, recordCount: 0, errors };
  }
}
