import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Edit, Calendar, User, UserCircle } from "lucide-react";

export default function MedicalRecordDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const recordId = params.id;

  // カルテ取得
  const { data: record, isLoading } = trpc.medicalRecords.getById.useQuery(
    { recordId: recordId || "" },
    { enabled: !!recordId }
  );

  // 顧客情報取得
  const { data: customer } = trpc.customers.getByCustomerId.useQuery(
    { customerId: record?.customerId || "" },
    { enabled: !!record?.customerId }
  );

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">カルテが見つかりません</p>
            <Button onClick={() => setLocation("/medical-records")} className="mt-4">
              カルテ一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => setLocation("/medical-records")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          カルテ一覧に戻る
        </Button>
        <Button onClick={() => setLocation(`/medical-records/edit?recordId=${record.recordId}`)}>
          <Edit className="h-4 w-4 mr-2" />
          編集
        </Button>
      </div>

      {/* 基本情報 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">来院日時</p>
                <p className="font-medium">{formatDate(record.visitDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">顧客名</p>
                <p className="font-medium">{customer?.fullName || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">担当スタッフ</p>
                <p className="font-medium">{record.staffName || "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">タグ</p>
              {record.tags ? (
                <div className="flex flex-wrap gap-2">
                  {record.tags.split(",").map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI要約 */}
      {record.summary && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI要約</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{record.summary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 書き起こしテキスト */}
      {record.transcription && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>書き起こしテキスト</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-muted-foreground">
                {record.transcription}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* スタッフメモ */}
      {record.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>スタッフメモ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{record.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* メタ情報 */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>作成日時: {formatDate(record.createdAt)}</p>
            <p>更新日時: {formatDate(record.updatedAt)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
