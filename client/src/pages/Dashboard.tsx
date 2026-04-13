import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useErrorHandler } from "@/hooks/useErrorHandler";
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
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
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

// ===== 定休日設定パネル =====
const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

const SettingsPanel: React.FC = () => {
  const utils = trpc.useUtils();
  const { data: settingsData, isLoading } = trpc.settings.getClinicSettings.useQuery();
  const [closedDays, setClosedDays] = useState<number[]>([0]);
  const [saved, setSaved] = useState(false);
  const [syncResult, setSyncResult] = useState<{ total: number; upserted: number; errors: number } | null>(null);
  // 受付締切時間
  const [cutoffHours, setCutoffHours] = useState<number>(4);
  const [cutoffSaved, setCutoffSaved] = useState(false);
  // 予約可能日数
  const [advanceDays, setAdvanceDays] = useState<number>(7);
  const [advanceSaved, setAdvanceSaved] = useState(false);
  // 臢時休業日
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState("");

  const syncMutation = trpc.settings.syncNotionReservations.useMutation({
    onSuccess: (result) => {
      setSyncResult(result);
      utils.reservations.getBookedSlots.invalidate();
      setTimeout(() => setSyncResult(null), 8000);
    },
  });

  // 予約可能日数の保存
  const updateAdvanceDaysMutation = trpc.settings.updateBookingAdvanceDays.useMutation({
    onSuccess: () => {
      utils.settings.getClinicSettings.invalidate();
      setAdvanceSaved(true);
      setTimeout(() => setAdvanceSaved(false), 3000);
    },
  });
  // 受付締切時間の保存
  const updateCutoffMutation = trpc.settings.updateBookingCutoffHours.useMutation({
    onSuccess: () => {
      utils.settings.getClinicSettings.invalidate();
      setCutoffSaved(true);
      setTimeout(() => setCutoffSaved(false), 3000);
    },
  });

  // 臢時休業日の追加
  const addBlockedDateMutation = trpc.settings.addBlockedDate.useMutation({
    onSuccess: (result) => {
      setBlockedDates(result.blockedDates);
      setNewBlockedDate("");
      utils.settings.getClinicSettings.invalidate();
    },
  });

  // 臢時休業日の削除
  const removeBlockedDateMutation = trpc.settings.removeBlockedDate.useMutation({
    onSuccess: (result) => {
      setBlockedDates(result.blockedDates);
      utils.settings.getClinicSettings.invalidate();
    },
  });

  // サーバーデータが取得できたら初期値をセット
  React.useEffect(() => {
    if (settingsData?.closedDays) {
      setClosedDays(settingsData.closedDays);
    }
    if (settingsData?.bookingCutoffHours !== undefined) {
      setCutoffHours(settingsData.bookingCutoffHours);
    }
    if (settingsData?.blockedDates) {
      setBlockedDates(settingsData.blockedDates);
    }
    if ((settingsData as any)?.bookingAdvanceDays !== undefined) {
      setAdvanceDays((settingsData as any).bookingAdvanceDays);
    }
  }, [settingsData]);

  const updateMutation = trpc.settings.updateClosedDays.useMutation({
    onSuccess: () => {
      utils.settings.getClinicSettings.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggleDay = (day: number) => {
    setClosedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = () => {
    updateMutation.mutate({ closedDays });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            定休日設定
          </CardTitle>
          <CardDescription>
            予約フォームで選択不可にする曜日を設定します。変更後は「保存」ボタンを押してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-3 mb-6">
            {DAY_NAMES.map((name, index) => {
              const isClosed = closedDays.includes(index);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`flex flex-col items-center justify-center py-4 rounded-lg border-2 transition-all font-bold text-sm ${
                    isClosed
                      ? "bg-red-50 border-red-400 text-red-600"
                      : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <span className={`text-lg mb-1 ${
                    index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : ""
                  }`}>{name}</span>
                  <span className={`text-xs ${
                    isClosed ? "text-red-500 font-bold" : "text-gray-400"
                  }`}>{isClosed ? "定休" : "営業"}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {closedDays.length === 0
                ? "定休日なし（毎日営業）"
                : `定休日: ${closedDays.map((d) => DAY_NAMES[d]).join("・")}曜日`}
            </p>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  保存しました
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            営業時間
          </CardTitle>
          <CardDescription>現在の設定（変更は開発者にお問い合わせください）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">受付開始</p>
              <p className="text-xl font-bold text-gray-900">10:00</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">最終受付</p>
              <p className="text-xl font-bold text-gray-900">19:30</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">施術時間: 1時間30分 / 予約スロット: 30分刻み</p>
        </CardContent>
      </Card>

      {/* 予約可能日数カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarCheck className="w-5 h-5 mr-2" />
            予約可能期間
          </CardTitle>
          <CardDescription>
            今日から何日先までの予約を受け付けるかを設定します。例: 7日に設定すると、今日からで1週間内の予約のみ受付。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={advanceDays}
                onChange={(e) => setAdvanceDays(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center text-lg font-bold"
              />
              <span className="text-gray-600">日以内</span>
            </div>
            <div className="flex items-center gap-2">
              {advanceSaved && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  保存しました
                </span>
              )}
              <Button
                onClick={() => updateAdvanceDaysMutation.mutate({ days: advanceDays })}
                disabled={updateAdvanceDaysMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateAdvanceDaysMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            今日から{advanceDays}日先（{new Date(Date.now() + (advanceDays - 1) * 86400000).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}）までの予約を受け付けます
          </p>
        </CardContent>
      </Card>
      {/* 受付締切時間カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            予約受付締切時間
          </CardTitle>
          <CardDescription>
            予約開始時刻の何時間前まで受付するかを設定します。例: 4時間前に設定すると、当日予約は4時間前までのみ受付。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={72}
                value={cutoffHours}
                onChange={(e) => setCutoffHours(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center text-lg font-bold"
              />
              <span className="text-gray-600">時間前まで</span>
            </div>
            <div className="flex items-center gap-2">
              {cutoffSaved && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  保存しました
                </span>
              )}
              <Button
                onClick={() => updateCutoffMutation.mutate({ hours: cutoffHours })}
                disabled={updateCutoffMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateCutoffMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {cutoffHours === 0 ? "当日予約も受付（締切なし）" : `予約開始${cutoffHours}時間前を過ぎたスロットは選択不可になります`}
          </p>
        </CardContent>
      </Card>

      {/* 臢時休業日カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
            臢時休業日・急な休み設定
          </CardTitle>
          <CardDescription>
            特定の日を休業日に設定すると、その日の予約スロットが全て選択不可になります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <input
              type="date"
              value={newBlockedDate}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
              min={new Date().toISOString().split("T")[0]}
            />
            <Button
              onClick={() => {
                if (newBlockedDate) addBlockedDateMutation.mutate({ date: newBlockedDate });
              }}
              disabled={!newBlockedDate || addBlockedDateMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {addBlockedDateMutation.isPending ? "追加中..." : "休業日に設定"}
            </Button>
          </div>
          {blockedDates.length === 0 ? (
            <p className="text-sm text-gray-400">臢時休業日の設定はありません</p>
          ) : (
            <div className="space-y-2">
              {blockedDates.map((date) => (
                <div key={date} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
                  <span className="font-medium text-orange-800">
                    {new Date(date + "T00:00:00").toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeBlockedDateMutation.mutate({ date })}
                    disabled={removeBlockedDateMutation.isPending}
                    className="text-red-500 border-red-300 hover:bg-red-50"
                  >
                    解除
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notion同期カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowRight className="w-5 h-5 mr-2" />
            Notion予約データ同期
          </CardTitle>
          <CardDescription>
            Notionの予約DBから最新データを取得してシステムに反映します。自動同期は1時間ごとに実行されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {syncResult ? (
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  同期完了: {syncResult.total}件取得 / {syncResult.upserted}件更新
                  {syncResult.errors > 0 && ` / ${syncResult.errors}件エラー`}
                </span>
              ) : (
                <span>最終同期: サーバー起動時・1時間ごとに自動実行</span>
              )}
            </div>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              {syncMutation.isPending ? "同期中..." : "今すぐ同期"}
            </Button>
          </div>
          {syncMutation.isError && (
            <p className="text-sm text-red-500 mt-2">
              同期エラー: {syncMutation.error?.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { handleError } = useErrorHandler();

  // リアルタイムデータを取得
  const { data: dashboardMetrics, isLoading: isLoadingMetrics, error: metricsError } = trpc.analytics.getDashboardMetrics.useQuery();
  const { data: realtimeStats, isLoading: isLoadingStats, error: statsError } = trpc.analytics.getRealtimeStats.useQuery();
  const { data: revenueChartData, error: revenueError } = trpc.analytics.getRevenueChart.useQuery();
  const { data: acquisitionData, error: acquisitionError } = trpc.analytics.getCustomerAcquisition.useQuery();
  const { data: channelData, error: channelError } = trpc.analytics.getChannelMetrics.useQuery();
  const { data: todayTasksData, error: todayTasksError } = trpc.analytics.getTodayTasks.useQuery();

  // エラーハンドリング
  React.useEffect(() => {
    if (metricsError) handleError(metricsError, "ダッシュボードメトリクスの読み込み");
    if (statsError) handleError(statsError, "リアルタイム統計の読み込み");
    if (revenueError) handleError(revenueError, "売上推移データの読み込み");
    if (acquisitionError) handleError(acquisitionError, "顧客獲得データの読み込み");
    if (channelError) handleError(channelError, "広告チャネルデータの読み込み");
    if (todayTasksError) handleError(todayTasksError, "今日のタスクの読み込み");
  }, [metricsError, statsError, revenueError, acquisitionError, channelError, todayTasksError, handleError]);

  // ローディング中
  if (isLoadingMetrics || isLoadingStats) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ダッシュボードを読み込み中...</p>
        </div>
      </div>
    );
  }

  // メトリクスを設定
  const metrics: DashboardMetrics = {
    totalCustomers: dashboardMetrics?.totalCustomers || 0,
    newCustomersThisMonth: dashboardMetrics?.thisMonthNewCustomers || 0,
    totalRevenue: dashboardMetrics?.thisMonthTotalSales || 0,
    averageOrderValue: dashboardMetrics?.thisMonthAvgSale || 0,
    conversionRate: 0, // TODO: 将来的に実装
    customerRetentionRate: 0, // TODO: 将来的に実装
  };

  // APIから取得したリアルタイムデータ
  const channelMetrics: ChannelMetrics[] = channelData || [];
  const revenueData = revenueChartData || [];
  const customerAcquisitionData = acquisitionData || [];
  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

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
    { id: "staff-home", label: "施術者用ホーム", icon: Tablet },
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
      case "staff-home":
        setLocation("/staff/home");
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
            <h2 className="text-3xl font-bold text-gray-900">
              {activeTab === "settings" ? "設定" : "ダッシュボード"}
            </h2>
            <p className="text-gray-600 mt-2">
              {activeTab === "settings" ? "営業設定・定休日などを管理できます" : "施設の経営状況を一目で把握できます"}
            </p>
          </div>

          {/* 設定タブ */}
          {activeTab === "settings" && (
            <SettingsPanel />
          )}

          {/* 概要タブ（overview）のみ以下を表示 */}
          {activeTab !== "settings" && (<>

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
                  <p className="text-xs text-blue-600 break-all">/customer</p>
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
                  <p className="text-xs text-green-600 break-all">/staff/scanner</p>
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
                  <p className="text-xs text-purple-600 break-all">/reservation</p>
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
                  <p className="text-xs text-orange-600 break-all">/register</p>
                </a>

                {/* スタッフ予約管理 */}
                <a
                  href="/reservations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <CalendarCheck className="w-5 h-5 mr-2 text-red-600" />
                    <h3 className="font-semibold text-gray-900">スタッフ予約管理</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">予約リクエストを確認・管理</p>
                  <p className="text-xs text-red-600 break-all">/reservations</p>
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
                <div className="flex items-center mt-2">
                  <p className="text-sm text-gray-600 mr-2">
                    今月: +{metrics.newCustomersThisMonth}人
                  </p>
                  {dashboardMetrics && dashboardMetrics.newCustomersChange !== 0 && (
                    <span className={`text-xs flex items-center ${
                      dashboardMetrics.newCustomersChange > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {dashboardMetrics.newCustomersChange > 0 ? "▲" : "▼"}
                      {Math.abs(dashboardMetrics.newCustomersChange)}%
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  今月の売上
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  ¥{metrics.totalRevenue.toLocaleString()}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-gray-600">
                    平均: ¥{metrics.averageOrderValue.toLocaleString()}
                  </p>
                  {dashboardMetrics && dashboardMetrics.salesChange !== 0 && (
                    <span className={`text-xs flex items-center ${
                      dashboardMetrics.salesChange > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {dashboardMetrics.salesChange > 0 ? "▲" : "▼"}
                      {Math.abs(dashboardMetrics.salesChange)}%
                    </span>
                  )}
                </div>
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

          {/* 今日のタスク */}
          {todayTasksData && todayTasksData.tasks.length > 0 && (
            <Card className="mb-8 border-l-4 border-l-amber-500">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
                  今日のタスク
                  <span className="ml-2 bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {todayTasksData.tasks.length}件
                  </span>
                </CardTitle>
                <CardDescription>対応が必要なタスクがあります</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todayTasksData.tasks.map((task: any, index: number) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                        task.priority === 'high'
                          ? 'border-red-200 bg-red-50/50'
                          : task.priority === 'medium'
                          ? 'border-amber-200 bg-amber-50/50'
                          : 'border-gray-200 bg-gray-50/50'
                      }`}
                      onClick={() => task.link && setLocation(task.link)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.priority === 'high' ? 'bg-red-500' :
                          task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{task.title}</p>
                          <p className="text-xs text-gray-500">{task.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {todayTasksData && todayTasksData.tasks.length === 0 && (
            <Card className="mb-8 border-l-4 border-l-green-500">
              <CardContent className="py-6">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900">今日のタスクはすべて完了しています</p>
                    <p className="text-sm text-gray-500">未確認予約や期限切れ間近のポイントはありません</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
          </>)}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
