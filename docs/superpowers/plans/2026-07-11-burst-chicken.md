# バーストチキン（G11 / #61）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 秘密の上限（21〜30）に向かって +1/+2/+3 を積み上げる宣言チキンレース「バーストチキン」を、プレミアム限定ゲーム第1号（premium フラグ・ロックカード・共通ロックモーダル・解放判定スタブの初導入）として実装する。

**Architecture:** 純関数 reducer エンジン（`engine.ts`: State + Action → State）＋ `useReducer` で駆動する薄いコンポーネント。緊張演出は `tension.ts` の純関数で合計値→強度に変換。プレミアムゲートは `GameMeta.premium` フラグ＋ `isPremiumUnlocked()` スタブ＋ホーム入口1箇所の分岐で実現する。

**Tech Stack:** Expo (React Native) / TypeScript / jest-expo + @testing-library/react-native / react-native-reanimated / lottie-react-native

**Spec:** `docs/superpowers/specs/2026-07-11-burst-chicken-design.md`

## Global Constraints

- コードフォーマット: タブインデント・セミコロンなし・シングルクォート（Prettier 設定済み。迷ったら周辺コードに合わせる）
- コメントは日本語。既存ファイルのコメント密度に合わせる
- React 19 テスト規約: `await render(...)` / `await act(async () => { ... })` を必ず使う（同期 act はタイマー系テストで失敗する。参照実装: `src/games/kimagure-ox/__tests__/`、`src/games/reaction-pairs/__tests__/reaction-pairs-game.test.tsx`）
- パスエイリアス: `@/` → `src/`
- テスト実行: `npm test -- <ファイルパス>`（全体は `npm test`）
- 作業ブランチ: `feature/61-burst-chicken`（作成済み・origin/develop ベース）
- エンジン定数（`LIMIT_MIN=21` / `LIMIT_MAX=30` / `STOP_UNLOCK=15`）は engine.ts に集約。UI には L の実値を出さない（リザルトの答え合わせを除く）
- `.env` 系ファイルは絶対に読まない（プロジェクトのセキュリティポリシー）
- コミットメッセージ末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` を付ける

---

### Task 1: engine.ts — 純関数 reducer

**Files:**
- Create: `src/games/burst-chicken/engine.ts`
- Test: `src/games/burst-chicken/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: なし（依存ゼロの純関数モジュール）
- Produces:
  - `type Rng = () => number`
  - `type Phase = 'playing' | 'exploded' | 'settled'`
  - `type State = { phase: Phase; limit: number; total: number; turnIndex: number; startIndex: number; playerCount: number; contributions: number[]; losers: number[]; stopperIndex: number | null }`
  - `type Action = { type: 'add'; amount: 1 | 2 | 3 } | { type: 'stop' } | { type: 'restart'; rng: Rng }`
  - `LIMIT_MIN = 21` / `LIMIT_MAX = 30` / `STOP_UNLOCK = 15`
  - `pickLimit(rng: Rng): number`
  - `createInitialState(playerCount: number, rng: Rng, startIndex?: number): State`
  - `canStop(state: State): boolean`
  - `settle(contributions: number[], stopperIndex: number): number[]`
  - `reduce(state: State, action: Action): State`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/burst-chicken/__tests__/engine.test.ts
import {
	LIMIT_MAX,
	LIMIT_MIN,
	STOP_UNLOCK,
	canStop,
	createInitialState,
	pickLimit,
	reduce,
	settle,
	type State,
} from '../engine'

// rng 固定で limit を決定的にする（rng=0 → 21, rng≈1 → 30）
const rngMin = () => 0
const rngMax = () => 0.9999999

function addTimes(state: State, amounts: (1 | 2 | 3)[]): State {
	return amounts.reduce((s, amount) => reduce(s, { type: 'add', amount }), state)
}

describe('pickLimit', () => {
	it('rng=0 で LIMIT_MIN、rng≈1 で LIMIT_MAX の整数を返す', () => {
		expect(pickLimit(rngMin)).toBe(LIMIT_MIN)
		expect(pickLimit(rngMax)).toBe(LIMIT_MAX)
		expect(Number.isInteger(pickLimit(() => 0.5))).toBe(true)
	})
})

describe('createInitialState', () => {
	it('全員の貢献 0・合計 0・playing で開始し、startIndex が手番になる', () => {
		const s = createInitialState(3, rngMin, 1)
		expect(s.phase).toBe('playing')
		expect(s.total).toBe(0)
		expect(s.contributions).toEqual([0, 0, 0])
		expect(s.turnIndex).toBe(1)
		expect(s.startIndex).toBe(1)
		expect(s.losers).toEqual([])
		expect(s.stopperIndex).toBeNull()
	})
})

describe('add', () => {
	it('合計と手番プレイヤーの貢献に加算し、手番が循環する', () => {
		let s = createInitialState(2, rngMax) // limit=30
		s = reduce(s, { type: 'add', amount: 3 })
		expect(s.total).toBe(3)
		expect(s.contributions).toEqual([3, 0])
		expect(s.turnIndex).toBe(1)
		s = reduce(s, { type: 'add', amount: 1 })
		expect(s.contributions).toEqual([3, 1])
		expect(s.turnIndex).toBe(0) // 2人で1周
	})

	it('合計 = L ちょうどはセーフ、L 超過でバースト（手番は動かさない）', () => {
		let s = createInitialState(2, rngMin) // limit=21
		s = addTimes(s, [3, 3, 3, 3, 3, 3, 3]) // 合計21ちょうど
		expect(s.total).toBe(21)
		expect(s.phase).toBe('playing')
		const burstTurn = s.turnIndex
		s = reduce(s, { type: 'add', amount: 1 }) // 22 > 21
		expect(s.phase).toBe('exploded')
		expect(s.losers).toEqual([burstTurn])
		expect(s.turnIndex).toBe(burstTurn)
	})

	it('exploded 後の add は無視する', () => {
		let s = createInitialState(2, rngMin)
		s = addTimes(s, [3, 3, 3, 3, 3, 3, 3, 3]) // 24 でバースト
		const after = reduce(s, { type: 'add', amount: 1 })
		expect(after).toBe(s)
	})
})

