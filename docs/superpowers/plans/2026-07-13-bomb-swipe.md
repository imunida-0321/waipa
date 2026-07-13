# 爆弾スワイプ度胸試し（#63）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ゲージスワイプで攻めるほど高得点、ただし非表示の地雷（プレイヤーごとに60〜95のランダム位置）を踏むと爆発する1台回しの度胸試しゲームをプレミアム枠で追加する。

**Architecture:** 既存ゲームの慣例に従い、純関数エンジン（`engine.ts`）＋表示コンポーネント（gauge / round-result / game本体）＋定数（`theme.ts`）に分離。状態遷移は burst-chicken と同じ `useReducer` パターン。スワイプは RN 標準の responder イベント（`react-native-gesture-handler` の Gesture API は本コードベース未使用のため導入しない）。

**Tech Stack:** React Native (Expo SDK 57) / TypeScript / jest-expo + @testing-library/react-native

**仕様書:** `docs/superpowers/specs/2026-07-13-bomb-swipe-design.md`

## Global Constraints

- コードフォーマット: タブ幅4・セミコロンなし・シングルクォート（既存 prettier 設定に従う。コミット前に `npx prettier --write <files>`）
- コメントは日本語で「コードから読めない制約」のみ書く（既存ファイル参照）
- テストは React 19 規約: `await render(...)`、状態更新を伴う操作は `await act(async () => { fireEvent... })`（参照実装: `src/games/burst-chicken/__tests__/burst-chicken-game.test.tsx`）
- ゲームID: `bomb-swipe`、表示名「爆弾スワイプ」、2〜12人、`requiresPlayers: true`、`premium: true`
- 地雷範囲: `MINE_MIN = 60`〜`MINE_MAX = 95`（整数・一様乱数・プレイヤーごと）。**スコア ≥ 地雷位置で爆発**
- スコア: 整数 0〜100（`SCORE_MAX = 100`）
- 敗者: 爆発者がいれば爆発者全員 / いなければ最低スコア全員（同率含む）
- 効果音は `playSound(name)`（未登録名は無音スキップ）。心音 `heartbeat` は未収録でも動く実装にする

---

### Task 1: engine 判定純関数（pickMine / isExploded / scoreFromDrag）

**Files:**

- Create: `src/games/bomb-swipe/engine.ts`
- Test: `src/games/bomb-swipe/__tests__/engine.test.ts`

**Interfaces:**

- Produces: `Rng = () => number` / `MINE_MIN: 60` / `MINE_MAX: 95` / `SCORE_MAX: 100` / `pickMine(rng: Rng): number` / `isExploded(score: number, mine: number): boolean` / `scoreFromDrag(dragPx: number, trackPx: number): number`

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// src/games/bomb-swipe/__tests__/engine.test.ts
import { MINE_MAX, MINE_MIN, isExploded, pickMine, scoreFromDrag } from '../engine'

describe('pickMine', () => {
	it('rng=0 で下限、rng≒1 で上限になる', () => {
		expect(pickMine(() => 0)).toBe(MINE_MIN)
		expect(pickMine(() => 0.9999999)).toBe(MINE_MAX)
	})

	it('常に整数で 60〜95 に収まる', () => {
		for (let i = 0; i < 100; i++) {
			const mine = pickMine(Math.random)
			expect(Number.isInteger(mine)).toBe(true)
			expect(mine).toBeGreaterThanOrEqual(MINE_MIN)
			expect(mine).toBeLessThanOrEqual(MINE_MAX)
		}
	})
})

describe('isExploded', () => {
	it('地雷ちょうどは爆発（踏んだらアウト）', () => {
		expect(isExploded(60, 60)).toBe(true)
	})

	it('地雷未満はセーフ、超過は爆発', () => {
		expect(isExploded(59, 60)).toBe(false)
		expect(isExploded(61, 60)).toBe(true)
	})
})

