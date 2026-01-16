# 定期実行スケジュール設定

## Notion顧客情報の自動同期

**実行スクリプト**: `server/cron/sync-notion-customers.ts`

**実行頻度**: 毎日午前3時（日本時間）

**Cronタブ設定**:
```
0 3 * * * cd /home/ubuntu/clinic_gym_system && node --loader tsx server/cron/sync-notion-customers.ts >> /var/log/notion-sync.log 2>&1
```

**手動実行方法**:
```bash
cd /home/ubuntu/clinic_gym_system
npx tsx server/cron/sync-notion-customers.ts
```

**機能**:
- Notionと紐付けられている全顧客の情報を取得
- 電話番号、メールアドレスの変更をNotionからシステムに反映
- 同期結果をログに記録

**ログ確認**:
```bash
tail -f /var/log/notion-sync.log
```

## 注意事項

- 同期は一方向（Notion → システム）のみ
- システム側で更新した情報はNotionに反映されません
- エラーが発生しても処理は継続され、全顧客の同期を試みます
- 同期結果は標準出力とログファイルに記録されます

## トラブルシューティング

**同期が失敗する場合**:
1. Notion APIの認証状態を確認
2. NotionページIDが正しいか確認
3. ログファイルでエラー詳細を確認

**手動で全件同期する場合**:
管理画面（/notion-link）の「全件同期」ボタンを使用
