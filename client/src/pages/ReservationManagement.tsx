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
import { Calendar, Clock, User, Phone, Mail, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type ReservationStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

const STATUS_CONFIG: Record<ReservationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pending: { label: "保留中", variant: "outline", icon: AlertCircle },
  confirmed: { label: "確定", variant: "default", icon: CheckCircle2 },
  completed: { label: "完了", variant: "secondary", icon: CheckCircle2 },
  cancelled: { label: "キャンセル", variant: "destructive", icon: XCircle },
  no_show: { label: "無断キャンセル", variant: "destructive", icon: XCircle },
};

export default function ReservationManagement() {
  const [selectedStatus, setSelectedStatus] = useState<ReservationStatus | "all">("all");
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // 仮の施設ID（実際は認証情報から取得）
  const facilityId = siteConfig.facilityId;

  // 予約一覧を取得
  const { data: reservations, isLoading, refetch } = trpc.reservations.listByFacility.useQuery({
    facilityId,
  });

  // 予約更新
  const updateMutation = trpc.reservations.update.useMutation({
    onSuccess: () => {
      toast.success("予約を更新しました");
      refetch();
      setIsDetailDialogOpen(false);
      setIsEditMode(false);
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
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
      setIsDetailDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  // 予約削除
  const deleteMutation = trpc.reservations.delete.useMutation({
    onSuccess: () => {
      toast.success("予約を削除しました");
      refetch();
      setIsDetailDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  // フィルタリングされた予約
  const filteredReservations = reservations?.filter((item) => {
    if (selectedStatus === "all") return true;
    return item.reservation.status === selectedStatus;
  });

  // 日時フォーマット
  const formatDateTime = (date: Date | null, timeSlot: string | null) => {
    if (!date) return "未設定";
    // DBはUTCで保存されているが、フォーム送信時にJSTの日付をUTCとして保存しているため
    // UTCの年月日をそのまま使用する（ローカルタイムゾーン変換なし）
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[d.getUTCDay()];
    const dateStr = `${year}年${month}月${day}日(${weekday})`;
    if (!timeSlot) return dateStr;
    // スロット値から終了時刻を計算（例: "10:00" → "10:00～11:30"）
    const [h, m] = timeSlot.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const totalMin = h * 60 + m + 90;
      const endH = String(Math.floor(totalMin / 60)).padStart(2, "0");
      const endM = String(totalMin % 60).padStart(2, "0");
      return `${dateStr} ${timeSlot}～${endH}:${endM}`;
    }
    return `${dateStr} ${timeSlot}`;
  };

  // 予約詳細を開く
  const openDetail = (reservation: any) => {
    setSelectedReservation(reservation);
    setIsDetailDialogOpen(true);
    setIsEditMode(false);
  };

  // ステータス更新
  const handleStatusUpdate = (reservationId: string, status: ReservationStatus) => {
    updateStatusMutation.mutate({ reservationId, status });
  };

  // 予約削除
  const handleDelete = (reservationId: string) => {
    if (confirm("この予約を削除してもよろしいですか？")) {
      deleteMutation.mutate({ reservationId });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">予約管理</h1>
        <p className="text-muted-foreground">
          予約の確認・管理を行います
        </p>
      </div>

      {/* ステータスタブ */}
      <Tabs value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ReservationStatus | "all")} className="mb-6">
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

      {/* 予約一覧 */}
      {filteredReservations && filteredReservations.length > 0 ? (
        <div className="grid gap-4">
          {filteredReservations.map((item) => {
            const { reservation, customer } = item;
            const StatusIcon = STATUS_CONFIG[reservation.status as ReservationStatus].icon;

            return (
              <Card key={reservation.reservationId} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(item)}>
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

      {/* 予約詳細ダイアログ */}
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
