# チンチロ（#52）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3個のサイコロを丼で振るチンチロを実装し、registry の pointing-heat-up と差し替える（Issue #52、#14 の後継）。

**Architecture:** 5秒STOP と同じ「フェーズ状態機械（親）＋純関数ロジック（dice.ts、rng 注入）」。転がり演出は LottieEffect の `diceRoll` スロット＋疑似3Dフォールバック、確定表示はアイソメトリック SVG サイコロ。リザルトは順めくり→最下位ドラムロール→同率ならサドンデス。

**Tech Stack:** Expo (React Native) / TypeScript / react-native-reanimated / react-native-svg / lottie-react-native（LottieEffect 経由）/ jest-expo + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-07-09-chinchiro-design.md`

## Global Constraints

- 作業ディレクトリ: `/Users/hiro/Desktop/Waipa/.claude/worktrees/chinchiro`（ブランチ feature/52-chinchiro）
- コードフォーマット: タブインデント・セミコロンなし・シングルクォート。コミット前に変更ファイルへ `npx prettier --write`
- import は `@/` エイリアス（`src/` にマップ）
- handScore: ピンゾロ 1000 / アラシ 900+x / シゴロ 800 / 目 100+n / 目なし 10 / ヒフミ 0
- ションベン確率 5%（`rng() < 0.05`）/ 最大3投 / 転がり演出 1200ms / リザルト順めくり間隔 600ms
- 役色: pinzoro・arashi=金 `colors.gold` / shigoro=ティール `#4ECDC4` / me=白 `colors.text` / nome=黄 `#F7B731` / hifumi=赤 `#FF6B6B`
- 乱数は必ず `rng: () => number` を引数注入（`Math.random` を純関数内で直接呼ばない）
- テストの act は `await act(async () => ...)`、render は `await render(...)`、renderHook は `await renderHook(...)`（React 19 規約）
- 演出の連鎖タイマーは「setInterval のコールバック内で直接進める」方式（`src/games/five-sec-stop/result.tsx` 参照）
- サウンドは登録済みの `tap` / `reveal` / `event` / `drumroll` のみ。haptics は `tap` / `heavy` / `success` のみ。GradientButton 経由の操作に明示 haptics を重ねない
- テスト実行: `npx jest src/games/chinchiro -i`（全体は `npm test`）
- コミットメッセージは日本語 `feat:`/`test:`/`refactor:` 形式＋末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: dice.ts — 役判定・ランキングの純関数

**Files:**

- Create: `src/games/chinchiro/dice.ts`
- Test: `src/games/chinchiro/__tests__/dice.test.ts`

**Interfaces:**

- Consumes: なし（純関数のみ）
- Produces:
    - `MAX_THROWS = 3` / `SHONBEN_RATE = 0.05`
    - `type HandType = 'pinzoro' | 'arashi' | 'shigoro' | 'me' | 'hifumi' | 'nome'`
    - `type Hand = { type: HandType; value: number; score: number }`（value: アラシ=ゾロ目の目 / 目=目の値 / それ以外 0）
    - `type Throw = { dice: [number, number, number]; shonben: boolean }`
    - `type Ranked = { playerIndex: number; hand: Hand; isLoser: boolean }`
    - `rollThrow(rng: () => number): Throw`
    - `evaluateDice(dice: [number, number, number]): Hand | null`（null = 役なし）
    - `resolveThrows(throws: Throw[]): Hand`（確定役、なければ目なし。shonben 投は無視）
    - `handLabel(hand: Hand): string`（`'ピンゾロ！'` / `'アラシ（5）！'` / `'シゴロ！'` / `'5の目'` / `'目なし…'` / `'ヒフミ…'`）
    - `rankPlayers(hands: Hand[]): Ranked[]`（score 降順・同率 playerIndex 昇順・最小 score 全員 isLoser）

- [ ] **Step 1: 失敗するテストを書く**

`src/games/chinchiro/__tests__/dice.test.ts`:

```ts
import {
	evaluateDice,
	handLabel,
	rankPlayers,
	resolveThrows,
	rollThrow,
	type Hand,
	type Throw,
} from '../dice'

// 決められた値を順に返す rng を作る
function seqRng(values: number[]): () => number {
	let i = 0
	return () => values[i++] ?? 0.999
}

describe('evaluateDice', () => {
	it('ピンゾロ・アラシ・シゴロ・ヒフミを判定する', () => {
		expect(evaluateDice([1, 1, 1])).toEqual({ type: 'pinzoro', value: 0, score: 1000 })
		expect(evaluateDice([5, 5, 5])).toEqual({ type: 'arashi', value: 5, score: 905 })
		expect(evaluateDice([2, 2, 2])).toEqual({ type: 'arashi', value: 2, score: 902 })
		expect(evaluateDice([4, 5, 6])).toEqual({ type: 'shigoro', value: 0, score: 800 })
		expect(evaluateDice([6, 5, 4])).toEqual({ type: 'shigoro', value: 0, score: 800 }) // 順不同
		expect(evaluateDice([1, 2, 3])).toEqual({ type: 'hifumi', value: 0, score: 0 })
		expect(evaluateDice([3, 1, 2])).toEqual({ type: 'hifumi', value: 0, score: 0 }) // 順不同
	})

	it('目（ペア＋1個）を判定する', () => {
		expect(evaluateDice([2, 2, 5])).toEqual({ type: 'me', value: 5, score: 105 })
		expect(evaluateDice([5, 2, 2])).toEqual({ type: 'me', value: 5, score: 105 }) // 順不同
		expect(evaluateDice([6, 6, 1])).toEqual({ type: 'me', value: 1, score: 101 })
		expect(evaluateDice([1, 1, 6])).toEqual({ type: 'me', value: 6, score: 106 })
	})

	it('役なしは null を返す', () => {
		expect(evaluateDice([2, 4, 6])).toBeNull()
		expect(evaluateDice([1, 3, 5])).toBeNull()
	})

	it('序列: 隣接する役の大小が正しい', () => {
		const score = (d: [number, number, number]) => evaluateDice(d)!.score
		expect(score([1, 1, 1])).toBeGreaterThan(score([6, 6, 6])) // ピンゾロ > アラシ6
		expect(score([2, 2, 2])).toBeGreaterThan(score([4, 5, 6])) // アラシ2 > シゴロ
		expect(score([4, 5, 6])).toBeGreaterThan(score([3, 3, 6])) // シゴロ > 6の目
		expect(score([3, 3, 1])).toBeGreaterThan(10) // 1の目 > 目なし(10)
		expect(score([1, 2, 3])).toBeLessThan(10) // ヒフミ < 目なし
	})
})

describe('rollThrow', () => {
	it('rng からションベン判定と出目3個を生成する', () => {
		// 1個目の rng がションベン判定: 0.049 → ションベン
		const t1 = rollThrow(seqRng([0.049, 0, 0.5, 0.999]))
		expect(t1.shonben).toBe(true)
		// 0.05 ちょうどはセーフ
		const t2 = rollThrow(seqRng([0.05, 0, 0.5, 0.999]))
		expect(t2.shonben).toBe(false)
		expect(t2.dice).toEqual([1, 4, 6]) // floor(0*6)+1, floor(0.5*6)+1, floor(0.999*6)+1
	})
})

describe('resolveThrows', () => {
	const t = (dice: [number, number, number], shonben = false): Throw => ({ dice, shonben })

	it('確定役が出た投の役を返す', () => {
		expect(resolveThrows([t([4, 5, 6])]).type).toBe('shigoro')
		expect(resolveThrows([t([2, 4, 6]), t([3, 3, 2])]).type).toBe('me')
	})

	it('3投役なしなら目なし', () => {
		const hand = resolveThrows([t([2, 4, 6]), t([1, 3, 5]), t([2, 4, 6])])
		expect(hand).toEqual({ type: 'nome', value: 0, score: 10 })
	})

	it('ションベン投は無視される（3投目ションベンなら目なし）', () => {
		const hand = resolveThrows([t([2, 4, 6]), t([1, 1, 1], true), t([2, 4, 6])])
		expect(hand.type).toBe('nome') // ピンゾロが出た投はションベンなので無効
	})
})

describe('handLabel', () => {
	const hand = (type: Hand['type'], value = 0, score = 0): Hand => ({ type, value, score })

	it('役名を表示用文字列にする', () => {
		expect(handLabel(hand('pinzoro'))).toBe('ピンゾロ！')
		expect(handLabel(hand('arashi', 5))).toBe('アラシ（5）！')
		expect(handLabel(hand('shigoro'))).toBe('シゴロ！')
		expect(handLabel(hand('me', 5))).toBe('5の目')
		expect(handLabel(hand('nome'))).toBe('目なし…')
		expect(handLabel(hand('hifumi'))).toBe('ヒフミ…')
	})
})

describe('rankPlayers', () => {
	const hand = (score: number): Hand => ({ type: 'me', value: 0, score })

	it('score 降順・最小 score が敗者', () => {
		const ranked = rankPlayers([hand(105), hand(1000), hand(10), hand(800)])
		expect(ranked.map((r) => r.playerIndex)).toEqual([1, 3, 0, 2])
		expect(ranked.map((r) => r.isLoser)).toEqual([false, false, false, true])
	})

	it('同率最下位は全員 isLoser', () => {
		const ranked = rankPlayers([hand(10), hand(105), hand(10)])
		expect(ranked.filter((r) => r.isLoser).map((r) => r.playerIndex)).toEqual([0, 2])
	})

	it('同率は playerIndex 昇順で安定', () => {
		const ranked = rankPlayers([hand(105), hand(800), hand(105)])
		expect(ranked.map((r) => r.playerIndex)).toEqual([1, 0, 2])
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/chinchiro -i`
Expected: FAIL（`Cannot find module '../dice'`）

