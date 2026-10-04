# WaiPa 手動開発ガイド（AI を使わない場合）

AI（Claude / Codex）を介さず、**人間が直接コーディングする場合**のガイドです。共通ルールはリンク先の開発ガイドを参照し、本書では手動開発の具体的な手順を説明します。

AI 協働体制での開発や、プロジェクト全体の構成・ゲーム追加手順は [DEVELOPMENT.md](DEVELOPMENT.md) を参照してください。守るべきルール（ブランチ運用・TDD・コーディング規約）は AI 利用時と共通です。

## セットアップ

[開発ガイドのセットアップ](DEVELOPMENT.md#セットアップ) を参照してください。手動開発の場合、AI 用の追加セットアップ（Claude Code / Codex CLI）は不要です。

## 開発フロー

### 1. Issue を確認してブランチを切る

Issue・ブランチの共通ルールは [開発ガイドの開発フロー](DEVELOPMENT.md#開発フロー) を参照してください。コマンド例:

```bash
git checkout develop && git pull
git checkout -b feature/<issue番号>-<短い名前>   # 例: feature/64-cross-derby
# 軽微な修正は fix/... 、雑務は chore/...
```

### 2. RED — 先にテストを書く

RED → GREEN → REFACTOR の定義・禁止事項は [開発ガイドの TDD 運用](DEVELOPMENT.md#tdd-運用2026-07-15-導入) を参照してください。手動開発では watch モードで継続実行します:

```bash
# 例: 新ゲームの engine を作る場合
# src/games/<game-id>/__tests__/engine.test.ts にテストを書いてから:
npx jest src/games/<game-id>/ --watch
```

### 3. GREEN — テストを通す最小実装を書く

watch モードのまま、[TDD 運用の GREEN](DEVELOPMENT.md#tdd-運用2026-07-15-導入) に従って実装します。

### 4. REFACTOR — テストを緑に保ったまま整理する

[TDD 運用の REFACTOR](DEVELOPMENT.md#tdd-運用2026-07-15-導入) に従って整理します。

### 5. セルフチェック — PR 前に全部通す

```bash
npm test              # 全テスト
npm run typecheck     # TypeScript 型チェック
npm run lint          # ESLint
npm run format:check  # フォーマット確認（整形方法は開発ガイドのコーディング規約を参照）
```

### 6. 動作確認

`npm start` で Expo を起動し、実機または Expo Go で該当画面・ゲームを実際に触って確認します。

### 7. PR を出す

PR の宛先・レビュー・マージは [開発ガイドの開発フロー](DEVELOPMENT.md#開発フロー) に従います。手動開発では人間または Claude がレビューします。本文には以下を書きます:

- 変更概要と対応 Issue（`Closes #64` 等）
- テスト結果（全件グリーンであること）
- UI 変更がある場合はスクリーンショット

## 守るべき規約

### コーディング規約

[開発ガイドのコーディング規約](DEVELOPMENT.md#コーディング規約) を参照してください。

### テスト規約

[開発ガイドの TDD 運用](DEVELOPMENT.md#tdd-運用2026-07-15-導入) を参照してください（禁止事項・React 19 の注意点を含む）。

### セキュリティ

[開発ガイドのセキュリティ](DEVELOPMENT.md#セキュリティ) を参照してください。

## よく使うコマンド

[開発ガイドのよく使うコマンド](DEVELOPMENT.md#よく使うコマンド) を参照してください。

## 新しいゲームを追加する場合

[開発ガイドの新しいゲームの追加方法](DEVELOPMENT.md#新しいゲームの追加方法) を参照してください（AI 利用の有無に関わらず同じ手順です）。
