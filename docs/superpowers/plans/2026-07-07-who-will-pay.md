# WaiPa Who will pay 実装 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Issue #9 の Who will pay を参考デザイン4ステップ仕様で実装する。入力した合計金額を桁ごとにルーレットで担当者へ割り当て、各桁の位取り額をその人が払う会計ゲーム。

**Architecture:** ゲーム本体は状態機械 `'amount' → 'roulette' → 'result'`（`src/games/who-will-pay/` に集約）。会計配分ロジックは純粋関数（`payment.ts`）として TDD で固め、UI から切り離す。ルーレットは react-native-svg で人数分のプレイヤーカラー扇形を描き、Reanimated で目標角へ回転。既存の共通フレーム（GameScreen ヘッダー・PlayerSetupSheet・HowToPlayModal・haptics・sound・players-store）に乗る。

**Tech Stack:** Expo SDK 57 / react-native-svg（本ブランチで導入済み）/ react-native-reanimated / jest-expo / @testing-library/react-native v14。**追加の新規依存は禁止。**

## Global Constraints

- フォーマット: タブインデント幅4・セミコロンなし・シングルクォート（`.prettierrc` が正）
- 色は `@/theme/tokens` と `@/theme/player-colors`（`PLAYER_COLORS` / `playerColor(i)`）を使用。ゲーム専用の背景ティール等はこのゲームの定数ファイルに閉じ込める
- **RNTL v14: `render()` は async**（`await render(...)`）。jest.mock факторで `require()` を使う箇所は `// eslint-disable-next-line @typescript-eslint/no-require-imports`
- react-native-svg はテストで `jest.mock('react-native-svg', ...)` により View 互換スタブに差し替える（各コンポーネントテスト先頭で）
- ダークテーマ固定・UI 文言は日本語（タイトル「Who will pay?」は英字のまま）・アプリ名は「WaiPa」
- 各タスク完了時 `bun run test && bun run typecheck && bun run lint` がパス
- コミットは `feat:` プレフィックス＋日本語、末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: 会計配分ロジック（純粋関数）

**Files:**

- Create: `src/games/who-will-pay/payment.ts`
- Create: `src/games/who-will-pay/__tests__/payment.test.ts`

**Interfaces:**

- Produces:
    - `type DigitSlot = { index: number; char: string; place: number; value: number; playerIndex: number | null }`
    - `amountToSlots(amount: number): DigitSlot[]`（左＝上位から。value = 桁数字×位取り。playerIndex は初期 null）
    - `needsSpin(slot: DigitSlot): boolean`（char !== '0'）
    - `assignSlot(slots: DigitSlot[], index: number, playerIndex: number): DigitSlot[]`（不変更新）
    - `playerTotals(slots: DigitSlot[], playerCount: number): number[]`（各人の支払額。合計＝入力額）
    - `pickPlayerIndex(playerCount: number): number`（0..playerCount-1 の均等乱数）

- [ ] **Step 1: 失敗するテストを書く**

`src/games/who-will-pay/__tests__/payment.test.ts`:

```ts
import { amountToSlots, assignSlot, needsSpin, playerTotals } from '../payment'

describe('amountToSlots', () => {
	it('124 を位取り付きスロットに分解する', () => {
		const slots = amountToSlots(124)
		expect(slots.map((s) => s.char)).toEqual(['1', '2', '4'])
		expect(slots.map((s) => s.place)).toEqual([100, 10, 1])
		expect(slots.map((s) => s.value)).toEqual([100, 20, 4])
		expect(slots.every((s) => s.playerIndex === null)).toBe(true)
	})

	it('0 の桁は value 0 を持つ', () => {
		const slots = amountToSlots(120)
		expect(slots.map((s) => s.value)).toEqual([100, 20, 0])
	})
})

describe('needsSpin', () => {
	it('0 の桁はスピン不要', () => {
		const [hundred, , zero] = amountToSlots(120)
		expect(needsSpin(hundred)).toBe(true)
		expect(needsSpin(zero)).toBe(false)
	})
})

describe('assignSlot / playerTotals', () => {
	it('割り当てた桁の位取り額を担当者に加算し、合計が入力額に一致する', () => {
		let slots = amountToSlots(124) // 100 / 20 / 4
		slots = assignSlot(slots, 0, 0) // 百の位 → プレイヤー0
		slots = assignSlot(slots, 1, 0) // 十の位 → プレイヤー0
		slots = assignSlot(slots, 2, 1) // 一の位 → プレイヤー1
		const totals = playerTotals(slots, 2)
		expect(totals).toEqual([120, 4])
		expect(totals.reduce((a, b) => a + b, 0)).toBe(124)
	})

	it('未割り当て・0桁は誰にも加算されない', () => {
		const slots = amountToSlots(120)
		expect(playerTotals(slots, 3)).toEqual([0, 0, 0])
	})
})
```