- [ ] **Step 3: 最小実装を書く**

`src/games/chinchiro/dice.ts`:

```ts
export const MAX_THROWS = 3
export const SHONBEN_RATE = 0.05

export type HandType = 'pinzoro' | 'arashi' | 'shigoro' | 'me' | 'hifumi' | 'nome'

export type Hand = {
	type: HandType
	/** アラシ=ゾロ目の目 / 目=目の値 / それ以外 0 */
	value: number
	score: number
}

export type Throw = { dice: [number, number, number]; shonben: boolean }

export type Ranked = { playerIndex: number; hand: Hand; isLoser: boolean }

const NOME: Hand = { type: 'nome', value: 0, score: 10 }

// 1投ぶん: ションベン判定(5%) → 出目3個。rng は [0,1) を返す想定
export function rollThrow(rng: () => number): Throw {
	const shonben = rng() < SHONBEN_RATE
	const die = () => Math.floor(rng() * 6) + 1
	return { dice: [die(), die(), die()], shonben }
}

// 出目から役を判定。null = 役なし（振り直し対象）。非 null は即確定
export function evaluateDice(dice: [number, number, number]): Hand | null {
	const sorted = [...dice].sort((a, b) => a - b)
	const [a, b, c] = sorted
	if (a === b && b === c) {
		if (a === 1) return { type: 'pinzoro', value: 0, score: 1000 }
		return { type: 'arashi', value: a, score: 900 + a }
	}
	if (a === 4 && b === 5 && c === 6) return { type: 'shigoro', value: 0, score: 800 }
	if (a === 1 && b === 2 && c === 3) return { type: 'hifumi', value: 0, score: 0 }
	if (a === b) return { type: 'me', value: c, score: 100 + c }
	if (b === c) return { type: 'me', value: a, score: 100 + a }
	return null
}

// 投列から最終役を決める。ションベン投は無効。確定役が出ていなければ目なし
export function resolveThrows(throws: Throw[]): Hand {
	for (const t of throws) {
		if (t.shonben) continue
		const hand = evaluateDice(t.dice)
		if (hand) return hand
	}
	return NOME
}

export function handLabel(hand: Hand): string {
	switch (hand.type) {
		case 'pinzoro':
			return 'ピンゾロ！'
		case 'arashi':
			return `アラシ（${hand.value}）！`
		case 'shigoro':
			return 'シゴロ！'
		case 'me':
			return `${hand.value}の目`
		case 'nome':
			return '目なし…'
		case 'hifumi':
			return 'ヒフミ…'
	}
}

// score 降順（同率は playerIndex 昇順）。最小 score は同率含め全員敗者
export function rankPlayers(hands: Hand[]): Ranked[] {
	const entries = hands.map((hand, playerIndex) => ({ playerIndex, hand }))
	const sorted = [...entries].sort(
		(a, b) => b.hand.score - a.hand.score || a.playerIndex - b.playerIndex,
	)
	const worst = sorted[sorted.length - 1]?.hand.score ?? 0
	return sorted.map((e) => ({ ...e, isLoser: e.hand.score === worst }))
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/chinchiro -i`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/games/chinchiro
git commit -m "feat: チンチロの役判定・ランキング純関数を追加 (#52)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: ConfettiBurst 共通化と theme.ts / lottie-assets 追記

**Files:**

- Create: `src/components/game/confetti-burst.tsx`（five-sec-stop/pittari-burst.tsx を移動・改名）
- Delete: `src/games/five-sec-stop/pittari-burst.tsx`
- Modify: `src/games/five-sec-stop/stopwatch-play.tsx`（import と JSX の `PittariBurst` → `ConfettiBurst`）
- Modify: `src/components/game/lottie-assets.ts`（`diceRoll: null` 追加）
- Create: `src/games/chinchiro/theme.ts`

**Interfaces:**

- Consumes: 既存 `pittari-burst.tsx` の実装、Task 1 の `HandType`
- Produces:
    - `ConfettiBurst`（`@/components/game/confetti-burst`、props なし。旧 PittariBurst と同一実装・testID は `confetti-burst` に変更）
    - `lottieAssets.diceRoll: LottieSource | null`
    - `CHIN: { bg: string; bowlRim: string; bowlInner: string; dieFace: string; dieSideL: string; dieSideR: string; pip: string; pipRed: string; handColors: Record<HandType, string> }`

- [ ] **Step 1: pittari-burst.tsx を components/game へ移動・改名**

```bash
git mv src/games/five-sec-stop/pittari-burst.tsx src/components/game/confetti-burst.tsx
```

