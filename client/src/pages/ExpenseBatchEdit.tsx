/**
 * 経費一括編集ページ
 * 
 * 複数月の経費データを一括で編集できる機能を提供します。
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Save, X } from "lucide-react";
import { useLocation } from "wouter";
import { EXPENSE_CATEGORIES } from "../../../shared/expenseCategories";

interface ExpenseEdit {
  expenseId: string;
  yearMonth: string;
  costProductSales: number;
  costTreatmentMaterials: number;
  laborCosts: number;
  rent: number;
  utilities: number;
  communicationCosts: number;
  consumablesCosts: number;
  trainingExpenses: number;
  travelExpenses: number;
  bankRepayment: number;
  insuranceCosts: number;
  leaseCosts: number;
  repairCosts: number;
  welfareCosts: number;
  depreciationCosts: number;
  accountingCosts: number;
  miscellaneousCosts: number;
  otherExpenses: number;
  advertisingMeta: number;
  advertisingGoogle: number;
  advertisingFlyer: number;
  notes: string;
}

export default function ExpenseBatchEdit() {
  const [, setLocation] = useLocation();
  const [editData, setEditData] = useState<ExpenseEdit[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const utils = trpc.useUtils();
  const { data: expenses, isLoading } = trpc.expenses.list.useQuery({ limit: 12 });

  const batchUpdateMutation = trpc.expenses.batchUpdate.useMutation({
    onSuccess: () => {
      toast.success("経費データを一括更新しました");
      utils.expenses.list.invalidate();
      utils.expenses.getPL.invalidate();
      setHasChanges(false);
      setLocation("/expenses");
    },
    onError: (error) => {
      toast.error(`一括更新に失敗しました: ${error.message}`);
    },
  });

  useEffect(() => {
    if (expenses) {
      const initialData: ExpenseEdit[] = expenses.map((expense) => {
        const metaBreakdown = expense.advertisingBreakdown?.find((b: any) => b.channel === "meta");
        const googleBreakdown = expense.advertisingBreakdown?.find((b: any) => b.channel === "google");
        const flyerBreakdown = expense.advertisingBreakdown?.find((b: any) => b.channel === "flyer");

        return {
          expenseId: expense.expenseId,
          yearMonth: expense.yearMonth,
          costProductSales: parseFloat(expense.costProductSales),
          costTreatmentMaterials: parseFloat(expense.costTreatmentMaterials),
          laborCosts: parseFloat(expense.laborCosts),
          rent: parseFloat(expense.rent),
          utilities: parseFloat(expense.utilities),
          communicationCosts: parseFloat(expense.communicationCosts || "0"),
          consumablesCosts: parseFloat(expense.consumablesCosts || "0"),
          trainingExpenses: parseFloat(expense.trainingExpenses),
          travelExpenses: parseFloat(expense.travelExpenses),
          bankRepayment: parseFloat(expense.bankRepayment || "0"),
          insuranceCosts: parseFloat(expense.insuranceCosts || "0"),
          leaseCosts: parseFloat(expense.leaseCosts || "0"),
          repairCosts: parseFloat(expense.repairCosts || "0"),
          welfareCosts: parseFloat(expense.welfareCosts || "0"),
          depreciationCosts: parseFloat(expense.depreciationCosts || "0"),
          accountingCosts: parseFloat(expense.accountingCosts || "0"),
          miscellaneousCosts: parseFloat(expense.miscellaneousCosts || "0"),
          otherExpenses: parseFloat(expense.otherExpenses),
          advertisingMeta: metaBreakdown ? parseFloat(metaBreakdown.amount) : 0,
          advertisingGoogle: googleBreakdown ? parseFloat(googleBreakdown.amount) : 0,
          advertisingFlyer: flyerBreakdown ? parseFloat(flyerBreakdown.amount) : 0,
          notes: expense.notes || "",
        };
      });
      setEditData(initialData);
    }
  }, [expenses]);

  const handleFieldChange = (expenseId: string, field: keyof ExpenseEdit, value: number | string) => {
    setEditData((prev) =>
      prev.map((item) =>
        item.expenseId === expenseId ? { ...item, [field]: value } : item
      )
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = () => {
    const updates = editData.map((item) => ({
      expenseId: item.expenseId,
      costProductSales: item.costProductSales,
      costTreatmentMaterials: item.costTreatmentMaterials,
      laborCosts: item.laborCosts,
      rent: item.rent,
      utilities: item.utilities,
      communicationCosts: item.communicationCosts,
      consumablesCosts: item.consumablesCosts,
      trainingExpenses: item.trainingExpenses,
      travelExpenses: item.travelExpenses,
      bankRepayment: item.bankRepayment,
      insuranceCosts: item.insuranceCosts,
      leaseCosts: item.leaseCosts,
      repairCosts: item.repairCosts,
      welfareCosts: item.welfareCosts,
      depreciationCosts: item.depreciationCosts,
      accountingCosts: item.accountingCosts,
      miscellaneousCosts: item.miscellaneousCosts,
      otherExpenses: item.otherExpenses,
      advertisingMeta: item.advertisingMeta,
      advertisingGoogle: item.advertisingGoogle,
      advertisingFlyer: item.advertisingFlyer,
      notes: item.notes,
    }));

    batchUpdateMutation.mutate({ updates });
    setShowConfirmDialog(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(value);
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
          <h1 className="text-3xl font-bold">経費一括編集</h1>
          <p className="text-muted-foreground mt-2">
            複数月の経費データを一括で編集できます
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!hasChanges || batchUpdateMutation.isPending}>
            {batchUpdateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
          <Button variant="outline" onClick={() => setLocation("/expenses")}>
            <X className="mr-2 h-4 w-4" />
            キャンセル
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>経費データ編集</CardTitle>
          <CardDescription>
            各フィールドをクリックして編集してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">年月</TableHead>
                    <TableHead>物販仕入</TableHead>
                    <TableHead>施術材料</TableHead>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <TableHead key={category.key}>{category.label}</TableHead>
                    ))}
                    <TableHead>Meta広告</TableHead>
                    <TableHead>Google広告</TableHead>
                    <TableHead>チラシ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editData.slice(0, 3).map((expense) => (
                    <TableRow key={expense.expenseId}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {expense.yearMonth}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={expense.costProductSales}
                          onChange={(e) =>
                            handleFieldChange(expense.expenseId, "costProductSales", parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={expense.costTreatmentMaterials}
                          onChange={(e) =>
                            handleFieldChange(expense.expenseId, "costTreatmentMaterials", parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <TableCell key={category.key}>
                          <Input
                            type="number"
                            min="0"
                            value={expense[category.key]}
                            onChange={(e) =>
                              handleFieldChange(expense.expenseId, category.key, parseFloat(e.target.value) || 0)
                            }
                            className="w-24"
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={expense.advertisingMeta}
                          onChange={(e) =>
                            handleFieldChange(expense.expenseId, "advertisingMeta", parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={expense.advertisingGoogle}
                          onChange={(e) =>
                            handleFieldChange(expense.expenseId, "advertisingGoogle", parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={expense.advertisingFlyer}
                          onChange={(e) =>
                            handleFieldChange(expense.expenseId, "advertisingFlyer", parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              編集可能な経費データがありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* 確認ダイアログ */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>経費データを一括更新しますか？</DialogTitle>
            <DialogDescription>
              {editData.slice(0, 3).length}件の経費データを更新します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmSave} disabled={batchUpdateMutation.isPending}>
              {batchUpdateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
