# Aut-post-X — Commerce Media OS MVP

「コスパ投資研究所」向けの、安全装置付きX自動投稿エンジンです。

## MVPでできること

- OpenAIによる日本語投稿案の自動生成
- 禁止表現、280文字、直近投稿との類似度チェック
- 投稿内容に合わせた1200×675pxの独自PNGカード生成
- X公式APIによる画像付き投稿
- 1日上限、最小投稿間隔、3回連続失敗時のCircuit Breaker
- Kill Switch、手動キュー登録、監査ログ
- GitHub Actionsで09:00・13:00・20:00（日本時間）に起動

初期版は、未確認の商品情報を自動収集・断定しません。まずリンクなしの買い物教育コンテンツで運用データを作る安全な構成です。

## 1. Supabase

新規プロジェクトを作り、SQL Editorで `supabase/migrations/001_initial.sql` を実行します。接続にはSettings → API KeysのSecret key（`sb_secret_...`）を使い、Vercelでは `SUPABASE_SECRET_KEY` という名前で保存します。

## 2. X Developer App

自分の投稿用アカウントを対象に、Developer PortalでAppを作成します。

- App permission: **Read and Write**
- OAuth 1.0aのApp Key / SecretとUser Access Token / Secretを発行
- 権限変更後はAccess Tokenを再発行

APIキーはGitHubへコミットしないでください。

## 3. Vercel

このリポジトリをImportし、`.env.example` にある環境変数を登録します。最初は必ず `DRY_RUN=true` にします。

`CRON_SECRET` と `ADMIN_SECRET` は、それぞれ推測困難な32文字以上の別々の値にしてください。

## 4. GitHub Actions Secrets

Repository Settings → Secrets and variables → Actionsで登録します。

- `APP_URL`: Vercel本番URL（例: `https://example.vercel.app`）
- `CRON_SECRET`: Vercelに登録した値と同じもの

Actionsの `Auto post to X` を手動実行し、Supabaseの `posts` と `audit_logs` を確認します。`dry-run-...` のIDで `posted` になればテスト成功です。

## 5. 本番投稿

検証後、Vercelの `DRY_RUN` を `false` に変更して再デプロイします。いきなり3件/日にせず、最初の3日間は `settings.daily_limit = 1` を推奨します。

## Kill Switch

```bash
curl -X POST "$APP_URL/api/admin/pause" \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"paused":true}'
```

再開時は `false` にします。Circuit Breakerが開いた場合は、原因を直してからSupabaseで `circuit_open=false`, `consecutive_failures=0` に戻してください。

## 手動で投稿をキューへ追加

```bash
curl -X POST "$APP_URL/api/admin/queue" \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"topic":"買い物の判断","text":"安さだけで決めず、使用回数で割って考える。","imageTitle":"価格より、1回あたり","imagePoints":["価格を確認","使用回数を仮定","1回あたりで比較"]}'
```

## Local verification

```bash
npm install
npm test
npm run typecheck
npm run build
```

## 運用上の注意

- XのAPI利用料金・上限・自動化ルールは変更されるため、Developer Portalで現行条件を確認してください。
- AI生成物の最終責任はアカウント運営者にあります。
- Amazon商品・価格・画像を扱う機能は、Product Advertising APIとアソシエイト規約を確認した後に追加します。