`src/components/game/confetti-burst.tsx` を編集:

- `import { FSS } from './theme'` → `import { colors } from '@/theme/tokens'` に統一し、`PIECE_COLORS` を `[colors.gold, colors.accentFrom, colors.accentTo, '#4ECDC4']` とする（`@/theme/tokens` の import は既存行とマージ）
- `export function PittariBurst()` → `export function ConfettiBurst()`
- `testID="pittari-burst"` → `testID="confetti-burst"`
- ファイル先頭コメントを「祝福演出の紙吹雪。ぴったり賞・ピンゾロ等の当たり演出で使う」に変更

- [ ] **Step 2: five-sec-stop の参照を更新**

`src/games/five-sec-stop/stopwatch-play.tsx`:

- `import { PittariBurst } from './pittari-burst'` → `import { ConfettiBurst } from '@/components/game/confetti-burst'`
- JSX の `{pittari && <PittariBurst />}` → `{pittari && <ConfettiBurst />}`

- [ ] **Step 3: 既存テストが通ることを確認**

Run: `npx jest src/games/five-sec-stop -i`
Expected: PASS（23テスト。pittari-burst への直接参照テストは存在しない）

- [ ] **Step 4: lottie-assets.ts に diceRoll スロットを追加**

`src/components/game/lottie-assets.ts` の `cutinFlash` 行の下に追加:

```ts
	/** チンチロのサイコロ転がり（ループ再生）。素材要件: 転がり続けるループ / .json / 透過背景 */
	diceRoll: null as LottieSource | null,
```

- [ ] **Step 5: chinchiro/theme.ts を作成**

`src/games/chinchiro/theme.ts`:

```ts
import { colors } from '@/theme/tokens'
import type { HandType } from './dice'

// チンチロのゲームカラー。丼は金縁×濃紫、サイコロはクリーム系（ダークネイビー背景に映える）
export const CHIN = {
	bg: colors.background,
	bowlRim: '#B8860B',
	bowlInner: '#241F3D',
	dieFace: '#F7F3E9',
	dieSideL: '#D9D2C0',
	dieSideR: '#BBB29C',
	pip: '#1E1A33',
	pipRed: '#C0392B',
	handColors: {
		pinzoro: colors.gold,
		arashi: colors.gold,
		shigoro: '#4ECDC4',
		me: colors.text,
		nome: '#F7B731',
		hifumi: '#FF6B6B',
	} satisfies Record<HandType, string>,
} as const
```

- [ ] **Step 6: 全テスト・lint 確認とコミット**

Run: `npx jest src/games -i && npx eslint src/components/game src/games/chinchiro src/games/five-sec-stop`
Expected: すべて PASS / エラーなし

```bash
npx prettier --write src/components/game/confetti-burst.tsx src/components/game/lottie-assets.ts src/games/chinchiro/theme.ts src/games/five-sec-stop/stopwatch-play.tsx
git add -A src/components/game src/games
git commit -m "refactor: 紙吹雪演出を ConfettiBurst として共通化し diceRoll スロットを追加 (#52)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: iso-die.tsx — アイソメトリック SVG サイコロ

**Files:**

- Create: `src/games/chinchiro/iso-die.tsx`
- Test: `src/games/chinchiro/__tests__/iso-die.test.tsx`

**Interfaces:**

- Consumes: Task 2 の `CHIN`
- Produces: `<IsoDie value={1..6} size={number} tilt={number} />`（tilt は度数、省略時 0）。ルート要素に `testID="iso-die-<value>"`

- [ ] **Step 1: 失敗するテストを書く**

`src/games/chinchiro/__tests__/iso-die.test.tsx`:

```tsx
import { render } from '@testing-library/react-native'
import { IsoDie } from '../iso-die'

it('各出目で正しい数の目（ピップ）が描かれる', async () => {
	for (const value of [1, 2, 3, 4, 5, 6] as const) {
		const { getAllByTestId, getByTestId, unmount } = await render(
			<IsoDie value={value} size={64} />,
		)
		expect(getByTestId(`iso-die-${value}`)).toBeTruthy()
		expect(getAllByTestId('pip')).toHaveLength(value)
		unmount()
	}
})

it('1の目は赤ピップになる', async () => {
	const { getByTestId } = await render(<IsoDie value={1} size={64} />)
	expect(getByTestId('pip').props.fill).toBe('#C0392B')
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/chinchiro/__tests__/iso-die.test.tsx -i`
Expected: FAIL（`Cannot find module '../iso-die'`）

- [ ] **Step 3: iso-die.tsx を実装**

```tsx
import { View } from 'react-native'
import Svg, { Ellipse, Polygon } from 'react-native-svg'
import { CHIN } from './theme'

type Props = {
	value: 1 | 2 | 3 | 4 | 5 | 6
	size: number
	/** 傾き（度）。丼の中で散らばって見せる用 */
	tilt?: number
}

// 上面の目の配置（菱形グリッド上の u,v 座標。0..1）
const PIP_LAYOUT: Record<number, [number, number][]> = {
	1: [[0.5, 0.5]],
	2: [
		[0.3, 0.3],
		[0.7, 0.7],
	],
	3: [
		[0.25, 0.25],
		[0.5, 0.5],
		[0.75, 0.75],
	],
	4: [
		[0.3, 0.3],
		[0.7, 0.3],
		[0.3, 0.7],
		[0.7, 0.7],
	],
	5: [
		[0.28, 0.28],
		[0.72, 0.28],
		[0.5, 0.5],
		[0.28, 0.72],
		[0.72, 0.72],
	],
	6: [
		[0.28, 0.22],
		[0.28, 0.5],
		[0.28, 0.78],
		[0.72, 0.22],
		[0.72, 0.5],
		[0.72, 0.78],
	],
}

// 等角投影の立方体。上面菱形: N(50,20) E(85,37.5) S(50,55) W(15,37.5)
// 上面上の点: P(u,v) = (50 + 35u - 35v, 20 + 17.5u + 17.5v)
export function IsoDie({ value, size, tilt = 0 }: Props) {
	const pips = PIP_LAYOUT[value]
	const pipColor = value === 1 ? CHIN.pipRed : CHIN.pip

	return (
		<View
			testID={`iso-die-${value}`}
			style={{ width: size, height: size * 1.1, transform: [{ rotate: `${tilt}deg` }] }}
		>
			<Svg width={size} height={size * 1.1} viewBox="0 0 100 100">
				<Polygon
					points="50,20 85,37.5 50,55 15,37.5"
					fill={CHIN.dieFace}
					stroke={CHIN.pip}
					strokeWidth={1}
				/>
				<Polygon
					points="15,37.5 50,55 50,95 15,77.5"
					fill={CHIN.dieSideL}
					stroke={CHIN.pip}
					strokeWidth={1}
				/>
				<Polygon
					points="50,55 85,37.5 85,77.5 50,95"
					fill={CHIN.dieSideR}
					stroke={CHIN.pip}
					strokeWidth={1}
				/>
				{pips.map(([u, v], i) => (
					<Ellipse
						key={i}
						testID="pip"
						cx={50 + 35 * u - 35 * v}
						cy={20 + 17.5 * u + 17.5 * v}
						rx={3.4}
						ry={2}
						fill={pipColor}
					/>
				))}
			</Svg>
		</View>
	)
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/chinchiro -i`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/games/chinchiro
git add src/games/chinchiro
git commit -m "feat: アイソメトリックSVGの立体サイコロ IsoDie を追加 (#52)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: dice-roll.tsx — 1人分のロール画面

**Files:**

- Create: `src/games/chinchiro/dice-roll.tsx`
- Test: `src/games/chinchiro/__tests__/dice-roll.test.tsx`

**Interfaces:**

- Consumes: Task 1 `rollThrow/evaluateDice/resolveThrows/handLabel/MAX_THROWS`、Task 2 `CHIN` / `ConfettiBurst` / `lottieAssets.diceRoll`、Task 3 `IsoDie`、既存 `LottieEffect` / `DrumrollReveal` / `GradientButton` / `haptics` / `playSound` / `playerColor`
- Produces:
    - `<DiceRoll playerIndex playerName orderLabel doneLabel onDone={(hand: Hand) => void} rng?={() => number} />`（rng 省略時 `Math.random`）
    - `ROLL_DURATION_MS = 1200` を export
    - 内部フェーズ: `standby → rolling → open(出目表示: 確定 or 振り直し or ションベン) → record`
    - 転がり中の丼エリアは `testID="dice-bowl"`

- [ ] **Step 1: 失敗するテストを書く**

`src/games/chinchiro/__tests__/dice-roll.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { DiceRoll, ROLL_DURATION_MS } from '../dice-roll'

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

// rng を並べて出目を固定する。1投 = [ションベン判定, 目1, 目2, 目3]
function seqRng(values: number[]): () => number {
	let i = 0
	return () => values[i++] ?? 0.999
}

// 出目 n を出す rng 値（floor(v*6)+1 = n となる代表値）
const die = (n: number) => (n - 0.5) / 6

async function setup(rngValues: number[], onDone = jest.fn()) {
	const utils = await render(
		<DiceRoll
			playerIndex={0}
			playerName="アオイ"
			orderLabel="1人目 / 2人"
			doneLabel="つぎの人へ"
			onDone={onDone}
			rng={seqRng(rngValues)}
		/>,
	)
	return { onDone, ...utils }
}

it('スタンバイ→振る→転がり→役確定→onDone と進む（シゴロ）', async () => {
	const { onDone, getByText, queryByText } = await setup([
		0.9,
		die(4),
		die(5),
		die(6), // 1投目: セーフ、4-5-6
	])

	expect(getByText('アオイ さんの番')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップで振る！')))

	// 転がり中は役はまだ出ない
	expect(queryByText('シゴロ！')).toBeNull()
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))

	expect(getByText('シゴロ！')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('つぎの人へ')))
	expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ type: 'shigoro', score: 800 }))
})

