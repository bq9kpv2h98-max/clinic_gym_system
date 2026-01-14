/**
 * 月次統計ダッシュボード
 * 
 * 顧客の月別来院回数、来院頻度ランキング、月別来院推移を表示します。
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MonthlyStats() {
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);

  // 今月の来院回数ランキング
  const { data: ranking, isLoading: rankingLoading } = trpc.monthlyStats.getMonthlyRanking.useQuery({
    yearMonth: selectedMonth,
    limit: 10,
  });

  // 月別来院推移
  const { data: trend, isLoading: trendLoading } = trpc.monthlyStats.getMonthlyTrend.useQuery({
    months: 12,
  });

  // 過去12ヶ月の年月リストを生成
  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    monthOptions.push({ value: yearMonth, label });
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">月次統計</h1>
        <p className="text-muted-foreground">
          顧客の月別来院回数、来院頻度ランキング、月別来院推移を確認できます
        </p>
      </div>

      {/* 月選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            対象月を選択
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="月を選択" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 来院回数ランキング */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {selectedMonth.replace("-", "年")}月の来院回数ランキング
          </CardTitle>
          <CardDescription>
            今月の来院回数が多い顧客トップ10を表示しています
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rankingLoading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : ranking && ranking.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">順位</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead>来院回数</TableHead>
                  <TableHead>最終来院日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((item, index) => (
                  <TableRow key={item.customerId}>
                    <TableCell className="font-medium">
                      {index === 0 && "🥇"}
                      {index === 1 && "🥈"}
                      {index === 2 && "🥉"}
                      {index > 2 && `${index + 1}位`}
                    </TableCell>
                    <TableCell>{item.customerName}</TableCell>
                    <TableCell>{item.visitCount}回</TableCell>
                    <TableCell>
                      {new Date(item.lastVisitDate).toLocaleDateString("ja-JP")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              この月の来院記録がありません
            </div>
          )}
        </CardContent>
      </Card>

      {/* 月別来院推移グラフ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            月別来院推移（過去12ヶ月）
          </CardTitle>
          <CardDescription>
            過去12ヶ月の来院数の推移をグラフで表示しています
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : trend && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="yearMonth"
                  tickFormatter={(value) => {
                    const [year, month] = value.split("-");
                    return `${year}/${month}`;
                  }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => {
                    const [year, month] = value.split("-");
                    return `${year}年${month}月`;
                  }}
                  formatter={(value: number) => [`${value}回`, "来院数"]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="visitCount"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="来院数"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              データがありません
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
