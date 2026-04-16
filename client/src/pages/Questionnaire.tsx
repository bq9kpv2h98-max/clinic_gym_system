import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

// ---- 選択肢定義 ----
const SYMPTOM_OPTIONS = [
  "頭痛", "不眠", "めまい", "眼精疲労",
  "姿勢", "腱鞘炎", "神経痛", "自律神経",
  "貧血", "生理痛", "スポーツ障害",
  "冷え性", "むくみ", "便秘", "更年期障害",
  "脂肪", "運動不足", "ダイエット",
  "筋力アップ", "パフォーマンスアップ",
];

const INCONVENIENCE_OPTIONS = [
  "私生活に支障が出る", "仕事に支障が出る", "家事に支障が出る", "家族、子供に迷惑がかかる",
  "趣味が続けられない", "ストレスがたまる", "スポーツができない",
];

const ATTITUDE_OPTIONS = [
  "スタッフに任せる",
  "焦らずゆっくり改善していきたい",
  "この辛さをなんとかしたいので少しでも早く改善したい",
  "どこに行ってもよくならなかったので自分に合った改善する施術を受けたい",
  "今の症状が取れたら体質改善して痛みの出にくい身体にしたい",
];

const TREATMENT_PREF_OPTIONS = [
  "身体の歪みをみてほしい", "身体の状態を詳しく教えてほしい", "自分に合うセルフケアを教えてほしい",
  "トレーニングをしたい", "トレーニングはしたくない", "矯正はしてほしくない",
];

const PAST_CLINIC_OPTIONS = [
  "整骨院", "鍼灸院", "マッサージ", "カイロ", "整形外科", "内科", "心療内科",
  "パーソナルジム", "24時間ジム", "カーブス",
];

const PREGNANCY_OPTIONS = [
  "していない", "現在妊娠している", "妊娠の可能性がある", "妊活中である", "最近出産した",
];

const SNS_OPTIONS = ["可", "顔モザイクありで可", "不可"];

const DAY_OPTIONS = ["月", "火", "水", "木", "金", "土", "日", "祝", "調整できる"];
const TIME_OPTIONS = ["午前中", "お昼前後", "午後", "何時でも大丈夫"];

const REFERRAL_OPTIONS = [
  "ご紹介", "ホームページ", "インスタグラム", "その他SNS",
  "Googleマップ", "通りすがり", "チラシ", "AI検索", "その他",
];

// ---- ヘルパーコンポーネント ----
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-gray-800 border-l-4 border-blue-500 pl-3 mb-3">
      {children}
    </h2>
  );
}

