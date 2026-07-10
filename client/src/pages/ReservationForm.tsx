import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { siteConfig } from "../../../shared/siteConfig";
import HolidayJp from "@holiday-jp/holiday_jp";
import {
  ChevronLeft, ChevronRight, Loader2, Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 30分刻時間枠を生成（10:00〜19:30、各スロットは1.5時間単位）
function generateTimeSlots(): Array<{ value: string; label: string; endTime: string }> {
  const slots = [];
  for (let h = 10; h <= 19; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 19 && m > 30) break;
      const startH = String(h).padStart(2, "0");
      const startM = String(m).padStart(2, "0");
      const endMinutes = h * 60 + m + 90;
      const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
      const endM = String(endMinutes % 60).padStart(2, "0");
      const value = `${startH}:${startM}`;
      const endTime = `${endH}:${endM}`;
      slots.push({ value, label: `${startH}:${startM}`, endTime });
    }
  }
  return slots;
}

const ALL_TIME_SLOTS = generateTimeSlots();

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
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  type?: string;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}

function MinimalInput({
  id, label, required, optional, value, onChange, onBlur, error, hint, type = "text",
  inputMode, autoComplete,
}: MinimalInputProps) {
  return (
    <div className="space-y-1">
      <div
        className="relative border-b-2 transition-all duration-200"
        style={{ borderColor: error ? "#ef4444" : "#e5e7eb" }}
      >
        <label
          htmlFor={id}
          className="absolute left-0 top-0 text-[10px] tracking-widest uppercase font-medium pointer-events-none select-none text-black"
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
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="w-full pt-5 pb-2 text-base font-medium text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
        />
      </div>
      {error && <p className="text-xs text-red-500 pt-1">{error}</p>}
      {!error && hint && <p className="text-[10px] text-gray-400 pt-1">{hint}</p>}
    </div>
  );
}

