# WaiPa 開発ガイド

このドキュメントは **人間向け** の開発ガイドです。プロジェクトに参加する人（将来の自分を含む）が、開発の流れと約束事を把握するために読みます。

AI エージェント向けの規約は別ファイルにあります:

- [CLAUDE.md](../CLAUDE.md) — Claude Code 向け（プロジェクト仕様・TDD 運用・セキュリティポリシー）
- [AGENTS.md](../AGENTS.md) — Codex CLI 向け（コーディング規約・テスト規約）

## 開発体制 — 3者分業

このプロジェクトは普段「人間 × Claude × Codex」の分業体制で開発しています。ただし AI の利用は必須ではなく、人間が直接コーディングする場合も同じルール（ブランチ運用・TDD・コーディング規約）に従えば問題ありません（後述「[AI を使わない開発フロー](#ai-を使わない開発フロー手動開発)」参照）。

```
人間（プロダクトオーナー）
  │  「〇〇を実装して」と依頼 / 成果物の確認 / PR マージ
  ▼
Claude Code（オーケストレーター & レビュアー）
  │  設計・タスク分解・Codex への指示文作成
  │  diff レビュー・テスト実行・PR 作成
  ▼
Codex CLI（コーダー）
     指示された範囲のコーディングと単体テスト作成
```

| 役割 | 担当 | 主な仕事 |
| --- | --- | --- |
| 人間 | プロダクトオーナー | 何を作るか決める・Issue 化・実機確認・PR マージ |
| Claude Code | 設計 / 指示 / 評価 | ブランチ作成、タスク分解、Codex への指示、RED/GREEN ログの検証、diff レビュー、PR 作成 |
| Codex CLI | 実装 | `codex exec` 経由でテストとコードを書く（AGENTS.md を自動読込） |

依頼の仕方の例: 「Issue #64 を実装して。コーディングは codex に任せて」

## セットアップ

必要なもの:

- Node.js 24 系 / npm
- Claude Code（オーケストレーター）
- Codex CLI（コーダー）: `brew install codex` → `codex login`（ChatGPT アカウント）

```bash
git clone https://github.com/imunida-0321/waipa.git
cd waipa
npm install
cp .env.example .env   # Supabase の URL / anon キーを設定（実値の共有はチーム内の安全な経路で）
npm start              # Expo 開発サーバー起動
```

## 開発フロー

1. **Issue を立てる** — 機能・バグ・TestPlan はすべて Issue 化する
2. **ブランチを切る** — `develop` ベースで Issue ごとに 1 ブランチ（例: `feature/62-odeko-poker`、軽微なら `chore/...` / `fix/...`）
3. **（大きめの機能のみ）計画を書く** — superpowers の形式で [docs/superpowers/plans/](superpowers/plans/) に実装計画、[docs/superpowers/specs/](superpowers/specs/) に設計スペックを置く
4. **TDD で実装する** — 後述の「TDD 運用」参照
5. **PR を出す** — `develop` 宛て。Claude のレビュー（diff・テスト・規約チェック）を経て人間がマージ
6. **並列作業** — 独立したタスクは git worktree（`.claude/worktrees/`）で分離して同時進行できる

## AI を使わない開発フロー（手動開発）

AI を介さず人間が直接コーディングする場合も、ブランチ運用と TDD は同じです。AI 分業との違いは「Claude がやっている検証を自分でやる」ことだけです。

1. **Issue を確認してブランチを切る**

   ```bash
   git checkout develop && git pull
   git checkout -b feature/<issue番号>-<短い名前>
   ```

2. **RED — 先にテストを書く**

   ```bash
   # 例: 新ゲームの engine を作る場合
   #   src/games/<game-id>/__tests__/engine.test.ts にテストを書いてから
   npx jest src/games/<game-id>/ --watch   # 失敗することを確認
   ```

3. **GREEN — テストを通す最小実装を書く** — watch モードのまま実装し、グリーンになるまで直す
4. **REFACTOR** — テストを緑に保ったまま整理する
5. **セルフチェック** — PR 前に以下をすべて通す

   ```bash
   npm test              # 全テスト
   npm run typecheck     # 型チェック
   npm run lint          # ESLint
   npm run format:check  # フォーマット（崩れていたら npm run format）
   ```

6. **動作確認** — `npm start` で Expo を起動し、実機または Expo Go で該当ゲームを触って確認
7. **PR を出す** — `develop` 宛て。変更概要・テスト結果・（UI 変更なら）スクリーンショットを本文に書く

守るべき規約は AI と共通です:

- コーディング規約: タブ幅4・セミコロンなし・シングルクォート（`npm run format` が整えてくれる）
- テスト規約: [AGENTS.md](../AGENTS.md) の「テスト規約」（テストを実装に合わせない・`.skip` 残置禁止・fake timers 等）
- 秘密情報（`.env` 系）をコミットしない

## TDD 運用（2026-07-15 導入）

テストファーストが必須です。順序は **RED → GREEN → REFACTOR**:

1. **RED** — 失敗するテストを書き、実行して失敗を確認する（失敗ログを残す）
2. **GREEN** — テストを通す最小実装を書く。テストが要求していない先回り実装はしない
3. **REFACTOR** — テストを緑に保ったまま重複除去・命名改善のみ行う

Codex に委任するときは、Claude が指示を「① テスト作成（RED）→ ② 実装（GREEN）」の 2 段階に分けて投げ、各段階の実行ログを検証してから次へ進めます（Evaluator 役）。

禁止事項（詳細は [AGENTS.md](../AGENTS.md)）:

- テストが失敗したとき、実装に合わせてテストを書き換えて通す（テストは仕様。直すのは実装側）
- `.skip` / `.only` の残置、テストコードでの `any`
- 実タイマー・`Date.now()` 依存（`jest.useFakeTimers()` を使う）、実ネットワーク・実 Supabase への接続

カバレッジは `npx jest --coverage` で計測できます（2026-07-15 時点: Lines 85.97%）。目標値の強制はまだ設けていませんが、80% を下回らないことを目安にします。

## よく使うコマンド

| コマンド | 用途 |
| --- | --- |
| `npm start` | Expo 開発サーバー起動（`npm run ios` / `npm run android` も可） |
| `npm test` | 全テスト実行 |
| `npx jest src/games/<id>/` | 特定ゲームのテストだけ実行 |
| `npx jest --coverage` | カバレッジ計測 |
| `npm run typecheck` | TypeScript 型チェック |
| `npm run lint` | ESLint |
| `npm run format` | Prettier で整形（タブ幅4・セミコロンなし・シングルクォート） |

## ディレクトリ構成

```
src/
├── app/          # Expo Router の画面（ルーティング）
├── games/        # 各ゲーム本体（1ゲーム = 1ディレクトリ）
│   └── registry.ts   # 全ゲームのメタ情報登録（ホームのグリッドはここから生成）
├── components/   # 共通 UI（home/ game/ ui/）
├── hooks/        # 共通フック
├── lib/          # ストア・課金・ハプティクス等のロジック
├── theme/        # デザイントークン（カラー・タイポ）
├── constants/    # 定数
└── types/        # 型定義
docs/
├── superpowers/plans/   # 実装計画（TDD ステップ付き）
├── superpowers/specs/   # 設計スペック
└── design/              # デザイン関連
```

## 新しいゲームの追加方法

アーキテクチャは「**純関数 engine + reducer + フェーズ分岐画面**」方式で統一しています（参照実装: [src/games/odeko-poker/](../src/games/odeko-poker/)、[src/games/daut-dice/](../src/games/daut-dice/)）。

1. `src/games/<game-id>/` を作成
   - `engine.ts` — 運要素・判定ロジックの純関数（UI 抜きで単体テストできる形にする）
   - `reducer.ts` — フェーズ遷移とプレイヤー送り
   - `<game-id>-game.tsx` — エントリコンポーネント（フェーズで画面を出し分け）
   - `theme.ts` — ゲーム固有のカラー
   - `__tests__/` — engine / reducer / 各画面のテスト
2. `src/games/registry.ts` に `GameMeta` を登録（id・title・tagline・emoji・gradient・対応人数・`premium` フラグ等）
3. 画像を用意する場合は `assets/images/<ゲームID>/intro.jpg`（1:1・512px）と `card.jpg`（1.3:1・1040×800、タイトル文字入り）
4. タイマーを使うテストは `jest.useFakeTimers()` + `await act(async () => ...)`（React 19 では同期 act が失敗する。参照: kimagure-ox のテスト）

## セキュリティ

- 秘密情報ファイル（`.env` 系・署名証明書・API 秘密鍵）は **AI に読ませない**
  - Claude 側: PreToolUse フック [.claude/hooks/block-env-access.sh](../.claude/hooks/block-env-access.sh) が機械的にブロック
  - Codex 側: AGENTS.md の禁止規定＋サンドボックス＋Claude のレビューでカバー
- フックは Bash コマンド文字列中の「.env」という文字列にも反応するため、コミットメッセージや PR 本文にこの文字列を含めると実行がブロックされる。「環境変数ファイル」等に言い換えること
- 閲覧してよいのは `.env.example`（ダミー値）のみ
