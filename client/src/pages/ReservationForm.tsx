// Reformer’s Atelier: 顧客には、Notion正本の予約枠を迷いなく選べる静かな予約体験を提供する。
import { useMemo, useState } from "react";
import HolidayJp from "@holiday-jp/holiday_jp";
import { trpc } from "@/lib/trpc";
import { siteConfig } from "../../../shared/siteConfig";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Loader2, LockKeyhole, Phone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MenuValue = (typeof siteConfig.reservationMenus)[number]["value"];

type BookingForm = {
  menu: MenuValue;
  date?: Date;
  time: string;
  name: string;
  furigana: string;
  phone: string;
  email: string;
  notes: string;
  agreed: boolean;
};

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

function createUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

function todayInJapan() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return createUtcDate(Number(value.year), Number(value.month) - 1, Number(value.day));
}

function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function displayDate(date: Date) {
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日（${DAYS[date.getUTCDay()]}）`;
}

function timeSlots() {
  const [openHour, openMinute] = siteConfig.openTime.split(":").map(Number);
  const [closeHour, closeMinute] = siteConfig.closeTime.split(":").map(Number);
  const opening = openHour * 60 + openMinute;
  const closing = closeHour * 60 + closeMinute;
  const slots: Array<{ start: string; end: string }> = [];
  for (let minutes = opening; minutes + siteConfig.appointmentDurationMinutes <= closing; minutes += siteConfig.slotIntervalMinutes) {
    const format = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
    slots.push({ start: format(minutes), end: format(minutes + siteConfig.appointmentDurationMinutes) });
  }
  return slots;
}

const SLOTS = timeSlots();

function serviceTypeFor(menu: MenuValue): "整体" | "パーソナルトレーニング" {
  return menu === "gym" || menu === "combo" ? "パーソナルトレーニング" : "整体";
}

function isHolidayOrSunday(date: Date) {
  return date.getUTCDay() === 0 || HolidayJp.isHoliday(date);
}

export default function ReservationForm() {
  const [weekStart, setWeekStart] = useState(() => todayInJapan());
  const [form, setForm] = useState<BookingForm>({
    menu: "initial",
    time: "",
    name: "",
    furigana: "",
    phone: "",
    email: "",
    notes: "",
    agreed: false,
  });
  const [completed, setCompleted] = useState(false);
  const today = useMemo(() => todayInJapan(), []);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => createUtcDate(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate() + index)),
    [weekStart]
  );
  const weekEnd = weekDays[6];
  const monthOne = { year: weekStart.getUTCFullYear(), month: weekStart.getUTCMonth() + 1 };
  const monthTwo = { year: weekEnd.getUTCFullYear(), month: weekEnd.getUTCMonth() + 1 };
  const spansMonths = monthOne.year !== monthTwo.year || monthOne.month !== monthTwo.month;
  const selectedDateKey = form.date ? dateKey(form.date) : "";

  const { data: settings } = trpc.settings.getClinicSettings.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const bookingAdvanceDays = (settings as { bookingAdvanceDays?: number } | undefined)?.bookingAdvanceDays ?? 28;
  const blockedDates = (settings as { blockedDates?: string[] } | undefined)?.blockedDates ?? [];
  const { data: monthOneAvailability } = trpc.reservations.getMonthlyAvailability.useQuery(monthOne, { staleTime: 30 * 1000 });
  const { data: monthTwoAvailability } = trpc.reservations.getMonthlyAvailability.useQuery(monthTwo, { enabled: spansMonths, staleTime: 30 * 1000 });
  const { data: bookedSlots, isLoading: isSlotsLoading, error: slotsError } = trpc.reservations.getBookedSlots.useQuery(
    { date: selectedDateKey },
    { enabled: Boolean(selectedDateKey), staleTime: 15 * 1000, refetchInterval: 30 * 1000 }
  );

  const createReservation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      setCompleted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (error) => toast.error(error.message),
  });

  const availability = { ...monthOneAvailability, ...(spansMonths ? monthTwoAvailability : {}) };
  const maxDate = useMemo(() => createUtcDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + bookingAdvanceDays - 1), [today, bookingAdvanceDays]);
  const isDateClosed = (date: Date) => isHolidayOrSunday(date) || blockedDates.includes(dateKey(date)) || date < today || date > maxDate;
  const isSlotUnavailable = (slot: { start: string; end: string }) => {
    return (bookedSlots?.slots ?? []).some((booked) => slot.start < booked.end && slot.end > booked.start);
  };

  const updateForm = <Key extends keyof BookingForm>(key: Key, value: BookingForm[Key]) => setForm((current) => ({ ...current, [key]: value }));
  const selectDate = (date: Date) => {
    if (isDateClosed(date)) return;
    setForm((current) => ({ ...current, date, time: "" }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.date || !form.time) return toast.error("予約日時を選択してください");
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) return toast.error("お名前、電話番号、メールアドレスを入力してください");
    if (!/^\d{10,11}$/.test(form.phone.replace(/[-\s]/g, ""))) return toast.error("電話番号は10〜11桁の数字で入力してください");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error("メールアドレスの形式を確認してください");
    if (!form.agreed) return toast.error("個人情報の取り扱いへの同意が必要です");

    createReservation.mutate({
      facilityId: siteConfig.facilityId,
      customerName: form.name.trim(),
      customerFurigana: form.furigana.trim() || undefined,
      customerPhone: form.phone.replace(/[-\s]/g, ""),
      customerEmail: form.email.trim(),
      firstChoiceDate: form.date,
      firstChoiceTimeSlot: form.time,
      firstChoiceTimeDetail: form.time,
      notes: form.notes.trim() || undefined,
      serviceType: serviceTypeFor(form.menu),
    });
  };

  if (completed && form.date) {
    const selectedSlot = SLOTS.find((slot) => slot.start === form.time);
    return (
      <main className="min-h-screen bg-[#f8f6f1] px-4 py-12 sm:px-6">
        <section className="mx-auto max-w-xl border border-stone-200 bg-white px-6 py-12 text-center shadow-sm sm:px-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-900 text-white"><Check className="h-7 w-7" /></div>
          <p className="mt-7 text-xs font-semibold tracking-[0.22em] text-amber-700">RESERVATION RECEIVED</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-950">ご予約を受け付けました</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">Notionカレンダーに予約リクエストを登録しました。担当者より確認のご連絡を差し上げます。</p>
          <div className="mt-8 space-y-3 border-y border-stone-200 py-5 text-left text-sm">
            <div className="flex justify-between gap-5"><span className="text-stone-500">お名前</span><strong>{form.name}</strong></div>
            <div className="flex justify-between gap-5"><span className="text-stone-500">日時</span><strong className="text-right">{displayDate(form.date)} {selectedSlot ? `${selectedSlot.start}〜${selectedSlot.end}` : form.time}</strong></div>
          </div>
          <a className="mt-8 inline-flex items-center justify-center bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700" href={siteConfig.lineUrlPublic} target="_blank" rel="noreferrer">LINEで問い合わせる</a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1] text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="/" className="text-sm font-black tracking-[0.17em]">ULU <span className="font-medium text-stone-400">BOOKING</span></a>
          <a href={siteConfig.lineUrlPublic} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900"><Phone className="h-4 w-4" />お問い合わせ</a>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:py-16">
        <form onSubmit={submit} className="space-y-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-amber-700">ONLINE RESERVATION</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">ご予約</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">Notionカレンダーに登録されている予約・予定をもとに、予約可能な時間のみ表示しています。</p>
          </div>

          <section className="border-t border-stone-300 pt-6">
            <div className="mb-5 flex items-center gap-3"><span className="text-xs font-bold text-amber-700">01</span><h2 className="font-bold">ご希望のメニュー</h2></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {siteConfig.reservationMenus.map((menu) => (
                <button key={menu.value} type="button" onClick={() => updateForm("menu", menu.value)} className={cn("border p-4 text-left transition", form.menu === menu.value ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white hover:border-stone-500")}>
                  <span className="block text-sm font-semibold">{menu.label}</span>
                  <span className={cn("mt-1 block text-xs", form.menu === menu.value ? "text-stone-300" : "text-stone-500")}>{menu.value === "initial" ? "初回のご予約は90分枠です" : "ご希望内容は予約メモにご記入ください"}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="border-t border-stone-300 pt-6">
            <div className="mb-5 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="text-xs font-bold text-amber-700">02</span><h2 className="font-bold">日時を選択</h2></div><span className="text-xs text-stone-500">日曜・祝日休み</span></div>
            <div className="border border-stone-200 bg-white">
              <div className="flex items-center justify-between border-b border-stone-200 px-3 py-3">
                <button type="button" aria-label="前の週" className="p-2 hover:bg-stone-100 disabled:opacity-30" disabled={weekStart <= today} onClick={() => setWeekStart((current) => createUtcDate(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() - 7))}><ChevronLeft className="h-5 w-5" /></button>
                <p className="text-sm font-semibold">{weekStart.getUTCFullYear()}年{weekStart.getUTCMonth() + 1}月</p>
                <button type="button" aria-label="次の週" className="p-2 hover:bg-stone-100 disabled:opacity-30" disabled={weekStart >= maxDate} onClick={() => setWeekStart((current) => createUtcDate(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() + 7))}><ChevronRight className="h-5 w-5" /></button>
              </div>
              <div className="grid grid-cols-7">
                {weekDays.map((date) => {
                  const closed = isDateClosed(date);
                  const selected = form.date && dateKey(form.date) === dateKey(date);
                  const count = availability[dateKey(date)] ?? 0;
                  return <button key={dateKey(date)} type="button" onClick={() => selectDate(date)} disabled={closed} className={cn("relative min-h-24 border-r border-stone-100 p-2 text-center last:border-r-0 sm:min-h-28", selected && "bg-stone-900 text-white", !selected && !closed && "hover:bg-amber-50", closed && "cursor-not-allowed bg-stone-50 text-stone-300")}><span className="block text-[10px]">{DAYS[date.getUTCDay()]}</span><span className="mt-1 block text-base font-semibold">{date.getUTCDate()}</span>{closed ? <span className="mt-1 block text-[10px]">休業</span> : <span className={cn("mt-2 inline-block h-1.5 w-1.5 rounded-full", selected ? "bg-amber-300" : count > 0 ? "bg-amber-600" : "bg-emerald-500")} aria-label={count > 0 ? "予約あり" : "空きあり"} />}</button>;
                })}
              </div>
            </div>

            {form.date && <div className="mt-6"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">{displayDate(form.date)} の空き枠</p>{isSlotsLoading && <span className="flex items-center gap-1 text-xs text-stone-500"><Loader2 className="h-3 w-3 animate-spin" />確認中</span>}</div>{slotsError ? <p className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">空き枠を取得できませんでした。時間をおいて再度お試しください。</p> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{SLOTS.map((slot) => { const unavailable = isSlotUnavailable(slot); return <button key={slot.start} type="button" disabled={isSlotsLoading || unavailable} onClick={() => updateForm("time", slot.start)} className={cn("border px-3 py-3 text-left text-sm transition disabled:cursor-not-allowed", form.time === slot.start ? "border-stone-900 bg-stone-900 text-white" : unavailable ? "border-stone-100 bg-stone-100 text-stone-300 line-through" : "border-stone-200 bg-white hover:border-stone-600")}><span className="font-semibold">{slot.start}</span><span className="ml-1 text-xs opacity-70">– {slot.end}</span></button>; })}</div>}</div>}
          </section>

          <section className="border-t border-stone-300 pt-6">
            <div className="mb-5 flex items-center gap-3"><span className="text-xs font-bold text-amber-700">03</span><h2 className="font-bold">お客様情報</h2></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">お名前 <span className="text-amber-700">必須</span><input value={form.name} onChange={(event) => updateForm("name", event.target.value)} autoComplete="name" className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-3 outline-none focus:border-stone-900" placeholder="山田 花子" /></label>
              <label className="block text-sm font-medium sm:col-span-2">フリガナ <span className="text-stone-400">任意</span><input value={form.furigana} onChange={(event) => updateForm("furigana", event.target.value)} className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-3 outline-none focus:border-stone-900" placeholder="ヤマダ ハナコ" /></label>
              <label className="block text-sm font-medium">電話番号 <span className="text-amber-700">必須</span><input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} inputMode="tel" autoComplete="tel" className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-3 outline-none focus:border-stone-900" placeholder="09012345678" /></label>
              <label className="block text-sm font-medium">メールアドレス <span className="text-amber-700">必須</span><input value={form.email} onChange={(event) => updateForm("email", event.target.value)} type="email" autoComplete="email" className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-3 outline-none focus:border-stone-900" placeholder="example@email.com" /></label>
              <label className="block text-sm font-medium sm:col-span-2">お悩み・ご要望 <span className="text-stone-400">任意</span><textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} className="mt-2 min-h-28 w-full border border-stone-200 bg-white p-3 outline-none focus:border-stone-900" placeholder="気になる症状やご要望をご記入ください。" /></label>
            </div>
          </section>

          <label className="flex cursor-pointer items-start gap-3 border-t border-stone-300 pt-6 text-sm leading-6 text-stone-600"><input checked={form.agreed} onChange={(event) => updateForm("agreed", event.target.checked)} type="checkbox" className="mt-1 h-4 w-4 accent-stone-900" /><span>入力した情報を予約対応のために利用することに同意します。</span></label>
          <button type="submit" disabled={createReservation.isPending} className="flex w-full items-center justify-center gap-3 bg-stone-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-wait disabled:opacity-60"><CalendarDays className="h-5 w-5" />{createReservation.isPending ? "予約を登録しています…" : "予約リクエストを送信"}</button>
        </form>

        <aside className="h-fit border border-stone-200 bg-white p-6 lg:sticky lg:top-6">
          <Sparkles className="h-5 w-5 text-amber-700" />
          <h2 className="mt-4 text-xl font-bold">予約について</h2>
          <dl className="mt-5 space-y-4 text-sm leading-6"><div><dt className="font-semibold">営業時間</dt><dd className="text-stone-600">10:00〜21:00</dd></div><div><dt className="font-semibold">初回予約</dt><dd className="text-stone-600">90分枠でご案内します。</dd></div><div><dt className="font-semibold">休業日</dt><dd className="text-stone-600">日曜・祝日</dd></div></dl>
          <div className="mt-6 border-t border-stone-200 pt-5 text-xs leading-5 text-stone-500"><p className="flex gap-2"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />予約枠はNotionカレンダーと連携しており、重複する時間帯は選択できません。</p></div>
        </aside>
      </div>
    </main>
  );
}
