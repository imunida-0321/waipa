# カウントダウン爆弾リレー（G7 / #15）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** お題に答えてスマホを回し、加速するチクタクの末にランダム時限（10〜45秒・非表示）で爆発した瞬間に持っていた人が負けるリレーゲームを実装し、registry の `bomb-relay`（ComingSoonGame）を差し替える。

**Architecture:** 純関数エンジン（`engine.ts`: 導火線・チクタク間隔の計算）＋コンポーネント状態機械（ready / ticking / exploded、5秒STOP 準拠）。reducer は使わない。チクタクは setTimeout チェーン（発火ごとに次間隔を再計算）。爆発演出は独立コンポーネント。

**Tech Stack:** Expo (React Native) / TypeScript / react-native-reanimated / lottie-react-native / jest-expo + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-07-10-bomb-relay-design.md`

## Global Constraints

- コードフォーマット: タブ幅4・セミコロンなし・シングルクォート（コミット前に `npx prettier --write <対象>`）
- ブランチ: `feature/15-bomb-relay`（作成済み・最新 develop 基点。この上でコミットを積む）
- テスト: `npm test -- src/games/bomb-relay`。React 19 のため **タイマー系・状態更新系は必ず `await act(async () => { ... })`**（同期 act は失敗する）
- RNTL v14 では `render()` が Promise を返すため **コンポーネントテストは `await render(...)`**。状態更新を起こす `fireEvent.press` は `await act(async () => { fireEvent.press(...) })` で包む
- **fake timers では useEffect が張る次のタイマーは同一 `advanceTimersByTime` 内で発火しない** — フェーズ遷移をまたぐ advance は段階ごとに分ける
- 全画面オーバーレイは `...StyleSheet.absoluteFill`（`absoluteFillObject` は RN 0.86 に存在しない）
- **render 中に ref へ代入しない**（eslint react-hooks/refs がエラーにする。`onDoneRef` 型のパターンは `useEffect` 内で代入する）
- 効果音は `playSound('tick' | 'explosion' | ...)`、バイブは `haptics.tap() / heavy() / success()` のみ経由。**`tick` は未登録キー**（素材はユーザーが後日追加）で、`playSound` が無音スキップするのは確認済み — コードは普通に `playSound('tick')` を呼ぶ
- 素の `npm test` は `.claude/worktrees/` を拾って落ちる。全体回帰は `npm test -- src`（home 系 2 スイート game-card/game-grid の起動失敗は develop 既発・本ブランチ対象外）
- `.env` 系ファイルは読まない（セキュリティポリシー）

---

### Task 1: engine.ts（導火線・チクタク間隔の純関数）

**Files:**

- Create: `src/games/bomb-relay/engine.ts`
- Test: `src/games/bomb-relay/__tests__/engine.test.ts`

**Interfaces:**

- Consumes: なし（純関数のみ）
- Produces:
    - `type Rng = () => number`
    - `FUSE_MIN_MS = 10000` / `FUSE_MAX_MS = 45000` / `TICK_START_MS = 700` / `TICK_END_MS = 140`
    - `pickFuseMs(rng: Rng): number`
    - `nextTickDelay(elapsedMs: number, fuseMs: number): number`

- [ ] **Step 1: 失敗するテストを書く**

`src/games/bomb-relay/__tests__/engine.test.ts`:

```ts
import {
	FUSE_MAX_MS,
	FUSE_MIN_MS,
	TICK_END_MS,
	TICK_START_MS,
	nextTickDelay,
	pickFuseMs,
} from '../engine'

describe('pickFuseMs', () => {
	it('rng=0 で下限 10000ms', () => {
		expect(pickFuseMs(() => 0)).toBe(FUSE_MIN_MS)
	})

	it('rng が 1 に近いとき上限 45000ms 未満に収まる', () => {
		const fuse = pickFuseMs(() => 0.9999999)
		expect(fuse).toBeLessThan(FUSE_MAX_MS)
		expect(fuse).toBeGreaterThan(FUSE_MAX_MS - 10)
	})

	it('中間値: rng=0.5 で 27500ms', () => {
		expect(pickFuseMs(() => 0.5)).toBe(27500)
	})
})