- [ ] **Step 2: 落ちることを確認** → `bun run test src/games/who-will-pay` → FAIL

- [ ] **Step 3: payment.ts を実装**

```ts
export type DigitSlot = {
	index: number
	char: string
	place: number
	value: number
	playerIndex: number | null
}

// 合計金額を左（上位桁）から位取り付きスロットに分解する
export function amountToSlots(amount: number): DigitSlot[] {
	const digits = Math.max(0, Math.floor(amount)).toString().split('')
	const n = digits.length
	return digits.map((char, i) => {
		const place = 10 ** (n - 1 - i)
		return { index: i, char, place, value: Number(char) * place, playerIndex: null }
	})
}

// 0 の桁は支払額0なのでスピン不要
export function needsSpin(slot: DigitSlot): boolean {
	return slot.char !== '0'
}

export function assignSlot(slots: DigitSlot[], index: number, playerIndex: number): DigitSlot[] {
	return slots.map((s) => (s.index === index ? { ...s, playerIndex } : s))
}

// 各プレイヤーの支払額（担当桁の位取り額の総和）
export function playerTotals(slots: DigitSlot[], playerCount: number): number[] {
	const totals = new Array(playerCount).fill(0)
	for (const s of slots) {
		if (s.playerIndex !== null && s.playerIndex >= 0 && s.playerIndex < playerCount) {
			totals[s.playerIndex] += s.value
		}
	}
	return totals
}

// 均等乱数で担当プレイヤーを選ぶ
export function pickPlayerIndex(playerCount: number): number {
	return Math.floor(Math.random() * playerCount)
}
```

- [ ] **Step 4: PASS 確認** → `bun run test src/games/who-will-pay`
- [ ] **Step 5: typecheck / lint / commit** → `feat: Who will pay の会計配分ロジックを追加 (#9)`

---

### Task 2: ルーレット盤（SVG）＋スピン角ロジック

**Files:**

- Create: `src/games/who-will-pay/theme.ts`（背景ティール等ゲーム専用定数）
- Create: `src/games/who-will-pay/spin.ts`（スピン目標角の純粋関数）
- Create: `src/games/who-will-pay/roulette-wheel.tsx`
- Create: `src/games/who-will-pay/__tests__/spin.test.ts`

**Interfaces:**

- Produces:
    - `theme.ts`: `export const WWP = { bg: '#0F3D3A', rim: '#B4894F', pointer: '#8C6239', go: '#FF3DE0' } as const`
    - `spin.ts`: `finalAngleForPlayer(playerIndex: number, playerCount: number, turns?: number): number`（度。ポインタは真上(12時)。適用後の最終角 mod 360 が対象セクター弧内に入る）、`sectorForAngle(angle: number, playerCount: number): number`（真上ポインタが指すセクター index。逆関数・検証用）
    - `roulette-wheel.tsx`: `<RouletteWheel playerColors={string[]} rotation={SharedValue<number>} size={number} />`（人数分の均等扇形をプレイヤーカラーで描画、上部にポインタ、中央ハブ。`rotation` に従って回転。表示専用・テスト対象外）

