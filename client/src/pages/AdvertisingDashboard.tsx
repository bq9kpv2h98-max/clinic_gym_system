import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Target, DollarSign, Users } from "lucide-react";

interface ChannelMetrics {
  channelName: string;
  totalExpense: number;
  newCustomers: number;
  cpa: number;
  roas: number;
  roi: number;
  ltv: number;
}

interface MonthlyMetrics {
  month: string;
  expense: number;
  revenue: number;
  cpa: number;
  roas: number;
}

const AdvertisingDashboard: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("month");

  // ダミーデータ
  const channelMetrics: ChannelMetrics[] = [
    {
      channelName: "Google Ads",
      totalExpense: 150000,
      newCustomers: 45,
      cpa: 3333,
      roas: 850,
      roi: 750,
      ltv: 250000,
    },
    {
      channelName: "Facebook",
      totalExpense: 100000,
      newCustomers: 28,
      cpa: 3571,
      roas: 920,
      roi: 820,
      ltv: 280000,
    },
    {
      channelName: "Instagram",
      totalExpense: 80000,
      newCustomers: 22,
      cpa: 3636,
      roas: 880,
      roi: 780,
      ltv: 260000,
    },
    {
      channelName: "チラシ",
      totalExpense: 50000,
      newCustomers: 12,
      cpa: 4167,
      roas: 780,
      roi: 680,
      ltv: 220000,
    },
  ];

  const monthlyData: MonthlyMetrics[] = [
    { month: "1月", expense: 280000, revenue: 2380000, cpa: 3500, roas: 850 },
    { month: "2月", expense: 300000, revenue: 2760000, cpa: 3400, roas: 920 },
    { month: "3月", expense: 280000, revenue: 2464000, cpa: 3600, roas: 880 },
    { month: "4月", expense: 320000, revenue: 2880000, cpa: 3200, roas: 900 },
    { month: "5月", expense: 350000, revenue: 3150000, cpa: 3100, roas: 900 },
    { month: "6月", expense: 380000, revenue: 3420000, cpa: 3000, roas: 900 },
  ];

  const cpaVsLtvData = channelMetrics.map((channel) => ({
    name: channel.channelName,
    cpa: channel.cpa,
    ltv: channel.ltv,
  }));

  const bestPerformingChannel = channelMetrics.reduce((prev, current) =>
    current.roas > prev.roas ? current : prev
  );

  const worstPerformingChannel = channelMetrics.reduce((prev, current) =>
    current.cpa < prev.cpa ? current : prev
  );

  const totalExpense = channelMetrics.reduce((sum, c) => sum + c.totalExpense, 0);
  const totalRevenue = monthlyData[monthlyData.length - 1].revenue;
  const averageRoas = Math.round(
    channelMetrics.reduce((sum, c) => sum + c.roas, 0) / channelMetrics.length
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">広告効果分析</h1>
          <p className="text-gray-600 mt-2">CPA・ROAS・ROIを詳細に分析</p>
        </div>

        {/* KPIカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                総広告費
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                ¥{(totalExpense / 1000).toFixed(0)}K
              </div>
              <p className="text-sm text-gray-500 mt-2">全チャネル合計</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                平均ROAS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{(averageRoas / 100).toFixed(1)}倍</div>
              <p className="text-sm text-gray-500 mt-2">全チャネル平均</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                最高効率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {bestPerformingChannel.channelName}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                ROAS: {(bestPerformingChannel.roas / 100).toFixed(1)}倍
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                最低CPA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {worstPerformingChannel.channelName}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                CPA: ¥{worstPerformingChannel.cpa.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* グラフセクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 広告費と売上トレンド */}
          <Card>
            <CardHeader>
              <CardTitle>広告費と売上トレンド</CardTitle>
              <CardDescription>過去6ヶ月の推移</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value) => {
                      if (typeof value === "number" && value > 1000) {
                        return `¥${(value / 1000).toFixed(0)}K`;
                      }
                      return value;
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="expense"
                    stroke="#ef4444"
                    name="広告費"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    name="売上"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ROAS推移 */}
          <Card>
            <CardHeader>
              <CardTitle>ROAS推移</CardTitle>
              <CardDescription>月別のROAS変化</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${((value as number) / 100).toFixed(1)}倍`} />
                  <Bar dataKey="roas" fill="#3b82f6" name="ROAS" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* CPA vs LTV分析 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>CPA vs LTV分析</CardTitle>
            <CardDescription>
              顧客獲得単価と顧客生涯価値の関係性
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cpa" name="CPA" />
                <YAxis dataKey="ltv" name="LTV" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value) => `¥${value.toLocaleString()}`}
                  labelFormatter={(label) => `CPA: ¥${label.toLocaleString()}`}
                />
                <Scatter name="チャネル" data={cpaVsLtvData as any} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* チャネル別詳細 */}
        <Card>
          <CardHeader>
            <CardTitle>チャネル別詳細分析</CardTitle>
            <CardDescription>各チャネルのパフォーマンス指標</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      チャネル
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      広告費
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      新規顧客
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      CPA
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      ROAS
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      ROI
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      LTV
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {channelMetrics.map((channel, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedChannel(channel.channelName)}
                    >
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {channel.channelName}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        ¥{channel.totalExpense.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        {channel.newCustomers}人
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                          ¥{channel.cpa.toLocaleString()}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                          {(channel.roas / 100).toFixed(1)}倍
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                          {channel.roi}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        ¥{channel.ltv.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 推奨事項 */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">💡 推奨事項</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • <strong>{bestPerformingChannel.channelName}</strong>
                  のROASが最も高いため、予算配分を増やすことを検討してください
                </li>
                <li>
                  • <strong>{worstPerformingChannel.channelName}</strong>
                  のCPAが最も低いため、効率的な顧客獲得チャネルです
                </li>
                <li>• LTV/CAC比率が3倍以上のチャネルは持続可能な成長が期待できます</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvertisingDashboard;
