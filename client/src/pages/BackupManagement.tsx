import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Download, Upload, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { trpc } from "@/lib/trpc";

const BackupManagement: React.FC = () => {
  const [backupUrl, setBackupUrl] = useState("");
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const createBackupMutation = trpc.backup.createBackup.useMutation();
  const restoreBackupMutation = trpc.backup.restoreBackup.useMutation();
  const verifyBackupQuery = trpc.backup.verifyBackup.useQuery(
    { backupUrl },
    { enabled: false }
  );

  // バックアップ作成
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setMessage(null);

    try {
      const result = await createBackupMutation.mutateAsync();
      setMessage({
        type: "success",
        text: `バックアップ作成完了！\nテーブル数: ${result.tableCount}\nレコード数: ${result.recordCount}\nサイズ: ${(result.backupSize / 1024 / 1024).toFixed(2)} MB`,
      });
      setBackupUrl(result.backupUrl);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `バックアップ作成失敗: ${error.message}`,
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // バックアップ復元
  const handleRestoreBackup = async () => {
    if (!backupUrl) {
      setMessage({ type: "error", text: "バックアップURLを入力してください" });
      return;
    }

    const confirmed = window.confirm(
      "データベースを復元すると、現在のデータはすべて上書きされます。本当に実行しますか？"
    );

    if (!confirmed) return;

    setIsRestoring(true);
    setMessage(null);

    try {
      const result = await restoreBackupMutation.mutateAsync({ backupUrl });
      
      if (result.success) {
        setMessage({
          type: "success",
          text: `復元完了！\nテーブル数: ${result.restoredTables}\nレコード数: ${result.restoredRecords}`,
        });
      } else {
        setMessage({
          type: "error",
          text: `復元中にエラーが発生しました:\n${result.errors.join("\n")}`,
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `復元失敗: ${error.message}`,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // バックアップ検証
  const handleVerifyBackup = async () => {
    if (!backupUrl) {
      setMessage({ type: "error", text: "バックアップURLを入力してください" });
      return;
    }

    setIsVerifying(true);
    setMessage(null);

    try {
      const result = await verifyBackupQuery.refetch();
      
      if (result.data?.isValid) {
        setMessage({
          type: "success",
          text: `バックアップは有効です\nテーブル数: ${result.data.tableCount}\nレコード数: ${result.data.recordCount}`,
        });
      } else {
        setMessage({
          type: "error",
          text: `バックアップが無効です:\n${result.data?.errors.join("\n")}`,
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `検証失敗: ${error.message}`,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="w-8 h-8" />
            データベースバックアップ管理
          </h1>
          <p className="text-gray-600 mt-2">
            データベース全体をバックアップ・復元できます
          </p>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <Alert variant={message.type === "success" ? "default" : "destructive"}>
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <AlertDescription className="whitespace-pre-line">
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* バックアップ作成 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              バックアップ作成
            </CardTitle>
            <CardDescription>
              データベース全体をSQLダンプ形式でバックアップします
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>バックアップに含まれるもの：</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>全テーブルの構造とデータ</li>
                <li>顧客情報、売上データ、広告データなど</li>
                <li>リレーションシップと制約</li>
              </ul>
            </div>

            <Button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isCreatingBackup ? (
                <>
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                  バックアップ作成中...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  バックアップを作成
                </>
              )}
            </Button>

            {backupUrl && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  バックアップURL
                </label>
                <Input
                  type="text"
                  value={backupUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(backupUrl);
                    setMessage({ type: "success", text: "URLをコピーしました" });
                  }}
                >
                  URLをコピー
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* バックアップ復元 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              バックアップ復元
            </CardTitle>
            <CardDescription>
              バックアップファイルからデータベースを復元します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>⚠️ 警告：</strong>
              </p>
              <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                <li>現在のデータはすべて上書きされます</li>
                <li>復元前に必ず最新のバックアップを作成してください</li>
                <li>復元中はシステムを使用しないでください</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                バックアップURL
              </label>
              <Input
                type="text"
                value={backupUrl}
                onChange={(e) => setBackupUrl(e.target.value)}
                placeholder="https://..."
                className="font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleVerifyBackup}
                disabled={isVerifying || !backupUrl}
                className="flex-1"
              >
                {isVerifying ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    検証中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    バックアップを検証
                  </>
                )}
              </Button>

              <Button
                onClick={handleRestoreBackup}
                disabled={isRestoring || !backupUrl}
                variant="destructive"
                className="flex-1"
              >
                {isRestoring ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    復元中...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    データベースを復元
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 使い方ガイド */}
        <Card>
          <CardHeader>
            <CardTitle>使い方ガイド</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                1. 定期的なバックアップ
              </h3>
              <p className="text-sm text-gray-600">
                毎日または毎週、「バックアップを作成」ボタンをクリックしてバックアップを作成してください。
                生成されたURLを安全な場所に保管してください。
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                2. バックアップの検証
              </h3>
              <p className="text-sm text-gray-600">
                復元前に「バックアップを検証」ボタンでバックアップファイルが正常か確認してください。
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                3. データベースの復元
              </h3>
              <p className="text-sm text-gray-600">
                問題が発生した場合、バックアップURLを入力して「データベースを復元」ボタンをクリックしてください。
                復元前に必ず現在のデータをバックアップしてください。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BackupManagement;
