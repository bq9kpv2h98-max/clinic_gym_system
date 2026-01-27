import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { QrCode, Users, Camera, FileText, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

export default function StaffTablet() {
  // 施術者用タブレット専用のPWAマニフェストを設定
  useEffect(() => {
    // 既存のマニフェストリンクを削除
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
      existingManifest.remove();
    }

    // 施術者用タブレット専用のマニフェストを追加
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest-tablet.json';
    document.head.appendChild(manifestLink);

    // クリーンアップ: コンポーネントがアンマウントされたら元のマニフェストに戻す
    return () => {
      manifestLink.remove();
      const defaultManifest = document.createElement('link');
      defaultManifest.rel = 'manifest';
      defaultManifest.href = '/manifest.json';
      document.head.appendChild(defaultManifest);
    };
  }, []);
  const [activeTab, setActiveTab] = useState("qr-codes");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // 顧客一覧取得
  const { data: customers, isLoading: customersLoading } = trpc.customers.list.useQuery();

  // QRコード用URL
  const baseUrl = window.location.origin;
  const newCustomerUrl = `${baseUrl}/register?type=new`;
  const existingCustomerUrl = `${baseUrl}/register?type=existing`;

  // URLコピー機能
  const copyToClipboard = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success(`${label}のURLをコピーしました`);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      toast.error("URLのコピーに失敗しました");
    }
  };

  // 顧客検索フィルター
  const filteredCustomers = customers?.filter((customer) =>
    customer.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.customerId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">施術者用タブレット</h1>
          <p className="text-muted-foreground mt-2">
            顧客登録・管理・カルテ作成を1ページで
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="qr-codes" className="flex flex-col gap-2 py-4">
              <QrCode className="h-6 w-6" />
              <span className="text-sm">QRコード</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex flex-col gap-2 py-4">
              <Users className="h-6 w-6" />
              <span className="text-sm">顧客リスト</span>
            </TabsTrigger>
            <TabsTrigger value="scanner" className="flex flex-col gap-2 py-4">
              <Camera className="h-6 w-6" />
              <span className="text-sm">QR読取</span>
            </TabsTrigger>
            <TabsTrigger value="medical-records" className="flex flex-col gap-2 py-4">
              <FileText className="h-6 w-6" />
              <span className="text-sm">カルテ</span>
            </TabsTrigger>
          </TabsList>

          {/* QRコード表示タブ */}
          <TabsContent value="qr-codes" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* 新規顧客QRコード */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    新規顧客登録
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center p-8 bg-white rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(newCustomerUrl)}`}
                      alt="新規顧客登録QRコード"
                      className="w-full max-w-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">URL:</p>
                    <div className="flex gap-2">
                      <Input
                        value={newCustomerUrl}
                        readOnly
                        className="text-sm"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(newCustomerUrl, "新規顧客登録")}
                      >
                        {copiedUrl === newCustomerUrl ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 既存顧客QRコード */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    既存顧客登録
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center p-8 bg-white rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(existingCustomerUrl)}`}
                      alt="既存顧客登録QRコード"
                      className="w-full max-w-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">URL:</p>
                    <div className="flex gap-2">
                      <Input
                        value={existingCustomerUrl}
                        readOnly
                        className="text-sm"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(existingCustomerUrl, "既存顧客登録")}
                      >
                        {copiedUrl === existingCustomerUrl ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 顧客リストタブ */}
          <TabsContent value="customers" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>顧客一覧</CardTitle>
                <Input
                  placeholder="顧客名またはIDで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-4"
                />
              </CardHeader>
              <CardContent>
                {customersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    読み込み中...
                  </div>
                ) : filteredCustomers && filteredCustomers.length > 0 ? (
                  <div className="space-y-2">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.customerId}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{customer.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {customer.customerId}
                          </p>
                          {customer.phone && (
                            <p className="text-sm text-muted-foreground">
                              TEL: {customer.phone}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // 顧客詳細ページへ遷移
                              window.location.href = `/customers/${customer.customerId}`;
                            }}
                          >
                            詳細
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "検索結果がありません" : "顧客が登録されていません"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* QRコード読み取りタブ */}
          <TabsContent value="scanner" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>QRコード読み取り</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    QRコード読み取り機能は準備中です
                  </p>
                  <p className="text-sm text-muted-foreground">
                    スタッフスキャナーページをご利用ください
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => {
                      window.location.href = "/staff/scanner";
                    }}
                  >
                    スタッフスキャナーを開く
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* カルテ管理タブ */}
          <TabsContent value="medical-records" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>カルテ管理</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    カルテ管理ページへ移動します
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => {
                      window.location.href = "/medical-records";
                    }}
                  >
                    カルテ管理を開く
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
