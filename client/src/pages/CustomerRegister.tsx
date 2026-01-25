import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Check, Smartphone, UserPlus, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// 既存顧客用のスキーマ
const existingCustomerSchema = z.object({
  fullName: z.string().trim().min(1, "名前を入力してください"),
  dateOfBirth: z.string().min(1, "生年月日を選択してください"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"], {
    message: "性別を選択してください",
  }),
  phone: z.string().trim().regex(/^\d{10,11}$/, "電話番号は10〜11桁の数字で入力してください"),
  email: z.string().trim().email("有効なメールアドレスを入力してください").optional().or(z.literal("")),
  postalCode: z.string().trim().regex(/^\d{7}$/, "郵便番号は7桁の数字で入力してください"),
  prefecture: z.string().trim().min(1, "都道府県を入力してください"),
  city: z.string().trim().min(1, "市区町村を入力してください"),
  addressLine1: z.string().trim().min(1, "住所（番地）を入力してください"),
  addressLine2: z.string().optional(),
});

// 新規顧客用のスキーマ（既存顧客のフィールド + 追加フィールド）
const newCustomerSchema = existingCustomerSchema.extend({
  howDidYouKnow: z.string().trim().min(1, "当院を知った理由を入力してください"),
  concerns: z.string().trim().min(1, "悩み・症状を入力してください"),
  medicalHistory: z.string().optional(),
  isPregnant: z.enum(["0", "1"], {
    message: "妊娠の有無を選択してください",
  }),
  postpartumPeriod: z.string().optional(),
});

type ExistingCustomerFormData = z.infer<typeof existingCustomerSchema>;
type NewCustomerFormData = z.infer<typeof newCustomerSchema>;

