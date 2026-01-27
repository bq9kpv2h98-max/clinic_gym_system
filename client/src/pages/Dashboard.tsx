import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  Users,
  TrendingUp,
  Zap,
  Target,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Settings,
  Menu,
  X,
  FileText,
  HardDrive,
  QrCode,
  Clock,
  CalendarCheck,
  Calendar,
  ClipboardList,
  Tablet,
} from "lucide-react";

interface DashboardMetrics {
  totalCustomers: number;
  newCustomersThisMonth: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  customerRetentionRate: number;
}

interface ChannelMetrics {
  channelName: string;
  totalExpense: number;
  newCustomers: number;
  cpa: number;
  roas: number;
}

const Dashboard: React.FC = () => {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // ダミーデータ
  const metrics: DashboardMetrics = {
    totalCustomers: 1250,
    newCustomersThisMonth: 85,
    totalRevenue: 2850000,
    averageOrderValue: 45000,
    conversionRate: 12.5,
    customerRetentionRate: 78,
  };

  const channelMetrics: ChannelMetrics[] = [
    {
      channelName: "Google Ads",
      totalExpense: 150000,
      newCustomers: 45,
      cpa: 3333,
      roas: 850,
    },
    {
      channelName: "Facebook",
      totalExpense: 100000,
      newCustomers: 28,
      cpa: 3571,
      roas: 920,
    },
    {
      channelName: "チラシ",
      totalExpense: 50000,
      newCustomers: 12,
      cpa: 4167,
      roas: 780,
    },
  ];

  const revenueData = [
    { month: "1月", revenue: 450000 },
    { month: "2月", revenue: 520000 },
    { month: "3月", revenue: 480000 },
    { month: "4月", revenue: 610000 },
    { month: "5月", revenue: 680000 },
    { month: "6月", revenue: 720000 },
  ];

  const customerAcquisitionData = [
    { name: "Google Ads", value: 45 },
    { name: "Facebook", value: 28 },
    { name: "チラシ", value: 12 },
  ];

  const COLORS = ["#3b82f6", "#ef4444", "#10b981"];

  const navigationItems = [
    { id: "overview", label: "概要", icon: BarChart3 },
    { id: "customers", label: "顧客管理", icon: Users },
    { id: "sales", label: "売上管理", icon: DollarSign },
    { id: "reservations", label: "予約管理（スタッフ）", icon: CalendarCheck },
    { id: "reservation-form", label: "予約フォーム（顧客用）", icon: CalendarCheck },
    { id: "analytics", label: "分析", icon: TrendingUp },
    { id: "monthly-stats", label: "月次統計", icon: Calendar },
    { id: "expenses", label: "経費管理", icon: DollarSign },
    { id: "medical-records", label: "カルテ管理", icon: ClipboardList },
    { id: "staff-tablet", label: "施術者用タブレット", icon: Tablet },
    { id: "advertising", label: "広告効果測定", icon: Target },
    { id: "advertising-expense", label: "広告費登録", icon: DollarSign },
    { id: "settlement", label: "決算報告書", icon: FileText },
    { id: "qrcode", label: "QRコード管理", icon: QrCode },
    { id: "backup", label: "バックアップ", icon: HardDrive },
    { id: "schedule", label: "スケジュール", icon: Clock },
    { id: "settings", label: "設定", icon: Settings },
  ];

  const handleNavigation = (tabId: string) => {
    setActiveTab(tabId);
    switch (tabId) {
      case "customers":
        setLocation("/customers");
        break;
      case "sales":
        setLocation("/sales");
        break;
      case "analytics":
        setLocation("/analytics");
        break;
      case "advertising":
        setLocation("/dashboard/advertising");
        break;
      case "advertising-expense":
        setLocation("/advertising-expense");
        break;
      case "settlement":
        setLocation("/settlement");
        break;
      case "qrcode":
        setLocation("/qrcode-management");
        break;
      case "reservations":
        setLocation("/reservations");
        break;
      case "reservation-form":
        setLocation("/reservation");
        break;
      case "monthly-stats":
        setLocation("/monthly-stats");
        break;
      case "expenses":
        setLocation("/expenses");
        break;
      case "medical-records":
        setLocation("/medical-records");
        break;
      case "staff-tablet":
        setLocation("/staff/tablet");
        break;
      case "backup":
        setLocation("/backup");
        break;
      case "schedule":
        setLocation("/schedule");
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* サイドバー */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        {/* ロゴ */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <h1 className="text-xl font-bold text-blue-600">診察券管理</h1>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200">
          {sidebarOpen && (
            <p className="text-xs text-gray-500">© 2024 ULU Group</p>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">ダッシュボード</h2>
            <p className="text-gray-600 mt-2">施設の経営状況を一目で把握できます</p>
          </div>

          {/* クイックアクセスリンク */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                クイックアクセス
              </CardTitle>
              <CardDescription>各機能へのリンクをまとめています</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 顧客マイページ */}
                <a
                  href="/customer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">顧客マイページ</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">顧客がポイントや予約を確認できるページ</p>
                  <p className="text-xs text-blue-600 break-all">{window.location.origin}/customer</p>
                </a>

                {/* スタッフスキャナー */}
                <a
                  href="/staff/scanner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <QrCode className="w-5 h-5 mr-2 text-green-600" />
                    <h3 className="font-semibold text-gray-900">スタッフスキャナー</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">QRコードを読み取って来院記録を登録</p>
                  <p className="text-xs text-green-600 break-all">{window.location.origin}/staff/scanner</p>
                </a>

                {/* 予約フォーム */}
                <a
                  href="/reservation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">予約フォーム</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">顧客が予約を申し込むフォーム</p>
                  <p className="text-xs text-purple-600 break-all">{window.location.origin}/reservation</p>
                </a>

                {/* QRコード登録 */}
                <a
                  href="/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <QrCode className="w-5 h-5 mr-2 text-orange-600" />
                    <h3 className="font-semibold text-gray-900">QRコード登録</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">新規顧客のQRコードを登録</p>
                  <p className="text-xs text-orange-600 break-all">{window.location.origin}/register</p>
                </a>

                {/* スタッフ予約管理 */}
                <a
                  href="/staff-reservations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <CalendarCheck className="w-5 h-5 mr-2 text-red-600" />
                    <h3 className="font-semibold text-gray-900">スタッフ予約管理</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">予約リクエストを確認・管理</p>
                  <p className="text-xs text-red-600 break-all">{window.location.origin}/staff-reservations</p>
                </a>

                {/* LINE公式アカウント */}
                <a
                  href="https://lin.ee/9LXLjNI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 mr-2 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    <h3 className="font-semibold text-gray-900">LINE公式</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">LINE公式アカウントで連絡</p>
                  <p className="text-xs text-green-500 break-all">https://lin.ee/9LXLjNI</p>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* KPIカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  総顧客数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {metrics.totalCustomers.toLocaleString()}
                </div>
                <p className="text-sm text-green-600 mt-2">
                  今月: +{metrics.newCustomersThisMonth}人
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  総売上
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  ¥{(metrics.totalRevenue / 1000000).toFixed(1)}M
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  平均: ¥{metrics.averageOrderValue.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  顧客維持率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {metrics.customerRetentionRate}%
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  コンバージョン: {metrics.conversionRate}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* グラフセクション */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 売上トレンド */}
            <Card>
              <CardHeader>
                <CardTitle>売上トレンド</CardTitle>
                <CardDescription>過去6ヶ月の売上推移</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 顧客獲得チャネル */}
            <Card>
              <CardHeader>
                <CardTitle>顧客獲得チャネル</CardTitle>
                <CardDescription>チャネル別新規顧客数</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={customerAcquisitionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}人`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {customerAcquisitionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 広告効果分析 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                広告効果分析
              </CardTitle>
              <CardDescription>チャネル別のCPA・ROAS</CardDescription>
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
                    </tr>
                  </thead>
                  <tbody>
                    {channelMetrics.map((channel, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">{channel.channelName}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setLocation("/dashboard/advertising")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  詳細分析を見る
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