it('役なしなら振り直しでき、3投目で目なし確定になる', async () => {
	const { onDone, getByText } = await setup([
		0.9,
		die(2),
		die(4),
		die(6), // 1投目: 役なし
		0.9,
		die(1),
		die(3),
		die(5), // 2投目: 役なし
		0.9,
		die(2),
		die(4),
		die(6), // 3投目: 役なし → 目なし確定
	])

	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText(/役なし/)).toBeTruthy()

	await act(async () => fireEvent.press(getByText('もう一度振る')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText(/役なし/)).toBeTruthy()

	await act(async () => fireEvent.press(getByText('もう一度振る')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))

	// 3投目役なし → 目なしとして record へ
	expect(getByText('目なし…')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('つぎの人へ')))
	expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ type: 'nome', score: 10 }))
})

it('ションベンはその投が無効になり、表示が出る', async () => {
	const { getByText } = await setup([
		0.01,
		die(1),
		die(1),
		die(1), // 1投目: ションベン（ピンゾロは無効）
		0.9,
		die(3),
		die(3),
		die(5), // 2投目: 5の目
	])

	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))

	expect(getByText('ションベン！')).toBeTruthy()
	expect(getByText(/のこり2投/)).toBeTruthy()

	await act(async () => fireEvent.press(getByText('もう一度振る')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText('5の目')).toBeTruthy()
})

it('ピンゾロで紙吹雪が出る', async () => {
	const { getByText, getByTestId } = await setup([0.9, die(1), die(1), die(1)])

	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))

	expect(getByText('ピンゾロ！')).toBeTruthy()
	expect(getByTestId('confetti-burst')).toBeTruthy()
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/chinchiro/__tests__/dice-roll.test.tsx -i`
Expected: FAIL（`Cannot find module '../dice-roll'`）

- [ ] **Step 3: dice-roll.tsx を実装**

```tsx
import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { ConfettiBurst } from '@/components/game/confetti-burst'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { LottieEffect } from '@/components/game/lottie-effect'
import { lottieAssets } from '@/components/game/lottie-assets'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import {
	evaluateDice,
	handLabel,
	resolveThrows,
	rollThrow,
	MAX_THROWS,
	type Hand,
	type Throw,
} from './dice'
import { IsoDie } from './iso-die'
import { CHIN } from './theme'

export const ROLL_DURATION_MS = 1200

type Props = {
	playerIndex: number
	playerName: string
	orderLabel: string
	doneLabel: string
	onDone: (hand: Hand) => void
	rng?: () => number
}

type Phase = 'standby' | 'rolling' | 'open' | 'record'

