import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, ArrowLeft, Lock } from "lucide-react";

function parseJson(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 col-span-1 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 col-span-2">{value}</span>
    </div>
  );
}

function TagList({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 col-span-1 pt-0.5">{label}</span>
      <div className="col-span-2 flex flex-wrap gap-1">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
        ))}
      </div>
    </div>
  );
}

export default function QuestionnaireDetail() {
  const { id } = useParams<{ id: string }>();
  const numId = parseInt(id ?? "", 10);
  const { user, loading: authLoading } = useAuth();

  const { data: detail, isLoading } = trpc.questionnaire.getById.useQuery(
    { id: numId },
    { enabled: !!user && !isNaN(numId) }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 px-4">
        <Lock size={48} className="text-gray-300" />
        <p className="text-gray-600 font-medium">この問診票を閲覧するにはログインが必要です</p>
        <a
          href={`/api/oauth/login?redirect=${encodeURIComponent(window.location.pathname)}`}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          ログインして確認する
        </a>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-gray-500">問診票が見つかりませんでした</p>
        <Link href="/questionnaire-list">
          <Button variant="outline" size="sm">一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  const date = new Date(detail.createdAt).toLocaleString("ja-JP");

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/questionnaire-list">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft size={16} />
              一覧に戻る
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList className="text-blue-500" size={22} />
            <h1 className="text-lg font-bold text-gray-900">問診票詳細</h1>
          </div>
          <span className="ml-auto text-xs text-gray-400">{date}</span>
        </div>

        {/* 基本情報 */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0">
            <DetailRow label="お名前" value={detail.patientName} />
            <DetailRow label="フリガナ" value={detail.patientNameKana} />
            <DetailRow label="電話番号" value={detail.phoneNumber} />
            <DetailRow label="生年月日" value={detail.birthDate} />
            <DetailRow label="ご住所" value={detail.address} />
            <DetailRow label="メールアドレス" value={detail.email} />
            <DetailRow label="ご職業" value={detail.occupation} />
            <TagList label="来店きっかけ" values={parseJson(detail.referralSource)} />
            <DetailRow label="ご紹介者名" value={detail.referralName} />
            <DetailRow label="その他詳細" value={detail.referralOther} />
          </CardContent>
        </Card>

        {/* 症状・お悩み */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700">症状・お悩み</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0">
            <DetailRow label="解決したいこと" value={detail.mainConcern} />
            <TagList label="気になる症状" values={parseJson(detail.symptoms)} />
            <DetailRow label="症状（その他）" value={detail.symptomsOther} />
            <DetailRow label="症状メモ" value={detail.symptomsMemo} />
            <TagList label="不自由なこと" values={parseJson(detail.inconveniences)} />
            <DetailRow label="不自由（その他）" value={detail.inconveniencesOther} />
            <DetailRow label="不自由メモ" value={detail.inconveniencesMemo} />
            <DetailRow label="症状への考え方" value={detail.attitude} />
          </CardContent>
        </Card>

        {/* 施術・既往歴 */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700">施術・既往歴</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0">
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
          </CardContent>
        </Card>

        {/* その他 */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700">その他</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0">
            <DetailRow label="SNS投稿" value={detail.snsPermission} />
            <TagList label="通いやすい曜日" values={parseJson(detail.preferredDays)} />
            <TagList label="通いやすい時間" values={parseJson(detail.preferredTimes)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
