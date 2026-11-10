# WaiPa 開発ガイド

このドキュメントは **人間向け** の開発ガイドです。プロジェクトに参加する人（将来の自分を含む）が、開発の流れと約束事を把握するために読みます。

AI エージェント向けの規約は別ファイルにあります:

- [CLAUDE.md](../CLAUDE.md) — Claude Code 向け（プロジェクト仕様・TDD 運用・セキュリティポリシー）
- [AGENTS.md](../AGENTS.md) — コーディング規約・テスト規約（Codex CLI 向けに書かれたもの。テスト規約は Claude も参照する）

アプリ全体の構造（画面遷移・ディレクトリの責務・外部サービスとの接続・プレミアム判定の流れ）は [ARCHITECTURE.md](ARCHITECTURE.md) にまとめています。

## 開発体制

このプロジェクトは普段「人間 × Claude」の分業で開発しています。2026-11-06 に、実装を Codex CLI へ委任する体制（人間 × Claude × Codex の3者分業）をやめ、設計から実装・PR 作成までを Claude が行う体制に変えました。AI の利用は必須ではなく、人間が直接コーディングする場合も同じルール（ブランチ運用・TDD・コーディング規約）に従えば問題ありません（後述「[AI を使わない開発フロー](#ai-を使わない開発フロー手動開発)」参照）。

| 役割        | 担当               | 主な仕事                                                                              |
| ----------- | ------------------ | ------------------------------------------------------------------------------------- |
| 人間        | プロダクトオーナー | 何を作るか決める・Issue 化・実機確認                                                  |
| Claude Code | 設計 / 実装 / 検証 | ブランチ作成、タスク分解、TDD での実装、テスト実行、PR 作成、検証が通った PR のマージ |

依頼の仕方の例: 「Issue #64 を実装して」

## セットアップ

リポジトリ直下の [README.md](../README.md#セットアップ) を参照してください（AI 協働体制で使う Claude Code / Codex CLI の導入手順もそちらに記載）。

## 開発フロー

1. **Issue を立てる** — 機能・バグ・TestPlan はすべて Issue 化する
2. **ブランチを切る** — `develop` が統合ブランチ。`main` への直接変更は禁止。`develop` ベースで Issue ごとに 1 ブランチ（例: `feature/62-odeko-poker`、軽微なら `chore/...` / `fix/...`）
3. **（大きめの機能のみ）計画を書く** — superpowers の形式で [docs/superpowers/plans/](superpowers/plans/) に実装計画、[docs/superpowers/specs/](superpowers/specs/) に設計スペックを置く
4. **TDD で実装する** — 後述の「TDD 運用」参照
5. **PR を出す** — `develop` 宛て。PR を開くと Codex の自動レビューが走る。レビューの結果と検証（テスト・型チェック・lint・整形チェック）を確認してからマージする
6. **並列作業** — 独立したタスクは git worktree（`.claude/worktrees/`）で分離して同時進行できる

## AI を使わない開発フロー（手動開発）

AI を介さず人間が直接コーディングする場合の手順は、**[DEVELOPMENT-MANUAL.md](DEVELOPMENT-MANUAL.md)** にまとめています（ブランチ作成や watch モードの実行例・セルフチェック・動作確認・PR 本文の書き方）。共通のセットアップ・ブランチ運用・TDD・コーディング規約は本書を正とし、手動開発ガイドから該当節を参照します。

## TDD 運用（2026-07-15 導入）

テストファーストが必須です。順序は **RED → GREEN → REFACTOR**:

1. **RED** — 失敗するテストを書き、実行して失敗を確認する（失敗ログを残す）
2. **GREEN** — テストを通す最小実装を書く。テストが要求していない先回り実装（エラーハンドリング・最適化・汎用化）はしない
3. **REFACTOR** — テストを緑に保ったまま重複除去・命名改善・関数分割のみ行う。新機能の追加やテストの変更はしない

RED のテストと GREEN の実装はコミットを分け、RED の失敗ログを確認してから実装に進みます。

禁止事項（詳細は [AGENTS.md](../AGENTS.md)）:

- テストが失敗したとき、実装に合わせてテストを書き換えて通す（テストは仕様。直すのは実装側）
- `.skip` / `.only` の残置、テストコードでの `any`
- 実タイマー・`Date.now()` 依存（`jest.useFakeTimers()` を使う）、実ネットワーク・実 Supabase への接続

React 19 では同期 `act` / `renderHook` はタイマー系テストで失敗するため、必ず `await act(async () => ...)` を使います（参照実装: `src/games/kimagure-ox/__tests__/`）。

カバレッジは `npx jest --coverage` で計測できます（2026-07-15 時点: Lines 85.97%）。目標値の強制はまだ設けていませんが、80% を下回らないことを目安にします。

## コーディング規約

- タブ幅4（タブインデント）・セミコロンなし・シングルクォート
- Prettier で自動整形できます。変更したファイルだけを `npx prettier --write <path>` で整形します

## よく使うコマンド

| コマンド                   | 用途                                                            |
| -------------------------- | --------------------------------------------------------------- |
| `npm start`                | Expo 開発サーバー起動（`npm run ios` / `npm run android` も可） |
| `npm test`                 | 全テスト実行                                                    |
| `npx jest src/games/<id>/` | 特定ゲームのテストだけ実行                                      |
| `npx jest <path> --watch`  | watch モード（TDD 中の継続実行）                                |
| `npx jest --coverage`      | カバレッジ計測                                                  |
| `npm run typecheck`        | TypeScript 型チェック                                           |
| `npm run lint`             | ESLint                                                          |
| `npm run format`           | Prettier で整形（タブ幅4・セミコロンなし・シングルクォート）    |
| `npm run format:check`     | フォーマット確認                                                |

## ディレクトリ構成

```
src/
├── app/          # Expo Router の画面（ルーティング）
├── games/        # 各ゲーム本体（1ゲーム = 1ディレクトリ）
│   └── registry.ts   # 全ゲームのメタ情報登録（ホームのグリッドはここから生成）
├── components/   # 共通 UI（home/ game/ ui/）
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

独立したガイド **[ADDING-A-GAME.md](ADDING-A-GAME.md)** を参照してください。「純関数 engine + reducer + フェーズ分岐画面」アーキテクチャ、`meta.ts` の書き方と registry への登録（`GameMeta` の記入例つき）、画像の命名規則、チェックリストをまとめています。ゲームの追加に `src/app/` 側の変更は不要です（registry 駆動）。

## セキュリティ

- 秘密情報（`.env` 系ファイル・API 秘密鍵・署名証明書）は絶対にコミットしない
- 秘密情報ファイル（`.env` 系・署名証明書・API 秘密鍵）は **AI に読ませない**
    - Claude 側: PreToolUse フック [.claude/hooks/block-env-access.sh](../.claude/hooks/block-env-access.sh) が機械的にブロック
    - Codex 側: AGENTS.md の禁止規定＋サンドボックス＋Claude のレビューでカバー
- フックは Bash コマンド文字列中の「.env」という文字列にも反応するため、コミットメッセージや PR 本文にこの文字列を含めると実行がブロックされる。「環境変数ファイル」等に言い換えること
- 閲覧・共有してよいのは `.env.example`（ダミー値）のみ