// 1人分のロール: スタンバイ → 転がり(1.2秒) → 出目オープン（確定/振り直し/ションベン）→ 記録ドン
export function DiceRoll({
	playerIndex,
	playerName,
	orderLabel,
	doneLabel,
	onDone,
	rng = Math.random,
}: Props) {
	const [phase, setPhase] = useState<Phase>('standby')
	const [throws, setThrows] = useState<Throw[]>([])
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

	const color = playerColor(playerIndex).value
	const lastThrow = throws[throws.length - 1]
	const lastHand = lastThrow && !lastThrow.shonben ? evaluateDice(lastThrow.dice) : null
	const throwsLeft = MAX_THROWS - throws.length

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current)
		},
		[],
	)

	const roll = () => {
		playSound('tap')
		haptics.tap()
		const t = rollThrow(rng)
		setPhase('rolling')
		timer.current = setTimeout(() => {
			setThrows((prev) => [...prev, t])
			const hand = t.shonben ? null : evaluateDice(t.dice)
			const isLast = throws.length + 1 >= MAX_THROWS
			if (hand || isLast) {
				// 確定 or 3投終了 → record
				if (hand?.type === 'pinzoro') {
					haptics.success()
					playSound('reveal')
				} else if (t.shonben) {
					haptics.heavy()
					playSound('event')
				} else {
					haptics.heavy()
				}
				setPhase('record')
			} else {
				if (t.shonben) playSound('event')
				setPhase('open')
			}
		}, ROLL_DURATION_MS)
	}

	if (phase === 'standby') {
		return (
			<View style={styles.container}>
				<Text style={styles.orderLabel}>{orderLabel}</Text>
				<View style={styles.nameRow}>
					<View style={[styles.colorDot, { backgroundColor: color }]} />
					<Text style={styles.name}>{playerName} さんの番</Text>
				</View>
				<Text style={styles.hint}>サイコロ3つを丼に振って役を出そう！</Text>
				<View style={styles.actions}>
					<GradientButton title="タップで振る！" onPress={roll} />
				</View>
			</View>
		)
	}

	if (phase === 'rolling') {
		return (
			<View style={styles.container}>
				<Text style={styles.orderLabel}>
					{orderLabel}・{throws.length + 1}投目
				</Text>
				<Text style={styles.nameCaption}>{playerName} さんの番</Text>
				<Bowl>
					<LottieEffect
						source={lottieAssets.diceRoll}
						loop
						style={styles.lottie}
						fallback={<TumbleDice />}
					/>
				</Bowl>
				<Text style={styles.hint}>コロコロコロ…</Text>
			</View>
		)
	}

	if (phase === 'open') {
		// 役なし or ションベン（残投あり）
		const shonben = lastThrow?.shonben ?? false
		return (
			<View style={styles.container}>
				<Text style={styles.orderLabel}>
					{orderLabel}・{throws.length}投目
				</Text>
				<Text style={styles.nameCaption}>{playerName} さんの番</Text>
				<Bowl shonben={shonben} dice={lastThrow?.dice}>
					{!shonben && lastThrow && <DiceRow dice={lastThrow.dice} />}
				</Bowl>
				<Text style={[styles.openLabel, shonben && { color: CHIN.handColors.hifumi }]}>
					{shonben ? 'ションベン！' : '役なし…'}
				</Text>
				<Text style={styles.hint}>
					{shonben ? '丼から飛び出た！' : ''}のこり{throwsLeft}投！
				</Text>
				<View style={styles.actions}>
					<GradientButton title="もう一度振る" onPress={roll} />
				</View>
			</View>
		)
	}

	// record: 最終役の確定表示
	const finalHand = resolveThrows(throws)
	const handColor = CHIN.handColors[finalHand.type]
	const lastDice = lastThrow?.dice
	const showDice = lastHand !== null && lastDice // 確定役はその投の出目を見せる

	return (
		<View style={styles.container}>
			{finalHand.type === 'pinzoro' && <ConfettiBurst />}
			<Text style={styles.orderLabel}>{playerName} さんの記録</Text>
			{showDice ? (
				<Bowl>
					<DiceRow dice={lastDice} />
				</Bowl>
			) : (
				<Bowl shonben={lastThrow?.shonben} dice={lastThrow?.dice}>
					{lastThrow && !lastThrow.shonben && <DiceRow dice={lastThrow.dice} />}
				</Bowl>
			)}
			<DrumrollReveal phase="revealed">
				<Text style={[styles.handLabel, { color: handColor }]}>{handLabel(finalHand)}</Text>
			</DrumrollReveal>
			<View style={styles.actions}>
				<GradientButton title={doneLabel} onPress={() => onDone(finalHand)} />
			</View>
		</View>
	)
}

// 丼。shonben 時はサイコロ1個が縁の外に出た表現
function Bowl({
	children,
	shonben = false,
	dice,
}: {
	children?: React.ReactNode
	shonben?: boolean
	dice?: [number, number, number]
}) {
	return (
		<View style={styles.bowlWrap}>
			<View style={styles.bowl}>{children}</View>
			{shonben && dice && (
				<View style={styles.escapedDie}>
					<IsoDie value={dice[0] as 1 | 2 | 3 | 4 | 5 | 6} size={36} tilt={24} />
				</View>
			)}
		</View>
	)
}

function DiceRow({ dice }: { dice: [number, number, number] }) {
	return (
		<View style={styles.diceRow}>
			<IsoDie value={dice[0] as 1 | 2 | 3 | 4 | 5 | 6} size={52} tilt={-7} />
			<IsoDie value={dice[1] as 1 | 2 | 3 | 4 | 5 | 6} size={58} />
			<IsoDie value={dice[2] as 1 | 2 | 3 | 4 | 5 | 6} size={52} tilt={9} />
		</View>
	)
}

// Lottie 素材が無い間の疑似3Dタンブル: 3個の IsoDie が揺れながら出目を高速切替。
// 出目の切替は決定的なサイクル（Math.random を使うとテストの乱数シーケンスを消費してしまうため）
function TumbleDice() {
	const [faces, setFaces] = useState<[number, number, number]>([1, 3, 5])
	const wobble = useSharedValue(0)

	useEffect(() => {
		wobble.value = withRepeat(
			withSequence(withTiming(1, { duration: 90 }), withTiming(-1, { duration: 90 })),
			-1,
		)
		const id = setInterval(() => {
			setFaces(([a, b, c]) => [(a % 6) + 1, ((b + 1) % 6) + 1, ((c + 2) % 6) + 1])
		}, 100)
		return () => clearInterval(id)
	}, [wobble])

	const style = useAnimatedStyle(() => ({
		transform: [
			{ perspective: 300 },
			{ rotateX: `${wobble.value * 12}deg` },
			{ rotateY: `${wobble.value * -10}deg` },
			{ translateY: wobble.value * -6 },
		],
	}))

	return (
		<Animated.View style={style}>
			<DiceRow dice={faces as [number, number, number]} />
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: CHIN.bg,
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
		marginTop: spacing.md,
	},
	bowlWrap: {
		marginVertical: spacing.md,
	},
	bowl: {
		width: 220,
		height: 170,
		borderRadius: 110,
		borderWidth: 4,
		borderColor: CHIN.bowlRim,
		backgroundColor: CHIN.bowlInner,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	escapedDie: {
		position: 'absolute',
		right: -18,
		bottom: -6,
	},
	diceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	lottie: {
		width: 180,
		height: 140,
	},
	openLabel: {
		...typography.title,
		marginTop: spacing.sm,
	},
	handLabel: {
		...typography.hero,
		fontSize: 44,
	},
	actions: {
		alignSelf: 'stretch',
		marginTop: spacing.xl,
	},
})
```

実装後、`Bowl` に `testID="dice-bowl"` を付与（`<View style={styles.bowl} testID="dice-bowl">`）。

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/chinchiro -i`
Expected: PASS。ピンゾロテストで `confetti-burst` が見つかること

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/games/chinchiro
git add src/games/chinchiro
git commit -m "feat: チンチロのロール画面と転がり演出を追加 (#52)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: result.tsx — ランキング発表＋サドンデス

**Files:**

- Create: `src/games/chinchiro/result.tsx`
- Test: `src/games/chinchiro/__tests__/result.test.tsx`

**Interfaces:**

- Consumes: Task 1 `rankPlayers/handLabel/rollThrow/evaluateDice/type Hand/type Ranked`、Task 2 `CHIN`、Task 3 `IsoDie`、既存 `useDrumroll` / `GradientButton` / `PillButton` / `playerColor`
- Produces:
    - `<ChinchiroResult hands={Hand[]} playerNames={string[]} onRetry onHome rng?={() => number} />`
    - `REVEAL_INTERVAL_MS = 600` を export
    - サドンデス: 敗者が複数のとき、ドラムロール発表後に「サドンデス！」→ 当事者が順に「タップで振る」（1投、役なし/ションベン=目なし扱い）→ 全員振ったら最小 score が敗者。同率なら繰り返し

