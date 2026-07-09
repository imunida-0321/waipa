# 5秒STOP（#11）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5.00 秒ぴったりを狙ってタイマーを止め、一番ズレた人が負けるパーティーゲームを実装し、registry に登録する（Issue #11）。

**Architecture:** who-will-pay と同じ「フェーズ状態機械（親コンポーネント）＋純関数ロジック（judge.ts）」構成。計測は `Date.now()` 差分の ms 整数で確定し描画に依存しない。リザルトは1位から順にカードをめくり、最下位だけドラムロールで発表するランキング形式。

**Tech Stack:** Expo (React Native) / TypeScript / react-native-reanimated / jest-expo + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-07-09-five-sec-stop-design.md`

## Global Constraints

- コードフォーマット: タブインデント・セミコロンなし・シングルクォート（prettier 設定済み。コミット前に `npx prettier --write <files>` 可）
- import は `@/` エイリアス（`src/` にマップ）
- 基準値: ターゲット 5000ms / ぴったり賞 ±50ms（50 ちょうどを含む）/ 誤爆ガード 300ms / 数字フェード 2500→3000ms / リザルトのカードめくり間隔 600ms
- 色分け: deviation ≤ 50 → 金 `colors.gold` / ≤ 200 → ティール `#4ECDC4` / ≤ 500 → 黄 `#F7B731` / それ以上 → 赤 `#FF6B6B`
- 同率最下位は全員敗者。ランキングは deviation 昇順・同率はプレイヤー index 昇順で安定
- サウンドは既存登録済みの `tap` / `drumroll` / `reveal` のみ。haptics は `tap` / `heavy` / `success` のみ
- テスト実行: `npx jest src/games/five-sec-stop -i`（全体は `npm test`）
- コミットメッセージは日本語 `feat:`/`test:` 形式＋末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- ブランチ: `feature/11-five-sec-stop`（作成済み。develop へは PR でマージ）

---

### Task 1: judge.ts — 判定・フォーマットの純関数

**Files:**

- Create: `src/games/five-sec-stop/judge.ts`
- Test: `src/games/five-sec-stop/__tests__/judge.test.ts`

**Interfaces:**

- Consumes: なし（純関数のみ）
- Produces:
    - `TARGET_MS = 5000` / `PITTARI_MS = 50`
    - `type Tier = 'pittari' | 'good' | 'close' | 'far'`
    - `type Ranked = { playerIndex: number; ms: number; deviationMs: number; tier: Tier; isLoser: boolean }`
    - `deviationMs(ms: number): number`
    - `tierOf(ms: number): Tier`
    - `rankRecords(records: number[]): Ranked[]`（deviation 昇順・同率は playerIndex 昇順）
    - `formatSeconds(ms: number): string`（例 `'5.32'`）
    - `formatDeviation(ms: number): string`（例 `'+0.32'` / `'-0.02'` / `'±0.00'`）

- [ ] **Step 1: 失敗するテストを書く**

`src/games/five-sec-stop/__tests__/judge.test.ts`:

```ts
import { deviationMs, formatDeviation, formatSeconds, rankRecords, tierOf } from '../judge'

describe('deviationMs', () => {
	it('5000ms との差の絶対値を返す', () => {
		expect(deviationMs(5320)).toBe(320)
		expect(deviationMs(4680)).toBe(320)
		expect(deviationMs(5000)).toBe(0)
	})
})

describe('tierOf', () => {
	it('境界値で正しい tier を返す', () => {
		expect(tierOf(5049)).toBe('pittari')
		expect(tierOf(5050)).toBe('pittari') // 50ms ちょうどはぴったり賞
		expect(tierOf(5051)).toBe('good')
		expect(tierOf(4950)).toBe('pittari')
		expect(tierOf(5200)).toBe('good') // 200ms ちょうど
		expect(tierOf(5201)).toBe('close')
		expect(tierOf(5500)).toBe('close') // 500ms ちょうど
		expect(tierOf(5501)).toBe('far')
	})
})

describe('rankRecords', () => {
	it('deviation 昇順に並び、最大 deviation の人が敗者になる', () => {
		const ranked = rankRecords([4710, 4980, 5170, 5820])
		expect(ranked.map((r) => r.playerIndex)).toEqual([1, 2, 0, 3])
		expect(ranked.map((r) => r.isLoser)).toEqual([false, false, false, true])
		expect(ranked[0].tier).toBe('pittari')
	})

	it('同率最下位は全員敗者', () => {
		const ranked = rankRecords([5300, 4700, 5000])
		expect(ranked.filter((r) => r.isLoser).map((r) => r.playerIndex)).toEqual([0, 1])
	})

	it('全員同記録なら全員敗者', () => {
		const ranked = rankRecords([5100, 5100])
		expect(ranked.every((r) => r.isLoser)).toBe(true)
	})

	it('同率は playerIndex 昇順で安定', () => {
		const ranked = rankRecords([5200, 4800, 5100])
		expect(ranked.map((r) => r.playerIndex)).toEqual([2, 0, 1])
	})
})

describe('formatSeconds', () => {
	it('小数2桁の秒表示にする', () => {
		expect(formatSeconds(5320)).toBe('5.32')
		expect(formatSeconds(4980)).toBe('4.98')
		expect(formatSeconds(0)).toBe('0.00')
	})
})

describe('formatDeviation', () => {
	it('符号付き偏差を返す', () => {
		expect(formatDeviation(5320)).toBe('+0.32')
		expect(formatDeviation(4980)).toBe('-0.02')
		expect(formatDeviation(5000)).toBe('±0.00')
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/five-sec-stop -i`
Expected: FAIL（`Cannot find module '../judge'`）

