import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Link as LinkIcon, Unlink, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function NotionLink() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [notionSearchQuery, setNotionSearchQuery] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"link" | "history">("link");

  const utils = trpc.useUtils();

  // 未連携顧客一覧を取得
  const unlinkedCustomersQuery = trpc.notionLink.getUnlinkedCustomers.useQuery({
    search: searchQuery,
    limit: 50,
    offset: 0,
  });

  // Notion顧客を検索
  const { data: notionCustomers, isLoading: isLoadingNotion } = trpc.notionLink.searchNotionCustomers.useQuery(
    { name: notionSearchQuery },
    { enabled: notionSearchQuery.length > 0 }
  );

  // 同期履歴を取得
  const syncLogsQuery = trpc.notionLink.getSyncLogs.useQuery(
    { limit: 20, offset: 0 },
    { enabled: activeTab === "history" }
  );

  // 紐付けMutation
  const linkMutation = trpc.notionLink.linkCustomerToNotion.useMutation({
    onSuccess: () => {
      toast.success("顧客とNotionを紐付けました");
      setShowLinkDialog(false);
      setSelectedCustomer(null);
      setNotionSearchQuery("");
      utils.notionLink.getUnlinkedCustomers.invalidate();
    },
    onError: (error) => {
      toast.error(`紐付けに失敗しました: ${error.message}`);
    },
  });

  // 全同期Mutation
  const syncAllMutation = trpc.notionLink.syncAllCustomersFromNotion.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.errorCount > 0) {
        toast.warning(`${data.errorCount}件のエラーがありました`);
      }
      syncLogsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`同期に失敗しました: ${error.message}`);
    },
  });

  const handleLinkCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setNotionSearchQuery(customer.fullName);
    setShowLinkDialog(true);
  };

  const handleConfirmLink = (notionCustomer: any) => {
    if (!selectedCustomer) return;

    linkMutation.mutate({
      customerId: selectedCustomer.customerId,
      notionPageId: notionCustomer.id,
      notionPageUrl: notionCustomer.url,
    });
  };

  const handleSyncAll = () => {
    if (confirm("全ての紐付け済み顧客をNotionから同期しますか？")) {
      syncAllMutation.mutate();
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notion連携管理</h1>
        <p className="text-muted-foreground">
          既存顧客とNotionの顧客マスターを手動で紐付け、同期履歴を確認できます
        </p>
      </div>

      {/* タブ */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("link")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "link"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          顧客連携
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "history"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          同期履歴
        </button>
      </div>

      {activeTab === "link" && (
        <>
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="顧客名、電話番号、メールアドレスで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSyncAll} disabled={syncAllMutation.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
              全件同期
            </Button>
          </div>

          {unlinkedCustomersQuery.isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          ) : unlinkedCustomersQuery.data && unlinkedCustomersQuery.data.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium mb-2">全ての顧客が連携済みです</p>
                <p className="text-muted-foreground">未連携の顧客はありません</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {unlinkedCustomersQuery.data?.map((customer) => (
                <Card key={customer.customerId}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{customer.fullName}</CardTitle>
                        <CardDescription className="mt-2 space-y-1">
                          <div>電話: {customer.phone}</div>
                          {customer.email && <div>メール: {customer.email}</div>}
                          <div>登録日: {new Date(customer.registrationDate).toLocaleDateString("ja-JP")}</div>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">未連携</Badge>
                        <Button
                          size="sm"
                          onClick={() => handleLinkCustomer(customer)}
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          連携
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle>同期履歴</CardTitle>
            <CardDescription>
              Notion顧客情報の同期実行履歴
            </CardDescription>
          </CardHeader>
          <CardContent>
            {syncLogsQuery.isLoading && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">読み込み中...</p>
              </div>
            )}

            {syncLogsQuery.data && syncLogsQuery.data.length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">同期履歴がありません</p>
              </div>
            )}

            {syncLogsQuery.data && syncLogsQuery.data.length > 0 && (
              <div className="space-y-4">
                {syncLogsQuery.data.map((log: any) => (
                  <div
                    key={log.syncId}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            log.status === "success"
                              ? "bg-green-100 text-green-800"
                              : log.status === "partial"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {log.status === "success"
                            ? "成功"
                            : log.status === "partial"
                            ? "一部失敗"
                            : "失敗"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {log.syncType === "manual" ? "手動同期" : "自動同期"}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("ja-JP")}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">対象:</span>
                        <span className="ml-2 font-medium">{log.totalCustomers}件</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">成功:</span>
                        <span className="ml-2 font-medium text-green-600">
                          {log.successCount}件
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">エラー:</span>
                        <span className="ml-2 font-medium text-red-600">
                          {log.errorCount}件
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      実行時間: {(log.executionTime / 1000).toFixed(2)}秒
                    </div>

                    {log.errors && JSON.parse(log.errors as string).length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                        <p className="font-medium text-red-800 mb-1">エラー詳細:</p>
                        <ul className="list-disc list-inside text-red-700">
                          {JSON.parse(log.errors as string).map((error: string, i: number) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 連携ダイアログ */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notion顧客と紐付け</DialogTitle>
            <DialogDescription>
              {selectedCustomer?.fullName} と紐付けるNotion顧客を選択してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Notion顧客を検索..."
                value={notionSearchQuery}
                onChange={(e) => setNotionSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoadingNotion ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">検索中...</p>
              </div>
            ) : notionCustomers && notionCustomers.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {notionCustomers.map((notionCustomer) => (
                  <Card
                    key={notionCustomer.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleConfirmLink(notionCustomer)}
                  >
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{notionCustomer.name}</CardTitle>
                          <CardDescription className="mt-1 text-sm">
                            {notionCustomer.phone && <div>電話: {notionCustomer.phone}</div>}
                            {notionCustomer.email && <div>メール: {notionCustomer.email}</div>}
                            {notionCustomer.customerNumber && (
                              <div>顧客番号: {notionCustomer.customerNumber}</div>
                            )}
                          </CardDescription>
                        </div>
                        <Button size="sm" variant="outline">
                          選択
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : notionSearchQuery.length > 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">該当するNotion顧客が見つかりませんでした</p>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
