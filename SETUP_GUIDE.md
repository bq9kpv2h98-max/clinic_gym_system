# 個人サロン向け予約管理システム — 新店舗セットアップガイド

このガイドは **Claude** に渡すことで、新しい店舗のシステムを自動構築するための指示書です。
以下の手順に従って、必要情報を収集してからClaudeに渡してください。

---

## STEP 1: 顧客（サロンオーナー）から収集する情報

以下の情報シートをオーナーに記入してもらってください。

```
【店舗情報シート】

■ 基本情報
- 店舗正式名称（メール・管理画面用）: 例）〇〇整体院 〇〇GYM
- ブランド名（ロゴ・ヘッダー用・短め）: 例）〇〇 GROUP
- 短縮名（コピーライト用）: 例）〇〇 Group
- 業種説明: 例）整体院・パーソナルジム

■ 連絡先
- 顧客向けLINE公式URL: https://lin.ee/xxxxxxx
- お問い合わせ用LINEリンク（確定メール等に記載）: https://lin.ee/xxxxxxx
  ※ 同じURLでも可
- 電話番号（任意）: 

■ 所在地
- GoogleマップURL（短縮URL可）: https://maps.app.goo.gl/xxxxxxx
- 住所（任意）: 

■ 本番サイトURL（Manusで公開後に決まるURL）: https://xxxx.manus.space

■ 営業設定
- 定休日の曜日（複数可）: 例）日曜
- 営業開始時刻: 例）10:00
- 営業終了時刻: 例）20:00
- 施術時間（分）: 例）90

■ 予約メニュー（最大6つ）
1. 例）初回体験（60分）
2. 例）通常施術（60分）
3. 例）パーソナルトレーニング（60分）
4. 
5. 
6. 

■ 外部サービスのAPIキー
- LINE Channel Access Token: （LINE Developers から取得）
- LINE Notify User ID（スタッフへの通知先）: （LINEの設定から取得）
- Resend APIキー: （resend.com から取得）
- Notion Token（Notionを使う場合）: （Notion Integrations から取得）
- Notion 予約DBのID（Notionを使う場合）: 
- Notion 予定DBのID（Notionを使う場合）: 
- Notion 顧客DBのID（Notionを使う場合）: 
```

---

## STEP 2: Claudeへの指示

以下のプロンプトをそのままClaudeに貼り付けてください。
`【 】` 内を上記シートの内容で埋めてから渡してください。

---

### Claudeへのプロンプト（コピー用）

```
あなたはWebシステムの構築エンジニアです。
以下の店舗情報をもとに、個人サロン向け予約管理システムを新規構築してください。

## 作業手順

1. Manusで新しいWebプロジェクトを作成する（テンプレート: web-db-user）
2. 以下の「店舗情報」を `shared/siteConfig.ts` に設定する
3. 以下の「Secrets」をプロジェクトに設定する
4. 動作確認してチェックポイントを保存する
5. 公開URLをオーナーに報告する

## 店舗情報（siteConfig.tsに設定する内容）

name: "【店舗正式名称】"
brandName: "【ブランド名】"
shortName: "【短縮名】"
businessType: "【業種説明】"
lineUrlPublic: "【顧客向けLINE URL】"
lineUrlContact: "【お問い合わせLINE URL】"
phoneNumber: "【電話番号（なければ空文字）】"
googleMapsUrl: "【GoogleマップURL】"
address: "【住所（なければ空文字）】"
siteUrl: "【本番サイトURL（公開後に更新）】"
facilityId: "【英数字のID、例: facility-001】"
closedDays: [【定休日の曜日番号、日=0,月=1,...,土=6】]
openTime: "【営業開始時刻 例: 10:00】"
closeTime: "【営業終了時刻 例: 20:00】"
slotIntervalMinutes: 30
appointmentDurationMinutes: 【施術時間（分）】
reservationMenus: [
  { value: "menu1", label: "【メニュー1】" },
  { value: "menu2", label: "【メニュー2】" },
  // 必要に応じて追加
]

## Secrets（環境変数）

LINE_CHANNEL_ACCESS_TOKEN=【LINE Channel Access Token】
LINE_NOTIFY_USER_ID=【LINE Notify User ID】
RESEND_API_KEY=【Resend APIキー】
NOTION_TOKEN=【Notion Token（使う場合）】

## Notion設定（使う場合のみ）

Notion予約DBのID: 【DB ID】
Notion予定DBのID: 【DB ID】
Notion顧客DBのID: 【DB ID】

これらのIDは server/notionSync.ts と server/notion.ts の
NOTION_RESERVATION_DB_ID, NOTION_SCHEDULE_DB_ID, NOTION_CUSTOMER_DB_ID
に設定してください。

## 参考にするシステム

既存のULUシステム（clinic_gym_system）のコードをベースに構築してください。
`shared/siteConfig.ts` を書き換えるだけで店舗情報が全体に反映される設計になっています。
```

---

## STEP 3: 構築後の確認チェックリスト

Claudeが構築を完了したら、以下を確認してください。

| 確認項目 | 確認方法 |
|---|---|
| 予約フォームが表示される | `/reservation` にアクセス |
| 店舗名・ブランド名が正しく表示される | フォームのヘッダーを確認 |
| カレンダーで定休日がグレーアウトされる | 予約フォームのカレンダーを確認 |
| 予約申し込み後にメールが届く | テスト予約を送信 |
| LINE通知がオーナーに届く | テスト予約を送信 |
| 管理画面にログインできる | `/admin` にアクセス |
| 管理画面で予約一覧が表示される | 管理画面を確認 |

---

## STEP 4: Notionとの連携設定（オプション）

Notionを使う場合は、以下のNotionデータベース構造を作成してください。

### 予約データベース（Notion）

| プロパティ名 | 型 | 説明 |
|---|---|---|
| 名前 | タイトル | 顧客名 |
| ステータス | セレクト | 保留中 / 確定 / キャンセル |
| 第1希望日時 | 日付 | 予約希望日時 |
| 第2希望日時 | 日付 | 第2希望 |
| 第3希望日時 | 日付 | 第3希望 |
| 電話番号 | テキスト | 顧客電話番号 |
| メールアドレス | メール | 顧客メールアドレス |
| 顧客メモ | テキスト | 症状・要望 |
| 予約ID | テキスト | システム内部ID |

### 予定データベース（ブロック時間管理）

| プロパティ名 | 型 | 説明 |
|---|---|---|
| タイトル | タイトル | 予定名（例：研修、休暇） |
| 日時 | 日付 | ブロックする日時（範囲指定可） |
| 種別 | セレクト | 休業 / 予約済み / その他 |

---

## よくある質問

**Q: Notionを使わない場合は？**
A: Notionなしでも予約管理システムは完全に動作します。予約フォーム・管理画面・メール通知・LINE通知はすべてNotionなしで機能します。

**Q: 営業時間・定休日を後から変更したい場合は？**
A: `shared/siteConfig.ts` の `openTime`、`closeTime`、`closedDays` を変更して再デプロイするだけです。

**Q: メニューを追加・変更したい場合は？**
A: `shared/siteConfig.ts` の `reservationMenus` 配列を編集して再デプロイしてください。

**Q: 独自ドメインを使いたい場合は？**
A: Manusの管理画面 → Settings → Domains から独自ドメインを設定できます。

---

*このガイドはULU整骨院 ULU GYMのシステムをベースに作成されました。*
