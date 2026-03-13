import { useState, useCallback, useRef } from "react";
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
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, CheckCircle2, MessageCircle, CalendarPlus, Shield, ChevronRight, ChevronLeft, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [
  { value: "10:00-13:00", label: "10:00-13:00" },
  { value: "13:00-17:00", label: "13:00-17:00" },
  { value: "17:00-", label: "17:00-" },
] as const;

// ===== EFOユーティリティ =====

/** 全角数字・ハイフンを半角に変換し、ハイフンを除去 */
function normalizePhone(value: string): string {
  return value
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[ー－−]/g, "-")
    .replace(/[-\s]/g, "");
}

/** 全角数字を半角に変換（郵便番号用） */
function normalizePostalCode(value: string): string {
  return value
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[-\s]/g, "");
}

/** メールアドレスの形式チェック */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** 電話番号の形式チェック（10〜11桁） */
function isValidPhone(phone: string): boolean {
  return /^\d{10,11}$/.test(phone);
}

// ===== フローティングラベル付き入力コンポーネント =====
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
      {error && <p className="text-xs text-red-500 flex items-center gap-1 pl-1">{error}</p>}
      {!error && hint && <p className="text-xs text-gray-400 pl-1">{hint}</p>}
    </div>
  );
}

// ===== 必須/任意バッジ付きラベル =====
function FieldLabel({ htmlFor, children, required, optional }: {
  htmlFor: string; children: React.ReactNode; required?: boolean; optional?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
      {children}
      {required && (
        <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">必須</span>
      )}
      {optional && (
        <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">任意</span>
      )}
    </Label>
  );
}

