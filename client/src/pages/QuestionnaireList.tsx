import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList, ChevronRight, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function parseJson(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 col-span-1">{label}</span>
      <span className="text-sm text-gray-800 col-span-2">{value}</span>
    </div>
  );
}

function TagList({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 col-span-1">{label}</span>
      <div className="col-span-2 flex flex-wrap gap-1">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
        ))}
      </div>
    </div>
  );
}

export default function QuestionnaireList() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: list, isLoading } = trpc.questionnaire.list.useQuery(
    { limit: 100, offset: 0 },
    { enabled: !!user }
  );

  const { data: detail } = trpc.questionnaire.getById.useQuery(
    { id: selectedId! },
    { enabled: selectedId !== null }
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">ログインが必要です</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft size={16} />
              戻る
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList className="text-blue-500" size={24} />
            <h1 className="text-xl font-bold text-gray-900">問診票一覧</h1>
          </div>
          <Badge variant="outline" className="ml-auto">{list?.length ?? 0}件</Badge>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : !list?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              <ClipboardList size={48} className="mx-auto mb-3 opacity-30" />
              <p>問診票の回答がまだありません</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {list.map((q) => {
              const symptoms = parseJson(q.symptoms);
              const inconveniences = parseJson(q.inconveniences);
              const date = new Date(q.createdAt).toLocaleDateString("ja-JP", {
                year: "numeric", month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit",
              });
              return (
                <Card
                  key={q.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedId(q.id)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400">{date}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {q.patientName && (
                            <p className="text-sm font-semibold text-gray-900 truncate">{q.patientName}</p>
                          )}
                          {q.patientNameKana && (
                            <p className="text-xs text-gray-400 truncate">({q.patientNameKana})</p>
                          )}
                        </div>
                        {q.phoneNumber && (
                          <p className="text-xs text-gray-500 mt-0.5">☎️ {q.phoneNumber}</p>
                        )}
                        {q.mainConcern && (
                          <p className="text-sm text-gray-700 mt-0.5 truncate">{q.mainConcern}</p>
                        )}
                        {parseJson(q.referralSource).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {parseJson(q.referralSource).map((s) => (
                              <Badge key={s} variant="outline" className="text-xs px-1.5 py-0 border-blue-200 text-blue-600">{s}</Badge>
                            ))}
                          </div>
                        )}
                        {symptoms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {symptoms.slice(0, 3).map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs px-1.5 py-0">{s}</Badge>
                            ))}
                            {symptoms.length > 3 && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">+{symptoms.length - 3}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 詳細ダイアログ */}
        <Dialog open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>問診票詳細</DialogTitle>
            </DialogHeader>
            {detail ? (
              <div className="space-y-1 text-sm">
                <p className="text-xs text-gray-400 mb-3">
                  受付日時：{new Date(detail.createdAt).toLocaleString("ja-JP")}
                </p>
                <DetailRow label="解決したいこと" value={detail.mainConcern} />
                <TagList label="気になる症状" values={parseJson(detail.symptoms)} />
                <DetailRow label="症状（その他）" value={detail.symptomsOther} />
                <DetailRow label="症状メモ" value={detail.symptomsMemo} />
                <TagList label="不自由なこと" values={parseJson(detail.inconveniences)} />
                <DetailRow label="不自由（その他）" value={detail.inconveniencesOther} />
                <DetailRow label="不自由メモ" value={detail.inconveniencesMemo} />
                <DetailRow label="症状への考え方" value={detail.attitude} />
                <TagList label="施術希望" values={parseJson(detail.treatmentPrefs)} />
                <DetailRow label="過去の病気" value={detail.pastIllness} />
                <DetailRow label="過去のケガ" value={detail.pastInjury} />
                <DetailRow label="過去（その他）" value={detail.pastOther} />
                <TagList label="過去の通院" values={parseJson(detail.pastClinic)} />
                <DetailRow label="通院（その他）" value={detail.pastClinicOther} />
                <DetailRow label="妊娠状況" value={detail.pregnancyStatus} />
                {detail.pregnancyMonths != null && (
                  <DetailRow label="産後" value={`${detail.pregnancyMonths}ヶ月目`} />
                )}
                <DetailRow label="SNS投稿" value={detail.snsPermission} />
                <TagList label="通いやすい曜日" values={parseJson(detail.preferredDays)} />
                <TagList label="通いやすい時間" values={parseJson(detail.preferredTimes)} />
                <TagList label="来店きっかけ" values={parseJson(detail.referralSource)} />
                <DetailRow label="ご紹介者名" value={detail.referralName} />
                <DetailRow label="その他詳細" value={detail.referralOther} />
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
