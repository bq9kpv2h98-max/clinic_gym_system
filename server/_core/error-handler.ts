/**
 * エラーハンドラー
 * 
 * 技術的なエラーメッセージをユーザーフレンドリーなメッセージに変換します。
 */

import { TRPCError } from "@trpc/server";

export interface UserFriendlyError {
  code: string;
  message: string;
  userMessage: string;
  troubleshooting: string[];
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * エラーコードとユーザーメッセージのマッピング
 */
const ERROR_MESSAGES: Record<string, Omit<UserFriendlyError, 'message'>> = {
  DB_CONNECTION_ERROR: {
    code: 'DB_CONNECTION_ERROR',
    userMessage: 'データベースに接続できませんでした。しばらく待ってから再度お試しください。',
    troubleshooting: [
      'インターネット接続を確認してください',
      '数分待ってから再度お試しください',
      '問題が解決しない場合は管理者に連絡してください',
    ],
    severity: 'error',
  },
  DB_TIMEOUT: {
    code: 'DB_TIMEOUT',
    userMessage: 'データベースの応答が遅くなっています。しばらく待ってから再度お試しください。',
    troubleshooting: [
      '数分待ってから再度お試しください',
      '同時に複数の操作を行っている場合は、一つずつ実行してください',
      '問題が解決しない場合は管理者に連絡してください',
    ],
    severity: 'warning',
  },
  API_CONNECTION_ERROR: {
    code: 'API_CONNECTION_ERROR',
    userMessage: '外部サービスに接続できませんでした。しばらく待ってから再度お試しください。',
    troubleshooting: [
      'インターネット接続を確認してください',
      '数分待ってから再度お試しください',
      '問題が解決しない場合は管理者に連絡してください',
    ],
    severity: 'error',
  },
  API_RATE_LIMIT: {
    code: 'API_RATE_LIMIT',
    userMessage: 'リクエストが多すぎます。しばらく待ってから再度お試しください。',
    troubleshooting: [
      '1分ほど待ってから再度お試しください',
      '短時間に大量の操作を行わないでください',
    ],
    severity: 'warning',
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    userMessage: '入力内容に誤りがあります。入力内容を確認してください。',
    troubleshooting: [
      'すべての必須項目が入力されているか確認してください',
      '入力形式が正しいか確認してください（例：電話番号、メールアドレス）',
    ],
    severity: 'info',
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    userMessage: '指定されたデータが見つかりませんでした。',
    troubleshooting: [
      'データが削除されていないか確認してください',
      'URLが正しいか確認してください',
      '一覧画面から再度選択してください',
    ],
    severity: 'info',
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    userMessage: 'ログインが必要です。ログインしてから再度お試しください。',
    troubleshooting: [
      'ログイン画面からログインしてください',
      'セッションが切れている可能性があります。再度ログインしてください',
    ],
    severity: 'warning',
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    userMessage: 'この操作を実行する権限がありません。',
    troubleshooting: [
      '管理者権限が必要な操作の可能性があります',
      '管理者に連絡してください',
    ],
    severity: 'warning',
  },
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    userMessage: 'システムエラーが発生しました。管理者に連絡してください。',
    troubleshooting: [
      'しばらく待ってから再度お試しください',
      '問題が解決しない場合は管理者に連絡してください',
      'エラーコードとエラーメッセージを管理者に伝えてください',
    ],
    severity: 'critical',
  },
};

/**
 * エラーメッセージからエラーコードを推測
 */
function inferErrorCode(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('connection') && message.includes('timeout')) {
    return 'DB_TIMEOUT';
  }
  if (message.includes('connection') || message.includes('econnrefused')) {
    return 'DB_CONNECTION_ERROR';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'API_RATE_LIMIT';
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return 'VALIDATION_ERROR';
  }
  if (message.includes('not found')) {
    return 'NOT_FOUND';
  }
  if (message.includes('unauthorized') || message.includes('not authenticated')) {
    return 'UNAUTHORIZED';
  }
  if (message.includes('forbidden') || message.includes('permission denied')) {
    return 'FORBIDDEN';
  }

  return 'INTERNAL_SERVER_ERROR';
}

/**
 * エラーをユーザーフレンドリーなエラーに変換
 * 
 * @param error エラーオブジェクト
 * @returns ユーザーフレンドリーなエラー
 * 
 * @example
 * try {
 *   await db.select().from(customers);
 * } catch (error) {
 *   const userError = toUserFriendlyError(error);
 *   console.error(userError.userMessage);
 * }
 */
export function toUserFriendlyError(error: unknown): UserFriendlyError {
  // TRPCエラーの場合
  if (error instanceof TRPCError) {
    const code = error.code;
    const mapping = ERROR_MESSAGES[code];
    if (mapping) {
      return {
        ...mapping,
        message: error.message,
      };
    }
  }

  // 通常のErrorオブジェクトの場合
  if (error instanceof Error) {
    const code = inferErrorCode(error);
    const mapping = ERROR_MESSAGES[code];
    if (mapping) {
      return {
        ...mapping,
        message: error.message,
      };
    }
  }

  // その他のエラー
  return {
    code: 'UNKNOWN_ERROR',
    message: String(error),
    userMessage: '予期しないエラーが発生しました。管理者に連絡してください。',
    troubleshooting: [
      'しばらく待ってから再度お試しください',
      '問題が解決しない場合は管理者に連絡してください',
    ],
    severity: 'critical',
  };
}

/**
 * エラーをTRPCエラーに変換
 * 
 * @param error エラーオブジェクト
 * @returns TRPCエラー
 * 
 * @example
 * try {
 *   await db.select().from(customers);
 * } catch (error) {
 *   throw toTRPCError(error);
 * }
 */
export function toTRPCError(error: unknown): TRPCError {
  // すでにTRPCエラーの場合はそのまま返す
  if (error instanceof TRPCError) {
    return error;
  }

  const userError = toUserFriendlyError(error);

  // エラーコードをTRPCエラーコードにマッピング
  const trpcCode = (() => {
    switch (userError.code) {
      case 'VALIDATION_ERROR':
        return 'BAD_REQUEST';
      case 'NOT_FOUND':
        return 'NOT_FOUND';
      case 'UNAUTHORIZED':
        return 'UNAUTHORIZED';
      case 'FORBIDDEN':
        return 'FORBIDDEN';
      case 'API_RATE_LIMIT':
        return 'TOO_MANY_REQUESTS';
      case 'DB_TIMEOUT':
        return 'TIMEOUT';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  })();

  return new TRPCError({
    code: trpcCode as any,
    message: userError.userMessage,
    cause: error,
  });
}
