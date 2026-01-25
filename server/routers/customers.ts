import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customers, visits, pointTransactions } from "../../drizzle/schema";
import { z } from "zod";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import { storagePut } from "../storage";
import { eq } from "drizzle-orm";
import { saveCustomerRegistrationToSheets, saveVisitToSheets, updateMonthlySummaryInSheets } from "../_core/googleSheets";
import { createNotionCustomer, searchNotionCustomerByPhone, updateNotionCustomer } from "../notion";

// QRコード生成用の秘密鍵
const QR_SECRET_KEY = process.env.QR_SECRET_KEY || "default-secret-key";

/**
 * 顧客登録スキーマ
 */
const createCustomerSchema = z.object({
  fullName: z.string().min(1, "名前は必須です"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "生年月日はYYYY-MM-DD形式です"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  phone: z.string().regex(/^\d{10,11}$/, "電話番号10-11文字です"),
  email: z.string().email("有効なメールアドレスを入力してください").optional(),
  postalCode: z.string().min(7, "郵一番号は7文字です"),
  prefecture: z.string().min(1, "都道府県は必須です"),
  city: z.string().min(1, "市区町村は必須です"),
  addressLine1: z.string().min(1, "住所は必須です"),
  addressLine2: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  // New customer fields
  isNewCustomer: z.boolean().optional(),
  howDidYouKnow: z.string().optional(),
  concerns: z.string().optional(),
  medicalHistory: z.string().optional(),
  isPregnant: z.number().optional(),
  postpartumPeriod: z.string().optional(),
});

/**
 * QRコード生成ロジック
 */
async function generateQRCode(customerId: string) {
  const qrPayload = {
    id: customerId,
    type: "customer",
    timestamp: Date.now(),
    version: "1.0",
  };

  const qrCodeData = JSON.stringify(qrPayload);

  // QRコード画像を生成
  const qrCodeDataURL = await QRCode.toDataURL(qrCodeData, {
    errorCorrectionLevel: "H",
    width: 400,
    margin: 2,
  });

  // S3にアップロード
  try {
    const qrImageBuffer = Buffer.from(qrCodeDataURL.split(",")[1], "base64");
    const { url: qrCodeImageUrl } = await storagePut(
      `qr-codes/${customerId}.png`,
      qrImageBuffer,
      "image/png"
    );
    return {
      qrCodeData,
      qrCodeImageUrl,
    };
  } catch (error) {
    // S3アップロード失敗時を処理
    console.warn("QR code image upload failed:", error);
    return {
      qrCodeData,
      qrCodeImageUrl: "", // 空文字列を返す
    };
  }
}

export const customerRouter = router({
  /**
   * 顧客登録
   */
  register: publicProcedure
    .input(createCustomerSchema)
    .mutation(async ({ input }) => {
      const customerId = nanoid(32);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // QRコード生成
      const { qrCodeData, qrCodeImageUrl } = await generateQRCode(customerId);

      // 顧客情報をDBに保存
      const result = await db.insert(customers).values({
        customerId,
        fullName: input.fullName,
        dateOfBirth: new Date(input.dateOfBirth),
        gender: input.gender,
        phone: input.phone,
        email: input.email || undefined,
        postalCode: input.postalCode,
        prefecture: input.prefecture,
        city: input.city,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 || undefined,
        qrCodeData,
        qrCodeImageUrl,
        customFields: input.customFields ? JSON.stringify(input.customFields) : undefined,
        // New customer fields
        howDidYouKnow: input.howDidYouKnow || undefined,
        concerns: input.concerns || undefined,
        medicalHistory: input.medicalHistory || undefined,
        isPregnant: input.isPregnant || 0,
        postpartumPeriod: input.postpartumPeriod || undefined,
      });

      // Notion顧客マスターに登録（エラーがあってもシステムは続行）
      console.log("=== Notion顧客マスター登録処理開始 ===");
      try {
        const notionCustomer = await createNotionCustomer({
          customerId,
          fullName: input.fullName,
          phone: input.phone,
          email: input.email,
        });
        
        if (notionCustomer) {
          console.log("Notion顧客ページ作成成功:", notionCustomer.url);
          // NotionページURLをデータベースに保存
          await db.update(customers)
            .set({
              notionPageUrl: notionCustomer.url,
              notionPageId: notionCustomer.pageId,
            })
            .where(eq(customers.customerId, customerId));
          console.log("NotionページURLをデータベースに保存完了");
        } else {
          console.warn("Notion顧客ページ作成失敗");
        }
        console.log("=== Notion顧客マスター登録処理完了 ===");
      } catch (error) {
        console.error("=== Notion顧客マスター登録エラー ===");
        console.error("エラー詳細:", error);
      }

      // Google Sheetsに保存（エラーがあってもシステムは続行）
      console.log("=== Google Sheets保存処理開始 ===");
      console.log("顧客ID:", customerId);
      console.log("顧客名:", input.fullName);
      
      try {
        const sheetsData = {
          customerId,
          fullName: input.fullName,
          phone: input.phone,
          email: input.email,
          dateOfBirth: new Date(input.dateOfBirth),
          gender: input.gender,
          postalCode: input.postalCode,
          prefecture: input.prefecture,
          city: input.city,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          createdAt: new Date(),
        };
        
        console.log("Google Sheetsに保存するデータ:", sheetsData);
        
        const result = await saveCustomerRegistrationToSheets(sheetsData);
        
        console.log("Google Sheets保存結果:", result);
        console.log("=== Google Sheets保存処理完了 ===");
      } catch (error) {
        console.error("=== Google Sheets保存エラー ===");
        console.error("エラー詳細:", error);
        console.error("エラーメッセージ:", error instanceof Error ? error.message : String(error));
        console.error("エラースタック:", error instanceof Error ? error.stack : "N/A");
      }

      return {
        success: true,
        customerId,
        qrCodeImageUrl,
        message: "顧客登録が完了しました",
      };
    }),

  /**
   * 顧客情報取得
   */
  getByQRCode: publicProcedure
    .input(z.object({ qrCodeData: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.qrCodeData, input.qrCodeData))
        .limit(1);

      if (!customer.length) {
        throw new Error("顧客が見つかりません");
      }

      return customer[0];
    }),

  /**
   * 顧客情報取得（ID指定）
   */
  getById: publicProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, input.customerId))
        .limit(1);

      if (!customer.length) {
        throw new Error("顧客が見つかりません");
      }

      return customer[0];
    }),

  /**
   * 顧客一覧取得
   */
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return await db.select().from(customers);
  }),

  /**
   * 顧客情報更新
   */
  update: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
        fullName: z.string().min(1, "名前は必須です").optional(),
        dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "生年月日はYYYY-MM-DD形式です").optional(),
        gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
        phone: z.string().regex(/^\d{10,11}$/, "電話番号10-11文字です").optional(),
        email: z.string().email("有効なメールアドレスを入力してください").optional(),
        postalCode: z.string().min(7, "郵便番号は7文字です").optional(),
        prefecture: z.string().min(1, "都道府県は必須です").optional(),
        city: z.string().min(1, "市区町村は必須です").optional(),
        addressLine1: z.string().min(1, "住所は必須です").optional(),
        addressLine2: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { customerId, ...updateData } = input;

      // 更新データを準備
      const dataToUpdate: any = {};
      if (updateData.fullName) dataToUpdate.fullName = updateData.fullName;
      if (updateData.dateOfBirth) dataToUpdate.dateOfBirth = new Date(updateData.dateOfBirth);
      if (updateData.gender) dataToUpdate.gender = updateData.gender;
      if (updateData.phone) dataToUpdate.phone = updateData.phone;
      if (updateData.email !== undefined) dataToUpdate.email = updateData.email || undefined;
      if (updateData.postalCode) dataToUpdate.postalCode = updateData.postalCode;
      if (updateData.prefecture) dataToUpdate.prefecture = updateData.prefecture;
      if (updateData.city) dataToUpdate.city = updateData.city;
      if (updateData.addressLine1) dataToUpdate.addressLine1 = updateData.addressLine1;
      if (updateData.addressLine2 !== undefined) dataToUpdate.addressLine2 = updateData.addressLine2 || undefined;

      await db
        .update(customers)
        .set(dataToUpdate)
        .where(eq(customers.customerId, customerId));

      // Notionと紐付けられている場合、Notionにも同期
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, customerId))
        .limit(1);

      if (customer && customer.notionPageId) {
        try {
          const notionUpdates: any = {};
          if (updateData.phone) notionUpdates.phone = updateData.phone;
          if (updateData.email !== undefined) notionUpdates.email = updateData.email || "";
          
          if (Object.keys(notionUpdates).length > 0) {
            await updateNotionCustomer(customer.notionPageId, notionUpdates);
            console.log(`[Notion同期] 顧客 ${customer.fullName} の情報をNotionに同期しました`);
          }
        } catch (error) {
          console.error("[Notion同期エラー]", error);
          // エラーがあっても顧客更新は成功とする
        }
      }

      return {
        success: true,
        message: "顧客情報を更新しました",
      };
    }),

  /**
   * 顧客削除
   */
  delete: publicProcedure
    .input(z.object({ customerId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 顧客を削除
      await db.delete(customers).where(eq(customers.customerId, input.customerId));

      return {
        success: true,
        message: "顧客を削除しました",
      };
    }),

  /**
   * 来院履歴作成
   */
  recordVisit: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
        pointsEarned: z.number().default(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const visitId = nanoid(32);

      // 来院履歴を記録
      await db.insert(visits).values({
        visitId,
        customerId: input.customerId,
        pointsEarned: input.pointsEarned,
        notes: input.notes,
      });

      // 顧客情報を取得
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, input.customerId))
        .limit(1);

      if (!customer.length) {
        throw new Error("顧客が見つかりません");
      }

      const visitDate = new Date();

      // ポイント付与
      if (input.pointsEarned > 0) {
        const newBalance = (customer[0].totalPoints || 0) + input.pointsEarned;

        // ポイント取引履歴を記録
        await db.insert(pointTransactions).values({
          transactionId: nanoid(32),
          customerId: input.customerId,
          transactionType: "earn",
          points: input.pointsEarned,
          balanceAfter: newBalance,
          description: `来院時ポイント付与`,
        });

        // 顧客のポイントを更新
        await db
          .update(customers)
          .set({
            totalPoints: newBalance,
            lifetimePoints: (customer[0].lifetimePoints || 0) + input.pointsEarned,
            lastPointActivityDate: new Date(),
            lastVisitDate: visitDate,
            visitCount: (customer[0].visitCount || 0) + 1,
          })
          .where(eq(customers.customerId, input.customerId));
      }

      // Google Sheetsに来院記録を保存
      try {
        await saveVisitToSheets({
          visitId,
          customerId: input.customerId,
          customerName: customer[0].fullName,
          visitDate,
          pointsEarned: input.pointsEarned,
          notes: input.notes,
        });

        // 月次サマリーを更新
        const yearMonth = visitDate.toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "2-digit",
        }).replace("/", "/");

        // 今月の来院回数を取得
        const monthStart = new Date(visitDate.getFullYear(), visitDate.getMonth(), 1);
        const monthEnd = new Date(visitDate.getFullYear(), visitDate.getMonth() + 1, 0, 23, 59, 59);
        
        const monthlyVisits = await db
          .select()
          .from(visits)
          .where(eq(visits.customerId, input.customerId));
        
        const thisMonthVisits = monthlyVisits.filter(v => {
          const vDate = new Date(v.visitDate);
          return vDate >= monthStart && vDate <= monthEnd;
        });

        await updateMonthlySummaryInSheets({
          customerId: input.customerId,
          customerName: customer[0].fullName,
          yearMonth,
          visitCount: thisMonthVisits.length,
          lastVisitDate: visitDate,
        });
      } catch (error) {
        console.error("Google Sheets保存エラー:", error);
        // エラーが発生してもシステムは続行
      }

      return {
        success: true,
        visitId,
      };
    }),
});