describe('canStop / stop', () => {
	it('合計 14 では不可・15 で解禁（境界）', () => {
		let s = createInitialState(2, rngMax)
		s = addTimes(s, [3, 3, 3, 3, 2]) // 14
		expect(canStop(s)).toBe(false)
		expect(reduce(s, { type: 'stop' })).toBe(s) // 解禁前は無視
		s = reduce(s, { type: 'add', amount: 1 }) // 15
		expect(s.total).toBe(STOP_UNLOCK)
		expect(canStop(s)).toBe(true)
	})

	it('stop で settled になり、宣言者と敗者が記録される', () => {
		let s = createInitialState(2, rngMax)
		s = addTimes(s, [3, 1, 3, 1, 3, 1, 3]) // 貢献 [12, 3]、合計15、手番=1
		s = reduce(s, { type: 'stop' })
		expect(s.phase).toBe('settled')
		expect(s.stopperIndex).toBe(1)
		expect(s.losers).toEqual([1]) // 最少 3 = 宣言者本人
	})
})

describe('settle', () => {
	it('単独最少がそのまま負け', () => {
		expect(settle([5, 3, 7], 0)).toEqual([1])
	})
	it('宣言者がタイを含む最少なら宣言者の単独負け', () => {
		expect(settle([3, 3, 7], 0)).toEqual([0])
		expect(settle([3, 3, 3], 2)).toEqual([2])
	})
	it('宣言者以外のタイはタイ全員負け', () => {
		expect(settle([3, 3, 7], 2)).toEqual([0, 1])
	})
})

