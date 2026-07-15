# WaiPa 手動開発ガイド（AI を使わない場合）

AI（Claude / Codex）を介さず、**人間が直接コーディングする場合**のガイドです。このファイルだけ読めば開発を始められます。

AI 協働体制での開発や、プロジェクト全体の構成・ゲーム追加手順は [DEVELOPMENT.md](DEVELOPMENT.md) を参照してください。守るべきルール（ブランチ運用・TDD・コーディング規約）は AI 利用時と共通です。

## セットアップ

必要なもの: Node.js 24 系 / npm（AI 用の Claude Code・Codex CLI は不要）

```bash
git clone https://github.com/imunida-0321/waipa.git
cd waipa
npm install
cp .env.example .env   # Supabase の URL / anon キーを設定（実値はチーム内の安全な経路で受け取る）
npm start              # Expo 開発サーバー起動（iOS: npm run ios / Android: npm run android）
```

## 開発フロー

### 1. Issue を確認してブランチを切る

作業は必ず Issue 単位。`develop` が統合ブランチです（`main` への直接変更は禁止）。

```bash
git checkout develop && git pull
git checkout -b feature/<issue番号>-<短い名前>   # 例: feature/64-cross-derby
# 軽微な修正は fix/... 、雑務は chore/...
```

### 2. RED — 先にテストを書く

実装より先にテストを書きます（テストファースト必須）。

```bash
# 例: 新ゲームの engine を作る場合
# src/games/<game-id>/__tests__/engine.test.ts にテストを書いてから:
npx jest src/games/<game-id>/ --watch
```

この時点でテストが**失敗することを確認**してください。「書いたテストがまだ落ちる」ことが、テストが仕様を検証している証拠になります。

### 3. GREEN — テストを通す最小実装を書く

watch モードのまま実装し、グリーンになるまで直します。テストが要求していない先回りの処理（エラーハンドリング・最適化・汎用化）はこの段階では書きません。

### 4. REFACTOR — テストを緑に保ったまま整理する

重複除去・命名改善・関数分割のみ。ここで新機能やテストの変更はしません。

### 5. セルフチェック — PR 前に全部通す

```bash
npm test              # 全テスト
npm run typecheck     # TypeScript 型チェック
npm run lint          # ESLint
npm run format:check  # フォーマット確認（崩れていたら npm run format で整形）
```

### 6. 動作確認

`npm start` で Expo を起動し、実機または Expo Go で該当画面・ゲームを実際に触って確認します。

### 7. PR を出す

`develop` 宛てに PR を作成します。本文には以下を書きます:

- 変更概要と対応 Issue（`Closes #64` 等）
- テスト結果（全件グリーンであること）
- UI 変更がある場合はスクリーンショット

マージはレビュー（人間または Claude）を経てから行います。

## 守るべき規約

### コーディング規約

- タブ幅4（タブインデント）・セミコロンなし・シングルクォート
- 手で覚える必要はなく、`npm run format`（Prettier）が自動で整えます

### テスト規約

- **テストが失敗したとき、実装に合わせてテストを書き換えて通さない**。テストは仕様であり、直すのは実装側
- `.skip` / `.only` をコミットに残さない
- テストコードで `any` を使わない
- `Date.now()` や実タイマーに依存しない。タイマー系は `jest.useFakeTimers()` を使う
- 実ネットワーク・実 Supabase に接続するテストを書かない（モックする）
- React 19 では同期 `act` / `renderHook` はタイマー系テストで失敗する。必ず `await act(async () => ...)` を使う（参照実装: `src/games/kimagure-ox/__tests__/`）

### セキュリティ

- 秘密情報（`.env` 系ファイル・API 秘密鍵・署名証明書）を絶対にコミットしない
- 閲覧・共有してよいのは `.env.example`（ダミー値）のみ

## よく使うコマンド

| コマンド | 用途 |
| --- | --- |
| `npm start` | Expo 開発サーバー起動 |
| `npm test` | 全テスト実行 |
| `npx jest src/games/<id>/` | 特定ゲームのテストだけ実行 |
| `npx jest <path> --watch` | watch モード（TDD 中はこれ） |
| `npx jest --coverage` | カバレッジ計測（目安: Lines 80% 以上を維持） |
| `npm run typecheck` | TypeScript 型チェック |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier 整形 / 確認 |

## 新しいゲームを追加する場合

ディレクトリ構成・「純関数 engine + reducer + フェーズ分岐画面」アーキテクチャ・registry 登録・画像の命名規則は [DEVELOPMENT.md の「新しいゲームの追加方法」](DEVELOPMENT.md#新しいゲームの追加方法) を参照してください（AI 利用の有無に関わらず同じ手順です）。