- [ ] **Step 1: spin の失敗するテストを書く**

`src/games/who-will-pay/__tests__/spin.test.ts`:

```ts
import { finalAngleForPlayer, sectorForAngle } from '../spin'

describe('スピン角ロジック', () => {
	it('finalAngle を適用するとポインタが対象セクターを指す', () => {
		for (const count of [2, 3, 5, 8]) {
			for (let target = 0; target < count; target++) {
				const angle = finalAngleForPlayer(target, count, 5)
				expect(sectorForAngle(angle, count)).toBe(target)
			}
		}
	})

	it('turns 分の全回転を含む（角度が 360*turns 以上）', () => {
		expect(finalAngleForPlayer(0, 4, 5)).toBeGreaterThanOrEqual(360 * 5)
	})
})
```

- [ ] **Step 2: 落ちることを確認** → FAIL

- [ ] **Step 3: spin.ts を実装**

```ts
// ポインタは真上(12時)固定。セクター i は時計回りに i*sector 〜 (i+1)*sector を占め、
// 中心は (i+0.5)*sector。盤を rotation 度（時計回り）回すと、真上には
// 「元の角 -rotation」の位置が来る。対象セクター中心を真上へ運ぶ回転量を求める。
export function finalAngleForPlayer(playerIndex: number, playerCount: number, turns = 5): number {
	const sector = 360 / playerCount
	const center = (playerIndex + 0.5) * sector
	// 中心角 center を真上(0)へ: rotation ≡ -center (mod 360)。正の全回転を足す。
	const base = (360 - (center % 360)) % 360
	return turns * 360 + base
}

// 真上ポインタが指すセクター index（finalAngle の逆算・検証用）
export function sectorForAngle(angle: number, playerCount: number): number {
	const sector = 360 / playerCount
	// 盤を angle 回した後、真上に来る元の角度 = (-angle) mod 360
	const atTop = ((-angle % 360) + 360) % 360
	return Math.floor(atTop / sector) % playerCount
}
```

- [ ] **Step 4: PASS 確認**

- [ ] **Step 5: roulette-wheel.tsx を実装（表示専用）**

react-native-svg で `playerColors.length` 個の扇形を `Path`（円弧）で描画。上部に木製ポインタ（三角）、中央ハブ（円）。`Animated`（reanimated）で親から渡る `rotation` SharedValue を `rotateZ` に適用。実装ガイド:

```tsx
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, G, Path, Polygon } from 'react-native-svg'
import { WWP } from './theme'

type Props = {
	playerColors: string[]
	rotation: SharedValue<number>
	size: number
}

function sectorPath(cx: number, cy: number, r: number, start: number, end: number): string {
	const toXY = (deg: number) => {
		const rad = ((deg - 90) * Math.PI) / 180 // 真上を0に
		return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
	}
	const [x1, y1] = toXY(start)
	const [x2, y2] = toXY(end)
	const large = end - start > 180 ? 1 : 0
	return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

export function RouletteWheel({ playerColors, rotation, size }: Props) {
	const r = size / 2
	const sector = 360 / playerColors.length
	const style = useAnimatedStyle(() => ({ transform: [{ rotateZ: `${rotation.value}deg` }] }))

	return (
		<View style={{ width: size, height: size, alignItems: 'center' }}>
			<Animated.View style={[StyleSheet.absoluteFill, style]}>
				<Svg width={size} height={size}>
					<G>
						{playerColors.map((color, i) => (
							<Path
								key={i}
								d={sectorPath(r, r, r - 6, i * sector, (i + 1) * sector)}
								fill={color}
								stroke={WWP.bg}
								strokeWidth={2}
							/>
						))}
						<Circle
							cx={r}
							cy={r}
							r={r - 4}
							fill="none"
							stroke={WWP.rim}
							strokeWidth={8}
						/>
						<Circle cx={r} cy={r} r={14} fill={WWP.pointer} />
					</G>
				</Svg>
			</Animated.View>
			{/* 上部固定ポインタ */}
			<Svg width={24} height={20} style={{ position: 'absolute', top: -4 }}>
				<Polygon points="12,20 0,0 24,0" fill={WWP.pointer} />
			</Svg>
		</View>
	)
}
```

