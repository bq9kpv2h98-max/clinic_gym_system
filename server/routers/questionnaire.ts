import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { questionnaires } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

const submitInput = z.object({
  patientName: z.string().optional(),
  patientNameKana: z.string().optional(),
  phoneNumber: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  email: z.string().optional(),
  occupation: z.string().optional(),
  mainConcern: z.string().optional(),
  symptoms: z.string().optional(), // JSON
  symptomsOther: z.string().optional(),
  symptomsMemo: z.string().optional(),
  inconveniences: z.string().optional(), // JSON
  inconveniencesOther: z.string().optional(),
  inconveniencesMemo: z.string().optional(),
  attitude: z.string().optional(),
  treatmentPrefs: z.string().optional(), // JSON
  pastIllness: z.string().optional(),
  pastInjury: z.string().optional(),
  pastOther: z.string().optional(),
  pastClinic: z.string().optional(), // JSON
  pastClinicOther: z.string().optional(),
  pregnancyStatus: z.string().optional(),
  pregnancyMonths: z.number().optional(),
  snsPermission: z.string().optional(),
  preferredDays: z.string().optional(), // JSON
  preferredTimes: z.string().optional(), // JSON
  referralSource: z.string().optional(), // JSON
  referralName: z.string().optional(),
  referralOther: z.string().optional(),
});

export const questionnaireRouter = router({
  // 問診票を送信（公開エンドポイント）
  submit: publicProcedure
    .input(submitInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB connection failed");
      // LINE通知を送信
      try {
        const name = input.patientName || "（未入力）";
        const kana = input.patientNameKana ? `（${input.patientNameKana}）` : "";
        const phone = input.phoneNumber || "未入力";
        const referral = (() => {
          try { return (JSON.parse(input.referralSource || "[]") as string[]).join("・"); } catch { return "未入力"; }
        })();
        const concern = input.mainConcern || "未入力";
        await notifyOwner({
          title: `📋 新しい問診票が届きました`,
          content: `お名前：${name}${kana}\n電話番号：${phone}\n来店きっかけ：${referral}\nご相談内容：${concern}`,
        });
      } catch (e) {
        console.error("[Questionnaire] LINE通知エラー:", e);
      }

      await db.insert(questionnaires).values({
        patientName: input.patientName,
        patientNameKana: input.patientNameKana,
        phoneNumber: input.phoneNumber,
        birthDate: input.birthDate,
        address: input.address,
        email: input.email,
        occupation: input.occupation,
        mainConcern: input.mainConcern,
        symptoms: input.symptoms,
        symptomsOther: input.symptomsOther,
        symptomsMemo: input.symptomsMemo,
        inconveniences: input.inconveniences,
        inconveniencesOther: input.inconveniencesOther,
        inconveniencesMemo: input.inconveniencesMemo,
        attitude: input.attitude,
        treatmentPrefs: input.treatmentPrefs,
        pastIllness: input.pastIllness,
        pastInjury: input.pastInjury,
        pastOther: input.pastOther,
        pastClinic: input.pastClinic,
        pastClinicOther: input.pastClinicOther,
        pregnancyStatus: input.pregnancyStatus,
        pregnancyMonths: input.pregnancyMonths,
        snsPermission: input.snsPermission,
        preferredDays: input.preferredDays,
        preferredTimes: input.preferredTimes,
        referralSource: input.referralSource,
        referralName: input.referralName,
        referralOther: input.referralOther,
      });
      return { success: true };
    }),

  // 問診票一覧を取得（管理者用）
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB connection failed");
      const rows = await db
        .select()
        .from(questionnaires)
        .orderBy(desc(questionnaires.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return rows;
    }),

  // 特定の問診票を取得（管理者用）
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB connection failed");
      const rows = await db
        .select()
        .from(questionnaires)
        .where(eq(questionnaires.id, input.id))
        .limit(1);
      return rows[0] ?? null;
    }),
});