describe('scoreFromDrag', () => {
	it('ドラッグ量をトラック高さ比の 0〜100 整数に変換する', () => {
		expect(scoreFromDrag(0, 400)).toBe(0)
		expect(scoreFromDrag(200, 400)).toBe(50)
		expect(scoreFromDrag(400, 400)).toBe(100)
	})

	it('範囲外はクランプする（下方向ドラッグ・トラック超え）', () => {
		expect(scoreFromDrag(-50, 400)).toBe(0)
		expect(scoreFromDrag(500, 400)).toBe(100)
	})

	it('トラック高さ 0 以下では 0 を返す（レイアウト前の防御）', () => {
		expect(scoreFromDrag(100, 0)).toBe(0)
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd /Users/hiro/Desktop/Waipa/.claude/worktrees/63-bomb-swipe && npx jest src/games/bomb-swipe --verbose`
Expected: FAIL（`../engine` が存在しない）

- [ ] **Step 3: 最小実装**

```typescript
// src/games/bomb-swipe/engine.ts
export type Rng = () => number

export const MINE_MIN = 60
export const MINE_MAX = 95
export const SCORE_MAX = 100

// 地雷位置: 60〜95 の整数を一様ランダムで決める（プレイヤーごとに1個）
export function pickMine(rng: Rng): number {
	return MINE_MIN + Math.floor(rng() * (MINE_MAX - MINE_MIN + 1))
}

// 地雷ちょうども「踏んだ」扱いで爆発（2026-07-13 ブレスト決定）
export function isExploded(score: number, mine: number): boolean {
	return score >= mine
}

// 上方向ドラッグ量(px)をスコア 0〜100 に変換。レイアウト確定前(trackPx<=0)は 0
export function scoreFromDrag(dragPx: number, trackPx: number): number {
	if (trackPx <= 0) return 0
	return Math.min(SCORE_MAX, Math.max(0, Math.round((dragPx / trackPx) * SCORE_MAX)))
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/bomb-swipe --verbose`
Expected: PASS（3 describe / 7 tests）

- [ ] **Step 5: コミット**

```bash
git add src/games/bomb-swipe && git commit -m "feat: 爆弾スワイプの判定純関数（地雷生成・爆発判定・スコア変換）(#63)"
```

---

### Task 2: engine 敗者判定（decideLosers）

**Files:**

- Modify: `src/games/bomb-swipe/engine.ts`
- Test: `src/games/bomb-swipe/__tests__/engine.test.ts`（追記）

**Interfaces:**

- Produces: `PlayerResult = { score: number; exploded: boolean }` / `decideLosers(results: PlayerResult[]): number[]`（敗者のプレイヤーindex配列）

- [ ] **Step 1: 失敗するテストを追記**

```typescript
// engine.test.ts に追記
import { decideLosers } from '../engine' // 既存 import に追加

describe('decideLosers', () => {
	const safe = (score: number) => ({ score, exploded: false })
	const boom = (score: number) => ({ score, exploded: true })

	it('爆発者がいれば爆発者全員が負け（スコアは無関係）', () => {
		expect(decideLosers([safe(10), boom(70), boom(90), safe(50)])).toEqual([1, 2])
	})

	it('全員爆発なら全員負け', () => {
		expect(decideLosers([boom(60), boom(80)])).toEqual([0, 1])
	})

	it('爆発者ゼロなら最低スコアが負け', () => {
		expect(decideLosers([safe(30), safe(10), safe(50)])).toEqual([1])
	})

	it('同率最低は全員負け', () => {
		expect(decideLosers([safe(20), safe(20), safe(50)])).toEqual([0, 1])
	})

	it('2人同スコアでも同率負け（最少人数の境界）', () => {
		expect(decideLosers([safe(0), safe(0)])).toEqual([0, 1])
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/bomb-swipe --verbose`
Expected: FAIL（`decideLosers` が未 export）

- [ ] **Step 3: 最小実装**

```typescript
// engine.ts に追記
export type PlayerResult = {
	score: number
	exploded: boolean
}

// 爆発者がいれば爆発者全員、いなければ最低スコア全員（同率含む）が負け
export function decideLosers(results: PlayerResult[]): number[] {
	const exploded = results.flatMap((r, i) => (r.exploded ? [i] : []))
	if (exploded.length > 0) return exploded
	const min = Math.min(...results.map((r) => r.score))
	return results.flatMap((r, i) => (r.score === min ? [i] : []))
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/bomb-swipe --verbose`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/games/bomb-swipe && git commit -m "feat: 爆弾スワイプの敗者判定（爆発優先・同率最低は全員負け）(#63)"
```

---

### Task 3: engine 状態遷移 reducer

**Files:**

- Modify: `src/games/bomb-swipe/engine.ts`
- Test: `src/games/bomb-swipe/__tests__/engine.test.ts`（追記）

**Interfaces:**

- Produces:
    - `Phase = 'handoff' | 'swiping' | 'safe' | 'exploded' | 'result'`
    - `State = { phase: Phase; turnIndex: number; playerCount: number; mines: number[]; results: (PlayerResult | null)[] }`
    - `Action = { type: 'startSwipe' } | { type: 'release'; score: number } | { type: 'next' } | { type: 'restart'; rng: Rng }`
    - `createInitialState(playerCount: number, rng: Rng): State`
    - `reduce(state: State, action: Action): State`

- [ ] **Step 1: 失敗するテストを追記**

```typescript
// engine.test.ts に追記
import { createInitialState, reduce, type State } from '../engine' // 既存 import に追加

describe('reduce', () => {
	// rng=0 で全員の地雷が 60 に固定される
	const init = (count: number) => createInitialState(count, () => 0)

	it('初期状態: handoff・先頭手番・地雷はプレイヤー数ぶん生成・結果は全て null', () => {
		const s = init(3)
		expect(s.phase).toBe('handoff')
		expect(s.turnIndex).toBe(0)
		expect(s.mines).toEqual([60, 60, 60])
		expect(s.results).toEqual([null, null, null])
	})

	it('startSwipe で swiping へ', () => {
		expect(reduce(init(2), { type: 'startSwipe' }).phase).toBe('swiping')
	})

	it('release: 地雷未満なら safe、結果が記録される', () => {
		const s = reduce(reduce(init(2), { type: 'startSwipe' }), { type: 'release', score: 59 })
		expect(s.phase).toBe('safe')
		expect(s.results[0]).toEqual({ score: 59, exploded: false })
	})

	it('release: 地雷ちょうどで exploded', () => {
		const s = reduce(reduce(init(2), { type: 'startSwipe' }), { type: 'release', score: 60 })
		expect(s.phase).toBe('exploded')
		expect(s.results[0]).toEqual({ score: 60, exploded: true })
	})

	it('next: 残り手番があれば次の handoff、全員終了で result', () => {
		let s: State = init(2)
		s = reduce(s, { type: 'startSwipe' })
		s = reduce(s, { type: 'release', score: 10 })
		s = reduce(s, { type: 'next' })
		expect(s.phase).toBe('handoff')
		expect(s.turnIndex).toBe(1)
		s = reduce(s, { type: 'startSwipe' })
		s = reduce(s, { type: 'release', score: 20 })
		s = reduce(s, { type: 'next' })
		expect(s.phase).toBe('result')
	})

	it('restart: result から初期状態へ戻る', () => {
		let s: State = init(2)
		s = reduce(s, { type: 'startSwipe' })
		s = reduce(s, { type: 'release', score: 10 })
		s = reduce(s, { type: 'next' })
		s = reduce(s, { type: 'startSwipe' })
		s = reduce(s, { type: 'release', score: 20 })
		s = reduce(s, { type: 'next' })
		const restarted = reduce(s, { type: 'restart', rng: () => 0 })
		expect(restarted.phase).toBe('handoff')
		expect(restarted.turnIndex).toBe(0)
		expect(restarted.results).toEqual([null, null])
	})

	it('不正な遷移は無視する（swiping 以外で release 等）', () => {
		const s = init(2)
		expect(reduce(s, { type: 'release', score: 50 })).toBe(s)
		expect(reduce(s, { type: 'next' })).toBe(s)
		expect(reduce(s, { type: 'restart', rng: () => 0 })).toBe(s)
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/bomb-swipe --verbose`
Expected: FAIL（`createInitialState` / `reduce` が未 export）

- [ ] **Step 3: 最小実装**

```typescript
// engine.ts に追記
export type Phase = 'handoff' | 'swiping' | 'safe' | 'exploded' | 'result'

export type State = {
	phase: Phase
	turnIndex: number
	playerCount: number
	mines: number[] // プレイヤーごとの地雷位置。リザルトの答え合わせまで UI に出さない
	results: (PlayerResult | null)[]
}

export type Action =
	| { type: 'startSwipe' }
	| { type: 'release'; score: number }
	| { type: 'next' }
	| { type: 'restart'; rng: Rng }

export function createInitialState(playerCount: number, rng: Rng): State {
	return {
		phase: 'handoff',
		turnIndex: 0,
		playerCount,
		mines: Array.from({ length: playerCount }, () => pickMine(rng)),
		results: Array(playerCount).fill(null),
	}
}

export function reduce(state: State, action: Action): State {
	switch (action.type) {
		case 'startSwipe': {
			if (state.phase !== 'handoff') return state
			return { ...state, phase: 'swiping' }
		}
		case 'release': {
			if (state.phase !== 'swiping') return state
			const exploded = isExploded(action.score, state.mines[state.turnIndex])
			const results = state.results.map((r, i) =>
				i === state.turnIndex ? { score: action.score, exploded } : r,
			)
			return { ...state, results, phase: exploded ? 'exploded' : 'safe' }
		}
		case 'next': {
			if (state.phase !== 'safe' && state.phase !== 'exploded') return state
			if (state.turnIndex + 1 < state.playerCount) {
				return { ...state, phase: 'handoff', turnIndex: state.turnIndex + 1 }
			}
			return { ...state, phase: 'result' }
		}
		case 'restart': {
			if (state.phase !== 'result') return state
			return createInitialState(state.playerCount, action.rng)
		}
	}
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/bomb-swipe --verbose`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/games/bomb-swipe && git commit -m "feat: 爆弾スワイプの状態遷移 reducer（handoff→swiping→safe/exploded→result）(#63)"
```

---

### Task 4: theme.ts とスワイプゲージ（gauge.tsx）

**Files:**

- Create: `src/games/bomb-swipe/theme.ts`
- Create: `src/games/bomb-swipe/gauge.tsx`
- Test: `src/games/bomb-swipe/__tests__/gauge.test.tsx`

**Interfaces:**

- Consumes: `scoreFromDrag(dragPx, trackPx)`（Task 1）
- Produces:
    - `theme.ts`: `BS = { red: '#FF4D4F', maskRed: 'rgba(255,45,45,0.9)', gaugeFrom: '#FFC53D', gaugeTo: '#FF4D4F' }`
    - `gauge.tsx`: `SwipeGauge({ onScoreChange, onRelease }: { onScoreChange: (score: number) => void; onRelease: (score: number) => void })` — testID `swipe-gauge`（責務: タッチ追跡とスコア表示のみ。判定・演出は親）

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// src/games/bomb-swipe/__tests__/gauge.test.tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { SwipeGauge } from '../gauge'

jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

function layout(gauge: any) {
	fireEvent(gauge, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 400 } } })
}

it('初期表示はスコア 0', async () => {
	const { getByTestId, getByText } = await render(
		<SwipeGauge onScoreChange={() => {}} onRelease={() => {}} />,
	)
	layout(getByTestId('swipe-gauge'))
	expect(getByText('0')).toBeTruthy()
})

it('上方向ドラッグでスコアが増え onScoreChange が呼ばれる', async () => {
	const onScoreChange = jest.fn()
	const { getByTestId, getByText } = await render(
		<SwipeGauge onScoreChange={onScoreChange} onRelease={() => {}} />,
	)
	const gauge = getByTestId('swipe-gauge')
	layout(gauge)
	await act(async () => {
		fireEvent(gauge, 'responderGrant', { nativeEvent: { pageY: 500 } })
		fireEvent(gauge, 'responderMove', { nativeEvent: { pageY: 300 } }) // 200px 上 = 50点
	})
	expect(getByText('50')).toBeTruthy()
	expect(onScoreChange).toHaveBeenLastCalledWith(50)
})

it('指を離すと onRelease に最終スコアが渡る', async () => {
	const onRelease = jest.fn()
	const { getByTestId } = await render(
		<SwipeGauge onScoreChange={() => {}} onRelease={onRelease} />,
	)
	const gauge = getByTestId('swipe-gauge')
	layout(gauge)
	await act(async () => {
		fireEvent(gauge, 'responderGrant', { nativeEvent: { pageY: 500 } })
		fireEvent(gauge, 'responderMove', { nativeEvent: { pageY: 100 } }) // 400px 上 = 100点
		fireEvent(gauge, 'responderRelease', { nativeEvent: { pageY: 100 } })
	})
	expect(onRelease).toHaveBeenCalledWith(100)
})

it('タッチせず離しても 0 で確定できる（グラント直後リリース）', async () => {
	const onRelease = jest.fn()
	const { getByTestId } = await render(
		<SwipeGauge onScoreChange={() => {}} onRelease={onRelease} />,
	)
	const gauge = getByTestId('swipe-gauge')
	layout(gauge)
	await act(async () => {
		fireEvent(gauge, 'responderGrant', { nativeEvent: { pageY: 500 } })
		fireEvent(gauge, 'responderRelease', { nativeEvent: { pageY: 500 } })
	})
	expect(onRelease).toHaveBeenCalledWith(0)
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/bomb-swipe/__tests__/gauge.test.tsx --verbose`
Expected: FAIL（`../gauge` が存在しない）

- [ ] **Step 3: 実装**

```typescript
// src/games/bomb-swipe/theme.ts
// 爆弾スワイプ専用カラー。地雷範囲などのゲーム定数は engine.ts 側
export const BS = {
	red: '#FF4D4F',
	maskRed: 'rgba(255, 45, 45, 0.9)',
	gaugeFrom: '#FFC53D',
	gaugeTo: '#FF4D4F',
} as const
```

```tsx
// src/games/bomb-swipe/gauge.tsx
import { LinearGradient } from 'expo-linear-gradient'
import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { scoreFromDrag } from './engine'
import { BS } from './theme'

type Props = {
	onScoreChange: (score: number) => void
	onRelease: (score: number) => void
}

// スワイプゲージ。タッチ追跡と数字表示だけを担い、爆発判定・演出は親が行う。
// gesture-handler はコードベース未導入のため RN 標準の responder を使う
export function SwipeGauge({ onScoreChange, onRelease }: Props) {
	const [score, setScore] = useState(0)
	const trackHeight = useRef(0)
	const startY = useRef(0)
	const current = useRef(0)

	const update = (pageY: number) => {
		const next = scoreFromDrag(startY.current - pageY, trackHeight.current)
		current.current = next
		setScore(next)
		onScoreChange(next)
	}

	return (
		<View
			testID="swipe-gauge"
			style={styles.track}
			onLayout={(e) => {
				trackHeight.current = e.nativeEvent.layout.height
			}}
			onStartShouldSetResponder={() => true}
			onResponderGrant={(e) => {
				startY.current = e.nativeEvent.pageY
				update(e.nativeEvent.pageY)
			}}
			onResponderMove={(e) => update(e.nativeEvent.pageY)}
			onResponderRelease={() => onRelease(current.current)}
		>
			<View style={[StyleSheet.absoluteFill, styles.fillWrap]} pointerEvents="none">
				<LinearGradient
					colors={[BS.gaugeTo, BS.gaugeFrom]}
					style={[styles.fill, { height: `${score}%` }]}
				/>
			</View>
			<View style={styles.scoreWrap} pointerEvents="none">
				<Text style={styles.score}>{score}</Text>
				<Text style={styles.scoreCaption}>上にスワイプ！離した位置がスコア</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	track: {
		flex: 1,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.lg,
		overflow: 'hidden',
	},
	fillWrap: { justifyContent: 'flex-end' },
	fill: { width: '100%', opacity: 0.55 },
	scoreWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
	score: { fontSize: 96, fontWeight: '800', color: colors.text },
	scoreCaption: { ...typography.caption, marginTop: spacing.sm },
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/bomb-swipe --verbose`
Expected: PASS（gauge 4 tests ＋ engine 全テスト）

- [ ] **Step 5: コミット**

```bash
git add src/games/bomb-swipe && git commit -m "feat: 爆弾スワイプのスワイプゲージ（responder ベース・リアルタイムスコア表示）(#63)"
```

---

### Task 5: リザルト画面（round-result.tsx）

**Files:**

- Create: `src/games/bomb-swipe/round-result.tsx`
- Test: `src/games/bomb-swipe/__tests__/round-result.test.tsx`

**Interfaces:**

- Consumes: `State` / `PlayerResult` / `decideLosers`（Task 2, 3）
- Produces: `RoundResult({ state, names, onRetry, onHome }: { state: State; names: string[]; onRetry: () => void; onHome: () => void })`

- [ ] **Step 1: 失敗するテストを書く**

```tsx
// src/games/bomb-swipe/__tests__/round-result.test.tsx
import { fireEvent, render } from '@testing-library/react-native'
import type { State } from '../engine'
import { RoundResult } from '../round-result'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

const base: State = {
	phase: 'result',
	turnIndex: 2,
	playerCount: 3,
	mines: [70, 65, 90],
	results: [
		{ score: 55, exploded: false },
		{ score: 65, exploded: true },
		{ score: 30, exploded: false },
	],
}

it('スコア順ランキングと地雷位置の答え合わせを表示する', async () => {
	const { getByText } = await render(
		<RoundResult
			state={base}
			names={['あか', 'あお', 'きいろ']}
			onRetry={() => {}}
			onHome={() => {}}
		/>,
	)
	expect(getByText(/あか/)).toBeTruthy()
	expect(getByText(/55/)).toBeTruthy()
	expect(getByText(/地雷: 70/)).toBeTruthy()
	expect(getByText(/💥/)).toBeTruthy() // 爆発者マーク
})

it('爆発者が敗者として表示される', async () => {
	const { getByText } = await render(
		<RoundResult
			state={base}
			names={['あか', 'あお', 'きいろ']}
			onRetry={() => {}}
			onHome={() => {}}
		/>,
	)
	expect(getByText(/あおさんの負け/)).toBeTruthy()
})

it('爆発者ゼロなら同率最低の全員が敗者表示される', async () => {
	const noBoom: State = {
		...base,
		results: [
			{ score: 20, exploded: false },
			{ score: 20, exploded: false },
			{ score: 50, exploded: false },
		],
	}
	const { getByText } = await render(
		<RoundResult
			state={noBoom}
			names={['あか', 'あお', 'きいろ']}
			onRetry={() => {}}
			onHome={() => {}}
		/>,
	)
	expect(getByText(/あか・あおさんの負け/)).toBeTruthy()
})

it('もう一回とホームのボタンが動く', async () => {
	const onRetry = jest.fn()
	const onHome = jest.fn()
	const { getByText } = await render(
		<RoundResult
			state={base}
			names={['あか', 'あお', 'きいろ']}
			onRetry={onRetry}
			onHome={onHome}
		/>,
	)
	fireEvent.press(getByText('もう一回'))
	fireEvent.press(getByText('ホームへ'))
	expect(onRetry).toHaveBeenCalledTimes(1)
	expect(onHome).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/bomb-swipe/__tests__/round-result.test.tsx --verbose`
Expected: FAIL（`../round-result` が存在しない）

- [ ] **Step 3: 実装**

```tsx
// src/games/bomb-swipe/round-result.tsx
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { SecondaryButton } from '@/components/ui/secondary-button'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { decideLosers, type PlayerResult, type State } from './engine'
import { BS } from './theme'

type Props = {
	state: State
	names: string[]
	onRetry: () => void
	onHome: () => void
}

// リザルト: スコア降順ランキング＋地雷位置の答え合わせ＋敗者発表
export function RoundResult({ state, names, onRetry, onHome }: Props) {
	const results = state.results as PlayerResult[] // result フェーズでは全員分確定済み
	const losers = decideLosers(results)
	const ranking = results.map((r, i) => ({ ...r, index: i })).sort((a, b) => b.score - a.score)

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{losers.map((i) => names[i]).join('・')}さんの負け！</Text>
			<View style={styles.list}>
				{ranking.map((r) => (
					<View
						key={r.index}
						style={[styles.row, losers.includes(r.index) && styles.loserRow]}
					>
						<View
							style={[styles.bar, { backgroundColor: playerColor(r.index).value }]}
						/>
						<Text style={styles.name}>{names[r.index]}</Text>
						<Text style={styles.mine}>地雷: {state.mines[r.index]}</Text>
						<Text style={[styles.score, r.exploded && styles.explodedScore]}>
							{r.exploded ? '💥' : ''}
							{r.score}
						</Text>
					</View>
				))}
			</View>
			<GradientButton title="もう一回" onPress={onRetry} />
			<SecondaryButton title="ホームへ" onPress={onHome} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: { gap: spacing.md },
	title: { ...typography.title, textAlign: 'center' },
	list: { gap: spacing.xs },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	loserRow: { borderColor: BS.red },
	bar: { width: 4, height: 24, borderRadius: 2 },
	name: { ...typography.body, flex: 1 },
	mine: { ...typography.caption },
	score: { ...typography.title, minWidth: 64, textAlign: 'right' },
	explodedScore: { color: BS.red },
})
```

注意: `SecondaryButton` の props は実装前に `src/components/ui/secondary-button.tsx` を確認し、`title`/`onPress` 以外なら合わせること。

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/bomb-swipe --verbose`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/games/bomb-swipe && git commit -m "feat: 爆弾スワイプのリザルト画面（ランキング・地雷答え合わせ・敗者発表）(#63)"
```

---

### Task 6: ゲーム本体（bomb-swipe-game.tsx）

**Files:**

- Create: `src/games/bomb-swipe/bomb-swipe-game.tsx`
- Test: `src/games/bomb-swipe/__tests__/bomb-swipe-game.test.tsx`

**Interfaces:**

- Consumes: `createInitialState` / `reduce` / `MINE_MIN` / `MINE_MAX`（Task 3）、`SwipeGauge`（Task 4）、`RoundResult`（Task 5）、`usePlayers` / `getDisplayNames`（`@/lib/players-store`）、`DrumrollReveal` / `useDrumroll` / `LottieEffect` / `lottieAssets`（`@/components/game/`）
- Produces: `BombSwipeGame()`（default なし・named export。registry から参照）

- [ ] **Step 1: 失敗するテストを書く**

burst-chicken のテスト冒頭のモック群（sound / haptics / expo-router / expo-linear-gradient / players-store / react-native-reanimated）をそのまま流用する。SwipeGauge は責務分離済みのためモックし、スコアを直接注入する。

```tsx
// src/games/bomb-swipe/__tests__/bomb-swipe-game.test.tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { Pressable, Text } from 'react-native'
import { BombSwipeGame } from '../bomb-swipe-game'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
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
jest.mock('@/lib/players-store', () => ({
	usePlayers: () => ({ count: 2, names: ['あか', 'あお'], history: [] }),
	getDisplayNames: () => ['あか', 'あお'],
}))
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((v: number) => v),
		withSequence: jest.fn((v: number) => v),
		withSpring: jest.fn((v: number) => v),
	}
})
// ゲージは単体テスト済みのためモックし、離した位置を直接注入する
jest.mock('../gauge', () => ({
	SwipeGauge: ({ onRelease }: { onRelease: (score: number) => void }) => (
		<>
			<Pressable testID="mock-release-50" onPress={() => onRelease(50)}>
				<Text>release50</Text>
			</Pressable>
			<Pressable testID="mock-release-60" onPress={() => onRelease(60)}>
				<Text>release60</Text>
			</Pressable>
		</>
	),
}))

// Math.random=0 → 全員の地雷が 60 に固定（score 60 で必ず爆発、59 以下でセーフ）
beforeEach(() => {
	jest.clearAllMocks()
	jest.spyOn(Math, 'random').mockReturnValue(0)
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

async function press(target: Parameters<typeof fireEvent.press>[0]) {
	await act(async () => {
		fireEvent.press(target)
	})
}

it('初期表示: 先頭プレイヤーの手番表示と開始ボタン', async () => {
	const { getByText } = await render(<BombSwipeGame />)
	expect(getByText(/あかさんの番/)).toBeTruthy()
	expect(getByText(/スワイプ開始/)).toBeTruthy()
})

it('開始→地雷未満で離すとセーフ表示、次へで手番交代', async () => {
	const { getByText, getByTestId } = await render(<BombSwipeGame />)
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-50'))
	expect(getByText(/50/)).toBeTruthy()
	expect(getByText(/セーフ/)).toBeTruthy()
	await press(getByText(/次へ/))
	expect(getByText(/あおさんの番/)).toBeTruthy()
})

it('地雷ちょうどで離すと爆発表示になり explosion が鳴る', async () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { playSound } = require('@/lib/sound')
	const { getByText, getByTestId } = await render(<BombSwipeGame />)
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-60'))
	expect(getByText(/爆発/)).toBeTruthy()
	expect(playSound).toHaveBeenCalledWith('explosion')
})

it('全員終了でリザルトに敗者と答え合わせが表示される', async () => {
	const { getByText, getByTestId } = await render(<BombSwipeGame />)
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-50')) // あか: 50 セーフ
	await press(getByText(/次へ/))
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-60')) // あお: 60 爆発
	await press(getByText(/次へ/))
	await act(async () => {
		jest.advanceTimersByTime(3000) // ドラムロール消化
	})
	expect(getByText(/あおさんの負け/)).toBeTruthy()
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/bomb-swipe/__tests__/bomb-swipe-game.test.tsx --verbose`
Expected: FAIL（`../bomb-swipe-game` が存在しない）

- [ ] **Step 3: 実装**

```tsx
// src/games/bomb-swipe/bomb-swipe-game.tsx
import { router } from 'expo-router'
import { useEffect, useReducer, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { lottieAssets } from '@/components/game/lottie-assets'
import { LottieEffect } from '@/components/game/lottie-effect'
import { useDrumroll } from '@/components/game/use-drumroll'
import { haptics } from '@/lib/haptics'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { createInitialState, MINE_MAX, MINE_MIN, reduce } from './engine'
import { SwipeGauge } from './gauge'
import { RoundResult } from './round-result'
import { BS } from './theme'

// スワイプ度胸試し: ゲージを上へスワイプ、離した位置がスコア。
// ただしプレイヤーごとの地雷位置（60〜95・非表示）以上で爆発
export function BombSwipeGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [state, dispatch] = useReducer(reduce, players.count, (count) =>
		createInitialState(count, Math.random),
	)
	// スワイプ中の緊張演出用。ゲージ内部と重複して持つが、親は演出にだけ使う
	const [liveScore, setLiveScore] = useState(0)

	const drum = useDrumroll()

	// 爆発: 音＋強バイブ。心音はスコア更新側で鳴らす（heartbeat 未収録の間は無音スキップ）
	useEffect(() => {
		if (state.phase === 'exploded') {
			playSound('explosion')
			haptics.heavy()
		}
		if (state.phase === 'result') {
			drum.start()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.phase, drum.start])

	const onScoreChange = (score: number) => {
		setLiveScore(score)
		// 10点刻みで心音＋軽バイブ（連続バイブは端末負荷が高いため間引く）
		if (score > 0 && score % 10 === 0) {
			playSound('heartbeat')
			haptics.tap()
		}
	}

	const onRelease = (score: number) => {
		setLiveScore(0)
		dispatch({ type: 'release', score })
	}

	const retry = () => {
		drum.reset()
		dispatch({ type: 'restart', rng: Math.random })
	}

	const result = state.results[state.turnIndex]
	const turnColor = playerColor(state.turnIndex).value

	if (state.phase === 'result') {
		return (
			<View style={styles.container}>
				<DrumrollReveal phase={drum.phase === 'idle' ? 'rolling' : drum.phase}>
					<RoundResult
						state={state}
						names={names}
						onRetry={retry}
						onHome={() => router.replace('/')}
					/>
				</DrumrollReveal>
			</View>
		)
	}

	if (state.phase === 'exploded') {
		return (
			<View style={[styles.container, styles.explodedBg]}>
				<LottieEffect
					source={lottieAssets.explosion}
					style={styles.explosionLottie}
					fallback={<Text style={styles.explosionEmoji}>💥</Text>}
				/>
				<Text style={styles.resultScore}>{result?.score}</Text>
				<Text style={styles.title}>
					爆発！ 地雷は {state.mines[state.turnIndex]} だった…
				</Text>
				<NextButton onPress={() => dispatch({ type: 'next' })} />
			</View>
		)
	}

	if (state.phase === 'safe') {
		return (
			<View style={styles.container}>
				<Text style={styles.resultScore}>{result?.score}</Text>
				<Text style={styles.title}>セーフ！</Text>
				<NextButton onPress={() => dispatch({ type: 'next' })} />
			</View>
		)
	}

	if (state.phase === 'swiping') {
		return (
			<View style={styles.container}>
				<View
					pointerEvents="none"
					testID="tension-mask"
					style={[styles.tensionMask, { opacity: (liveScore / 100) * 0.45 }]}
				/>
				<Text style={styles.hint}>
					地雷は {MINE_MIN}〜{MINE_MAX} のどこか…
				</Text>
				<SwipeGauge onScoreChange={onScoreChange} onRelease={onRelease} />
			</View>
		)
	}

	// handoff
	return (
		<View style={styles.container}>
			<View style={styles.turnRow}>
				<View style={[styles.turnBar, { backgroundColor: turnColor }]} />
				<Text style={styles.turnText}>{names[state.turnIndex]}さんの番</Text>
			</View>
			<Text style={styles.hint}>スマホを受け取ったら開始しよう</Text>
			<Pressable
				accessibilityRole="button"
				onPress={() => {
					haptics.tap()
					dispatch({ type: 'startSwipe' })
				}}
				style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
			>
				<Text style={styles.startBtnText}>スワイプ開始</Text>
			</Pressable>
		</View>
	)
}

function NextButton({ onPress }: { onPress: () => void }) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
		>
			<Text style={styles.startBtnText}>次へ</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: spacing.lg,
		gap: spacing.lg,
		justifyContent: 'center',
	},
	tensionMask: {
		...StyleSheet.absoluteFill,
		backgroundColor: BS.maskRed,
	},
	explodedBg: { backgroundColor: BS.maskRed },
	explosionLottie: { width: 160, height: 160, alignSelf: 'center' },
	explosionEmoji: { fontSize: 96, textAlign: 'center' },
	hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
	title: { ...typography.title, textAlign: 'center' },
	resultScore: { fontSize: 96, fontWeight: '800', color: colors.text, textAlign: 'center' },
	turnRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		alignSelf: 'center',
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	turnBar: { width: 4, height: 24, borderRadius: 2 },
	turnText: { ...typography.body, color: colors.text },
	startBtn: {
		alignSelf: 'center',
		backgroundColor: BS.red,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.md,
	},
	startBtnText: { ...typography.body, fontWeight: '800', color: colors.text },
	pressed: { opacity: 0.8 },
})
```

注意: `DrumrollReveal` / `useDrumroll` / `LottieEffect` / `lottieAssets` の正確な props は burst-chicken の使用箇所を参照（本コードはそれに合わせてある）。差異があれば既存側に合わせる。

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/bomb-swipe --verbose`
Expected: PASS（全スイート）

- [ ] **Step 5: コミット**

```bash
git add src/games/bomb-swipe && git commit -m "feat: 爆弾スワイプのゲーム本体（フェーズ管理・緊張演出・爆発演出）(#63)"
```

---

### Task 7: registry 登録・CLAUDE.md 追記・全体検証

**Files:**

- Modify: `src/games/registry.ts`（import 追加＋配列末尾にエントリ追加）
- Modify: `CLAUDE.md`（収録ゲーム候補に1行追記）
- Test: 既存の registry テスト（`src/games/__tests__/`）が新エントリでも通ること

**Interfaces:**

- Consumes: `BombSwipeGame`（Task 6）

- [ ] **Step 1: registry にエントリ追加**

```typescript
// src/games/registry.ts — import 群に追加
import { BombSwipeGame } from './bomb-swipe/bomb-swipe-game'

// games 配列の末尾（inshu-suijaku の後）に追加
	{
		id: 'bomb-swipe',
		title: '爆弾スワイプ',
		tagline: 'どこまで攻める？地雷を踏んだら即アウト！',
		emoji: '🧨',
		gradient: ['#FF4D4F', '#7B1E1E'],
		minPlayers: 2,
		maxPlayers: 12,
		requiresPlayers: true,
		premium: true,
		catchCopy: '攻めるほど高得点、でも地雷を踏んだら爆発！\nビビって低スコアでも負け！',
		summary:
			'このゲームは、ゲージを上にスワイプして離した位置がスコアになる度胸試しです！60〜95のどこかに隠された地雷を踏むと爆発して負け。爆発者がいなければ一番スコアが低い人が負けになります！',
		howToPlay: [
			'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
			'② 自分の番が来たら、ゲージを下から上へスワイプ！',
			'③ 指を離した位置がスコア（0〜100）。ただし地雷（60〜95のどこか）を踏むと爆発！',
			'④ 爆発した人が負け！誰も爆発しなかったら最低スコアの人が負け！',
		],
		Component: BombSwipeGame,
	},
```

- [ ] **Step 2: CLAUDE.md の収録ゲーム候補に追記**

「• ワードウルフ – …」の行の後に追加:

```
• 爆弾スワイプ – ゲージを長くスワイプするほど高得点、隠れた地雷を踏むと爆発する度胸試し（プレミアム）。
```

- [ ] **Step 3: 全体検証**

Run: `npx jest 2>&1 | tail -5 && npm run typecheck && npm run lint`
Expected: 全テスト PASS / typecheck エラー 0 / lint は既存 warning（bomb-216 の1件）のみ

- [ ] **Step 4: 動作確認（expo web）**

`.claude/launch.json` に worktree 用エントリを追加して preview_start で起動し、ホームに「爆弾スワイプ」カード（👑バッジ）→ プレイヤー登録 → スワイプ → 爆発/セーフ → リザルトまで一連を確認。スクリーンショットを撮る。

- [ ] **Step 5: コミット**

```bash
git add src/games/registry.ts CLAUDE.md && git commit -m "feat: 爆弾スワイプを registry と CLAUDE.md に登録（プレミアム枠）(#63)"
```

---

### Task 8: 心音効果音（heartbeat.m4a、自作合成）

**Files:**

- Modify: `scripts/build-sounds.py`（heartbeat 生成を追加）
- Create: `assets/sounds/heartbeat.m4a`
- Modify: `src/app/_layout.tsx`（`registerSound('heartbeat', ...)` を1行追加）
- Modify: `assets/sounds/README.md`（表に1行追加）

**Interfaces:**

- Consumes: Task 6 の `playSound('heartbeat')`（未収録の間は無音スキップで既に動作している）

前提: このタスクは Python + soundfile + numpy + macOS `afconvert` が必要。環境がなければ**スキップし、README の「未収録（追加予定）」表に tick.m4a と同様の行を追記してコミットする**（ゲームは無音のまま成立する）。

- [ ] **Step 1: build-sounds.py に生成関数を追加**

drumroll の合成コードを参考に、以下の仕様で「ドクッ」1拍ぶんの短音を生成する:

```python
# heartbeat.m4a: 低域サイン波の2連打（lub-dub）約 0.25 秒
# - lub: 55Hz サイン、約 90ms、指数減衰
# - 60ms 無音
# - dub: 45Hz サイン、約 70ms、指数減衰（lub より弱く 0.7 倍）
# - 全体をピーク -3dBFS に正規化、44.1kHz mono
```

再生テンポはゲーム側が `playSound('heartbeat')` の呼び出し間隔で制御するため、音源はループ素材ではなく1拍の単発でよい。

- [ ] **Step 2: 生成して変換**

Run: `python3 scripts/build-sounds.py`（スクリプトの既存の使い方に従う。WAV → `afconvert -f m4af -d aac -b 96000` で `assets/sounds/heartbeat.m4a` を出力）
Expected: `assets/sounds/heartbeat.m4a` が生成される。`afplay assets/sounds/heartbeat.m4a` で試聴して「ドクッ」と鳴ること

- [ ] **Step 3: 登録と README 更新**

`src/app/_layout.tsx` の registerSound 群に追加:

```typescript
registerSound('heartbeat', require('@/assets/sounds/heartbeat.m4a'))
```

`assets/sounds/README.md` の表に追加:

```
| `heartbeat.m4a` | 爆弾スワイプの心音（スコアに応じ間隔短縮） | 自作合成（低域サイン2連打）。素材由来なし（CC0 扱い） |
```

- [ ] **Step 4: 全テスト確認**

Run: `npx jest 2>&1 | tail -5`
Expected: 全 PASS（sound はテストでモック済みのため影響なし）

- [ ] **Step 5: コミット**

```bash
git add scripts/build-sounds.py assets/sounds src/app/_layout.tsx
git commit -m "feat: 心音効果音 heartbeat.m4a を自作合成で追加 (#63)"
```

---

## 完了条件

- issue #63 の受け入れ条件を満たす（課金ゲート結線は #収益2 待ちのため `premium: true` フラグまで）
- 全テスト・typecheck・lint パス
- expo web での一連のプレイ動作確認済み
- PR: `feature/63-bomb-swipe` → `develop`、本文に `Closes #63`
