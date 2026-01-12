import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";
import { trpc } from "@/lib/trpc";

type RegistrationStep = "qrcode" | "form" | "confirmation" | "error";

interface RegistrationData {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
}

const SelfRegistration: React.FC = () => {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<RegistrationStep>("qrcode");
  const [sessionToken, setSessionToken] = useState<string>("");
  const [facilityName, setFacilityName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<RegistrationData>({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    postalCode: "",
    prefecture: "",
    city: "",
    addressLine1: "",
    addressLine2: "",
  });

  // URLパラメータからQRコードIDを取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrId = params.get("qrId");
    const token = params.get("token");

    if (token) {
      setSessionToken(token);
      setStep("form");
    } else if (qrId) {
      handleQrCodeScanned(qrId);
    }
  }, []);

  // QRコードスキャン処理
  const startRegistrationMutation = trpc.qrcode.startRegistration.useMutation();
  const updateStatusMutation = trpc.qrcode.updateRegistrationStatus.useMutation();

  const handleQrCodeScanned = async (qrCodeId: string) => {
    setIsLoading(true);
    try {
      const result = await startRegistrationMutation.mutateAsync({
        qrCodeId,
      });

      setSessionToken(result.sessionToken);
      setFacilityName(result.facilityName);
      setStep("form");
    } catch (err: any) {
      setError(err.message || "QRコードが無効です");
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  // フォーム入力変更
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 顧客登録API
  const registerMutation = trpc.customers.register.useMutation();
  const [registeredCustomer, setRegisteredCustomer] = useState<{
    customerId: string;
    qrCodeImageUrl: string;
  } | null>(null);

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!formData.fullName || !formData.dateOfBirth || !formData.gender || !formData.phone) {
      setError("必須項目を入力してください");
      return;
    }

    setIsLoading(true);
    try {
      // 顧客登録APIを呼び出す
      const result = await registerMutation.mutateAsync({
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender as "male" | "female" | "other" | "prefer_not_to_say",
        phone: formData.phone,
        email: formData.email || undefined,
        postalCode: formData.postalCode,
        prefecture: formData.prefecture,
        city: formData.city,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2 || undefined,
      });

      // 登録完了状況を更新
      await updateStatusMutation.mutateAsync({
        sessionToken,
        status: "completed",
      });

      // 登録した顧客情報を保存
      setRegisteredCustomer({
        customerId: result.customerId,
        qrCodeImageUrl: result.qrCodeImageUrl,
      });

      setStep("confirmation");
    } catch (err: any) {
      setError(err.message || "登録に失敗しました");
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  // QRコード読み込み画面
  if (step === "qrcode") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">来店登録</CardTitle>
            <CardDescription>
              施設のQRコードをスキャンして登録を開始してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center min-h-64">
              {isLoading ? (
                <div className="text-center">
                  <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">QRコードを読み込み中...</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    スマートフォンのカメラでQRコードをスキャンしてください
                  </p>
                  <p className="text-sm text-gray-500">
                    または下のボタンでQRコードIDを入力
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                QRコードIDを入力
              </label>
              <Input
                type="text"
                placeholder="QRコードID"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    const value = (e.target as HTMLInputElement).value;
                    if (value) {
                      handleQrCodeScanned(value);
                    }
                  }
                }}
              />
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => setLocation("/")}
            >
              キャンセル
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 登録フォーム画面
  if (step === "form") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>顧客情報登録</CardTitle>
              <CardDescription>
                {facilityName && `施設: ${facilityName}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 基本情報 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">基本情報</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      名前 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="山田太郎"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        生年月日 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        性別 <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, gender: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">男性</SelectItem>
                          <SelectItem value="female">女性</SelectItem>
                          <SelectItem value="other">その他</SelectItem>
                          <SelectItem value="prefer_not_to_say">
                            答えたくない
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 連絡先 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">連絡先</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      電話番号 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="09012345678"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス
                    </label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="example@example.com"
                    />
                  </div>
                </div>

                {/* 住所 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">住所</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      郵便番号 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      placeholder="1234567"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        都道府県 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        name="prefecture"
                        value={formData.prefecture}
                        onChange={handleInputChange}
                        placeholder="東京都"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        市区町村 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="渋谷区"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      住所（番地）<span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      placeholder="1-2-3"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      住所（建物名など）
                    </label>
                    <Input
                      type="text"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleInputChange}
                      placeholder="○○ビル 101号室"
                    />
                  </div>
                </div>

                {/* エラー表示 */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* ボタン */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setLocation("/")}
                    disabled={isLoading}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "登録中..." : "登録"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 登録完了画面
  if (step === "confirmation") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">登録完了</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div>
              <p className="text-gray-600 mb-2">
                ご登録ありがとうございます。
              </p>
              <p className="text-gray-600">
                診察券QRコードが生成されました。
              </p>
            </div>

            <div className="bg-gray-100 rounded-lg p-8">
              <p className="text-sm text-gray-600 mb-2">診察券QRコード</p>
              <div className="bg-white rounded p-4 flex justify-center">
                {registeredCustomer?.qrCodeImageUrl ? (
                  <img
                    src={registeredCustomer.qrCodeImageUrl}
                    alt="診察券QRコード"
                    className="w-64 h-64"
                  />
                ) : (
                  <p className="text-gray-400 text-center">
                    QRコードを生成中...
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {registeredCustomer?.qrCodeImageUrl && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = registeredCustomer.qrCodeImageUrl;
                    link.download = `qrcode-${registeredCustomer.customerId}.png`;
                    link.click();
                  }}
                >
                  QRコードを保存
                </Button>
              )}
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => setLocation("/")}
              >
                ホームに戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // エラー画面
  if (step === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">エラー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-600 text-center">{error}</p>

            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={() => {
                setStep("qrcode");
                setError("");
              }}
            >
              もう一度試す
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/")}
            >
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default SelfRegistration;
