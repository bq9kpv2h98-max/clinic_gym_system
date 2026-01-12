import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Clock, Database, FileText, Save, Loader } from "lucide-react";


const ScheduleManagement: React.FC = () => {
  const [backupCron, setBackupCron] = useState("0 3 * * *"); // 毎日深夜3時
  const [notionCron, setNotionCron] = useState("0 6 * * *"); // 毎朝6時

  // スケジュール設定取得
  const { data: scheduleConfig, isLoading } = trpc.schedule.getScheduleConfig.useQuery();

  // スケジュール設定更新
  const updateConfigMutation = trpc.schedule.updateScheduleConfig.useMutation({
    onSuccess: () => {
      alert("スケジュール設定を更新しました");
    },
    onError: (error: any) => {
      alert(`更新失敗: ${error.message}`);
    },
  });

  // 手動バックアップ実行
  const manualBackupMutation = trpc.schedule.runBackup.useMutation({
    onSuccess: () => {
      alert("バックアップを開始しました");
    },
    onError: (error: any) => {
      alert(`バックアップ失敗: ${error.message}`);
    },
  });

  // 手動Notion同期実行
  const manualNotionSyncMutation = trpc.schedule.runNotionSync.useMutation({
    onSuccess: () => {
      alert("Notion同期を開始しました");
    },
    onError: (error: any) => {
      alert(`同期失敗: ${error.message}`);
    },
  });

  const handleSaveSchedule = () => {
    updateConfigMutation.mutate({
      backupEnabled: true,
      backupCron,
      notionSyncEnabled: true,
      notionSyncCron: notionCron,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-6 h-6" />
              定期バックアップスケジュール設定
            </CardTitle>
            <CardDescription>
              自動バックアップとNotion同期のスケジュールを管理します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                {/* SQLダンプバックアップ設定 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">SQLダンプバックアップ</h3>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 mb-2">
                      データベース全体をSQLダンプ形式でS3に保存します
                    </p>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cron式</label>
                      <Input
                        value={backupCron}
                        onChange={(e) => setBackupCron(e.target.value)}
                        placeholder="0 3 * * *"
                      />
                      <p className="text-xs text-gray-600">
                        現在の設定: {backupCron} （毎日深夜3時）
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => manualBackupMutation.mutate()}
                    disabled={manualBackupMutation.isPending}
                    className="w-full"
                  >
                    {manualBackupMutation.isPending ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        バックアップ実行中...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        今すぐバックアップを実行
                      </>
                    )}
                  </Button>
                </div>

                {/* Notion同期設定 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-lg">Notion自動同期</h3>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                    <p className="text-sm text-purple-800 mb-2">
                      顧客情報、売上サマリー、広告データをNotionに同期します
                    </p>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cron式</label>
                      <Input
                        value={notionCron}
                        onChange={(e) => setNotionCron(e.target.value)}
                        placeholder="0 6 * * *"
                      />
                      <p className="text-xs text-gray-600">
                        現在の設定: {notionCron} （毎朝6時）
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => manualNotionSyncMutation.mutate({
                      customersDatabaseId: 'notion-customers-db',
                      salesDatabaseId: 'notion-sales-db',
                      advertisingDatabaseId: 'notion-advertising-db',
                    })}
                    disabled={manualNotionSyncMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    {manualNotionSyncMutation.isPending ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        同期実行中...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        今すぐNotion同期を実行
                      </>
                    )}
                  </Button>
                </div>

                {/* Cron式ガイド */}
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Cron式ガイド</h4>
                  <div className="text-sm space-y-1 text-gray-700">
                    <p>• <code className="bg-white px-2 py-1 rounded">0 3 * * *</code> - 毎日午前3時</p>
                    <p>• <code className="bg-white px-2 py-1 rounded">0 */6 * * *</code> - 6時間ごと</p>
                    <p>• <code className="bg-white px-2 py-1 rounded">0 0 * * 0</code> - 毎週日曜日午前0時</p>
                    <p>• <code className="bg-white px-2 py-1 rounded">0 0 1 * *</code> - 毎月1日午前0時</p>
                  </div>
                </div>

                {/* 保存ボタン */}
                <Button
                  onClick={handleSaveSchedule}
                  disabled={updateConfigMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {updateConfigMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      スケジュール設定を保存
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScheduleManagement;
