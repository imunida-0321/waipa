# 乾杯ウルフ（ワードウルフ改造）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存ワードウルフを「乾杯ウルフ」に全面リネームし、毎ラウンド1つの公開「乾杯ルール」（trigger-reveal フェーズ＋議論画面の常時表示＋🍻乾杯ボタン＋リザルト回数表示）を追加する。

**Architecture:** 純粋エンジン（`engine.ts` に `TRIGGERS` / `chooseTrigger` を追加）＋ reducer 状態機械（`trigger-reveal` フェーズと `kanpai` アクションを追加、乱数とトリガーは境界から注入）。画面は trigger-reveal-screen 新規1枚と discuss / result の差分のみ。ワードウルフ本体の推理ルールは無変更。

**Tech Stack:** Expo (React Native) / TypeScript / Jest + @testing-library/react-native

**スペック:** `docs/superpowers/specs/2026-07-16-kanpai-wolf-design.md`

## Global Constraints

- TDD 必須: RED（失敗テスト＋失敗ログ確認）→ GREEN（最小実装＋パス確認）→ REFACTOR。テストを実装に合わせて書き換えて通すのは禁止
- Codex 委任時は各タスクを「① RED ステップ群 → ② GREEN ステップ群」の2段階で投げ、Claude が各段階のログを検証する
- テスト実行: `npx jest`（全体）/ `npx jest <path>`（個別）。`.skip` / `.only` の残置禁止、テストでの `any` 禁止
- 実タイマー・`Date.now()` 禁止（`jest.useFakeTimers()`）。React 19 規約: `await render` / `await act`（kimagure-ox 参照実装）
- コード規約: タブインデント・セミコロンなし・シングルクォート（既存ファイルに合わせる）
- 文言規約: 「飲め」等の強制表現・敗者飲酒の直接表現は禁止。「乾杯」「一口」主体（ソフトドリンクでも成立する文言）
- `word-pairs-store` / Supabase `word_pairs` / キャッシュキー `waipa.word_pairs.v1` は**変更しない**
- 効果音 `cheers` の音源登録はしない（`playSound` は未登録音源を無音スキップする。#75 と同枠で後日）
- `assets/images/word-wolf/` の画像は削除も移動もしない（新アート生成の参照元として残す）。registry の thumbnail / cardThumbnail 参照だけ外す
- ブランチ: `feature/kanpai-wolf`（作成済み・スペックコミット済み）

---

### Task 1: word-wolf → kanpai-wolf 全面リネーム（挙動不変）

**Files:**

- Rename: `src/games/word-wolf/` → `src/games/kanpai-wolf/`（`word-wolf-game.tsx` → `kanpai-wolf-game.tsx`、テストも同様）
- Modify: `src/games/registry.ts`（word-wolf エントリ全面書き換え）
- Modify: `src/games/__tests__/registry.test.ts:64`（テスト名の文言）
- Modify: `CLAUDE.md:27`（収録ゲーム候補の行）

**Interfaces:**

- Consumes: なし（機械的リネーム）
- Produces: `KanpaiWolfGame`（`src/games/kanpai-wolf/kanpai-wolf-game.tsx`）、テーマ定数 `KW`（旧 `WW`、`src/games/kanpai-wolf/theme.ts`）。以降のタスクは全てこのパスを前提とする

- [ ] **Step 1: ファイル移動（git mv）**

```bash
git mv src/games/word-wolf src/games/kanpai-wolf
git mv src/games/kanpai-wolf/word-wolf-game.tsx src/games/kanpai-wolf/kanpai-wolf-game.tsx
git mv src/games/kanpai-wolf/__tests__/word-wolf-game.test.tsx src/games/kanpai-wolf/__tests__/kanpai-wolf-game.test.tsx
```

- [ ] **Step 2: 識別子の一括置換**

`src/games/kanpai-wolf/` 内の全 `.ts` / `.tsx` で:

- `WordWolfGame` → `KanpaiWolfGame`
- `from '../word-wolf-game'` → `from '../kanpai-wolf-game'`
- `WW` → `KW`（`theme.ts` の export と全画面の import / 使用箇所）

```bash
cd /Users/hiro/Desktop/Waipa
grep -rl "WordWolfGame\|word-wolf-game" src/games/kanpai-wolf | xargs sed -i '' -e 's/WordWolfGame/KanpaiWolfGame/g' -e 's/word-wolf-game/kanpai-wolf-game/g'
grep -rl "\bWW\b" src/games/kanpai-wolf | xargs sed -i '' -e 's/\bWW\b/KW/g'
```

`theme.ts` のコメントも更新:

```ts
// 乾杯ウルフの夜っぽい紫系（registry グラデと統一）
export const KW = {
	night: '#4834D4',
	violet: '#6C5CE7',
	wolf: '#A29BFE',
	danger: '#EE5253',
} as const
```