// ===== セクションヘッダー =====
function SectionLabel({ number, title, required }: { number: string; title: string; required?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 mb-8">
      <span className="text-[10px] font-black tracking-[0.3em] text-gray-300">{number}</span>
      <h2 className="text-lg font-black text-gray-900 tracking-tight">{title}</h2>
      {required && <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">Required</span>}
    </div>
  );
}

// ===== 完了画面 =====
function CompletionScreen({ name, date, timeSlot }: { name: string; date: Date; timeSlot: string }) {
  const LINE_URL = siteConfig.lineUrlPublic;

  const formatDate = (d: Date) =>
    d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });

  const generateGoogleCalendarUrl = () => {
    const startStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}T${timeSlot.replace(":", "")}00`;
    const [sh, sm] = timeSlot.split(":").map(Number);
    const endMinutes = sh * 60 + sm + 90;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    const endStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}T${endH}${endM}00`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${siteConfig.brandName} 予約`,
      dates: `${startStr}/${endStr}`,
      details: `${name}様の予約`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="h-1 bg-black w-full" />
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-8">
          <Check className="w-6 h-6 text-white" strokeWidth={3} />
        </div>
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 mb-2">Reservation Received</p>
        <h1 className="text-2xl font-black text-gray-900 mb-8 leading-tight">
          ご予約を<br />受け付けました
        </h1>
        <div className="w-full max-w-xs bg-gray-50 p-6 text-left space-y-3 mb-8">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Name</span>
            <span className="text-sm font-bold text-gray-900">{name}</span>
          </div>
          {date && (
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Date</span>
              <span className="text-sm font-bold text-gray-900">{formatDate(date)}</span>
            </div>
          )}
          {timeSlot && (
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Time</span>
              <span className="text-sm font-bold text-gray-900">{timeSlot}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mb-10 max-w-xs">
          担当者より確認のご連絡をいたします。<br />
          LINEでのご連絡を希望の方は、<br />
          公式アカウントよりお名前をお送りください。
        </p>
        <div className="w-full max-w-xs space-y-3">
          <a
            href={LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 bg-[#06C755] text-white font-bold text-sm py-4 px-6 rounded-none tracking-wide transition-all active:opacity-80 touch-manipulation"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            LINE公式アカウントを開く
          </a>
          <a
            href={generateGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 border-2 border-black text-black font-bold text-sm py-4 px-6 tracking-wide transition-all active:opacity-80 touch-manipulation hover:bg-gray-50"
          >
            Googleカレンダーに追加
          </a>
        </div>
      </div>
    </div>
  );
}

// LINEアイコン（SVG）
const LineIcon = () => (
  <svg className="w-5 h-5 text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
  </svg>
);

// ===== メインコンポーネント =====
export default function ReservationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerFurigana: "",
    customerPhone: "",
    customerEmail: "",
    preferLineContact: false,
    privacyAgreed: false,
    firstChoiceDate: undefined as Date | undefined,
    firstChoiceTimeSlot: "" as string,
    notes: "",
  });

  // カレンダー表示月
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // 期間外日付クリック時のLINE案内
  const [showOutOfRangeLine, setShowOutOfRangeLine] = useState(false);

  // 電話番号での既存顧客検索用（blur後に設定）
  const [phoneLookupPhone, setPhoneLookupPhone] = useState("");
  // 既存顧客バナーを手動で閉じた場合
  const [dismissedLookup, setDismissedLookup] = useState(false);

  // 設定取得（定休日・受付締切時間・臨時休業日・予約可能日数）
  const { data: settingsData } = trpc.settings.getClinicSettings.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const closedDays: number[] = settingsData?.closedDays ?? [0];
  const cutoffHours: number = (settingsData as any)?.bookingCutoffHours ?? 4;
  const blockedDates: string[] = (settingsData as any)?.blockedDates ?? [];
  const bookingAdvanceDays: number = (settingsData as any)?.bookingAdvanceDays ?? 7;

  // 月間空き状況取得
  const { data: monthlyAvailability } = trpc.reservations.getMonthlyAvailability.useQuery(
    { year: calMonth.year, month: calMonth.month },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  // 既存顧客検索（電話番号でblur後に実行）
  const { data: existingCustomer, isLoading: isLookingUp } = trpc.reservations.lookupByPhone.useQuery(
    { phone: phoneLookupPhone },
    {
      enabled: isValidPhone(phoneLookupPhone),
      staleTime: 60 * 1000,
      retry: false,
    }
  );

  // 選択日の予約済みスロット
  const selectedDateStr = formData.firstChoiceDate
    ? `${formData.firstChoiceDate.getUTCFullYear()}-${String(formData.firstChoiceDate.getUTCMonth() + 1).padStart(2, "0")}-${String(formData.firstChoiceDate.getUTCDate()).padStart(2, "0")}`
    : "";

  const { data: bookedSlotsData, isLoading: bookedSlotsLoading } = trpc.reservations.getBookedSlots.useQuery(
    { date: selectedDateStr },
    {
      enabled: !!selectedDateStr,
      refetchInterval: 30 * 1000,
      refetchIntervalInBackground: false,
      staleTime: 20 * 1000,
    }
  );

  // スロットが満席かどうか判定
  const isSlotBooked = (slotValue: string): boolean => {
    if (!bookedSlotsData?.slots) return false;
    const [sh, sm] = slotValue.split(":").map(Number);
    const slotStart = sh * 60 + sm;
    const slotEnd = slotStart + 90;
    return bookedSlotsData.slots.some((booked) => {
      const [bsh, bsm] = booked.start.split(":").map(Number);
      const [beh, bem] = booked.end.split(":").map(Number);
      const bookedStart = bsh * 60 + bsm;
      const bookedEnd = beh * 60 + bem;
      return slotStart < bookedEnd && slotEnd > bookedStart;
    });
  };

  // 受付締切チェック
  const isSlotPastCutoff = (date: Date, slotValue: string): boolean => {
    if (!date) return false;
    const [sh, sm] = slotValue.split(":").map(Number);
    const slotDateTime = new Date(Date.UTC(
      date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), sh - 9, sm, 0, 0
    ));
    const now = new Date();
    const cutoffMs = cutoffHours * 60 * 60 * 1000;
    return slotDateTime.getTime() - now.getTime() < cutoffMs;
  };

  // 月カレンダーの日付グリッド生成（先頭の空白を含む）
  const getMonthDays = (year: number, month: number): (Date | null)[] => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDow = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month - 1, d));
    }
    return days;
  };

  // 空き状況インジケーター（DBの予約数から算出）
  const getAvailability = (dateStr: string): "open" | "limited" | "full" | null => {
    if (!monthlyAvailability) return null;
    const count = monthlyAvailability[dateStr] ?? 0;
    if (count >= 10) return "full";
    if (count >= 4) return "limited";
    return "open";
  };

  // 既存顧客情報を自動入力
  const handleApplyExistingCustomer = () => {
    if (!existingCustomer) return;
    setFormData((prev) => ({
      ...prev,
      customerName: existingCustomer.fullName,
      customerEmail: existingCustomer.email || prev.customerEmail,
    }));
    setFieldErrors((prev) => ({ ...prev, customerName: "", customerEmail: "" }));
    setDismissedLookup(true);
    toast.success("お客様情報を自動入力しました");
  };

  // 日本の祝日判定
  const isJapaneseHoliday = (date: Date): { isHoliday: boolean; name: string } => {
    const isHoliday = HolidayJp.isHoliday(date);
    if (!isHoliday) return { isHoliday: false, name: "" };
    const holidays = HolidayJp.between(date, date);
    const name = holidays.length > 0 ? holidays[0].name : "祝日";
    return { isHoliday: true, name };
  };

  // 定休日・臨時休業日・祝日判定
  const isClosedDay = (date: Date): boolean => {
    if (closedDays.includes(date.getDay())) return true;
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (blockedDates.includes(dateStr)) return true;
    return isJapaneseHoliday(date).isHoliday;
  };

  const isOutOfAdvanceRange = (date: Date): boolean => {
    const _today = new Date();
    _today.setHours(0, 0, 0, 0);
    const maxDate = new Date(_today);
    maxDate.setDate(_today.getDate() + bookingAdvanceDays - 1);
    maxDate.setHours(23, 59, 59, 999);
    return date > maxDate;
  };

  // 前月・次月ナビ制御
  const canGoPrevMonth = (): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return calMonth.year > currentYear || (calMonth.year === currentYear && calMonth.month > currentMonth);
  };

  const canGoNextMonth = (): boolean => {
    const nextYear = calMonth.month === 12 ? calMonth.year + 1 : calMonth.year;
    const nextMonth = calMonth.month === 12 ? 1 : calMonth.month + 1;
    const firstOfNext = new Date(nextYear, nextMonth - 1, 1);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + bookingAdvanceDays - 1);
    return firstOfNext <= maxDate;
  };

  const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // フリガナ自動入力（IME compositionイベント）
  const furiganaRef = useRef<{ reading: string }>({ reading: "" });

  const toKatakana = (str: string) =>
    str.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

  const handleNameCompositionStart = () => {
    furiganaRef.current.reading = "";
  };

  const handleNameCompositionUpdate = (e: React.CompositionEvent<HTMLInputElement>) => {
    const data = e.data || "";
    if (data && /^[\u3041-\u3096\u30A0-\u30FF\s\u3000]+$/.test(data)) {
      furiganaRef.current.reading = data;
    }
  };

  const handleNameCompositionEnd = () => {
    const reading = furiganaRef.current.reading;
    if (reading) {
      const kana = toKatakana(reading);
      setFormData((prev) => ({
        ...prev,
        customerFurigana: prev.customerFurigana ? prev.customerFurigana + kana : kana,
      }));
    }
    furiganaRef.current.reading = "";
  };

  const facilityId = siteConfig.facilityId;

  const selectedSlotInfo = ALL_TIME_SLOTS.find(s => s.value === formData.firstChoiceTimeSlot);
  const selectedSlotLabel = selectedSlotInfo
    ? `${selectedSlotInfo.value} 〜 ${selectedSlotInfo.endTime}`
    : "";

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
    } else if (field === "notes") {
      if (!value.trim()) error = "お悩み・症状・ご要望を入力してください";
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
    if (isValidPhone(normalized)) {
      setPhoneLookupPhone(normalized);
      setDismissedLookup(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.firstChoiceDate || !formData.firstChoiceTimeSlot) {
      toast.error("希望日時を選択してください");
      document.getElementById("section-datetime")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const notesOk = validateField("notes", formData.notes);
    if (!notesOk) {
      toast.error("お悩み・症状・ご要望を入力してください");
      document.getElementById("section-notes")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      firstChoiceTimeSlot: formData.firstChoiceTimeSlot,
      firstChoiceTimeDetail: undefined,
      secondChoiceDate: undefined,
      secondChoiceTimeSlot: undefined as any,
      thirdChoiceDate: undefined,
      thirdChoiceTimeSlot: undefined as any,
      notes: formData.notes || undefined,
    });
  };

  if (submitted) {
    return (
      <CompletionScreen
        name={formData.customerName}
        date={formData.firstChoiceDate!}
        timeSlot={selectedSlotLabel}
      />
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthDays = getMonthDays(calMonth.year, calMonth.month);

  // 選択日の表示用文字列（UTC日付を使用）
  const selectedDateDisplay = formData.firstChoiceDate
    ? (() => {
        const d = formData.firstChoiceDate;
        const y = d.getUTCFullYear();
        const mo = d.getUTCMonth() + 1;
        const da = d.getUTCDate();
        const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
        return `${mo}月${da}日(${dow})`;
      })()
    : "";

  return (
    <div className="min-h-screen bg-white">
      {/* トップバー */}
      <div className="h-1 bg-black w-full" />

      {/* ヘッダー */}
      <header className="px-6 pt-10 pb-8 border-b border-gray-100">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 mb-2">{siteConfig.brandName}</p>
        <h1 className="text-3xl font-black text-gray-900 leading-tight tracking-tight">
          予約フォーム
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

          {/* 月ナビゲーション */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => {
                setCalMonth((prev) => {
                  if (prev.month === 1) return { year: prev.year - 1, month: 12 };
                  return { year: prev.year, month: prev.month - 1 };
                });
              }}
              disabled={!canGoPrevMonth()}
              className="w-8 h-8 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
              aria-label="前の月"
            >
              <ChevronLeft className="w-5 h-5 text-gray-900" />
            </button>
            <span className="text-sm font-black tracking-widest text-gray-800">
              {calMonth.year}年{calMonth.month}月
            </span>
            <button
              type="button"
              onClick={() => {
                setCalMonth((prev) => {
                  if (prev.month === 12) return { year: prev.year + 1, month: 1 };
                  return { year: prev.year, month: prev.month + 1 };
                });
              }}
              disabled={!canGoNextMonth()}
              className="w-8 h-8 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
              aria-label="次の月"
            >
              <ChevronRight className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((label, i) => (
              <div key={label} className={cn(
                "text-center text-[10px] font-bold py-1.5",
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
              )}>
                {label}
              </div>
            ))}
          </div>

          {/* 月カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-sm">
            {monthDays.map((date, i) => {
              if (!date) {
                return <div key={`empty-${i}`} className="bg-white aspect-square" />;
              }

              const isPast = date < today;
              const isClosed = isClosedDay(date);
              const isOutOfRange = isOutOfAdvanceRange(date);
              const holidayInfo = isJapaneseHoliday(date);
              const isSelected = formData.firstChoiceDate
                ? (formData.firstChoiceDate.getUTCFullYear() === date.getFullYear() &&
                   formData.firstChoiceDate.getUTCMonth() === date.getMonth() &&
                   formData.firstChoiceDate.getUTCDate() === date.getDate())
                : false;
              const isToday = date.toDateString() === today.toDateString();
              const dow = date.getDay();
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              const availability = (!isPast && !isClosed && !isOutOfRange) ? getAvailability(dateStr) : null;
              const isDisabled = isPast || isClosed;
              const isOutOfRangeClickable = isOutOfRange && !isPast && !isClosed;

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={isDisabled && !isOutOfRangeClickable}
                  onClick={() => {
                    if (holidayInfo.isHoliday) {
                      toast.error(`${holidayInfo.name}のため休業日です`);
                      return;
                    }
                    if (isOutOfRangeClickable) {
                      setShowOutOfRangeLine(true);
                      return;
                    }
                    setShowOutOfRangeLine(false);
                    const utcNoon = new Date(Date.UTC(
                      date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0
                    ));
                    setFormData((prev) => ({
                      ...prev,
                      firstChoiceDate: utcNoon,
                      firstChoiceTimeSlot: "",
                    }));
                  }}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-center bg-white transition-all select-none",
                    "active:scale-90 touch-manipulation",
                    isDisabled && !isOutOfRangeClickable && "opacity-20 cursor-not-allowed",
                    isOutOfRangeClickable && "opacity-40 cursor-pointer hover:opacity-60",
                    isSelected && "bg-black",
                    !isSelected && !isDisabled && !isOutOfRangeClickable && "hover:bg-gray-50",
                    isToday && !isSelected && "ring-1 ring-inset ring-black",
                  )}
                >
                  <span className={cn(
                    "text-sm font-bold leading-none",
                    isSelected ? "text-white"
                      : (dow === 0 || holidayInfo.isHoliday) ? "text-red-500"
                      : dow === 6 ? "text-blue-500"
                      : "text-gray-900"
                  )}>
                    {date.getDate()}
                  </span>
                  {/* 空き状況インジケーター */}
                  {availability && !isSelected && (
                    <span className={cn(
                      "text-[9px] font-bold leading-none mt-0.5",
                      availability === "open" && "text-green-500",
                      availability === "limited" && "text-orange-400",
                      availability === "full" && "text-gray-300",
                    )}>
                      {availability === "open" ? "○" : availability === "limited" ? "△" : "×"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 凡例 */}
          <div className="flex items-center gap-5 mt-2 px-1">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="text-green-500 font-bold text-xs">○</span>空きあり
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="text-orange-400 font-bold text-xs">△</span>残りわずか
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="text-gray-300 font-bold text-xs">×</span>満席
            </span>
          </div>

          {/* 期間外日付クリック時のLINE案内 */}
          {showOutOfRangeLine && (
            <a
              href={siteConfig.lineUrlPublic}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-3 bg-[#06C755] px-4 py-3 w-full transition-opacity active:opacity-80 touch-manipulation"
            >
              <LineIcon />
              <div className="flex-1">
                <p className="text-white text-xs font-black leading-tight">その日のご予約は、LINEよりお問い合わせください</p>
                <p className="text-white/80 text-[10px] mt-0.5">タップしてLINEを開く</p>
              </div>
            </a>
          )}

          {/* 時間帯選択 */}
          {formData.firstChoiceDate ? (
            <div className="mt-6">
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-4">
                {selectedDateDisplay} の時間を選択
              </p>
              {bookedSlotsLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs tracking-wider">予約状況を確認中...</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {ALL_TIME_SLOTS.map((slot) => {
                    const isSelected = formData.firstChoiceTimeSlot === slot.value;
                    const isBooked = isSlotBooked(slot.value);
                    const isPastCutoff = formData.firstChoiceDate
                      ? isSlotPastCutoff(formData.firstChoiceDate, slot.value)
                      : false;
                    const isUnavailable = isBooked || isPastCutoff;
                    const unavailableLabel = isBooked ? "満席" : isPastCutoff ? "受付終了" : "";
                    return (
                      <button
                        key={slot.value}
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => !isUnavailable && handleInputChange("firstChoiceTimeSlot", slot.value)}
                        className={cn(
                          "flex flex-col items-center justify-center py-3 px-2 border transition-all",
                          "active:scale-[0.96] touch-manipulation",
                          isUnavailable && "bg-gray-100 border-gray-100 cursor-not-allowed opacity-50",
                          isSelected && !isUnavailable && "bg-black border-black",
                          !isSelected && !isUnavailable && "bg-white border-gray-200 hover:border-gray-900",
                        )}
                      >
                        <span className={cn(
                          "text-sm font-black leading-none",
                          isUnavailable ? "text-gray-400" : isSelected ? "text-white" : "text-gray-900"
                        )}>
                          {slot.value}
                        </span>
                        <span className={cn(
                          "text-[9px] mt-1 tracking-wider",
                          isUnavailable ? "text-gray-300" : isSelected ? "text-gray-400" : "text-gray-400"
                        )}>
                          {isUnavailable ? unavailableLabel : `〜${slot.endTime}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {formData.firstChoiceTimeSlot && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  選択中: <span className="font-bold text-gray-900">{selectedSlotLabel}</span>
                </p>
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

        {/* ===== LINE予約案内 ===== */}
        <a
          href={siteConfig.lineUrlPublic}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-[#06C755] px-4 py-3.5 flex items-center gap-3 hover:bg-[#05b34c] active:opacity-80 transition-colors touch-manipulation"
        >
          <div className="shrink-0 w-9 h-9 bg-white rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#06C755">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold leading-tight">お急ぎの方・LINEで直接ご予約も可能です</p>
            <p className="text-green-100 text-[11px] mt-0.5 leading-tight">満席の場合や時間の相談はお気軽にお問い合わせください</p>
          </div>
        </a>

        {/* ===== セクション2: お悩み・症状・ご要望 ===== */}
        <section id="section-notes">
          <SectionLabel number="02" title="お悩み・症状・ご要望" required />

          <div>
            <div className="relative border-b-2 transition-all duration-200"
              style={{ borderColor: fieldErrors.notes ? "#ef4444" : "#e5e7eb" }}>
              <textarea
                id="notes"
                placeholder="例：肩こりがひどい、腰痛が続いている、ダイエットしたいなど&#10;お気軽にご記入ください"
                value={formData.notes}
                onChange={(e) => {
                  handleInputChange("notes", e.target.value);
                  if (fieldErrors.notes && e.target.value.trim()) {
                    setFieldErrors((prev) => ({ ...prev, notes: "" }));
                  }
                }}
                onBlur={() => validateField("notes", formData.notes)}
                className="w-full pt-2 pb-3 text-sm text-gray-900 bg-transparent outline-none placeholder:text-gray-300 resize-none h-28 focus:border-black transition-colors"
              />
            </div>
            {fieldErrors.notes && (
              <p className="text-xs text-red-500 pt-1">{fieldErrors.notes}</p>
            )}
            {!fieldErrors.notes && (
              <p className="text-[10px] text-gray-400 pt-1">担当者が事前に確認し、より良い施術のご提案をいたします</p>
            )}
          </div>
        </section>

        {/* 区切り線 */}
        <div className="border-t border-gray-100" />

        {/* ===== セクション3: お客様情報 ===== */}
        <section id="section-info">
          <SectionLabel number="03" title="お客様情報" required />

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
            <div>
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

              {/* 既存顧客の自動認識バナー */}
              {isLookingUp && isValidPhone(phoneLookupPhone) && (
                <div className="mt-2 flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-[10px] tracking-wider">顧客情報を確認中...</span>
                </div>
              )}
              {existingCustomer && !dismissedLookup && phoneLookupPhone && (
                <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-200 px-3 py-2.5">
                  <div>
                    <p className="text-xs font-black text-blue-900">{existingCustomer.fullName}様ですか？</p>
                    <p className="text-[10px] text-blue-500 mt-0.5">タップでお名前・メールを自動入力します</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleApplyExistingCustomer}
                      className="text-[11px] font-black text-white bg-blue-600 px-3 py-1.5 active:opacity-80 touch-manipulation"
                    >
                      はい
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissedLookup(true)}
                      className="text-[11px] text-blue-400 px-2 py-1.5 touch-manipulation"
                    >
                      別の方
                    </button>
                  </div>
                </div>
              )}
            </div>

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
                <span className="text-sm font-bold text-gray-900">{selectedDateDisplay}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Time</span>
                <span className="text-sm font-bold text-gray-900">{selectedSlotLabel}</span>
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
              {formData.notes && (
                <div className="flex justify-between items-start gap-4">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400 flex-shrink-0">Memo</span>
                  <span className="text-xs text-gray-700 text-right line-clamp-2">{formData.notes}</span>
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
              "予約を申し込む"
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
