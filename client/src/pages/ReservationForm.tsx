import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ja } from "date-fns/locale";

const TIME_SLOTS = [
  { value: "10:00-13:00", label: "10:00-13:00" },
  { value: "13:00-17:00", label: "13:00-17:00" },
  { value: "17:00-", label: "17:00-" },
] as const;

export default function ReservationForm() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    firstChoiceDate: undefined as Date | undefined,
    firstChoiceTimeSlot: "" as "10:00-13:00" | "13:00-17:00" | "17:00-" | "",
    secondChoiceDate: undefined as Date | undefined,
    secondChoiceTimeSlot: "" as "10:00-13:00" | "13:00-17:00" | "17:00-" | "",
    thirdChoiceDate: undefined as Date | undefined,
    thirdChoiceTimeSlot: "" as "10:00-13:00" | "13:00-17:00" | "17:00-" | "",
    notes: "",
  });
  const [reservationResult, setReservationResult] = useState<any>(null);

  // 仮の施設ID（実際は環境変数やURLパラメータから取得）
  const facilityId = "facility-001";

  // 予約作成
  const createMutation = trpc.reservations.create.useMutation({
    onSuccess: (data) => {
      setReservationResult(data);
      setStep(4);
      toast.success("予約を受け付けました");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.customerName.trim()) {
      toast.error("お名前を入力してください");
      return false;
    }
    if (!formData.customerPhone.match(/^\d{10,11}$/)) {
      toast.error("電話番号は10-11桁の数字で入力してください");
      return false;
    }
    if (formData.customerEmail && !formData.customerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("有効なメールアドレスを入力してください");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.firstChoiceDate || !formData.firstChoiceTimeSlot) {
      toast.error("第1希望の日時を選択してください");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = () => {
    if (!validateStep1() || !validateStep2()) return;

    createMutation.mutate({
      facilityId,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail || undefined,
      firstChoiceDate: formData.firstChoiceDate!,
      firstChoiceTimeSlot: formData.firstChoiceTimeSlot as "10:00-13:00" | "13:00-17:00" | "17:00-",
      secondChoiceDate: formData.secondChoiceDate,
      secondChoiceTimeSlot: formData.secondChoiceTimeSlot || undefined as any,
      thirdChoiceDate: formData.thirdChoiceDate,
      thirdChoiceTimeSlot: formData.thirdChoiceTimeSlot || undefined as any,
      notes: formData.notes || undefined,
    });
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  // ステップ1: 顧客情報入力
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">ご予約フォーム</h1>
            <p className="text-gray-600">お客様情報をご入力ください</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                お客様情報（ステップ 1/3）
              </CardTitle>
              <CardDescription>
                ご予約に必要な情報をご入力ください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">お名前 *</Label>
                <Input
                  id="name"
                  placeholder="山田 太郎"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange("customerName", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">電話番号 *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="09012345678"
                  value={formData.customerPhone}
                  onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  ハイフンなしで入力してください
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス（任意）</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange("customerEmail", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  予約確認メールをお送りします
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button onClick={handleNext} size="lg" className="px-8">
                  次へ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ステップ2: 希望日時選択
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">ご予約フォーム</h1>
            <p className="text-gray-600">ご希望の日時を選択してください</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                ご希望日時（ステップ 2/3）
              </CardTitle>
              <CardDescription>
                第3希望まで選択いただけます（第1希望は必須）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* 第1希望 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  第1希望 <span className="text-red-500">*</span>
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>日付</Label>
                    <Calendar
                      mode="single"
                      selected={formData.firstChoiceDate}
                      onSelect={(date) => handleInputChange("firstChoiceDate", date)}
                      locale={ja}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>時間帯</Label>
                    <Select
                      value={formData.firstChoiceTimeSlot}
                      onValueChange={(value) => handleInputChange("firstChoiceTimeSlot", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="時間を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 第2希望 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">第2希望（任意）</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>日付</Label>
                    <Calendar
                      mode="single"
                      selected={formData.secondChoiceDate}
                      onSelect={(date) => handleInputChange("secondChoiceDate", date)}
                      locale={ja}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>時間帯</Label>
                    <Select
                      value={formData.secondChoiceTimeSlot}
                      onValueChange={(value) => handleInputChange("secondChoiceTimeSlot", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="時間を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 第3希望 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">第3希望（任意）</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>日付</Label>
                    <Calendar
                      mode="single"
                      selected={formData.thirdChoiceDate}
                      onSelect={(date) => handleInputChange("thirdChoiceDate", date)}
                      locale={ja}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>時間帯</Label>
                    <Select
                      value={formData.thirdChoiceTimeSlot}
                      onValueChange={(value) => handleInputChange("thirdChoiceTimeSlot", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="時間を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button onClick={handleBack} variant="outline" size="lg">
                  戻る
                </Button>
                <Button onClick={handleNext} size="lg" className="px-8">
                  次へ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ステップ3: 確認
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">ご予約フォーム</h1>
            <p className="text-gray-600">内容をご確認ください</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                ご予約内容の確認（ステップ 3/3）
              </CardTitle>
              <CardDescription>
                内容に間違いがなければ「予約を確定する」ボタンを押してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 顧客情報 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">お客様情報</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">お名前</span>
                    <span className="font-medium">{formData.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">電話番号</span>
                    <span className="font-medium">{formData.customerPhone}</span>
                  </div>
                  {formData.customerEmail && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">メールアドレス</span>
                      <span className="font-medium">{formData.customerEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 希望日時 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">ご希望日時</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium text-blue-900 mb-1">第1希望</div>
                    <div className="text-sm text-blue-700">
                      {formatDate(formData.firstChoiceDate)} {formData.firstChoiceTimeSlot}
                    </div>
                  </div>
                  {formData.secondChoiceDate && formData.secondChoiceTimeSlot && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-1">第2希望</div>
                      <div className="text-sm text-gray-700">
                        {formatDate(formData.secondChoiceDate)} {formData.secondChoiceTimeSlot}
                      </div>
                    </div>
                  )}
                  {formData.thirdChoiceDate && formData.thirdChoiceTimeSlot && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-1">第3希望</div>
                      <div className="text-sm text-gray-700">
                        {formatDate(formData.thirdChoiceDate)} {formData.thirdChoiceTimeSlot}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* メモ */}
              <div className="space-y-2">
                <Label htmlFor="notes">ご要望・メモ（任意）</Label>
                <Textarea
                  id="notes"
                  placeholder="ご要望やご質問があればご記入ください"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button onClick={handleBack} variant="outline" size="lg">
                  戻る
                </Button>
                <Button
                  onClick={handleSubmit}
                  size="lg"
                  className="px-8"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "送信中..." : "予約を確定する"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ステップ4: 完了
  if (step === 4 && reservationResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl">ご予約を受け付けました</CardTitle>
              <CardDescription>
                予約ID: {reservationResult.reservation.reservationId.slice(0, 8)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  ご予約ありがとうございます。確定日時は後ほどご連絡いたします。
                  {formData.customerEmail && "確認メールをお送りしましたのでご確認ください。"}
                </p>
              </div>

              {reservationResult.customer && reservationResult.customer.qrCodeImageUrl && (
                <div className="text-center space-y-4">
                  <h3 className="font-semibold text-lg">診察券QRコード</h3>
                  <p className="text-sm text-muted-foreground">
                    来院時にこちらのQRコードをご提示ください
                  </p>
                  <div className="inline-block p-4 bg-white rounded-lg shadow-md">
                    <img
                      src={reservationResult.customer.qrCodeImageUrl}
                      alt="診察券QRコード"
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ※このQRコードはスクリーンショットで保存してください
                  </p>
                </div>
              )}

              <div className="flex justify-center pt-4">
                <Button onClick={() => setLocation("/")} size="lg">
                  トップページに戻る
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
