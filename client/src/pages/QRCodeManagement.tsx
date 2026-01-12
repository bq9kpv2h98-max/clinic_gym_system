import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Plus,
  Download,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  AlertCircle,
  Loader,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const QRCodeManagement: React.FC = () => {
  const [facilityId, setFacilityId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const qrCodesQuery = trpc.qrcode.listQrCodes.useQuery(
    { facilityId: facilityId || "default" },
    { enabled: !!facilityId }
  );

  const generateQRMutation = trpc.qrcode.generateQrCode.useMutation();
  const toggleStatusMutation = trpc.qrcode.toggleQrCodeStatus.useMutation();
  const statsQuery = trpc.qrcode.getQrCodeStats.useQuery(
    { facilityId: facilityId || "default" },
    { enabled: !!facilityId }
  );

  const utils = trpc.useUtils();

  // QRコード生成
  const handleGenerateQR = async () => {
    if (!facilityId) {
      setMessage({ type: "error", text: "施設IDを入力してください" });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const result = await generateQRMutation.mutateAsync({
        facilityId,
        facilityName: facilityId,
        registrationUrl: `${window.location.origin}/register-qr`,
      });
      setMessage({
        type: "success",
        text: `QRコード生成完了！\nQRコードID: ${result.qrCodeId}`,
      });
      
      // リストを再取得
      await utils.qrcode.listQrCodes.invalidate();
      await utils.qrcode.getQrCodeStats.invalidate();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `QRコード生成失敗: ${error.message}`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // QRコードステータス切り替え
  const handleToggleStatus = async (qrCodeId: string, currentStatus: boolean) => {
    try {
      await toggleStatusMutation.mutateAsync({
        qrCodeId,
        isActive: !currentStatus ? 1 : 0,
      });

      setMessage({
        type: "success",
        text: `QRコードを${!currentStatus ? "有効" : "無効"}にしました`,
      });

      // リストを再取得
      await utils.qrcode.listQrCodes.invalidate();
      await utils.qrcode.getQrCodeStats.invalidate();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `ステータス変更失敗: ${error.message}`,
      });
    }
  };

  // QRコード画像ダウンロード
  const handleDownloadQR = (qrCodeImageUrl: string, qrCodeId: string) => {
    const link = document.createElement("a");
    link.href = qrCodeImageUrl;
    link.download = `qrcode_${qrCodeId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <QrCode className="w-8 h-8" />
            QRコード管理
          </h1>
          <p className="text-gray-600 mt-2">
            セルフレジストレーション用QRコードを生成・管理できます
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

        {/* QRコード生成 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              新しいQRコードを生成
            </CardTitle>
            <CardDescription>
              施設IDを入力してQRコードを生成します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="facilityId">施設ID</Label>
              <Input
                id="facilityId"
                type="text"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                placeholder="例: facility_001"
              />
              <p className="text-sm text-gray-500">
                施設ごとにユニークなIDを入力してください
              </p>
            </div>

            <Button
              onClick={handleGenerateQR}
              disabled={isGenerating || !facilityId}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                  生成中...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  QRコードを生成
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 統計情報 */}
        {facilityId && statsQuery.data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                統計情報
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">総登録試行</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {statsQuery.data.totalAttempts}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">完了した登録</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {statsQuery.data.completedRegistrations}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600 font-medium">放棄された登録</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">
                    {statsQuery.data.abandonedAttempts}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium">コンバージョン率</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {statsQuery.data.conversionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QRコード一覧 */}
        {facilityId && qrCodesQuery.data && (
          <Card>
            <CardHeader>
              <CardTitle>QRコード一覧</CardTitle>
              <CardDescription>
                生成されたQRコードの一覧と管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qrCodesQuery.data.length === 0 ? (
                <div className="text-center py-12">
                  <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">QRコードがまだ生成されていません</p>
                  <p className="text-sm text-gray-400 mt-2">
                    上のフォームから新しいQRコードを生成してください
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {qrCodesQuery.data.map((qr: any) => (
                    <div
                      key={qr.qrCodeId}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          {/* QRコード画像 */}
                          <div className="flex-shrink-0">
                            <img
                              src={qr.qrCodeImageUrl}
                              alt={`QR Code ${qr.qrCodeId}`}
                              className="w-32 h-32 border border-gray-300 rounded"
                            />
                          </div>

                          {/* QRコード情報 */}
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-gray-500">QRコードID</p>
                              <p className="font-mono text-sm font-medium">
                                {qr.qrCodeId}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-500">登録フォームURL</p>
                              <a
                                href={qr.registrationFormUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm font-mono"
                              >
                                {qr.registrationFormUrl}
                              </a>
                            </div>

                            <div>
                              <p className="text-sm text-gray-500">ステータス</p>
                              <Badge
                                variant={qr.isActive ? "default" : "secondary"}
                                className={
                                  qr.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {qr.isActive ? "有効" : "無効"}
                              </Badge>
                            </div>

                            <div>
                              <p className="text-sm text-gray-500">作成日時</p>
                              <p className="text-sm">
                                {new Date(qr.createdAt).toLocaleString("ja-JP")}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* アクション */}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadQR(qr.qrCodeImageUrl, qr.qrCodeId)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            ダウンロード
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(qr.qrCodeId, qr.isActive)}
                          >
                            {qr.isActive ? (
                              <>
                                <ToggleRight className="w-4 h-4 mr-2" />
                                無効にする
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 mr-2" />
                                有効にする
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 使い方ガイド */}
        <Card>
          <CardHeader>
            <CardTitle>使い方ガイド</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                1. QRコードの生成
              </h3>
              <p className="text-sm text-gray-600">
                施設IDを入力して「QRコードを生成」ボタンをクリックします。
                生成されたQRコードは自動的に一覧に表示されます。
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                2. QRコードのダウンロード
              </h3>
              <p className="text-sm text-gray-600">
                「ダウンロード」ボタンをクリックして、QRコード画像をダウンロードします。
                印刷して施設の受付やトレーニングルームに掲示してください。
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                3. QRコードの有効/無効切り替え
              </h3>
              <p className="text-sm text-gray-600">
                「有効にする/無効にする」ボタンでQRコードの状態を切り替えられます。
                無効にしたQRコードは使用できなくなります。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRCodeManagement;
