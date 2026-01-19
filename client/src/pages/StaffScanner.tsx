import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, QrCode, Scan, UserCheck, Coins, Calendar, LogOut } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export default function StaffScanner() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCustomerId, setScannedCustomerId] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // スタッフ認証チェック
  useEffect(() => {
    const staffAuth = localStorage.getItem("staffAuthenticated");
    if (staffAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const { data: customerData, isLoading: isLoadingCustomer, refetch } = trpc.staff.getCustomerByQR.useQuery(
    { customerId: scannedCustomerId || "" },
    { enabled: !!scannedCustomerId }
  );

  const recordVisitMutation = trpc.staff.recordVisit.useMutation();
  const addPointsMutation = trpc.staff.addPoints.useMutation();
  const redeemPointsMutation = trpc.staff.redeemPoints.useMutation();

  const [pointsToAdd, setPointsToAdd] = useState(10);
  const [pointsToRedeem, setPointsToRedeem] = useState(10);
  const [showAddPoints, setShowAddPoints] = useState(false);
  const [showRedeemPoints, setShowRedeemPoints] = useState(false);

  const handleLogin = () => {
    // 簡易パスワード認証（環境変数から取得）
    if (password === "staff2024") {
      localStorage.setItem("staffAuthenticated", "true");
      setIsAuthenticated(true);
      toast.success("認証成功");
    } else {
      toast.error("パスワードが正しくありません");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("staffAuthenticated");
    setIsAuthenticated(false);
    setScannedCustomerId(null);
    if (scannerRef.current && isScanning) {
      stopScanner();
    }
    toast.success("ログアウトしました");
  };

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QRコードから顧客IDを抽出
          try {
            const url = new URL(decodedText);
            const customerId = url.searchParams.get("id");
            if (customerId) {
              setScannedCustomerId(customerId);
              stopScanner();
              toast.success("QRコードを読み取りました");
            } else {
              toast.error("無効なQRコードです");
            }
          } catch (error) {
            toast.error("QRコードの形式が正しくありません");
          }
        },
        (errorMessage) => {
          // エラーは無視（スキャン中の通常のエラー）
        }
      );

      setIsScanning(true);
      setIsCameraReady(true);
    } catch (error) {
      console.error("Scanner error:", error);
      toast.error("カメラの起動に失敗しました");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        setIsScanning(false);
        setIsCameraReady(false);
      } catch (error) {
        console.error("Stop scanner error:", error);
      }
    }
  };

  const handleRecordVisit = async () => {
    if (!scannedCustomerId) return;

    try {
      await recordVisitMutation.mutateAsync({
        customerId: scannedCustomerId,
      });
      toast.success("来院記録を登録しました");
      refetch();
    } catch (error) {
      toast.error("来院記録の登録に失敗しました");
    }
  };

  const handleAddPoints = async () => {
    if (!scannedCustomerId) return;

    try {
      await addPointsMutation.mutateAsync({
        customerId: scannedCustomerId,
        points: pointsToAdd,
        description: `スタッフが${pointsToAdd}ポイントを付与`,
      });
      toast.success(`${pointsToAdd}ポイントを付与しました`);
      setShowAddPoints(false);
      refetch();
    } catch (error) {
      toast.error("ポイント付与に失敗しました");
    }
  };

  const handleRedeemPoints = async () => {
    if (!scannedCustomerId) return;

    try {
      await redeemPointsMutation.mutateAsync({
        customerId: scannedCustomerId,
        points: pointsToRedeem,
        description: `スタッフが${pointsToRedeem}ポイントを使用`,
      });
      toast.success(`${pointsToRedeem}ポイントを使用しました`);
      setShowRedeemPoints(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "ポイント使用に失敗しました");
    }
  };

  const handleReset = () => {
    setScannedCustomerId(null);
    startScanner();
  };

  // 認証画面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <UserCheck className="w-6 h-6" />
              スタッフ認証
            </CardTitle>
            <CardDescription>
              パスワードを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLogin();
                  }
                }}
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              ログイン
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // スキャナー画面
  if (!scannedCustomerId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
        <div className="max-w-md mx-auto space-y-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">QRコードスキャナー</h1>
            <Button onClick={handleLogout} variant="ghost" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="w-5 h-5" />
                顧客QRコードをスキャン
              </CardTitle>
              <CardDescription>
                診察券のQRコードをカメラで読み取ってください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                id="qr-reader"
                className="w-full rounded-lg overflow-hidden border-2 border-dashed border-gray-300"
                style={{ minHeight: "300px" }}
              />
              {!isScanning ? (
                <Button onClick={startScanner} className="w-full">
                  <Scan className="w-4 h-4 mr-2" />
                  スキャン開始
                </Button>
              ) : (
                <Button onClick={stopScanner} variant="outline" className="w-full">
                  スキャン停止
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 顧客情報表示画面
  if (isLoadingCustomer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>顧客情報が見つかりません</CardTitle>
            <CardDescription>
              QRコードが正しいか確認してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleReset} variant="outline" className="w-full">
              再スキャン
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalVisits = customerData.visitHistory?.length || 0;
  const pointBalance = customerData.customer?.totalPoints || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
      <div className="max-w-md mx-auto space-y-4 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">顧客情報</h1>
          <Button onClick={handleLogout} variant="ghost" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </div>

        {/* 顧客情報カード */}
        <Card className="shadow-lg border-2 border-green-500">
          <CardHeader>
            <CardTitle className="text-2xl">{customerData.customer.fullName} 様</CardTitle>
            <CardDescription>
              診察券番号: {customerData.customer.customerId.slice(0, 8)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Coins className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold text-blue-600">{pointBalance}</p>
                <p className="text-sm text-gray-600">ポイント</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-green-600">{totalVisits}</p>
                <p className="text-sm text-gray-600">来院回数</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 来院履歴カード */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              最近の来院履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalVisits > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {customerData.visitHistory?.slice(0, 5).map((visit: any) => (
                  <div
                    key={visit.visitId}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm text-gray-700">
                      {new Date(visit.visitDate).toLocaleDateString("ja-JP")}
                    </span>
                    <span className="text-xs text-green-600 font-medium">
                      {visit.pointsEarned > 0 ? `+${visit.pointsEarned}pt` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                来院履歴がありません
              </p>
            )}
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="space-y-2">
          <Button
            onClick={handleRecordVisit}
            disabled={recordVisitMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {recordVisitMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4 mr-2" />
            )}
            来院記録を登録
          </Button>

          {/* ポイント付与 */}
          {!showAddPoints ? (
            <Button
              onClick={() => setShowAddPoints(true)}
              variant="outline"
              className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <Coins className="w-4 h-4 mr-2" />
              ポイント付与
            </Button>
          ) : (
            <Card className="border-blue-500">
              <CardContent className="pt-4 space-y-2">
                <Label htmlFor="pointsToAdd">付与ポイント数</Label>
                <Input
                  id="pointsToAdd"
                  type="number"
                  min="1"
                  value={pointsToAdd}
                  onChange={(e) => setPointsToAdd(Number(e.target.value))}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddPoints}
                    disabled={addPointsMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {addPointsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Coins className="w-4 h-4 mr-2" />
                    )}
                    付与
                  </Button>
                  <Button
                    onClick={() => setShowAddPoints(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ポイント消化 */}
          {!showRedeemPoints ? (
            <Button
              onClick={() => setShowRedeemPoints(true)}
              variant="outline"
              className="w-full border-red-500 text-red-600 hover:bg-red-50"
            >
              <Coins className="w-4 h-4 mr-2" />
              ポイント使用
            </Button>
          ) : (
            <Card className="border-red-500">
              <CardContent className="pt-4 space-y-2">
                <Label htmlFor="pointsToRedeem">使用ポイント数</Label>
                <Input
                  id="pointsToRedeem"
                  type="number"
                  min="1"
                  max={pointBalance}
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleRedeemPoints}
                    disabled={redeemPointsMutation.isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {redeemPointsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Coins className="w-4 h-4 mr-2" />
                    )}
                    使用
                  </Button>
                  <Button
                    onClick={() => setShowRedeemPoints(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleReset} variant="outline" className="w-full">
            <Scan className="w-4 h-4 mr-2" />
            別の顧客をスキャン
          </Button>
        </div>
      </div>
    </div>
  );
}