describe('nextTickDelay', () => {
	const FUSE = 10000

	it('開始時は TICK_START_MS', () => {
		expect(nextTickDelay(0, FUSE)).toBe(TICK_START_MS)
	})

	it('導火線が尽きる時点で TICK_END_MS', () => {
		expect(nextTickDelay(FUSE, FUSE)).toBe(TICK_END_MS)
	})

	it('進行率の2乗で加速する（中間点は線形より遅い減少）', () => {
		// progress=0.5 → 700 + (140-700)*0.25 = 560
		expect(nextTickDelay(FUSE / 2, FUSE)).toBe(560)
	})

	it('単調減少（後の時刻ほど間隔が短い）', () => {
		let prev = Number.POSITIVE_INFINITY
		for (let t = 0; t <= FUSE; t += 500) {
			const d = nextTickDelay(t, FUSE)
			expect(d).toBeLessThanOrEqual(prev)
			prev = d
		}
	})

	it('elapsed が fuse を超えても TICK_END_MS で下限クランプ', () => {
		expect(nextTickDelay(FUSE * 2, FUSE)).toBe(TICK_END_MS)
	})

	it('負の elapsed は TICK_START_MS 扱い', () => {
		expect(nextTickDelay(-100, FUSE)).toBe(TICK_START_MS)
	})

	it('fuse=0 などの異常入力は TICK_END_MS を返す', () => {
		expect(nextTickDelay(0, 0)).toBe(TICK_END_MS)
		expect(nextTickDelay(100, -5)).toBe(TICK_END_MS)
	})
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test -- src/games/bomb-relay/__tests__/engine.test.ts`
Expected: FAIL（`Cannot find module '../engine'`）

- [ ] **Step 3: engine.ts を実装**

`src/games/bomb-relay/engine.ts`:

```ts
export type Rng = () => number

export const FUSE_MIN_MS = 10000
export const FUSE_MAX_MS = 45000
export const TICK_START_MS = 700
export const TICK_END_MS = 140

// 導火線: 10〜45秒のランダム。残り時間は UI に一切出さない
export function pickFuseMs(rng: Rng): number {
	return FUSE_MIN_MS + rng() * (FUSE_MAX_MS - FUSE_MIN_MS)
}

// チクタク間隔: 進行率の2乗で 700ms → 140ms へ加速（単調減少・下限クランプ）
export function nextTickDelay(elapsedMs: number, fuseMs: number): number {
	if (fuseMs <= 0) return TICK_END_MS
	const progress = Math.min(1, Math.max(0, elapsedMs / fuseMs))
	return TICK_START_MS + (TICK_END_MS - TICK_START_MS) * progress * progress
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/bomb-relay/__tests__/engine.test.ts`
Expected: PASS（10 tests）

- [ ] **Step 5: フォーマット＆コミット**

```bash
npx prettier --write src/games/bomb-relay
git add src/games/bomb-relay
git commit -m "feat: 爆弾リレーのエンジン（導火線・加速チクタク間隔）"
```

---

### Task 2: topics.ts（talk フォールバックお題＋抽選ヘルパー）

**Files:**

- Create: `src/games/bomb-relay/topics.ts`
- Test: `src/games/bomb-relay/__tests__/topics.test.ts`

**Interfaces:**

- Consumes: `Topic`（`@/lib/topics-store`）、`Rng`（Task 1）
- Produces:
    - `FALLBACK_TALK_TOPICS: readonly Topic[]`（pack: 'talk'、20個、id は `fb-talk-N`）
    - `pickTalkTopic(topics: Topic[], usedIds: string[], rng: Rng): Topic`（リモート talk 優先 → フォールバック、usedIds 除外、枯渇時も必ず返す — reaction-pairs の `pickBatsuTopic` と同アルゴリズム）

- [ ] **Step 1: 失敗するテストを書く**

`src/games/bomb-relay/__tests__/topics.test.ts`:

```ts
import type { Topic } from '@/lib/topics-store'
import { FALLBACK_TALK_TOPICS, pickTalkTopic } from '../topics'

describe('FALLBACK_TALK_TOPICS', () => {
	it('20個・全て pack=talk・id 重複なし', () => {
		expect(FALLBACK_TALK_TOPICS.length).toBeGreaterThanOrEqual(20)
		expect(FALLBACK_TALK_TOPICS.every((t) => t.pack === 'talk')).toBe(true)
		expect(new Set(FALLBACK_TALK_TOPICS.map((t) => t.id)).size).toBe(
			FALLBACK_TALK_TOPICS.length,
		)
	})
})

describe('pickTalkTopic', () => {
	const remote: Topic[] = [
		{ id: 'r1', pack: 'talk', text: 'リモートお題1' },
		{ id: 'r2', pack: 'talk', text: 'リモートお題2' },
		{ id: 'k1', pack: 'king', text: '王様お題（対象外）' },
	]

	it('talk パックのお題から rng で選ぶ（他パックは無視）', () => {
		expect(pickTalkTopic(remote, [], () => 0).id).toBe('r1')
	})

	it('使用済み ID を除外する', () => {
		expect(pickTalkTopic(remote, ['r1'], () => 0).id).toBe('r2')
	})

	it('リモートに talk がなければフォールバックから選ぶ', () => {
		expect(pickTalkTopic([], [], () => 0).id).toBe(FALLBACK_TALK_TOPICS[0].id)
	})

	it('プール枯渇時は usedIds を無視して必ず返す（残る1件が返る）', () => {
		const t = pickTalkTopic(remote.slice(0, 1), ['r1'], () => 0)
		expect(t.id).toBe('r1')
	})
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test -- src/games/bomb-relay/__tests__/topics.test.ts`
Expected: FAIL（`Cannot find module '../topics'`）

- [ ] **Step 3: topics.ts を実装**

`src/games/bomb-relay/topics.ts`（お題文言は Supabase シード 0002 の talk パック先頭20問と同一にする）:

```ts
import type { Topic } from '@/lib/topics-store'
import type { Rng } from './engine'

// Supabase 'talk' パック未取得時のフォールバック（0002_seed_topics.sql の先頭20問と同一文言）
export const FALLBACK_TALK_TOPICS: readonly Topic[] = [
	{ id: 'fb-talk-1', pack: 'talk', text: 'ラーメンの具といえば？' },
	{ id: 'fb-talk-2', pack: 'talk', text: '都道府県の名前' },
	{ id: 'fb-talk-3', pack: 'talk', text: 'コンビニで買えるもの' },
	{ id: 'fb-talk-4', pack: 'talk', text: '赤いもの' },
	{ id: 'fb-talk-5', pack: 'talk', text: '丸いもの' },
	{ id: 'fb-talk-6', pack: 'talk', text: '学校にあるもの' },
	{ id: 'fb-talk-7', pack: 'talk', text: '冷蔵庫に入っているもの' },
	{ id: 'fb-talk-8', pack: 'talk', text: '動物園にいる動物' },
	{ id: 'fb-talk-9', pack: 'talk', text: '海の生き物' },
	{ id: 'fb-talk-10', pack: 'talk', text: 'スポーツの名前' },
	{ id: 'fb-talk-11', pack: 'talk', text: '国の名前' },
	{ id: 'fb-talk-12', pack: 'talk', text: 'アニメのキャラクター' },
	{ id: 'fb-talk-13', pack: 'talk', text: 'おにぎりの具' },
	{ id: 'fb-talk-14', pack: 'talk', text: '寿司ネタ' },
	{ id: 'fb-talk-15', pack: 'talk', text: 'パンの種類' },
	{ id: 'fb-talk-16', pack: 'talk', text: '飲み物の名前' },
	{ id: 'fb-talk-17', pack: 'talk', text: '果物の名前' },
	{ id: 'fb-talk-18', pack: 'talk', text: '野菜の名前' },
	{ id: 'fb-talk-19', pack: 'talk', text: '芸能人の名前' },
	{ id: 'fb-talk-20', pack: 'talk', text: '駅の名前' },
]

// リモート talk → フォールバックの順で、usedIds を除外して rng 抽選。
// 除外後に空でも usedIds を無視して必ず1つ返す（reaction-pairs の pickBatsuTopic と同アルゴリズム）
export function pickTalkTopic(topics: Topic[], usedIds: string[], rng: Rng): Topic {
	const remote = topics.filter((t) => t.pack === 'talk')
	const source = remote.length > 0 ? remote : FALLBACK_TALK_TOPICS
	const pool = source.filter((t) => !usedIds.includes(t.id))
	const candidates = pool.length > 0 ? pool : source
	return candidates[Math.floor(rng() * candidates.length)]
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/bomb-relay/__tests__/topics.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: フォーマット＆コミット**

```bash
npx prettier --write src/games/bomb-relay
git add src/games/bomb-relay
git commit -m "feat: 爆弾リレーのお題（talk フォールバック＋抽選ヘルパー）"
```

---

### Task 3: theme.ts＋explosion-overlay.tsx（爆発演出）＋lottie-assets 追加

**Files:**

- Create: `src/games/bomb-relay/theme.ts`
- Create: `src/games/bomb-relay/explosion-overlay.tsx`
- Modify: `src/components/game/lottie-assets.ts`（`explosion` エントリ追加）
- Test: `src/games/bomb-relay/__tests__/explosion-overlay.test.tsx`

**Interfaces:**

- Consumes: `GradientButton`（`@/components/ui/gradient-button`）、`PillButton`（`@/components/ui/pill-button`）、`LottieEffect` / `lottieAssets`（`@/components/game/...`）、`playSound` / `haptics`
- Produces:
    - `BR`: `{ purple: '#A55EEA', purpleDeep: '#8854D0', flash: '#FF4D4F' }`
    - `EXPLOSION_HOLD_MS = 1600`（爆発を見せてからボタンを出すまで。テストと Task 4 が import）
    - `<ExplosionOverlay onRetry={() => void} onHome={() => void} />` — マウント時 `playSound('explosion')`＋`haptics.heavy()`＋赤フラッシュ（reanimated opacity 1→0）＋explosion Lottie。`EXPLOSION_HOLD_MS` 後に「もう一回」「ホームへ」ボタンを表示

- [ ] **Step 1: lottie-assets.ts に explosion を追加**

`src/components/game/lottie-assets.ts` の `cutinFlash` エントリの後に追加（既存コメント規約に従う）:

```ts
	/** 爆弾リレーの爆発（1回再生）。素材ページに「Free to use under the Lottie Simple License」表記を確認済み */
	explosion: require('@/assets/lottie/explosion.json') as LottieSource,
```

- [ ] **Step 2: 失敗するテストを書く**

`src/games/bomb-relay/__tests__/explosion-overlay.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { playSound } from '@/lib/sound'
import { EXPLOSION_HOLD_MS, ExplosionOverlay } from '../explosion-overlay'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('lottie-react-native', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { __esModule: true, default: View }
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
	}
})

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
	jest.clearAllMocks()
})

it('マウント時に敗者宣言と爆発音、ボタンは HOLD 経過後に出る', async () => {
	const onRetry = jest.fn()
	const { getByText, queryByText } = await render(
		<ExplosionOverlay onRetry={onRetry} onHome={jest.fn()} />,
	)
	expect(getByText('💥 今持ってる人の負け！')).toBeTruthy()
	expect(playSound).toHaveBeenCalledWith('explosion')
	expect(queryByText('もう一回')).toBeNull()

	await act(async () => {
		jest.advanceTimersByTime(EXPLOSION_HOLD_MS)
	})
	expect(getByText('もう一回')).toBeTruthy()
	await act(async () => {
		fireEvent.press(getByText('もう一回'))
	})
	expect(onRetry).toHaveBeenCalledTimes(1)
})

it('ホームへ が動く', async () => {
	const onHome = jest.fn()
	const { getByText } = await render(<ExplosionOverlay onRetry={jest.fn()} onHome={onHome} />)
	await act(async () => {
		jest.advanceTimersByTime(EXPLOSION_HOLD_MS)
	})
	await act(async () => {
		fireEvent.press(getByText('ホームへ'))
	})
	expect(onHome).toHaveBeenCalledTimes(1)
})

it('HOLD 前に unmount してもタイマーが残らない', async () => {
	const { unmount } = await render(<ExplosionOverlay onRetry={jest.fn()} onHome={jest.fn()} />)
	await act(async () => {
		unmount()
	})
	expect(jest.getTimerCount()).toBe(0)
})
```

- [ ] **Step 3: テストが落ちることを確認**

Run: `npm test -- src/games/bomb-relay/__tests__/explosion-overlay.test.tsx`
Expected: FAIL（`Cannot find module '../explosion-overlay'`）

- [ ] **Step 4: theme.ts と explosion-overlay.tsx を実装**

`src/games/bomb-relay/theme.ts`:

```ts
// 導火線パープル系（registry の gradient ['#A55EEA', '#8854D0'] と統一）
export const BR = {
	purple: '#A55EEA',
	purpleDeep: '#8854D0',
	flash: '#FF4D4F',
} as const
```

`src/games/bomb-relay/explosion-overlay.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { lottieAssets } from '@/components/game/lottie-assets'
import { LottieEffect } from '@/components/game/lottie-effect'
import { GradientButton } from '@/components/ui/gradient-button'
import { PillButton } from '@/components/ui/pill-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { spacing, typography } from '@/theme/tokens'
import { BR } from './theme'

export const EXPLOSION_HOLD_MS = 1600

type Props = {
	onRetry: () => void
	onHome: () => void
}

// 爆発の瞬間: 赤フラッシュ＋Lottie＋大音量＋強バイブ → ひと呼吸おいてボタンを出す
export function ExplosionOverlay({ onRetry, onHome }: Props) {
	const [showActions, setShowActions] = useState(false)
	const flash = useSharedValue(1)

	useEffect(() => {
		playSound('explosion')
		haptics.heavy()
		flash.value = withTiming(0, { duration: 600 })
		const t = setTimeout(() => setShowActions(true), EXPLOSION_HOLD_MS)
		return () => clearTimeout(t)
	}, [flash])

	const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }))

	return (
		<View style={styles.backdrop}>
			<Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
			<LottieEffect
				source={lottieAssets.explosion}
				style={styles.lottie}
				fallback={<Text style={styles.boomEmoji}>💥</Text>}
			/>
			<Text style={styles.loser}>💥 今持ってる人の負け！</Text>
			{showActions && (
				<View style={styles.actions}>
					<GradientButton title="もう一回" onPress={onRetry} />
					<PillButton title="ホームへ" onPress={onHome} />
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10,8,24,0.94)',
		alignItems: 'stretch',
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.lg,
	},
	flash: {
		...StyleSheet.absoluteFill,
		backgroundColor: BR.flash,
	},
	lottie: { alignSelf: 'center', width: 220, height: 220 },
	boomEmoji: { fontSize: 96, textAlign: 'center' },
	loser: { ...typography.hero, textAlign: 'center' },
	actions: { gap: spacing.md, alignItems: 'stretch' },
})
```

- [ ] **Step 5: テストが通ることを確認**

Run: `npm test -- src/games/bomb-relay/__tests__/explosion-overlay.test.tsx`
Expected: PASS（3 tests・警告なし）

- [ ] **Step 6: フォーマット＆コミット**

```bash
npx prettier --write src/games/bomb-relay src/components/game/lottie-assets.ts
git add src/games/bomb-relay src/components/game/lottie-assets.ts
git commit -m "feat: 爆弾リレーの爆発演出（Lottie＋赤フラッシュ＋敗者宣言）"
```

---

### Task 4: bomb-relay-game.tsx＋registry 差し替え＋sounds README 追記

**Files:**

- Create: `src/games/bomb-relay/bomb-relay-game.tsx`
- Modify: `src/games/registry.ts`（`bomb-relay` エントリ）
- Modify: `assets/sounds/README.md`（tick 未収録の注記）
- Test: `src/games/bomb-relay/__tests__/bomb-relay-game.test.tsx`

**Interfaces:**

- Consumes: Task 1〜3 の全部品、`useTopics`（`@/lib/topics-store`）
- Produces: `export function BombRelayGame()`（registry の `Component`）

**挙動仕様:**

- ready: お題カード＋🧨＋「スタート」。スタートで `fuseRef.current = pickFuseMs(Math.random)`・`haptics.tap()`・phase を 'ticking' へ
- ticking: 「答えたら次の人へ回せ！」ヒント表示。useEffect（deps: [phase]）で (a) setTimeout チェーンのチクタク（`nextTickDelay(Date.now() - startedAt, fuse)` 間隔で `playSound('tick')`＋`haptics.tap()`）、(b) fuse 経過で phase 'exploded'。cleanup で両タイマー clear
- exploded: `<ExplosionOverlay>` を重ねる。onRetry → `pickTalkTopic(topics, usedIds, Math.random)` で新お題（`usedIdsRef` に追加）・phase 'ready'。onHome → `router.replace('/')`
- 初期お題は `useState(() => pickTalkTopic(topics, [], Math.random))` の lazy init、`usedIdsRef = useRef([初期お題.id])`
- 🧨 は ticking 中のみ reanimated withRepeat で脈打つ（ready では静止）
- 残り時間・導火線長は一切表示しない

- [ ] **Step 1: 失敗するテストを書く**

`src/games/bomb-relay/__tests__/bomb-relay-game.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { haptics } from '@/lib/haptics'
import { FUSE_MIN_MS, TICK_START_MS } from '../engine'
import { EXPLOSION_HOLD_MS } from '../explosion-overlay'
import { BombRelayGame } from '../bomb-relay-game'

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
jest.mock('lottie-react-native', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { __esModule: true, default: View }
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
		withRepeat: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
	}
})
jest.mock('@/lib/topics-store', () => ({
	useTopics: () => ({ topics: [], fetchedAt: null }),
}))

// Math.random を 0 に固定: 初期お題 = fb-talk-1「ラーメンの具といえば？」、導火線 = FUSE_MIN_MS (10000ms)
beforeEach(() => {
	jest.spyOn(Math, 'random').mockReturnValue(0)
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

async function startGame() {
	const utils = await render(<BombRelayGame />)
	await act(async () => {
		fireEvent.press(utils.getByText('スタート'))
	})
	return utils
}

it('ready でお題とスタートを表示する', async () => {
	const { getByText } = await render(<BombRelayGame />)
	expect(getByText('ラーメンの具といえば？')).toBeTruthy()
	expect(getByText('スタート')).toBeTruthy()
})

it('スタートで ticking になりチクタクが加速発火する', async () => {
	const { getByText, queryByText } = await startGame()
	expect(getByText('答えたら次の人へ回せ！')).toBeTruthy()
	expect(queryByText('スタート')).toBeNull()

	const tapMock = haptics.tap as jest.Mock
	const afterStart = tapMock.mock.calls.length // スタート押下分
	await act(async () => {
		jest.advanceTimersByTime(TICK_START_MS)
	})
	expect(tapMock.mock.calls.length).toBeGreaterThan(afterStart) // 最初の tick

	const afterFirstTick = tapMock.mock.calls.length
	await act(async () => {
		jest.advanceTimersByTime(3000)
	})
	expect(tapMock.mock.calls.length).toBeGreaterThan(afterFirstTick + 2) // 加速して複数回
})

it('導火線が尽きると爆発し、もう一回で新お題の ready に戻る', async () => {
	const { getByText } = await startGame()
	await act(async () => {
		jest.advanceTimersByTime(FUSE_MIN_MS)
	})
	expect(getByText('💥 今持ってる人の負け！')).toBeTruthy()

	await act(async () => {
		jest.advanceTimersByTime(EXPLOSION_HOLD_MS)
	})
	await act(async () => {
		fireEvent.press(getByText('もう一回'))
	})
	// usedIds に fb-talk-1 が入っているので次は fb-talk-2
	expect(getByText('都道府県の名前')).toBeTruthy()
	expect(getByText('スタート')).toBeTruthy()
})

it('ticking 中に unmount してもタイマーが残らない', async () => {
	const { unmount } = await startGame()
	await act(async () => {
		unmount()
	})
	expect(jest.getTimerCount()).toBe(0)
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test -- src/games/bomb-relay/__tests__/bomb-relay-game.test.tsx`
Expected: FAIL（`Cannot find module '../bomb-relay-game'`）

- [ ] **Step 3: bomb-relay-game.tsx を実装**

```tsx
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from 'react-native-reanimated'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { useTopics, type Topic } from '@/lib/topics-store'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { nextTickDelay, pickFuseMs } from './engine'
import { ExplosionOverlay } from './explosion-overlay'
import { BR } from './theme'
import { pickTalkTopic } from './topics'

type Phase = 'ready' | 'ticking' | 'exploded'

// 状態機械: ready（お題確認）→ ticking（加速チクタク・残り時間非表示）→ exploded（敗者宣言）
export function BombRelayGame() {
	const { topics } = useTopics()
	const [phase, setPhase] = useState<Phase>('ready')
	const [topic, setTopic] = useState<Topic>(() => pickTalkTopic(topics, [], Math.random))
	// 初回レンダー時点の topic はすでに確定しているので、ref 初期値でそのまま使用済み登録できる
	const usedIdsRef = useRef<string[]>([topic.id])
	const fuseRef = useRef(0)

	useEffect(() => {
		if (phase !== 'ticking') return
		const startedAt = Date.now()
		let tickTimer: ReturnType<typeof setTimeout> | null = null
		const scheduleTick = () => {
			tickTimer = setTimeout(
				() => {
					playSound('tick') // 素材未登録の間は無音スキップ（バイブは鳴る）
					haptics.tap()
					scheduleTick()
				},
				nextTickDelay(Date.now() - startedAt, fuseRef.current),
			)
		}
		scheduleTick()
		const boom = setTimeout(() => setPhase('exploded'), fuseRef.current)
		return () => {
			if (tickTimer) clearTimeout(tickTimer)
			clearTimeout(boom)
		}
	}, [phase])

	// 🧨 は ticking 中だけ脈打つ
	const pulse = useSharedValue(1)
	useEffect(() => {
		if (phase === 'ticking') {
			pulse.value = withRepeat(
				withSequence(withTiming(1.18, { duration: 300 }), withTiming(1, { duration: 300 })),
				-1,
			)
		} else {
			pulse.value = withTiming(1, { duration: 120 })
		}
	}, [phase, pulse])
	const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }))

	const start = () => {
		fuseRef.current = pickFuseMs(Math.random)
		haptics.tap()
		setPhase('ticking')
	}

	const retry = () => {
		const next = pickTalkTopic(topics, usedIdsRef.current, Math.random)
		usedIdsRef.current = [...usedIdsRef.current, next.id]
		setTopic(next)
		setPhase('ready')
	}

	return (
		<View style={styles.container}>
			<View style={styles.topicCard}>
				<Text style={styles.topicLabel}>お題</Text>
				<Text style={styles.topicText}>{topic.text}</Text>
			</View>

			<Animated.Text style={[styles.bomb, pulseStyle]}>🧨</Animated.Text>

			{phase === 'ready' ? (
				<GradientButton title="スタート" onPress={start} />
			) : (
				<Text style={styles.hint}>答えたら次の人へ回せ！</Text>
			)}

			{phase === 'exploded' && (
				<ExplosionOverlay onRetry={retry} onHome={() => router.replace('/')} />
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: spacing.lg,
		gap: spacing.xl,
		justifyContent: 'center',
	},
	topicCard: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: BR.purple,
		borderRadius: radii.lg,
		padding: spacing.lg,
		gap: spacing.xs,
	},
	topicLabel: { ...typography.caption, color: BR.purple, textAlign: 'center' },
	topicText: { ...typography.title, textAlign: 'center', lineHeight: 32 },
	bomb: { fontSize: 96, textAlign: 'center' },
	hint: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
})
```

- [ ] **Step 4: registry.ts を差し替え**

import に追加:

```ts
import { BombRelayGame } from './bomb-relay/bomb-relay-game'
```

`bomb-relay` エントリを更新（`title` / `tagline` / `emoji` / `gradient` / `minPlayers` / `maxPlayers` は既存値のまま。`requiresPlayers` は付けない）:

```ts
	{
		id: 'bomb-relay',
		title: 'カウントダウン爆弾リレー',
		tagline: '爆発した時に持ってた人が負け',
		emoji: '🧨',
		gradient: ['#A55EEA', '#8854D0'],
		minPlayers: 3,
		maxPlayers: 12,
		catchCopy: 'お題に答えてスマホを回せ！\n爆発した瞬間、持ってた人の負け！',
		summary:
			'このゲームは、お題（例「ラーメンの具といえば？」）に答えながらスマホを回すリレーゲームです！爆弾のタイマーはランダムで、チクタクがだんだん速くなり…爆発した瞬間に持っていた人が負けです！',
		howToPlay: [
			'① お題をみんなで確認して「スタート」！',
			'② お題に答えたら、すぐ次の人にスマホを手渡し！',
			'③ チクタクがだんだん速くなってきたら…爆発が近い！',
			'④ 💥 爆発した瞬間に持っていた人の負け！',
		],
		Component: BombRelayGame,
	},
```

- [ ] **Step 5: assets/sounds/README.md に tick の注記を追加**

表の下（「加工生成した音源について」の前）に追記:

```markdown
### 未収録（追加予定）

| ファイル   | 用途                                           | 状態                                                                                                                                                     |
| ---------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tick.m4a` | カウントダウン爆弾リレーのチクタク（加速再生） | 素材未収録。追加したら `_layout.tsx` に `registerSound('tick', require('@/assets/sounds/tick.m4a'))` を1行足す。未収録の間は無音（バイブのみ）で動作する |
```

- [ ] **Step 6: テスト・型・全体回帰を確認**

Run: `npm test -- src/games/bomb-relay && npx tsc --noEmit`
Expected: 全 PASS・型エラーなし

Run: `npm test -- src`（registry を触ったので回帰確認。game-card/game-grid の2スイート起動失敗は develop 既発でこのブランチの対象外）
Expected: 既発2件以外すべて PASS

Run: `npx expo lint`
Expected: 新規の error/warning なし（bomb-216 の既存 warning 1件は対象外）

- [ ] **Step 7: フォーマット＆コミット**

```bash
npx prettier --write src/games/bomb-relay src/games/registry.ts assets/sounds/README.md
git add src/games/bomb-relay src/games/registry.ts assets/sounds/README.md
git commit -m "feat: カウントダウン爆弾リレーを実装し registry を差し替え (#15)"
```

---

### Task 5: 全体検証＆仕上げ

**Files:**

- Modify: なし（検証のみ。問題が出た場合のみ修正）

- [ ] **Step 1: 全ゲート確認**

```bash
npm test -- src
npx tsc --noEmit
npx expo lint
npx prettier --check src/games/bomb-relay docs/superpowers/specs/2026-07-10-bomb-relay-design.md docs/superpowers/plans/2026-07-10-bomb-relay.md
```

Expected: 既発（game-card/game-grid 2スイート・bomb-216 lint warning 1件）以外すべてクリーン

- [ ] **Step 2: 手動スモーク（コントローラが Web プレビューで実施）**

ホーム → カウントダウン爆弾リレー → イントロ → ready（お題＋スタート）→ ticking（🧨脈打ち・バイブ発火）→ 爆発演出 → もう一回（新お題）を目視確認。

- [ ] **Step 3: 修正が出た場合のみコミット**

```bash
git add src/games/bomb-relay
git commit -m "fix: 爆弾リレーの検証で見つかった調整"
```

（何もなければスキップ）
