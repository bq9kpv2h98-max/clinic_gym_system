// tRPC APIを直接呼び出して予約紐付けをテスト
import { execSync } from 'child_process';

console.log('=== 予約紐付けAPIテスト ===\n');

try {
  // サーバーのURLを取得
  const serverUrl = 'http://localhost:3000';
  
  // tRPC APIを呼び出し
  console.log('予約紐付けAPIを実行中...\n');
  
  const result = execSync(
    `curl -s -X POST "${serverUrl}/api/trpc/notionLink.linkExistingReservations" \\
      -H "Content-Type: application/json" \\
      -d '{"json":{}}'`,
    { encoding: 'utf-8', timeout: 120000 }
  );
  
  console.log('APIレスポンス:');
  console.log(result);
  
  const data = JSON.parse(result);
  
  if (data.result?.data?.json) {
    const { matched, failed, errors } = data.result.data.json;
    console.log('\n=== 結果 ===');
    console.log(`✅ 成功: ${matched}件`);
    console.log(`❌ 失敗: ${failed}件`);
    
    if (errors && errors.length > 0) {
      console.log('\nエラー詳細:');
      errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
    }
  }
  
} catch (error) {
  console.error('エラー:', error.message);
  if (error.stdout) {
    console.log('stdout:', error.stdout);
  }
  if (error.stderr) {
    console.error('stderr:', error.stderr);
  }
}