function CheckboxGroup({
  options, selected, onChange, cols = 2,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  cols?: number;
}) {
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((v) => v !== opt) : [...selected, opt]);
  };
  return (
    <div className={`grid grid-cols-${cols} gap-2`}>
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox
            checked={selected.includes(opt)}
            onCheckedChange={() => toggle(opt)}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

// ---- メインコンポーネント ----
export default function Questionnaire() {
  const [submitted, setSubmitted] = useState(false);

  // フォーム状態 - 基本情報
  const [patientName, setPatientName] = useState("");
  const [patientNameKana, setPatientNameKana] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [occupation, setOccupation] = useState("");
  const [mainConcern, setMainConcern] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomsOther, setSymptomsOther] = useState("");
  const [symptomsMemo, setSymptomsMemo] = useState("");
  const [inconveniences, setInconveniences] = useState<string[]>([]);
  const [inconveniencesOther, setInconveniencesOther] = useState("");
  const [inconveniencesMemo, setInconveniencesMemo] = useState("");
  const [attitude, setAttitude] = useState("");
  const [treatmentPrefs, setTreatmentPrefs] = useState<string[]>([]);
  const [pastIllness, setPastIllness] = useState("");
  const [pastInjury, setPastInjury] = useState("");
  const [pastOther, setPastOther] = useState("");
  const [noPastHistory, setNoPastHistory] = useState(false);
  const [pastClinic, setPastClinic] = useState<string[]>([]);
  const [pastClinicOther, setPastClinicOther] = useState("");
  const [noPastClinic, setNoPastClinic] = useState(false);
  const [pregnancyStatus, setPregnancyStatus] = useState("");
  const [pregnancyMonths, setPregnancyMonths] = useState("");
  const [snsPermission, setSnsPermission] = useState("");
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [referralSource, setReferralSource] = useState<string[]>([]);
  const [referralName, setReferralName] = useState("");
  const [referralOther, setReferralOther] = useState("");

  const submitMutation = trpc.questionnaire.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(`送信エラー: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate({
      patientName,
      patientNameKana,
      phoneNumber,
      birthDate,
      address,
      email,
      occupation,
      mainConcern,
      symptoms: JSON.stringify(symptoms),
      symptomsOther,
      symptomsMemo,
      inconveniences: JSON.stringify(inconveniences),
      inconveniencesOther,
      inconveniencesMemo,
      attitude,
      treatmentPrefs: JSON.stringify(treatmentPrefs),
      pastIllness: noPastHistory ? "特になし" : pastIllness,
      pastInjury: noPastHistory ? "" : pastInjury,
      pastOther: noPastHistory ? "" : pastOther,
      pastClinic: noPastClinic ? JSON.stringify(["特になし"]) : JSON.stringify(pastClinic),
      pastClinicOther: noPastClinic ? "" : pastClinicOther,
      pregnancyStatus,
      pregnancyMonths: pregnancyMonths ? parseInt(pregnancyMonths) : undefined,
      snsPermission,
      preferredDays: JSON.stringify(preferredDays),
      preferredTimes: JSON.stringify(preferredTimes),
      referralSource: JSON.stringify(referralSource),
      referralName,
      referralOther,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle2 className="mx-auto mb-4 text-green-500" size={64} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ご記入ありがとうございます</h2>
          <p className="text-gray-600 text-sm">
            問診票を受け付けました。<br />
            スタッフがご確認の上、施術に活かさせていただきます。
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">問診票</h1>
          <p className="text-sm text-gray-500 mt-1">初診の方はご記入をお願いいたします</p>
        </div>

        {/* ご挨拶 */}
        <Card className="mb-4">
          <CardContent className="pt-4 text-sm text-gray-700 leading-relaxed">
            <p className="font-semibold mb-1">【ご挨拶】</p>
            この度は数ある店舗の中から当院にお越しいただき、誠にありがとうございます。
            スタッフ一同、日々知識・技術などのアップデートをし続けております。
            必ず、来院目的達成のため、120％の施術で対応させていただきますので、ぜひお身体をお任せください。
            <br /><br />
            ※保険での施術は中止しておりますので、保険使用を希望される場合は事前にお伝えください。
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* 基本情報 */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionTitle>基本情報</SectionTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium mb-1 block">お名前 <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="山田 太郎"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">フリガナ</Label>
                  <Input
                    placeholder="ヤマダ タロウ"
                    value={patientNameKana}
                    onChange={(e) => setPatientNameKana(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium mb-1 block">電話番号</Label>
                  <Input
                    placeholder="090-0000-0000"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">生年月日</Label>
                  <Input
                    placeholder="1990/01/01"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">ご住所</Label>
                <Input
                  placeholder="東京都渋谷区..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium mb-1 block">メールアドレス</Label>
                  <Input
                    placeholder="example@email.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">ご職業</Label>
                  <Input
                    placeholder="会社員、主婦 など"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 解決したいこと */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionTitle>今回、当院で解決したいこと</SectionTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Textarea
                placeholder="例：腰痛を改善したい、体型を整えたい など"
                value={mainConcern}
                onChange={(e) => setMainConcern(e.target.value)}
                rows={2}
              />
            </CardContent>
          </Card>

          {/* 気になる症状 */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionTitle>どこが気になりますか？どのような症状でしょうか？（複数回答可）</SectionTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <CheckboxGroup options={SYMPTOM_OPTIONS} selected={symptoms} onChange={setSymptoms} cols={2} />
              <div className="flex items-center gap-2 mt-1">
                <Label className="text-sm whitespace-nowrap">その他：</Label>
                <Input
                  placeholder="その他の症状"
                  value={symptomsOther}
                  onChange={(e) => setSymptomsOther(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-sm">MEMO</Label>
                <Textarea
                  placeholder="補足があればご記入ください"
                  value={symptomsMemo}
                  onChange={(e) => setSymptomsMemo(e.target.value)}
                  rows={2}
                  className="mt-1 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* 不自由なこと */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionTitle>今の症状が続くことで、不自由なことはありますか？（複数回答可）</SectionTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <CheckboxGroup options={INCONVENIENCE_OPTIONS} selected={inconveniences} onChange={setInconveniences} cols={1} />
              <div className="flex items-center gap-2 mt-1">
                <Label className="text-sm whitespace-nowrap">その他：</Label>
                <Input
                  placeholder="その他"
                  value={inconveniencesOther}
                  onChange={(e) => setInconveniencesOther(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-sm">MEMO</Label>
                <Textarea
                  placeholder="補足があればご記入ください"
                  value={inconveniencesMemo}
                  onChange={(e) => setInconveniencesMemo(e.target.value)}
                  rows={2}
                  className="mt-1 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* 症状への考え方 */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionTitle>今の症状に対しての考え方はどれですか？</SectionTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-gray-500 mb-2">※あなたに合わせた最適な施術プランをご提案します</p>
              <RadioGroup value={attitude} onValueChange={setAttitude} className="space-y-2">
                {ATTITUDE_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-start gap-2 cursor-pointer text-sm">
                    <RadioGroupItem value={opt} className="mt-0.5" />
                    <span>{opt}</span>
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 施術希望 */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionTitle>施術に関してご希望があればチェックしてください</SectionTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <p className="text-xs text-gray-500">※ヒアリングしたうえで、症状改善のためにご提案させていただく場合があります</p>
              <CheckboxGroup options={TREATMENT_PREF_OPTIONS} selected={treatmentPrefs} onChange={setTreatmentPrefs} cols={1} />
            </CardContent>
          </Card>

          {/* 過去の病気・ケガ */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionTitle>過去にあった病気やケガを教えてください</SectionTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={noPastHistory}
                  onCheckedChange={(v) => setNoPastHistory(!!v)}
                />
                特になし
              </label>
              {!noPastHistory && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap w-16">病気：</Label>
                    <Input placeholder="例：高血圧、糖尿病 など" value={pastIllness} onChange={(e) => setPastIllness(e.target.value)} className="text-sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap w-16">ケガ：</Label>
                    <Input placeholder="例：腰椎ヘルニア、骨折 など" value={pastInjury} onChange={(e) => setPastInjury(e.target.value)} className="text-sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap w-16">その他：</Label>
                    <Input placeholder="その他" value={pastOther} onChange={(e) => setPastOther(e.target.value)} className="text-sm" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 過去の通院 */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionTitle>過去（または現在）通院されているところはありますか？</SectionTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={noPastClinic}
                  onCheckedChange={(v) => setNoPastClinic(!!v)}
                />
                特になし
              </label>
              {!noPastClinic && (
                <>
                  <CheckboxGroup options={PAST_CLINIC_OPTIONS} selected={pastClinic} onChange={setPastClinic} cols={2} />
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">その他：</Label>
                    <Input placeholder="その他" value={pastClinicOther} onChange={(e) => setPastClinicOther(e.target.value)} className="text-sm" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 女性限定 */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionTitle>【女性限定】妊娠されていますか？</SectionTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <RadioGroup value={pregnancyStatus} onValueChange={setPregnancyStatus} className="space-y-2">
                {PREGNANCY_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                    <RadioGroupItem value={opt} />
                    {opt}
                    {opt === "最近出産した" && pregnancyStatus === "最近出産した" && (
                      <span className="flex items-center gap-1 ml-2">
                        産後
                        <Input
                          type="number"
                          min={0}
                          max={24}
                          className="w-16 h-7 text-sm px-2"
                          value={pregnancyMonths}
                          onChange={(e) => setPregnancyMonths(e.target.value)}
                        />
                        ヶ月目
                      </span>
                    )}
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* SNS */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionTitle>自社HP・SNSへの画像投稿は可能でしょうか？</SectionTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-gray-500 mb-2">仮に投稿後にやめてほしいと感じられた場合はすぐに削除させていただきます</p>
              <RadioGroup value={snsPermission} onValueChange={setSnsPermission} className="flex gap-6">
                {SNS_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                    <RadioGroupItem value={opt} />
                    {opt}
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 通いやすい曜日・時間 */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionTitle>通いやすい曜日と時間を教えてください</SectionTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div>
                <Label className="text-sm font-medium mb-2 block">曜日</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => (
                    <label key={day} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <Checkbox
                        checked={preferredDays.includes(day)}
                        onCheckedChange={() => {
                          setPreferredDays(prev =>
                            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                          );
                        }}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">時間帯</Label>
                <div className="flex flex-wrap gap-3">
                  {TIME_OPTIONS.map((time) => (
                    <label key={time} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <Checkbox
                        checked={preferredTimes.includes(time)}
                        onCheckedChange={() => {
                          setPreferredTimes(prev =>
                            prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
                          );
                        }}
                      />
                      {time}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">※現在は日祝を定休日としております</p>
              </div>
            </CardContent>
          </Card>

          {/* ご来店きっかけ */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionTitle>ご来店のきっかけを教えてください</SectionTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <CheckboxGroup options={REFERRAL_OPTIONS} selected={referralSource} onChange={setReferralSource} cols={2} />
              {referralSource.includes("ご紹介") && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">ご紹介者名：</Label>
                  <Input placeholder="〇〇 様" value={referralName} onChange={(e) => setReferralName(e.target.value)} className="text-sm" />
                </div>
              )}
              {(referralSource.includes("その他SNS") || referralSource.includes("AI検索") || referralSource.includes("その他")) && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">詳細：</Label>
                  <Input placeholder="詳細をご記入ください" value={referralOther} onChange={(e) => setReferralOther(e.target.value)} className="text-sm" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 送信ボタン */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-bold"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? "送信中..." : "問診票を送信する"}
          </Button>
        </form>
      </div>
    </div>
  );
}
