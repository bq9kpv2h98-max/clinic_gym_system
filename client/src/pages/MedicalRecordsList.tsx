import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Search, FileText, Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MedicalRecordsList() {
  const [, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  // カルテ一覧取得
  const { data: records, isLoading, refetch } = trpc.medicalRecords.getAll.useQuery({ limit: 100 });

  // カルテ削除
  const deleteMutation = trpc.medicalRecords.delete.useMutation({
    onSuccess: () => {
      toast.success("カルテを削除しました");
      refetch();
      setDeleteRecordId(null);
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  // 検索フィルター
  const filteredRecords = records?.filter((record) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.customerName?.toLowerCase().includes(query) ||
      record.summary?.toLowerCase().includes(query) ||
      record.notes?.toLowerCase().includes(query) ||
      record.tags?.toLowerCase().includes(query)
    );
  });

  const handleDelete = (recordId: string) => {
    setDeleteRecordId(recordId);
  };

  const confirmDelete = () => {
    if (deleteRecordId) {
      deleteMutation.mutate({ recordId: deleteRecordId });
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateText = (text: string | null | undefined, maxLength: number = 100) => {
    if (!text) return "-";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">カルテ管理</h1>
          <p className="text-muted-foreground mt-1">
            施術記録の登録・閲覧・編集ができます
          </p>
        </div>
        <Button onClick={() => setLocation("/medical-records/new")}>
          <Plus className="h-4 w-4 mr-2" />
          カルテ登録
        </Button>
      </div>

      {/* 検索バー */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="顧客名、要約、メモ、タグで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* カルテ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>カルテ一覧（{filteredRecords?.length || 0}件）</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords && filteredRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>来院日時</TableHead>
                    <TableHead>顧客名</TableHead>
                    <TableHead>担当スタッフ</TableHead>
                    <TableHead className="max-w-md">要約</TableHead>
                    <TableHead>タグ</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.recordId}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(record.visitDate)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.customerName || "-"}
                      </TableCell>
                      <TableCell>{record.staffName || "-"}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm text-muted-foreground">
                          {truncateText(record.summary)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.tags ? (
                          <div className="flex flex-wrap gap-1">
                            {record.tags.split(",").slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag.trim()}
                              </Badge>
                            ))}
                            {record.tags.split(",").length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{record.tags.split(",").length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/medical-records/${record.recordId}`)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/medical-records/edit?recordId=${record.recordId}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(record.recordId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "検索結果がありません" : "カルテがまだ登録されていません"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setLocation("/medical-records/new")}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  カルテを登録
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteRecordId} onOpenChange={() => setDeleteRecordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>カルテを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。カルテを完全に削除してもよろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
