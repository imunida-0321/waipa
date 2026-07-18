# 乾杯ウルフ（ワードウルフ改造）設計

2026-07-16 確定。既存ワードウルフ（#59 / `docs/superpowers/specs/2026-07-12-word-wolf-design.md`）を
オリジナルゲーム「乾杯ウルフ」に改造する。ブレインストーミングでの決定事項と設計をまとめる。

## コンセプト

ワードウルフに「乾杯トリガー」を追加する。各ラウンドに1つだけ**公開ルール**（全員が知っている乾杯条件）を置き、
議論中にその条件が満たされたら乾杯する。推理ゲームなのに、乾杯のタイミングで空気が変わる。

## 決定事項

- **既存ワードウルフを置き換える**（別ゲーム追加やモード切替ではない）。ゲーム数は増えない
- **リネームは全面的に行う**: フォルダ `src/games/word-wolf` → `src/games/kanpai-wolf`、ゲーム ID `word-wolf` → `kanpai-wolf`、表示名「乾杯ウルフ」
- **アプリの役割は「表示＋乾杯ボタン」**: トリガー発動の判定は人間（プレイヤー）に任せる。
  アプリは議論画面にルールを常時表示し、「🍻 乾杯！」ボタンで効果音・ハプティクス・回数カウントの演出を担う
- **トリガーはアプリ内蔵の固定リスト**: 毎ラウンドランダムに1つ選択（連戦の重複回避付き）。
  Supabase 配信は将来の拡張とし、今回はやらない（choosePair と同じ関数シグネチャにして差し替え可能にしておく）
- **乾杯回数は勝敗に影響しない**: リザルト画面に「このラウンドの乾杯 🍻 × N回」として表示するだけのフレーバー
- **プレミアム枠は維持**: `premium: true` のまま。ゲート機構は既存共通部品をそのまま利用
- ワードウルフ本体のルール（配役・議論・投票・決選・逆転チャンス）は**一切変更しない**

## トリガー内蔵リスト（初期12個）

| id            | text                                   |
| ------------- | -------------------------------------- |
| question      | 誰かが質問されたら全員乾杯             |
| silence       | 3秒沈黙したら全員一口                  |
| wakaru        | 誰かが「わかる」と言ったらその人が一口 |
| majority-look | 多数派っぽい発言をした人を指名して乾杯 |
| before-doubt  | ウルフだと思う人に質問する前に乾杯     |
| laugh         | 誰かが笑ったら全員乾杯                 |
| name-call     | 名前を呼ばれた人は一口                 |
| maybe         | 「たぶん」「かも」を言ったら本人が一口 |
| repeat        | 直前の人と同じ単語を使ったら全員乾杯   |
| point         | 誰かを指さしたら指した人が一口         |
| agree-all     | 全員がうなずいたら全員乾杯             |
| keigo         | 敬語を使ったら本人が一口               |

- 文言は「一口」「乾杯」主体。**「飲め」等の強制表現・敗者飲酒の直接表現は使わない**（daut-dice / 飲酒衰弱と同方針、レーティング配慮）
- ソフトドリンクでも成立する文言にする（「一口」は飲み物を選ばない）

## ゲームフロー（フェーズ）

```
setup → deal → trigger-reveal（新規）→ discuss → vote → … → result
```

- `trigger-reveal`: 配布完了後・議論開始前に「🍻 今回の乾杯ルール」としてトリガー文をドンと発表する画面。
  「議論スタート」タップで discuss へ
- `runoff-discuss`（再議論）の前には trigger-reveal を挟まない（同ラウンド中はトリガー据え置き、
  discuss 画面に常時表示されているため再発表は不要）
- 「もう一回」（retry）では新しいトリガーを選び直す。遷移は start と同じ deal → trigger-reveal → discuss
- それ以外のフェーズ遷移は既存ワードウルフのまま

## 状態設計（差分）

```ts
// engine.ts に追加
export type KanpaiTrigger = { id: string; text: string }
export const TRIGGERS: readonly KanpaiTrigger[] = [/* 上記12個 */]
// choosePair と同じ枯渇リセット方式: 未使用から選び、全部使用済みなら used を無視して選び直す
export function chooseTrigger(usedIds: readonly string[], rng: Rng): KanpaiTrigger

// reducer.ts の差分
type Phase =
	| 'setup'
	| 'deal'
	| 'trigger-reveal'
	| 'discuss'
	| 'vote'
	| 'runoff-discuss'
	| 'reveal'
	| 'reversal'
	| 'result'
type GameState = {
	// …既存フィールドはそのまま…
	trigger: KanpaiTrigger | null // 今ラウンドの公開ルール
	kanpaiCount: number // 今ラウンドの乾杯回数（演出用）
	usedTriggerIds: string[] // 連戦の重複回避（usedPairIds と同パターン）
}
type Action =
	// start / retry は pair と同様に trigger も外から注入（reducer は純関数を保つ）
	| { type: 'start'; config: StartConfig; pair: WordPair; trigger: KanpaiTrigger; rng: Rng }
	| { type: 'retry'; pair: WordPair; trigger: KanpaiTrigger; rng: Rng }
	| { type: 'triggerRevealDone' } // trigger-reveal → discuss
	| { type: 'kanpai' } // discuss / runoff-discuss 中のみ有効。kanpaiCount +1
// …既存アクションはそのまま…
```

