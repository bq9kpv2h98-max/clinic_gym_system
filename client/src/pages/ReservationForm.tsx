import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar as CalendarIcon, Clock, User, Phone, Mail, CheckCircle2,
  MessageCircle, Shield, ChevronRight, ChevronLeft, MapPin, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [
  { value: "10:00-13:00", label: "10:00 〜 13:00" },
  { value: "13:00-17:00", label: "13:00 〜 17:00" },
  { value: "17:00-", label: "17:00 〜" },
] as const;

// ===== EFOユーティリティ =====
function normalizePhone(value: string): string {
  return value
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[ー－−]/g, "-")
    .replace(/[-\s]/g, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^\d{10,11}$/.test(phone);
}

// ===== フローティングラベル付き入力 =====
interface FloatingInputProps {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
  placeholder?: string;
  autoComplete?: string;
}

function FloatingInput({
  id, label, required, optional, value, onChange, onBlur, error, hint, type = "text",
  inputMode, placeholder, autoComplete,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value.length > 0;

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value}
          placeholder={isFloating ? (placeholder || "") : ""}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          className={cn(
            "peer w-full rounded-lg border bg-white px-4 pt-6 pb-2 text-sm transition-all outline-none",
            "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            error
              ? "border-red-400 focus:ring-red-400 focus:border-red-400"
              : "border-gray-300",
          )}
        />
        <label
          htmlFor={id}
          className={cn(
            "absolute left-4 transition-all duration-150 pointer-events-none select-none",
            isFloating
              ? "top-1.5 text-xs font-medium text-blue-600"
              : "top-1/2 -translate-y-1/2 text-sm text-gray-400",
            error && isFloating && "text-red-500",
          )}
        >
          {label}
          {required && <span className="ml-1 text-xs font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded">必須</span>}
          {optional && <span className="ml-1 text-xs text-gray-400 bg-gray-100 px-1 py-0.5 rounded">任意</span>}
        </label>
      </div>
      {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
      {!error && hint && <p className="text-xs text-gray-400 pl-1">{hint}</p>}
    </div>
  );
}

