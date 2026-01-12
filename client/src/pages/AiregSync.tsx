import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Loader2, CheckCircle, XCircle, RefreshCw, Database } from "lucide-react";

export function AiregSync() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // デフォルトは過去7日間
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    syncedCount?: number;
    skippedCount?: number;
    totalCount?: number;
    errors?: string[];
  } | null>(null);

  const { data: lastSyncData } = trpc.aireg.getLastSyncTime.useQuery();
  const testConnectionMutation = trpc.aireg.testConnection.useQuery();
  const syncMutation = trpc.aireg.syncSalesData.useMutation({
    onSuccess: (data) => {
      setSyncResult(data);
    },
    onError: (error) => {
      setSyncResult({
        success: false,
        message: error.message,
      });
    },
  });

  const handleSync = () => {
    if (!startDate || !endDate) {
      alert("開始日と終了日を入力してください");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("開始日は終了日より前である必要があります");
      return;
    }

    setSyncResult(null);
    syncMutation.mutate({ startDate, endDate });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">エアレジAPI連携</h1>
        <p className="text-muted-foreground mt-2">
          エアレジから売上データを自動で取得・反映します
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 接続ステータス */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              接続ステータス
            </CardTitle>
            <CardDescription>エアレジAPIとの接続状態を確認</CardDescription>
          </CardHeader>
          <CardContent>
            {testConnectionMutation.isPending ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                接続テスト中...
              </div>
            ) : testConnectionMutation.data?.success ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">接続成功</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">接続失敗</span>
              </div>
            )}
            {testConnectionMutation.data?.message && (
              <p className="mt-2 text-sm text-muted-foreground">
                {testConnectionMutation.data.message}
              </p>
            )}
            {lastSyncData?.lastSyncTime && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">最後の同期</p>
                <p className="text-sm font-medium">
                  {new Date(lastSyncData.lastSyncTime).toLocaleString("ja-JP")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 手動同期 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              手動同期
            </CardTitle>
            <CardDescription>期間を指定して売上データを取得</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">開始日</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">終了日</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleSync}
                disabled={syncMutation.isPending}
                className="w-full"
              >
                {syncMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    同期中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    売上データを同期
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 同期結果 */}
      {syncResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>同期結果</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant={syncResult.success ? "default" : "destructive"}>
              <AlertDescription>
                <div className="flex items-start gap-2">
                  {syncResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{syncResult.message}</p>
                    {syncResult.success && syncResult.syncedCount !== undefined && (
                      <div className="mt-2 text-sm">
                        <p>総件数: {syncResult.totalCount}件</p>
                        <p>同期成功: {syncResult.syncedCount}件</p>
                        <p>スキップ: {syncResult.skippedCount}件</p>
                      </div>
                    )}
                    {syncResult.errors && syncResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">エラー詳細:</p>
                        <ul className="mt-1 text-sm list-disc list-inside">
                          {syncResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* 使い方ガイド */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>使い方ガイド</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">1. 認証情報の設定</h3>
              <p className="text-muted-foreground">
                エアレジAPIキーとAPIトークンは環境変数として設定済みです。
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">2. 手動同期</h3>
              <p className="text-muted-foreground">
                開始日と終了日を指定して、エアレジから売上データを取得します。
                過去2ヶ月前までのデータを取得できます。
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">3. 顧客との紐付け</h3>
              <p className="text-muted-foreground">
                エアレジの取引データに電話番号が含まれている場合、自動的に顧客と紐付けられます。
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">4. 重複チェック</h3>
              <p className="text-muted-foreground">
                すでに同期済みの取引は自動的にスキップされます。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
