import { useRef, useEffect, useState } from "react";
import jsQR from "jsqr";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface QRPayload {
  id: string;
  type: string;
  timestamp: number;
  version: string;
}

export default function StaffCheckIn() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [lastScannedCustomerId, setLastScannedCustomerId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const getCustomerQuery = trpc.customers.getById.useQuery(
    { customerId: lastScannedCustomerId || "" },
    { enabled: !!lastScannedCustomerId }
  );

  const recordVisitMutation = trpc.customers.recordVisit.useMutation();

  // カメラの起動
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      toast.error("カメラへのアクセスが許可されていません");
      console.error(error);
    }
  };

  // カメラの停止
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  };

  // QRコード読み取り
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.drawImage(videoRef.current, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      try {
        const payload: QRPayload = JSON.parse(code.data);
        if (payload.type === "customer" && payload.id) {
          setLastScannedCustomerId(payload.id);
        }
      } catch (error) {
        console.error("Invalid QR code format", error);
      }
    }
  };

  // 定期的にQRコードをスキャン
  useEffect(() => {
    if (!isCameraActive) return;

    const interval = setInterval(scanQRCode, 300);
    return () => clearInterval(interval);
  }, [isCameraActive]);

  // 顧客情報取得後の処理
  useEffect(() => {
    if (getCustomerQuery.data && !isProcessing) {
      handleCheckIn();
    }
  }, [getCustomerQuery.data]);

  const handleCheckIn = async () => {
    if (!lastScannedCustomerId) return;

    setIsProcessing(true);
    try {
      await recordVisitMutation.mutateAsync({
        customerId: lastScannedCustomerId,
        pointsEarned: 10, // デフォルト10ポイント
        notes: "来院",
      });

      toast.success("来院登録が完了しました！");

      // 3秒後にリセット
      setTimeout(() => {
        setLastScannedCustomerId(null);
        setIsProcessing(false);
      }, 3000);
    } catch (error) {
      toast.error("来院登録に失敗しました");
      console.error(error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto mt-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>来院チェックイン</CardTitle>
            <CardDescription>
              顧客のQRコードを読み取って来院登録します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* カメラプレビュー */}
            <div className="space-y-4">
              {isCameraActive ? (
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full aspect-video object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* スキャン枠 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-4 border-green-500 rounded-lg opacity-50" />
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                  <Camera className="w-12 h-12 text-gray-400" />
                </div>
              )}

              {/* カメラコントロール */}
              <div className="flex gap-4">
                {!isCameraActive ? (
                  <Button onClick={startCamera} className="flex-1">
                    <Camera className="mr-2 h-4 w-4" />
                    カメラを起動
                  </Button>
                ) : (
                  <Button onClick={stopCamera} variant="destructive" className="flex-1">
                    カメラを停止
                  </Button>
                )}
              </div>
            </div>

            {/* スキャン結果 */}
            {lastScannedCustomerId && getCustomerQuery.data && (
              <div className="space-y-4">
                {isProcessing ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    <div>
                      <p className="font-semibold text-blue-900">処理中...</p>
                      <p className="text-sm text-blue-700">{getCustomerQuery.data.fullName}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-900">来院登録完了</p>
                        <p className="text-sm text-green-700 mt-1">
                          {getCustomerQuery.data.fullName}様
                        </p>
                        <p className="text-sm text-green-600 mt-1">
                          ポイント: +10ポイント
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* エラーメッセージ */}
            {getCustomerQuery.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">エラー</p>
                  <p className="text-sm text-red-700 mt-1">
                    顧客が見つかりません。QRコードを確認してください。
                  </p>
                </div>
              </div>
            )}

            {/* 使い方 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-sm mb-2">使い方</h3>
              <ol className="text-sm space-y-1 text-gray-700">
                <li>1. 「カメラを起動」をタップ</li>
                <li>2. 顧客のQRコードをカメラに向ける</li>
                <li>3. 自動で読み取られて来院登録完了</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
