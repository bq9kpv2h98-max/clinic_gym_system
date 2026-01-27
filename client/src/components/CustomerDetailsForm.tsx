import { Control, UseFormSetValue } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CustomerDetailsFormProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watchPregnancyStatus?: string;
}

export function CustomerDetailsForm({ control, setValue, watchPregnancyStatus }: CustomerDetailsFormProps) {
  // 症状の選択肢
  const symptomOptions = [
    { value: "private_life", label: "私生活に支障が出る" },
    { value: "work", label: "仕事に支障が出る" },
    { value: "housework", label: "家事に支障が出る" },
    { value: "family", label: "家族、子供に迷惑がかかる" },
    { value: "hobby", label: "趣味が続けられない" },
    { value: "stress", label: "ストレスがたまる" },
    { value: "sports", label: "スポーツができない" },
  ];

  // 考え方の選択肢
  const approachOptions = [
    { value: "staff", label: "スタッフに任せる" },
    { value: "slow", label: "焦らずゆっくり改善していきたい" },
    { value: "fast", label: "このキツさをなんとかしたいので少しでも早く改善したい" },
    { value: "custom", label: "どこに行ってもよくならなかったので自分に合った改善する施術を受けたい" },
    { value: "quality", label: "今の症状が取れたら体質改善して痛みの出にくい身体にしたい" },
  ];

  // 施術希望の選択肢
  const treatmentOptions = [
    { value: "check_body", label: "身体の歪みをみてほしい" },
    { value: "explain", label: "身体の状態を詳しく教えてほしい" },
    { value: "self_care", label: "自分に合うセルフケアを教えてほしい" },
    { value: "training_yes", label: "トレーニングをしたい" },
    { value: "training_no", label: "トレーニングはしたくない" },
    { value: "no_correction", label: "矯正はしてほしくない" },
  ];

  // 病歴の選択肢
  const medicalHistoryOptions = [
    { value: "none", label: "特になし" },
    { value: "illness", label: "病気" },
    { value: "injury", label: "ケガ" },
    { value: "other", label: "その他" },
  ];

  // 通院歴の選択肢
  const visitHistoryOptions = [
    { value: "none", label: "特になし" },
    { value: "seikotsuin", label: "整骨院" },
    { value: "acupuncture", label: "鍼灸院" },
    { value: "massage", label: "マッサージ" },
    { value: "chiro", label: "カイロ" },
    { value: "orthopedic", label: "整形外科" },
    { value: "internal", label: "内科" },
    { value: "psychosomatic", label: "心療内科" },
    { value: "personal_gym", label: "パーソナルジム" },
    { value: "24h_gym", label: "24時間ジム" },
    { value: "curves", label: "カーブス" },
    { value: "other", label: "その他" },
  ];

  // 妊娠の選択肢
  const pregnancyOptions = [
    { value: "no", label: "していない" },
    { value: "pregnant", label: "現在妊娠している" },
    { value: "possible", label: "妊娠の可能性がある" },
    { value: "trying", label: "妊活中である" },
    { value: "postpartum", label: "最近出産した" },
  ];

  // 画像投稿の選択肢
  const imageConsentOptions = [
    { value: "yes", label: "可" },
    { value: "mosaic", label: "顔モザイクありで可" },
    { value: "no", label: "不可" },
  ];

  // 曜日の選択肢
  const dayOptions = [
    { value: "mon", label: "月" },
    { value: "tue", label: "火" },
    { value: "wed", label: "水" },
    { value: "thu", label: "木" },
    { value: "fri", label: "金" },
    { value: "sat", label: "土" },
    { value: "sun", label: "日" },
    { value: "holiday", label: "祝" },
    { value: "flexible", label: "調整できる" },
  ];

  // 時間帯の選択肢
  const timeOptions = [
    { value: "morning", label: "午前中" },
    { value: "noon", label: "お昼前後" },
    { value: "afternoon", label: "午後" },
    { value: "anytime", label: "何時でも大丈夫" },
  ];

  return (
    <div className="space-y-6">
      {/* 今の症状（お悩み） */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">今の症状（お悩み）が続くことで、不自由なことはありますか？（複数回答可）</Label>
        <div className="space-y-2">
          {symptomOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`symptom-${option.value}`}
                onCheckedChange={(checked) => {
                  // チェックボックスの状態を管理
                  const currentValue = control._formValues.symptoms || [];
                  if (checked) {
                    setValue("symptoms", [...currentValue, option.value]);
                  } else {
                    setValue("symptoms", currentValue.filter((v: string) => v !== option.value));
                  }
                }}
              />
              <label htmlFor={`symptom-${option.value}`} className="text-sm cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 今の症状に対しての考え方 */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">今の症状に対しての考え方はどれですか？※あなたに合わせた最適な施術プランをご提案します。</Label>
        <RadioGroup onValueChange={(value) => setValue("approach", value)}>
          {approachOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`approach-${option.value}`} />
              <label htmlFor={`approach-${option.value}`} className="text-sm cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* 施術に関してのご希望 */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">施術に関してご希望があればチェックしてください</Label>
        <div className="space-y-2">
          {treatmentOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`treatment-${option.value}`}
                onCheckedChange={(checked) => {
                  const currentValue = control._formValues.treatmentPreferences || [];
                  if (checked) {
                    setValue("treatmentPreferences", [...currentValue, option.value]);
                  } else {
                    setValue("treatmentPreferences", currentValue.filter((v: string) => v !== option.value));
                  }
                }}
              />
              <label htmlFor={`treatment-${option.value}`} className="text-sm cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 過去にあった病気やケガ */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">過去にあった病気やケガを教えてください</Label>
        <div className="space-y-2">
          {medicalHistoryOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`medical-${option.value}`}
                onCheckedChange={(checked) => {
                  const currentValue = control._formValues.medicalHistory || [];
                  if (checked) {
                    setValue("medicalHistory", [...currentValue, option.value]);
                  } else {
                    setValue("medicalHistory", currentValue.filter((v: string) => v !== option.value));
                  }
                }}
              />
              <label htmlFor={`medical-${option.value}`} className="text-sm cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 過去（または現在）通院されているところ */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">過去（または現在）通院されているところはありますか？</Label>
        <div className="space-y-2">
          {visitHistoryOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`visit-${option.value}`}
                onCheckedChange={(checked) => {
                  const currentValue = control._formValues.visitHistory || [];
                  if (checked) {
                    setValue("visitHistory", [...currentValue, option.value]);
                  } else {
                    setValue("visitHistory", currentValue.filter((v: string) => v !== option.value));
                  }
                }}
              />
              <label htmlFor={`visit-${option.value}`} className="text-sm cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 【女性限定質問】妊娠されていますか？ */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">【女性限定質問】妊娠されていますか？</Label>
        <RadioGroup onValueChange={(value) => setValue("pregnancyStatus", value)}>
          {pregnancyOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`pregnancy-${option.value}`} />
              <label htmlFor={`pregnancy-${option.value}`} className="text-sm cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* 自社HP・SNSへ画像投稿は可能でしょうか？ */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">自社HP・SNSへ画像投稿は可能でしょうか？</Label>
        <p className="text-sm text-muted-foreground">仮に投稿後にやめてほしいと感じられた場合はすぐに削除させていただきます。</p>
        <RadioGroup onValueChange={(value) => setValue("imageConsent", value)}>
          {imageConsentOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`image-${option.value}`} />
              <label htmlFor={`image-${option.value}`} className="text-sm cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* 通いやすい曜日と時間を教えてください */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">通いやすい曜日と時間を教えてください。</Label>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">曜日</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {dayOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${option.value}`}
                    onCheckedChange={(checked) => {
                      const currentValue = control._formValues.preferredDays || [];
                      if (checked) {
                        setValue("preferredDays", [...currentValue, option.value]);
                      } else {
                        setValue("preferredDays", currentValue.filter((v: string) => v !== option.value));
                      }
                    }}
                  />
                  <label htmlFor={`day-${option.value}`} className="text-sm cursor-pointer">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">時間帯</Label>
            <div className="space-y-2 mt-2">
              {timeOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`time-${option.value}`}
                    onCheckedChange={(checked) => {
                      const currentValue = control._formValues.preferredTimes || [];
                      if (checked) {
                        setValue("preferredTimes", [...currentValue, option.value]);
                      } else {
                        setValue("preferredTimes", currentValue.filter((v: string) => v !== option.value));
                      }
                    }}
                  />
                  <label htmlFor={`time-${option.value}`} className="text-sm cursor-pointer">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