// ===== 完了画面 =====
function CompletionScreen({ name, date, timeSlot }: { name: string; date: Date; timeSlot: string }) {
  const formatDate = (d: Date) =>
    d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">予約リクエストを受け付けました</h1>
          <p className="text-gray-600 text-sm">
            {name} 様、ありがとうございます。<br />
            担当者より確認のご連絡をさしあげます。
          </p>
        </div>
        <Card className="text-left shadow-md">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">希望日</p>
                <p className="text-sm font-semibold text-gray-800">{formatDate(date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">希望時間帯</p>
                <p className="text-sm font-semibold text-gray-800">{timeSlot}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* LINE友だち追加ボタン */}
        <a
          href="https://lin.ee/9LXLjNI"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full bg-[#06C755] hover:bg-[#05b34c] active:bg-[#04a044] text-white font-bold text-base py-4 px-6 rounded-2xl shadow-lg transition-all duration-150 touch-manipulation"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white flex-shrink-0">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
          LINE公式アカウントで友だち追加
        </a>
        <p className="text-xs text-gray-400">
          ご不明な点はお気軽にLINEまたはお電話でお問い合わせください。
        </p>
      </div>
    </div>
  );
}

// ===== メインコンポーネント =====
export default function ReservationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    postalCode: "",
    prefecture: "",
    city: "",
    addressLine: "",
    preferLineContact: false,
    privacyAgreed: false,
    firstChoiceDate: undefined as Date | undefined,
    firstChoiceTimeSlot: "" as "10:00-13:00" | "13:00-17:00" | "17:00-" | "",
    firstChoiceTimeDetail: "",
    notes: "",
  });

  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const getWeekDays = (start: Date): Date[] =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

  const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

  const [postalLoading, setPostalLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const facilityId = "facility-001";

  const createMutation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const handleInputChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateField = (field: string, value: string) => {
    let error = "";
    if (field === "customerName" && !value.trim()) {
      error = "お名前を入力してください";
    } else if (field === "customerPhone") {
      const normalized = normalizePhone(value);
      if (!normalized) error = "電話番号を入力してください";
      else if (!isValidPhone(normalized)) error = "電話番号は10〜11桁の数字で入力してください（例: 09012345678）";
    } else if (field === "customerEmail") {
      if (!value.trim()) error = "メールアドレスを入力してください";
      else if (!isValidEmail(value)) error = "メールアドレスの形式が正しくありません（例: name@example.com）";
    }
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const handlePhoneBlur = () => {
    const normalized = normalizePhone(formData.customerPhone);
    if (normalized !== formData.customerPhone) {
      setFormData((prev) => ({ ...prev, customerPhone: normalized }));
    }
    validateField("customerPhone", normalized);
  };

  const fetchAddressByPostalCode = async (code: string) => {
    const normalized = code.replace(/[\s\-－]/g, "").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
    if (normalized.length !== 7) return;
    setPostalLoading(true);
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${normalized}`);
      const json = await res.json();
      if (json.results && json.results.length > 0) {
        const r = json.results[0];
        setFormData((prev) => ({
          ...prev,
          prefecture: r.address1 || prev.prefecture,
          city: (r.address2 || "") + (r.address3 || ""),
        }));
        toast.success("住所を自動入力しました");
      } else {
        toast.error("郵便番号が見つかりませんでした");
      }
    } catch {
      toast.error("住所の自動入力に失敗しました");
    } finally {
      setPostalLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.firstChoiceDate || !formData.firstChoiceTimeSlot) {
      toast.error("希望日時を選択してください");
      // 日時セクションまでスクロール
      document.getElementById("section-datetime")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const nameOk = validateField("customerName", formData.customerName);
    const phoneOk = validateField("customerPhone", normalizePhone(formData.customerPhone));
    const emailOk = validateField("customerEmail", formData.customerEmail);
    if (!nameOk || !phoneOk || !emailOk) {
      toast.error("入力内容を確認してください");
      document.getElementById("section-info")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!formData.privacyAgreed) {
      toast.error("個人情報の取り扱いへの同意が必要です");
      return;
    }
    const phone = normalizePhone(formData.customerPhone);
    createMutation.mutate({
      facilityId,
      customerName: formData.customerName,
      customerPhone: phone,
      customerEmail: formData.customerEmail,
      firstChoiceDate: formData.firstChoiceDate!,
      firstChoiceTimeSlot: formData.firstChoiceTimeSlot as "10:00-13:00" | "13:00-17:00" | "17:00-",
      firstChoiceTimeDetail: formData.firstChoiceTimeDetail || undefined,
      secondChoiceDate: undefined,
      secondChoiceTimeSlot: undefined as any,
      thirdChoiceDate: undefined,
      thirdChoiceTimeSlot: undefined as any,
      notes: formData.notes || undefined,
      postalCode: formData.postalCode || undefined,
      prefecture: formData.prefecture || undefined,
      city: formData.city || undefined,
      addressLine: formData.addressLine || undefined,
    });
  };

  // ===== 完了画面 =====
  if (submitted) {
    return (
      <CompletionScreen
        name={formData.customerName}
        date={formData.firstChoiceDate!}
        timeSlot={formData.firstChoiceTimeSlot}
      />
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekDays = getWeekDays(weekStart);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* ヘッダー */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">無料体験のご予約</h1>
          <p className="text-gray-500 text-sm">下記フォームにご入力の上、お申し込みください</p>
        </div>

        {/* ===== セクション1: 希望日時 ===== */}
        <Card id="section-datetime" className="shadow-lg scroll-mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              ご希望日時
              <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded ml-1">必須</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* 週ナビゲーション */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(weekStart);
                  prev.setDate(weekStart.getDate() - 7);
                  if (prev >= today) setWeekStart(prev);
                }}
                disabled={weekStart <= today}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="前の週"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-sm font-semibold text-gray-700">
                {weekStart.getFullYear()}年{weekStart.getMonth() + 1}月
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = new Date(weekStart);
                  next.setDate(weekStart.getDate() + 7);
                  setWeekStart(next);
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="次の週"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* 日付ボタン列 */}
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((date) => {
                const isPast = date < today;
                const isSelected = formData.firstChoiceDate?.toDateString() === date.toDateString();
                const isToday = date.toDateString() === today.toDateString();
                const dayOfWeek = date.getDay();
                const isSun = dayOfWeek === 0;
                const isSat = dayOfWeek === 6;
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    disabled={isPast}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        firstChoiceDate: date,
                        firstChoiceTimeSlot: "",
                        firstChoiceTimeDetail: "",
                      }));
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center py-3 rounded-xl text-sm font-medium transition-all select-none",
                      "active:scale-95 touch-manipulation",
                      isPast && "opacity-30 cursor-not-allowed",
                      isSelected && "bg-blue-600 text-white shadow-md",
                      !isSelected && !isPast && "bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300",
                      !isSelected && isToday && !isPast && "border-blue-400 border-2",
                    )}
                  >
                    <span className={cn(
                      "text-xs mb-0.5",
                      isSelected ? "text-blue-100" : isSun ? "text-red-500" : isSat ? "text-blue-500" : "text-gray-400"
                    )}>
                      {DAY_LABELS[dayOfWeek]}
                    </span>
                    <span className={cn(
                      "text-base leading-tight",
                      isSelected ? "text-white" : isSun ? "text-red-600" : isSat ? "text-blue-600" : "text-gray-800"
                    )}>
                      {date.getDate()}
                    </span>
                    {isToday && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-blue-500 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 日付選択後に時間帯ボタンを表示 */}
            {formData.firstChoiceDate ? (
              <div className="space-y-3 pt-1">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  {formData.firstChoiceDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}の時間帯
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = formData.firstChoiceTimeSlot === slot.value;
                    return (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => handleInputChange("firstChoiceTimeSlot", slot.value)}
                        className={cn(
                          "w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 text-sm font-medium transition-all",
                          "active:scale-[0.98] touch-manipulation",
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white shadow-md"
                            : "bg-white border-gray-200 text-gray-800 hover:border-blue-400 hover:bg-blue-50"
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <Clock className={cn("w-4 h-4", isSelected ? "text-blue-200" : "text-gray-400")} />
                          <span className="text-base">{slot.label}</span>
                        </span>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-200" />}
                      </button>
                    );
                  })}
                </div>

                {/* 詳細時間の自由記入欄 */}
                {formData.firstChoiceTimeSlot && (
                  <div className="space-y-1 pt-1">
                    <label htmlFor="timeDetail" className="text-xs font-medium text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      希望時間の詳細
                      <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">任意</span>
                    </label>
                    <input
                      id="timeDetail"
                      type="text"
                      placeholder="例：10時ごろ、午後が希望など"
                      value={formData.firstChoiceTimeDetail}
                      onChange={(e) => handleInputChange("firstChoiceTimeDetail", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">
                <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                上の日付をタップしてください
              </div>
            )}

          </CardContent>
        </Card>

        {/* ===== セクション2: お客様情報 ===== */}
        <Card id="section-info" className="shadow-lg scroll-mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-5 h-5 text-blue-600" />
              お客様情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* お名前 */}
            <FloatingInput
              id="name"
              label="お名前（フルネーム）"
              required
              value={formData.customerName}
              onChange={(v) => handleInputChange("customerName", v)}
              onBlur={() => validateField("customerName", formData.customerName)}
              error={fieldErrors.customerName}
              hint="例：山田 太郎"
              autoComplete="name"
            />

            {/* 電話番号 */}
            <FloatingInput
              id="phone"
              label="電話番号"
              required
              type="tel"
              inputMode="numeric"
              value={formData.customerPhone}
              onChange={(v) => handleInputChange("customerPhone", v)}
              onBlur={handlePhoneBlur}
              error={fieldErrors.customerPhone}
              hint="ハイフン不要・全角でも自動変換します（例：09012345678）"
              autoComplete="tel"
            />

            {/* メールアドレス */}
            <FloatingInput
              id="email"
              label="メールアドレス"
              required
              type="email"
              inputMode="email"
              value={formData.customerEmail}
              onChange={(v) => handleInputChange("customerEmail", v)}
              onBlur={() => validateField("customerEmail", formData.customerEmail)}
              error={fieldErrors.customerEmail}
              hint="予約確認メールをお送りします（例：name@example.com）"
              autoComplete="email"
            />

            {/* 住所（郵便番号自動入力） */}
            <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">住所</span>
                <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">任意</span>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <FloatingInput
                    id="postalCode"
                    label="郵便番号"
                    optional
                    inputMode="numeric"
                    value={formData.postalCode}
                    onChange={(v) => {
                      const normalized = v.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
                      handleInputChange("postalCode", normalized);
                      if (normalized.replace(/[\s\-]/g, "").length === 7) {
                        fetchAddressByPostalCode(normalized);
                      }
                    }}
                    hint="例：1234567（ハイフン不要）"
                    autoComplete="postal-code"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchAddressByPostalCode(formData.postalCode)}
                  disabled={postalLoading || formData.postalCode.replace(/[\s\-]/g, "").length !== 7}
                  className="mb-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1"
                >
                  {postalLoading ? <><Loader2 className="w-3 h-3 animate-spin" />検索中</> : "住所検索"}
                </button>
              </div>
              <FloatingInput
                id="prefecture"
                label="都道府県"
                optional
                value={formData.prefecture}
                onChange={(v) => handleInputChange("prefecture", v)}
                hint="郵便番号から自動入力されます"
                autoComplete="address-level1"
              />
              <FloatingInput
                id="city"
                label="市区町村"
                optional
                value={formData.city}
                onChange={(v) => handleInputChange("city", v)}
                hint="郵便番号から自動入力されます"
                autoComplete="address-level2"
              />
              <FloatingInput
                id="addressLine"
                label="番地・建物名等"
                optional
                value={formData.addressLine}
                onChange={(v) => handleInputChange("addressLine", v)}
                hint="例：1-2-3 マンション名101"
                autoComplete="address-line1"
              />
            </div>

            {/* 症状・お悩み */}
            <div className="space-y-1.5">
              <label htmlFor="notes" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                症状・お悩み・ご要望
                <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">任意</span>
              </label>
              <Textarea
                id="notes"
                placeholder="例：肩こりがひどい、腰痛が続いている、ダイエットしたいなど"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                className="resize-none h-24"
              />
            </div>

            {/* LINE連絡希望 */}
            <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <input
                type="checkbox"
                id="preferLineContact"
                checked={formData.preferLineContact}
                onChange={(e) => handleInputChange("preferLineContact", e.target.checked)}
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
              />
              <label htmlFor="preferLineContact" className="flex items-center gap-2 cursor-pointer text-sm font-medium text-green-800">
                <MessageCircle className="w-4 h-4 text-green-600" />
                LINEでの連絡を希望する
                <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">任意</span>
              </label>
            </div>

            {/* プライバシーポリシー同意 */}
            <div className={cn(
              "flex items-start space-x-3 p-4 rounded-xl border",
              formData.privacyAgreed ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
            )}>
              <input
                type="checkbox"
                id="privacyAgreed"
                checked={formData.privacyAgreed}
                onChange={(e) => handleInputChange("privacyAgreed", e.target.checked)}
                className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="privacyAgreed" className="cursor-pointer text-sm text-gray-700 leading-relaxed">
                <span className="flex items-center gap-1 font-medium mb-0.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                  個人情報の取り扱いへの同意
                  <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">必須</span>
                </span>
                入力いただいた個人情報は、予約確認・ご連絡のみに使用します。
                <a href="/privacy" className="text-blue-600 underline ml-1" target="_blank" rel="noopener noreferrer">
                  プライバシーポリシー
                </a>
                をご確認ください。
              </label>
            </div>

          </CardContent>
        </Card>

        {/* ===== 入力内容サマリー（送信前確認） ===== */}
        {formData.firstChoiceDate && formData.firstChoiceTimeSlot && formData.customerName && (
          <Card className="shadow-md bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold text-blue-700 mb-3 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                入力内容の確認
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex gap-2">
                  <CalendarIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>
                    {formData.firstChoiceDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
                    {" "}
                    {formData.firstChoiceTimeSlot}
                    {formData.firstChoiceTimeDetail && ` (${formData.firstChoiceTimeDetail})`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <User className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>{formData.customerName}</span>
                </div>
                {formData.customerPhone && (
                  <div className="flex gap-2">
                    <Phone className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>{formData.customerPhone}</span>
                  </div>
                )}
                {formData.customerEmail && (
                  <div className="flex gap-2">
                    <Mail className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>{formData.customerEmail}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== 送信ボタン ===== */}
        <div className="pb-8">
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg active:scale-[0.98] touch-manipulation"
          >
            {createMutation.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />送信中...</>
            ) : (
              <>無料体験を申し込む<ChevronRight className="w-5 h-5 ml-2" /></>
            )}
          </Button>
          <p className="text-center text-xs text-gray-400 mt-3">
            送信後、担当者よりご連絡いたします
          </p>
        </div>

      </div>
    </div>
  );
}
