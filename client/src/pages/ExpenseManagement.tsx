/**
 * 経費管理ページ
 * 
 * 10カテゴリの経費入力と簡易PL表示を提供します。
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";

export default function ExpenseManagement() {
  const [selectedYearMonth, setSelectedYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    costProductSales: 0,
    costTreatmentMaterials: 0,
    laborCosts: 0,
    rent: 0,
    utilities: 0,
    otherExpenses: 0,
    advertisingMeta: 0,
    advertisingGoogle: 0,
    advertisingFlyer: 0,
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: expenses, isLoading } = trpc.expenses.list.useQuery({ limit: 12 });
  const { data: currentPL } = trpc.expenses.getPL.useQuery({ yearMonth: selectedYearMonth });

  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("経費データを登録しました");
      utils.expenses.list.invalidate();
      utils.expenses.getPL.invalidate();
      setIsCreating(false);
      setFormData({
        costProductSales: 0,
        costTreatmentMaterials: 0,
        laborCosts: 0,
        rent: 0,
        utilities: 0,
        otherExpenses: 0,
        advertisingMeta: 0,
        advertisingGoogle: 0,
        advertisingFlyer: 0,
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(`登録に失敗しました: ${error.message}`);
    },
  });

  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("経費データを削除しました");
      utils.expenses.list.invalidate();
      utils.expenses.getPL.invalidate();
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      yearMonth: selectedYearMonth,
      ...formData,
    });
  };

  const handleDelete = (expenseId: string) => {
    if (confirm("この経費データを削除しますか？")) {
      deleteMutation.mutate({ expenseId });
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(num);
  };

  const formatPercent = (value: string | number, total: string | number) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    const numTotal = typeof total === "string" ? parseFloat(total) : total;
    if (numTotal === 0) return "0%";
    return `${((numValue / numTotal) * 100).toFixed(1)}%`;
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">経費管理</h1>
          <p className="text-muted-foreground mt-2">
            月次経費を入力して、簡易PLを自動計算します
          </p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? "キャンセル" : <><Plus className="mr-2 h-4 w-4" />新規登録</>}
        </Button>
      </div>

      {/* 簡易PL表示 */}
      <Card>
        <CardHeader>
          <CardTitle>簡易PL（{selectedYearMonth}）</CardTitle>
          <CardDescription>売上総利益と営業利益を確認できます</CardDescription>
        </CardHeader>
        <CardContent>
          {currentPL ? (
            <div className="space-y-6">
              {/* 売上 */}
              <div className="border-b pb-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>売上高</span>
                  <span className="text-blue-600">{formatCurrency(currentPL.revenue)}</span>
                </div>
              </div>

              {/* 原価 */}
              <div className="border-b pb-4 space-y-2">
                <div className="text-sm font-medium text-muted-foreground">売上原価</div>
                <div className="flex justify-between items-center text-sm pl-4">
                  <span>物販仕入</span>
                  <span>{formatCurrency(currentPL.costProductSales)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pl-4">
                  <span>施術材料</span>
                  <span>{formatCurrency(currentPL.costTreatmentMaterials)}</span>
                </div>
              </div>

              {/* 売上総利益 */}
              <div className="border-b pb-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span className="flex items-center gap-2">
                    売上総利益（粗利）
                    {(typeof currentPL.grossProfit === 'string' ? parseFloat(currentPL.grossProfit) : currentPL.grossProfit) >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                  </span>
                  <span className={(typeof currentPL.grossProfit === 'string' ? parseFloat(currentPL.grossProfit) : currentPL.grossProfit) >= 0 ? "text-green-600" : "text-red-600"}>
                    {formatCurrency(currentPL.grossProfit)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  粗利率: {formatPercent(currentPL.grossProfit, currentPL.revenue)}
                </div>
              </div>

              {/* 販管費 */}
              <div className="border-b pb-4 space-y-2">
                <div className="text-sm font-medium text-muted-foreground">販売管理費</div>
                <div className="flex justify-between items-center text-sm pl-4">
                  <span>人件費</span>
                  <span>{formatCurrency(currentPL.laborCosts)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pl-4">
                  <span>家賃</span>
                  <span>{formatCurrency(currentPL.rent)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pl-4">
                  <span>水道光熱費</span>
                  <span>{formatCurrency(currentPL.utilities)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pl-4">
                  <span>その他経費</span>
                  <span>{formatCurrency(currentPL.otherExpenses)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pl-4">
                  <span>広告宣伝費</span>
                  <span>{formatCurrency(currentPL.advertisingTotal)}</span>
                </div>
                {currentPL.advertisingBreakdown && currentPL.advertisingBreakdown.length > 0 && (
                  <div className="pl-8 space-y-1 text-xs text-muted-foreground">
                    {currentPL.advertisingBreakdown.map((item: any) => (
                      <div key={item.breakdownId} className="flex justify-between">
                        <span>
                          {item.channel === "meta" && "Meta"}
                          {item.channel === "google" && "Google"}
                          {item.channel === "flyer" && "チラシ"}
                        </span>
                        <span>{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 営業利益 */}
              <div>
                <div className="flex justify-between items-center text-xl font-bold">
                  <span className="flex items-center gap-2">
                    営業利益
                    {(typeof currentPL.operatingIncome === 'string' ? parseFloat(currentPL.operatingIncome) : currentPL.operatingIncome) >= 0 ? (
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    )}
                  </span>
                  <span className={(typeof currentPL.operatingIncome === 'string' ? parseFloat(currentPL.operatingIncome) : currentPL.operatingIncome) >= 0 ? "text-green-600" : "text-red-600"}>
                    {formatCurrency(currentPL.operatingIncome)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  営業利益率: {formatPercent(currentPL.operatingIncome, currentPL.revenue)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {selectedYearMonth}の経費データがありません
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新規登録フォーム */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>経費データ登録</CardTitle>
            <CardDescription>
              月次経費を入力してください（売上は自動集計されます）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearMonth">年月</Label>
                  <Input
                    id="yearMonth"
                    type="month"
                    value={selectedYearMonth}
                    onChange={(e) => setSelectedYearMonth(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">原価</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costProductSales">物販仕入</Label>
                    <Input
                      id="costProductSales"
                      type="number"
                      min="0"
                      value={formData.costProductSales}
                      onChange={(e) =>
                        setFormData({ ...formData, costProductSales: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costTreatmentMaterials">施術材料</Label>
                    <Input
                      id="costTreatmentMaterials"
                      type="number"
                      min="0"
                      value={formData.costTreatmentMaterials}
                      onChange={(e) =>
                        setFormData({ ...formData, costTreatmentMaterials: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">経費</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="laborCosts">人件費</Label>
                    <Input
                      id="laborCosts"
                      type="number"
                      min="0"
                      value={formData.laborCosts}
                      onChange={(e) =>
                        setFormData({ ...formData, laborCosts: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rent">家賃</Label>
                    <Input
                      id="rent"
                      type="number"
                      min="0"
                      value={formData.rent}
                      onChange={(e) => setFormData({ ...formData, rent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utilities">水道光熱費</Label>
                    <Input
                      id="utilities"
                      type="number"
                      min="0"
                      value={formData.utilities}
                      onChange={(e) =>
                        setFormData({ ...formData, utilities: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otherExpenses">その他経費</Label>
                    <Input
                      id="otherExpenses"
                      type="number"
                      min="0"
                      value={formData.otherExpenses}
                      onChange={(e) =>
                        setFormData({ ...formData, otherExpenses: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">広告宣伝費</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="advertisingMeta">Meta</Label>
                    <Input
                      id="advertisingMeta"
                      type="number"
                      min="0"
                      value={formData.advertisingMeta}
                      onChange={(e) =>
                        setFormData({ ...formData, advertisingMeta: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advertisingGoogle">Google</Label>
                    <Input
                      id="advertisingGoogle"
                      type="number"
                      min="0"
                      value={formData.advertisingGoogle}
                      onChange={(e) =>
                        setFormData({ ...formData, advertisingGoogle: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advertisingFlyer">チラシ</Label>
                    <Input
                      id="advertisingFlyer"
                      type="number"
                      min="0"
                      value={formData.advertisingFlyer}
                      onChange={(e) =>
                        setFormData({ ...formData, advertisingFlyer: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">メモ</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="任意のメモを入力してください"
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  登録
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 経費一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>経費履歴</CardTitle>
          <CardDescription>過去の経費データを確認できます</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : expenses && expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>年月</TableHead>
                  <TableHead className="text-right">売上高</TableHead>
                  <TableHead className="text-right">売上総利益</TableHead>
                  <TableHead className="text-right">営業利益</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense: any) => (
                  <TableRow key={expense.expenseId}>
                    <TableCell className="font-medium">{expense.yearMonth}</TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.revenue)}</TableCell>
                    <TableCell className="text-right">
                      <span className={parseFloat(expense.grossProfit) >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(expense.grossProfit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={parseFloat(expense.operatingIncome) >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(expense.operatingIncome)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedYearMonth(expense.yearMonth)}
                        >
                          詳細
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(expense.expenseId)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              経費データがありません
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
