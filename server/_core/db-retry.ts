/**
 * データベースクエリのリトライ機構
 * 
 * 一時的なエラー（接続タイムアウト、ロック待ち）が発生した場合、
 * 自動的にリトライします。
 */

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
  backoffMultiplier: 2,
};

/**
 * 一時的なエラーかどうかを判定
 */
function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  const transientErrors = [
    'connection timeout',
    'connection refused',
    'econnrefused',
    'econnreset',
    'etimedout',
    'lock wait timeout',
    'deadlock',
    'too many connections',
    'connection lost',
    'server has gone away',
  ];

  return transientErrors.some((keyword) => message.includes(keyword));
}

/**
 * 指定された時間だけ待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * データベースクエリをリトライ機構付きで実行
 * 
 * @param fn 実行する関数
 * @param options リトライオプション
 * @returns 関数の実行結果
 * 
 * @example
 * const customers = await withRetry(() => db.select().from(customers));
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 最後の試行の場合はエラーをスロー
      if (attempt === opts.maxAttempts) {
        break;
      }

      // 一時的なエラーでない場合は即座にスロー
      if (!isTransientError(error)) {
        throw error;
      }

      // リトライ前に待機
      console.warn(
        `[DB Retry] Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${delay}ms...`,
        error instanceof Error ? error.message : String(error)
      );

      await sleep(delay);

      // 次回の待機時間を計算（指数バックオフ）
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  // すべての試行が失敗した場合
  console.error(
    `[DB Retry] All ${opts.maxAttempts} attempts failed.`,
    lastError instanceof Error ? lastError.message : String(lastError)
  );
  throw lastError;
}

/**
 * データベーストランザクションをリトライ機構付きで実行
 * 
 * @param fn トランザクション関数
 * @param options リトライオプション
 * @returns トランザクションの実行結果
 * 
 * @example
 * const result = await withTransactionRetry(async (tx) => {
 *   await tx.insert(customers).values({ name: 'John' });
 *   return tx.select().from(customers);
 * });
 */
export async function withTransactionRetry<T>(
  fn: (tx: any) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(() => {
    // トランザクションの実装は実際のORMに応じて調整
    return fn(null as any);
  }, options);
}
