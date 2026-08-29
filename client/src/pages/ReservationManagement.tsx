// Reformer’s Atelier: Notion正本の予定を、落ち着いたカルテのように確認・更新するスタッフ画面。
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { siteConfig } from "../../../shared/siteConfig";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ReservationStatus = "pending" | "confirmed" | "completed" | "cancelled";

type NotionReservation = {
  pageId: string;
  pageUrl: string;
  customerName: string;
  serviceType: string | null;
  status: ReservationStatus;
  startAt: Date;
  endAt: Date;
  notes: string;
  staffNotes: string;
};

const STATUS_CONFIG: Record<ReservationStatus, { label: string; className: string }> = {
  pending: { label: "予約リクエスト", className: "border-amber-200 bg-amber-50 text-amber-800" },
  confirmed: { label: "確定", className: "border-sky-200 bg-sky-50 text-sky-800" },
  completed: { label: "完了", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  cancelled: { label: "キャンセル", className: "border-rose-200 bg-rose-50 text-rose-800" },
};

const DAYS = ["月", "火", "水", "木", "金", "土", "日"];

function mondayOf(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const day = value.getDay();
  value.setDate(value.getDate() - (day === 0 ? 6 : day - 1));
  return value;
}

function isSameDayInJst(left: Date, right: Date) {
  const offset = 9 * 60 * 60 * 1000;
  const a = new Date(left.getTime() + offset);
  const b = new Date(right.getTime() + offset);
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate();
}

function timeInJst(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function dateInJst(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));
}

