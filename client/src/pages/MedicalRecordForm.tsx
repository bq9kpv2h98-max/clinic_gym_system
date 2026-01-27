import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

export default function MedicalRecordForm() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();


  // URLパラメータからrecordIdを取得（編集モード）
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const recordId = searchParams.get("recordId");
  const isEditMode = !!recordId;

  // フォーム状態
  const [customerId, setCustomerId] = useState("");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [visitTime, setVisitTime] = useState(new Date().toTimeString().slice(0, 5));
  const [staffName, setStaffName] = useState("");
  const [transcription, setTranscription] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  // 顧客一覧取得
  const { data: customers, isLoading: isLoadingCustomers } = trpc.customers.list.useQuery();

  // 既存カルテ取得（編集モード）
  const { data: existingRecord, isLoading: isLoadingRecord } = trpc.medicalRecords.getById.useQuery(
    { recordId: recordId || "" },
    { enabled: isEditMode }
  );

  // カルテ作成・更新
  const createMutation = trpc.medicalRecords.create.useMutation({
    onSuccess: () => {
      toast({
        title: "カルテを登録しました",
        description: "カルテが正常に登録されました。",
      });
      setLocation("/medical-records");
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = trpc.medicalRecords.update.useMutation({
    onSuccess: () => {
      toast({
        title: "カルテを更新しました",
        description: "カルテが正常に更新されました。",
      });
      setLocation("/medical-records");
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 既存カルテデータをフォームに反映
  useEffect(() => {
    if (existingRecord) {
      setCustomerId(existingRecord.customerId);
      const date = new Date(existingRecord.visitDate);
      setVisitDate(date.toISOString().split("T")[0]);
      setVisitTime(date.toTimeString().slice(0, 5));
      setStaffName(existingRecord.staffName || "");
      setTranscription(existingRecord.transcription || "");
      setSummary(existingRecord.summary || "");
      setNotes(existingRecord.notes || "");
      setTags(existingRecord.tags || "");
    }
  }, [existingRecord]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast({
        title: "エラー",
        description: "顧客を選択してください。",
        variant: "destructive",
      });
      return;
    }

    const visitDateTime = new Date(`${visitDate}T${visitTime}`).toISOString();

    if (isEditMode && recordId) {
      updateMutation.mutate({
        recordId,
        transcription,
        summary,
        notes,
        tags,
      });
    } else {
      createMutation.mutate({
        customerId,
        visitDate: visitDateTime,
        staffName,
        transcription,
        summary,
        notes,
        tags,
      });
    }
  };

  if (isLoadingCustomers || (isEditMode && isLoadingRecord)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <Button
        variant="ghost"
        onClick={() => setLocation("/medical-records")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        カルテ一覧に戻る
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? "カルテ編集" : "カルテ登録"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 顧客選択 */}
            <div className="space-y-2">
              <Label htmlFor="customer">顧客 *</Label>
              <Select
                value={customerId}
                onValueChange={setCustomerId}
                disabled={isEditMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="顧客を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.customerId} value={customer.customerId}>
                      {customer.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 来院日時 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visitDate">来院日 *</Label>
                <Input
                  id="visitDate"
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  disabled={isEditMode}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visitTime">来院時刻 *</Label>
                <Input
                  id="visitTime"
                  type="time"
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  disabled={isEditMode}
                  required
                />
              </div>
            </div>

            {/* スタッフ名 */}
            {!isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="staffName">担当スタッフ</Label>
                <Input
                  id="staffName"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="担当スタッフ名を入力"
                />
              </div>
            )}

            {/* 書き起こしテキスト */}
            <div className="space-y-2">
              <Label htmlFor="transcription">書き起こしテキスト（Proud PINから）</Label>
              <Textarea
                id="transcription"
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                placeholder="Proud PINで録音した音声の書き起こしテキストを貼り付けてください"
                rows={6}
              />
            </div>

            {/* AI要約 */}
            <div className="space-y-2">
              <Label htmlFor="summary">AI要約（Proud PINから）</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Proud PINのAI要約を貼り付けてください"
                rows={4}
              />
            </div>

            {/* スタッフメモ */}
            <div className="space-y-2">
              <Label htmlFor="notes">スタッフメモ</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="追加のメモや所見を入力してください"
                rows={4}
              />
            </div>

            {/* タグ */}
            <div className="space-y-2">
              <Label htmlFor="tags">タグ（カンマ区切り）</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="例: 腰痛, 肩こり, 骨盤矯正"
              />
              <p className="text-sm text-muted-foreground">
                症状や施術内容をタグで登録すると検索しやすくなります
              </p>
            </div>

            {/* 送信ボタン */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? "更新する" : "登録する"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/medical-records")}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