// ===== ステッププログレスバー =====
function StepProgress({ current, total }: { current: number; total: number }) {
  const steps = [
    { label: "希望日時" },
    { label: "お客様情報" },
    { label: "確認・送信" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => {
        const num = i + 1;
        const isDone = num < current;
        const isActive = num === current;
        return (
          <div key={i} className="flex items-center">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              isDone ? "bg-green-500 text-white" : isActive ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-400",
            )}>
              {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs border-2 border-current">{num}</span>}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className={cn("w-4 h-4 mx-1", num < current ? "text-green-400" : "text-gray-300")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ReservationForm() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
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
    firstChoiceTimeDetail: "", // 詳細時間の自由記入
    secondChoiceDate: undefined as Date | undefined,
    secondChoiceTimeSlot: "" as "10:00-13:00" | "13:00-17:00" | "17:00-" | "",
    thirdChoiceDate: undefined as Date | undefined,
    thirdChoiceTimeSlot: "" as "10:00-13:00" | "13:00-17:00" | "17:00-" | "",
    notes: "",
  });

  // 1週間横並びカレンダーの開始日
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // 1週間の日付配列を生成
  const getWeekDays = (start: Date): Date[] =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

  const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

  // 日付選択時に時間帯リセット
  const handleDateSelect = (date: Date) => {
    setFormData((prev) => ({ ...prev, firstChoiceDate: date, firstChoiceTimeSlot: "", firstChoiceTimeDetail: "" }));
  };

  // 時間帯タップで即座に次のステップへ
  const handleTimeSlotSelect = (slot: "10:00-13:00" | "13:00-17:00" | "17:00-") => {
    setFormData((prev) => ({ ...prev, firstChoiceTimeSlot: slot }));
    if (formData.firstChoiceDate) {
      setTimeout(() => setStep(2), 150);
    }
  };

  // 郵便番号自動入力ローディング状態
  const [postalLoading, setPostalLoading] = useState(false);

  // 郵便番号から住所を自動入力（zipcloud API）
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
      } else {
        toast.error("郵便番号が見つかりませんでした");
      }
    } catch {
      toast.error("住所の自動入力に失敗しました");
    } finally {
      setPostalLoading(false);
    }
  };

  // リアルタイムバリデーションエラー
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [reservationResult, setReservationResult] = useState<any>(null);

  const facilityId = "facility-001";

  const createMutation = trpc.reservations.create.useMutation({
    onSuccess: (data) => {
      setReservationResult(data);
      setStep(4);
      toast.success("予約リクエストを受け付けました");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 入力中はエラーをクリア
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // onBlurバリデーション
  const validateField = (field: string, value: string) => {
    let error = "";
    if (field === "customerName" && !value.trim()) {
      error = "お名前を入力してください";
    } else if (field === "customerPhone") {
      const normalized = normalizePhone(value);
      if (!normalized) {
        error = "電話番号を入力してください";
      } else if (!isValidPhone(normalized)) {
        error = "電話番号は10〜11桁の数字で入力してください（例: 09012345678）";
      }
    } else if (field === "customerEmail") {
      if (!value.trim()) {
        error = "メールアドレスを入力してください";
      } else if (!isValidEmail(value)) {
        error = "メールアドレスの形式が正しくありません（例: name@example.com）";
      }
    }
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  // 電話番号のblur時に正規化
  const handlePhoneBlur = () => {
    const normalized = normalizePhone(formData.customerPhone);
    if (normalized !== formData.customerPhone) {
      setFormData((prev) => ({ ...prev, customerPhone: normalized }));
    }
    validateField("customerPhone", normalized);
  };

  const validateStep1 = () => {
    if (!formData.firstChoiceDate || !formData.firstChoiceTimeSlot) {
      toast.error("第1希望の日時を選択してください");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const nameOk = validateField("customerName", formData.customerName);
    const phoneOk = validateField("customerPhone", normalizePhone(formData.customerPhone));
    const emailOk = validateField("customerEmail", formData.customerEmail);
    if (!nameOk || !phoneOk || !emailOk) return false;
    if (!formData.privacyAgreed) {
      toast.error("個人情報の取り扱いへの同意が必要です");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = () => {
    if (!validateStep1() || !validateStep2()) return;
    const phone = normalizePhone(formData.customerPhone);
    createMutation.mutate({
      facilityId,
      customerName: formData.customerName,
      customerPhone: phone,
      customerEmail: formData.customerEmail,
      firstChoiceDate: formData.firstChoiceDate!,
      firstChoiceTimeSlot: formData.firstChoiceTimeSlot as "10:00-13:00" | "13:00-17:00" | "17:00-",
      firstChoiceTimeDetail: formData.firstChoiceTimeDetail || undefined,
      secondChoiceDate: formData.secondChoiceDate,
      secondChoiceTimeSlot: formData.secondChoiceTimeSlot || undefined as any,
      thirdChoiceDate: formData.thirdChoiceDate,
      thirdChoiceTimeSlot: formData.thirdChoiceTimeSlot || undefined as any,
      notes: formData.notes || undefined,
      postalCode: formData.postalCode || undefined,
      prefecture: formData.prefecture || undefined,
      city: formData.city || undefined,
      addressLine: formData.addressLine || undefined,
    });
  };

  const generateCalendarEvent = (date: Date, timeSlot: string) => {
    const [startTime] = timeSlot.split("-");
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDate = new Date(date);
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(hours + 1, minutes, 0, 0);
    const formatISODate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const title = encodeURIComponent("予約リクエスト - 整体院・パーソナルジム");
    const description = encodeURIComponent(
      `予約ID: ${reservationResult?.reservationId?.slice(0, 8) || "処理中"}\nお名前: ${formData.customerName}\n電話番号: ${formData.customerPhone}\nメール: ${formData.customerEmail}\n症状・お悩み: ${formData.notes || "なし"}`
    );
    const location = encodeURIComponent("整体院・パーソナルジム");
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatISODate(startDate)}/${formatISODate(endDate)}&details=${description}&location=${location}`;
    const icsContent = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
      `DTSTART:${formatISODate(startDate)}`, `DTEND:${formatISODate(endDate)}`,
      `SUMMARY:${decodeURIComponent(title)}`, `DESCRIPTION:${decodeURIComponent(description)}`,
      `LOCATION:${decodeURIComponent(location)}`, "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    return { googleUrl, icsContent };
  };

  const downloadICS = () => {
    if (!formData.firstChoiceDate || !formData.firstChoiceTimeSlot) return;
    const { icsContent } = generateCalendarEvent(formData.firstChoiceDate, formData.firstChoiceTimeSlot);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "reservation.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  };

  // ===== ステップ1: 希望日時選択（1週間横並びカレンダー） =====
  if (step === 1) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekDays = getWeekDays(weekStart);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">無料体験のご予約</h1>
            <p className="text-gray-500 text-sm">3ステップで簡単に予約できます</p>
          </div>
          <StepProgress current={1} total={3} />

          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                ご希望日時を選択
              </CardTitle>
              <CardDescription>
                日付を選んで、時間帯をタップすると次のステップに進みます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* 1週間横並びカレンダー */}
              <div className="space-y-3">
                {/* 週のナビゲーション */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = new Date(weekStart);
                      prev.setDate(weekStart.getDate() - 7);
                      if (prev >= today) setWeekStart(prev);
                    }}
                    disabled={weekStart <= today}
                    className="p-2 rounded-full hover:bg-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                    className="p-2 rounded-full hover:bg-white/70 transition-colors"
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
                        onClick={() => handleDateSelect(date)}
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
              </div>

              {/* 日付選択後に時間帯ボタンを表示 */}
              {formData.firstChoiceDate && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pt-1">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-800">
                      {formData.firstChoiceDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}の時間帯を選択
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const isSelected = formData.firstChoiceTimeSlot === slot.value;
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => handleTimeSlotSelect(slot.value as "10:00-13:00" | "13:00-17:00" | "17:00-")}
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
                          <ChevronRight className={cn("w-4 h-4", isSelected ? "text-blue-200" : "text-gray-400")} />
                        </button>
                      );
                    })}
                  </div>

                  {/* 詳細時間の自由記入欄 */}
                  {formData.firstChoiceTimeSlot && (
                    <div className="space-y-1 pt-1">
                      <label htmlFor="timeDetail" className="text-xs font-medium text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        希望時間の詳細（任意）
                      </label>
                      <input
                        id="timeDetail"
                        type="text"
                        placeholder="例：10時ごろ、午後が希ましいなど"
                        value={formData.firstChoiceTimeDetail}
                        onChange={(e) => handleInputChange("firstChoiceTimeDetail", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      />
                      <p className="text-xs text-gray-400">入力すると次のステップに進みます</p>
                    </div>
                  )}
                </div>
              )}

              {/* 日付未選択時のヒント */}
              {!formData.firstChoiceDate && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  上の日付をタップしてください
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ===== ステップ2: 顧客情報入力（EFO強化版） =====
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">無料体験のご予約</h1>
            <p className="text-gray-500 text-sm">3ステップで簡単に予約できます</p>
          </div>
          <StepProgress current={2} total={3} />

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                お客様情報のご入力
              </CardTitle>
              <CardDescription>
                <span className="text-red-500 font-medium">必須</span> の項目は全てご入力ください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* お名前（フルネーム統合） */}
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

              {/* 電話番号（数字キーパッド） */}
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
                <div className="flex items-center gap-2 mb-1">
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
                  に同意の上、送信してください。
                </label>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <Button onClick={handleBack} variant="outline" size="lg">
                  ← 戻る
                </Button>
                <Button
                  onClick={handleNext}
                  size="lg"
                  className="px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  disabled={!formData.privacyAgreed}
                >
                  内容を確認する →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ===== ステップ3: 確認 =====
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">無料体験のご予約</h1>
            <p className="text-gray-500 text-sm">3ステップで簡単に予約できます</p>
          </div>
          <StepProgress current={3} total={3} />

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                ご予約内容の確認
              </CardTitle>
              <CardDescription>
                内容に間違いがなければ「無料体験を申し込む」ボタンを押してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 顧客情報 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base border-b pb-2 text-gray-700">お客様情報</h3>
                <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">お名前</span>
                    <span className="font-medium">{formData.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">電話番号</span>
                    <span className="font-medium">{formData.customerPhone}</span>
                  </div>
                  {formData.customerEmail && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">メールアドレス</span>
                      <span className="font-medium">{formData.customerEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 希望日時 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base border-b pb-2 text-gray-700">ご希望日時</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="font-medium text-blue-900 text-sm mb-0.5">第1希望</div>
                    <div className="text-sm text-blue-700">{formatDate(formData.firstChoiceDate)} {formData.firstChoiceTimeSlot}</div>
                  </div>
                  {formData.secondChoiceDate && formData.secondChoiceTimeSlot && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="font-medium text-gray-700 text-sm mb-0.5">第2希望</div>
                      <div className="text-sm text-gray-600">{formatDate(formData.secondChoiceDate)} {formData.secondChoiceTimeSlot}</div>
                    </div>
                  )}
                  {formData.thirdChoiceDate && formData.thirdChoiceTimeSlot && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="font-medium text-gray-700 text-sm mb-0.5">第3希望</div>
                      <div className="text-sm text-gray-600">{formatDate(formData.thirdChoiceDate)} {formData.thirdChoiceTimeSlot}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* メモ */}
              <div className="space-y-2">
                <FieldLabel htmlFor="notes" optional>症状・お悩み</FieldLabel>
                <Textarea
                  id="notes"
                  placeholder="例）肩こりがひどい、腰痛が気になるなど"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* プライバシー注釈 */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 border border-gray-100">
                <Shield className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                <span>送信することでプライバシーポリシーに同意したものとみなされます。入力情報は予約確認・ご連絡のみに使用します。</span>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <Button onClick={handleBack} variant="outline" size="lg">
                  ← 戻る
                </Button>
                <Button
                  onClick={handleSubmit}
                  size="lg"
                  className="px-8 bg-green-600 hover:bg-green-700 text-white font-bold text-base"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "送信中..." : "無料体験を申し込む"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ===== ステップ4: 完了 =====
  if (step === 4 && reservationResult) {
    const calendarData = formData.firstChoiceDate && formData.firstChoiceTimeSlot
      ? generateCalendarEvent(formData.firstChoiceDate, formData.firstChoiceTimeSlot)
      : null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">ご予約リクエストを受け付けました！</CardTitle>
              <CardDescription className="text-base mt-1">
                予約ID: <span className="font-mono font-bold">{reservationResult?.reservationId?.slice(0, 8) || "処理中"}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-900 leading-relaxed">
                  ご予約リクエストありがとうございます。確定日時は後ほどご連絡いたします。
                  {formData.customerEmail && " 確認メールをお送りしましたのでご確認ください。"}
                </p>
              </div>

              {/* 予約内容 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base text-gray-700">ご予約内容</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-500">お名前</span>
                    <span className="font-medium">{formData.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">第1希望日時</span>
                    <span className="font-medium">{formatDate(formData.firstChoiceDate)} {formData.firstChoiceTimeSlot}</span>
                  </div>
                </div>
              </div>

              {/* カレンダー追加ボタン */}
              {calendarData && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-base text-gray-700 flex items-center gap-2">
                    <CalendarPlus className="w-4 h-4 text-blue-600" />
                    カレンダーに追加
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={calendarData.googleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                      Google Calendar
                    </a>
                    <button
                      onClick={downloadICS}
                      className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <CalendarIcon className="w-4 h-4 text-gray-600" />
                      Apple / Outlook
                    </button>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setLocation("/")}
                variant="outline"
                className="w-full"
                size="lg"
              >
                トップページへ戻る
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