- [ ] **Step 3: 最小実装を書く**

`src/games/five-sec-stop/judge.ts`:

```ts
export const TARGET_MS = 5000
export const PITTARI_MS = 50

export type Tier = 'pittari' | 'good' | 'close' | 'far'

export type Ranked = {
	playerIndex: number
	ms: number
	deviationMs: number
	tier: Tier
	isLoser: boolean
}

export function deviationMs(ms: number): number {
	return Math.abs(ms - TARGET_MS)
}

// 色分け閾値: ±50=ぴったり賞 / ±200=いい線 / ±500=おしい / それ以上
export function tierOf(ms: number): Tier {
	const d = deviationMs(ms)
	if (d <= PITTARI_MS) return 'pittari'
	if (d <= 200) return 'good'
	if (d <= 500) return 'close'
	return 'far'
}

// deviation 昇順（同率は計測順）。最大 deviation は同率含め全員敗者
export function rankRecords(records: number[]): Ranked[] {
	const entries = records.map((ms, playerIndex) => ({
		playerIndex,
		ms,
		deviationMs: deviationMs(ms),
		tier: tierOf(ms),
	}))
	const sorted = [...entries].sort(
		(a, b) => a.deviationMs - b.deviationMs || a.playerIndex - b.playerIndex,
	)
	const worst = sorted[sorted.length - 1]?.deviationMs ?? 0
	return sorted.map((e) => ({ ...e, isLoser: e.deviationMs === worst }))
}

export function formatSeconds(ms: number): string {
	return (ms / 1000).toFixed(2)
}

export function formatDeviation(ms: number): string {
	const diff = ms - TARGET_MS
	if (diff === 0) return '±0.00'
	const sign = diff > 0 ? '+' : '-'
	return `${sign}${(Math.abs(diff) / 1000).toFixed(2)}`
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/five-sec-stop -i`
Expected: PASS（テスト6グループすべて）

- [ ] **Step 5: コミット**

```bash
git add src/games/five-sec-stop
git commit -m "feat: 5秒STOP の判定・フォーマット純関数を追加 (#11)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: theme.ts と use-stopwatch.ts — カラー定義と計測フック

**Files:**

- Create: `src/games/five-sec-stop/theme.ts`
- Create: `src/games/five-sec-stop/use-stopwatch.ts`
- Test: `src/games/five-sec-stop/__tests__/use-stopwatch.test.ts`

**Interfaces:**

- Consumes: `colors` from `@/theme/tokens`、Task 1 の `Tier`
- Produces:
    - `FSS: { bg: string; accent: string; tierColors: Record<Tier, string> }`
    - `STOP_GUARD_MS = 300` / `HIDE_START_MS = 2500` / `HIDE_END_MS = 3000`
    - `useStopwatch(): { displayMs: number; running: boolean; start(): void; stop(): number | null; reset(): void }`
        - `stop()` は経過 ms（`Date.now()` 差分の整数）を返す。ガード未満なら `null` を返し計測継続

- [ ] **Step 1: theme.ts を書く（テスト不要の定数のみ）**

`src/games/five-sec-stop/theme.ts`:

```ts
import { colors } from '@/theme/tokens'
import type { Tier } from './judge'

// 5秒STOP のゲームカラー（registry の gradient と同系のティール基調）
export const FSS = {
	bg: colors.background,
	accent: '#4ECDC4',
	tierColors: {
		pittari: colors.gold,
		good: '#4ECDC4',
		close: '#F7B731',
		far: '#FF6B6B',
	} satisfies Record<Tier, string>,
} as const
```

- [ ] **Step 2: use-stopwatch の失敗するテストを書く**

`src/games/five-sec-stop/__tests__/use-stopwatch.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react-native'
import { STOP_GUARD_MS, useStopwatch } from '../use-stopwatch'

// modern fake timers は Date.now も進めるので、advanceTimersByTime だけで計測を再現できる
beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

it('start から stop までの経過 ms を返す', async () => {
	const { result } = renderHook(() => useStopwatch())
	await act(async () => result.current.start())
	await act(async () => jest.advanceTimersByTime(5320))
	let ms: number | null = null
	await act(async () => {
		ms = result.current.stop()
	})
	expect(ms).toBe(5320)
	expect(result.current.running).toBe(false)
})

it('displayMs が計測中に更新される', async () => {
	const { result } = renderHook(() => useStopwatch())
	await act(async () => result.current.start())
	await act(async () => jest.advanceTimersByTime(1000))
	expect(result.current.displayMs).toBeGreaterThanOrEqual(984)
	expect(result.current.displayMs).toBeLessThanOrEqual(1000)
})

