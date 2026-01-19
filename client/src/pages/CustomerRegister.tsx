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
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";

const registerSchema = z.object({
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

type RegisterFormData = z.infer<typeof registerSchema>;

export default function CustomerRegister() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredCustomerId, setRegisteredCustomerId] = useState<string | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
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

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      const result = await registerMutation.mutateAsync({
        ...data,
        email: data.email || undefined,
        customFields: {},
      });

      setRegisteredCustomerId(result.customerId);
      setQrCodeImageUrl(result.qrCodeImageUrl);
      toast.success("顧客登録が完了しました！");
    } catch (error) {
      toast.error("登録に失敗しました。もう一度お試しください。");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
                  link.click();
                }}
                className="w-full"
              >
                QRコードをダウンロード
              </Button>

              <Button
                onClick={() => {
                  setRegisteredCustomerId(null);
                  setQrCodeImageUrl(null);
                }}
                variant="outline"
                className="w-full"
              >
                新しい顧客を登録
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto mt-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>診察券登録</CardTitle>
            <CardDescription>
              基本情報を入力して、QRコード診察券を発行します
            </CardDescription>
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
                  <Label htmlFor="email">メールアドレス</Label>
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
                  <Label htmlFor="postalCode">郵便番号 * {isLoadingAddress && <span className="text-sm text-gray-500">(住所を取得中...)</span>}</Label>
                  <Input
                    id="postalCode"
                    placeholder="1234567"
                    {...register("postalCode")}
                    className={errors.postalCode ? "border-red-500" : ""}
                  />
                  {errors.postalCode && (
                    <p className="text-red-500 text-sm mt-1">{errors.postalCode.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">ハイフンなしで入力してください</p>
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
                  <Label htmlFor="addressLine2">住所（建物名など）</Label>
                  <Input
                    id="addressLine2"
                    placeholder="○○ビル 101号室"
                    {...register("addressLine2")}
                  />
                </div>
              </div>

              {/* 送信ボタン */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登録中...
                  </>
                ) : (
                  "QRコード診察券を発行"
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                * は必須項目です
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
