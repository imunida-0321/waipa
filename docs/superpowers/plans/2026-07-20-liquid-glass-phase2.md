# Liquid Glass フェーズ2 実装計画（#125）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ゲーム内のパネル系 UI（33箇所）とホームのカード面を `GlassSurface` に差し替える。プレイ盤面系（15箇所）は現状維持。

**Architecture:** フェーズ1（#124）で確立した `GlassSurface` を使う機械的な差し替え。変換レシピは全箇所共通で、対象・variant は下表で確定済み。新規コンポーネントなし。

**Tech Stack:** フェーズ1と同一（GlassSurface / glass トークン / 既存 Jest 基盤）

**Spec:** Issue #125 ＋ `docs/superpowers/specs/2026-07-20-liquid-glass-ui-design.md` フェーズ2節

## Global Constraints

- コードフォーマット: タブインデント・セミコロンなし・シングルクォート
- TDD: バッチごとに RED（テスト追記→失敗確認）→ GREEN（実装→パス確認）→ コミット
- テスト規約: `await render(...)`・日本語テスト名・既存モック流用・`any` 禁止
- 作業ブランチ: `feat/125-liquid-glass-phase2`（作成済み）
- **variant ルール（フェーズ1の1画面1枚 blur ルールの適用）**: 浮いているレイヤーの外殻パネル1枚だけ `variant="overlay"`。モーダル内側の行・チップ・タブ・入力ボックス、および常設の情報パネルはすべて既定の `card`（疑似ガラス）
- board 分類（15箇所）は**変更しない**: gauge.track / chinchiro-play.rulesButtonPressed / daut-dice-game.peekPad / declare-list.item / lives-bar.chip / kanpai-wolf deal-pass.wordPad / vote-screen.row / kimagure-ox board.cell / no-king count-select.stepBtn / deal-pass.numberPad / reaction-pairs card-grid.face / who-will-pay amount-entry.display・button・buttonPressed / burst-chicken addBtn

## 共通変換レシピ

各対象について:

1. `import { GlassSurface } from '@/components/ui/glass-surface'` を追加
2. 対象スタイルを使う `<View style={styles.X}>` を `<GlassSurface style={styles.X}>`（overlay 対象は `variant="overlay"` 付き）に差し替え。Pressable が対象の場合は Pressable を残し、視覚スタイルだけ内側の GlassSurface へ移す
3. `styles.X` から `backgroundColor` と灰色枠（`borderWidth`/`borderColor: colors.surfaceBorder`）を削除。**色付き枠（金・赤・紫等）とレイアウト・角丸・padding は残す**（style 配列で GlassSurface の白枠に勝つ）
4. テスト: 対象ファイルの既存テストに `glass-surface-pseudo`（overlay 対象は `glass-surface-blur`）の存在アサーションを1本追記。テストがないファイルは最小テストを新規作成

## 対象一覧（variant 確定）

**overlay（外殻パネル6箇所）:**

| ファイル | スタイル | 内容 |
|---|---|---|
| chinchiro/rules-modal.tsx | sheet | Modal シート本体（テスト新規） |
| no-king-game/premium-pack-modal.tsx | sheet | Modal シート本体 |
| kimagure-ox/event-cutin.tsx | L74 のパネル | イベントカットイン |
| daut-dice/reveal-overlay.tsx | penalty | オーバーレイ内ペナルティ表示 |
| inshu-suijaku/punish-reveal.tsx | card | オーバーレイ内リビールカード |
| reaction-pairs/punish-reveal.tsx | card | オーバーレイ内リビールカード |

**card（既定・27箇所）:**

| ファイル | スタイル |
|---|---|
| bomb-relay/bomb-relay-game.tsx | topicCard |
| bomb-swipe/bomb-swipe-game.tsx | turnRow |
| bomb-swipe/round-result.tsx | row |
| burst-chicken/burst-chicken-game.tsx | turnRow |
| burst-chicken/round-result.tsx | rankingCard |
| chinchiro/result.tsx | card |
| daut-dice/respond-screen.tsx | card |
| daut-dice/result-screen.tsx | row（テスト新規） |
| five-sec-stop/result.tsx | card |
| inshu-suijaku/custom-punishments-sheet.tsx | setChip / toggleRow / tabs / tabActive / itemRow / segment / segmentBtnActive / inputBox |
| inshu-suijaku/result-screen.tsx | row |
| inshu-suijaku/size-select.tsx | customRow / option |
| kanpai-wolf/discuss-screen.tsx | triggerCard |
| kanpai-wolf/result-screen.tsx | card |
| kanpai-wolf/setup-screen.tsx | chip |
| kanpai-wolf/trigger-reveal-screen.tsx | card |
| no-king-game/count-select.tsx | packRow |
| no-king-game/topic-reveal.tsx | topicCard |
| odeko-poker/result-screen.tsx | row |
| reaction-pairs/player-roulette.tsx | row |
| reaction-pairs/reaction-pairs-game.tsx | header |
| reaction-pairs/result-screen.tsx | row |
| who-will-pay/result.tsx | summary（テスト新規） |