（数値は実装時に調整可。要点: セクターはプレイヤーカラー、真上ポインタ固定、`rotation` で回る）

- [ ] **Step 6: typecheck / lint / commit** → `feat: Who will pay のルーレット盤とスピン角ロジックを追加 (#9)`

---

### Task 3: 金額入力画面（テンキー）

**Files:**

- Create: `src/games/who-will-pay/amount-entry.tsx`
- Create: `src/games/who-will-pay/__tests__/amount-entry.test.tsx`

**Interfaces:**

- Consumes: トークン、`haptics.tap`
- Produces: `<AmountEntry onConfirm={(amount: number) => void} />`（テンキーで金額入力、¥表示、JPYバッジ、確定ボタン。0や空は確定不可）

- [ ] **Step 1: 失敗するテストを書く**

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import { AmountEntry } from '../amount-entry'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))

it('テンキー入力で金額が組み立てられる', async () => {
	const { getByText } = await render(<AmountEntry onConfirm={jest.fn()} />)
	fireEvent.press(getByText('1'))
	fireEvent.press(getByText('2'))
	fireEvent.press(getByText('4'))
	expect(getByText('¥124')).toBeTruthy()
})

it('0のときは確定しても onConfirm を呼ばない', async () => {
	const onConfirm = jest.fn()
	const { getByText } = await render(<AmountEntry onConfirm={onConfirm} />)
	fireEvent.press(getByText('確定'))
	expect(onConfirm).not.toHaveBeenCalled()
})

