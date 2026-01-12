import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface SettlementData {
  month: string;
  year: number;
  facilityId: string;
  facilityName: string;
  totalSales: number;
  totalTransactions: number;
  totalCustomers: number;
  averageTransactionAmount: number;
  totalTax: number;
  totalDiscount: number;
  paymentMethodBreakdown: {
    cash: number;
    creditCard: number;
    qrCode: number;
    other: number;
  };
  newCustomers: number;
  returningCustomers: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  totalAdvertisingExpense: number;
  cpa: number;
  roas: number;
  dailyData: Array<{
    date: string;
    sales: number;
    transactions: number;
    customers: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalSpent: number;
    visitCount: number;
  }>;
}

interface SettlementSummary {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  customerAcquisitionCost: number;
  returnOnAdSpend: number;
}

const SettlementReport: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [previewFormat, setPreviewFormat] = useState<"html" | null>(null);
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null);
  const [summary, setSummary] = useState<SettlementSummary | null>(null);

  // ダミーfacilityId（実際にはユーザー情報から取得）
  const facilityId = "facility_001";
  const facilityName = "ULU Group";

  // 月次データ取得
  const getMonthlyData = trpc.settlement.getMonthlyData.useQuery(
    {
      facilityId,
      facilityName,
      year: selectedYear,
      month: selectedMonth,
    },
    {
      enabled: false,
    }
  );

  // HTML生成
  const generateHTMLMutation = trpc.settlement.generateHTML.useQuery(
    {
      facilityId,
      facilityName,
      year: selectedYear,
      month: selectedMonth,
    },
    {
      enabled: false,
    }
  );

  // PDF生成
  const generatePDFMutation = trpc.settlement.generatePDF.useMutation();

  // Excel生成
  const generateExcelMutation = trpc.settlement.generateExcel.useMutation();

  const handleLoadData = async () => {
    const result = await getMonthlyData.refetch();
    if (result.data) {
      setSettlementData(result.data.data);
      setSummary(result.data.summary);
    }
  };

  const handlePreviewHTML = async () => {
    const result = await generateHTMLMutation.refetch();
    if (result.data?.html) {
      setPreviewFormat("html");
      // HTMLをプレビューウィンドウで表示
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(result.data.html);
        newWindow.document.close();
      }
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const result = await generatePDFMutation.mutateAsync({
        facilityId,
        facilityName,
        year: selectedYear,
        month: selectedMonth,
      });

      const binaryString = atob(result.buffer);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download error:", error);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const result = await generateExcelMutation.mutateAsync({
        facilityId,
        facilityName,
        year: selectedYear,
        month: selectedMonth,
      });

      const binaryString = atob(result.buffer);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Excel download error:", error);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-blue-600" />
            決算書類自動生成
          </h1>
          <p className="text-gray-600 mt-2">月次決算報告書をPDF・Excel・HTML形式で生成</p>
        </div>

        {/* 期間選択 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              報告期間選択
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  年度
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}年
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {month}月
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleLoadData}
                className="bg-blue-600 hover:bg-blue-700"
              >
                データ読み込み
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* データサマリー */}
        {summary && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>決算サマリー - {summary.period}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">総売上</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ¥{summary.totalRevenue.toLocaleString()}
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">純利益</p>
                  <p className="text-2xl font-bold text-green-600">
                    ¥{summary.netProfit.toLocaleString()}
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">利益率</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {summary.profitMargin}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 生成オプション */}
        <Card>
          <CardHeader>
            <CardTitle>レポート生成</CardTitle>
            <CardDescription>
              選択した期間の決算報告書を生成・ダウンロード
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* HTML プレビュー */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">HTML形式</h3>
                <p className="text-sm text-gray-600 mb-4">
                  ブラウザで表示・印刷できるHTML形式のレポート
                </p>
                <Button
                  onClick={handlePreviewHTML}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={generateHTMLMutation.isLoading}
                >
                  <Eye className="w-4 h-4" />
                  プレビュー表示
                </Button>
              </div>

              {/* PDF ダウンロード */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">PDF形式</h3>
                <p className="text-sm text-gray-600 mb-4">
                  印刷・共有に最適なPDF形式のレポート
                </p>
                <Button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                  disabled={generatePDFMutation.isPending}
                >
                  <Download className="w-4 h-4" />
                  {generatePDFMutation.isPending ? "生成中..." : "PDFダウンロード"}
                </Button>
              </div>

              {/* Excel ダウンロード */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Excel形式</h3>
                <p className="text-sm text-gray-600 mb-4">
                  データ分析・加工に最適なExcel形式のレポート
                </p>
                <Button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  disabled={generateExcelMutation.isPending}
                >
                  <Download className="w-4 h-4" />
                  {generateExcelMutation.isPending ? "生成中..." : "Excelダウンロード"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 詳細データ表示 */}
        {settlementData && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>詳細データ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 売上詳細 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">売上詳細</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 text-gray-600">総売上</td>
                          <td className="text-right font-semibold">
                            ¥{settlementData.totalSales.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 text-gray-600">取引件数</td>
                          <td className="text-right font-semibold">
                            {settlementData.totalTransactions}件
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 text-gray-600">顧客数</td>
                          <td className="text-right font-semibold">
                            {settlementData.totalCustomers}人
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 text-gray-600">平均取引額</td>
                          <td className="text-right font-semibold">
                            ¥{settlementData.averageTransactionAmount.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 支払い方法別 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">支払い方法別</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600">現金</p>
                      <p className="font-semibold">
                        ¥{settlementData.paymentMethodBreakdown.cash.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600">クレジットカード</p>
                      <p className="font-semibold">
                        ¥{settlementData.paymentMethodBreakdown.creditCard.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600">QRコード</p>
                      <p className="font-semibold">
                        ¥{settlementData.paymentMethodBreakdown.qrCode.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600">その他</p>
                      <p className="font-semibold">
                        ¥{settlementData.paymentMethodBreakdown.other.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SettlementReport;
