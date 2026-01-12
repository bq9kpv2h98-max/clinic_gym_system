import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Search, Eye, Edit, Trash2, QrCode, Loader } from "lucide-react";


const CustomerManagement: React.FC = () => {

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // 顧客一覧取得
  const { data: customers, isLoading, refetch } = trpc.customers.list.useQuery();

  // フィルター済み顧客リスト
  const filteredCustomers = customers?.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      customer.fullName.toLowerCase().includes(query) ||
      customer.phone.includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.customerId.toLowerCase().includes(query)
    );
  });

  // 顧客詳細表示
  const handleViewDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setIsDetailDialogOpen(true);
  };

  // QRコード表示
  const handleViewQRCode = (customer: any) => {
    if (customer.qrCodeImageUrl) {
      window.open(customer.qrCodeImageUrl, "_blank");
    } else {
      alert("この顧客のQRコードは生成されていません");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">顧客管理</CardTitle>
            <CardDescription>
              登録されている顧客の一覧と詳細情報
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 検索バー */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="名前、電話番号、メールアドレスで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 顧客一覧テーブル */}
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredCustomers && filteredCustomers.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>顧客ID</TableHead>
                      <TableHead>名前</TableHead>
                      <TableHead>電話番号</TableHead>
                      <TableHead>メールアドレス</TableHead>
                      <TableHead>来院回数</TableHead>
                      <TableHead>ポイント</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.customerId}>
                        <TableCell className="font-mono text-sm">
                          {customer.customerId.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">
                          {customer.fullName}
                        </TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{customer.email || "-"}</TableCell>
                        <TableCell>{customer.visitCount || 0}回</TableCell>
                        <TableCell>{customer.totalPoints || 0}pt</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(customer)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewQRCode(customer)}
                            >
                              <QrCode className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                {searchQuery
                  ? "検索結果が見つかりませんでした"
                  : "登録されている顧客がいません"}
              </div>
            )}

            {/* 統計情報 */}
            {customers && customers.length > 0 && (
              <div className="grid grid-cols-3 gap-4 pt-6 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {customers.length}
                  </p>
                  <p className="text-sm text-gray-600">総顧客数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {customers.reduce((sum, c) => sum + (c.visitCount || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-600">総来院回数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {customers.reduce((sum, c) => sum + (c.totalPoints || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-600">総ポイント</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 顧客詳細ダイアログ */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>顧客詳細</DialogTitle>
            <DialogDescription>
              顧客ID: {selectedCustomer?.customerId}
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {/* 基本情報 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">基本情報</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">名前</p>
                    <p className="font-medium">{selectedCustomer.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">生年月日</p>
                    <p className="font-medium">
                      {new Date(selectedCustomer.dateOfBirth).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">性別</p>
                    <p className="font-medium">
                      {selectedCustomer.gender === "male"
                        ? "男性"
                        : selectedCustomer.gender === "female"
                        ? "女性"
                        : selectedCustomer.gender === "other"
                        ? "その他"
                        : "答えたくない"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">登録日</p>
                    <p className="font-medium">
                      {new Date(selectedCustomer.createdAt).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                </div>
              </div>

              {/* 連絡先 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">連絡先</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">電話番号</p>
                    <p className="font-medium">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">メールアドレス</p>
                    <p className="font-medium">{selectedCustomer.email || "-"}</p>
                  </div>
                </div>
              </div>

              {/* 住所 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">住所</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">郵便番号</p>
                    <p className="font-medium">{selectedCustomer.postalCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">住所</p>
                    <p className="font-medium">
                      {selectedCustomer.prefecture}
                      {selectedCustomer.city}
                      {selectedCustomer.addressLine1}
                      {selectedCustomer.addressLine2 && ` ${selectedCustomer.addressLine2}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* ポイント情報 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">ポイント情報</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">現在のポイント</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedCustomer.totalPoints || 0}pt
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">累計ポイント</p>
                    <p className="text-2xl font-bold text-green-600">
                      {selectedCustomer.lifetimePoints || 0}pt
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">来院回数</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {selectedCustomer.visitCount || 0}回
                    </p>
                  </div>
                </div>
              </div>

              {/* QRコード */}
              {selectedCustomer.qrCodeImageUrl && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">診察券QRコード</h3>
                  <div className="flex justify-center bg-gray-100 rounded-lg p-4">
                    <img
                      src={selectedCustomer.qrCodeImageUrl}
                      alt="診察券QRコード"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerManagement;