export default function CustomerRegister() {
  const [customerType, setCustomerType] = useState<"new" | "existing" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredCustomerId, setRegisteredCustomerId] = useState<string | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<NewCustomerFormData>({
    resolver: zodResolver(customerType === "new" ? newCustomerSchema : existingCustomerSchema),
    mode: "onSubmit",
  });

  const registerMutation = trpc.customers.register.useMutation();

  // 郵便番号から住所を自動入力
  const postalCode = watch("postalCode");
  useEffect(() => {
    const fetchAddress = async () => {
      if (postalCode && /^\d{7}$/.test(postalCode)) {
        setIsLoadingAddress(true);
        try {
          const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`);
          const data = await response.json();
          
          if (data.status === 200 && data.results && data.results.length > 0) {
            const result = data.results[0];
            setValue("prefecture", result.address1);
            setValue("city", result.address2 + result.address3);
            toast.success("住所を自動入力しました");
          } else {
            toast.error("郵便番号から住所が見つかりませんでした");
          }
        } catch (error) {
          console.error("Failed to fetch address:", error);
          toast.error("住所の取得に失敗しました");
        } finally {
          setIsLoadingAddress(false);
        }
      }
    };

    const timeoutId = setTimeout(fetchAddress, 500);
    return () => clearTimeout(timeoutId);
  }, [postalCode, setValue]);

  const onSubmit = async (data: NewCustomerFormData | ExistingCustomerFormData) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...data,
        email: data.email || undefined,
        customFields: {},
      };

      // 新規顧客の場合のみ追加フィールドを送信
      if (customerType === "new") {
        const newData = data as NewCustomerFormData;
        payload.howDidYouKnow = newData.howDidYouKnow;
        payload.concerns = newData.concerns;
        payload.medicalHistory = newData.medicalHistory || undefined;
        payload.isPregnant = parseInt(newData.isPregnant);
        payload.postpartumPeriod = newData.postpartumPeriod || undefined;
      }

      const result = await registerMutation.mutateAsync(payload);

      setRegisteredCustomerId(result.customerId);
      setQrCodeImageUrl(result.qrCodeImageUrl);
      toast.success("顧客登録が完了しました！");
      
      // PWAインストール案内を表示
      setTimeout(() => setShowPWAPrompt(true), 1000);
    } catch (error) {
      toast.error("登録に失敗しました。もう一度お試しください。");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 登録完了画面
  if (registeredCustomerId && qrCodeImageUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-md mx-auto mt-8">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Check className="w-12 h-12 text-green-500" />
              </div>
              <CardTitle>登録完了</CardTitle>
              <CardDescription>
                あなたの診察券QRコードが生成されました
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 flex justify-center">
                <img
                  src={qrCodeImageUrl}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">QRコードの使い方</h3>
                <ol className="text-sm space-y-1 text-gray-700">
                  <li>1. このQRコードをスクリーンショットで保存</li>
                  <li>2. 来院時にスタッフに見せてください</li>
                  <li>3. スタッフがQRコードを読み取ります</li>
                </ol>
              </div>

              <Button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = qrCodeImageUrl;
                  link.download = `qr-code-${registeredCustomerId}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast.success("QRコードを保存しました");
                }}
                className="w-full"
              >
                QRコードを保存
              </Button>

              <Button
                onClick={() => {
                  setRegisteredCustomerId(null);
                  setQrCodeImageUrl(null);
                  setCustomerType(null);
                  reset();
                }}
                variant="outline"
                className="w-full"
              >
                新しい顧客を登録
              </Button>
            </CardContent>
          </Card>

          {/* PWAインストール案内ポップアップ */}
          <Dialog open={showPWAPrompt} onOpenChange={setShowPWAPrompt}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  ホーム画面に追加しませんか?
                </DialogTitle>
                <DialogDescription className="space-y-3 pt-2">
                  <p>
                    ホーム画面に追加すると、いつでも簡単にQRコードとポイントを確認できます！
                  </p>
                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    <p className="font-semibold mb-2">追加方法：</p>
                    <ol className="space-y-1 text-gray-700">
                      <li>・ iOS: 共有ボタン → 「ホーム画面に追加」</li>
                      <li>・ Android: メニュー → 「ホーム画面に追加」</li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        window.location.href = "/customer-home";
                      }}
                      className="w-full"
                    >
                      顧客マイページを開く
                    </Button>
                    <Button
                      onClick={() => setShowPWAPrompt(false)}
                      variant="outline"
                      className="w-full"
                    >
                      後で追加する
                    </Button>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // 顧客タイプ選択画面
  if (!customerType) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-2xl mx-auto mt-8">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>診察券登録</CardTitle>
              <CardDescription>
                新規顧客か既存顧客かを選択してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => setCustomerType("new")}
                  variant="outline"
                  className="h-auto py-8 flex flex-col items-center gap-4 hover:bg-blue-50 hover:border-blue-500"
                >
                  <UserPlus className="w-12 h-12 text-blue-500" />
                  <div>
                    <div className="font-semibold text-lg">新規顧客</div>
                    <div className="text-sm text-gray-500 mt-1">
                      初めてご来院される方
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => setCustomerType("existing")}
                  variant="outline"
                  className="h-auto py-8 flex flex-col items-center gap-4 hover:bg-green-50 hover:border-green-500"
                >
                  <Users className="w-12 h-12 text-green-500" />
                  <div>
                    <div className="font-semibold text-lg">既存顧客</div>
                    <div className="text-sm text-gray-500 mt-1">
                      以前にご来院されたことがある方
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 登録フォーム
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto mt-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {customerType === "new" ? "新規顧客登録" : "既存顧客登録"}
                </CardTitle>
                <CardDescription>
                  基本情報を入力して、QRコード診察券を発行します
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setCustomerType(null);
                  reset();
                }}
                variant="outline"
                size="sm"
              >
                戻る
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 基本情報 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">基本情報</h3>

                <div>
                  <Label htmlFor="fullName">名前 *</Label>
                  <Input
                    id="fullName"
                    placeholder="山田太郎"
                    {...register("fullName")}
                    className={errors.fullName ? "border-red-500" : ""}
                  />
                  {errors.fullName && (
                    <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateOfBirth">生年月日 *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register("dateOfBirth")}
                      className={errors.dateOfBirth ? "border-red-500" : ""}
                    />
                    {errors.dateOfBirth && (
                      <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="gender">性別 *</Label>
                    <Select
                      onValueChange={(value) =>
                        setValue("gender", value as "male" | "female" | "other" | "prefer_not_to_say", {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">男性</SelectItem>
                        <SelectItem value="female">女性</SelectItem>
                        <SelectItem value="other">その他</SelectItem>
                        <SelectItem value="prefer_not_to_say">回答しない</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && (
                      <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 連絡先 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">連絡先</h3>

                <div>
                  <Label htmlFor="phone">電話番号 *</Label>
                  <Input
                    id="phone"
                    placeholder="09012345678"
                    {...register("phone")}
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">メールアドレス（任意）</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@example.com"
                    {...register("email")}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>
              </div>

              {/* 住所 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">住所</h3>

                <div>
                  <Label htmlFor="postalCode">郵便番号 *</Label>
                  <Input
                    id="postalCode"
                    placeholder="1234567"
                    {...register("postalCode")}
                    className={errors.postalCode ? "border-red-500" : ""}
                  />
                  {errors.postalCode && (
                    <p className="text-red-500 text-sm mt-1">{errors.postalCode.message}</p>
                  )}
                  {isLoadingAddress && (
                    <p className="text-blue-500 text-sm mt-1">住所を検索中...</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prefecture">都道府県 *</Label>
                    <Input
                      id="prefecture"
                      placeholder="東京都"
                      {...register("prefecture")}
                      className={errors.prefecture ? "border-red-500" : ""}
                    />
                    {errors.prefecture && (
                      <p className="text-red-500 text-sm mt-1">{errors.prefecture.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="city">市区町村 *</Label>
                    <Input
                      id="city"
                      placeholder="渋谷区"
                      {...register("city")}
                      className={errors.city ? "border-red-500" : ""}
                    />
                    {errors.city && (
                      <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="addressLine1">住所（番地） *</Label>
                  <Input
                    id="addressLine1"
                    placeholder="1-2-3"
                    {...register("addressLine1")}
                    className={errors.addressLine1 ? "border-red-500" : ""}
                  />
                  {errors.addressLine1 && (
                    <p className="text-red-500 text-sm mt-1">{errors.addressLine1.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="addressLine2">建物名・部屋番号（任意）</Label>
                  <Input
                    id="addressLine2"
                    placeholder="○○マンション101号室"
                    {...register("addressLine2")}
                  />
                </div>
              </div>

              {/* 新規顧客のみ: 追加情報 */}
              {customerType === "new" && (
                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-semibold text-lg">詳細情報</h3>

                  <div>
                    <Label htmlFor="howDidYouKnow">当院を知った理由 *</Label>
                    <Input
                      id="howDidYouKnow"
                      placeholder="例: Google検索、友人の紹介、SNS など"
                      {...register("howDidYouKnow")}
                      className={errors.howDidYouKnow ? "border-red-500" : ""}
                    />
                    {errors.howDidYouKnow && (
                      <p className="text-red-500 text-sm mt-1">{errors.howDidYouKnow.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="concerns">悩み・症状 *</Label>
                    <Textarea
                      id="concerns"
                      placeholder="例: 腰痛、肩こり、姿勢改善 など"
                      {...register("concerns")}
                      className={errors.concerns ? "border-red-500" : ""}
                      rows={3}
                    />
                    {errors.concerns && (
                      <p className="text-red-500 text-sm mt-1">{errors.concerns.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="medicalHistory">既往歴（任意）</Label>
                    <Textarea
                      id="medicalHistory"
                      placeholder="例: 高血圧、糖尿病、手術歴 など"
                      {...register("medicalHistory")}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>妊娠の有無 *</Label>
                    <RadioGroup
                      onValueChange={(value) => setValue("isPregnant", value as "0" | "1", { shouldValidate: true })}
                      className="flex gap-4 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="0" id="not-pregnant" />
                        <Label htmlFor="not-pregnant" className="font-normal cursor-pointer">
                          妊娠していない
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id="pregnant" />
                        <Label htmlFor="pregnant" className="font-normal cursor-pointer">
                          妊娠している
                        </Label>
                      </div>
                    </RadioGroup>
                    {errors.isPregnant && (
                      <p className="text-red-500 text-sm mt-1">{errors.isPregnant.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="postpartumPeriod">産後の期間（任意）</Label>
                    <Input
                      id="postpartumPeriod"
                      placeholder="例: 産後3ヶ月"
                      {...register("postpartumPeriod")}
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登録中...
                  </>
                ) : (
                  "登録する"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