- [ ] **Step 1: 失敗するテストを書く**

`src/games/chinchiro/__tests__/result.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import type { Hand } from '../dice'
import { ChinchiroResult, REVEAL_INTERVAL_MS } from '../result'

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

const hand = (score: number, type: Hand['type'] = 'me', value = 0): Hand => ({
	type,
	value,
	score,
})

function seqRng(values: number[]): () => number {
	let i = 0
	return () => values[i++] ?? 0.999
}
const die = (n: number) => (n - 0.5) / 6

it('1位から順にめくれ、単独敗者はドラムロール後に発表される', async () => {
	const hands = [
		hand(106, 'me', 6),
		hand(1000, 'pinzoro'),
		hand(800, 'shigoro'),
		hand(0, 'hifumi'),
	]
	const names = ['アオイ', 'ミキ', 'ケン', 'ユウタ']
	const { getByText, queryByText } = await render(
		<ChinchiroResult
			hands={hands}
			playerNames={names}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)

	expect(queryByText('ミキ')).toBeNull()
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS))
	expect(getByText('ミキ')).toBeTruthy() // 1位 ピンゾロ
	expect(getByText('ピンゾロ！')).toBeTruthy()

	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS * 2))
	expect(getByText('ケン')).toBeTruthy()
	expect(getByText('アオイ')).toBeTruthy()
	expect(queryByText('ユウタ')).toBeNull() // 敗者はまだ伏せ

	await act(async () => jest.advanceTimersByTime(DRUMROLL_MS))
	expect(getByText('ユウタ')).toBeTruthy()
	expect(getByText(/敗者/)).toBeTruthy()
	expect(getByText('もう一回')).toBeTruthy()
})

it('同率最下位が複数ならサドンデスになり、1投勝負で敗者が決まる', async () => {
	// A と C が目なし同率、B は6の目
	const hands = [hand(10, 'nome'), hand(106, 'me', 6), hand(10, 'nome')]
	const names = ['A', 'B', 'C']
	// サドンデス rng: A の投=[セーフ, 3,3,5]=5の目 / C の投=[セーフ, 2,4,6]=役なし→目なし扱い
	const rng = seqRng([0.9, die(3), die(3), die(5), 0.9, die(2), die(4), die(6)])
	const { getByText, queryByText } = await render(
		<ChinchiroResult
			hands={hands}
			playerNames={names}
			onRetry={jest.fn()}
			onHome={jest.fn()}
			rng={rng}
		/>,
	)

	// めくり(1人) + ドラムロール
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS + DRUMROLL_MS))
	expect(getByText(/サドンデス/)).toBeTruthy()
	expect(queryByText('もう一回')).toBeNull() // 決着まではボタンなし

	// A の1投
	expect(getByText('A さんの番')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(1200))
	// C の1投
	expect(getByText('C さんの番')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(1200))

	// C が目なしで敗者
	expect(getByText(/C/)).toBeTruthy()
	expect(getByText(/敗者/)).toBeTruthy()
	expect(getByText('もう一回')).toBeTruthy()
})

it('全員同率なら全員がサドンデスに進む', async () => {
	const hands = [hand(10, 'nome'), hand(10, 'nome')]
	// 1投目同士も同率 → 再サドンデス → 2巡目で決着
	const rng = seqRng([
		0.9,
		die(2),
		die(4),
		die(6), // A: 目なし
		0.9,
		die(1),
		die(3),
		die(5), // B: 目なし → 同率continue
		0.9,
		die(3),
		die(3),
		die(6), // A: 6の目
		0.9,
		die(2),
		die(4),
		die(6), // B: 目なし → B 敗者
	])
	const { getByText } = await render(
		<ChinchiroResult
			hands={hands}
			playerNames={['A', 'B']}
			onRetry={jest.fn()}
			onHome={jest.fn()}
			rng={rng}
		/>,
	)

	// safe 0人 → 即ドラムロール
	await act(async () => jest.advanceTimersByTime(DRUMROLL_MS))
	expect(getByText(/サドンデス/)).toBeTruthy()

	for (let i = 0; i < 4; i++) {
		await act(async () => fireEvent.press(getByText('タップで振る！')))
		await act(async () => jest.advanceTimersByTime(1200))
	}

	expect(getByText(/敗者/)).toBeTruthy()
})

it('発表完了後に「もう一回」で onRetry が呼ばれる', async () => {
	const onRetry = jest.fn()
	const { getByText } = await render(
		<ChinchiroResult
			hands={[hand(106, 'me', 6), hand(10, 'nome')]}
			playerNames={['A', 'B']}
			onRetry={onRetry}
			onHome={jest.fn()}
		/>,
	)
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS + 2000))
	await act(async () => fireEvent.press(getByText('もう一回')))
	expect(onRetry).toHaveBeenCalled()
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/chinchiro/__tests__/result.test.tsx -i`
Expected: FAIL（`Cannot find module '../result'`）

- [ ] **Step 3: result.tsx を実装**

