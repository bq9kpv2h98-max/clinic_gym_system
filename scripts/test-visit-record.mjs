/**
 * 来院記録のテストスクリプト
 * 
 * 既存の顧客に対して来院記録を作成し、Google Sheetsへの保存と月次サマリーの更新をテストします。
 */

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

const client = createTRPCClient({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/api/trpc",
      transformer: superjson,
    }),
  ],
});

async function testVisitRecord() {
  try {
    console.log("📋 顧客一覧を取得中...");
    const customers = await client.customers.list.query();
    
    if (customers.length === 0) {
      console.error("❌ 顧客が登録されていません。先に顧客を登録してください。");
      process.exit(1);
    }

    const customer = customers[0];
    console.log(`✅ 顧客を選択: ${customer.fullName} (ID: ${customer.customerId})`);

    console.log("\n📝 来院記録を作成中...");
    const visitResult = await client.customers.recordVisit.mutate({
      customerId: customer.customerId,
      pointsEarned: 10,
      notes: "テスト来院記録",
    });

    console.log("✅ 来院記録が作成されました:");
    console.log(`  - 来院ID: ${visitResult.visitId}`);
    console.log(`  - 顧客名: ${customer.fullName}`);
    console.log(`  - 獲得ポイント: 10`);

    console.log("\n⏳ Google Sheetsへの保存を確認するため、5秒待機...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("\n🎉 テスト完了！Google Sheetsを確認してください。");
    console.log("  - 来院履歴シート: 新しい来院記録が追加されているはずです");
    console.log("  - 月次来院統計シート: 今月の来院回数が更新されているはずです");
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  }
}

testVisitRecord();
