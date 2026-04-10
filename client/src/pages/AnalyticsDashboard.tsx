import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2, CalendarDays, TrendingUp, TrendingDown, CheckCircle2, XCircle } from "lucide-react";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function AnalyticsDashboard() {
  const [facilityId, setFacilityId] = useState("default-facility");
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);

  // 予約分析: 対象月の選択
  const currentDate = new Date();
  const [analyticsYear, setAnalyticsYear] = useState(currentDate.getFullYear());
  const [analyticsMonth, setAnalyticsMonth] = useState(currentDate.getMonth() + 1);

  const { data: reservationAnalytics, isLoading: reservationAnalyticsLoading, refetch: refetchAnalytics } =
    trpc.reservations.getAnalytics.useQuery({
      year: analyticsYear,
      month: analyticsMonth,
    });

  // 時間帯別予約数を配列に変換
  const hourlyChartData = reservationAnalytics?.byHour
    ? Object.entries(reservationAnalytics.byHour)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([hour, count]) => ({ hour, count }))
    : [];

  // サービス別予約数を配列に変換
  const serviceChartData = reservationAnalytics?.byService
    ? Object.entries(reservationAnalytics.byService).map(([service, count]) => ({ service, count }))
    : [];

  // ステータス別予約数を配列に変換
  const statusChartData = reservationAnalytics?.byStatus
    ? Object.entries(reservationAnalytics.byStatus).map(([status, count]) => ({ status, count }))
    : [];

  // キャンセル率計算
  const cancelRate = reservationAnalytics && reservationAnalytics.totalReservations > 0
    ? Math.round((reservationAnalytics.cancelledReservations / reservationAnalytics.totalReservations) * 100)
    : 0;

  // 完了率計算
  const completionRate = reservationAnalytics && reservationAnalytics.totalReservations > 0
    ? Math.round((reservationAnalytics.completedReservations / reservationAnalytics.totalReservations) * 100)
    : 0;

  // 顧客分析API呼び出し
  const { data: ageData, isLoading: ageLoading } = trpc.analytics.getCustomersByAge.useQuery({
    facilityId,
  });

  const { data: genderData, isLoading: genderLoading } = trpc.analytics.getCustomersByGender.useQuery({
    facilityId,
  });

  const { data: prefectureData, isLoading: prefectureLoading } =
    trpc.analytics.getCustomersByPrefecture.useQuery({
      facilityId,
    });

  const { data: visitPatterns, isLoading: visitPatternsLoading } =
    trpc.analytics.getVisitPatterns.useQuery({
      facilityId,
      fromDate,
      toDate,
    });

  const { data: segments, isLoading: segmentsLoading } = trpc.analytics.getCustomerSegments.useQuery({
    facilityId,
    fromDate,
    toDate,
  });

  const { data: ltv, isLoading: ltvLoading } = trpc.analytics.getCustomerLTV.useQuery({
    facilityId,
  });

  const { data: pointUsage, isLoading: pointUsageLoading } =
    trpc.analytics.getPointUsagePatterns.useQuery({
      facilityId,
      fromDate,
      toDate,
    });

  const { data: churnRisk, isLoading: churnRiskLoading } = trpc.analytics.getChurnRiskCustomers.useQuery({
    facilityId,
    daysInactive: 60,
  });

  const { data: visitTrend, isLoading: visitTrendLoading } = trpc.analytics.getVisitFrequencyTrend.useQuery({
    facilityId,
    fromDate,
    toDate,
  });

  const { data: satisfaction, isLoading: satisfactionLoading } =
    trpc.analytics.getCustomerSatisfactionMetrics.useQuery({
      facilityId,
    });

  // 年齢別データを配列に変換
  const ageChartData = ageData
    ? Object.entries(ageData).map(([age, count]) => ({
        age,
        count,
      }))
    : [];

  // 性別データを配列に変換
  const genderChartData = genderData || [];

  // 地域別データを配列に変換（上位10件）
  const prefectureChartData = (prefectureData || []).slice(0, 10);

  // セグメントデータを配列に変換
  const segmentChartData = segments
    ? Object.entries(segments).map(([segment, count]) => ({
        segment,
        count,
      }))
    : [];

  // 来院頻度トレンドデータ
  const visitTrendChartData = (visitTrend || []).map((item) => ({
    date: item.date,
    visits: item.visitCount,
  }));

  // ポイント利用パターン（上位10顧客）
  const topPointUsers = (pointUsage || [])
    .sort((a, b) => (Number(b.totalPointsEarned) || 0) - (Number(a.totalPointsEarned) || 0))
    .slice(0, 10)
    .map((item) => ({
      customerId: item.customerId?.substring(0, 8) || "Unknown",
      earned: Number(item.totalPointsEarned) || 0,
      used: Number(item.totalPointsUsed) || 0,
    }));

  // 顧客LTV（上位10顧客）
  const topLTVCustomers = (ltv || [])
    .sort((a, b) => (Number(b.totalSpent) || 0) - (Number(a.totalSpent) || 0))
    .slice(0, 10)
    .map((item) => ({
      customerId: item.customerId?.substring(0, 8) || "Unknown",
      spent: Number(item.totalSpent) || 0,
      visits: item.visitCount,
    }));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">顧客分析ダッシュボード</h1>
          <p className="text-gray-600">顧客データの詳細分析と来院パターンの可視化</p>
        </div>

        {/* フィルター */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>フィルター設定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="facility">施設</Label>
                <Input
                  id="facility"
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  placeholder="施設ID"
                />
              </div>
              <div>
                <Label htmlFor="from-date">開始日</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="to-date">終了日</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full">データ更新</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* タブ */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="reservations">予約分析</TabsTrigger>
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="demographics">顧客属性</TabsTrigger>
            <TabsTrigger value="behavior">来院パターン</TabsTrigger>
            <TabsTrigger value="points">ポイント分析</TabsTrigger>
            <TabsTrigger value="ltv">LTV分析</TabsTrigger>
          </TabsList>

          {/* 予約分析タブ */}
          <TabsContent value="reservations" className="space-y-6">
            {/* 月選択 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  対象月の選択
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <select
                    value={analyticsYear}
                    onChange={(e) => setAnalyticsYear(Number(e.target.value))}
                    className="border border-gray-200 rounded px-3 py-2 text-sm"
                  >
                    {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
                      <option key={y} value={y}>{y}年</option>
                    ))}
                  </select>
                  <select
                    value={analyticsMonth}
                    onChange={(e) => setAnalyticsMonth(Number(e.target.value))}
                    className="border border-gray-200 rounded px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                  <button
                    onClick={() => refetchAnalytics()}
                    className="px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
                  >
                    更新
                  </button>
                </div>
              </CardContent>
            </Card>

            {reservationAnalyticsLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
              </div>
            ) : (
              <>
                {/* KPIカード */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold tracking-widest uppercase text-gray-400">総予約数</span>
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="text-3xl font-black text-gray-900">{reservationAnalytics?.totalReservations ?? 0}</div>
                      <p className="text-xs text-gray-400 mt-1">{analyticsYear}年{analyticsMonth}月</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold tracking-widest uppercase text-gray-400">完了数</span>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="text-3xl font-black text-green-600">{reservationAnalytics?.completedReservations ?? 0}</div>
                      <p className="text-xs text-gray-400 mt-1">完了率 {completionRate}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold tracking-widest uppercase text-gray-400">キャンセル数</span>
                        <XCircle className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="text-3xl font-black text-red-600">{reservationAnalytics?.cancelledReservations ?? 0}</div>
                      <p className="text-xs text-gray-400 mt-1">キャンセル率 {cancelRate}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold tracking-widest uppercase text-gray-400">キャンセル率</span>
                        {cancelRate > 20 ? (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className={`text-3xl font-black ${cancelRate > 20 ? "text-red-600" : "text-green-600"}`}>{cancelRate}%</div>
                      <p className="text-xs text-gray-400 mt-1">{cancelRate > 20 ? "要改善" : "良好"}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* 時間帯別予約数 */}
                <Card>
                  <CardHeader>
                    <CardTitle>時間帯別予約数</CardTitle>
                    <CardDescription>Notionデータに基づく時間帯別の予約分布</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hourlyChartData.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">この月の予約データがありません</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={hourlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis allowDecimals={false} />
                          <Tooltip formatter={(v) => [`${v}件`, "予約数"]} />
                          <Bar dataKey="count" fill="#111827" name="予約数" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* サービス別・ステータス別 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>サービス別予約数</CardTitle>
                      <CardDescription>コース別の予約分布</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {serviceChartData.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">データなし</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={serviceChartData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="count"
                              label={({ service, count }) => `${service}: ${count}`}
                            >
                              {serviceChartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>ステータス別予約数</CardTitle>
                      <CardDescription>予定中・完了・キャンセルの内訳</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {statusChartData.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">データなし</div>
                      ) : (
                        <div className="space-y-3">
                          {statusChartData.map(({ status, count }, index) => (
                            <div key={status} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="text-sm font-medium text-gray-700">{status}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-32 bg-gray-100 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full"
                                    style={{
                                      width: `${reservationAnalytics?.totalReservations ? (count / reservationAnalytics.totalReservations) * 100 : 0}%`,
                                      backgroundColor: COLORS[index % COLORS.length]
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-gray-900 w-8 text-right">{count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* 概要タブ */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* セグメント分析 */}
              <Card>
                <CardHeader>
                  <CardTitle>顧客セグメント</CardTitle>
                  <CardDescription>VIP、リピーター、新規の分類</CardDescription>
                </CardHeader>
                <CardContent>
                  {segmentsLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="animate-spin" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={segmentChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ segment, count }) => `${segment}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {segmentChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* 離反リスク */}
              <Card>
                <CardHeader>
                  <CardTitle>離反リスク顧客</CardTitle>
                  <CardDescription>60日以上来院なし</CardDescription>
                </CardHeader>
                <CardContent>
                  {churnRiskLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="animate-spin" />
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl font-bold text-red-600">
                        {churnRisk?.length || 0}
                      </div>
                      <p className="text-gray-600 mt-2">人の顧客が離反リスク状態です</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 顧客属性タブ */}
          <TabsContent value="demographics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 年齢別 */}
              <Card>
                <CardHeader>
                  <CardTitle>年齢別顧客分布</CardTitle>
                </CardHeader>
                <CardContent>
                  {ageLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="animate-spin" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={ageChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="age" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* 性別別 */}
              <Card>
                <CardHeader>
                  <CardTitle>性別別顧客分布</CardTitle>
                </CardHeader>
                <CardContent>
                  {genderLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="animate-spin" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={genderChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ gender, count }) => `${gender}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {genderChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* 地域別（上位10） */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>地域別顧客分布（上位10）</CardTitle>
                </CardHeader>
                <CardContent>
                  {prefectureLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="animate-spin" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={prefectureChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="prefecture" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 来院パターンタブ */}
          <TabsContent value="behavior" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* 来院頻度トレンド */}
              <Card>
                <CardHeader>
                  <CardTitle>来院頻度トレンド</CardTitle>
                  <CardDescription>期間内の日別来院数</CardDescription>
                </CardHeader>
                <CardContent>
                  {visitTrendLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="animate-spin" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={visitTrendChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="visits" stroke="#3b82f6" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ポイント分析タブ */}
          <TabsContent value="points" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ポイント利用ランキング（上位10顧客）</CardTitle>
              </CardHeader>
              <CardContent>
                {pointUsageLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topPointUsers}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="customerId" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="earned" fill="#3b82f6" name="獲得ポイント" />
                      <Bar dataKey="used" fill="#ef4444" name="使用ポイント" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LTV分析タブ */}
          <TabsContent value="ltv" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>顧客生涯価値（LTV）ランキング（上位10顧客）</CardTitle>
              </CardHeader>
              <CardContent>
                {ltvLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topLTVCustomers}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="customerId" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="spent" fill="#10b981" name="売上（円）" />
                      <Bar dataKey="visits" fill="#f59e0b" name="来院回数" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
