import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft, ChevronRight, Loader2, Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [
  { value: "10:00-13:00", label: "午前", sub: "10:00 〜 13:00" },
  { value: "13:00-17:00", label: "午後", sub: "13:00 〜 17:00" },
  { value: "17:00-", label: "夜間", sub: "17:00 〜" },
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

// ===== ミニマルインプット =====
interface MinimalInputProps {
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

function MinimalInput({
  id, label, required, optional, value, onChange, onBlur, error, hint, type = "text",
  inputMode, placeholder, autoComplete,
}: MinimalInputProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;

  return (
    <div className="space-y-1">
      <div className="relative border-b-2 transition-all duration-200"
        style={{ borderColor: error ? "#ef4444" : focused ? "#000000" : "#e5e7eb" }}>
        <label
          htmlFor={id}
          className={cn(
            "absolute left-0 transition-all duration-200 pointer-events-none select-none font-medium",
            (focused || hasValue)
              ? "top-0 text-[10px] tracking-widest uppercase"
              : "top-3 text-sm text-gray-400",
            error && (focused || hasValue) ? "text-red-500" : (focused || hasValue) ? "text-black" : "",
          )}
        >
          {label}
          {required && <span className="ml-1.5 text-[9px] font-bold text-red-500 tracking-wider">必須</span>}
          {optional && <span className="ml-1.5 text-[9px] text-gray-400 tracking-wider">任意</span>}
        </label>
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value}
          placeholder={(focused || hasValue) ? (placeholder || "") : ""}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          className="w-full bg-transparent pt-5 pb-2 text-sm text-gray-900 outline-none placeholder:text-gray-300"
        />
      </div>
      {error && <p className="text-xs text-red-500 pt-0.5">{error}</p>}
      {!error && hint && <p className="text-xs text-gray-400 pt-0.5">{hint}</p>}
    </div>
  );
}

// ===== セクションヘッダー =====
function SectionLabel({ number, title, required }: { number: string; title: string; required?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 mb-6">
      <span className="text-5xl font-black text-gray-100 leading-none select-none">{number}</span>
      <div>
        <h2 className="text-base font-bold text-gray-900 tracking-tight leading-none">{title}</h2>
        {required && <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">Required</span>}
      </div>
    </div>
  );
}

// ===== 完了画面 =====
function CompletionScreen({ name, date, timeSlot }: { name: string; date: Date; timeSlot: string }) {
  const formatDate = (d: Date) =>
    d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });

  const slotLabel = TIME_SLOTS.find(s => s.value === timeSlot)?.sub ?? timeSlot;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* トップバー */}
      <div className="h-1 bg-black w-full" />

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        {/* チェックマーク */}
        <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center mb-8">
          <Check className="w-7 h-7 text-black" strokeWidth={2.5} />
        </div>

        <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-400 mb-2">Reservation Received</p>
        <h1 className="text-2xl font-black text-gray-900 mb-1 text-center">予約リクエストを</h1>
        <h1 className="text-2xl font-black text-gray-900 mb-8 text-center">受け付けました</h1>

        <p className="text-sm text-gray-500 text-center mb-10 leading-relaxed">
          {name} 様、ありがとうございます。<br />
          担当者より確認のご連絡をさしあげます。
        </p>

        {/* 予約内容 */}
        <div className="w-full max-w-xs border-t border-b border-gray-100 py-6 space-y-4 mb-10">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">Date</p>
            <p className="text-base font-bold text-gray-900">{formatDate(date)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">Time</p>
            <p className="text-base font-bold text-gray-900">{slotLabel}</p>
          </div>
        </div>

        {/* LINE友だち追加ボタン */}
        <a
          href="https://lin.ee/9LXLjNI"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-[#06C755] text-white font-bold text-sm py-4 px-6 rounded-none tracking-wide transition-all active:opacity-80 touch-manipulation"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white flex-shrink-0">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
          LINE公式アカウントで友だち追加
        </a>

        <p className="text-xs text-gray-400 mt-6 text-center">
          ご不明な点はLINEまたはお電話でお問い合わせください。
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
    customerFurigana: "",
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
  // フリガナ自動入力: IME compositionイベントで読み仮名を取得
  // 重要: compositionEndのe.dataは変換後の漢字なので使わない。
  // compositionUpdateのe.dataには変換中のひらがな読みが入るので、
  // ひらがなの間のみ保存し、漢字変換後は直前の読みを維持する。
  const furiganaRef = useRef<{ reading: string }>({
    reading: "",
  });

  // ひらがな→カタカナ変換
  const toKatakana = (str: string) =>
    str.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

  const handleNameCompositionStart = () => {
    furiganaRef.current.reading = "";
  };

  const handleNameCompositionUpdate = (e: React.CompositionEvent<HTMLInputElement>) => {
    const data = e.data || "";
    // ひらがな・カタカナ・スペースのみ保存（漢字変換後は無視して直前の読みを維持）
    if (data && /^[\u3041-\u3096\u30A0-\u30FF\s\u3000]+$/.test(data)) {
      furiganaRef.current.reading = data;
    }
  };

  const handleNameCompositionEnd = () => {
    // compositionEndのe.dataは変換後の漢字なので使わず、
    // compositionUpdateで蓄積したひらがな読みをカタカナ変換する
    const reading = furiganaRef.current.reading;
    if (reading) {
      const kana = toKatakana(reading);
      setFormData((prev) => ({
        ...prev,
        customerFurigana: prev.customerFurigana
          ? prev.customerFurigana + kana
          : kana,
      }));
    }
    furiganaRef.current.reading = "";
  };

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
    } else if (field === "customerFurigana" && value.trim()) {
      // カタカナのみ許可（スペース含む）
      if (!/^[\u30A0-\u30FF\s　]+$/.test(value.trim())) {
        error = "カタカナで入力してください";
      }
    } else if (field === "customerPhone") {
      const normalized = normalizePhone(value);
      if (!normalized) error = "電話番号を入力してください";
      else if (!isValidPhone(normalized)) error = "10〜11桁の数字で入力してください（例: 09012345678）";
    } else if (field === "customerEmail") {
      if (!value.trim()) error = "メールアドレスを入力してください";
      else if (!isValidEmail(value)) error = "形式が正しくありません（例: name@example.com）";
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
      customerFurigana: formData.customerFurigana || undefined,
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

  const selectedSlot = TIME_SLOTS.find(s => s.value === formData.firstChoiceTimeSlot);

  return (
    <div className="min-h-screen bg-white">
      {/* トップバー */}
      <div className="h-1 bg-black w-full" />

      {/* ヘッダー */}
      <header className="px-6 pt-10 pb-8 border-b border-gray-100">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 mb-2">ULU GROUP</p>
        <h1 className="text-3xl font-black text-gray-900 leading-tight tracking-tight">
          無料体験<br />ご予約
        </h1>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          フォームにご入力の上、お申し込みください。<br />
          担当者より確認のご連絡をさしあげます。
        </p>
      </header>

      <div className="px-6 py-10 space-y-14 max-w-lg mx-auto">

        {/* ===== セクション1: 希望日時 ===== */}
        <section id="section-datetime">
          <SectionLabel number="01" title="ご希望日時" required />

          {/* 週ナビゲーション */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => {
                const prev = new Date(weekStart);
                prev.setDate(weekStart.getDate() - 7);
                if (prev >= today) setWeekStart(prev);
              }}
              disabled={weekStart <= today}
              className="w-8 h-8 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
              aria-label="前の週"
            >
              <ChevronLeft className="w-5 h-5 text-gray-900" />
            </button>
            <span className="text-xs font-bold tracking-widest text-gray-500">
              {weekStart.getFullYear()}.{String(weekStart.getMonth() + 1).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = new Date(weekStart);
                next.setDate(weekStart.getDate() + 7);
                setWeekStart(next);
              }}
              className="w-8 h-8 flex items-center justify-center transition-opacity"
              aria-label="次の週"
            >
              <ChevronRight className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* 日付ボタン列 */}
          <div className="grid grid-cols-7 gap-1">
            {/* 曜日ヘッダー */}
            {DAY_LABELS.map((d, i) => (
              <div key={d} className={cn(
                "text-center text-[10px] font-bold tracking-wider pb-2",
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
              )}>
                {d}
              </div>
            ))}
            {/* 日付 */}
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
                    "aspect-square flex flex-col items-center justify-center text-sm font-bold transition-all select-none",
                    "active:scale-90 touch-manipulation",
                    isPast && "opacity-20 cursor-not-allowed",
                    isSelected && "bg-black text-white",
                    !isSelected && !isPast && "hover:bg-gray-100",
                    !isSelected && isToday && "ring-1 ring-black ring-inset",
                  )}
                >
                  <span className={cn(
                    "text-base leading-none",
                    isSelected ? "text-white" : isSun ? "text-red-500" : isSat ? "text-blue-500" : "text-gray-900"
                  )}>
                    {date.getDate()}
                  </span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-black mt-1 block" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 時間帯選択 */}
          {formData.firstChoiceDate ? (
            <div className="mt-6 space-y-2">
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-3">
                {formData.firstChoiceDate.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })} の時間帯
              </p>
              <div className="space-y-2">
                {TIME_SLOTS.map((slot) => {
                  const isSelected = formData.firstChoiceTimeSlot === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => handleInputChange("firstChoiceTimeSlot", slot.value)}
                      className={cn(
                        "w-full flex items-center justify-between px-5 py-4 border transition-all",
                        "active:scale-[0.98] touch-manipulation text-left",
                        isSelected
                          ? "bg-black border-black text-white"
                          : "bg-white border-gray-200 text-gray-900 hover:border-gray-900"
                      )}
                    >
                      <div>
                        <p className={cn("text-base font-bold leading-none mb-1", isSelected ? "text-white" : "text-gray-900")}>
                          {slot.label}
                        </p>
                        <p className={cn("text-xs", isSelected ? "text-gray-300" : "text-gray-400")}>
                          {slot.sub}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 詳細時間 */}
              {formData.firstChoiceTimeSlot && (
                <div className="pt-4">
                  <MinimalInput
                    id="timeDetail"
                    label="希望時間の詳細"
                    optional
                    value={formData.firstChoiceTimeDetail}
                    onChange={(v) => handleInputChange("firstChoiceTimeDetail", v)}
                    placeholder="例：10時ごろ、午後が希望など"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 py-8 border border-dashed border-gray-200 text-center">
              <p className="text-xs text-gray-400 tracking-wide">上の日付をタップしてください</p>
            </div>
          )}
        </section>

        {/* 区切り線 */}
        <div className="border-t border-gray-100" />

        {/* ===== セクション2: お客様情報 ===== */}
        <section id="section-info">
          <SectionLabel number="02" title="お客様情報" required />

          <div className="space-y-8">
            {/* お名前 */}
            <div className="space-y-1">
              <div className="relative border-b-2 transition-all duration-200"
                style={{ borderColor: fieldErrors.customerName ? "#ef4444" : "#e5e7eb" }}>
                <label
                  htmlFor="name"
                  className="absolute left-0 top-0 text-[10px] tracking-widest uppercase font-medium pointer-events-none select-none text-black"
                >
                  お名前（フルネーム）
                  <span className="ml-1.5 text-[9px] font-bold text-red-500 tracking-wider">必須</span>
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={formData.customerName}
                  placeholder="例：山田 太郎"
                  onChange={(e) => handleInputChange("customerName", e.target.value)}
                  onBlur={() => validateField("customerName", formData.customerName)}
                  onCompositionStart={handleNameCompositionStart}
                  onCompositionUpdate={handleNameCompositionUpdate}
                  onCompositionEnd={handleNameCompositionEnd}
                  className="w-full pt-5 pb-2 text-base font-medium text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                />
              </div>
              {fieldErrors.customerName && (
                <p className="text-xs text-red-500 pt-1">{fieldErrors.customerName}</p>
              )}
            </div>

            {/* フリガナ（自動入力） */}
            <MinimalInput
              id="furigana"
              label="フリガナ"
              optional
              value={formData.customerFurigana}
              onChange={(v) => handleInputChange("customerFurigana", v)}
              onBlur={() => validateField("customerFurigana", formData.customerFurigana)}
              error={fieldErrors.customerFurigana}
              hint="名前を入力すると自動で入ります（カタカナ）"
              autoComplete="off"
            />

            {/* 電話番号 */}
            <MinimalInput
              id="phone"
              label="電話番号"
              required
              type="tel"
              inputMode="numeric"
              value={formData.customerPhone}
              onChange={(v) => handleInputChange("customerPhone", v)}
              onBlur={handlePhoneBlur}
              error={fieldErrors.customerPhone}
              hint="ハイフン不要・全角でも自動変換（例：09012345678）"
              autoComplete="tel"
            />

            {/* メールアドレス */}
            <MinimalInput
              id="email"
              label="メールアドレス"
              required
              type="email"
              inputMode="email"
              value={formData.customerEmail}
              onChange={(v) => handleInputChange("customerEmail", v)}
              onBlur={() => validateField("customerEmail", formData.customerEmail)}
              error={fieldErrors.customerEmail}
              hint="予約確認メールをお送りします"
              autoComplete="email"
            />
          </div>
        </section>

        {/* 区切り線 */}
        <div className="border-t border-gray-100" />

        {/* ===== セクション3: 住所 ===== */}
        <section>
          <SectionLabel number="03" title="ご住所" />

          <div className="space-y-8">
            {/* 郵便番号 */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <MinimalInput
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
                  hint="7桁・ハイフン不要"
                  autoComplete="postal-code"
                />
              </div>
              <button
                type="button"
                onClick={() => fetchAddressByPostalCode(formData.postalCode)}
                disabled={postalLoading || formData.postalCode.replace(/[\s\-]/g, "").length !== 7}
                className="pb-2 text-xs font-bold tracking-wider text-black border-b-2 border-black hover:opacity-60 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity whitespace-nowrap flex items-center gap-1"
              >
                {postalLoading ? <><Loader2 className="w-3 h-3 animate-spin" />検索中</> : "住所検索"}
              </button>
            </div>

            <MinimalInput
              id="prefecture"
              label="都道府県"
              optional
              value={formData.prefecture}
              onChange={(v) => handleInputChange("prefecture", v)}
              hint="郵便番号から自動入力"
              autoComplete="address-level1"
            />
            <MinimalInput
              id="city"
              label="市区町村"
              optional
              value={formData.city}
              onChange={(v) => handleInputChange("city", v)}
              hint="郵便番号から自動入力"
              autoComplete="address-level2"
            />
            <MinimalInput
              id="addressLine"
              label="番地・建物名等"
              optional
              value={formData.addressLine}
              onChange={(v) => handleInputChange("addressLine", v)}
              hint="例：1-2-3 マンション名101"
              autoComplete="address-line1"
            />
          </div>
        </section>

        {/* 区切り線 */}
        <div className="border-t border-gray-100" />

        {/* ===== セクション4: その他 ===== */}
        <section>
          <SectionLabel number="04" title="その他" />

          <div className="space-y-8">
            {/* 症状・お悩み */}
            <div>
              <label htmlFor="notes" className="block text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-3">
                症状・お悩み・ご要望 <span className="text-gray-300">— 任意</span>
              </label>
              <textarea
                id="notes"
                placeholder="例：肩こりがひどい、腰痛が続いている、ダイエットしたいなど"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                className="w-full border-b-2 border-gray-200 bg-transparent pt-2 pb-3 text-sm text-gray-900 outline-none placeholder:text-gray-300 resize-none h-20 focus:border-black transition-colors"
              />
            </div>

            {/* LINE連絡希望 */}
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className={cn(
                "w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-all",
                formData.preferLineContact ? "bg-[#06C755] border-[#06C755]" : "border-gray-300 group-hover:border-gray-600"
              )}>
                {formData.preferLineContact && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={formData.preferLineContact}
                onChange={(e) => handleInputChange("preferLineContact", e.target.checked)}
              />
              <div>
                <p className="text-sm font-bold text-gray-900">LINEでの連絡を希望する</p>
                <p className="text-xs text-gray-400">任意</p>
              </div>
            </label>
          </div>
        </section>

        {/* 区切り線 */}
        <div className="border-t border-gray-100" />

        {/* ===== 入力内容サマリー ===== */}
        {formData.firstChoiceDate && formData.firstChoiceTimeSlot && formData.customerName && (
          <section>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 mb-4">Confirmation</p>
            <div className="bg-gray-50 p-5 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Date</span>
                <span className="text-sm font-bold text-gray-900">
                  {formData.firstChoiceDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Time</span>
                <span className="text-sm font-bold text-gray-900">
                  {selectedSlot?.sub}
                  {formData.firstChoiceTimeDetail && ` (${formData.firstChoiceTimeDetail})`}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Name</span>
                <span className="text-sm font-bold text-gray-900">{formData.customerName}</span>
              </div>
              {formData.customerPhone && (
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Tel</span>
                  <span className="text-sm font-bold text-gray-900">{formData.customerPhone}</span>
                </div>
              )}
              {formData.customerEmail && (
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Email</span>
                  <span className="text-sm font-bold text-gray-900 truncate max-w-[60%] text-right">{formData.customerEmail}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===== プライバシーポリシー同意 ===== */}
        <label className="flex items-start gap-4 cursor-pointer group">
          <div className={cn(
            "w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
            formData.privacyAgreed ? "bg-black border-black" : "border-gray-300 group-hover:border-gray-600"
          )}>
            {formData.privacyAgreed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={formData.privacyAgreed}
            onChange={(e) => handleInputChange("privacyAgreed", e.target.checked)}
          />
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-bold text-gray-900">個人情報の取り扱いへの同意</span>
            <span className="ml-1 text-[10px] font-bold text-red-500">必須</span>
            <br />
            入力いただいた個人情報は、予約確認・ご連絡のみに使用します。
            <a href="/privacy" className="underline text-gray-900 ml-1" target="_blank" rel="noopener noreferrer">
              プライバシーポリシー
            </a>
            をご確認ください。
          </p>
        </label>

        {/* ===== 送信ボタン ===== */}
        <div className="pb-10">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className={cn(
              "w-full py-5 text-sm font-black tracking-[0.2em] uppercase transition-all",
              "active:scale-[0.98] touch-manipulation",
              createMutation.isPending
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-black text-white hover:bg-gray-900"
            )}
          >
            {createMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                送信中...
              </span>
            ) : (
              "無料体験を申し込む"
            )}
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-4 tracking-wider">
            送信後、担当者よりご連絡いたします
          </p>
        </div>

      </div>
    </div>
  );
}
