import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, ArrowLeft, Lock, Printer, User, Stethoscope, HeartPulse, MoreHorizontal } from "lucide-react";

function parseJson(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 pt-0.5 leading-relaxed">{label}</span>
      <span className="text-sm text-gray-800 leading-relaxed">{value}</span>
    </div>
  );
}

function TagList({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 pt-0.5 leading-relaxed">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-100">{v}</Badge>
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
  accentColor = "blue",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accentColor?: "blue" | "green" | "purple" | "orange";
}) {
  const colorMap: Record<string, string> = {
    blue: "border-l-blue-400 bg-blue-50/30",
    green: "border-l-green-400 bg-green-50/30",
    purple: "border-l-purple-400 bg-purple-50/30",
    orange: "border-l-orange-400 bg-orange-50/30",
  };
  const iconColorMap: Record<string, string> = {
    blue: "text-blue-500",
    green: "text-green-500",
    purple: "text-purple-500",
    orange: "text-orange-500",
  };
  return (
    <Card className={`mb-4 border-l-4 ${colorMap[accentColor]} shadow-sm`}>
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span className={iconColorMap[accentColor]}>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-0">{children}</CardContent>
    </Card>
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

  const date = new Date(detail.createdAt).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 print:bg-white print:py-2">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-5 print:hidden">
          <Link href="/questionnaire-list">
            <Button variant="ghost" size="sm" className="gap-1 text-gray-600">
              <ArrowLeft size={16} />
              一覧に戻る
            </Button>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <ClipboardList className="text-blue-500" size={20} />
            <h1 className="text-base font-bold text-gray-900">問診票詳細</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5 text-gray-600 print:hidden"
            onClick={() => window.print()}
          >
            <Printer size={14} />
            印刷
          </Button>
        </div>

        {/* 印刷用タイトル */}
        <div className="hidden print:block mb-4 text-center">
          <h1 className="text-xl font-bold text-gray-900">問診票</h1>
          <p className="text-sm text-gray-500 mt-1">提出日時：{date}</p>
        </div>

        {/* サマリーバー */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-5 shadow-sm flex flex-wrap gap-x-6 gap-y-2 items-center">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">お名前</p>
            <p className="text-base font-bold text-gray-900">
              {detail.patientName || "—"}
              {detail.patientNameKana && (
                <span className="text-xs font-normal text-gray-500 ml-2">（{detail.patientNameKana}）</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">電話番号</p>
            <p className="text-sm font-medium text-gray-800">{detail.phoneNumber || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">提出日時</p>
            <p className="text-sm text-gray-600">{date}</p>
          </div>
        </div>

        {/* 基本情報 */}
        <SectionCard title="基本情報" icon={<User size={15} />} accentColor="blue">
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
        </SectionCard>

        {/* 症状・お悩み */}
        <SectionCard title="症状・お悩み" icon={<Stethoscope size={15} />} accentColor="green">
          <DetailRow label="解決したいこと" value={detail.mainConcern} />
          <TagList label="気になる症状" values={parseJson(detail.symptoms)} />
          <DetailRow label="症状（その他）" value={detail.symptomsOther} />
          <DetailRow label="症状メモ" value={detail.symptomsMemo} />
          <TagList label="不自由なこと" values={parseJson(detail.inconveniences)} />
          <DetailRow label="不自由（その他）" value={detail.inconveniencesOther} />
          <DetailRow label="不自由メモ" value={detail.inconveniencesMemo} />
          <DetailRow label="症状への考え方" value={detail.attitude} />
        </SectionCard>

        {/* 施術・既往歴 */}
        <SectionCard title="施術・既往歴" icon={<HeartPulse size={15} />} accentColor="purple">
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
        </SectionCard>

        {/* その他 */}
        <SectionCard title="その他" icon={<MoreHorizontal size={15} />} accentColor="orange">
          <DetailRow label="SNS投稿" value={detail.snsPermission} />
          <TagList label="通いやすい曜日" values={parseJson(detail.preferredDays)} />
          <TagList label="通いやすい時間" values={parseJson(detail.preferredTimes)} />
        </SectionCard>
      </div>
    </div>
  );
}