**ホーム（#44 カード面・ユーザー承認済み）:**

- `components/home/game-card.tsx`: `<View testID="game-card-surface" style={styles.surface}>` → `<View testID="game-card-surface"><GlassSurface style={styles.surface}>…</GlassSurface></View>`（testID 維持のため View で包む）。`styles.surface` から bg/枠を外す
- `game-card.test.tsx` の「サーフェス背景のカード面で包む」テストは「ガラス面で包む」検証（`within(surface).getByTestId('glass-surface-pseudo')` ＋ キャッチ内包）に**仕様変更**する

### 注意点

- `tabActive` / `segmentBtnActive` / `chinchiro-play.rulesButtonPressed` のような「状態で切り替わる背景」のうち、**アクティブ状態スタイル（tabActive / segmentBtnActive）は JSX が `[styles.tab, active && styles.tabActive]` 形式**のため GlassSurface 化できない → この2箇所は `backgroundColor` を `glass.fallbackFill` への置き換えのみ行う（コンポーネント差し替えなし）
- 同様に条件付き適用のスタイルは「土台が常に GlassSurface、条件スタイルは上書き」の形にできる場合のみ差し替える。できない場合は fallbackFill 置換に留め、判断をコミットメッセージに記す

---

### Task 1: バッチA — chinchiro / five-sec-stop / who-will-pay / bomb-relay

**Files:** chinchiro/result.tsx・rules-modal.tsx（テスト新規: `games/chinchiro/__tests__/rules-modal.test.tsx`）、five-sec-stop/result.tsx、who-will-pay/result.tsx（テスト新規: `games/who-will-pay/__tests__/result-glass.test.tsx`）、bomb-relay/bomb-relay-game.tsx ＋ 各既存テスト

- [ ] RED: 上表の対象にガラス検証テストを追記/新規作成、失敗確認
- [ ] GREEN: 共通レシピで差し替え、パス確認（`npx jest src/games/chinchiro src/games/five-sec-stop src/games/who-will-pay src/games/bomb-relay`）
- [ ] コミット: `feat: ガラス化バッチA（chinchiro/5秒STOP/Who will pay/爆弾リレー）`

### Task 2: バッチB — daut-dice / burst-chicken / bomb-swipe

**Files:** daut-dice/respond-screen.tsx・result-screen.tsx（テスト新規）・reveal-overlay.tsx（overlay）、burst-chicken/burst-chicken-game.tsx（turnRow のみ）・round-result.tsx、bomb-swipe/bomb-swipe-game.tsx（turnRow）・round-result.tsx ＋ 各既存テスト

- [ ] RED → GREEN → コミット（バッチAと同手順、`npx jest src/games/daut-dice src/games/burst-chicken src/games/bomb-swipe`）

### Task 3: バッチC — kanpai-wolf / kimagure-ox

**Files:** kanpai-wolf/discuss-screen.tsx・result-screen.tsx・setup-screen.tsx・trigger-reveal-screen.tsx、kimagure-ox/event-cutin.tsx（overlay）＋ 各既存テスト

- [ ] RED → GREEN → コミット（`npx jest src/games/kanpai-wolf src/games/kimagure-ox`）

### Task 4: バッチD — inshu-suijaku

**Files:** custom-punishments-sheet.tsx（8箇所、tabActive/segmentBtnActive は fallbackFill 置換）、punish-reveal.tsx（overlay）、result-screen.tsx、size-select.tsx ＋ 各既存テスト

- [ ] RED → GREEN → コミット（`npx jest src/games/inshu-suijaku`）

### Task 5: バッチE — no-king-game / reaction-pairs / odeko-poker

**Files:** no-king-game/count-select.tsx（packRow）・premium-pack-modal.tsx（overlay）・topic-reveal.tsx、reaction-pairs/player-roulette.tsx・punish-reveal.tsx（overlay）・reaction-pairs-game.tsx（header）・result-screen.tsx、odeko-poker/result-screen.tsx ＋ 各既存テスト

- [ ] RED → GREEN → コミット（`npx jest src/games/no-king-game src/games/reaction-pairs src/games/odeko-poker`）

### Task 6: ホームカード面（#44 仕様変更）

**Files:** components/home/game-card.tsx、game-card.test.tsx

- [ ] RED: 「サーフェス背景」テストを「ガラス面」検証に書き換え、失敗確認
- [ ] GREEN: 上記のとおり View（testID 維持）＋ GlassSurface 構造に変更、パス確認
- [ ] コミット: `feat: ホームのカード面をガラス化（#44 テスト仕様変更）`

### Task 7: 全体検証と PR

- [ ] `npx jest` 全パス / `npx tsc --noEmit` / `npx eslint src`
- [ ] iOS シミュレータでリザルト画面・モーダル・ホームの目視確認（スクリーンショット取得）
- [ ] push → PR 作成（base: develop、`Closes #125`、before/after 画像添付）
