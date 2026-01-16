/**
 * cronジョブ実行履歴ダッシュボード
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, Clock, CheckCircle, XCircle } from "lucide-react";


export default function CronJobsPage() {
  const [selectedJob, setSelectedJob] = useState<"all" | "sync-notion-customers" | "link-reservations">("all");

  // 最新のcronジョブ実行履歴を取得
  const { data: latestLogs, refetch: refetchLatest } = trpc.cronJobs.getLatestLogs.useQuery();

  // cronジョブ実行履歴一覧を取得
  const { data: logs, refetch: refetchLogs, isLoading } = trpc.cronJobs.getLogs.useQuery({
    jobName: selectedJob,
    limit: 20,
    offset: 0,
  });

  // 手動実行
  const runJobMutation = trpc.cronJobs.runJob.useMutation({
    onSuccess: (data) => {
      alert(`${data.jobName}が正常に実行されました`);
      refetchLatest();
      refetchLogs();
    },
    onError: (error) => {
      alert(`実行エラー: ${error.message}`);
    },
  });

  const handleRunJob = (jobName: "sync-notion-customers" | "link-reservations") => {
    if (confirm(`${jobName === "sync-notion-customers" ? "Notion顧客同期" : "予約紐付け"}を手動実行しますか？`)) {
      runJobMutation.mutate({ jobName });
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("ja-JP");
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">cronジョブ管理</h1>
        <p className="text-muted-foreground mt-2">
          定期実行されるジョブの履歴と手動実行
        </p>
      </div>

      {/* 最新の実行状況 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Notion顧客同期 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Notion顧客同期</span>
              {latestLogs?.syncCustomers?.status === "success" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
            <CardDescription>毎日午前3時に自動実行</CardDescription>
          </CardHeader>
          <CardContent>
            {latestLogs?.syncCustomers ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">最終実行</span>
                  <span>{formatDate(latestLogs.syncCustomers.completedAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">処理時間</span>
                  <span>{formatDuration(latestLogs.syncCustomers.duration)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">対象顧客</span>
                  <span>{latestLogs.syncCustomers.totalItems}件</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">成功/失敗</span>
                  <span>
                    <span className="text-green-600">{latestLogs.syncCustomers.successCount}</span>
                    {" / "}
                    <span className="text-red-600">{latestLogs.syncCustomers.failedCount}</span>
                  </span>
                </div>
                <Button
                  onClick={() => handleRunJob("sync-notion-customers")}
                  disabled={runJobMutation.isPending}
                  className="w-full mt-4"
                  variant="outline"
                >
                  <Play className="h-4 w-4 mr-2" />
                  手動実行
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                実行履歴がありません
              </div>
            )}
          </CardContent>
        </Card>

        {/* 予約紐付け */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>予約紐付け</span>
              {latestLogs?.linkReservations?.status === "success" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
            <CardDescription>毎日午前4時に自動実行</CardDescription>
          </CardHeader>
          <CardContent>
            {latestLogs?.linkReservations ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">最終実行</span>
                  <span>{formatDate(latestLogs.linkReservations.completedAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">処理時間</span>
                  <span>{formatDuration(latestLogs.linkReservations.duration)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">対象予約</span>
                  <span>{latestLogs.linkReservations.totalItems}件</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">成功/失敗</span>
                  <span>
                    <span className="text-green-600">{latestLogs.linkReservations.successCount}</span>
                    {" / "}
                    <span className="text-red-600">{latestLogs.linkReservations.failedCount}</span>
                  </span>
                </div>
                <Button
                  onClick={() => handleRunJob("link-reservations")}
                  disabled={runJobMutation.isPending}
                  className="w-full mt-4"
                  variant="outline"
                >
                  <Play className="h-4 w-4 mr-2" />
                  手動実行
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                実行履歴がありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 実行履歴一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>実行履歴</CardTitle>
              <CardDescription>cronジョブの実行履歴を表示</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value as any)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">すべて</option>
                <option value="sync-notion-customers">Notion顧客同期</option>
                <option value="link-reservations">予約紐付け</option>
              </select>
              <Button onClick={() => refetchLogs()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ジョブ名</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>実行日時</TableHead>
                  <TableHead>処理時間</TableHead>
                  <TableHead>対象件数</TableHead>
                  <TableHead>成功</TableHead>
                  <TableHead>失敗</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.jobName === "sync-notion-customers" ? "Notion顧客同期" : "予約紐付け"}
                    </TableCell>
                    <TableCell>
                      {log.status === "success" ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          成功
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          失敗
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(log.completedAt)}</TableCell>
                    <TableCell>{formatDuration(log.duration)}</TableCell>
                    <TableCell>{log.totalItems}</TableCell>
                    <TableCell className="text-green-600">{log.successCount}</TableCell>
                    <TableCell className="text-red-600">{log.failedCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              実行履歴がありません
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
