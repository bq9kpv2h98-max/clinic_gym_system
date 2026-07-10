import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { siteConfig } from "../../../shared/siteConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar, Clock, User, Phone, Mail, FileText,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight,
  LayoutList, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ReservationStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

const STATUS_CONFIG: Record<ReservationStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: any;
  color: string;
}> = {
  pending:   { label: "保留中",       variant: "outline",     icon: AlertCircle,  color: "bg-yellow-100 border-yellow-300 text-yellow-800" },
  confirmed: { label: "確定",         variant: "default",     icon: CheckCircle2, color: "bg-green-100 border-green-300 text-green-800" },
  completed: { label: "完了",         variant: "secondary",   icon: CheckCircle2, color: "bg-gray-100 border-gray-300 text-gray-600" },
  cancelled: { label: "キャンセル",   variant: "destructive", icon: XCircle,      color: "bg-red-100 border-red-300 text-red-700" },
  no_show:   { label: "無断キャンセル", variant: "destructive", icon: XCircle,    color: "bg-red-100 border-red-300 text-red-700" },
};

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// 週の月曜日を取得
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export default function ReservationManagement() {
  const [selectedStatus, setSelectedStatus] = useState<ReservationStatus | "all">("all");
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "week">("list");
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));

  const facilityId = siteConfig.facilityId;

  // 予約一覧（リストビュー用）
  const { data: reservations, isLoading, refetch } = trpc.reservations.listByFacility.useQuery({
    facilityId,
  });

  // 週カレンダー用：週の日付範囲
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const { data: weekReservations, refetch: refetchWeek } = trpc.reservations.listByDateRange.useQuery(
    { facilityId, startDate: weekStart, endDate: weekEnd },
    { enabled: viewMode === "week" }
  );

  // 予約更新
  const updateMutation = trpc.reservations.update.useMutation({
    onSuccess: () => {
      toast.success("予約を更新しました");
      refetch();
      refetchWeek();
      setIsDetailDialogOpen(false);
    },
    onError: (error) => toast.error(`エラー: ${error.message}`),
  });

  // 予約ステータス更新
  const updateStatusMutation = trpc.reservations.updateStatus.useMutation({
    onSuccess: (_data, variables) => {
      if (variables.status === "confirmed") {
        toast.success("予約を確定しました。顧客へ確定通知メールを送信しました。");
      } else {
        toast.success("ステータスを更新しました");
      }
      refetch();
      refetchWeek();
      setIsDetailDialogOpen(false);
    },
    onError: (error) => toast.error(`エラー: ${error.message}`),
  });

  // 予約削除
  const deleteMutation = trpc.reservations.delete.useMutation({
    onSuccess: () => {
      toast.success("予約を削除しました");
      refetch();
      refetchWeek();
      setIsDetailDialogOpen(false);
    },
    onError: (error) => toast.error(`エラー: ${error.message}`),
  });

  // フィルタリング
  const filteredReservations = reservations?.filter((item) => {
    if (selectedStatus === "all") return true;
    return item.reservation.status === selectedStatus;
  });

  // 日時フォーマット（UTCの年月日をそのまま使用）
  const formatDateTime = (date: Date | null, timeSlot: string | null) => {
    if (!date) return "未設定";
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const weekday = DAY_LABELS[d.getUTCDay()];
    const dateStr = `${year}年${month}月${day}日(${weekday})`;
    if (!timeSlot) return dateStr;
    const [h, m] = timeSlot.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const totalMin = h * 60 + m + 90;
      const endH = String(Math.floor(totalMin / 60)).padStart(2, "0");
      const endM = String(totalMin % 60).padStart(2, "0");
      return `${dateStr} ${timeSlot}～${endH}:${endM}`;
    }
    return `${dateStr} ${timeSlot}`;
  };

  const openDetail = (reservation: any) => {
    setSelectedReservation(reservation);
    setIsDetailDialogOpen(true);
  };

  const handleStatusUpdate = (reservationId: string, status: ReservationStatus) => {
    updateStatusMutation.mutate({ reservationId, status });
  };

  const handleDelete = (reservationId: string) => {
    if (confirm("この予約を削除してもよろしいですか？")) {
      deleteMutation.mutate({ reservationId });
    }
  };

  // 週カレンダー用：指定日の予約を取得（UTCの日付で比較）
  const getReservationsForDay = (date: Date) => {
    if (!weekReservations) return [];
    return weekReservations
      .filter((r) => {
        if (!r.firstChoiceDate) return false;
        const d = new Date(r.firstChoiceDate);
        return (
          d.getUTCFullYear() === date.getFullYear() &&
          d.getUTCMonth() === date.getMonth() &&
          d.getUTCDate() === date.getDate()
        );
      })
      .sort((a, b) => {
        const ta = a.firstChoiceTimeSlot || "";
        const tb = b.firstChoiceTimeSlot || "";
        return ta.localeCompare(tb);
      });
  };

  // 週の7日配列
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const todayStr = new Date().toDateString();

  if (isLoading && viewMode === "list") {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64 text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">予約管理</h1>
        <p className="text-muted-foreground">予約の確認・管理を行います</p>
      </div>

      {/* ビュー切り替え */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setViewMode("list")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium border transition-colors",
            viewMode === "list"
              ? "bg-black text-white border-black"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          )}
        >
          <LayoutList className="w-4 h-4" />
          リスト
        </button>
        <button
          onClick={() => setViewMode("week")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium border transition-colors",
            viewMode === "week"
              ? "bg-black text-white border-black"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          )}
        >
          <CalendarDays className="w-4 h-4" />
          週カレンダー
        </button>
      </div>

      {/* ===== リストビュー ===== */}
      {viewMode === "list" && (
        <>
          <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as ReservationStatus | "all")} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">すべて ({reservations?.length || 0})</TabsTrigger>
              <TabsTrigger value="pending">
                保留中 ({reservations?.filter(r => r.reservation.status === "pending").length || 0})
              </TabsTrigger>
              <TabsTrigger value="confirmed">
                確定 ({reservations?.filter(r => r.reservation.status === "confirmed").length || 0})
              </TabsTrigger>
              <TabsTrigger value="completed">
                完了 ({reservations?.filter(r => r.reservation.status === "completed").length || 0})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                キャンセル ({reservations?.filter(r => r.reservation.status === "cancelled").length || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredReservations && filteredReservations.length > 0 ? (
            <div className="grid gap-4">
              {filteredReservations.map((item) => {
                const { reservation, customer } = item;
                const StatusIcon = STATUS_CONFIG[reservation.status as ReservationStatus].icon;
                return (
                  <Card
                    key={reservation.reservationId}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openDetail(item)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{reservation.customerName}</CardTitle>
                            <Badge variant={STATUS_CONFIG[reservation.status as ReservationStatus].variant}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {STATUS_CONFIG[reservation.status as ReservationStatus].label}
                            </Badge>
                          </div>
                          <CardDescription className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {reservation.customerPhone}
                            </div>
                            {reservation.customerEmail && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                {reservation.customerEmail}
                              </div>
                            )}
                          </CardDescription>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>予約ID: {reservation.reservationId.slice(0, 8)}</div>
                          <div>登録: {new Date(reservation.createdAt).toLocaleDateString("ja-JP")}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium">第1希望</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDateTime(reservation.firstChoiceDate, reservation.firstChoiceTimeSlot)}
                            </div>
                          </div>
                        </div>
                        {reservation.secondChoiceDate && (
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium">第2希望</div>
                              <div className="text-sm text-muted-foreground">
                                {formatDateTime(reservation.secondChoiceDate, reservation.secondChoiceTimeSlot)}
                              </div>
                            </div>
                          </div>
                        )}
                        {reservation.confirmedDate && (
                          <div className="flex items-start gap-2 p-2 bg-green-50 rounded">
                            <CheckCircle2 className="w-4 h-4 mt-1 text-green-600" />
                            <div className="flex-1">
                              <div className="font-medium text-green-900">確定日時</div>
                              <div className="text-sm text-green-700">
                                {formatDateTime(reservation.confirmedDate, reservation.confirmedTimeSlot)}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ワンクリック操作ボタン */}
                        {reservation.status === "pending" && (
                          <div
                            className="flex gap-2 pt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                              onClick={() => handleStatusUpdate(reservation.reservationId, "confirmed")}
                              disabled={updateStatusMutation.isPending}
                            >
                              確定する
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7"
                              onClick={() => handleStatusUpdate(reservation.reservationId, "cancelled")}
                              disabled={updateStatusMutation.isPending}
                            >
                              キャンセル
                            </Button>
                          </div>
                        )}
                        {reservation.status === "confirmed" && (
                          <div
                            className="flex gap-2 pt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => handleStatusUpdate(reservation.reservationId, "completed")}
                              disabled={updateStatusMutation.isPending}
                            >
                              完了にする
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7"
                              onClick={() => handleStatusUpdate(reservation.reservationId, "no_show")}
                              disabled={updateStatusMutation.isPending}
                            >
                              無断キャンセル
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                予約がありません
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ===== 週カレンダービュー ===== */}
      {viewMode === "week" && (
        <div>
          {/* 週ナビゲーション */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => {
                const prev = new Date(weekStart);
                prev.setDate(weekStart.getDate() - 7);
                setWeekStart(prev);
              }}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="前の週"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-gray-700">
              {weekStart.getFullYear()}年{weekStart.getMonth() + 1}月{weekStart.getDate()}日
              〜
              {weekEnd.getMonth() + 1}月{weekEnd.getDate()}日
            </span>
            <button
              onClick={() => {
                const next = new Date(weekStart);
                next.setDate(weekStart.getDate() + 7);
                setWeekStart(next);
              }}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="次の週"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekStart(getMondayOf(new Date()))}
              className="text-xs px-3 py-1.5 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              今週
            </button>
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-sm overflow-hidden">
            {/* 曜日ヘッダー */}
            {weekDays.map((date, i) => {
              const isToday = date.toDateString() === todayStr;
              const dow = date.getDay();
              return (
                <div
                  key={`header-${i}`}
                  className={cn(
                    "bg-white px-2 py-2 text-center",
                    isToday && "bg-black text-white"
                  )}
                >
                  <div className={cn(
                    "text-[10px] font-bold",
                    !isToday && (dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-400")
                  )}>
                    {DAY_LABELS[dow]}
                  </div>
                  <div className={cn(
                    "text-base font-black leading-none mt-0.5",
                    !isToday && "text-gray-800"
                  )}>
                    {date.getDate()}
                  </div>
                  <div className={cn("text-[9px] mt-0.5", !isToday && "text-gray-400")}>
                    {date.getMonth() + 1}/{date.getDate()}
                  </div>
                </div>
              );
            })}

            {/* 予約カラム */}
            {weekDays.map((date, i) => {
              const dayReservations = getReservationsForDay(date);
              const isToday = date.toDateString() === todayStr;
              return (
                <div
                  key={`col-${i}`}
                  className={cn(
                    "bg-white min-h-[160px] p-1.5 space-y-1",
                    isToday && "bg-blue-50/30"
                  )}
                >
                  {dayReservations.length === 0 && (
                    <div className="text-center text-[10px] text-gray-300 pt-4">—</div>
                  )}
                  {dayReservations.map((r) => {
                    const status = r.status as ReservationStatus;
                    const cfg = STATUS_CONFIG[status];
                    return (
                      <button
                        key={r.reservationId}
                        type="button"
                        onClick={() => openDetail({ reservation: r, customer: null })}
                        className={cn(
                          "w-full text-left px-1.5 py-1 border rounded-sm text-[10px] leading-tight transition-opacity hover:opacity-80 active:opacity-60",
                          cfg.color
                        )}
                      >
                        <div className="font-bold truncate">{r.customerName}</div>
                        {r.firstChoiceTimeSlot && (
                          <div className="opacity-70 mt-0.5">{r.firstChoiceTimeSlot}〜</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* 凡例 */}
          <div className="flex items-center gap-4 mt-3 px-1">
            {(Object.entries(STATUS_CONFIG) as [ReservationStatus, typeof STATUS_CONFIG[ReservationStatus]][]).map(([key, cfg]) => (
              <span key={key} className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0.5 border rounded-sm", cfg.color)}>
                {cfg.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ===== 予約詳細ダイアログ ===== */}
      {selectedReservation && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>予約詳細</DialogTitle>
              <DialogDescription>
                予約ID: {selectedReservation.reservation.reservationId}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* 顧客情報 */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  顧客情報
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">お名前</span>
                    <span className="font-medium">{selectedReservation.reservation.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">電話番号</span>
                    <span className="font-medium">{selectedReservation.reservation.customerPhone}</span>
                  </div>
                  {selectedReservation.reservation.customerEmail && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">メールアドレス</span>
                      <span className="font-medium">{selectedReservation.reservation.customerEmail}</span>
                    </div>
                  )}
                  {selectedReservation.customer && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">顧客ID</span>
                      <span className="font-mono text-xs">{selectedReservation.customer.customerId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 予約日時 */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  予約日時
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded">
                    <div className="font-medium mb-1">第1希望</div>
                    <div className="text-sm">
                      {formatDateTime(selectedReservation.reservation.firstChoiceDate, selectedReservation.reservation.firstChoiceTimeSlot)}
                    </div>
                  </div>
                  {selectedReservation.reservation.secondChoiceDate && (
                    <div className="p-3 bg-muted rounded">
                      <div className="font-medium mb-1">第2希望</div>
                      <div className="text-sm">
                        {formatDateTime(selectedReservation.reservation.secondChoiceDate, selectedReservation.reservation.secondChoiceTimeSlot)}
                      </div>
                    </div>
                  )}
                  {selectedReservation.reservation.thirdChoiceDate && (
                    <div className="p-3 bg-muted rounded">
                      <div className="font-medium mb-1">第3希望</div>
                      <div className="text-sm">
                        {formatDateTime(selectedReservation.reservation.thirdChoiceDate, selectedReservation.reservation.thirdChoiceTimeSlot)}
                      </div>
                    </div>
                  )}
                  {selectedReservation.reservation.confirmedDate && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="font-medium mb-1 text-green-900">確定日時</div>
                      <div className="text-sm text-green-700">
                        {formatDateTime(selectedReservation.reservation.confirmedDate, selectedReservation.reservation.confirmedTimeSlot)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ステータス */}
              <div>
                <Label>ステータス</Label>
                <Select
                  value={selectedReservation.reservation.status}
                  onValueChange={(value) => handleStatusUpdate(selectedReservation.reservation.reservationId, value as ReservationStatus)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">保留中</SelectItem>
                    <SelectItem value="confirmed">確定</SelectItem>
                    <SelectItem value="completed">完了</SelectItem>
                    <SelectItem value="cancelled">キャンセル</SelectItem>
                    <SelectItem value="no_show">無断キャンセル</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* メモ */}
              {selectedReservation.reservation.notes && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    顧客メモ
                  </h3>
                  <div className="p-3 bg-muted rounded text-sm">
                    {selectedReservation.reservation.notes}
                  </div>
                </div>
              )}

              {/* スタッフメモ */}
              <div>
                <Label htmlFor="staffNotes">スタッフメモ</Label>
                <Textarea
                  id="staffNotes"
                  defaultValue={selectedReservation.reservation.staffNotes || ""}
                  placeholder="スタッフ用のメモを入力..."
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={() => handleDelete(selectedReservation.reservation.reservationId)}
              >
                削除
              </Button>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                閉じる
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
