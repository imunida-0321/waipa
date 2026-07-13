# おでこインディアンポーカー（#62）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スマホを額に当てて「自分だけ見えないカード」で勝負するインディアンポーカーの1台回し版（プレミアム限定）を実装する。

**Architecture:** daut-dice / sasayaki-limit と同じ「純関数 engine + reducer + フェーズ分岐ルート」方式。フェーズは `deal → forehead×n → declare×n → result`。額当てのタイマーと宣言の長押しは各画面コンポーネント内で完結させ、reducer はプレイヤー送りとフェーズ遷移だけを持つ。

**Tech Stack:** Expo (React Native) / TypeScript / @testing-library/react-native v14 / jest。演出は共通の `DrumrollReveal` + `useDrumroll` を流用。

**Spec:** `docs/superpowers/specs/2026-07-14-odeko-poker-design.md`

## Global Constraints

- コードフォーマット: タブ幅4・セミコロンなし・シングルクォート（prettier 設定済み。迷ったら `npm run format` で揃える）
- import は `@/` エイリアス（例: `@/theme/tokens`）。ゲーム内相対 import は `./engine` 形式
- UI 文言はすべて日本語。カジュアルな飲み会トーン（既存ゲームの文言参照）
- 色は `@/theme/tokens` の `colors` / `spacing` / `radii` / `typography` を使い、ゲーム固有色のみ `theme.ts` に定義
- テストは React 19 規約: `await render(...)`、状態更新は `await act(async () => ...)`（kimagure-ox / daut-dice のテストが参照実装）
- タイマー系テストは `jest.useFakeTimers()` + `await act(async () => { jest.advanceTimersByTime(n) })`
- カードは 1〜13、**13 が最強・1 が最弱**
- 勝負者1人 → 負けなし（一人勝ち）／全員降り → 全員負け／ヘタレ賞 = その回の最強カード保持者が降りた場合のみ（最大1人、outcome に関係なく判定）
- ワークツリー `.claude/worktrees/feature+62-odeko-poker`（ブランチ `feature/62-odeko-poker`）で作業。依存が壊れたら `npm install --force`（`--legacy-peer-deps` は RNTL の peer `test-renderer` が入らず全滅するので使わない）

---

### Task 1: 判定エンジン（engine.ts）

**Files:**
- Create: `src/games/odeko-poker/engine.ts`
- Test: `src/games/odeko-poker/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: なし（純関数のみ）
- Produces:
  - `type Rng = () => number`
  - `type Declaration = 'fight' | 'fold'`
  - `type Outcome = 'normal' | 'solo-fight' | 'all-fold'`
  - `type Judgement = { outcome: Outcome; loserIndices: number[]; winnerIndex: number | null; hetareIndex: number | null }`
  - `dealCards(playerCount: number, rng: Rng): number[]`
  - `judge(cards: number[], declarations: Declaration[]): Judgement`
  - `CARD_MAX = 13`

- [ ] **Step 1: Write the failing test**

`src/games/odeko-poker/__tests__/engine.test.ts`:

```ts
import { CARD_MAX, dealCards, judge, type Declaration } from '../engine'