```tsx
import { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useDrumroll } from '@/components/game/use-drumroll'
import { GradientButton } from '@/components/ui/gradient-button'
import { PillButton } from '@/components/ui/pill-button'
import { playSound } from '@/lib/sound'
import { haptics } from '@/lib/haptics'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { evaluateDice, handLabel, rankPlayers, rollThrow, type Hand, type Ranked } from './dice'
import { IsoDie } from './iso-die'
import { CHIN } from './theme'

export const REVEAL_INTERVAL_MS = 600
const SUDDEN_ROLL_MS = 1200
const NOME: Hand = { type: 'nome', value: 0, score: 10 }

type Props = {
	hands: Hand[]
	playerNames: string[]
	onRetry: () => void
	onHome: () => void
	rng?: () => number
}

type Stage = 'ranking' | 'sudden-death' | 'final'

// ランキング発表（順めくり→最下位ドラムロール）→ 同率複数ならサドンデス → 敗者確定
export function ChinchiroResult({ hands, playerNames, onRetry, onHome, rng = Math.random }: Props) {
	const ranked = rankPlayers(hands)
	const initialLosers = ranked.filter((r) => r.isLoser).map((r) => r.playerIndex)
	const safeCount = ranked.length - initialLosers.length

	const [revealed, setRevealed] = useState(0)
	const [stage, setStage] = useState<Stage>('ranking')
	const [finalLosers, setFinalLosers] = useState<number[]>([])
	const drum = useDrumroll()
	const drumStarted = useRef(false)

	// 順めくり: interval コールバック内で drumroll 開始まで直接進める（fake timers 対応の定石）
	useEffect(() => {
		const { start } = drum
		let count = 0
		const id = setInterval(() => {
			count += 1
			if (count >= safeCount) {
				clearInterval(id)
				if (!drumStarted.current) {
					drumStarted.current = true
					start()
				}
			}
			setRevealed(count)
		}, REVEAL_INTERVAL_MS)
		if (safeCount === 0) {
			clearInterval(id)
			if (!drumStarted.current) {
				drumStarted.current = true
				start()
			}
		}
		return () => clearInterval(id)
		// マウント時1回だけ実行（drum.start は useCallback で安定）
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// ドラムロール明け: 単独敗者なら確定、複数ならサドンデスへ
	useEffect(() => {
		if (drum.phase !== 'revealed' || stage !== 'ranking') return
		if (initialLosers.length <= 1) {
			setFinalLosers(initialLosers)
			setStage('final')
		} else {
			setStage('sudden-death')
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [drum.phase])

	const losersRevealed = drum.phase === 'revealed'

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>けっか はっぴょう</Text>

			{ranked.map((entry, rankIndex) => (
				<RankCard
					key={entry.playerIndex}
					entry={entry}
					rank={rankIndex + 1}
					name={playerNames[entry.playerIndex]}
					shown={entry.isLoser ? losersRevealed : rankIndex < revealed}
					isFinalLoser={stage === 'final' && finalLosers.includes(entry.playerIndex)}
				/>
			))}

			{stage === 'sudden-death' && (
				<SuddenDeath
					contenders={initialLosers}
					playerNames={playerNames}
					rng={rng}
					onSettled={(losers) => {
						setFinalLosers(losers)
						setStage('final')
						haptics.heavy()
						playSound('reveal')
					}}
				/>
			)}

			{stage === 'final' && (
				<>
					<Text style={styles.loserBanner}>
						{finalLosers.map((i) => playerNames[i]).join('・')} の負け！
					</Text>
					<View style={styles.actions}>
						<GradientButton title="もう一回" onPress={onRetry} />
						<View style={styles.actionGap} />
						<PillButton title="ホームへ" onPress={onHome} />
					</View>
				</>
			)}
		</ScrollView>
	)
}

// サドンデス: 当事者が順に1投（役なし/ションベン=目なし扱い）。全員振ったら最小scoreが敗者。同率なら次ラウンド
function SuddenDeath({
	contenders,
	playerNames,
	rng,
	onSettled,
}: {
	contenders: number[]
	playerNames: string[]
	rng: () => number
	onSettled: (losers: number[]) => void
}) {
	const [round, setRound] = useState<number[]>(contenders)
	const [turn, setTurn] = useState(0)
	const [results, setResults] = useState<Hand[]>([])
	const [rolling, setRolling] = useState(false)
	const [lastDice, setLastDice] = useState<[number, number, number] | null>(null)
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current)
		},
		[],
	)

	const currentPlayer = round[turn]

	const roll = () => {
		playSound('tap')
		const t = rollThrow(rng)
		setRolling(true)
		timer.current = setTimeout(() => {
			const hand = t.shonben ? NOME : (evaluateDice(t.dice) ?? NOME)
			setLastDice(t.shonben ? null : t.dice)
			setRolling(false)
			const nextResults = [...results, hand]
			if (turn + 1 < round.length) {
				setResults(nextResults)
				setTurn(turn + 1)
				return
			}
			// 全員振った → 判定
			const worst = Math.min(...nextResults.map((h) => h.score))
			const losers = round.filter((_, i) => nextResults[i].score === worst)
			if (losers.length === round.length) {
				// 全員同率 → 再ラウンド
				setRound(losers)
				setResults([])
				setTurn(0)
				return
			}
			if (losers.length === 1) {
				onSettled(losers)
				return
			}
			// 同率複数（一部）→ その面々で再ラウンド
			setRound(losers)
			setResults([])
			setTurn(0)
		}, SUDDEN_ROLL_MS)
	}

	return (
		<View style={styles.sudden}>
			<Text style={styles.suddenTitle}>同率最下位！サドンデス！</Text>
			{rolling ? (
				<Text style={styles.suddenRolling}>コロコロコロ…</Text>
			) : (
				<>
					{lastDice && (
						<View style={styles.suddenDice}>
							<IsoDie
								value={lastDice[0] as 1 | 2 | 3 | 4 | 5 | 6}
								size={36}
								tilt={-6}
							/>
							<IsoDie value={lastDice[1] as 1 | 2 | 3 | 4 | 5 | 6} size={40} />
							<IsoDie
								value={lastDice[2] as 1 | 2 | 3 | 4 | 5 | 6}
								size={36}
								tilt={8}
							/>
						</View>
					)}
					<Text style={styles.suddenName}>{playerNames[currentPlayer]} さんの番</Text>
					<GradientButton title="タップで振る！" onPress={roll} />
				</>
			)}
		</View>
	)
}

function RankCard({
	entry,
	rank,
	name,
	shown,
	isFinalLoser,
}: {
	entry: Ranked
	rank: number
	name: string
	shown: boolean
	isFinalLoser: boolean
}) {
	if (!shown) {
		return (
			<View style={styles.card}>
				<Text style={styles.hiddenMark}>？？？</Text>
			</View>
		)
	}

	const handColor = CHIN.handColors[entry.hand.type]
	const isTop = rank === 1 && !entry.isLoser

	return (
		<View style={[styles.card, isTop && styles.topCard, isFinalLoser && styles.loserCard]}>
			<Text style={styles.rank}>{rank}位</Text>
			<View
				style={[styles.colorDot, { backgroundColor: playerColor(entry.playerIndex).value }]}
			/>
			<Text style={styles.name}>{name}</Text>
			{isFinalLoser && <Text style={styles.loserMark}>敗者！</Text>}
			<Text style={[styles.hand, { color: handColor }]}>{handLabel(entry.hand)}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: CHIN.bg,
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
		borderColor: CHIN.handColors.hifumi,
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
	loserMark: {
		...typography.body,
		color: CHIN.handColors.hifumi,
		fontWeight: '700',
	},
	hand: {
		...typography.body,
		fontWeight: '700',
	},
	sudden: {
		alignItems: 'center',
		marginTop: spacing.md,
		gap: spacing.sm,
	},
	suddenTitle: {
		...typography.title,
		color: CHIN.handColors.nome,
	},
	suddenRolling: {
		...typography.body,
		color: colors.textMuted,
	},
	suddenDice: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	suddenName: {
		...typography.body,
	},
	loserBanner: {
		...typography.title,
		color: CHIN.handColors.hifumi,
		textAlign: 'center',
		marginTop: spacing.md,
	},
	actions: {
		marginTop: spacing.md,
	},
	actionGap: {
		height: spacing.sm,
	},
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/chinchiro -i`
Expected: PASS（4ファイル）

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/games/chinchiro
git add src/games/chinchiro
git commit -m "feat: チンチロのランキング発表とサドンデスを追加 (#52)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: chinchiro-game.tsx・registry 差し替え・CLAUDE.md 更新・統合テスト

**Files:**

- Create: `src/games/chinchiro/chinchiro-game.tsx`
- Modify: `src/games/registry.ts`（import 追加＋`pointing-heat-up` エントリを `chinchiro` に置換）
- Modify: `CLAUDE.md`（MVPスコープと収録ゲーム候補）
- Test: `src/games/chinchiro/__tests__/chinchiro-game.test.tsx`

**Interfaces:**

- Consumes: Task 4 `DiceRoll`、Task 5 `ChinchiroResult`、既存 `usePlayers/getDisplayNames`、`router`
- Produces: `ChinchiroGame: ComponentType`

- [ ] **Step 1: 失敗する統合テストを書く**

