/**
 * 経費管理ページ
 * 
 * 16カテゴリの経費入力と簡易PL表示を提供します。
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
import { Loader2, Plus, Pencil, Trash2, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { EXPENSE_CATEGORIES, DEFAULT_EXPENSE_VALUES } from "../../../shared/expenseCategories";

export default function ExpenseManagement() {
  const [, setLocation] = useLocation();
  const [selectedYearMonth, setSelectedYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    costProductSales: 0,
    costTreatmentMaterials: 0,
    ...DEFAULT_EXPENSE_VALUES,
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
        ...DEFAULT_EXPENSE_VALUES,
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
      minimumFractionDigits: 0,
    }).format(num);
  };

  const generateYearMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      options.push(yearMonth);
    }
    return options;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">経費管理</h1>
          <p className="text-muted-foreground mt-2">
            月次経費を登録して簡易PLを自動計算します
          </p>
        </div>
        <Button onClick={() => setLocation("/expenses/batch-edit")}>
          <BarChart3 className="mr-2 h-4 w-4" />
          一括編集
        </Button>
      </div>

      {/* 簡易PL表示 */}
      {currentPL && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>簡易PL（{selectedYearMonth}）</CardTitle>
            <CardDescription>
              売上から経費を差し引いた営業利益を表示します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">売上高</p>
                <p className="text-2xl font-bold">{formatCurrency(currentPL.revenue)}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">売上総利益（粗利）</p>
                <p className="text-2xl font-bold">{formatCurrency(currentPL.grossProfit)}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">営業利益</p>
                <p className={`text-2xl font-bold ${parseFloat(String(currentPL.operatingIncome)) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(currentPL.operatingIncome)}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <h3 className="font-semibold">経費内訳</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">物販仕入:</span>{" "}
                  <span className="font-medium">{formatCurrency(currentPL.costProductSales)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">施術材料:</span>{" "}
                  <span className="font-medium">{formatCurrency(currentPL.costTreatmentMaterials)}</span>
                </div>
                {EXPENSE_CATEGORIES.map((category) => (
                  <div key={category.key}>
                    <span className="text-muted-foreground">{category.label}:</span>{" "}
                    <span className="font-medium">{formatCurrency((currentPL as any)[category.key] || 0)}</span>
                  </div>
                ))}
                <div>
                  <span className="text-muted-foreground">広告宣伝費:</span>{" "}
                  <span className="font-medium">{formatCurrency(currentPL.advertisingTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 経費登録フォーム */}
      {isCreating ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>新規経費登録</CardTitle>
            <CardDescription>
              月次経費を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="yearMonth">対象年月</Label>
                  <Select value={selectedYearMonth} onValueChange={setSelectedYearMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {generateYearMonthOptions().map((ym) => (
                        <SelectItem key={ym} value={ym}>
                          {ym}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">原価</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
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
                  <div>
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
                <h3 className="font-semibold text-lg">経費</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {EXPENSE_CATEGORIES.map((category) => (
                    <div key={category.key}>
                      <Label htmlFor={category.key}>{category.label}</Label>
                      <Input
                        id={category.key}
                        type="number"
                        min="0"
                        value={formData[category.key]}
                        onChange={(e) =>
                          setFormData({ ...formData, [category.key]: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">広告宣伝費</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="advertisingMeta">Meta広告</Label>
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
                  <div>
                    <Label htmlFor="advertisingGoogle">Google広告</Label>
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
                  <div>
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

              <div>
                <Label htmlFor="notes">備考</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="任意のメモを入力してください"
                />
              </div>

              <div className="flex gap-2">
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
      ) : (
        <Button onClick={() => setIsCreating(true)} className="mb-8">
          <Plus className="mr-2 h-4 w-4" />
          新規登録
        </Button>
      )}

      {/* 経費一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>経費履歴</CardTitle>
          <CardDescription>
            過去の経費データを確認できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses && expenses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>年月</TableHead>
                    <TableHead className="text-right">売上高</TableHead>
                    <TableHead className="text-right">粗利</TableHead>
                    <TableHead className="text-right">営業利益</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense: any) => (
                    <TableRow key={expense.expenseId}>
                      <TableCell className="font-medium">{expense.yearMonth}</TableCell>
                      <TableCell className="text-right">{formatCurrency(expense.revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(expense.grossProfit)}</TableCell>
                      <TableCell className={`text-right ${parseFloat(expense.operatingIncome) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(expense.operatingIncome)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(expense.expenseId)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              経費データがありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
