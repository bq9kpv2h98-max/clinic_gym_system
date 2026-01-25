import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { customers } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Customer Registration - New vs Existing", () => {
  const testPhoneNew = "09099999991";
  const testPhoneExisting = "09099999992";

  // テスト後のクリーンアップ
  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    await db.delete(customers).where(eq(customers.phone, testPhoneNew));
    await db.delete(customers).where(eq(customers.phone, testPhoneExisting));
  });

  it("should register a new customer with detailed information", async () => {
    const newCustomerData = {
      fullName: "新規太郎",
      dateOfBirth: "1990-01-01",
      gender: "male" as const,
      phone: testPhoneNew,
      email: "new@example.com",
      postalCode: "1234567",
      prefecture: "東京都",
      city: "渋谷区",
      addressLine1: "1-2-3",
      addressLine2: "テストマンション101",
      // 新規顧客の追加フィールド
      howDidYouKnow: "Google検索",
      concerns: "腰痛、肩こり",
      medicalHistory: "高血圧",
      isPregnant: 0,
      postpartumPeriod: undefined,
    };

    // 顧客を登録
    const customerId = `CUST-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const qrCodeData = `qr-${customerId}`;
    const qrCodeImageUrl = `https://example.com/qr/${customerId}.png`;

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(customers).values({
      customerId,
      fullName: newCustomerData.fullName,
      dateOfBirth: new Date(newCustomerData.dateOfBirth),
      gender: newCustomerData.gender,
      phone: newCustomerData.phone,
      email: newCustomerData.email,
      postalCode: newCustomerData.postalCode,
      prefecture: newCustomerData.prefecture,
      city: newCustomerData.city,
      addressLine1: newCustomerData.addressLine1,
      addressLine2: newCustomerData.addressLine2,
      qrCodeData,
      qrCodeImageUrl,
      // 新規顧客の追加フィールド
      howDidYouKnow: newCustomerData.howDidYouKnow,
      concerns: newCustomerData.concerns,
      medicalHistory: newCustomerData.medicalHistory,
      isPregnant: newCustomerData.isPregnant,
      postpartumPeriod: newCustomerData.postpartumPeriod,
    });

    // データベースから取得して確認
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, testPhoneNew));

    expect(customer).toBeDefined();
    expect(customer.fullName).toBe("新規太郎");
    expect(customer.phone).toBe(testPhoneNew);
    expect(customer.email).toBe("new@example.com");
    expect(customer.howDidYouKnow).toBe("Google検索");
    expect(customer.concerns).toBe("腰痛、肩こり");
    expect(customer.medicalHistory).toBe("高血圧");
    expect(customer.isPregnant).toBe(0);
    expect(customer.postpartumPeriod).toBeNull();
  });

  it("should register an existing customer without detailed information", async () => {
    const existingCustomerData = {
      fullName: "既存花子",
      dateOfBirth: "1985-05-15",
      gender: "female" as const,
      phone: testPhoneExisting,
      email: "existing@example.com",
      postalCode: "7654321",
      prefecture: "大阪府",
      city: "大阪市",
      addressLine1: "4-5-6",
      addressLine2: undefined,
    };

    // 顧客を登録（既存顧客なので追加フィールドなし）
    const customerId = `CUST-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const qrCodeData = `qr-${customerId}`;
    const qrCodeImageUrl = `https://example.com/qr/${customerId}.png`;

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(customers).values({
      customerId,
      fullName: existingCustomerData.fullName,
      dateOfBirth: new Date(existingCustomerData.dateOfBirth),
      gender: existingCustomerData.gender,
      phone: existingCustomerData.phone,
      email: existingCustomerData.email,
      postalCode: existingCustomerData.postalCode,
      prefecture: existingCustomerData.prefecture,
      city: existingCustomerData.city,
      addressLine1: existingCustomerData.addressLine1,
      addressLine2: existingCustomerData.addressLine2,
      qrCodeData,
      qrCodeImageUrl,
      // 既存顧客なので追加フィールドは設定しない
    });

    // データベースから取得して確認
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, testPhoneExisting));

    expect(customer).toBeDefined();
    expect(customer.fullName).toBe("既存花子");
    expect(customer.phone).toBe(testPhoneExisting);
    expect(customer.email).toBe("existing@example.com");
    // 追加フィールドはnullまたはundefined
    expect(customer.howDidYouKnow).toBeNull();
    expect(customer.concerns).toBeNull();
    expect(customer.medicalHistory).toBeNull();
    expect(customer.isPregnant).toBe(0); // デフォルト値
    expect(customer.postpartumPeriod).toBeNull();
  });

  it("should handle new customer with pregnancy information", async () => {
    const pregnantCustomerData = {
      fullName: "妊婦さん",
      dateOfBirth: "1992-03-20",
      gender: "female" as const,
      phone: "09099999993",
      email: "pregnant@example.com",
      postalCode: "1112222",
      prefecture: "神奈川県",
      city: "横浜市",
      addressLine1: "7-8-9",
      howDidYouKnow: "友人の紹介",
      concerns: "妊娠中の腰痛",
      medicalHistory: undefined,
      isPregnant: 1,
      postpartumPeriod: undefined,
    };

    const customerId = `CUST-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const qrCodeData = `qr-${customerId}`;
    const qrCodeImageUrl = `https://example.com/qr/${customerId}.png`;

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(customers).values({
      customerId,
      fullName: pregnantCustomerData.fullName,
      dateOfBirth: new Date(pregnantCustomerData.dateOfBirth),
      gender: pregnantCustomerData.gender,
      phone: pregnantCustomerData.phone,
      email: pregnantCustomerData.email,
      postalCode: pregnantCustomerData.postalCode,
      prefecture: pregnantCustomerData.prefecture,
      city: pregnantCustomerData.city,
      addressLine1: pregnantCustomerData.addressLine1,
      qrCodeData,
      qrCodeImageUrl,
      howDidYouKnow: pregnantCustomerData.howDidYouKnow,
      concerns: pregnantCustomerData.concerns,
      medicalHistory: pregnantCustomerData.medicalHistory,
      isPregnant: pregnantCustomerData.isPregnant,
      postpartumPeriod: pregnantCustomerData.postpartumPeriod,
    });

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, "09099999993"));

    expect(customer).toBeDefined();
    expect(customer.fullName).toBe("妊婦さん");
    expect(customer.isPregnant).toBe(1);
    expect(customer.concerns).toBe("妊娠中の腰痛");
    expect(customer.howDidYouKnow).toBe("友人の紹介");

    // クリーンアップ
    const dbCleanup = await getDb();
    if (dbCleanup) {
      await dbCleanup.delete(customers).where(eq(customers.phone, "09099999993"));
    }
  });

  it("should handle new customer with postpartum information", async () => {
    const postpartumCustomerData = {
      fullName: "産後ママ",
      dateOfBirth: "1988-07-10",
      gender: "female" as const,
      phone: "09099999994",
      email: "postpartum@example.com",
      postalCode: "3334444",
      prefecture: "千葉県",
      city: "千葉市",
      addressLine1: "10-11-12",
      howDidYouKnow: "SNS広告",
      concerns: "産後の骨盤の歪み",
      medicalHistory: undefined,
      isPregnant: 0,
      postpartumPeriod: "産後3ヶ月",
    };

    const customerId = `CUST-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const qrCodeData = `qr-${customerId}`;
    const qrCodeImageUrl = `https://example.com/qr/${customerId}.png`;

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(customers).values({
      customerId,
      fullName: postpartumCustomerData.fullName,
      dateOfBirth: new Date(postpartumCustomerData.dateOfBirth),
      gender: postpartumCustomerData.gender,
      phone: postpartumCustomerData.phone,
      email: postpartumCustomerData.email,
      postalCode: postpartumCustomerData.postalCode,
      prefecture: postpartumCustomerData.prefecture,
      city: postpartumCustomerData.city,
      addressLine1: postpartumCustomerData.addressLine1,
      qrCodeData,
      qrCodeImageUrl,
      howDidYouKnow: postpartumCustomerData.howDidYouKnow,
      concerns: postpartumCustomerData.concerns,
      medicalHistory: postpartumCustomerData.medicalHistory,
      isPregnant: postpartumCustomerData.isPregnant,
      postpartumPeriod: postpartumCustomerData.postpartumPeriod,
    });

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, "09099999994"));

    expect(customer).toBeDefined();
    expect(customer.fullName).toBe("産後ママ");
    expect(customer.isPregnant).toBe(0);
    expect(customer.postpartumPeriod).toBe("産後3ヶ月");
    expect(customer.concerns).toBe("産後の骨盤の歪み");
    expect(customer.howDidYouKnow).toBe("SNS広告");

    // クリーンアップ
    const dbCleanup = await getDb();
    if (dbCleanup) {
      await dbCleanup.delete(customers).where(eq(customers.phone, "09099999994"));
    }
  });
});
