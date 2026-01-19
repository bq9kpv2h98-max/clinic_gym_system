import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, QrCode, Coins, Calendar, LogOut } from "lucide-react";

export default function CustomerHome() {
  const [phone, setPhone] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  // ローカルストレージから電話番号を復元
  useEffect(() => {
    const savedPhone = localStorage.getItem("customerPhone");
    if (savedPhone) {
      setPhone(savedPhone);
      setIsLoggedIn(true);
    }
  }, []);

  const loginMutation = trpc.mypage.login.useMutation();
  const { data: mypageData, isLoading: isLoadingMypage, refetch } = trpc.mypage.getMyPageData.useQuery(
    { customerId: customerId || "" },
    { enabled: !!customerId }
  );

  const handleLogin = async () => {
    if (phone.length >= 10) {
      try {
        const result = await loginMutation.mutateAsync({ phone });
        localStorage.setItem("customerPhone", phone);
        setCustomerId(result.customerId);
        setIsLoggedIn(true);
        toast.success("ログインしました");
      } catch (error) {
        toast.error("登録されていない電話番号です");
      }
    } else {
      toast.error("正しい電話番号を入力してください");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("customerPhone");
    setPhone("");
    setIsLoggedIn(false);
    setCustomerId(null);
    toast.success("ログアウトしました");
  };

  // 保存された電話番号で自動ログイン
  useEffect(() => {
    const savedPhone = localStorage.getItem("customerPhone");
    if (savedPhone && !customerId) {
      setPhone(savedPhone);
      loginMutation.mutateAsync({ phone: savedPhone }).then((result) => {
        setCustomerId(result.customerId);
        setIsLoggedIn(true);
      }).catch(() => {
        localStorage.removeItem("customerPhone");
        setIsLoggedIn(false);
      });
    }
  }, []);

  // ログイン画面
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>診察券マイページ</CardTitle>
            <CardDescription>
              電話番号を入力してログインしてください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="09012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
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

  // ローディング画面
  if (isLoadingMypage || loginMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // 顧客が見つからない場合
  if (!mypageData || !mypageData.customer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>顧客情報が見つかりません</CardTitle>
            <CardDescription>
              電話番号が正しいか確認してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              再ログイン
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerData = mypageData?.customer;
  const visits = mypageData?.visitHistory || [];
  const totalVisits = visits.length;
  const pointBalance = customerData?.totalPoints || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-md mx-auto space-y-4 py-4">
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">マイページ</h1>
          <Button onClick={handleLogout} variant="ghost" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </div>

        {/* 顧客情報カード */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">{customerData.fullName} 様</CardTitle>
            <CardDescription>診察券番号: {customerData.customerId.slice(0, 8)}</CardDescription>
          </CardHeader>
        </Card>

        {/* QRコードカード */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              診察券QRコード
            </CardTitle>
            <CardDescription>
              来院時にスタッフに見せてください
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {customerData.qrCodeImageUrl ? (
              <img
                src={customerData.qrCodeImageUrl}
                alt="QR Code"
                className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg p-2"
              />
            ) : (
              <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg p-2 flex items-center justify-center">
                <p className="text-gray-500 text-sm text-center">
                  QRコードが見つかりません
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ポイント残高カード */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              ポイント残高
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{pointBalance}</p>
              <p className="text-sm text-gray-500 mt-1">ポイント</p>
            </div>
          </CardContent>
        </Card>

        {/* 来院履歴カード */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              来院履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMypage ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : totalVisits > 0 ? (
              <div className="space-y-3">
                <div className="text-center py-2 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{totalVisits}</p>
                  <p className="text-sm text-gray-600">回来院</p>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {visits.slice(0, 5).map((visit: any) => (
                    <div
                      key={visit.visitId}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm text-gray-700">
                        {new Date(visit.visitDate).toLocaleDateString("ja-JP")}
                      </span>
                      <span className="text-xs text-gray-500">
                        {visit.pointsEarned > 0 ? `+${visit.pointsEarned}pt` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                来院履歴がありません
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