- `newRound` の遷移先を `deal` のまま維持し、`dealtOne` の最終遷移を `discuss` → `trigger-reveal` に変更
- `kanpai` は `discuss` / `runoff-discuss` 以外では no-op（フェーズガード）
- `usedTriggerIds` は `usedPairIds` と同じ蓄積・リセット規則（chooseTrigger が used をリセットして返した
  trigger は既にリストにある → リストを作り直す）
- `kanpaiCount` は newRound で 0 にリセット。ラウンドをまたいで合算しない

## 画面（差分）

```
src/games/kanpai-wolf/
  trigger-reveal-screen.tsx  // 新規:「🍻 今回の乾杯ルール」発表
  discuss-screen.tsx         // 変更: トリガー常時表示カード＋「🍻 乾杯！」ボタン＋回数バッジ
  result-screen.tsx          // 変更: 勝敗の下に「このラウンドの乾杯 🍻 × N回」
  （他ファイルはリネームのみ・ロジック不変）
```

- **trigger-reveal-screen（新規）**: 見出し「🍻 今回の乾杯ルール」→ トリガー文を大きく表示 →
  ヒント「議論中にこのルールが起きたら、みんなで乾杯！」→ GradientButton「議論スタート」
- **discuss-screen（変更）**: タイマー上部にトリガー文の常時表示カード（サーフェス色・🍻アイコン付き）。
  画面下部（「投票へすすむ」の上）に「🍻 乾杯！」ボタン。タップで
  `playSound('cheers')`（音源未登録の間は無音スキップ、#75 方式）＋ `haptics.heavy()` ＋
  回数バッジ（🍻 × N）がポンと跳ねる演出。`onKanpai` コールバックを props で受け、
  reducer へ `{ type: 'kanpai' }` を dispatch。runoff-discuss でも同じ表示
- **result-screen（変更）**: 勝敗発表・お題ペア公開の下に「このラウンドの乾杯 🍻 × N回」を1行追加（N=0 でも表示）

## リネームの影響範囲

| 対象                                                                                                  | 対応                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/games/word-wolf/`                                                                                | `src/games/kanpai-wolf/` へ移動（`word-wolf-game.tsx` → `kanpai-wolf-game.tsx`、コンポーネント名 `WordWolfGame` → `KanpaiWolfGame`）                                                             |
| registry.ts                                                                                           | `id: 'kanpai-wolf'`、`title: '乾杯ウルフ'`、絵文字 🍻、tagline / catchCopy / summary / howToPlay を乾杯トリガー込みに全面更新                                                                    |
| registry の thumbnail / cardThumbnail                                                                 | 既存画像（`assets/images/word-wolf/`）には「ワードウルフ」のタイトル文字が入っている前提のため**一旦外す**（絵文字＋グラデのフォールバック表示）。新アートは他ゲーム同様に後日追加（#75 と同枠） |
| `src/lib/word-pairs-store.ts` / Supabase `word_pairs` テーブル / キャッシュキー `waipa.word_pairs.v1` | **変更しない**。お題ペアの供給機構はゲーム名と独立した資産として現名称を維持（DB マイグレーションと既存キャッシュ破棄を避ける）                                                                  |
| CLAUDE.md「収録ゲーム候補」                                                                           | ワードウルフの行を「乾杯ウルフ – ワードウルフに公開乾杯ルールを1つ足した推理×乾杯ゲーム（プレミアム）」に更新                                                                                    |
| `src/games/__tests__/registry.test.ts`                                                                | 期待値を新 ID・新タイトルに更新                                                                                                                                                                  |

- 未リリースアプリのため、旧 ID `word-wolf` の互換維持（リダイレクト等）は不要

## テスト方針（TDD・RED→GREEN→REFACTOR）

- **engine**: `chooseTrigger` — 未使用から選ぶ / 全使用済みで used を無視して再抽選 / 返り値が TRIGGERS の要素 /
  rng 注入で決定的に選べる。`TRIGGERS` — id 重複なし・text 非空
- **reducer**:
    - `dealtOne` 最終 → `trigger-reveal`、`triggerRevealDone` → `discuss`
    - `start` / `retry` で trigger がセットされ `usedTriggerIds` が蓄積、枯渇時リセット
    - `kanpai`: discuss / runoff-discuss でカウント +1、他フェーズは no-op、newRound で 0 リセット
    - 既存遷移（vote / runoff / reveal / reversal / result）が壊れていないこと（既存テストの維持）
- **コンポーネント**:
    - trigger-reveal-screen: トリガー文の表示、「議論スタート」で onDone
    - discuss-screen: トリガー文の常時表示、乾杯ボタンタップで onKanpai 発火＋回数表示更新、
      runoff でも表示、既存タイマー挙動（チクタク加速）の維持（fake timers）
    - result-screen: 乾杯回数の表示（0 回含む）
- React 19 規約: `await render` / `await act`（kimagure-ox 参照実装）。実タイマー・`Date.now()` 禁止

## スコープ外（YAGNI）

- 沈黙・音声のマイク自動検知（ささやきリミット技術の流用）
- トリガーの Supabase 配信・パック化
- 乾杯回数の勝敗への反映（最多乾杯ラウンドのボーナス等）
- ラウンドをまたぐ乾杯回数の累計・統計
- ソフトドリンクモード等の文言切替設定
