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
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Save, X } from "lucide-react";
import { useLocation } from "wouter";

interface ExpenseEdit {
  expenseId: string;
  yearMonth: string;
  costProductSales: number;
  costTreatmentMaterials: number;
  laborCosts: number;
  rent: number;
  utilities: number;
  trainingExpenses: number;
  travelExpenses: number;
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
        const metaBreakdown = expense.advertisingBreakdown?.find((b) => b.channel === "meta");
        const googleBreakdown = expense.advertisingBreakdown?.find((b) => b.channel === "google");
        const flyerBreakdown = expense.advertisingBreakdown?.find((b) => b.channel === "flyer");

        return {
          expenseId: expense.expenseId,
          yearMonth: expense.yearMonth,
          costProductSales: parseFloat(expense.costProductSales),
          costTreatmentMaterials: parseFloat(expense.costTreatmentMaterials),
          laborCosts: parseFloat(expense.laborCosts),
          rent: parseFloat(expense.rent),
          utilities: parseFloat(expense.utilities),
          trainingExpenses: parseFloat(expense.trainingExpenses),
          travelExpenses: parseFloat(expense.travelExpenses),
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
      trainingExpenses: item.trainingExpenses,
      travelExpenses: item.travelExpenses,
      otherExpenses: item.otherExpenses,
      advertisingMeta: item.advertisingMeta,
      advertisingGoogle: item.advertisingGoogle,
      advertisingFlyer: item.advertisingFlyer,
      notes: item.notes,
    }));

    batchUpdateMutation.mutate({ updates });
    setShowConfirmDialog(false);
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm("変更が保存されていません。編集を破棄しますか？")) {
        setLocation("/expenses");
      }
    } else {
      setLocation("/expenses");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>経費一括編集</CardTitle>
              <CardDescription>複数月の経費データを一括で編集できます</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges || batchUpdateMutation.isPending}>
                {batchUpdateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                保存
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">年月</TableHead>
                  <TableHead className="min-w-[120px]">物販仕入</TableHead>
                  <TableHead className="min-w-[120px]">施術材料</TableHead>
                  <TableHead className="min-w-[120px]">人件費</TableHead>
                  <TableHead className="min-w-[120px]">家賃</TableHead>
                  <TableHead className="min-w-[120px]">水道光熱費</TableHead>
                  <TableHead className="min-w-[120px]">研修費</TableHead>
                  <TableHead className="min-w-[120px]">交通費</TableHead>
                  <TableHead className="min-w-[120px]">その他経費</TableHead>
                  <TableHead className="min-w-[120px]">Meta広告</TableHead>
                  <TableHead className="min-w-[120px]">Google広告</TableHead>
                  <TableHead className="min-w-[120px]">チラシ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editData.map((item) => (
                  <TableRow key={item.expenseId}>
                    <TableCell className="font-medium">{item.yearMonth}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.costProductSales}
                        onChange={(e) =>
                          handleFieldChange(item.expenseId, "costProductSales", parseFloat(e.target.value) || 0)
                        }
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.costTreatmentMaterials}
                        onChange={(e) =>
                          handleFieldChange(item.expenseId, "costTreatmentMaterials", parseFloat(e.target.value) || 0)
                        }
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.laborCosts}
                        onChange={(e) =>
                          handleFieldChange(item.expenseId, "laborCosts", parseFloat(e.target.value) || 0)
                        }
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.rent}
                        onChange={(e) =>
                          handleFieldChange(item.expenseId, "rent", parseFloat(e.target.value) || 0)
                        }
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.utilities}
                        onChange={(e) =>
                          handleFieldChange(item.expenseId, "utilities", parseFloat(e.target.value) || 0)
                        }
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.trainingExpenses}
                        onChange={(e) =>
                          handleFieldChange(item.expenseId, "trainingExpenses", parseFloat(e.target.value) || 0)
                        }
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.travelExpenses}
                        onChange={(e) =>
                          handleFieldChange(item.expenseId, "travelExpenses", parseFloat(e.target.value) || 0)
                        }
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.otherExpenses}
                        onChange={(e) =>
                          handleFieldChange(item.expenseId, "otherExpenses", parseFloat(e.target.value) || 0)
                        }
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.advertisingMeta}
                        onChange={(e) =>
                          handleFieldChange(item.expenseId, "advertisingMeta", parseFloat(e.target.value) || 0)
                        }
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.advertisingGoogle}
                        onChange={(e) =>
                          handleFieldChange(item.expenseId, "advertisingGoogle", parseFloat(e.target.value) || 0)
                        }
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.advertisingFlyer}
                        onChange={(e) =>
                          handleFieldChange(item.expenseId, "advertisingFlyer", parseFloat(e.target.value) || 0)
                        }
                        className="w-full"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>変更を保存しますか？</DialogTitle>
            <DialogDescription>
              {editData.length}件の経費データを一括更新します。この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
