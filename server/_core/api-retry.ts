/**
 * 外部API呼び出しのリトライ機構
 * 
 * HTTPステータスコード429（レート制限）、502/503/504（サーバーエラー）が
 * 発生した場合、自動的にリトライします。
 */

interface ApiRetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
}

const DEFAULT_API_RETRY_OPTIONS: Required<ApiRetryOptions> = {
  maxAttempts: 3,
  initialDelay: 2000, // 2秒
  maxDelay: 16000, // 16秒
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 502, 503, 504],
};

/**
 * リトライ可能なHTTPエラーかどうかを判定
 */
function isRetryableHttpError(
  error: unknown,
  retryableStatusCodes: number[]
): boolean {
  // Fetch APIのエラー
  if (error instanceof Response) {
    return retryableStatusCodes.includes(error.status);
  }

  // ネットワークエラー
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const networkErrors = [
      'network error',
      'fetch failed',
      'econnrefused',
      'econnreset',
      'etimedout',
      'socket hang up',
    ];
    return networkErrors.some((keyword) => message.includes(keyword));
  }

  return false;
}

/**
 * 指定された時間だけ待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry-Afterヘッダーから待機時間を取得
 */
function getRetryAfterDelay(response: Response): number | null {
  const retryAfter = response.headers.get('Retry-After');
  if (!retryAfter) return null;

  // 秒数で指定されている場合
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // 日時で指定されている場合
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return null;
}

/**
 * 外部API呼び出しをリトライ機構付きで実行
 * 
 * @param fn 実行する関数
 * @param options リトライオプション
 * @returns 関数の実行結果
 * 
 * @example
 * const response = await withApiRetry(() => 
 *   fetch('https://api.example.com/data')
 * );
 */
export async function withApiRetry<T>(
  fn: () => Promise<T>,
  options: ApiRetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_API_RETRY_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const result = await fn();

      // Responseオブジェクトの場合、ステータスコードをチェック
      if (result instanceof Response) {
        if (!result.ok && opts.retryableStatusCodes.includes(result.status)) {
          // リトライ可能なエラー
          lastError = result;

          // 最後の試行の場合はエラーをスロー
          if (attempt === opts.maxAttempts) {
            break;
          }

          // Retry-Afterヘッダーがあればそれに従う
          const retryAfterDelay = getRetryAfterDelay(result);
          const waitTime = retryAfterDelay ?? delay;

          console.warn(
            `[API Retry] Attempt ${attempt}/${opts.maxAttempts} failed with status ${result.status}. Retrying in ${waitTime}ms...`
          );

          await sleep(waitTime);

          // 次回の待機時間を計算（指数バックオフ）
          if (!retryAfterDelay) {
            delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
          }

          continue;
        }
      }

      return result;
    } catch (error) {
      lastError = error;

      // 最後の試行の場合はエラーをスロー
      if (attempt === opts.maxAttempts) {
        break;
      }

      // リトライ可能なエラーでない場合は即座にスロー
      if (!isRetryableHttpError(error, opts.retryableStatusCodes)) {
        throw error;
      }

      // リトライ前に待機
      console.warn(
        `[API Retry] Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${delay}ms...`,
        error instanceof Error ? error.message : String(error)
      );

      await sleep(delay);

      // 次回の待機時間を計算（指数バックオフ）
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  // すべての試行が失敗した場合
  console.error(
    `[API Retry] All ${opts.maxAttempts} attempts failed.`,
    lastError instanceof Error ? lastError.message : String(lastError)
  );
  throw lastError;
}

/**
 * fetch APIをリトライ機構付きで実行
 * 
 * @param url リクエストURL
 * @param init リクエストオプション
 * @param retryOptions リトライオプション
 * @returns レスポンス
 * 
 * @example
 * const response = await fetchWithRetry('https://api.example.com/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ key: 'value' }),
 * });
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: ApiRetryOptions
): Promise<Response> {
  return withApiRetry(() => fetch(url, init), retryOptions);
}
