import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, LogOut, Calendar, Award, History, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function MyPage() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedCustomerId = localStorage.getItem("mypage_customer_id");
    const storedCustomerName = localStorage.getItem("mypage_customer_name");
    
    if (!storedCustomerId) {
      setLocation("/mypage-login");
      return;
    }
    
    setCustomerId(storedCustomerId);
    setCustomerName(storedCustomerName || "");
  }, [setLocation]);

  const { data, isLoading, error } = trpc.mypage.getMyPageData.useQuery(
    { customerId: customerId || "" },
    { enabled: !!customerId }
  );

  const handleLogout = () => {
    localStorage.removeItem("mypage_customer_id");
    localStorage.removeItem("mypage_customer_name");
    toast.success("ログアウトしました");
    setLocation("/mypage-login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>エラー</CardTitle>
            <CardDescription>データの取得に失敗しました</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/mypage-login")} className="w-full">
              ログインページに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { customer, visitHistory, upcomingReservations } = data;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "確認中",
      confirmed: "確定",
      completed: "完了",
      cancelled: "キャンセル",
      no_show: "無断キャンセル",
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "pending") return "secondary";
    if (status === "confirmed") return "default";
    if (status === "completed") return "outline";
    if (status === "cancelled" || status === "no_show") return "destructive";
    return "default";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow-sm border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{customerName}様</h1>
              <p className="text-xs text-muted-foreground">マイページ</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Award className="h-5 w-5" />
              ポイント残高
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{customer.totalPoints}</span>
              <span className="text-xl">ポイント</span>
            </div>
            <p className="mt-2 text-sm text-white/80">
              累計獲得ポイント: {customer.lifetimePoints}ポイント
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              来院実績
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">総来院回数</span>
              <span className="text-2xl font-bold">{customer.visitCount}回</span>
            </div>
            {customer.lastVisitDate && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">最終来院日</span>
                <span className="font-medium">
                  {new Date(customer.lastVisitDate).toLocaleDateString("ja-JP")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              次回予約
            </CardTitle>
            <CardDescription>
              {upcomingReservations.length > 0 ? "予約リクエストの状況" : "現在予約はありません"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingReservations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>予約がありません</p>
                <Button variant="link" className="mt-2" onClick={() => setLocation("/reservation")}>
                  新しい予約をする
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingReservations.map((reservation: any) => (
                  <div key={reservation.reservationId} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={getStatusVariant(reservation.status)}>
                        {getStatusLabel(reservation.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(reservation.createdAt).toLocaleDateString("ja-JP")} 申込
                      </span>
                    </div>

                    {reservation.confirmedDate ? (
                      <div className="bg-primary/5 p-3 rounded-md">
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <Clock className="h-4 w-4" />
                          確定日時
                        </div>
                        <p className="mt-1 font-semibold">
                          {new Date(reservation.confirmedDate).toLocaleDateString("ja-JP", {
                            month: "long",
                            day: "numeric",
                            weekday: "short",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {reservation.confirmedTimeSlot}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">希望日時</p>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">第1希望: </span>
                            {new Date(reservation.firstChoiceDate).toLocaleDateString("ja-JP")}{" "}
                            {reservation.firstChoiceTimeSlot}
                          </div>
                          {reservation.secondChoiceDate && (
                            <div>
                              <span className="text-muted-foreground">第2希望: </span>
                              {new Date(reservation.secondChoiceDate).toLocaleDateString("ja-JP")}{" "}
                              {reservation.secondChoiceTimeSlot}
                            </div>
                          )}
                          {reservation.thirdChoiceDate && (
                            <div>
                              <span className="text-muted-foreground">第3希望: </span>
                              {new Date(reservation.thirdChoiceDate).toLocaleDateString("ja-JP")}{" "}
                              {reservation.thirdChoiceTimeSlot}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {reservation.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">症状・お悩み: </span>
                        <span>{reservation.notes}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              来院履歴
            </CardTitle>
            <CardDescription>最近の来院記録（最大10件）</CardDescription>
          </CardHeader>
          <CardContent>
            {visitHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>来院履歴がありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visitHistory.map((visit: any, index: number) => (
                  <div key={visit.visitId}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {new Date(visit.visitDate).toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            weekday: "short",
                          })}
                        </p>
                        {visit.visitType && (
                          <p className="text-sm text-muted-foreground">{visit.visitType}</p>
                        )}
                        {visit.notes && (
                          <p className="text-sm text-muted-foreground">{visit.notes}</p>
                        )}
                      </div>
                      {visit.pointsEarned && visit.pointsEarned > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          +{visit.pointsEarned}pt
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setLocation("/reservation")}>
            <Calendar className="h-4 w-4 mr-2" />
            新しい予約をする
          </Button>
        </div>
      </div>
    </div>
  );
}