it(`start 後 ${STOP_GUARD_MS}ms 未満の stop は無効（null を返し計測継続）`, () => {
	const { result } = renderHook(() => useStopwatch())
	await act(async () => result.current.start())
	await act(async () => jest.advanceTimersByTime(STOP_GUARD_MS - 1))
	let ms: number | null = 0
	await act(async () => {
		ms = result.current.stop()
	})
	expect(ms).toBeNull()
	expect(result.current.running).toBe(true)
	// ガードを越えれば止められる
	await act(async () => jest.advanceTimersByTime(5000))
	await act(async () => {
		ms = result.current.stop()
	})
	expect(ms).toBe(STOP_GUARD_MS - 1 + 5000)
})

it('reset で初期状態に戻る', async () => {
	const { result } = renderHook(() => useStopwatch())
	await act(async () => result.current.start())
	await act(async () => jest.advanceTimersByTime(2000))
	await act(async () => result.current.reset())
	expect(result.current.displayMs).toBe(0)
	expect(result.current.running).toBe(false)
})
```

- [ ] **Step 3: テストが失敗することを確認**

Run: `npx jest src/games/five-sec-stop/__tests__/use-stopwatch.test.ts -i`
Expected: FAIL（`Cannot find module '../use-stopwatch'`）

- [ ] **Step 4: use-stopwatch.ts を実装**

`src/games/five-sec-stop/use-stopwatch.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'

export const STOP_GUARD_MS = 300
export const HIDE_START_MS = 2500
export const HIDE_END_MS = 3000

const TICK_MS = 16

// 記録はストップ時の Date.now() 差分で確定する（表示 interval のフレーム落ちに依存しない）
export function useStopwatch() {
	const [displayMs, setDisplayMs] = useState(0)
	const [running, setRunning] = useState(false)
	const startedAt = useRef(0)
	const interval = useRef<ReturnType<typeof setInterval> | null>(null)

	const clear = useCallback(() => {
		if (interval.current) {
			clearInterval(interval.current)
			interval.current = null
		}
	}, [])

	const start = useCallback(() => {
		startedAt.current = Date.now()
		setDisplayMs(0)
		setRunning(true)
		clear()
		interval.current = setInterval(() => {
			setDisplayMs(Date.now() - startedAt.current)
		}, TICK_MS)
	}, [clear])

	const stop = useCallback((): number | null => {
		const ms = Date.now() - startedAt.current
		if (ms < STOP_GUARD_MS) return null // スタート直後の誤爆は無視
		clear()
		setRunning(false)
		setDisplayMs(ms)
		return ms
	}, [clear])

	const reset = useCallback(() => {
		clear()
		setRunning(false)
		setDisplayMs(0)
	}, [clear])

	useEffect(() => clear, [clear])

	return { displayMs, running, start, stop, reset }
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `npx jest src/games/five-sec-stop -i`
Expected: PASS（judge + use-stopwatch）

- [ ] **Step 6: コミット**

```bash
git add src/games/five-sec-stop
git commit -m "feat: 5秒STOP の計測フックとゲームカラーを追加 (#11)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: stopwatch-play.tsx — 1人分の計測画面（スタンバイ→計測→記録ドン）

**Files:**

- Create: `src/games/five-sec-stop/pittari-burst.tsx`
- Create: `src/games/five-sec-stop/stopwatch-play.tsx`
- Test: `src/games/five-sec-stop/__tests__/stopwatch-play.test.tsx`

**Interfaces:**

- Consumes: Task 1 `tierOf/formatSeconds/formatDeviation`、Task 2 `useStopwatch/FSS/HIDE_START_MS/HIDE_END_MS`、既存 `DrumrollReveal`（`@/components/game/drumroll-reveal`）、`GradientButton`、`haptics`、`playSound`、`playerColor`
- Produces: `<StopwatchPlay playerIndex={number} playerName={string} orderLabel={string} doneLabel={string} onDone={(ms: number) => void} />`
    - 内部フェーズ `standby → measuring → record`。`onDone` は「つぎへ」ボタン押下時に確定記録 ms で呼ぶ

- [ ] **Step 1: 失敗するテストを書く**

`src/games/five-sec-stop/__tests__/stopwatch-play.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { StopwatchPlay } from '../stopwatch-play'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
		withSpring: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withDelay: jest.fn((_delay: number, toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn(), linear: jest.fn() },
	}
})

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

async function setup(onDone = jest.fn()) {
	const utils = await render(
		<StopwatchPlay
			playerIndex={0}
			playerName="アオイ"
			orderLabel="1人目 / 2人"
			doneLabel="つぎの人へ"
			onDone={onDone}
		/>,
	)
	return { onDone, ...utils }
}