// 決定的な疑似乱数（テスト用シード付き）
function mulberry32(seed: number): () => number {
	let s = seed >>> 0
	return () => {
		s = (s + 0x6d2b79f5) >>> 0
		let t = s
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

describe('dealCards', () => {
	it('人数分のカードを 1〜13 から重複なしで配る', () => {
		for (const count of [3, 7, 12]) {
			const cards = dealCards(count, mulberry32(1))
			expect(cards).toHaveLength(count)
			expect(new Set(cards).size).toBe(count)
			for (const c of cards) {
				expect(c).toBeGreaterThanOrEqual(1)
				expect(c).toBeLessThanOrEqual(CARD_MAX)
			}
		}
	})

	it('同じ乱数シードなら同じ配布になる（rng 注入で決定的）', () => {
		expect(dealCards(5, mulberry32(42))).toEqual(dealCards(5, mulberry32(42)))
	})

	it('シャッフルされる（rng が偏れば並びが変わる）', () => {
		expect(dealCards(13, mulberry32(1))).not.toEqual(dealCards(13, mulberry32(2)))
	})
})

describe('judge', () => {
	const F: Declaration = 'fight'
	const D: Declaration = 'fold'

	it('勝負者2人以上: 勝負者の中で最弱カードの人が負け', () => {
		const j = judge([5, 9, 2, 13], [F, F, D, F])
		expect(j.outcome).toBe('normal')
		expect(j.loserIndices).toEqual([0]) // 勝負者 {5, 9, 13} の最弱は 5
		expect(j.winnerIndex).toBeNull()
	})

	it('降りた人の最弱カードは負け判定に含まれない', () => {
		const j = judge([5, 9, 2, 13], [F, F, D, D])
		expect(j.loserIndices).toEqual([0]) // 2 を持つ index 2 は降りているのでセーフ
	})

	it('勝負者1人: 負けなしの一人勝ち', () => {
		const j = judge([5, 9, 2], [D, F, D])
		expect(j.outcome).toBe('solo-fight')
		expect(j.loserIndices).toEqual([])
		expect(j.winnerIndex).toBe(1)
	})

	it('全員降り: 全員負け', () => {
		const j = judge([5, 9, 2], [D, D, D])
		expect(j.outcome).toBe('all-fold')
		expect(j.loserIndices).toEqual([0, 1, 2])
		expect(j.winnerIndex).toBeNull()
	})

	it('ヘタレ賞: その回の最強カード保持者が降りていたらその index', () => {
		const j = judge([5, 13, 2, 9], [F, D, D, F])
		expect(j.hetareIndex).toBe(1)
	})

	it('ヘタレ賞なし: 最強カード保持者が勝負していたら null', () => {
		const j = judge([5, 13, 2, 9], [F, F, D, D])
		expect(j.hetareIndex).toBeNull()
	})

	it('全員降りでもヘタレ賞は判定される（バッジ表示用）', () => {
		const j = judge([5, 13, 2], [D, D, D])
		expect(j.outcome).toBe('all-fold')
		expect(j.hetareIndex).toBe(1)
	})

	it('一人勝ちとヘタレ賞は同時に発生しうる', () => {
		const j = judge([5, 13, 2], [F, D, D])
		expect(j.outcome).toBe('solo-fight')
		expect(j.winnerIndex).toBe(0)
		expect(j.hetareIndex).toBe(1)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/games/odeko-poker/__tests__/engine.test.ts`
Expected: FAIL（`../engine` が存在しない）

- [ ] **Step 3: Write minimal implementation**

`src/games/odeko-poker/engine.ts`:

```ts
/** [0, 1) を返す（Math.random 互換）。1 ちょうどを返す実装は不可 */
export type Rng = () => number

export const CARD_MAX = 13

export type Declaration = 'fight' | 'fold'
export type Outcome = 'normal' | 'solo-fight' | 'all-fold'

export type Judgement = {
	outcome: Outcome
	/** 負け（飲む人）。normal は勝負者中の最弱1人、all-fold は全員、solo-fight は空 */
	loserIndices: number[]
	/** solo-fight の一人勝ち index（それ以外は null） */
	winnerIndex: number | null
	/** その回の最強カードで降りた人（いなければ null）。outcome に関係なく判定する */
	hetareIndex: number | null
}

// 1〜13 をシャッフルして先頭 playerCount 枚を配る（重複なし）
export function dealCards(playerCount: number, rng: Rng): number[] {
	const deck = Array.from({ length: CARD_MAX }, (_, i) => i + 1)
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[deck[i], deck[j]] = [deck[j], deck[i]]
	}
	return deck.slice(0, playerCount)
}

export function judge(cards: number[], declarations: Declaration[]): Judgement {
	const fighters = declarations.map((d, i) => (d === 'fight' ? i : -1)).filter((i) => i >= 0)

	const strongestIndex = cards.indexOf(Math.max(...cards))
	const hetareIndex = declarations[strongestIndex] === 'fold' ? strongestIndex : null

	if (fighters.length === 0) {
		return {
			outcome: 'all-fold',
			loserIndices: cards.map((_, i) => i),
			winnerIndex: null,
			hetareIndex,
		}
	}
	if (fighters.length === 1) {
		return { outcome: 'solo-fight', loserIndices: [], winnerIndex: fighters[0], hetareIndex }
	}
	const weakest = fighters.reduce((min, i) => (cards[i] < cards[min] ? i : min), fighters[0])
	return { outcome: 'normal', loserIndices: [weakest], winnerIndex: null, hetareIndex }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/games/odeko-poker/__tests__/engine.test.ts`
Expected: PASS（11 tests）

- [ ] **Step 5: Commit**

```bash
git add src/games/odeko-poker/engine.ts src/games/odeko-poker/__tests__/engine.test.ts
git commit -m "feat: おでこインディアンポーカーの判定エンジンを追加 (#62)"
```

---

### Task 2: フェーズ遷移（reducer.ts）

**Files:**
- Create: `src/games/odeko-poker/reducer.ts`
- Test: `src/games/odeko-poker/__tests__/reducer.test.ts`

**Interfaces:**
- Consumes: Task 1 の `dealCards` / `judge` / `Declaration` / `Judgement` / `Rng`
- Produces:
  - `type Phase = 'deal' | 'forehead' | 'declare' | 'result'`
  - `type GameState = { phase: Phase; playerCount: number; round: number; cards: number[]; turnIndex: number; declarations: Declaration[]; judgement: Judgement | null }`
  - `type Action = { type: 'start'; rng: Rng } | { type: 'foreheadDone' } | { type: 'declare'; choice: Declaration } | { type: 'nextRound' }`
  - `initialState(playerCount: number): GameState`
  - `reduce(state: GameState, action: Action): GameState`

- [ ] **Step 1: Write the failing test**

`src/games/odeko-poker/__tests__/reducer.test.ts`:

```ts
import { initialState, reduce, type GameState } from '../reducer'

const rng = () => 0

function afterStart(count = 3): GameState {
	return reduce(initialState(count), { type: 'start', rng })
}

function afterAllForehead(count = 3): GameState {
	let s = afterStart(count)
	for (let i = 0; i < count; i++) s = reduce(s, { type: 'foreheadDone' })
	return s
}

it('初期状態は deal フェーズ・ラウンド1', () => {
	const s = initialState(4)
	expect(s.phase).toBe('deal')
	expect(s.round).toBe(1)
	expect(s.cards).toEqual([])
	expect(s.judgement).toBeNull()
})

it('start でカードが人数分配られ forehead フェーズへ', () => {
	const s = afterStart(4)
	expect(s.phase).toBe('forehead')
	expect(s.cards).toHaveLength(4)
	expect(s.turnIndex).toBe(0)
})

it('foreheadDone で次の人へ。全員終わったら declare フェーズへ', () => {
	let s = afterStart(3)
	s = reduce(s, { type: 'foreheadDone' })
	expect(s.phase).toBe('forehead')
	expect(s.turnIndex).toBe(1)
	s = reduce(s, { type: 'foreheadDone' })
	s = reduce(s, { type: 'foreheadDone' })
	expect(s.phase).toBe('declare')
	expect(s.turnIndex).toBe(0)
})

it('declare で宣言が記録され次の人へ。全員宣言したら judgement 付きで result へ', () => {
	let s = afterAllForehead(3)
	s = reduce(s, { type: 'declare', choice: 'fight' })
	expect(s.phase).toBe('declare')
	expect(s.turnIndex).toBe(1)
	expect(s.declarations).toEqual(['fight'])
	s = reduce(s, { type: 'declare', choice: 'fold' })
	s = reduce(s, { type: 'declare', choice: 'fold' })
	expect(s.phase).toBe('result')
	expect(s.declarations).toEqual(['fight', 'fold', 'fold'])
	expect(s.judgement?.outcome).toBe('solo-fight')
	expect(s.judgement?.winnerIndex).toBe(0)
})

it('nextRound で round+1 の deal に戻り、カード・宣言・判定がリセットされる', () => {
	let s = afterAllForehead(3)
	s = reduce(s, { type: 'declare', choice: 'fold' })
	s = reduce(s, { type: 'declare', choice: 'fold' })
	s = reduce(s, { type: 'declare', choice: 'fold' })
	s = reduce(s, { type: 'nextRound' })
	expect(s.phase).toBe('deal')
	expect(s.round).toBe(2)
	expect(s.cards).toEqual([])
	expect(s.declarations).toEqual([])
	expect(s.judgement).toBeNull()
})

it('フェーズ違いのアクションは無視される', () => {
	const s = initialState(3)
	expect(reduce(s, { type: 'foreheadDone' })).toBe(s)
	expect(reduce(s, { type: 'declare', choice: 'fight' })).toBe(s)
	expect(reduce(s, { type: 'nextRound' })).toBe(s)
	const played = afterStart(3)
	expect(reduce(played, { type: 'start', rng })).toBe(played)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/games/odeko-poker/__tests__/reducer.test.ts`
Expected: FAIL（`../reducer` が存在しない）

- [ ] **Step 3: Write minimal implementation**

`src/games/odeko-poker/reducer.ts`:

```ts
import { dealCards, judge, type Declaration, type Judgement, type Rng } from './engine'

export type Phase = 'deal' | 'forehead' | 'declare' | 'result'

export type GameState = {
	phase: Phase
	playerCount: number
	round: number
	cards: number[]
	turnIndex: number
	declarations: Declaration[]
	judgement: Judgement | null
}

export type Action =
	| { type: 'start'; rng: Rng }
	| { type: 'foreheadDone' }
	| { type: 'declare'; choice: Declaration }
	| { type: 'nextRound' }

export function initialState(playerCount: number): GameState {
	return {
		phase: 'deal',
		playerCount,
		round: 1,
		cards: [],
		turnIndex: 0,
		declarations: [],
		judgement: null,
	}
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'start':
			if (state.phase !== 'deal') return state
			return {
				...state,
				cards: dealCards(state.playerCount, action.rng),
				turnIndex: 0,
				phase: 'forehead',
			}
		case 'foreheadDone': {
			if (state.phase !== 'forehead') return state
			const next = state.turnIndex + 1
			if (next < state.playerCount) return { ...state, turnIndex: next }
			return { ...state, turnIndex: 0, phase: 'declare' }
		}
		case 'declare': {
			if (state.phase !== 'declare') return state
			const declarations = [...state.declarations, action.choice]
			const next = state.turnIndex + 1
			if (next < state.playerCount) return { ...state, declarations, turnIndex: next }
			return {
				...state,
				declarations,
				turnIndex: 0,
				judgement: judge(state.cards, declarations),
				phase: 'result',
			}
		}
		case 'nextRound':
			if (state.phase !== 'result') return state
			return { ...initialState(state.playerCount), round: state.round + 1 }
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/games/odeko-poker/__tests__/reducer.test.ts`
Expected: PASS（6 tests）

- [ ] **Step 5: Commit**

```bash
git add src/games/odeko-poker/reducer.ts src/games/odeko-poker/__tests__/reducer.test.ts
git commit -m "feat: おでこインディアンポーカーのフェーズ遷移 reducer を追加 (#62)"
```

---

### Task 3: 額当て確認画面（theme.ts + forehead-screen.tsx）

**Files:**
- Create: `src/games/odeko-poker/theme.ts`
- Create: `src/games/odeko-poker/forehead-screen.tsx`
- Test: `src/games/odeko-poker/__tests__/forehead-screen.test.tsx`

**Interfaces:**
- Consumes: `@/components/ui/gradient-button` の `GradientButton`（props: `title`, `onPress`, `disabled?`）、`@/lib/haptics` の `haptics.tap()`、`@/lib/sound` の `playSound('reveal')`
- Produces:
  - `OP`（テーマ色オブジェクト）
  - `ForeheadScreen({ playerName, playerColor, card, onDone }: { playerName: string; playerColor: string; card: number; onDone: () => void })`
  - 定数 `PREP_SECONDS = 3` / `SHOW_SECONDS = 5`（テストから import する）

- [ ] **Step 1: Write theme.ts**（テスト不要の定数のみ）

`src/games/odeko-poker/theme.ts`:

```ts
// おでこインディアンポーカーのピンク〜紫系（registry グラデと統一）
export const OP = {
	pink: '#F368E0',
	purple: '#8854D0',
	cardFace: '#FFF8F0', // カードの紙面（白系）
	cardText: '#2D2440', // カードの数字（濃紺）
	fight: '#FF4D4F', // 勝負
	fold: '#3B82F6', // 降りる
	hetare: '#FFC53D', // ヘタレ賞
} as const
```

- [ ] **Step 2: Write the failing test**

`src/games/odeko-poker/__tests__/forehead-screen.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { ForeheadScreen, PREP_SECONDS, SHOW_SECONDS } from '../forehead-screen'

jest.mock('@/lib/haptics', () => ({ haptics: { tap: jest.fn(), heavy: jest.fn() } }))
jest.mock('@/lib/sound', () => ({ playSound: jest.fn() }))

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

const props = {
	playerName: 'あか',
	playerColor: '#FF3B5C',
	card: 7,
	onDone: jest.fn(),
}

it('最初は handoff 表示。カードはまだ見えない', async () => {
	const { getByText, queryByText } = await render(<ForeheadScreen {...props} />)
	expect(getByText(/あかさんにスマホを渡して/)).toBeTruthy()
	expect(queryByText('7')).toBeNull()
})

it('受け取りタップ → 覗き見防止カウントダウン中もカードは見えない', async () => {
	const { getByText, queryByText, getByTestId } = await render(<ForeheadScreen {...props} />)
	await act(async () => fireEvent.press(getByText(/受け取った/)))
	expect(getByTestId('prep-countdown')).toBeTruthy()
	expect(getByText(/額に当てて/)).toBeTruthy()
	expect(queryByText('7')).toBeNull()
})

it('カウントダウン終了でカードが大表示され、5秒後に onDone が呼ばれる', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(<ForeheadScreen {...props} onDone={onDone} />)
	await act(async () => fireEvent.press(getByText(/受け取った/)))
	await act(async () => {
		jest.advanceTimersByTime(PREP_SECONDS * 1000)
	})
	expect(getByText('7')).toBeTruthy()
	expect(getByText(/あかさんのカードを覚えて/)).toBeTruthy()
	expect(onDone).not.toHaveBeenCalled()
	await act(async () => {
		jest.advanceTimersByTime(SHOW_SECONDS * 1000)
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/games/odeko-poker/__tests__/forehead-screen.test.tsx`
Expected: FAIL（`../forehead-screen` が存在しない）

- [ ] **Step 4: Write minimal implementation**

`src/games/odeko-poker/forehead-screen.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { OP } from './theme'

export const PREP_SECONDS = 3
export const SHOW_SECONDS = 5

type Step = 'handoff' | 'countdown' | 'showing'

type Props = {
	playerName: string
	playerColor: string
	card: number
	onDone: () => void
}

// 額当て確認フェーズ（1人分）: handoff → 覗き見防止カウントダウン3秒 → カード大表示5秒 → onDone
// 呼び出し側で key={turnIndex} を付けてプレイヤーごとに新規マウントする前提
export function ForeheadScreen({ playerName, playerColor, card, onDone }: Props) {
	const [step, setStep] = useState<Step>('handoff')
	const [seconds, setSeconds] = useState(PREP_SECONDS)

	useEffect(() => {
		if (step === 'handoff') return
		const t = setInterval(() => setSeconds((s) => s - 1), 1000)
		return () => clearInterval(t)
	}, [step])

	useEffect(() => {
		if (seconds > 0) return
		if (step === 'countdown') {
			playSound('reveal')
			setStep('showing')
			setSeconds(SHOW_SECONDS)
		} else if (step === 'showing') {
			onDone()
		}
	}, [seconds, step, onDone])

	if (step === 'handoff') {
		return (
			<View style={styles.body}>
				<Text style={styles.turn}>📲 {playerName}さんにスマホを渡して</Text>
				<Text style={styles.hint}>
					受け取ったら下のボタンをタップ！{'\n'}
					カウントダウン中に画面を外向きにして額に当ててね
				</Text>
				<GradientButton
					title="受け取った！額当て準備"
					onPress={() => {
						haptics.tap()
						setSeconds(PREP_SECONDS)
						setStep('countdown')
					}}
				/>
			</View>
		)
	}

	if (step === 'countdown') {
		return (
			<View style={styles.body}>
				<Text style={styles.hint}>画面を外向きにして額に当てて！</Text>
				<Text style={styles.countdown} testID="prep-countdown">
					{seconds}
				</Text>
			</View>
		)
	}

	return (
		<View style={styles.body} testID="card-face">
			<Text style={styles.hint}>みんなは {playerName}さんのカードを覚えて！</Text>
			<View style={[styles.card, { borderColor: playerColor }]}>
				<Text style={styles.cardValue}>{card}</Text>
			</View>
			<Text style={styles.remaining}>あと{seconds}秒</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	body: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
	turn: { ...typography.title, textAlign: 'center' },
	hint: { ...typography.caption, textAlign: 'center', lineHeight: 20 },
	countdown: { ...typography.hero, fontSize: 96 },
	card: {
		width: 200,
		height: 280,
		borderRadius: radii.lg,
		borderWidth: 6,
		backgroundColor: OP.cardFace,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardValue: { fontSize: 120, fontWeight: '800', color: OP.cardText },
	remaining: { ...typography.body, color: colors.textMuted },
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/games/odeko-poker/__tests__/forehead-screen.test.tsx`
Expected: PASS（3 tests）

- [ ] **Step 6: Commit**

```bash
git add src/games/odeko-poker/theme.ts src/games/odeko-poker/forehead-screen.tsx src/games/odeko-poker/__tests__/forehead-screen.test.tsx
git commit -m "feat: おでこインディアンポーカーの額当て確認画面を追加 (#62)"
```

---

### Task 4: 秘密宣言画面（declare-screen.tsx）

**Files:**
- Create: `src/games/odeko-poker/declare-screen.tsx`
- Test: `src/games/odeko-poker/__tests__/declare-screen.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `Declaration`、Task 3 の `OP`、`GradientButton`、`haptics`
- Produces:
  - `DeclareScreen({ playerName, onDeclare }: { playerName: string; onDeclare: (choice: Declaration) => void })`
  - 定数 `LONG_PRESS_MS = 600`
  - 確定した瞬間に `onDeclare` が呼ばれ、親が turnIndex を進めて次の人の handoff（＝中立画面）に切り替わることで宣言は秘密になる

- [ ] **Step 1: Write the failing test**

`src/games/odeko-poker/__tests__/declare-screen.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { DeclareScreen } from '../declare-screen'

jest.mock('@/lib/haptics', () => ({ haptics: { tap: jest.fn(), heavy: jest.fn() } }))
jest.mock('@/lib/sound', () => ({ playSound: jest.fn() }))

it('最初は handoff 表示。宣言ボタンはまだ見えない', async () => {
	const { getByText, queryByText } = await render(
		<DeclareScreen playerName="あか" onDeclare={jest.fn()} />,
	)
	expect(getByText(/あかさんにスマホを渡して/)).toBeTruthy()
	expect(queryByText(/勝負/)).toBeNull()
})

it('受け取り後、長押しで「勝負」を確定できる（タップでは確定しない）', async () => {
	const onDeclare = jest.fn()
	const { getByText } = await render(<DeclareScreen playerName="あか" onDeclare={onDeclare} />)
	await act(async () => fireEvent.press(getByText(/受け取った/)))
	await act(async () => fireEvent.press(getByText(/勝負/)))
	expect(onDeclare).not.toHaveBeenCalled()
	await act(async () => fireEvent(getByText(/勝負/), 'longPress'))
	expect(onDeclare).toHaveBeenCalledWith('fight')
})

it('長押しで「降りる」を確定できる', async () => {
	const onDeclare = jest.fn()
	const { getByText } = await render(<DeclareScreen playerName="あか" onDeclare={onDeclare} />)
	await act(async () => fireEvent.press(getByText(/受け取った/)))
	await act(async () => fireEvent(getByText(/降りる/), 'longPress'))
	expect(onDeclare).toHaveBeenCalledWith('fold')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/games/odeko-poker/__tests__/declare-screen.test.tsx`
Expected: FAIL（`../declare-screen` が存在しない）

- [ ] **Step 3: Write minimal implementation**

`src/games/odeko-poker/declare-screen.tsx`:

```tsx
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { radii, spacing, typography } from '@/theme/tokens'
import type { Declaration } from './engine'
import { OP } from './theme'

export const LONG_PRESS_MS = 600

type Props = {
	playerName: string
	onDeclare: (choice: Declaration) => void
}

// 宣言フェーズ（1人分）: handoff → 長押しで秘密宣言。確定した瞬間に親が次の人の
// handoff（＝中立画面）へ切り替えるので、宣言内容は結果発表まで誰にも見えない。
// 呼び出し側で key={turnIndex} を付けてプレイヤーごとに新規マウントする前提
export function DeclareScreen({ playerName, onDeclare }: Props) {
	const [step, setStep] = useState<'handoff' | 'choose'>('handoff')

	const confirm = (choice: Declaration) => {
		haptics.heavy()
		onDeclare(choice)
	}

	if (step === 'handoff') {
		return (
			<View style={styles.body}>
				<Text style={styles.turn}>📲 {playerName}さんにスマホを渡して</Text>
				<Text style={styles.hint}>宣言はまわりに見せないでね</Text>
				<GradientButton
					title="受け取った！"
					onPress={() => {
						haptics.tap()
						setStep('choose')
					}}
				/>
			</View>
		)
	}

	return (
		<View style={styles.body}>
			<Text style={styles.turn}>{playerName}さんの宣言</Text>
			<Text style={styles.hint}>どちらかを長押しで確定！（確定したら即、次の人へ）</Text>
			<Pressable
				accessibilityRole="button"
				delayLongPress={LONG_PRESS_MS}
				onLongPress={() => confirm('fight')}
				style={({ pressed }) => [styles.choice, styles.fight, pressed && styles.pressed]}
			>
				<Text style={styles.choiceText}>🔥 勝負</Text>
			</Pressable>
			<Pressable
				accessibilityRole="button"
				delayLongPress={LONG_PRESS_MS}
				onLongPress={() => confirm('fold')}
				style={({ pressed }) => [styles.choice, styles.fold, pressed && styles.pressed]}
			>
				<Text style={styles.choiceText}>🏳️ 降りる</Text>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	body: { flex: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.md },
	turn: { ...typography.title, textAlign: 'center' },
	hint: { ...typography.caption, textAlign: 'center' },
	choice: {
		minHeight: 96,
		borderRadius: radii.lg,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	fight: { borderColor: OP.fight, backgroundColor: `${OP.fight}22` },
	fold: { borderColor: OP.fold, backgroundColor: `${OP.fold}22` },
	pressed: { opacity: 0.6 },
	choiceText: { ...typography.hero },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/games/odeko-poker/__tests__/declare-screen.test.tsx`
Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add src/games/odeko-poker/declare-screen.tsx src/games/odeko-poker/__tests__/declare-screen.test.tsx
git commit -m "feat: おでこインディアンポーカーの秘密宣言画面を追加 (#62)"
```

---

### Task 5: 結果発表画面（result-screen.tsx）

**Files:**
- Create: `src/games/odeko-poker/result-screen.tsx`
- Test: `src/games/odeko-poker/__tests__/result-screen.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `Declaration` / `Judgement`、Task 3 の `OP`、共通の `DrumrollReveal`（`@/components/game/drumroll-reveal`）と `useDrumroll`（`@/components/game/use-drumroll`、演出 2000ms）、`@/theme/player-colors` の `playerColor(index)`
- Produces:
  - `ResultScreen({ names, cards, declarations, judgement, onNextRound, onHome }: { names: string[]; cards: number[]; declarations: Declaration[]; judgement: Judgement; onNextRound: () => void; onHome: () => void })`

- [ ] **Step 1: Write the failing test**

`src/games/odeko-poker/__tests__/result-screen.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import type { Judgement } from '../engine'
import { ResultScreen } from '../result-screen'

jest.mock('@/lib/haptics', () => ({ haptics: { tap: jest.fn(), heavy: jest.fn() } }))
jest.mock('@/lib/sound', () => ({ playSound: jest.fn() }))

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

const names = ['あか', 'あお', 'みどり']
const cards = [5, 13, 2]

async function renderRevealed(judgement: Judgement, declarations: ('fight' | 'fold')[]) {
	const onNextRound = jest.fn()
	const utils = await render(
		<ResultScreen
			names={names}
			cards={cards}
			declarations={declarations}
			judgement={judgement}
			onNextRound={onNextRound}
			onHome={jest.fn()}
		/>,
	)
	// ドラムロール（2000ms）を進めて発表まで到達させる
	await act(async () => {
		jest.advanceTimersByTime(2100)
	})
	return { ...utils, onNextRound }
}

it('ドラムロール中はカードを公開しない', async () => {
	const j: Judgement = { outcome: 'normal', loserIndices: [0], winnerIndex: null, hetareIndex: null }
	const { queryByText } = await render(
		<ResultScreen
			names={names}
			cards={cards}
			declarations={['fight', 'fight', 'fight']}
			judgement={j}
			onNextRound={jest.fn()}
			onHome={jest.fn()}
		/>,
	)
	expect(queryByText('13')).toBeNull()
})

it('normal: 敗者の名前と全カード・全宣言が公開される', async () => {
	const j: Judgement = { outcome: 'normal', loserIndices: [0], winnerIndex: null, hetareIndex: null }
	const { getByText, getAllByText } = await renderRevealed(j, ['fight', 'fight', 'fight'])
	expect(getByText(/あかさんの負け/)).toBeTruthy()
	expect(getByText('5')).toBeTruthy()
	expect(getByText('13')).toBeTruthy()
	expect(getByText('2')).toBeTruthy()
	expect(getAllByText('勝負')).toHaveLength(3)
})

it('solo-fight: 一人勝ちの発表になり、負けなし', async () => {
	const j: Judgement = {
		outcome: 'solo-fight',
		loserIndices: [],
		winnerIndex: 1,
		hetareIndex: null,
	}
	const { getByText, queryByText } = await renderRevealed(j, ['fold', 'fight', 'fold'])
	expect(getByText(/あおさんの一人勝ち/)).toBeTruthy()
	expect(queryByText(/負け！/)).toBeNull()
})

it('all-fold: 全員負けの発表', async () => {
	const j: Judgement = { outcome: 'all-fold', loserIndices: [0, 1, 2], winnerIndex: null, hetareIndex: 1 }
	const { getByText } = await renderRevealed(j, ['fold', 'fold', 'fold'])
	expect(getByText(/全員降り/)).toBeTruthy()
})

it('ヘタレ賞のバッジと説明が表示される', async () => {
	const j: Judgement = { outcome: 'solo-fight', loserIndices: [], winnerIndex: 0, hetareIndex: 1 }
	const { getByText } = await renderRevealed(j, ['fight', 'fold', 'fold'])
	expect(getByText(/ヘタレ賞/)).toBeTruthy()
	expect(getByText(/最強カードなのに降りた あおさんも一緒に飲もう/)).toBeTruthy()
})

it('「次のラウンド」で onNextRound が呼ばれる', async () => {
	const j: Judgement = { outcome: 'all-fold', loserIndices: [0, 1, 2], winnerIndex: null, hetareIndex: null }
	const { getByText, onNextRound } = await renderRevealed(j, ['fold', 'fold', 'fold'])
	await act(async () => fireEvent.press(getByText(/次のラウンド/)))
	expect(onNextRound).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/games/odeko-poker/__tests__/result-screen.test.tsx`
Expected: FAIL（`../result-screen` が存在しない）

- [ ] **Step 3: Write minimal implementation**

`src/games/odeko-poker/result-screen.tsx`:

```tsx
import { useEffect } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { useDrumroll } from '@/components/game/use-drumroll'
import { GradientButton } from '@/components/ui/gradient-button'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import type { Declaration, Judgement } from './engine'
import { OP } from './theme'

type Props = {
	names: string[]
	cards: number[]
	declarations: Declaration[]
	judgement: Judgement
	onNextRound: () => void
	onHome: () => void
}

function banner(judgement: Judgement, names: string[]): string {
	if (judgement.outcome === 'all-fold') return '全員降り！全員負け！🍻'
	if (judgement.outcome === 'solo-fight')
		return `${names[judgement.winnerIndex ?? 0]}さんの一人勝ち！🎉`
	return `${names[judgement.loserIndices[0]]}さんの負け！💀`
}

// ドラムロール → 全カード＋全宣言の一斉公開 → 敗者・一人勝ち・全員負け＋ヘタレ賞の発表
export function ResultScreen({
	names,
	cards,
	declarations,
	judgement,
	onNextRound,
	onHome,
}: Props) {
	const { phase, start } = useDrumroll()

	useEffect(() => {
		start()
	}, [start])

	if (phase !== 'revealed') {
		return (
			<View style={styles.rolling}>
				<Text style={styles.hint}>結果発表…！</Text>
				<DrumrollReveal phase="rolling" />
			</View>
		)
	}

	return (
		<ScrollView contentContainerStyle={styles.body}>
			<DrumrollReveal phase="revealed">
				<Text style={styles.banner}>{banner(judgement, names)}</Text>
			</DrumrollReveal>

			<View style={styles.rows}>
				{names.map((name, i) => {
					const isLoser = judgement.loserIndices.includes(i)
					const isWinner = judgement.winnerIndex === i
					const isHetare = judgement.hetareIndex === i
					return (
						<View key={i} style={[styles.row, isLoser && styles.rowLoser]}>
							<View style={[styles.colorBar, { backgroundColor: playerColor(i).value }]} />
							<Text style={styles.name} numberOfLines={1}>
								{name}
							</Text>
							<View
								style={[
									styles.chip,
									declarations[i] === 'fight' ? styles.chipFight : styles.chipFold,
								]}
							>
								<Text style={styles.chipText}>
									{declarations[i] === 'fight' ? '勝負' : '降りる'}
								</Text>
							</View>
							<Text style={styles.badges}>
								{isLoser ? '💀' : ''}
								{isWinner ? '👑' : ''}
								{isHetare ? '🐔ヘタレ賞' : ''}
							</Text>
							<Text style={styles.cardValue}>{cards[i]}</Text>
						</View>
					)
				})}
			</View>

			{judgement.hetareIndex !== null && (
				<Text style={styles.hetareNote}>
					🐔 最強カードなのに降りた {names[judgement.hetareIndex]}さんも一緒に飲もう！
				</Text>
			)}

			<GradientButton title="次のラウンド" onPress={onNextRound} />
			<Pressable accessibilityRole="button" onPress={onHome}>
				<Text style={styles.home}>終了してホームへ</Text>
			</Pressable>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	rolling: { flex: 1, justifyContent: 'center', gap: spacing.lg },
	body: { flexGrow: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.md },
	hint: { ...typography.caption, textAlign: 'center' },
	banner: { ...typography.hero, textAlign: 'center' },
	rows: { gap: spacing.sm },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		padding: spacing.sm,
	},
	rowLoser: { borderColor: colors.danger },
	colorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
	name: { ...typography.body, flex: 1 },
	chip: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
	chipFight: { backgroundColor: `${OP.fight}33` },
	chipFold: { backgroundColor: `${OP.fold}33` },
	chipText: { ...typography.caption, color: colors.text },
	badges: { ...typography.caption, color: OP.hetare },
	cardValue: { ...typography.title, minWidth: 44, textAlign: 'right' },
	hetareNote: { ...typography.body, textAlign: 'center', color: OP.hetare },
	home: { ...typography.caption, textAlign: 'center', padding: spacing.sm },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/games/odeko-poker/__tests__/result-screen.test.tsx`
Expected: PASS（6 tests）

- [ ] **Step 5: Commit**

```bash
git add src/games/odeko-poker/result-screen.tsx src/games/odeko-poker/__tests__/result-screen.test.tsx
git commit -m "feat: おでこインディアンポーカーの結果発表画面を追加 (#62)"
```

---

### Task 6: ルートコンポーネント（odeko-poker-game.tsx）＋統合テスト

**Files:**
- Create: `src/games/odeko-poker/odeko-poker-game.tsx`
- Test: `src/games/odeko-poker/__tests__/odeko-poker-game.test.tsx`

**Interfaces:**
- Consumes: Task 2 の `initialState` / `reduce`、Task 3〜5 の各画面、`@/lib/players-store` の `usePlayers` / `getDisplayNames`、`@/theme/player-colors` の `playerColor`、`expo-router` の `router.replace('/')`
- Produces: `OdekoPokerGame()`（registry の `Component` に渡す。Task 7 が import する）

- [ ] **Step 1: Write the failing test**

宣言の組み合わせだけで結果が決まるケース（全員降り／一人勝ち）を使い、カードの中身に依存しない統合テストにする。

`src/games/odeko-poker/__tests__/odeko-poker-game.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { PREP_SECONDS, SHOW_SECONDS } from '../forehead-screen'
import { OdekoPokerGame } from '../odeko-poker-game'

jest.mock('@/lib/haptics', () => ({ haptics: { tap: jest.fn(), heavy: jest.fn() } }))
jest.mock('@/lib/sound', () => ({ playSound: jest.fn() }))
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }))
jest.mock('@/lib/players-store', () => ({
	usePlayers: () => ({ count: 3, names: ['あか', 'あお', 'みどり'], history: [] }),
	getDisplayNames: () => ['あか', 'あお', 'みどり'],
}))

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

type Utils = Awaited<ReturnType<typeof render>>

// deal → 3人分の額当てを消化して宣言フェーズ先頭まで進める
async function toDeclarePhase(utils: Utils) {
	await act(async () => fireEvent.press(utils.getByText('カードを配る')))
	for (let i = 0; i < 3; i++) {
		await act(async () => fireEvent.press(utils.getByText(/受け取った！額当て準備/)))
		await act(async () => {
			jest.advanceTimersByTime((PREP_SECONDS + SHOW_SECONDS) * 1000)
		})
	}
}

async function declareAll(utils: Utils, choices: ('勝負' | '降りる')[]) {
	for (const choice of choices) {
		await act(async () => fireEvent.press(utils.getByText('受け取った！')))
		await act(async () => fireEvent(utils.getByText(new RegExp(choice)), 'longPress'))
	}
}

it('deal 画面から始まり、額当て→宣言→全員降りで「全員負け」発表まで通る', async () => {
	const utils = await render(<OdekoPokerGame />)
	expect(utils.getByText(/ラウンド 1/)).toBeTruthy()
	await toDeclarePhase(utils)
	expect(utils.getByText(/あかさんにスマホを渡して/)).toBeTruthy()
	await declareAll(utils, ['降りる', '降りる', '降りる'])
	await act(async () => {
		jest.advanceTimersByTime(2100)
	})
	expect(utils.getByText(/全員降り/)).toBeTruthy()
})

it('勝負1人なら一人勝ちが発表され、次のラウンドで deal に戻る', async () => {
	const utils = await render(<OdekoPokerGame />)
	await toDeclarePhase(utils)
	await declareAll(utils, ['勝負', '降りる', '降りる'])
	await act(async () => {
		jest.advanceTimersByTime(2100)
	})
	expect(utils.getByText(/あかさんの一人勝ち/)).toBeTruthy()
	await act(async () => fireEvent.press(utils.getByText('次のラウンド')))
	expect(utils.getByText(/ラウンド 2/)).toBeTruthy()
})

it('宣言確定の直後は次の人の handoff（中立画面）で、宣言内容は表示されない', async () => {
	const utils = await render(<OdekoPokerGame />)
	await toDeclarePhase(utils)
	await act(async () => fireEvent.press(utils.getByText('受け取った！')))
	await act(async () => fireEvent(utils.getByText(/勝負/), 'longPress'))
	expect(utils.getByText(/あおさんにスマホを渡して/)).toBeTruthy()
	expect(utils.queryByText(/勝負/)).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/games/odeko-poker/__tests__/odeko-poker-game.test.tsx`
Expected: FAIL（`../odeko-poker-game` が存在しない）

- [ ] **Step 3: Write minimal implementation**

`src/games/odeko-poker/odeko-poker-game.tsx`:

```tsx
import { router } from 'expo-router'
import { useReducer } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { playerColor } from '@/theme/player-colors'
import { spacing, typography } from '@/theme/tokens'
import { DeclareScreen } from './declare-screen'
import { ForeheadScreen } from './forehead-screen'
import { initialState, reduce } from './reducer'
import { ResultScreen } from './result-screen'

export function OdekoPokerGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [state, dispatch] = useReducer(reduce, players.count, initialState)

	return (
		<View style={styles.container}>
			{state.phase === 'deal' && (
				<View style={styles.body}>
					<Text style={styles.title}>ラウンド {state.round}</Text>
					<Text style={styles.hint}>
						1〜13のカードを1枚ずつ配ります{'\n'}
						自分のカードだけは見ちゃダメ！
					</Text>
					<GradientButton
						title="カードを配る"
						onPress={() => {
							haptics.tap()
							dispatch({ type: 'start', rng: Math.random })
						}}
					/>
				</View>
			)}

			{state.phase === 'forehead' && (
				<ForeheadScreen
					key={state.turnIndex}
					playerName={names[state.turnIndex]}
					playerColor={playerColor(state.turnIndex).value}
					card={state.cards[state.turnIndex]}
					onDone={() => dispatch({ type: 'foreheadDone' })}
				/>
			)}

			{state.phase === 'declare' && (
				<DeclareScreen
					key={state.turnIndex}
					playerName={names[state.turnIndex]}
					onDeclare={(choice) => dispatch({ type: 'declare', choice })}
				/>
			)}

			{state.phase === 'result' && state.judgement && (
				<ResultScreen
					names={names}
					cards={state.cards}
					declarations={state.declarations}
					judgement={state.judgement}
					onNextRound={() => dispatch({ type: 'nextRound' })}
					onHome={() => router.replace('/')}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: spacing.md },
	body: { flex: 1, justifyContent: 'center', gap: spacing.lg },
	title: { ...typography.hero, textAlign: 'center' },
	hint: { ...typography.caption, textAlign: 'center', lineHeight: 20 },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/games/odeko-poker/__tests__/odeko-poker-game.test.tsx`
Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add src/games/odeko-poker/odeko-poker-game.tsx src/games/odeko-poker/__tests__/odeko-poker-game.test.tsx
git commit -m "feat: おでこインディアンポーカーのルート画面を追加 (#62)"
```

---

### Task 7: registry 登録・CLAUDE.md 追記・全体検証

**Files:**
- Modify: `src/games/registry.ts`（import 追加＋ games 配列末尾に entry 追加）
- Modify: `CLAUDE.md`（収録ゲーム候補に1行追記）

**Interfaces:**
- Consumes: Task 6 の `OdekoPokerGame`
- Produces: ホームの2列グリッドに👑バッジ付きで表示され、プレミアムゲート（既存共通実装）で全体ロックされる

- [ ] **Step 1: registry に import と entry を追加**

`src/games/registry.ts` の import 群（アルファベット順の並びに合わせて `NoKingGame` の下あたり）へ:

```ts
import { OdekoPokerGame } from './odeko-poker/odeko-poker-game'
```

`games` 配列の末尾（`sasayaki-limit` エントリの後）へ:

```ts
	{
		id: 'odeko-poker',
		title: 'おでこインディアンポーカー',
		tagline: '自分だけ見えないカードで勝負！',
		emoji: '🎴',
		gradient: ['#F368E0', '#8854D0'],
		minPlayers: 3,
		maxPlayers: 12,
		requiresPlayers: true,
		premium: true,
		catchCopy: '額に当てたカードは自分だけ見えない！\nみんなの反応で勝負か降りるか決めろ！',
		summary:
			'このゲームは、スマホを額に当てて「自分だけ見えないカード」を掲げるインディアンポーカーです！他人の反応だけを頼りに「勝負」か「降りる」かをこっそり宣言。勝負した中で最弱カードの人が負け、最強カードなのに降りたら「ヘタレ賞」で一緒に飲みます！',
		howToPlay: [
			'① メンバーを登録（3〜12名）して、1〜13のカードを1枚ずつ配ろう！',
			'② 順番にスマホを額に当てて5秒キープ！自分は見えない、みんなは覚えて！',
			'③ みんなの反応を頼りに「勝負」か「降りる」を長押しでこっそり宣言！',
			'④ 全カード公開！勝負した中で最弱の人が負け。最強カードで降りたら「ヘタレ賞」！',
		],
		Component: OdekoPokerGame,
	},
```

- [ ] **Step 2: CLAUDE.md の収録ゲーム候補に追記**

「• ささやきリミット – …」の行の直後に:

```
• おでこインディアンポーカー – スマホを額に当てて「自分だけ見えないカード」を掲げ、他人の反応で勝負か降りるかを決めるインディアンポーカー（プレミアム）。
```

- [ ] **Step 3: 全体検証**

Run:

```bash
npx jest src/games/odeko-poker
npm test
npm run typecheck
npm run lint
npm run format:check
```

Expected: すべて PASS / エラー0（format:check が落ちたら `npm run format` して再確認）

- [ ] **Step 4: 手動スモーク（可能なら）**

`npm start` → Expo Go でホームに「おでこインディアンポーカー」が👑付きで出ること、（開発ビルドのプレミアム解放状態で）3人設定で deal→額当て→宣言→結果まで一周できることを確認。CI 環境等で実機確認できない場合はスキップし、PR に記載する。

- [ ] **Step 5: Commit**

```bash
git add src/games/registry.ts CLAUDE.md
git commit -m "feat: おでこインディアンポーカーを registry に追加 (#62)"
```

---

## 完了後

- superpowers:finishing-a-development-branch スキルに従い、develop 向け PR を作成（`gh pr create --base develop`）。PR 本文に spec / plan へのリンクと #62 の受け入れ条件チェックリストを記載
- サムネイル画像（intro/card）は別 issue の運用（#59 / #67 と同様、後続で追加）なので本 PR には含めない
