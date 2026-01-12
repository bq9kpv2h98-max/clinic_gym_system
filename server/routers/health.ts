/**
 * ヘルスチェックエンドポイント
 * 
 * システムの健全性を確認するエンドポイントを提供します。
 */

import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { storagePut } from "../storage";

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheckResult;
    storage: HealthCheckResult;
    memory: {
      status: 'healthy' | 'warning' | 'critical';
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      status: 'healthy' | 'warning' | 'critical';
      percentage: number;
    };
  };
}

/**
 * データベース接続をチェック
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // 簡単なクエリを実行してデータベース接続を確認
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }
    await db.execute(sql`SELECT 1`);
    
    const responseTime = Date.now() - startTime;
    
    // レスポンスタイムが1秒を超えたら degraded
    const status = responseTime > 1000 ? 'degraded' : 'healthy';
    
    return {
      status,
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * S3ストレージ接続をチェック
 */
async function checkStorage(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // 小さなテストファイルをアップロードして接続を確認
    const testData = `health-check-${Date.now()}`;
    await storagePut(
      `health-checks/test-${Date.now()}.txt`,
      Buffer.from(testData),
      'text/plain'
    );
    
    const responseTime = Date.now() - startTime;
    
    // レスポンスタイムが2秒を超えたら degraded
    const status = responseTime > 2000 ? 'degraded' : 'healthy';
    
    return {
      status,
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * メモリ使用状況をチェック
 */
function checkMemory() {
  const memUsage = process.memoryUsage();
  const totalMemory = memUsage.heapTotal;
  const usedMemory = memUsage.heapUsed;
  const percentage = (usedMemory / totalMemory) * 100;
  
  let status: 'healthy' | 'warning' | 'critical';
  if (percentage < 70) {
    status = 'healthy';
  } else if (percentage < 85) {
    status = 'warning';
  } else {
    status = 'critical';
  }
  
  return {
    status,
    used: Math.round(usedMemory / 1024 / 1024), // MB
    total: Math.round(totalMemory / 1024 / 1024), // MB
    percentage: Math.round(percentage),
  };
}

/**
 * CPU使用率をチェック（簡易版）
 */
function checkCPU() {
  const cpuUsage = process.cpuUsage();
  const totalCPU = cpuUsage.user + cpuUsage.system;
  
  // 簡易的な計算（実際のCPU使用率ではなく、プロセスのCPU時間）
  const percentage = Math.min(100, (totalCPU / 1000000) % 100);
  
  let status: 'healthy' | 'warning' | 'critical';
  if (percentage < 70) {
    status = 'healthy';
  } else if (percentage < 90) {
    status = 'warning';
  } else {
    status = 'critical';
  }
  
  return {
    status,
    percentage: Math.round(percentage),
  };
}

/**
 * システム全体のステータスを判定
 */
function determineOverallStatus(checks: SystemHealth['checks']): SystemHealth['status'] {
  const { database, storage, memory, cpu } = checks;
  
  // いずれかが unhealthy ならシステム全体も unhealthy
  if (database.status === 'unhealthy' || storage.status === 'unhealthy') {
    return 'unhealthy';
  }
  
  // いずれかが degraded または warning/critical ならシステム全体も degraded
  if (
    database.status === 'degraded' ||
    storage.status === 'degraded' ||
    memory.status !== 'healthy' ||
    cpu.status !== 'healthy'
  ) {
    return 'degraded';
  }
  
  return 'healthy';
}

export const healthRouter = router({
  /**
   * ヘルスチェック
   */
  check: publicProcedure.query(async (): Promise<SystemHealth> => {
    const [database, storage] = await Promise.all([
      checkDatabase(),
      checkStorage(),
    ]);
    
    const memory = checkMemory();
    const cpu = checkCPU();
    
    const checks = {
      database,
      storage,
      memory,
      cpu,
    };
    
    const status = determineOverallStatus(checks);
    
    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
    };
  }),

  /**
   * 簡易ヘルスチェック（データベースのみ）
   */
  ping: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }
      await db.execute(sql`SELECT 1`);
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch (error) {
      throw new Error('Database connection failed');
    }
  }),
});