export default function ReservationManagement() {
  const { loading: isAuthLoading, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [selectedReservation, setSelectedReservation] = useState<NotionReservation | null>(null);
  const [draftStatus, setDraftStatus] = useState<ReservationStatus>("pending");
  const [draftStaffNotes, setDraftStaffNotes] = useState("");

  const weekEnd = useMemo(() => {
    const value = new Date(weekStart);
    value.setDate(value.getDate() + 7);
    return value;
  }, [weekStart]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const value = new Date(weekStart);
      value.setDate(value.getDate() + index);
      return value;
    }),
    [weekStart]
  );

  const { data: reservations, isLoading, error, refetch, isFetching } = trpc.reservations.listNotion.useQuery(
    { startDate: weekStart, endDate: weekEnd },
    { enabled: isAuthenticated, staleTime: 30 * 1000, refetchOnWindowFocus: true }
  );

  const updateMutation = trpc.reservations.updateNotion.useMutation({
    onSuccess: () => {
      toast.success("Notionカレンダーを更新しました");
      setSelectedReservation(null);
      void refetch();
    },
    onError: (mutationError) => toast.error(`Notionの更新に失敗しました: ${mutationError.message}`),
  });

  const openReservation = (reservation: NotionReservation) => {
    setSelectedReservation(reservation);
    setDraftStatus(reservation.status);
    setDraftStaffNotes(reservation.staffNotes ?? "");
  };

  const saveReservation = () => {
    if (!selectedReservation) return;
    updateMutation.mutate({
      pageId: selectedReservation.pageId,
      status: draftStatus,
      staffNotes: draftStaffNotes,
    });
  };

  if (isAuthLoading || !isAuthenticated) {
    return <div className="container py-16 text-center text-muted-foreground">ログイン状態を確認中です…</div>;
  }

  if (error) {
    return (
      <div className="container py-10">
        <Card className="max-w-2xl border-rose-200">
          <CardHeader><CardTitle>Notionカレンダーを取得できませんでした</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Notionの接続設定またはデータソースの共有状態を確認してから、もう一度読み込んでください。</p>
            <Button onClick={() => void refetch()}><RefreshCw className="mr-2 h-4 w-4" />再読み込み</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-10">
      <div className="mb-8 flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-muted-foreground">NOTION CALENDAR · STAFF VIEW</p>
          <h1 className="text-3xl font-bold tracking-tight">予約管理</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Notionカレンダーを正本として表示しています。Web予約とNotionで追加した予定を同じ週の中で確認できます。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />更新
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="https://app.notion.com/p/2c7fc32c8e8e81a0b588e4fd6e93cb16" target="_blank" rel="noreferrer">
              Notionを開く<ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b bg-muted/25 py-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5" />
            <CardTitle className="text-base">週別カレンダー</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="前の週" onClick={() => setWeekStart((value) => new Date(value.getFullYear(), value.getMonth(), value.getDate() - 7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-32 text-center text-sm font-semibold">
              {weekStart.getFullYear()}年{weekStart.getMonth() + 1}月
            </span>
            <Button variant="ghost" size="icon" aria-label="次の週" onClick={() => setWeekStart((value) => new Date(value.getFullYear(), value.getMonth(), value.getDate() + 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">Notionカレンダーを読み込んでいます…</div>
          ) : (
            <div className="grid min-w-[840px] grid-cols-7 overflow-x-auto">
              {weekDays.map((day, index) => {
                const events = (reservations ?? []).filter((reservation) => isSameDayInJst(new Date(reservation.startAt), day));
                const isClosed = day.getDay() === 0;
                const isToday = isSameDayInJst(new Date(), day);
                return (
                  <div key={day.toISOString()} className={cn("min-h-[420px] border-r border-border p-3 last:border-r-0", isClosed && "bg-muted/30", isToday && "bg-sky-50/45")}>
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{DAYS[index]}</p>
                        <p className={cn("text-lg font-semibold", isToday && "text-sky-700")}>{day.getDate()}</p>
                      </div>
                      {isClosed && <span className="text-[10px] font-medium text-muted-foreground">定休</span>}
                    </div>
                    <div className="space-y-2">
                      {events.map((reservation) => (
                        <button
                          type="button"
                          key={reservation.pageId}
                          onClick={() => openReservation(reservation)}
                          className="w-full border border-border bg-background p-2 text-left transition hover:border-foreground/40 hover:shadow-sm"
                        >
                          <p className="flex items-center gap-1 text-xs font-semibold"><Clock3 className="h-3 w-3" />{timeInJst(new Date(reservation.startAt))}–{timeInJst(new Date(reservation.endAt))}</p>
                          <p className="mt-1 truncate text-sm font-semibold">{reservation.customerName}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{reservation.serviceType ?? "予定"}</p>
                          <Badge variant="outline" className={cn("mt-2 text-[10px]", STATUS_CONFIG[reservation.status].className)}>{STATUS_CONFIG[reservation.status].label}</Badge>
                        </button>
                      ))}
                      {events.length === 0 && <p className="pt-5 text-center text-xs text-muted-foreground">予定なし</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedReservation && (
        <Dialog open={Boolean(selectedReservation)} onOpenChange={(open) => !open && setSelectedReservation(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />予約詳細</DialogTitle>
              <DialogDescription>Notionカレンダーの予定を直接更新します。</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid gap-3 rounded-md bg-muted/45 p-4 text-sm">
                <div className="flex justify-between gap-5"><span className="text-muted-foreground">お名前</span><span className="font-medium">{selectedReservation.customerName}</span></div>
                <div className="flex justify-between gap-5"><span className="text-muted-foreground">日時</span><span className="text-right font-medium">{dateInJst(new Date(selectedReservation.startAt))} {timeInJst(new Date(selectedReservation.startAt))}–{timeInJst(new Date(selectedReservation.endAt))}</span></div>
                <div className="flex justify-between gap-5"><span className="text-muted-foreground">メニュー</span><span className="font-medium">{selectedReservation.serviceType ?? "未設定"}</span></div>
              </div>
              {selectedReservation.notes && (
                <div>
                  <Label className="mb-2 flex items-center gap-2"><FileText className="h-4 w-4" />お客様メモ</Label>
                  <p className="rounded-md border bg-muted/25 p-3 text-sm leading-6">{selectedReservation.notes}</p>
                </div>
              )}
              <div>
                <Label htmlFor="reservationStatus">予約状態</Label>
                <Select value={draftStatus} onValueChange={(value) => setDraftStatus(value as ReservationStatus)}>
                  <SelectTrigger id="reservationStatus" className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">予約リクエスト</SelectItem>
                    <SelectItem value="confirmed">確定</SelectItem>
                    <SelectItem value="completed">完了</SelectItem>
                    <SelectItem value="cancelled">キャンセル</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="staffNotes">スタッフメモ</Label>
                <Textarea id="staffNotes" className="mt-2" value={draftStaffNotes} onChange={(event) => setDraftStaffNotes(event.target.value)} placeholder="Notionに保存するスタッフ用メモ" rows={4} />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" asChild><a href={selectedReservation.pageUrl} target="_blank" rel="noreferrer">Notionで開く<ExternalLink className="ml-2 h-4 w-4" /></a></Button>
              <Button onClick={saveReservation} disabled={updateMutation.isPending}>{updateMutation.isPending ? "保存中…" : "Notionへ保存"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