- [ ] **Step 3: registry.ts のエントリを全面書き換え**

import を `import { KanpaiWolfGame } from './kanpai-wolf/kanpai-wolf-game'` に変更（import 順はアルファベット順を維持: inshu-suijaku の後ろ、no-king-game の前後は既存順に合わせる）。エントリ（旧 `id: 'word-wolf'`）を以下に置換。**thumbnail / cardThumbnail は意図的に外す**（絵文字＋グラデのフォールバック表示。新アートは後日）:

```ts
	{
		id: 'kanpai-wolf',
		title: '乾杯ウルフ',
		tagline: 'お題は推理、乾杯はルールで！',
		emoji: '🍻',
		gradient: ['#6C5CE7', '#4834D4'],
		minPlayers: 3,
		maxPlayers: 12,
		requiresPlayers: true,
		premium: true,
		catchCopy: '1人だけ違うお題を見抜け！\nただし今夜は「乾杯ルール」つき！',
		summary:
			'このゲームは、1人だけ微妙に違うお題を持つ「ウルフ」を会話で探す推理ゲームです！さらに毎ラウンド1つだけ「乾杯ルール」（例: 誰かが質問されたら全員乾杯）が公開され、議論中に条件が起きたらみんなで乾杯！ウルフは吊られても市民のお題を当てれば逆転勝ちです！',
		howToPlay: [
			'① メンバーを登録（3〜12名）して、議論時間とお題パックを選ぼう！',
			'② スマホを回して自分のお題をこっそり確認。最後に「今回の乾杯ルール」が発表！',
			'③ 議論タイム！乾杯ルールの条件が起きたら🍻乾杯！しながらウルフを探そう',
			'④ 投票で最多票の正体を発表！ウルフなら市民の勝ち。ウルフがお題を当てたら逆転勝ち！',
		],
		Component: KanpaiWolfGame,
	},
```

- [ ] **Step 4: registry.test.ts のテスト名を更新**

64行目のテスト名 `ワードウルフ` → `乾杯ウルフ`:

```ts
it('MVP の8ゲーム＋プレミアム7本（バーストチキン・ダウトダイス・乾杯ウルフ・飲酒衰弱・爆弾スワイプ・ささやきリミット・おでこインディアンポーカー）が登録されている', () => {
	expect(games).toHaveLength(15)
})
```

- [ ] **Step 5: CLAUDE.md の収録ゲーム候補を更新**

27行目を置換:

```
• 乾杯ウルフ – ワードウルフに毎ラウンド1つの公開「乾杯ルール」を足した推理×乾杯ゲーム。お題パックは Supabase 配信（プレミアム）。
```

- [ ] **Step 6: 全テストがパスすることを確認**

Run: `npx jest`
Expected: 全 suite PASS（リネームのみで挙動不変。失敗したら置換漏れ — `grep -rn "word-wolf\|WordWolf" src/` で残置を探す）

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: word-wolf を kanpai-wolf に全面リネーム（乾杯ウルフ）"
```

---

### Task 2: engine — TRIGGERS / chooseTrigger（TDD）

**Files:**

- Modify: `src/games/kanpai-wolf/engine.ts`（末尾に追加）
- Test: `src/games/kanpai-wolf/__tests__/engine.test.ts`（末尾に describe 追加）

**Interfaces:**

- Consumes: `Rng`（engine.ts 既存型）
- Produces: `type KanpaiTrigger = { id: string; text: string }`、`const TRIGGERS: readonly KanpaiTrigger[]`（12個）、`function chooseTrigger(usedIds: readonly string[], rng: Rng): KanpaiTrigger`。Task 3 以降が使用

- [ ] **Step 1: 失敗するテストを書く**

`engine.test.ts` の import に `chooseTrigger, TRIGGERS` を追加し、末尾に:

```ts
describe('TRIGGERS', () => {
	it('12個あり id が一意で text が非空', () => {
		expect(TRIGGERS).toHaveLength(12)
		expect(new Set(TRIGGERS.map((t) => t.id)).size).toBe(TRIGGERS.length)
		for (const t of TRIGGERS) expect(t.text.length).toBeGreaterThan(0)
	})
})