it('スタンバイ→スタート→ストップ→記録表示→onDone の順に進む', async () => {
	const { onDone, getByText, getByTestId } = await setup()

	expect(getByText('アオイ さんの番')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップでスタート')))

	await act(async () => jest.advanceTimersByTime(5320))
	await act(async () => fireEvent.press(getByTestId('stop-area')))

	expect(getByText('5.32')).toBeTruthy()
	expect(getByText('+0.32 ズレ')).toBeTruthy()

	await act(async () => fireEvent.press(getByText('つぎの人へ')))
	expect(onDone).toHaveBeenCalledWith(5320)
})

it('3秒未満は数字が見え、3秒以降は「？？？」になる', async () => {
	const { getByText, getByTestId, queryByText } = await setup()
	await act(async () => fireEvent.press(getByText('タップでスタート')))

	await act(async () => jest.advanceTimersByTime(1000))
	expect(getByTestId('timer-digits')).toBeTruthy()

	await act(async () => jest.advanceTimersByTime(2100)) // 3.1秒経過
	expect(queryByText('？？？')).toBeTruthy()
})

it('スタート直後300ms未満のタップでは止まらない', async () => {
	const { getByText, getByTestId, queryByText } = await setup()
	await act(async () => fireEvent.press(getByText('タップでスタート')))

	await act(async () => jest.advanceTimersByTime(100))
	await act(async () => fireEvent.press(getByTestId('stop-area')))
	expect(queryByText('つぎの人へ')).toBeNull() // まだ record フェーズに進まない

	await act(async () => jest.advanceTimersByTime(5000))
	await act(async () => fireEvent.press(getByTestId('stop-area')))
	expect(getByText('5.10')).toBeTruthy()
})

it('±0.05秒以内はぴったり賞の演出が出る', async () => {
	const { getByText, getByTestId } = await setup()
	await act(async () => fireEvent.press(getByText('タップでスタート')))

	await act(async () => jest.advanceTimersByTime(4980))
	await act(async () => fireEvent.press(getByTestId('stop-area')))

	expect(getByText(/ぴったり賞/)).toBeTruthy()
	expect(getByText('4.98')).toBeTruthy()
	expect(getByText('-0.02 ズレ')).toBeTruthy()
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/five-sec-stop/__tests__/stopwatch-play.test.tsx -i`
Expected: FAIL（`Cannot find module '../stopwatch-play'`）

- [ ] **Step 3: pittari-burst.tsx を実装（紙吹雪調パーティクル）**

`src/games/five-sec-stop/pittari-burst.tsx`:

```tsx
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from 'react-native-reanimated'
import { colors } from '@/theme/tokens'
import { FSS } from './theme'

const PIECE_COLORS = [colors.gold, colors.accentFrom, colors.accentTo, FSS.accent]
const PIECE_COUNT = 12
const FALL_MS = 1200

// ぴったり賞の紙吹雪。index 由来の決定的な配置（乱数なし）でテストしやすくする
function Piece({ index }: { index: number }) {
	const progress = useSharedValue(0)

	useEffect(() => {
		progress.value = withDelay(index * 40, withTiming(1, { duration: FALL_MS }))
	}, [index, progress])

	const style = useAnimatedStyle(() => ({
		opacity: 1 - progress.value,
		transform: [
			{ translateY: progress.value * 180 },
			{ translateX: (index - PIECE_COUNT / 2) * 6 * progress.value },
			{ rotate: `${progress.value * (index % 2 === 0 ? 360 : -360)}deg` },
		],
	}))

	return (
		<Animated.View
			style={[
				styles.piece,
				{
					left: `${(index * 83) % 100}%`,
					backgroundColor: PIECE_COLORS[index % PIECE_COLORS.length],
				},
				style,
			]}
		/>
	)
}

export function PittariBurst() {
	return (
		<View pointerEvents="none" style={StyleSheet.absoluteFill} testID="pittari-burst">
			{Array.from({ length: PIECE_COUNT }, (_, i) => (
				<Piece key={i} index={i} />
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	piece: {
		position: 'absolute',
		top: 0,
		width: 8,
		height: 8,
		borderRadius: 2,
	},
})
```

- [ ] **Step 4: stopwatch-play.tsx を実装**

`src/games/five-sec-stop/stopwatch-play.tsx`:

```tsx
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { formatDeviation, formatSeconds, tierOf } from './judge'
import { PittariBurst } from './pittari-burst'
import { FSS } from './theme'
import { HIDE_END_MS, HIDE_START_MS, useStopwatch } from './use-stopwatch'

type Props = {
	playerIndex: number
	playerName: string
	orderLabel: string
	doneLabel: string
	onDone: (ms: number) => void
}

type Phase = 'standby' | 'measuring' | 'record'

// 1人分の計測: スタンバイ → 計測（3秒から数字が消える）→ 記録ドン！
export function StopwatchPlay({ playerIndex, playerName, orderLabel, doneLabel, onDone }: Props) {
	const [phase, setPhase] = useState<Phase>('standby')
	const [recordMs, setRecordMs] = useState(0)
	const sw = useStopwatch()

	const color = playerColor(playerIndex).value

	const handleStart = () => {
		haptics.tap()
		playSound('tap')
		sw.start()
		setPhase('measuring')
	}

	const handleStop = () => {
		const ms = sw.stop()
		if (ms === null) return // 誤爆ガード
		playSound('tap')
		const tier = tierOf(ms)
		if (tier === 'pittari') {
			haptics.success()
			playSound('reveal')
		} else {
			haptics.heavy()
		}
		setRecordMs(ms)
		setPhase('record')
	}

	if (phase === 'standby') {
		return (
			<View style={styles.container}>
				<Text style={styles.orderLabel}>{orderLabel}</Text>
				<View style={styles.nameRow}>
					<View style={[styles.colorDot, { backgroundColor: color }]} />
					<Text style={styles.name}>{playerName} さんの番</Text>
				</View>
				<Text style={styles.hint}>5.00秒ぴったりを狙ってストップ！</Text>
				<View style={styles.actions}>
					<GradientButton title="タップでスタート" onPress={handleStart} />
				</View>
			</View>
		)
	}

	if (phase === 'measuring') {
		// 2.5〜3.0秒で数字がフェードアウトし、以降は「？？？」（DrumrollReveal の rolling 演出を流用）
		const hidden = sw.displayMs >= HIDE_END_MS
		const opacity = hidden
			? 0
			: Math.min(1, (HIDE_END_MS - sw.displayMs) / (HIDE_END_MS - HIDE_START_MS))
		return (
			<Pressable testID="stop-area" style={styles.container} onPress={handleStop}>
				<Text style={styles.orderLabel}>{orderLabel}</Text>
				<Text style={styles.nameCaption}>{playerName} さんの番</Text>
				<View style={styles.timerArea}>
					{hidden ? (
						<DrumrollReveal phase="rolling" />
					) : (
						<Text testID="timer-digits" style={[styles.digits, { opacity }]}>
							{formatSeconds(sw.displayMs)}
						</Text>
					)}
				</View>
				<View style={styles.stopGuide}>
					<Text style={styles.stopGuideText}>画面のどこでもタップでストップ！</Text>
				</View>
			</Pressable>
		)
	}

	const tier = tierOf(recordMs)
	const tierColor = FSS.tierColors[tier]
	const pittari = tier === 'pittari'

	return (
		<View style={styles.container}>
			{pittari && <PittariBurst />}
			<Text style={styles.orderLabel}>{playerName} さんの記録</Text>
			{pittari && <Text style={styles.pittariTitle}>＼ ぴったり賞 ／</Text>}
			<View style={styles.timerArea}>
				<DrumrollReveal phase="revealed">
					<View style={styles.recordBlock}>
						<Text style={[styles.digits, { color: tierColor }]}>
							{formatSeconds(recordMs)}
						</Text>
						<Text style={[styles.deviation, { color: tierColor }]}>
							{formatDeviation(recordMs)} ズレ
						</Text>
					</View>
				</DrumrollReveal>
			</View>
			<View style={styles.actions}>
				<GradientButton title={doneLabel} onPress={() => onDone(recordMs)} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: FSS.bg,
		padding: spacing.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	orderLabel: {
		...typography.caption,
		marginBottom: spacing.sm,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	colorDot: {
		width: 14,
		height: 14,
		borderRadius: radii.pill,
	},
	name: {
		...typography.title,
	},
	nameCaption: {
		...typography.body,
		marginBottom: spacing.md,
	},
	hint: {
		...typography.body,
		color: colors.textMuted,
		marginBottom: spacing.xl,
	},
	timerArea: {
		minHeight: 140,
		justifyContent: 'center',
		alignItems: 'center',
		alignSelf: 'stretch',
	},
	digits: {
		...typography.hero,
		fontSize: 72,
		fontVariant: ['tabular-nums'],
		color: FSS.accent,
	},
	recordBlock: {
		alignItems: 'center',
	},
	deviation: {
		...typography.title,
		marginTop: spacing.sm,
	},
	pittariTitle: {
		...typography.title,
		color: colors.gold,
		letterSpacing: 2,
	},
	stopGuide: {
		position: 'absolute',
		bottom: spacing.xl,
		left: spacing.lg,
		right: spacing.lg,
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: FSS.accent,
		borderRadius: radii.md,
		padding: spacing.md,
		alignItems: 'center',
	},
	stopGuideText: {
		...typography.body,
		color: FSS.accent,
	},
	actions: {
		alignSelf: 'stretch',
		marginTop: spacing.xl,
	},
})
```

- [ ] **Step 5: テストが通ることを確認**

Run: `npx jest src/games/five-sec-stop -i`
Expected: PASS（judge / use-stopwatch / stopwatch-play）

- [ ] **Step 6: コミット**

```bash
git add src/games/five-sec-stop
git commit -m "feat: 5秒STOP の計測画面とぴったり賞演出を追加 (#11)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: result.tsx — ランキング発表（1位から順めくり→最下位ドラムロール）

**Files:**

- Create: `src/games/five-sec-stop/result.tsx`
- Test: `src/games/five-sec-stop/__tests__/result.test.tsx`

**Interfaces:**

- Consumes: Task 1 `rankRecords/formatSeconds/formatDeviation`、Task 2 `FSS`、既存 `useDrumroll`（`@/components/game/use-drumroll`）、`GradientButton`、`PillButton`、`playerColor`
- Produces: `<FiveSecResult records={number[]} playerNames={string[]} onRetry={() => void} onHome={() => void} />`
    - `REVEAL_INTERVAL_MS = 600` を export（テストから参照）

- [ ] **Step 1: 失敗するテストを書く**

`src/games/five-sec-stop/__tests__/result.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { FiveSecResult, REVEAL_INTERVAL_MS } from '../result'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
		withSpring: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withDelay: jest.fn((_delay: number, toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn(), linear: jest.fn() },
	}
})

const DRUMROLL_MS = 2000

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

const records = [4710, 4980, 5170, 5820] // 敗者: index 3（ユウタ）
const names = ['アオイ', 'ミキ', 'ケン', 'ユウタ']

it('1位から順にカードがめくれ、敗者はドラムロール後に発表される', async () => {
	const { getByText, queryByText } = await render(
		<FiveSecResult
			records={records}
			playerNames={names}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)

	// 最初は誰もめくれていない
	expect(queryByText('ミキ')).toBeNull()

	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS))
	expect(getByText('ミキ')).toBeTruthy() // 1位: 4.98
	expect(getByText('4.98')).toBeTruthy()

	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS * 2))
	expect(getByText('ケン')).toBeTruthy()
	expect(getByText('アオイ')).toBeTruthy()

	// 敗者はまだ伏せられている
	expect(queryByText('ユウタ')).toBeNull()

	// ドラムロール終了で敗者発表
	await act(async () => jest.advanceTimersByTime(DRUMROLL_MS))
	expect(getByText('ユウタ')).toBeTruthy()
	expect(getByText('5.82')).toBeTruthy()
	expect(getByText(/敗者/)).toBeTruthy()
})

it('ぴったり賞のバッジが1位カードに出る', async () => {
	const { getByText } = await render(
		<FiveSecResult
			records={records}
			playerNames={names}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS * 3 + DRUMROLL_MS))
	expect(getByText('ぴったり賞')).toBeTruthy()
})

it('同率最下位は複数人まとめて発表される', async () => {
	const { getByText, getAllByText } = await render(
		<FiveSecResult
			records={[5300, 4700, 5000]}
			playerNames={['A', 'B', 'C']}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS * 1 + DRUMROLL_MS))
	expect(getByText('A')).toBeTruthy()
	expect(getByText('B')).toBeTruthy()
	expect(getAllByText(/敗者/).length).toBeGreaterThanOrEqual(2)
})

it('発表完了後に「もう一回」でonRetryが呼ばれる', async () => {
	const onRetry = jest.fn()
	const { getByText, queryByText } = await render(
		<FiveSecResult
			records={records}
			playerNames={names}
			onRetry={onRetry}
			onHome={jest.fn()}
		/>,
	)
	// 発表が終わるまでボタンは出ない
	expect(queryByText('もう一回')).toBeNull()
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS * 3 + DRUMROLL_MS))
	await act(async () => fireEvent.press(getByText('もう一回')))
	expect(onRetry).toHaveBeenCalled()
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/five-sec-stop/__tests__/result.test.tsx -i`
Expected: FAIL（`Cannot find module '../result'`）

- [ ] **Step 3: result.tsx を実装**

```tsx
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useDrumroll } from '@/components/game/use-drumroll'
import { GradientButton } from '@/components/ui/gradient-button'
import { PillButton } from '@/components/ui/pill-button'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { formatDeviation, formatSeconds, rankRecords, type Ranked } from './judge'
import { FSS } from './theme'

export const REVEAL_INTERVAL_MS = 600

type Props = {
	records: number[]
	playerNames: string[]
	onRetry: () => void
	onHome: () => void
}

// 1位から順にカードをめくり、敗者（同率含む）だけドラムロールで最後に発表する
export function FiveSecResult({ records, playerNames, onRetry, onHome }: Props) {
	const ranked = rankRecords(records)
	const safeCount = ranked.filter((r) => !r.isLoser).length
	const [revealed, setRevealed] = useState(0)
	const drum = useDrumroll()

	useEffect(() => {
		if (revealed < safeCount) {
			const t = setTimeout(() => setRevealed((n) => n + 1), REVEAL_INTERVAL_MS)
			return () => clearTimeout(t)
		}
		drum.start()
		// drum.start は revealed が safeCount に達した1回だけ呼ばれる
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [revealed, safeCount])

	const losersRevealed = drum.phase === 'revealed'

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>けっか はっぴょう</Text>

			{ranked.map((entry, rankIndex) => {
				const isShown = entry.isLoser ? losersRevealed : rankIndex < revealed
				return (
					<RankCard
						key={entry.playerIndex}
						entry={entry}
						rank={rankIndex + 1}
						name={playerNames[entry.playerIndex]}
						shown={isShown}
					/>
				)
			})}

			{losersRevealed && (
				<View style={styles.actions}>
					<GradientButton title="もう一回" onPress={onRetry} />
					<View style={styles.actionGap} />
					<PillButton title="ホームへ" onPress={onHome} />
				</View>
			)}
		</ScrollView>
	)
}

function RankCard({
	entry,
	rank,
	name,
	shown,
}: {
	entry: Ranked
	rank: number
	name: string
	shown: boolean
}) {
	if (!shown) {
		return (
			<View style={styles.card}>
				<Text style={styles.hiddenMark}>？？？</Text>
			</View>
		)
	}

	const tierColor = FSS.tierColors[entry.tier]
	const isTop = rank === 1 && !entry.isLoser

	return (
		<View style={[styles.card, isTop && styles.topCard, entry.isLoser && styles.loserCard]}>
			<Text style={styles.rank}>{rank}位</Text>
			<View
				style={[styles.colorDot, { backgroundColor: playerColor(entry.playerIndex).value }]}
			/>
			<Text style={styles.name}>{name}</Text>
			{entry.tier === 'pittari' && (
				<View style={styles.pittariBadge}>
					<Text style={styles.pittariBadgeText}>ぴったり賞</Text>
				</View>
			)}
			{entry.isLoser && <Text style={styles.loserMark}>敗者！</Text>}
			<Text style={[styles.record, { color: tierColor }]}>{formatSeconds(entry.ms)}</Text>
			<Text style={styles.deviation}>{formatDeviation(entry.ms)}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: FSS.bg,
		padding: spacing.lg,
		justifyContent: 'center',
	},
	title: {
		...typography.title,
		textAlign: 'center',
		marginBottom: spacing.lg,
	},
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		marginBottom: spacing.sm,
		minHeight: 52,
	},
	topCard: {
		borderColor: colors.gold,
	},
	loserCard: {
		borderColor: FSS.tierColors.far,
	},
	hiddenMark: {
		...typography.body,
		color: colors.textMuted,
		letterSpacing: 4,
		textAlign: 'center',
		flex: 1,
	},
	rank: {
		...typography.caption,
		width: 32,
	},
	colorDot: {
		width: 12,
		height: 12,
		borderRadius: radii.pill,
	},
	name: {
		...typography.body,
		flex: 1,
	},
	pittariBadge: {
		backgroundColor: colors.gold,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.sm,
		paddingVertical: 2,
	},
	pittariBadgeText: {
		...typography.caption,
		color: colors.background,
		fontWeight: '700',
	},
	loserMark: {
		...typography.body,
		color: FSS.tierColors.far,
		fontWeight: '700',
	},
	record: {
		...typography.body,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
	},
	deviation: {
		...typography.caption,
		width: 48,
		textAlign: 'right',
	},
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/five-sec-stop -i`
Expected: PASS（4ファイルすべて）

- [ ] **Step 5: コミット**

```bash
git add src/games/five-sec-stop
git commit -m "feat: 5秒STOP のランキング発表リザルトを追加 (#11)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: five-sec-stop-game.tsx と registry 登録・統合テスト

**Files:**

- Create: `src/games/five-sec-stop/five-sec-stop-game.tsx`
- Modify: `src/games/registry.ts:68-82`（`five-sec-stop` エントリ）
- Test: `src/games/five-sec-stop/__tests__/five-sec-stop-game.test.tsx`

**Interfaces:**

- Consumes: Task 3 `StopwatchPlay`、Task 4 `FiveSecResult`、既存 `usePlayers/getDisplayNames`（`@/lib/players-store`）、`router`（`expo-router`）
- Produces: `FiveSecStopGame: ComponentType`（registry の `Component` に設定）

- [ ] **Step 1: 失敗する統合テストを書く**

`src/games/five-sec-stop/__tests__/five-sec-stop-game.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { REVEAL_INTERVAL_MS } from '../result'
import { FiveSecStopGame } from '../five-sec-stop-game'

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
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
		withSpring: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withDelay: jest.fn((_delay: number, toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn(), linear: jest.fn() },
	}
})
jest.mock('@/lib/players-store', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const actual = jest.requireActual('@/lib/players-store')
	return {
		...actual,
		usePlayers: () => ({ count: 2, names: ['アオイ', 'ユウタ'], history: [] }),
	}
})

const DRUMROLL_MS = 2000

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

it('2人が順番に計測し、リザルトで敗者が発表される', async () => {
	const { getByText, getByTestId } = await render(<FiveSecStopGame />)

	// 1人目: アオイ（ぴったり賞）
	expect(getByText('1人目 / 2人')).toBeTruthy()
	expect(getByText('アオイ さんの番')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップでスタート')))
	await act(async () => jest.advanceTimersByTime(4980))
	await act(async () => fireEvent.press(getByTestId('stop-area')))
	expect(getByText(/ぴったり賞/)).toBeTruthy()
	await act(async () => fireEvent.press(getByText('つぎの人へ')))

	// 2人目: ユウタ（大きくズレて敗者）
	expect(getByText('2人目 / 2人')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップでスタート')))
	await act(async () => jest.advanceTimersByTime(5820))
	await act(async () => fireEvent.press(getByTestId('stop-area')))
	await act(async () => fireEvent.press(getByText('結果発表へ')))

	// リザルト: 1位めくり → ドラムロール → 敗者発表
	expect(getByText('けっか はっぴょう')).toBeTruthy()
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS + DRUMROLL_MS))
	expect(getByText('ユウタ')).toBeTruthy()
	expect(getByText(/敗者/)).toBeTruthy()
})

it('「もう一回」で1人目からやり直せる', async () => {
	const { getByText, getByTestId } = await render(<FiveSecStopGame />)

	await act(async () => fireEvent.press(getByText('タップでスタート')))
	await act(async () => jest.advanceTimersByTime(5100))
	await act(async () => fireEvent.press(getByTestId('stop-area')))
	await act(async () => fireEvent.press(getByText('つぎの人へ')))
	await act(async () => fireEvent.press(getByText('タップでスタート')))
	await act(async () => jest.advanceTimersByTime(5200))
	await act(async () => fireEvent.press(getByTestId('stop-area')))
	await act(async () => fireEvent.press(getByText('結果発表へ')))
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS + 2000))

	await act(async () => fireEvent.press(getByText('もう一回')))
	expect(getByText('1人目 / 2人')).toBeTruthy()
	expect(getByText('アオイ さんの番')).toBeTruthy()
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/five-sec-stop/__tests__/five-sec-stop-game.test.tsx -i`
Expected: FAIL（`Cannot find module '../five-sec-stop-game'`）

- [ ] **Step 3: five-sec-stop-game.tsx を実装**

```tsx
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { FiveSecResult } from './result'
import { StopwatchPlay } from './stopwatch-play'
import { FSS } from './theme'

// 状態機械: プレイヤーごとの計測ループ → 全員終了でランキング発表
export function FiveSecStopGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [records, setRecords] = useState<number[]>([])
	const [round, setRound] = useState(0)

	const current = records.length
	const finished = current >= players.count

	return (
		<View style={styles.container}>
			{finished ? (
				<FiveSecResult
					records={records}
					playerNames={names}
					onRetry={() => {
						setRecords([])
						setRound((r) => r + 1)
					}}
					onHome={() => router.replace('/')}
				/>
			) : (
				<StopwatchPlay
					key={`${round}-${current}`}
					playerIndex={current}
					playerName={names[current]}
					orderLabel={`${current + 1}人目 / ${players.count}人`}
					doneLabel={current === players.count - 1 ? '結果発表へ' : 'つぎの人へ'}
					onDone={(ms) => setRecords((prev) => [...prev, ms])}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: FSS.bg,
	},
})
```

- [ ] **Step 4: registry.ts を更新**

`src/games/registry.ts` の import に追加:

```ts
import { FiveSecStopGame } from './five-sec-stop/five-sec-stop-game'
```

`five-sec-stop` エントリ（現在 68〜82 行目）を以下に置き換え:

```ts
	{
		id: 'five-sec-stop',
		title: '5秒STOP',
		tagline: '5秒ぴったりで止めろ！',
		emoji: '⏱️',
		gradient: ['#4ECDC4', '#2C7A7B'],
		minPlayers: 2,
		maxPlayers: 12,
		requiresPlayers: true,
		catchCopy: '5.00秒ぴったりを狙ってストップ！\nでも途中から数字は見えない…！',
		summary:
			'このゲームは、タイマーを5.00秒ぴったりを狙って止めるゲームです！3秒をすぎると数字が見えなくなるので、最後は自分の体内時計だけが頼り。5.00秒から一番遠かった人が負けです！',
		howToPlay: [
			'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
			'② 自分の番が来たらタップでスタート！5.00秒ぴったりを狙ってもう一度タップ！',
			'③ 3秒をすぎると数字が見えなくなる！感覚だけが頼り！',
			'④ 全員の記録を発表！5.00秒から一番遠かった人が負け！（±0.05秒は「ぴったり賞」）',
		],
		Component: FiveSecStopGame,
	},
```

- [ ] **Step 5: 全テスト・型チェック・lint を実行**

Run: `npx jest src/games/five-sec-stop -i && npm run typecheck && npm run lint`
Expected: すべて PASS / エラーなし

Run: `npm test`
Expected: 既存テスト含め全 PASS（registry.test.ts が壊れていないこと）

- [ ] **Step 6: コミット**

```bash
git add src/games/five-sec-stop src/games/registry.ts
git commit -m "feat: 5秒STOP を registry に登録しゲームを完成 (#11)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 最終検証

**Files:**

- なし（検証のみ）

- [ ] **Step 1: フルテストスイート・型チェック・フォーマット確認**

Run: `npm test && npm run typecheck && npm run lint && npm run format:check`
Expected: すべて PASS。format:check で差分が出たら `npm run format` して追いコミット

- [ ] **Step 2: 受け入れ条件の照合**

Issue #11 の受け入れ条件を1つずつ確認:

- スタート→ストップの高精度計測（3秒以降「???」）→ Task 2/3
- 全員分の結果一覧＋敗者発表 → Task 4/5
- ぴったり賞（±0.05秒）の特別演出 → Task 3
- 遊び方モーダル文言 → Task 5 の registry howToPlay

- [ ] **Step 3: プッシュ**

```bash
git push -u origin feature/11-five-sec-stop
```

PR 作成は superpowers:finishing-a-development-branch に従う（PR 本文に `Closes #11` を含め、末尾に `🤖 Generated with [Claude Code](https://claude.com/claude-code)`）。