describe('restart', () => {
	it('終了後の restart で開始プレイヤーが +1 ローテーションし全てリセットされる', () => {
		let s = createInitialState(2, rngMin, 1)
		s = addTimes(s, [3, 3, 3, 3, 3, 3, 3, 3]) // バーストで終了
		expect(s.phase).toBe('exploded')
		const next = reduce(s, { type: 'restart', rng: rngMax })
		expect(next.phase).toBe('playing')
		expect(next.total).toBe(0)
		expect(next.contributions).toEqual([0, 0])
		expect(next.startIndex).toBe(0) // (1 + 1) % 2
		expect(next.limit).toBe(LIMIT_MAX) // 新しい rng で再抽選
	})

	it('playing 中の restart は無視する', () => {
		const s = createInitialState(2, rngMin)
		expect(reduce(s, { type: 'restart', rng: rngMax })).toBe(s)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/games/burst-chicken/__tests__/engine.test.ts`
Expected: FAIL（`Cannot find module '../engine'`）

- [ ] **Step 3: Write minimal implementation**

```ts
// src/games/burst-chicken/engine.ts
export type Rng = () => number

export const LIMIT_MIN = 21
export const LIMIT_MAX = 30
export const STOP_UNLOCK = 15

export type Phase = 'playing' | 'exploded' | 'settled'

export type State = {
	phase: Phase
	limit: number // 秘密の上限 L。リザルトの答え合わせまで UI に出さない
	total: number
	turnIndex: number
	startIndex: number // このラウンドの開始プレイヤー（restart で +1 ローテーション）
	playerCount: number
	contributions: number[] // players と同順の累計貢献ポイント
	losers: number[] // バースト1人 or 精算の1人以上
	stopperIndex: number | null
}

export type Action =
	| { type: 'add'; amount: 1 | 2 | 3 }
	| { type: 'stop' }
	| { type: 'restart'; rng: Rng }

// 秘密の上限: 21〜30 の整数を一様ランダムで決める
export function pickLimit(rng: Rng): number {
	return LIMIT_MIN + Math.floor(rng() * (LIMIT_MAX - LIMIT_MIN + 1))
}

export function createInitialState(playerCount: number, rng: Rng, startIndex = 0): State {
	return {
		phase: 'playing',
		limit: pickLimit(rng),
		total: 0,
		turnIndex: startIndex,
		startIndex,
		playerCount,
		contributions: Array(playerCount).fill(0),
		losers: [],
		stopperIndex: null,
	}
}

export function canStop(state: State): boolean {
	return state.phase === 'playing' && state.total >= STOP_UNLOCK
}

// ストップ精算: 貢献最少が負け。宣言者がタイを含む最少なら宣言者の単独負け、
// 宣言者以外のタイはタイ全員負け（2026-07-11 ブレスト決定）
export function settle(contributions: number[], stopperIndex: number): number[] {
	const min = Math.min(...contributions)
	if (contributions[stopperIndex] === min) return [stopperIndex]
	return contributions.flatMap((c, i) => (c === min ? [i] : []))
}

export function reduce(state: State, action: Action): State {
	switch (action.type) {
		case 'add': {
			if (state.phase !== 'playing') return state
			const total = state.total + action.amount
			const contributions = state.contributions.map((c, i) =>
				i === state.turnIndex ? c + action.amount : c,
			)
			if (total > state.limit) {
				// バースト: 積んだ本人が負け。手番はそのまま（敗者表示に使う）
				return { ...state, total, contributions, phase: 'exploded', losers: [state.turnIndex] }
			}
			return {
				...state,
				total,
				contributions,
				turnIndex: (state.turnIndex + 1) % state.playerCount,
			}
		}
		case 'stop': {
			if (!canStop(state)) return state
			return {
				...state,
				phase: 'settled',
				stopperIndex: state.turnIndex,
				losers: settle(state.contributions, state.turnIndex),
			}
		}
		case 'restart': {
			if (state.phase === 'playing') return state
			return createInitialState(
				state.playerCount,
				action.rng,
				(state.startIndex + 1) % state.playerCount,
			)
		}
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/games/burst-chicken/__tests__/engine.test.ts`
Expected: PASS（全 describe グリーン）

- [ ] **Step 5: Commit**

```bash
git add src/games/burst-chicken/engine.ts src/games/burst-chicken/__tests__/engine.test.ts
git commit -m "feat: バーストチキンの純関数 reducer エンジンを追加 (#61)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: tension.ts — 緊張演出の純関数

**Files:**
- Create: `src/games/burst-chicken/tension.ts`
- Test: `src/games/burst-chicken/__tests__/tension.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `tensionLevel(total: number): number`（0〜1、合計に対して単調非減少）、`TENSION_START = 15` / `TENSION_FULL = 30`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/burst-chicken/__tests__/tension.test.ts
import { TENSION_FULL, TENSION_START, tensionLevel } from '../tension'

it('TENSION_START 以下は 0', () => {
	expect(tensionLevel(0)).toBe(0)
	expect(tensionLevel(TENSION_START)).toBe(0)
})

it('TENSION_FULL 以上は 1 にクランプ', () => {
	expect(tensionLevel(TENSION_FULL)).toBe(1)
	expect(tensionLevel(TENSION_FULL + 10)).toBe(1)
})

it('合計に対して単調非減少', () => {
	let prev = 0
	for (let total = 0; total <= TENSION_FULL + 5; total++) {
		const level = tensionLevel(total)
		expect(level).toBeGreaterThanOrEqual(prev)
		expect(level).toBeGreaterThanOrEqual(0)
		expect(level).toBeLessThanOrEqual(1)
		prev = level
	}
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/games/burst-chicken/__tests__/tension.test.ts`
Expected: FAIL（`Cannot find module '../tension'`）

- [ ] **Step 3: Write minimal implementation**

```ts
// src/games/burst-chicken/tension.ts
// 緊張演出の強度。合計が上限帯（21〜30）に近づくほど画面が赤く・バイブが強くなる。
// ストップ解禁（15）から赤みが乗り始め、上限帯の上端（30）で最大になる線形カーブ
export const TENSION_START = 15
export const TENSION_FULL = 30

export function tensionLevel(total: number): number {
	const t = (total - TENSION_START) / (TENSION_FULL - TENSION_START)
	return Math.min(1, Math.max(0, t))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/games/burst-chicken/__tests__/tension.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/games/burst-chicken/tension.ts src/games/burst-chicken/__tests__/tension.test.ts
git commit -m "feat: バーストチキンの緊張演出カーブを追加 (#61)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: premium 解放判定スタブ＋ GameMeta.premium フラグ

**Files:**
- Create: `src/lib/premium.ts`
- Modify: `src/games/registry.ts`（`GameMeta` 型に `premium?: boolean` を追加するだけ。エントリ追加は Task 9）
- Test: `src/lib/__tests__/premium.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `isPremiumUnlocked(): boolean`（`@/lib/premium`）、`GameMeta.premium?: boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/premium.test.ts
import { isPremiumUnlocked } from '../premium'

const g = globalThis as unknown as { __DEV__?: boolean }

it('開発ビルド（__DEV__=true）では解放', () => {
	expect(isPremiumUnlocked()).toBe(true) // jest は __DEV__=true
})

it('本番ビルド（__DEV__=false）ではロック', () => {
	const orig = g.__DEV__
	g.__DEV__ = false
	expect(isPremiumUnlocked()).toBe(false)
	g.__DEV__ = orig
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/premium.test.ts`
Expected: FAIL（`Cannot find module '../premium'`）

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/premium.ts
// プレミアム解放判定。RevenueCat (#7) 結線までのスタブで、
// 開発ビルドは解放（プレイ確認用）・本番ビルドは全ロック（アプリ未リリースのため実害なし）。
// #7 では CustomerInfo 参照への差し替えをこの1関数に集約する
export function isPremiumUnlocked(): boolean {
	return __DEV__
}
```

`src/games/registry.ts` の `GameMeta` 型に追加（`requiresPlayers?: boolean` の直後）:

```ts
	/** プレミアム限定ゲーム（全体ロック）。ホームでマスク＋👑バッジ、非プレミアムはロックモーダル */
	premium?: boolean
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/premium.test.ts && npm run typecheck`
Expected: PASS / 型エラーなし

- [ ] **Step 5: Commit**

```bash
git add src/lib/premium.ts src/lib/__tests__/premium.test.ts src/games/registry.ts
git commit -m "feat: プレミアム解放判定スタブと GameMeta.premium フラグを追加 (#61)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 共通ロックモーダル premium-lock-modal.tsx

**Files:**
- Create: `src/components/home/premium-lock-modal.tsx`
- Test: `src/components/home/__tests__/premium-lock-modal.test.tsx`

**Interfaces:**
- Consumes: `GradientButton`（`@/components/ui/gradient-button`、props: `title: string; onPress: () => void`）
- Produces: `PremiumLockModal`（props: `{ visible: boolean; gameTitle: string; onClose: () => void }`）

参考実装: `src/games/no-king-game/premium-pack-modal.tsx`（同じ構造のスタブモーダル）。

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/home/__tests__/premium-lock-modal.test.tsx
import { fireEvent, render } from '@testing-library/react-native'
import { PremiumLockModal } from '../premium-lock-modal'

jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

it('ゲーム名とプレミアム案内、近日対応バッジを表示する', async () => {
	const { getByText } = await render(
		<PremiumLockModal visible gameTitle="バーストチキン" onClose={jest.fn()} />,
	)
	expect(getByText('バーストチキン')).toBeTruthy()
	expect(getByText(/WaiPa プレミアムで遊べます/)).toBeTruthy()
	expect(getByText('近日対応予定')).toBeTruthy()
})

it('とじるで onClose が呼ばれる', async () => {
	const onClose = jest.fn()
	const { getByText } = await render(
		<PremiumLockModal visible gameTitle="バーストチキン" onClose={onClose} />,
	)
	fireEvent.press(getByText('とじる'))
	expect(onClose).toHaveBeenCalled()
})

it('visible=false では何も表示しない', async () => {
	const { queryByText } = await render(
		<PremiumLockModal visible={false} gameTitle="バーストチキン" onClose={jest.fn()} />,
	)
	expect(queryByText('近日対応予定')).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/home/__tests__/premium-lock-modal.test.tsx`
Expected: FAIL（`Cannot find module '../premium-lock-modal'`）

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/home/premium-lock-modal.tsx
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	visible: boolean
	gameTitle: string
	onClose: () => void
}

// プレミアム限定ゲーム（全体ロック）の案内スタブ。
// アップグレード導線（購入フロー）は RevenueCat (#7) 実装時にここへ接続する
export function PremiumLockModal({ visible, gameTitle, onClose }: Props) {
	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose}>
				<Pressable style={styles.sheet} onPress={() => {}}>
					<Text style={styles.emoji}>👑</Text>
					<Text style={styles.title}>{gameTitle}</Text>
					<Text style={styles.desc}>このゲームは WaiPa プレミアムで遊べます。</Text>
					<View style={styles.badge}>
						<Text style={styles.badgeText}>近日対応予定</Text>
					</View>
					<GradientButton title="とじる" onPress={onClose} />
				</Pressable>
			</Pressable>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.lg,
	},
	sheet: {
		width: '100%',
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.lg,
		padding: spacing.xl,
		alignItems: 'center',
		gap: spacing.md,
	},
	emoji: { fontSize: 48 },
	title: { ...typography.title, textAlign: 'center' },
	desc: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
	badge: {
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.full,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
	},
	badgeText: { ...typography.caption, color: colors.textMuted },
})
```

注意: `colors` / `radii` / `spacing` / `typography` のキー名は `src/games/no-king-game/premium-pack-modal.tsx` が実際に使っているものをそのまま流用すること（`radii.full` が無い場合は premium-pack-modal の badge スタイルに合わせる）。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/home/__tests__/premium-lock-modal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/home/premium-lock-modal.tsx src/components/home/__tests__/premium-lock-modal.test.tsx
git commit -m "feat: プレミアム限定ゲームの共通ロックモーダルを追加 (#61)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: game-card のロック中マスク＋👑バッジ

**Files:**
- Modify: `src/components/home/game-card.tsx`
- Test: `src/components/home/__tests__/game-card.test.tsx`（既存に追記）

**Interfaces:**
- Consumes: `GameMeta.premium`（Task 3）、`isPremiumUnlocked()`（Task 3）
- Produces: ロック中は `testID="premium-lock-mask"` のマスク＋「👑 プレミアム」バッジをサムネイルに重ねる GameCard

- [ ] **Step 1: Write the failing test**

`src/components/home/__tests__/game-card.test.tsx` の先頭（既存 jest.mock 群の隣）に premium モックを追加し、末尾にテストを追記:

```tsx
let premiumUnlocked = false
jest.mock('@/lib/premium', () => ({
	isPremiumUnlocked: () => premiumUnlocked,
}))

// …既存テストはそのまま…

describe('プレミアムロック表示', () => {
	beforeEach(() => {
		premiumUnlocked = false
	})

	it('premium かつ未解放: 黒マスク＋👑バッジを重ねる（グラデフォールバック）', async () => {
		const { getByTestId, getByText } = await render(
			<GameCard game={{ ...baseGame, premium: true }} onPress={jest.fn()} />,
		)
		expect(getByTestId('premium-lock-mask')).toBeTruthy()
		expect(getByText('👑 プレミアム')).toBeTruthy()
	})

	it('premium かつ未解放: cardThumbnail ありでもマスクを重ねる', async () => {
		const { getByTestId } = await render(
			<GameCard game={{ ...baseGame, premium: true, cardThumbnail: 1 }} onPress={jest.fn()} />,
		)
		expect(getByTestId('card-thumb-image')).toBeTruthy()
		expect(getByTestId('premium-lock-mask')).toBeTruthy()
	})

	it('premium でも解放済みなら通常表示', async () => {
		premiumUnlocked = true
		const { queryByTestId } = await render(
			<GameCard game={{ ...baseGame, premium: true }} onPress={jest.fn()} />,
		)
		expect(queryByTestId('premium-lock-mask')).toBeNull()
	})

	it('無料ゲームにはマスクを出さない', async () => {
		const { queryByTestId } = await render(<GameCard game={baseGame} onPress={jest.fn()} />)
		expect(queryByTestId('premium-lock-mask')).toBeNull()
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/home/__tests__/game-card.test.tsx`
Expected: FAIL（`premium-lock-mask` が見つからない。既存テストは PASS のまま）

- [ ] **Step 3: Write implementation**

`src/components/home/game-card.tsx` を修正。import に premium を追加し、サムネイル（Image / LinearGradient）を relative な View で包んでマスクを重ねる:

```tsx
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { GameMeta } from '@/games/registry'
import { isPremiumUnlocked } from '@/lib/premium'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	game: GameMeta
	onPress: () => void
}

// ゲーム一覧のカード。cardThumbnail があれば画像（タイトル入りキービジュアル前提で文字は重ねない）、
// なければテーマ色グラデ＋絵文字のフォールバック（イントロ用 thumbnail とは独立）。
// プレミアム限定ゲームは未解放の間、薄い黒マスク＋👑バッジを重ねて課金枠だと分かるようにする
export function GameCard({ game, onPress }: Props) {
	const locked = game.premium === true && !isPremiumUnlocked()
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={game.title}
			onPress={onPress}
			style={({ pressed }) => [styles.container, pressed && styles.pressed]}
		>
			<View style={styles.thumbWrap}>
				{game.cardThumbnail !== undefined ? (
					<Image
						testID="card-thumb-image"
						source={game.cardThumbnail}
						style={styles.thumbImage}
						contentFit="cover"
					/>
				) : (
					<LinearGradient
						colors={[game.gradient[0], game.gradient[1]]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.thumb}
					>
						<Text style={styles.emoji}>{game.emoji}</Text>
						<Text style={styles.title} numberOfLines={2}>
							{game.title}
						</Text>
					</LinearGradient>
				)}
				{locked && (
					<View testID="premium-lock-mask" style={styles.lockMask}>
						<View style={styles.lockBadge}>
							<Text style={styles.lockBadgeText}>👑 プレミアム</Text>
						</View>
					</View>
				)}
			</View>
			<Text style={styles.tagline} numberOfLines={2}>
				{game.tagline}
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: { width: '48%', marginBottom: spacing.lg },
	pressed: { opacity: 0.8 },
	thumbWrap: { position: 'relative' },
	thumb: {
		aspectRatio: 1.3,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.xs,
		padding: spacing.sm,
	},
	thumbImage: {
		aspectRatio: 1.3,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
	},
	lockMask: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(10, 8, 20, 0.55)',
		borderRadius: radii.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	lockBadge: {
		backgroundColor: 'rgba(23, 20, 42, 0.9)',
		borderWidth: 1,
		borderColor: '#F0C776',
		borderRadius: 999,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
	},
	lockBadgeText: { ...typography.caption, color: '#F0C776' },
	emoji: { fontSize: 40 },
	title: { ...typography.body, fontWeight: '800', textAlign: 'center' },
	tagline: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/home/__tests__/game-card.test.tsx`
Expected: PASS（既存テスト含め全部グリーン）

- [ ] **Step 5: Commit**

```bash
git add src/components/home/game-card.tsx src/components/home/__tests__/game-card.test.tsx
git commit -m "feat: プレミアムゲームカードにロックマスクと👑バッジを追加 (#61)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: game-grid のタップ分岐（ロック中→モーダル）

**Files:**
- Modify: `src/components/home/game-grid.tsx`
- Test: `src/components/home/__tests__/game-grid.test.tsx`（既存に追記）

**Interfaces:**
- Consumes: `PremiumLockModal`（Task 4）、`isPremiumUnlocked()`（Task 3）、`GameMeta.premium`
- Produces: ロック中カードのタップでモーダル表示（遷移なし）、解放時は従来どおり `router.push`

- [ ] **Step 1: Write the failing test**

既存の `src/components/home/__tests__/game-grid.test.tsx` を開き、既存のモック構成（registry / expo-router 等のモック方法）を確認してそれに合わせる。追加するテストの意図:

```tsx
let premiumUnlocked = false
jest.mock('@/lib/premium', () => ({
	isPremiumUnlocked: () => premiumUnlocked,
}))

// registry のモックに premium ゲームを1つ混ぜる（既存モックの形式に合わせて調整）
jest.mock('@/games/registry', () => ({
	games: [
		{
			id: 'free-game',
			title: '無料ゲーム',
			tagline: 'ただで遊べる',
			emoji: '🎮',
			gradient: ['#111111', '#222222'],
			minPlayers: 2,
			maxPlayers: 8,
			howToPlay: ['遊び方'],
			Component: () => null,
		},
		{
			id: 'burst-chicken',
			title: 'バーストチキン',
			tagline: '積みすぎたら爆発',
			emoji: '🐔',
			gradient: ['#FF9F43', '#EE5253'],
			minPlayers: 2,
			maxPlayers: 12,
			premium: true,
			howToPlay: ['遊び方'],
			Component: () => null,
		},
	],
}))

describe('プレミアムゲート', () => {
	beforeEach(() => {
		premiumUnlocked = false
		jest.clearAllMocks()
	})

	it('ロック中のプレミアムゲームをタップするとモーダルが出て遷移しない', async () => {
		const { getByLabelText, getByText } = await render(<GameGrid />)
		fireEvent.press(getByLabelText('バーストチキン'))
		expect(getByText(/WaiPa プレミアムで遊べます/)).toBeTruthy()
		expect(router.push).not.toHaveBeenCalled()
	})

	it('解放済みなら通常どおり遷移する', async () => {
		premiumUnlocked = true
		const { getByLabelText, queryByText } = await render(<GameGrid />)
		fireEvent.press(getByLabelText('バーストチキン'))
		expect(queryByText(/WaiPa プレミアムで遊べます/)).toBeNull()
		expect(router.push).toHaveBeenCalledWith({
			pathname: '/game/[id]',
			params: { id: 'burst-chicken' },
		})
	})

	it('無料ゲームはロック判定に関係なく遷移する', async () => {
		const { getByLabelText } = await render(<GameGrid />)
		fireEvent.press(getByLabelText('無料ゲーム'))
		expect(router.push).toHaveBeenCalledWith({
			pathname: '/game/[id]',
			params: { id: 'free-game' },
		})
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/home/__tests__/game-grid.test.tsx`
Expected: FAIL（モーダルが表示されず `router.push` が呼ばれてしまう）

- [ ] **Step 3: Write implementation**

```tsx
// src/components/home/game-grid.tsx
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { games, type GameMeta } from '@/games/registry'
import { haptics } from '@/lib/haptics'
import { isPremiumUnlocked } from '@/lib/premium'
import { GameCard } from './game-card'
import { PremiumLockModal } from './premium-lock-modal'

// レジストリ駆動の2列グリッド。ゲーム追加はレジストリに足すだけで反映される。
// プレミアム限定ゲームは未解放の間タップでロックモーダルを出す（解放判定は @/lib/premium に集約）
export function GameGrid() {
	const [lockedGame, setLockedGame] = useState<GameMeta | null>(null)

	return (
		<View style={styles.grid}>
			{games.map((game) => (
				<GameCard
					key={game.id}
					game={game}
					onPress={() => {
						haptics.tap()
						if (game.premium === true && !isPremiumUnlocked()) {
							setLockedGame(game)
							return
						}
						router.push({ pathname: '/game/[id]', params: { id: game.id } })
					}}
				/>
			))}
			<PremiumLockModal
				visible={lockedGame !== null}
				gameTitle={lockedGame ? `${lockedGame.emoji} ${lockedGame.title}` : ''}
				onClose={() => setLockedGame(null)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/home/__tests__/game-grid.test.tsx`
Expected: PASS（既存テスト含め全部グリーン）

- [ ] **Step 5: Commit**

```bash
git add src/components/home/game-grid.tsx src/components/home/__tests__/game-grid.test.tsx
git commit -m "feat: ホームのプレミアムゲームタップでロックモーダルを表示 (#61)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: theme.ts＋ゲーム本体（playing フェーズ）

**Files:**
- Create: `src/games/burst-chicken/theme.ts`
- Create: `src/games/burst-chicken/burst-chicken-game.tsx`
- Test: `src/games/burst-chicken/__tests__/burst-chicken-game.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `createInitialState` / `reduce` / `canStop` / `LIMIT_MIN` / `LIMIT_MAX`、Task 2 の `tensionLevel`、既存の `usePlayers` / `getDisplayNames`（`@/lib/players-store`）、`playerColor`（`@/theme/player-colors`）、`playSound` / `haptics`
- Produces: `BurstChickenGame`（props なし。Task 8 でリザルトを拡張、Task 9 で registry に登録）

このタスクでは playing フェーズの UI を完成させる。終了フェーズ（exploded / settled）は Task 8 で実装するため、暫定で「💥」だけ表示するプレースホルダにする。

- [ ] **Step 1: Write the failing test**

```tsx
// src/games/burst-chicken/__tests__/burst-chicken-game.test.tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { BurstChickenGame } from '../burst-chicken-game'

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

// Math.random を 0.9999… に固定 → limit は常に 30（バーストさせないテスト用）
beforeEach(() => {
	jest.spyOn(Math, 'random').mockReturnValue(0.9999999)
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

it('初期表示: 合計0・先頭プレイヤーの手番・上限ヒント', async () => {
	const { getByText } = await render(<BurstChickenGame />)
	expect(getByText('0')).toBeTruthy()
	expect(getByText(/あかさんの番/)).toBeTruthy()
	expect(getByText(/上限は 21〜30 のどこか/)).toBeTruthy()
})

it('+3 で合計が増えて手番が交代する', async () => {
	const { getByText, getByLabelText } = await render(<BurstChickenGame />)
	await press(getByLabelText('+3'))
	expect(getByText('3')).toBeTruthy()
	expect(getByText(/あおさんの番/)).toBeTruthy()
})

it('ストップは合計15未満では出ず、15で出現する', async () => {
	const { getByLabelText, queryByText, getByText } = await render(<BurstChickenGame />)
	for (let i = 0; i < 4; i++) {
		await press(getByLabelText('+3')) // 12
	}
	expect(queryByText(/ストップ宣言/)).toBeNull()
	await press(getByLabelText('+3')) // 15
	expect(getByText(/ストップ宣言/)).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/games/burst-chicken/__tests__/burst-chicken-game.test.tsx`
Expected: FAIL（`Cannot find module '../burst-chicken-game'`）

- [ ] **Step 3: Write implementation**

```ts
// src/games/burst-chicken/theme.ts
// オレンジ〜赤系（registry の gradient ['#FF9F43', '#EE5253'] と統一）
export const BC = {
	orange: '#FF9F43',
	red: '#EE5253',
	maskRed: '#3D0F14', // 緊張マスクの赤（背景に重ねる）
	gold: '#F0C776',
} as const
```

```tsx
// src/games/burst-chicken/burst-chicken-game.tsx
import { useReducer } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { haptics } from '@/lib/haptics'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { LIMIT_MAX, LIMIT_MIN, canStop, createInitialState, reduce } from './engine'
import { tensionLevel } from './tension'
import { BC } from './theme'

// 宣言チキンレース: 秘密の上限（21〜30）に向かって +1/+2/+3 を積み、
// 超えたら爆発。合計15からはストップ宣言→貢献最少が負けの精算もできる
export function BurstChickenGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [state, dispatch] = useReducer(reduce, players.count, (count) =>
		createInitialState(count, Math.random),
	)

	const tension = tensionLevel(state.total)
	const turnColor = playerColor(state.turnIndex).value

	const add = (amount: 1 | 2 | 3) => {
		playSound('tick') // 素材未登録の間は無音スキップ（bomb-relay と同じ扱い）
		if (tension >= 0.5) haptics.heavy()
		else haptics.tap()
		dispatch({ type: 'add', amount })
	}

	const stop = () => {
		haptics.heavy()
		dispatch({ type: 'stop' })
	}

	if (state.phase !== 'playing') {
		// Task 8 でリザルト演出（爆発・精算・答え合わせ）に差し替える
		return (
			<View style={styles.container}>
				<Text style={styles.totalValue}>💥</Text>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<View
				pointerEvents="none"
				testID="tension-mask"
				style={[styles.tensionMask, { opacity: tension * 0.45 }]}
			/>
			<Text style={styles.hint}>
				上限は {LIMIT_MIN}〜{LIMIT_MAX} のどこか…
			</Text>

			<View style={styles.totalBlock}>
				<Text style={styles.totalLabel}>いまの合計</Text>
				<Text style={[styles.totalValue, tension > 0 && styles.totalDanger]}>{state.total}</Text>
			</View>

			<View style={styles.turnRow}>
				<View style={[styles.turnBar, { backgroundColor: turnColor }]} />
				<Text style={styles.turnText}>{names[state.turnIndex]}さんの番</Text>
			</View>

			<View style={styles.addRow}>
				{([1, 2, 3] as const).map((n) => (
					<Pressable
						key={n}
						accessibilityRole="button"
						accessibilityLabel={`+${n}`}
						onPress={() => add(n)}
						style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
					>
						<Text style={styles.addBtnText}>+{n}</Text>
					</Pressable>
				))}
			</View>

			{canStop(state) && (
				<Pressable
					accessibilityRole="button"
					onPress={stop}
					style={({ pressed }) => [styles.stopBtn, pressed && styles.pressed]}
				>
					<Text style={styles.stopBtnText}>🛑 ストップ宣言！</Text>
				</Pressable>
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
	tensionMask: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: BC.maskRed,
	},
	hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
	totalBlock: { alignItems: 'center', gap: spacing.xs },
	totalLabel: { ...typography.caption, color: colors.textMuted },
	totalValue: { fontSize: 72, fontWeight: '800', color: colors.text, textAlign: 'center' },
	totalDanger: { color: BC.red },
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
	addRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
	addBtn: {
		flex: 1,
		maxWidth: 96,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: BC.orange,
		borderRadius: radii.lg,
		paddingVertical: spacing.md,
		alignItems: 'center',
	},
	addBtnText: { ...typography.title, color: colors.text },
	stopBtn: {
		alignSelf: 'center',
		backgroundColor: BC.red,
		borderRadius: 999,
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.md,
	},
	stopBtnText: { ...typography.body, fontWeight: '800', color: colors.text },
	pressed: { opacity: 0.8 },
})
```

注意: `colors` / `typography` のキー名（`colors.text` / `colors.textMuted` / `colors.surface` 等）は `src/games/bomb-relay/bomb-relay-game.tsx` が使っている実在キーに合わせること。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/games/burst-chicken/__tests__/burst-chicken-game.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/games/burst-chicken/theme.ts src/games/burst-chicken/burst-chicken-game.tsx src/games/burst-chicken/__tests__/burst-chicken-game.test.tsx
git commit -m "feat: バーストチキンの playing フェーズ UI を実装 (#61)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: 終了フロー（爆発・精算・リザルト・もう一回）

**Files:**
- Create: `src/games/burst-chicken/round-result.tsx`
- Modify: `src/games/burst-chicken/burst-chicken-game.tsx`（Task 7 のプレースホルダを差し替え）
- Test: `src/games/burst-chicken/__tests__/round-result.test.tsx`
- Test: `src/games/burst-chicken/__tests__/burst-chicken-game.test.tsx`（追記）

**Interfaces:**
- Consumes: Task 1 の `State`、`DrumrollReveal`（`@/components/game/drumroll-reveal`、props: `{ phase: DrumrollPhase; lottie?: boolean; children }`）、`useDrumroll()`（`@/components/game/use-drumroll`、returns `{ phase, start, reset }`）、`LottieEffect` / `lottieAssets.explosion`（`@/components/game/lottie-effect` / `lottie-assets`）、`GradientButton`
- Produces: `RoundResult`（props: `{ state: State; names: string[]; onRetry: () => void; onHome: () => void }`）— L 答え合わせ＋貢献ランキング＋敗者＋もう一回/ホームへ

- [ ] **Step 1: Write the failing test（RoundResult 単体）**

```tsx
// src/games/burst-chicken/__tests__/round-result.test.tsx
import { fireEvent, render } from '@testing-library/react-native'
import type { State } from '../engine'
import { RoundResult } from '../round-result'

jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

const names = ['あか', 'あお', 'みどり']

const explodedState: State = {
	phase: 'exploded',
	limit: 24,
	total: 25,
	turnIndex: 1,
	startIndex: 0,
	playerCount: 3,
	contributions: [9, 10, 6],
	losers: [1],
	stopperIndex: null,
}

const settledTieState: State = {
	phase: 'settled',
	limit: 28,
	total: 16,
	turnIndex: 2,
	startIndex: 0,
	playerCount: 3,
	contributions: [4, 4, 8],
	losers: [0, 1],
	stopperIndex: 2,
}

it('バースト: 敗者名・上限の答え合わせ・全員の貢献を表示する', async () => {
	const { getByText } = await render(
		<RoundResult state={explodedState} names={names} onRetry={jest.fn()} onHome={jest.fn()} />,
	)
	expect(getByText(/あおさんの負け/)).toBeTruthy()
	expect(getByText(/上限は 24 だった/)).toBeTruthy()
	expect(getByText(/あか/)).toBeTruthy()
	expect(getByText(/6pt/)).toBeTruthy() // 貢献ポイント表示
})

it('精算タイ: タイ全員の名前を敗者として表示する', async () => {
	const { getByText } = await render(
		<RoundResult state={settledTieState} names={names} onRetry={jest.fn()} onHome={jest.fn()} />,
	)
	expect(getByText(/あかさん、あおさんの負け/)).toBeTruthy()
	expect(getByText(/上限は 28 だった/)).toBeTruthy()
})

it('もう一回 / ホームへ がコールバックを呼ぶ', async () => {
	const onRetry = jest.fn()
	const onHome = jest.fn()
	const { getByText } = await render(
		<RoundResult state={explodedState} names={names} onRetry={onRetry} onHome={onHome} />,
	)
	fireEvent.press(getByText('もう一回'))
	expect(onRetry).toHaveBeenCalled()
	fireEvent.press(getByText('ホームへ'))
	expect(onHome).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/games/burst-chicken/__tests__/round-result.test.tsx`
Expected: FAIL（`Cannot find module '../round-result'`）

- [ ] **Step 3: Write RoundResult implementation**

```tsx
// src/games/burst-chicken/round-result.tsx
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import type { State } from './engine'
import { BC } from './theme'

type Props = {
	state: State
	names: string[]
	onRetry: () => void
	onHome: () => void
}

// ラウンド終了のリザルト（バースト・精算 共通）: L の答え合わせ＋貢献ランキング＋敗者＋もう一回/ホームへ
export function RoundResult({ state, names, onRetry, onHome }: Props) {
	const loserNames = state.losers.map((i) => `${names[i]}さん`).join('、')
	// 貢献の少ない順（危険を取らなかった順）に並べる
	const ranking = state.contributions
		.map((points, index) => ({ points, index }))
		.sort((a, b) => a.points - b.points)

	return (
		<View style={styles.container}>
			<Text style={styles.loser}>
				{state.phase === 'exploded' ? '💥 ' : ''}
				{loserNames}の負け！
			</Text>
			<Text style={styles.limitReveal}>上限は {state.limit} だった！</Text>

			<View style={styles.rankingCard}>
				{ranking.map(({ points, index }) => (
					<View key={index} style={styles.rankingRow}>
						<View style={[styles.colorBar, { backgroundColor: playerColor(index).value }]} />
						<Text
							style={[styles.rankingName, state.losers.includes(index) && styles.rankingLoser]}
							numberOfLines={1}
						>
							{names[index]}
						</Text>
						<Text style={styles.rankingPoints}>{points}pt</Text>
					</View>
				))}
			</View>

			<GradientButton title="もう一回" onPress={onRetry} />
			<Text style={styles.homeLink} onPress={onHome}>
				ホームへ
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { gap: spacing.md, alignItems: 'stretch' },
	loser: { ...typography.title, textAlign: 'center', color: BC.red },
	limitReveal: { ...typography.body, textAlign: 'center', color: colors.textMuted },
	rankingCard: {
		backgroundColor: colors.surface,
		borderRadius: radii.lg,
		padding: spacing.md,
		gap: spacing.sm,
	},
	rankingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
	colorBar: { width: 4, height: 20, borderRadius: 2 },
	rankingName: { ...typography.body, color: colors.text, flex: 1 },
	rankingLoser: { color: BC.red, fontWeight: '800' },
	rankingPoints: { ...typography.body, color: colors.textMuted },
	homeLink: { ...typography.body, color: colors.textMuted, textAlign: 'center', padding: spacing.sm },
})
```

- [ ] **Step 4: Run RoundResult test**

Run: `npm test -- src/games/burst-chicken/__tests__/round-result.test.tsx`
Expected: PASS

- [ ] **Step 5: Write the failing test（ゲーム本体の終了フロー）**

`burst-chicken-game.test.tsx` に追記:

```tsx
it('バーストで爆発演出＋リザルトが出て、もう一回で新ラウンドが始まる', async () => {
	// limit=21 に固定（rng=0）
	;(Math.random as jest.Mock).mockReturnValue(0)
	const { getByLabelText, getByText, queryByText } = await render(<BurstChickenGame />)
	for (let i = 0; i < 7; i++) {
		await press(getByLabelText('+3')) // 21 ちょうどまで（セーフ）
	}
	expect(queryByText(/の負け/)).toBeNull()
	await press(getByLabelText('+1')) // 22 > 21 バースト（手番は あお）
	expect(getByText(/あおさんの負け/)).toBeTruthy()
	expect(getByText(/上限は 21 だった/)).toBeTruthy()

	await press(getByText('もう一回'))
	expect(getByText('0')).toBeTruthy()
	// 開始プレイヤーが +1 ローテーション（あお から）
	expect(getByText(/あおさんの番/)).toBeTruthy()
})

it('ストップ宣言でドラムロール後に精算リザルトが出る', async () => {
	;(Math.random as jest.Mock).mockReturnValue(0.9999999) // limit=30
	const { getByLabelText, getByText } = await render(<BurstChickenGame />)
	// あか +3 ×3回 / あお +2 ×2回 → 交互: 3,2,3,2,3 = 13 → あお +2 = 15
	await press(getByLabelText('+3'))
	await press(getByLabelText('+2'))
	await press(getByLabelText('+3'))
	await press(getByLabelText('+2'))
	await press(getByLabelText('+3'))
	await press(getByLabelText('+2')) // 合計15、手番=あか、貢献 [9, 6]
	await press(getByText(/ストップ宣言/)) // 宣言者=あか、最少=あお(6)
	await act(async () => {
		jest.advanceTimersByTime(2000) // ドラムロール完了
	})
	expect(getByText(/あおさんの負け/)).toBeTruthy()
	expect(getByText(/上限は 30 だった/)).toBeTruthy()
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- src/games/burst-chicken/__tests__/burst-chicken-game.test.tsx`
Expected: 追記した2件が FAIL（プレースホルダ「💥」のまま）

- [ ] **Step 7: Replace placeholder in burst-chicken-game.tsx**

import に追加:

```tsx
import { router } from 'expo-router'
import { useEffect, useReducer } from 'react'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { lottieAssets } from '@/components/game/lottie-assets'
import { LottieEffect } from '@/components/game/lottie-effect'
import { useDrumroll } from '@/components/game/use-drumroll'
import { RoundResult } from './round-result'
```

コンポーネント本体に追加（`const stop = ...` の後）:

```tsx
	const drum = useDrumroll()

	// バースト: 爆発音＋強バイブ。精算: ドラムロール開始
	useEffect(() => {
		if (state.phase === 'exploded') {
			playSound('explosion')
			haptics.heavy()
		}
		if (state.phase === 'settled') {
			drum.start()
		}
	}, [state.phase, drum])

	const retry = () => {
		drum.reset()
		dispatch({ type: 'restart', rng: Math.random })
	}
```

`if (state.phase !== 'playing')` のプレースホルダを差し替え:

```tsx
	if (state.phase === 'exploded') {
		return (
			<View style={[styles.container, styles.explodedBg]}>
				<LottieEffect
					source={lottieAssets.explosion}
					style={styles.explosionLottie}
					fallback={<Text style={styles.explosionEmoji}>💥</Text>}
				/>
				<RoundResult
					state={state}
					names={names}
					onRetry={retry}
					onHome={() => router.replace('/')}
				/>
			</View>
		)
	}

	if (state.phase === 'settled') {
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
```

styles に追加:

```tsx
	explodedBg: { backgroundColor: BC.maskRed },
	explosionLottie: { width: 160, height: 160, alignSelf: 'center' },
	explosionEmoji: { fontSize: 96, textAlign: 'center' },
```

注意: `DrumrollReveal` は `revealed` になるまで children を隠す実装か、`rolling` 中に「？？？」を出す実装かを `src/components/game/drumroll-reveal.tsx` で確認し、精算テスト（ドラムロール完了後に敗者が見える）が意図どおりになる使い方に合わせること。`LottieEffect` の props（1回再生がデフォルトか）も `src/games/bomb-relay/explosion-overlay.tsx` の使い方を確認して合わせる。

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- src/games/burst-chicken`
Expected: engine / tension / round-result / burst-chicken-game すべて PASS

- [ ] **Step 9: Commit**

```bash
git add src/games/burst-chicken/
git commit -m "feat: バーストチキンの爆発・精算・リザルトフローを実装 (#61)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: registry 登録＋CLAUDE.md 追記＋全体検証

**Files:**
- Modify: `src/games/registry.ts`（burst-chicken エントリ追加）
- Modify: `CLAUDE.md`（収録ゲーム候補に追記）
- Test: 既存の registry / home 系テストが壊れないことの確認

**Interfaces:**
- Consumes: `BurstChickenGame`（Task 7/8）、`GameMeta.premium`（Task 3）
- Produces: ホームに🐔カードが並び、`/game/burst-chicken` で遊べる状態（開発ビルド）

- [ ] **Step 1: Add registry entry**

`src/games/registry.ts` の import に追加:

```ts
import { BurstChickenGame } from './burst-chicken/burst-chicken-game'
```

`games` 配列の末尾（reaction-pairs エントリの後）に追加:

```ts
	{
		id: 'burst-chicken',
		title: 'バーストチキン',
		tagline: '積みすぎたら爆発！宣言チキンレース',
		emoji: '🐔',
		gradient: ['#FF9F43', '#EE5253'],
		minPlayers: 2,
		maxPlayers: 12,
		requiresPlayers: true,
		premium: true,
		catchCopy: '秘密の上限を超えたら爆発！\n積むか、ストップか、度胸の勝負！',
		summary:
			'このゲームは、21〜30のどこかに隠された上限に向かって +1/+2/+3 を積み上げるチキンレースです！超えた瞬間に爆発して負け。合計15からは「ストップ宣言」もでき、精算で一番積んでいない人が負けになります！',
		howToPlay: [
			'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
			'② 順番に +1 / +2 / +3 を選んで合計に積もう！',
			'③ 秘密の上限（21〜30のどこか）を超えたら爆発！その人の負け！',
			'④ 合計15からは「ストップ宣言」もアリ。一番積んでいない人が負け！',
		],
		Component: BurstChickenGame,
	},
```

- [ ] **Step 2: Update CLAUDE.md**

`CLAUDE.md` の「# 収録ゲーム候補」リストの末尾（「収録数:」の行の前）に追加:

```markdown
• バーストチキン – 秘密の上限に向かって +1/+2/+3 を積み上げる宣言チキンレース（プレミアム）。
```

- [ ] **Step 3: Run full verification**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 型エラーなし / lint 警告なし / 全テスト PASS（registry 追加で壊れる home 系スナップショット等があれば、このタスク内で修正する）

- [ ] **Step 4: Manual smoke check（可能なら）**

Expo 起動確認までは必須にしない（実機確認は PR 後の TestPlan #18 で実施）。`npm test` が全部通っていれば OK。

- [ ] **Step 5: Commit**

```bash
git add src/games/registry.ts CLAUDE.md
git commit -m "feat: バーストチキンを registry に登録しプレミアム枠第1号として公開 (#61)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## 完了後

- superpowers:finishing-a-development-branch で PR 作成（develop 向け、Issue #61 参照）
- PR 本文に「サムネイル画像（intro/card）は後日ユーザー支給」「tick.m4a は #75 と共通の素材待ち」を deferred として明記