describe('chooseTrigger', () => {
	it('rng で決定的に選べる', () => {
		expect(chooseTrigger([], () => 0)).toBe(TRIGGERS[0])
		expect(chooseTrigger([], () => 0.999)).toBe(TRIGGERS[TRIGGERS.length - 1])
	})

	it('使用済み id を除外して選ぶ', () => {
		expect(chooseTrigger([TRIGGERS[0].id], () => 0)).toBe(TRIGGERS[1])
	})

	it('全て使用済みなら used を無視して選び直す', () => {
		const all = TRIGGERS.map((t) => t.id)
		expect(chooseTrigger(all, () => 0)).toBe(TRIGGERS[0])
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/kanpai-wolf/__tests__/engine.test.ts`
Expected: FAIL — `chooseTrigger` / `TRIGGERS` が export されていない（既存テストは PASS のまま）

- [ ] **Step 3: 最小実装**

`engine.ts` 末尾に追加:

```ts
export type KanpaiTrigger = { id: string; text: string }

// 公開「乾杯ルール」。毎ラウンド1つだけ選ばれ、全員に発表される
export const TRIGGERS: readonly KanpaiTrigger[] = [
	{ id: 'question', text: '誰かが質問されたら全員乾杯' },
	{ id: 'silence', text: '3秒沈黙したら全員一口' },
	{ id: 'wakaru', text: '誰かが「わかる」と言ったらその人が一口' },
	{ id: 'majority-look', text: '多数派っぽい発言をした人を指名して乾杯' },
	{ id: 'before-doubt', text: 'ウルフだと思う人に質問する前に乾杯' },
	{ id: 'laugh', text: '誰かが笑ったら全員乾杯' },
	{ id: 'name-call', text: '名前を呼ばれた人は一口' },
	{ id: 'maybe', text: '「たぶん」「かも」を言ったら本人が一口' },
	{ id: 'repeat', text: '直前の人と同じ単語を使ったら全員乾杯' },
	{ id: 'point', text: '誰かを指さしたら指した人が一口' },
	{ id: 'agree-all', text: '全員がうなずいたら全員乾杯' },
	{ id: 'keigo', text: '敬語を使ったら本人が一口' },
]

// 未使用トリガーから選ぶ。全て使用済みなら used を無視して選び直す（連戦の枯渇対策）
export function chooseTrigger(usedIds: readonly string[], rng: Rng): KanpaiTrigger {
	const fresh = TRIGGERS.filter((t) => !usedIds.includes(t.id))
	const candidates = fresh.length > 0 ? fresh : TRIGGERS
	return candidates[Math.floor(rng() * candidates.length)]
}
```

- [ ] **Step 4: テストがパスすることを確認**

Run: `npx jest src/games/kanpai-wolf/__tests__/engine.test.ts`
Expected: PASS（全件）

- [ ] **Step 5: Commit**

```bash
git add src/games/kanpai-wolf/engine.ts src/games/kanpai-wolf/__tests__/engine.test.ts
git commit -m "feat: 乾杯トリガーの内蔵リストと抽選ロジックを追加"
```

---

### Task 3: reducer trigger-reveal フェーズ＋発表画面＋ゲーム配線

**Files:**

- Modify: `src/games/kanpai-wolf/reducer.ts`
- Create: `src/games/kanpai-wolf/trigger-reveal-screen.tsx`
- Modify: `src/games/kanpai-wolf/deal-pass.tsx:57`（最終ボタン文言）
- Modify: `src/games/kanpai-wolf/kanpai-wolf-game.tsx`
- Test: `src/games/kanpai-wolf/__tests__/reducer.test.ts` / `__tests__/trigger-reveal-screen.test.tsx`（新規）/ `__tests__/deal-pass.test.tsx` / `__tests__/kanpai-wolf-game.test.tsx`

**Interfaces:**

- Consumes: `KanpaiTrigger` / `chooseTrigger`（Task 2）
- Produces:
    - `Phase` に `'trigger-reveal'` 追加（`deal` 完了 → `trigger-reveal` → `discuss`）
    - `GameState` に `trigger: KanpaiTrigger | null` / `kanpaiCount: number` / `usedTriggerIds: string[]`
    - `Action`: `start` / `retry` に `trigger: KanpaiTrigger` を追加、`{ type: 'triggerRevealDone' }` を追加
    - `TriggerRevealScreen({ triggerText: string; onDone: () => void })`

- [ ] **Step 1: reducer の失敗テストを書く**

`reducer.test.ts` を更新。まず既存ヘルパーとフィクスチャ:

```ts
import type { KanpaiTrigger, WordPair } from '../engine'

const trig: KanpaiTrigger = { id: 't1', text: '誰かが質問されたら全員乾杯' }
const trig2: KanpaiTrigger = { id: 't2', text: '誰かが笑ったら全員乾杯' }

function start(playerCount: number, wolfCount: 1 | 2 = 1): GameState {
	return reduce(initialState(playerCount), {
		type: 'start',
		config: { wolfCount, discussSeconds: 180, pack: 'food' },
		pair,
		trigger: trig,
		rng: rng0,
	})
}

// deal を全員ぶん＋乾杯ルール発表を進めて discuss へ
function toDiscuss(state: GameState): GameState {
	let s = state
	for (let i = 0; i < s.playerCount; i++) s = reduce(s, { type: 'dealtOne' })
	return reduce(s, { type: 'triggerRevealDone' })
}
```

既存テストの修正:

- `'dealtOne を人数ぶん繰り返すと discuss へ'` → 期待値を `'trigger-reveal'` に変え、テスト名を `'dealtOne を人数ぶん繰り返すと trigger-reveal へ'` に変更
- `describe('retry')` 内の2つの `{ type: 'retry', pair: …, rng: rng0 }` に `trigger: trig2`（1つ目）/ `trigger: trig`（2つ目）を追加

新規 describe を末尾に追加:

```ts
describe('乾杯トリガー', () => {
	it('start でトリガーが確定し usedTriggerIds に積まれ kanpaiCount は 0', () => {
		const s = start(3)
		expect(s.trigger).toEqual(trig)
		expect(s.usedTriggerIds).toEqual(['t1'])
		expect(s.kanpaiCount).toBe(0)
	})

	it('triggerRevealDone で discuss へ。trigger-reveal 以外では no-op', () => {
		let s = start(3)
		expect(reduce(s, { type: 'triggerRevealDone' })).toBe(s) // deal 中は no-op
		for (let i = 0; i < 3; i++) s = reduce(s, { type: 'dealtOne' })
		expect(s.phase).toBe('trigger-reveal')
		s = reduce(s, { type: 'triggerRevealDone' })
		expect(s.phase).toBe('discuss')
	})

	function toResult(): GameState {
		let s = apply(toDiscuss(start(3)), { type: 'discussDone' })
		return apply(
			s,
			{ type: 'vote', target: 1 },
			{ type: 'vote', target: 0 },
			{ type: 'vote', target: 0 },
			{ type: 'revealDone' },
			{ type: 'reversalJudged', guessed: false },
		)
	}

	it('retry で新トリガーが選ばれ usedTriggerIds が蓄積される', () => {
		const s = apply(toResult(), { type: 'retry', pair: pair2, trigger: trig2, rng: rng0 })
		expect(s.trigger).toEqual(trig2)
		expect(s.usedTriggerIds).toEqual(['t1', 't2'])
	})

	it('使用済みトリガーが再登場したら usedTriggerIds をリセット', () => {
		const s = apply(toResult(), { type: 'retry', pair: pair2, trigger: trig, rng: rng0 })
		expect(s.usedTriggerIds).toEqual(['t1'])
	})
})
```

- [ ] **Step 2: reducer テストが失敗することを確認**

Run: `npx jest src/games/kanpai-wolf/__tests__/reducer.test.ts`
Expected: FAIL — `start` アクションに `trigger` がない（型エラー相当のランタイム未定義）、`triggerRevealDone` 未実装、`trigger-reveal` フェーズ未実装

- [ ] **Step 3: reducer を実装**

`reducer.ts` の変更点:

```ts
import {
	assignRoles,
	judgeResult,
	swapWords,
	tallyVotes,
	type AssignedWords,
	type KanpaiTrigger,
	type Rng,
	type WordPair,
} from './engine'

export type Phase =
	| 'setup'
	| 'deal'
	| 'trigger-reveal'
	| 'discuss'
	| 'vote'
	| 'runoff-discuss'
	| 'reveal'
	| 'reversal'
	| 'result'
```

`GameState` に追加（`usedPairIds` の下）:

```ts
	trigger: KanpaiTrigger | null // 今ラウンドの公開「乾杯ルール」
	kanpaiCount: number // 今ラウンドの乾杯回数（演出用・勝敗に影響しない）
	usedTriggerIds: string[] // 連戦の重複回避
```

`Action` の変更:

```ts
export type Action =
	| { type: 'start'; config: StartConfig; pair: WordPair; trigger: KanpaiTrigger; rng: Rng }
	| { type: 'dealtOne' }
	| { type: 'triggerRevealDone' }
	| { type: 'discussDone' }
	| { type: 'vote'; target: number }
	| { type: 'revealDone' }
	| { type: 'reversalJudged'; guessed: boolean }
	| { type: 'retry'; pair: WordPair; trigger: KanpaiTrigger; rng: Rng }
```

`initialState` に `trigger: null, kanpaiCount: 0, usedTriggerIds: [],` を追加。

`newRound` のシグネチャを `(state, pair, trigger, rng)` に変更し、pair と同じ再登場リセット規則で:

```ts
function newRound(state: GameState, pair: WordPair, trigger: KanpaiTrigger, rng: Rng): GameState {
	// choosePair / chooseTrigger が used をリセットして返したものは既にリストにある → 作り直す
	const usedPairIds = state.usedPairIds.includes(pair.id)
		? [pair.id]
		: [...state.usedPairIds, pair.id]
	const usedTriggerIds = state.usedTriggerIds.includes(trigger.id)
		? [trigger.id]
		: [...state.usedTriggerIds, trigger.id]
	return {
		...state,
		words: swapWords(pair, rng),
		wolfIndices: assignRoles(state.playerCount, state.wolfCount, rng),
		dealIndex: 0,
		votes: [],
		voteCandidates: null,
		voterQueue: [],
		voteTurn: 0,
		eliminatedIndex: null,
		outcome: null,
		usedPairIds,
		trigger,
		kanpaiCount: 0,
		usedTriggerIds,
		phase: 'deal',
	}
}
```

`reduce` の変更: `start` / `retry` の `newRound(…, action.pair, action.trigger, action.rng)`、`dealtOne` の最終遷移を `{ ...state, phase: 'trigger-reveal' }` に、新ケース:

```ts
		case 'triggerRevealDone':
			if (state.phase !== 'trigger-reveal') return state
			return { ...state, phase: 'discuss' }
```

- [ ] **Step 4: reducer テストがパスすることを確認**

Run: `npx jest src/games/kanpai-wolf/__tests__/reducer.test.ts`
Expected: PASS（全件。既存の vote / runoff / reveal / retry テストも含む）

- [ ] **Step 5: trigger-reveal-screen の失敗テストを書く**

Create `src/games/kanpai-wolf/__tests__/trigger-reveal-screen.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { TriggerRevealScreen } from '../trigger-reveal-screen'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

it('乾杯ルールを表示し「議論スタート」で onDone を呼ぶ', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(
		<TriggerRevealScreen triggerText="誰かが質問されたら全員乾杯" onDone={onDone} />,
	)
	expect(getByText('🍻 今回の乾杯ルール')).toBeTruthy()
	expect(getByText('誰かが質問されたら全員乾杯')).toBeTruthy()
	expect(getByText('議論中にこのルールが起きたら、みんなで乾杯！')).toBeTruthy()
	await act(async () => {
		fireEvent.press(getByText('議論スタート'))
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 6: テストが失敗することを確認**

Run: `npx jest src/games/kanpai-wolf/__tests__/trigger-reveal-screen.test.tsx`
Expected: FAIL — `../trigger-reveal-screen` が存在しない

- [ ] **Step 7: trigger-reveal-screen を実装**

Create `src/games/kanpai-wolf/trigger-reveal-screen.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { KW } from './theme'

type Props = {
	triggerText: string
	onDone: () => void
}

// 配布完了後・議論前に、今ラウンドの公開「乾杯ルール」を全員に発表する
export function TriggerRevealScreen({ triggerText, onDone }: Props) {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>🍻 今回の乾杯ルール</Text>
			<View style={styles.card}>
				<Text style={styles.trigger}>{triggerText}</Text>
			</View>
			<Text style={styles.hint}>議論中にこのルールが起きたら、みんなで乾杯！</Text>
			<GradientButton title="議論スタート" onPress={onDone} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.lg,
	},
	title: { ...typography.body, textAlign: 'center', fontWeight: '700', color: KW.wolf },
	card: {
		minHeight: 160,
		padding: spacing.lg,
		borderRadius: radii.lg,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: KW.wolf,
		alignItems: 'center',
		justifyContent: 'center',
	},
	trigger: { ...typography.hero, fontSize: 28, textAlign: 'center', color: colors.text },
	hint: { ...typography.caption, textAlign: 'center' },
})
```

- [ ] **Step 8: テストがパスすることを確認**

Run: `npx jest src/games/kanpai-wolf/__tests__/trigger-reveal-screen.test.tsx`
Expected: PASS

- [ ] **Step 9: deal-pass の最終ボタン文言を変更しゲームに配線**

`deal-pass.tsx` 57行目: `'確認した（議論スタート！）'` → `'確認した（乾杯ルールへ！）'`（議論の前に発表画面が挟まるため）。
`__tests__/deal-pass.test.tsx` 内の同文言も置換する。

`kanpai-wolf-game.tsx` の変更:

```tsx
import { chooseTrigger, choosePair } from './engine'
import { TriggerRevealScreen } from './trigger-reveal-screen'
```

`onStart` / `retry` の dispatch に trigger を追加し、phase switch に新ケースを追加:

```tsx
const onStart = (config: StartConfig) =>
	dispatch({
		type: 'start',
		config,
		pair: pickPair(config.pack, state.usedPairIds),
		trigger: chooseTrigger(state.usedTriggerIds, Math.random),
		rng: Math.random,
	})
```

```tsx
		case 'trigger-reveal': {
			if (!state.trigger) return null
			return (
				<TriggerRevealScreen
					triggerText={state.trigger.text}
					onDone={() => dispatch({ type: 'triggerRevealDone' })}
				/>
			)
		}
```

result の `onRetry`:

```tsx
					onRetry={() =>
						dispatch({
							type: 'retry',
							pair: pickPair(state.pack, state.usedPairIds),
							trigger: chooseTrigger(state.usedTriggerIds, Math.random),
							rng: Math.random,
						})
					}
```

- [ ] **Step 10: ゲーム通しテストを更新**

`__tests__/kanpai-wolf-game.test.tsx`:

- `dealOne` ヘルパーの最終ラベルを `'確認した（乾杯ルールへ！）'` に変更（58行目付近の直書き `'確認した（次の人へ）'` はそのまま）
- 両方の通しテストで、最終 deal の直後に trigger-reveal のステップを挿入（`Math.random` は 0 固定 → `TRIGGERS[0]` = 「誰かが質問されたら全員乾杯」）:

```tsx
// trigger-reveal（rng 0 固定: TRIGGERS[0] が選ばれる）
expect(ui.getByText('誰かが質問されたら全員乾杯')).toBeTruthy()
await press(ui, '議論スタート')
```

- [ ] **Step 11: 全テストがパスすることを確認**

Run: `npx jest src/games/kanpai-wolf`
Expected: PASS（deal-pass / kanpai-wolf-game 含む全 suite）

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: trigger-reveal フェーズと乾杯ルール発表画面を追加"
```

---

### Task 4: kanpai アクション＋議論画面の乾杯UI

**Files:**

- Modify: `src/games/kanpai-wolf/reducer.ts`（`kanpai` アクション）
- Modify: `src/games/kanpai-wolf/discuss-screen.tsx`（トリガー常時表示＋乾杯ボタン）
- Modify: `src/games/kanpai-wolf/kanpai-wolf-game.tsx`（props 配線）
- Test: `src/games/kanpai-wolf/__tests__/reducer.test.ts` / `__tests__/discuss-screen.test.tsx`

**Interfaces:**

- Consumes: `GameState.trigger` / `kanpaiCount`（Task 3）
- Produces: `Action` に `{ type: 'kanpai' }`。`DiscussScreen` の Props が `{ seconds, trigger: string, kanpaiCount: number, isRunoff?, onKanpai: () => void, onDone }` になる（Task 5 は変更なしで併存可）

- [ ] **Step 1: reducer の失敗テストを書く**

`reducer.test.ts` の `describe('乾杯トリガー')` に追加:

```ts
it('kanpai は discuss / runoff-discuss 中だけカウント +1', () => {
	let s = toDiscuss(start(3))
	s = apply(s, { type: 'kanpai' }, { type: 'kanpai' })
	expect(s.kanpaiCount).toBe(2)
	// vote 中は no-op
	const voting = reduce(s, { type: 'discussDone' })
	expect(reduce(voting, { type: 'kanpai' })).toBe(voting)
})

it('runoff-discuss 中の kanpai もカウントされ、retry で 0 に戻る', () => {
	// 全員同票 → runoff-discuss へ
	let s = apply(toDiscuss(start(3)), { type: 'discussDone' })
	s = apply(
		s,
		{ type: 'vote', target: 1 },
		{ type: 'vote', target: 2 },
		{ type: 'vote', target: 0 },
	)
	expect(s.phase).toBe('runoff-discuss')
	s = reduce(s, { type: 'kanpai' })
	expect(s.kanpaiCount).toBe(1)
	// 決着 → result → retry でリセット
	s = apply(
		s,
		{ type: 'discussDone' },
		{ type: 'vote', target: 1 },
		{ type: 'vote', target: 0 },
		{ type: 'vote', target: 0 },
		{ type: 'revealDone' },
		{ type: 'reversalJudged', guessed: false },
		{ type: 'retry', pair: pair2, trigger: trig2, rng: rng0 },
	)
	expect(s.kanpaiCount).toBe(0)
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/kanpai-wolf/__tests__/reducer.test.ts`
Expected: FAIL — `kanpai` アクションが `Action` 型・reduce に存在しない

- [ ] **Step 3: reducer に kanpai を実装**

`Action` に `| { type: 'kanpai' }` を追加（`triggerRevealDone` の下）。`reduce` に:

```ts
		case 'kanpai':
			if (state.phase !== 'discuss' && state.phase !== 'runoff-discuss') return state
			return { ...state, kanpaiCount: state.kanpaiCount + 1 }
```

- [ ] **Step 4: reducer テストがパスすることを確認**

Run: `npx jest src/games/kanpai-wolf/__tests__/reducer.test.ts`
Expected: PASS

- [ ] **Step 5: discuss-screen の失敗テストを書く**

`__tests__/discuss-screen.test.tsx` を更新。全 `render(<DiscussScreen …/>)` に共通 props を渡すため先頭に:

```tsx
const baseProps = {
	trigger: '誰かが質問されたら全員乾杯',
	kanpaiCount: 0,
	onKanpai: jest.fn(),
}
```

既存の各 render を `<DiscussScreen seconds={…} onDone={…} {...baseProps} />` の形に変更（`isRunoff` 付きも同様）。新規テストを末尾に追加:

```tsx
it('乾杯ルールを常時表示する（runoff でも）', async () => {
	const ui = await render(<DiscussScreen seconds={180} onDone={jest.fn()} {...baseProps} />)
	expect(ui.getByText('誰かが質問されたら全員乾杯')).toBeTruthy()
	const runoff = await render(
		<DiscussScreen seconds={60} isRunoff onDone={jest.fn()} {...baseProps} />,
	)
	expect(runoff.getByText('誰かが質問されたら全員乾杯')).toBeTruthy()
})

it('乾杯ボタンで onKanpai と cheers 効果音が発火する', async () => {
	const onKanpai = jest.fn()
	const { getByText } = await render(
		<DiscussScreen seconds={180} onDone={jest.fn()} {...baseProps} onKanpai={onKanpai} />,
	)
	await act(async () => {
		fireEvent.press(getByText('🍻 乾杯！'))
	})
	expect(onKanpai).toHaveBeenCalledTimes(1)
	expect(playSound).toHaveBeenCalledWith('cheers')
})

it('乾杯回数が表示される（0回のときはバッジ非表示）', async () => {
	const ui = await render(
		<DiscussScreen seconds={180} onDone={jest.fn()} {...baseProps} kanpaiCount={3} />,
	)
	expect(ui.getByText('× 3')).toBeTruthy()
	const zero = await render(<DiscussScreen seconds={180} onDone={jest.fn()} {...baseProps} />)
	expect(zero.queryByText(/× \d/)).toBeNull()
})
```

- [ ] **Step 6: テストが失敗することを確認**

Run: `npx jest src/games/kanpai-wolf/__tests__/discuss-screen.test.tsx`
Expected: FAIL — 新 props 未対応・乾杯UIなし（既存タイマー系テストは PASS のまま）

- [ ] **Step 7: discuss-screen を実装**

`discuss-screen.tsx` の変更。import に `Animated`, `Pressable`, `useRef` と `radii` を追加:

```tsx
import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme/tokens'
```

Props:

```tsx
type Props = {
	seconds: number
	trigger: string // 今ラウンドの公開「乾杯ルール」
	kanpaiCount: number
	isRunoff?: boolean // 決選投票前の再議論
	onKanpai: () => void
	onDone: () => void
}
```

コンポーネント内（`finish` の下）に乾杯演出:

```tsx
const scale = useRef(new Animated.Value(1)).current

const kanpai = () => {
	playSound('cheers') // 素材未登録の間は無音スキップ（#75）
	haptics.heavy()
	scale.setValue(1.4)
	Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
	onKanpai()
}
```

JSX: タイトルの上にトリガーカード、タイマーの下（GradientButton の上）に乾杯ボタン:

```tsx
		<View style={styles.container}>
			<View style={styles.triggerCard}>
				<Text style={styles.triggerLabel}>🍻 今回の乾杯ルール</Text>
				<Text style={styles.triggerText}>{trigger}</Text>
			</View>
			<Text style={styles.title}>
				{isRunoff ? '🗳️ 決選投票の前に、もう一度話し合おう' : '💬 議論タイム！'}
			</Text>
			…（既存の hint / timer はそのまま）…
			<Pressable accessibilityRole="button" onPress={kanpai} style={styles.kanpaiButton}>
				<Text style={styles.kanpaiLabel}>🍻 乾杯！</Text>
				{kanpaiCount > 0 && (
					<Animated.Text style={[styles.kanpaiCount, { transform: [{ scale }] }]}>
						× {kanpaiCount}
					</Animated.Text>
				)}
			</Pressable>
			<GradientButton …既存のまま… />
		</View>
```

styles 追加:

```tsx
	triggerCard: {
		padding: spacing.md,
		borderRadius: radii.md,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: KW.wolf,
		gap: spacing.xs,
	},
	triggerLabel: { ...typography.caption, color: KW.wolf },
	triggerText: { ...typography.body, fontWeight: '700' },
	kanpaiButton: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: spacing.sm,
		padding: spacing.md,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: KW.wolf,
	},
	kanpaiLabel: { ...typography.body, fontWeight: '700' },
	kanpaiCount: { ...typography.body, fontWeight: '700', color: KW.wolf },
```

- [ ] **Step 8: discuss テストがパスすることを確認**

Run: `npx jest src/games/kanpai-wolf/__tests__/discuss-screen.test.tsx`
Expected: PASS（既存のタイマー・スキップ系テスト含む全件）

- [ ] **Step 9: ゲームに配線し通しテストを確認**

`kanpai-wolf-game.tsx` の discuss / runoff-discuss 両方に props を追加:

```tsx
		case 'discuss':
			return (
				<DiscussScreen
					seconds={state.discussSeconds}
					trigger={state.trigger?.text ?? ''}
					kanpaiCount={state.kanpaiCount}
					onKanpai={() => dispatch({ type: 'kanpai' })}
					onDone={() => dispatch({ type: 'discussDone' })}
				/>
			)
```

（runoff-discuss も同じ4 props を追加。key はそのまま）

Run: `npx jest src/games/kanpai-wolf`
Expected: PASS（通しテストは trigger-reveal の `getByText('誰かが質問されたら全員乾杯')` が discuss 画面表示と重ならないこと＝画面は排他描画なので影響なし）

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: 議論画面に乾杯ルール常時表示と🍻乾杯ボタンを追加"
```

---

### Task 5: リザルトの乾杯回数表示＋総仕上げ

**Files:**

- Modify: `src/games/kanpai-wolf/result-screen.tsx`
- Modify: `src/games/kanpai-wolf/kanpai-wolf-game.tsx`（result 配線＋通しテスト）
- Test: `src/games/kanpai-wolf/__tests__/result-screen.test.tsx`（新規）/ `__tests__/kanpai-wolf-game.test.tsx`

**Interfaces:**

- Consumes: `GameState.kanpaiCount`（Task 3）
- Produces: `ResultScreen` の Props に `kanpaiCount: number` を追加

- [ ] **Step 1: result-screen の失敗テストを書く**

Create `src/games/kanpai-wolf/__tests__/result-screen.test.tsx`:

```tsx
import { render } from '@testing-library/react-native'
import { ResultScreen } from '../result-screen'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

const words = { majority: 'ラーメン', wolf: 'うどん' }

it('勝敗・お題・乾杯回数を表示する', async () => {
	const { getByText } = await render(
		<ResultScreen
			outcome="citizens"
			wolfNames={['あか']}
			words={words}
			kanpaiCount={3}
			onRetry={jest.fn()}
		/>,
	)
	expect(getByText(/市民チームの勝利/)).toBeTruthy()
	expect(getByText('このラウンドの乾杯 🍻 × 3回')).toBeTruthy()
})

it('0回でも乾杯行を表示する', async () => {
	const { getByText } = await render(
		<ResultScreen
			outcome="wolf"
			wolfNames={['あか']}
			words={words}
			kanpaiCount={0}
			onRetry={jest.fn()}
		/>,
	)
	expect(getByText('このラウンドの乾杯 🍻 × 0回')).toBeTruthy()
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/kanpai-wolf/__tests__/result-screen.test.tsx`
Expected: FAIL — `kanpaiCount` prop 未対応・乾杯行なし

- [ ] **Step 3: result-screen を実装**

`result-screen.tsx`: Props に `kanpaiCount: number` を追加し、card の `</View>` 直後（GradientButton の上）に:

```tsx
<Text style={styles.kanpai}>このラウンドの乾杯 🍻 × {kanpaiCount}回</Text>
```

styles に `kanpai: { ...typography.caption, textAlign: 'center' },` を追加。

- [ ] **Step 4: テストがパスすることを確認**

Run: `npx jest src/games/kanpai-wolf/__tests__/result-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: ゲームに配線し通しテストへ追記**

`kanpai-wolf-game.tsx` の result ケースに `kanpaiCount={state.kanpaiCount}` を追加。

`__tests__/kanpai-wolf-game.test.tsx` の1本目通しテスト、result 検証部に追記:

```tsx
expect(ui.getByText(/このラウンドの乾杯/)).toBeTruthy()
```

Run: `npx jest src/games/kanpai-wolf`
Expected: PASS

- [ ] **Step 6: 残置チェックと全体検証**

```bash
grep -rn "word-wolf\|WordWolf" src/ && echo "残置あり" || echo "OK"
npx jest
npx eslint src/games/kanpai-wolf src/games/registry.ts
```

Expected: grep は「OK」（`word-pairs` は別文字列なのでヒットしない）、jest 全 suite PASS、eslint エラー 0

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: リザルトに乾杯回数を表示して乾杯ウルフを完成"
```

---

## 完了後

- `superpowers:finishing-a-development-branch` の流れで PR（`feature/kanpai-wolf` → `develop`）を作成
- PR 本文にスペックへのリンクと「サムネイルは新アート差し替え待ち（絵文字フォールバック中）」を明記
- 新アート（`assets/images/kanpai-wolf/intro.jpg` 512×512 / `card.jpg` 1040×800）が届いたら registry に thumbnail / cardThumbnail を追加する（別タスク）
