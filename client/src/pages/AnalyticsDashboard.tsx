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
import { Loader2 } from "lucide-react";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function AnalyticsDashboard() {
  const [facilityId, setFacilityId] = useState("default-facility");
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);

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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="demographics">顧客属性</TabsTrigger>
            <TabsTrigger value="behavior">来院パターン</TabsTrigger>
            <TabsTrigger value="points">ポイント分析</TabsTrigger>
            <TabsTrigger value="ltv">LTV分析</TabsTrigger>
          </TabsList>

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