`src/games/chinchiro/__tests__/chinchiro-game.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { ROLL_DURATION_MS } from '../dice-roll'
import { REVEAL_INTERVAL_MS } from '../result'
import { ChinchiroGame } from '../chinchiro-game'

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
		withSequence: jest.fn((toValue: number) => toValue),
		withSpring: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withDelay: jest.fn((_delay: number, toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn(), linear: jest.fn() },
	}
})
jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
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
	// 乱数固定: ションベン判定は常にセーフ(0.9)、出目は 0.9→6
	// 1人目: [セーフ, 6,6,6]=アラシ6 / 2人目: [セーフ, 1,2,3]=ヒフミ
	const values = [0.9, 0.99, 0.99, 0.99, 0.9, 0.01, 0.2, 0.4]
	let call = 0
	jest.spyOn(Math, 'random').mockImplementation(() => values[call++] ?? 0.9)
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

it('2人が順番に振り、リザルトで敗者が発表される', async () => {
	const { getByText } = await render(<ChinchiroGame />)

	// 1人目: アオイ（アラシ6）
	expect(getByText('1人目 / 2人')).toBeTruthy()
	expect(getByText('アオイ さんの番')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText('アラシ（6）！')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('つぎの人へ')))

	// 2人目: ユウタ（ヒフミ）
	expect(getByText('2人目 / 2人')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText('ヒフミ…')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('結果発表へ')))

	// リザルト
	expect(getByText('けっか はっぴょう')).toBeTruthy()
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS + DRUMROLL_MS))
	expect(getByText('ユウタ')).toBeTruthy()
	expect(getByText(/敗者/)).toBeTruthy()
})

it('「もう一回」で1人目からやり直せる', async () => {
	const { getByText } = await render(<ChinchiroGame />)

	for (const label of ['つぎの人へ', '結果発表へ']) {
		await act(async () => fireEvent.press(getByText('タップで振る！')))
		await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
		await act(async () => fireEvent.press(getByText(label)))
	}
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS + DRUMROLL_MS))

	await act(async () => fireEvent.press(getByText('もう一回')))
	expect(getByText('1人目 / 2人')).toBeTruthy()
	expect(getByText('アオイ さんの番')).toBeTruthy()
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/chinchiro/__tests__/chinchiro-game.test.tsx -i`
Expected: FAIL（`Cannot find module '../chinchiro-game'`）

- [ ] **Step 3: chinchiro-game.tsx を実装**

```tsx
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import type { Hand } from './dice'
import { DiceRoll } from './dice-roll'
import { ChinchiroResult } from './result'
import { CHIN } from './theme'

// 状態機械: プレイヤーごとのロールループ → 全員終了でランキング発表（＋サドンデス）
export function ChinchiroGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [hands, setHands] = useState<Hand[]>([])
	const [round, setRound] = useState(0)

	const current = hands.length
	const finished = current >= players.count

	return (
		<View style={styles.container}>
			{finished ? (
				<ChinchiroResult
					hands={hands}
					playerNames={names}
					onRetry={() => {
						setHands([])
						setRound((r) => r + 1)
					}}
					onHome={() => router.replace('/')}
				/>
			) : (
				<DiceRoll
					key={`${round}-${current}`}
					playerIndex={current}
					playerName={names[current]}
					orderLabel={`${current + 1}人目 / ${players.count}人`}
					doneLabel={current === players.count - 1 ? '結果発表へ' : 'つぎの人へ'}
					onDone={(hand) => setHands((prev) => [...prev, hand])}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: CHIN.bg,
	},
})
```

- [ ] **Step 4: registry.ts を差し替え**

import に追加:

```ts
import { ChinchiroGame } from './chinchiro/chinchiro-game'
```

`pointing-heat-up` のエントリ（id/title/tagline/emoji/gradient/minPlayers/maxPlayers/howToPlay/Component の一式）を以下に置き換え:

```ts
	{
		id: 'chinchiro',
		title: 'チンチロ',
		tagline: '丼とサイコロ3つの真剣勝負！',
		emoji: '🎲',
		gradient: ['#FF9F43', '#EE5253'],
		minPlayers: 2,
		maxPlayers: 12,
		requiresPlayers: true,
		catchCopy: 'サイコロ3つを丼に振って役で勝負！\n一番弱かった人が負け！',
		summary:
			'このゲームは、3個のサイコロを振って出た役の強さで勝負するチンチロです！役が出るまで最大3回振れます。ピンゾロ（1・1・1）が最強、ヒフミ（1・2・3）は最弱。丼からサイコロが飛び出す『ションベン』にも注意！',
		howToPlay: [
			'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
			'② 自分の番が来たらタップでサイコロを3つ振ろう！役が出たら確定、役なしなら最大3投まで振り直し！',
			'③ 役の強さは ピンゾロ＞アラシ＞シゴロ＞目＞目なし＞ヒフミ。ションベン（丼から飛び出し）はその投が無効に！',
			'④ 全員の役を発表！一番弱かった人が負け！（同率ならサドンデス勝負！）',
		],
		Component: ChinchiroGame,
	},
```

- [ ] **Step 5: CLAUDE.md を更新**

- 「MVPスコープ」セクション: `指差しヒートアップ` → `チンチロ` に置換
- 「収録ゲーム候補」リストの `• クロスダービー` の行の下に追加: `• チンチロ – 3個のサイコロを丼で振る伝統のサイコロ勝負。`

- [ ] **Step 6: 全テスト・型チェック・lint を実行**

Run: `npx jest src/games/chinchiro -i && npm test && npm run typecheck && npm run lint`
Expected: すべて PASS（registry.test.ts の「MVP の8ゲーム」テストが壊れていないこと。もし registry.test.ts が `pointing-heat-up` の id を直接参照していたら `chinchiro` に更新してよい — その場合はレポートに明記）

- [ ] **Step 7: コミット**

```bash
npx prettier --write src/games/chinchiro src/games/registry.ts CLAUDE.md
git add src/games/chinchiro src/games/registry.ts CLAUDE.md
git commit -m "feat: チンチロを registry に登録し指差しヒートアップと差し替え (#52)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: 最終検証

**Files:**

- なし（検証のみ）

- [ ] **Step 1: フルスイート・型チェック・フォーマット確認**

Run: `npm test && npm run typecheck && npm run lint && npx prettier --check src/games/chinchiro src/games/registry.ts src/components/game CLAUDE.md`
Expected: すべて PASS。差分が出たら `npx prettier --write` して追いコミット

- [ ] **Step 2: 受け入れ条件（Issue #52）の照合**

- 役判定・序列・敗者判定の純関数（境界値テスト付き）→ Task 1
- 転がり演出（Lottie スロット＋疑似3Dフォールバック）、アイソメSVG確定表示 → Task 2/3/4
- 計測ループ→ランキング→サドンデス → Task 5/6
- ションベン演出 → Task 4
- 遊び方モーダル文言（registry 置換）→ Task 6
- CLAUDE.md 更新 → Task 6

- [ ] **Step 3: プッシュ**

```bash
git push -u origin feature/52-chinchiro
```

PR 作成は superpowers:finishing-a-development-branch に従う（PR 本文に `Closes #52` を含め、末尾に `🤖 Generated with [Claude Code](https://claude.com/claude-code)`）。
