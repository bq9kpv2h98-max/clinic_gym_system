# Google Sheets API連携 設定ガイド

予約情報とQRコード登録情報を自動的にGoogle Sheetsに保存する機能の設定手順です。

## 概要

この機能により、以下の情報が自動的にスプレッドシートに保存されます：

- **予約情報**（シート名: 「予約情報」）
  - 登録日時、予約ID、顧客名、電話番号、メールアドレス
  - 第1-3希望日時、症状・お悩み

- **QRコード登録情報**（シート名: 「顧客登録情報」）
  - 登録日時、顧客ID、氏名、電話番号、メールアドレス
  - 生年月日、性別、住所情報

## 設定手順

### ステップ1: Google Cloud Platformでプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成（例: "clinic-gym-system"）
3. プロジェクトを選択

### ステップ2: Google Sheets APIを有効化

1. 左側メニューから「APIとサービス」→「ライブラリ」を選択
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

### ステップ3: サービスアカウントを作成

1. 左側メニューから「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「サービスアカウント」を選択
3. サービスアカウント名を入力（例: "sheets-sync"）
4. 「作成して続行」をクリック
5. ロールは「編集者」を選択
6. 「完了」をクリック

### ステップ4: サービスアカウントキーを生成

1. 作成したサービスアカウントをクリック
2. 「キー」タブを選択
3. 「鍵を追加」→「新しい鍵を作成」を選択
4. 「JSON」を選択して「作成」をクリック
5. JSONファイルがダウンロードされます（**このファイルは安全に保管してください**）

### ステップ5: Google Sheetsスプレッドシートを作成

1. [Google Sheets](https://sheets.google.com/)にアクセス
2. 新しいスプレッドシートを作成
3. シート名を「予約情報」に変更
4. 新しいシートを追加して「顧客登録情報」に変更
5. スプレッドシートのURLから**スプレッドシートID**をコピー
   - URL例: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
   - `{SPREADSHEET_ID}`の部分をコピー

### ステップ6: スプレッドシートを共有

1. スプレッドシートの「共有」ボタンをクリック
2. ステップ4でダウンロードしたJSONファイルを開き、`client_email`の値をコピー
   - 例: `sheets-sync@clinic-gym-system.iam.gserviceaccount.com`
3. このメールアドレスを共有先に追加
4. 権限を「編集者」に設定
5. 「送信」をクリック

### ステップ7: 環境変数を設定

Manus Management UIで以下の環境変数を設定します：

1. チャットボックス右上の**歯車アイコン**をクリック
2. 左サイドバーの**「シークレット」**を選択
3. 以下の2つの環境変数を追加：

#### GOOGLE_SHEETS_CREDENTIALS

ステップ4でダウンロードしたJSONファイルの**内容全体**をコピーして貼り付けます。

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "sheets-sync@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

**注意**: JSONファイル全体を1行にせず、そのままコピー＆ペーストしてください。

#### GOOGLE_SHEETS_SPREADSHEET_ID

ステップ5でコピーしたスプレッドシートIDを貼り付けます。

例: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

### ステップ8: サーバーを再起動

環境変数を設定した後、サーバーを再起動します：

1. Management UIの右上の「Restart」ボタンをクリック
2. または、チャット画面で「サーバーを再起動してください」とリクエスト

### ステップ9: 動作確認

1. 予約フォーム（`/reservation`）から予約を作成
2. QRコード登録フォーム（`/register-qr`）から顧客を登録
3. Google Sheetsを開いて、データが自動的に追加されていることを確認

## トラブルシューティング

### データが保存されない場合

1. **環境変数が正しく設定されているか確認**
   - Management UI → シークレット → `GOOGLE_SHEETS_CREDENTIALS`と`GOOGLE_SHEETS_SPREADSHEET_ID`が存在するか

2. **サービスアカウントがスプレッドシートにアクセスできるか確認**
   - スプレッドシートの共有設定でサービスアカウントのメールアドレスが「編集者」として追加されているか

3. **シート名が正しいか確認**
   - 「予約情報」と「顧客登録情報」という名前のシートが存在するか

4. **サーバーログを確認**
   - エラーメッセージがある場合は、それに従って対処

### よくあるエラー

#### "Google Sheets credentials not configured"

環境変数が設定されていません。ステップ7を確認してください。

#### "Failed to initialize Google Sheets client"

JSONファイルの形式が正しくない可能性があります。JSONファイル全体をコピーして貼り付けているか確認してください。

#### "The caller does not have permission"

サービスアカウントがスプレッドシートにアクセスできません。ステップ6を確認してください。

## セキュリティに関する注意事項

- サービスアカウントのJSONファイルは**絶対に公開しないでください**
- 環境変数として安全に保管してください
- 不要になったサービスアカウントは削除してください

## ヘッダー行の初期化（オプション）

初回のみ、スプレッドシートにヘッダー行を追加することができます。

手動で以下のヘッダーを追加するか、システムが自動的に追加します：

### 予約情報シート

| 登録日時 | 予約ID | 顧客名 | 電話番号 | メールアドレス | 第1希望日 | 第1希望時間帯 | 第2希望日 | 第2希望時間帯 | 第3希望日 | 第3希望時間帯 | 症状・お悩み |

### 顧客登録情報シート

| 登録日時 | 顧客ID | 氏名 | 電話番号 | メールアドレス | 生年月日 | 性別 | 郵便番号 | 都道府県 | 市区町村 | 住所1 | 住所2 |

---

設定完了後、予約とQRコード登録が自動的にスプレッドシートに保存されます！
