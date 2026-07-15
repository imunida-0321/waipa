# WaiPa — Codex 向け作業規約

このリポジトリは WaiPa（ワイパ）— パーティー向け無料ランダムミニゲームアプリ（Expo / React Native、iOS・Android 両対応）。
詳細な仕様・デザイントークンは CLAUDE.md を参照すること。

## セキュリティ（最重要・違反禁止）

- `.env` / `.env.local` / `.env.*.local` / `.env.production` 等の秘密情報ファイルは**絶対に読まない**（cat / head / tail / sed / awk / grep / less 等いずれも禁止）
- 例外: `.env.example` のみ閲覧可（ダミー値のみ）
- service_role キー・API 秘密鍵・JWT secret・署名証明書（*.p8, *.p12, *.key, *.jks, *.mobileprovision）も読まない
- 秘密情報をコード・ログ・コミットに含めない

## コードフォーマット

- タブ幅 4（タブインデント）
- セミコロンなし
- シングルクォート

## 技術スタック

- Expo (React Native) + TypeScript + Expo Router
- Supabase（認証・お題配信・課金検証。MVP ではリアルタイム同期なし）
- AdMob（広告）/ RevenueCat（プレミアム課金）

## ディレクトリ

- `src/app` — Expo Router の画面
- `src/games` — 各ゲームのロジック・画面
- `src/components` / `src/hooks` / `src/lib` / `src/theme` / `src/constants` / `src/types`

## テスト規約

### テストファースト（必須）

- 実装より先にテストを書く。**RED（失敗するテストを書き、実行して失敗を確認）→ GREEN（テストを通す最小実装）→ REFACTOR** の順序を守る
- RED の失敗ログと GREEN のパスログを最終出力に含めること
- GREEN では「テストが要求していない処理」（先回りのエラーハンドリング・最適化・汎用化）を追加しない

### 実行コマンド

- 個別: `npx jest src/games/<game>/__tests__/<file>.test.ts`
- 全体: `npx jest`

### 禁止事項

- **テストが失敗したとき、実装に合わせてテストを書き換えて通さない**。テストは仕様であり、直すのは実装側。テスト自体の誤りを直す場合はその理由を最終出力に明記する
- `.skip` / `.only` を残さない
- テストコードでの `any` 使用禁止
- `Date.now()` や実タイマーに依存するテストを書かない。タイマー系は `jest.useFakeTimers()` を使う
- 実ネットワーク・実 Supabase に接続するテストを書かない（モックする）

### React 19 の注意

- 同期 `act` / `renderHook` はタイマー系テストで失敗する。必ず `await act(async () => ...)` を使う
- 参照実装: kimagure-ox のテスト

## Git 運用

- 作業は指示されたブランチ上でのみ行う。ブランチの作成・切替・コミット・プッシュは指示がない限り行わない
- develop が統合ブランチ。main への直接変更は禁止

## 作業スタイル

- 指示されたタスクの範囲だけを実装する。スコープ外のリファクタリングや「ついで修正」はしない
- 不明点があれば推測で進めず、その旨を最終出力に明記する