it('金額入力後の確定で onConfirm(124) が呼ばれる', async () => {
	const onConfirm = jest.fn()
	const { getByText } = await render(<AmountEntry onConfirm={onConfirm} />)
	fireEvent.press(getByText('1'))
	fireEvent.press(getByText('2'))
	fireEvent.press(getByText('4'))
	fireEvent.press(getByText('確定'))
	expect(onConfirm).toHaveBeenCalledWith(124)
})
```

- [ ] **Step 2: 落ちることを確認** → FAIL

- [ ] **Step 3: amount-entry.tsx を実装**

要点（デザイン STEP2 準拠）:

- ヘッダー下に「お会計の金額」＋通貨バッジ「🇯🇵 JPY / ¥」（MVP は表示のみ・タップ無効）
- 中央に `¥{金額をカンマ区切り}`（0 のときは `¥0`）
- 3×4 テンキー（1-9 / `.`（無効 or 非表示）/ 0 / ⌫）＋「確定」ボタン
- 内部 state は数値文字列。各キーで append、⌫ で末尾削除。上限桁数（例 7桁=¥9,999,999）
- 「確定」: `Number(value) > 0` のときのみ `onConfirm(Number(value))`。0/空は無反応（haptics のみ）
- 表示テキストは `¥${n.toLocaleString('ja-JP')}`（テストは `¥124` を期待 → 3桁はカンマ無し）

- [ ] **Step 4: PASS / typecheck / lint / commit** → `feat: Who will pay の金額入力画面を追加 (#9)`

---

### Task 4: ルーレット進行（桁ごとスピンの状態機械）

**Files:**

- Create: `src/games/who-will-pay/use-digit-roulette.ts`
- Create: `src/games/who-will-pay/roulette-play.tsx`
- Create: `src/games/who-will-pay/__tests__/use-digit-roulette.test.ts`

**Interfaces:**

- Consumes: Task 1（payment）、Task 2（spin, wheel）、`haptics`、`playSound`
- Produces:
    - `useDigitRoulette(amount, playerCount)`: `{ slots, currentIndex, isSpinning, allDone, spin(): void }`
        - `currentIndex`: 次にスピンする「非0」桁の index（allDone なら null）
        - `spin()`: 現在桁の担当を `pickPlayerIndex` で決め、対象角までの回転を開始→終了時に `assignSlot`。0桁は自動スキップ。全桁確定で `allDone=true`。reveal 時 `haptics.heavy()`＋`playSound('reveal')`
    - `<RoulettePlay amount playerColors playerNames onFinish={(slots) => void} />`（金額表示・点滅桁・確定桁カラー＋名前・GO! ボタン・盤。全桁確定で `onFinish`）

- [ ] **Step 1: フックの失敗するテストを書く（fake timers）**

```ts
import { act, renderHook } from '@testing-library/react-native'
import { useDigitRoulette } from '../use-digit-roulette'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))
jest.useFakeTimers()

it('0桁を飛ばして非0桁だけスピンし、全桁確定で allDone になる', async () => {
	const { result } = await renderHook(() => useDigitRoulette(120, 3)) // 桁: 1,2,0（0はスキップ）
	expect(result.current.currentIndex).toBe(0)
	act(() => result.current.spin())
	act(() => jest.advanceTimersByTime(4000))
	expect(result.current.currentIndex).toBe(1)
	act(() => result.current.spin())
	act(() => jest.advanceTimersByTime(4000))
	expect(result.current.allDone).toBe(true) // index2 は '0' なのでスキップ
	const assigned = result.current.slots.filter((s) => s.playerIndex !== null)
	expect(assigned).toHaveLength(2)
})
```

- [ ] **Step 2: 落ちることを確認** → FAIL

- [ ] **Step 3: use-digit-roulette.ts を実装**

要点:

- 初期 `slots = amountToSlots(amount)`、`currentIndex = 最初の needsSpin の index`
- `spin()`: `isSpinning=true` → `const p = pickPlayerIndex(playerCount)` → reanimated の rotation を `finalAngleForPlayer(p,...)` へ `withTiming`（約3.5秒 easing out）→ 完了で `slots=assignSlot(...)`, `haptics.heavy()`, `playSound('reveal')`, 次の needsSpin 桁へ `currentIndex` 更新（無ければ `allDone=true`）、`isSpinning=false`
- rotation SharedValue は accumulate（毎回 `+finalAngle`）。sectorForAngle は絶対角に対して mod で効くので加算でも整合（テストは spin.ts 側で担保、フックは slots 遷移を担保）
- `playSound('spin')` を開始時に（無音 no-op でOK）

- [ ] **Step 4: roulette-play.tsx を実装（表示専用）**

要点（デザイン STEP3 準拠）:

- 上部「Who will pay?」＋金額行: 各桁を `<Text>`。未確定=淡色、`currentIndex` かつ `isSpinning`=点滅（Reanimated opacity ループ）、確定=担当者カラー＋桁の上に小さく名前
- 中央〜下: `<RouletteWheel playerColors rotation size>`、下に発光ピンク「GO!」丸ボタン（`spin()` 呼び出し、`isSpinning` 中は無効）
- 全桁確定（`allDone`）で `onFinish(slots)` を呼ぶ（useEffect）

- [ ] **Step 5: PASS / typecheck / lint / commit** → `feat: Who will pay の桁ルーレット進行を追加 (#9)`

---

### Task 5: リザルト＋ゲーム統合＋レジストリ差し替え

**Files:**

- Create: `src/games/who-will-pay/result.tsx`
- Create: `src/games/who-will-pay/who-will-pay-game.tsx`
- Modify: `src/games/registry.ts`（`who-will-pay` の Component 差し替え・maxPlayers 8・howToPlay 4ステップ）
- Create: `src/games/who-will-pay/__tests__/who-will-pay-game.test.tsx`

**Interfaces:**

- Consumes: Task 1〜4 全部、`usePlayers`/`getDisplayNames`、`playerColor`、`GradientButton`/`PillButton`、`router`
- Produces: `<WhoWillPayGame />`（状態機械 amount→roulette→result）、`<Result slots playerNames onRetry onHome />`

- [ ] **Step 1: 統合テストを書く**

```tsx
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { playersStore } from '@/lib/players-store'
import { WhoWillPayGame } from '../who-will-pay-game'

// async-storage / expo-haptics / expo-router / react-native-svg をモック（先頭で）
// … 既存パターン踏襲。react-native-svg は View 互換スタブに。

beforeEach(async () => {
	await AsyncStorage.clear()
	await playersStore.hydrate()
	await playersStore.setCount(2)
})

it('金額入力→確定でルーレット画面へ進む', async () => {
	const { getByText } = await render(<WhoWillPayGame />)
	fireEvent.press(getByText('1'))
	fireEvent.press(getByText('2'))
	fireEvent.press(getByText('4'))
	fireEvent.press(getByText('確定'))
	await waitFor(() => expect(getByText('GO!')).toBeTruthy())
})
```

（スピンの非同期 reanimated 完了までは統合テストで追わない。amount→roulette 遷移までを担保）

- [ ] **Step 2: result.tsx を実装**

デザイン STEP4 準拠: 「Who will pay?」＋全桁を担当者カラーで色分け（桁の上に名前小字）、下に各人の支払額サマリ（`playerTotals`）、「もう一度」（GradientButton）/「ホームへ」（PillButton）。`ResultOverlay` を使わず全画面で（背景ティール継続）でも可。

- [ ] **Step 3: who-will-pay-game.tsx を実装**

```tsx
// 状態機械: 'amount' | 'roulette' | 'result'
// amount: <AmountEntry onConfirm={(a) => { setAmount(a); setPhase('roulette') }} />
// roulette: <RoulettePlay amount playerColors playerNames onFinish={(s) => { setSlots(s); setPhase('result') }} />
// result: <Result slots playerNames onRetry={() => setPhase('amount')} onHome={() => router.replace('/')} />
// players は usePlayers()+getDisplayNames、色は playerColor(i)。count>8 は先頭8名にクランプ。
// 全体を WWP.bg 背景の View で覆う（GameScreen body 内に収まる）
```

- [ ] **Step 4: registry.ts を差し替え**

`who-will-pay` エントリ:

- `Component: WhoWillPayGame`（`import { WhoWillPayGame } from './who-will-pay/who-will-pay-game'`）
- `maxPlayers: 8`
- `howToPlay`: 4ステップ文言

    ```
    ['① 一緒に遊ぶメンバーを登録しよう！（2〜8名、各自に色がつきます）',
     '② お会計の合計金額を入力しよう！',
     '③ 「GO!」で桁ごとにルーレットを回そう！（点滅中の桁が対象）',
     '④ 各桁の色と名前の人が、その桁の金額を支払おう！']
    ```

- [ ] **Step 5: 全検証**

```bash
bun run test && bun run typecheck && bun run lint && bunx prettier --check .
bunx expo export --platform web && rm -rf dist
```

react-native-svg のテスト差し替えが必要なら各テスト先頭で:

```ts
jest.mock('react-native-svg', () => {
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: View,
		Svg: View,
		G: View,
		Path: View,
		Circle: View,
		Polygon: View,
	}
})
```

- [ ] **Step 6: commit** → `feat: Who will pay を完成しレジストリに接続 (#9)`

---

## Self-Review 済みチェック

- Issue #9 受け入れ条件との対応: 金額入力=Task3 / SVGルーレット+GO=Task2 / スピンアニメ+担当確定=Task2+4 / 桁ごと順次+点滅+0スキップ=Task1+4 / リザルト整合=Task1+Task5 / 遊び方4ステップ+maxPlayers8+Component差し替え=Task5
- 配分の正しさ（合計＝入力額）は Task1 の純粋関数でテスト担保。スピンの当選整合は Task2 の `finalAngle↔sector` 往復テストで担保
- react-native-svg・reanimated の表示部品はテスト対象外（フック/純粋関数側でロジックを担保）
- 8人上限: registry.maxPlayers=8＋ゲーム側で `count>8` を先頭8にクランプ（stored count が他ゲームで8超のケースを保険）
- 依存: react-native-svg は導入済み。追加依存なし
