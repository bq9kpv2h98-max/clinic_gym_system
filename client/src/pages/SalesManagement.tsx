import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit, Trash2, Plus, DollarSign, Calendar } from "lucide-react";

const SalesManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // 売上一覧取得
  const { data: sales, isLoading, refetch } = trpc.sales.getAll.useQuery();

  // 売上更新
  const updateSaleMutation = trpc.sales.update.useMutation({
    onSuccess: () => {
      alert("売上情報を更新しました");
      setEditDialogOpen(false);
      refetch();
    },
    onError: (error: any) => {
      alert(`更新失敗: ${error.message}`);
    },
  });

  // 売上削除
  const deleteSaleMutation = trpc.sales.delete.useMutation({
    onSuccess: () => {
      alert("売上を削除しました");
      setDeleteDialogOpen(false);
      refetch();
    },
    onError: (error: any) => {
      alert(`削除失敗: ${error.message}`);
    },
  });

  const handleEdit = (sale: any) => {
    setSelectedSale(sale);
    setEditDialogOpen(true);
  };

  const handleDelete = (sale: any) => {
    setSelectedSale(sale);
    setDeleteDialogOpen(true);
  };

  const handleUpdateSale = () => {
    if (!selectedSale) return;

    updateSaleMutation.mutate({
      saleId: selectedSale.saleId,
      amount: selectedSale.amount,
      paymentMethod: selectedSale.paymentMethod,
      saleDate: selectedSale.saleDate,
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedSale) return;
    deleteSaleMutation.mutate({ saleId: selectedSale.saleId });
  };

  // 検索フィルター
  const filteredSales = sales?.filter((sale: any) => {
    const query = searchQuery.toLowerCase();
    return (
      sale.customerName?.toLowerCase().includes(query) ||
      sale.saleId?.toLowerCase().includes(query) ||
      sale.paymentMethod?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">売上管理</h1>
          <p className="text-gray-600">売上データの閲覧・編集・削除ができます</p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総売上</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{sales?.reduce((sum: number, sale: any) => sum + sale.amount, 0).toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">売上件数</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sales?.length || 0}件</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均単価</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{sales?.length ? Math.round(sales.reduce((sum: number, sale: any) => sum + sale.amount, 0) / sales.length).toLocaleString() : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 検索バー */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="顧客名、売上ID、支払い方法で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 売上一覧テーブル */}
        <Card>
          <CardHeader>
            <CardTitle>売上一覧</CardTitle>
            <CardDescription>全ての売上データを表示しています</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>売上ID</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>支払い方法</TableHead>
                  <TableHead>売上日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales && filteredSales.length > 0 ? (
                  filteredSales.map((sale: any) => (
                    <TableRow key={sale.saleId}>
                      <TableCell className="font-mono text-sm">{sale.saleId.substring(0, 8)}...</TableCell>
                      <TableCell>{sale.customerName || "不明"}</TableCell>
                      <TableCell className="font-semibold">¥{sale.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {sale.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(sale.saleDate).toLocaleDateString("ja-JP")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(sale)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            編集
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(sale)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            削除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      {searchQuery ? "検索結果が見つかりません" : "売上データがありません"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 編集ダイアログ */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>売上情報編集</DialogTitle>
              <DialogDescription>売上情報を編集します</DialogDescription>
            </DialogHeader>
            {selectedSale && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">金額</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={selectedSale.amount}
                    onChange={(e) =>
                      setSelectedSale({ ...selectedSale, amount: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="paymentMethod">支払い方法</Label>
                  <Select
                    value={selectedSale.paymentMethod}
                    onValueChange={(value) =>
                      setSelectedSale({ ...selectedSale, paymentMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">現金</SelectItem>
                      <SelectItem value="credit_card">クレジットカード</SelectItem>
                      <SelectItem value="debit_card">デビットカード</SelectItem>
                      <SelectItem value="e_money">電子マネー</SelectItem>
                      <SelectItem value="qr_code">QRコード決済</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="saleDate">売上日</Label>
                  <Input
                    id="saleDate"
                    type="date"
                    value={selectedSale.saleDate ? new Date(selectedSale.saleDate).toISOString().split('T')[0] : ''}
                    onChange={(e) =>
                      setSelectedSale({ ...selectedSale, saleDate: new Date(e.target.value) })
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleUpdateSale} disabled={updateSaleMutation.isPending}>
                {updateSaleMutation.isPending ? "更新中..." : "更新"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 削除確認ダイアログ */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>売上削除確認</DialogTitle>
              <DialogDescription>
                この売上を削除してもよろしいですか？この操作は取り消せません。
              </DialogDescription>
            </DialogHeader>
            {selectedSale && (
              <div className="py-4">
                <p className="text-sm text-gray-600">
                  売上ID: {selectedSale.saleId}
                </p>
                <p className="text-sm text-gray-600">
                  金額: ¥{selectedSale.amount.toLocaleString()}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteSaleMutation.isPending}
              >
                {deleteSaleMutation.isPending ? "削除中..." : "削除"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SalesManagement;
