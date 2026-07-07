# ルーレット盤の細分割 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Who will pay のルーレット盤を、各プレイヤーの色を盤周に複数回くり返した「細かい多分割」表示に変える（当選挙動は不変）。

**Architecture:** 分割数を決める純粋関数 `wheelRepeats(playerCount)` を `spin.ts` に追加し、これを盤の描画（`roulette-wheel.tsx`）と停止角の計算（`use-digit-roulette.ts`）の**単一の真実**として両方から参照する。当選プレイヤーの決定は現状の `pickPlayerIndex` のまま。変更は「盤を何分割で描くか」と「当選プレイヤーが持つ複数セグメントのどれで止めるか」だけ。

**Tech Stack:** Expo SDK 57 / react-native-svg / react-native-reanimated / jest-expo / @testing-library/react-native v14。**追加の新規依存は禁止。**

## Global Constraints

- フォーマット: タブインデント幅4・セミコロンなし・シングルクォート（`.prettierrc` が正）
- 色は `@/theme/tokens` と `@/theme/player-colors`（`playerColor(i)` / `PLAYER_COLORS`）。ゲーム専用色は `./theme` の `WWP`
- **RNTL v14: `render()` / `renderHook()` は async**（`await render(...)`）
- react-native-svg はコンポーネントテスト先頭で View 互換スタブに差し替える（本計画では新規コンポーネントテストは追加しない）
- ダークテーマ固定・UI 文言は日本語（タイトル「Who will pay?」は英字のまま）・アプリ名は「WaiPa」
- 各タスク完了時 `bun run test && bun run typecheck && bun run lint` がパス。最終タスクで `bunx prettier --check .` と `bunx expo export --platform web` も通す
- コミットは `feat:` プレフィックス＋日本語、末尾に `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

## 設計上の不変条件

- `finalAngleForPlayer(index, count)` は `center = (index + 0.5) * (360/count)`（セグメント**中心**）を真上へ運ぶ。よってポインタは常にセグメント中心で止まり、**区切り線の真上には構造上止まらない**。細分割後もこの性質を維持する。
- 盤の描画と停止角がともに `wheelRepeats(playerCount)` を参照するため、描かれた色と止まる位置がズレない。

---

### Task 1: 分割数の純粋関数 `wheelRepeats` ＋整合性テスト

**Files:**

- Modify: `src/games/who-will-pay/spin.ts`（既存の `finalAngleForPlayer` / `sectorForAngle` は不変。定数と関数を追加）
- Test: `src/games/who-will-pay/__tests__/spin.test.ts`（既存2テストは不変。describe を追加）

**Interfaces:**

- Consumes: 既存 `finalAngleForPlayer(playerIndex, playerCount, turns?)`, `sectorForAngle(angle, playerCount)`
- Produces:
    - `WHEEL_TARGET_SEGMENTS: number`（= 18）
    - `wheelRepeats(playerCount: number): number`（各色のくり返し回数。`max(2, round(18/playerCount))`）

- [ ] **Step 1: 失敗するテストを追加**

`src/games/who-will-pay/__tests__/spin.test.ts` の import 行を差し替え、末尾に describe を2つ追加する。

import 行（1行目）を次に変更:

```ts
import { finalAngleForPlayer, sectorForAngle, wheelRepeats } from '../spin'
```

ファイル末尾（既存 describe の後ろ）に追加:

```ts
describe('wheelRepeats', () => {
	it('各色を最低2回くり返す', () => {
		for (let count = 2; count <= 8; count++) {
			expect(wheelRepeats(count)).toBeGreaterThanOrEqual(2)
		}
	})

	it('総セグメント数が概ね 16〜21 に収まる', () => {
		for (let count = 2; count <= 8; count++) {
			const total = count * wheelRepeats(count)
			expect(total).toBeGreaterThanOrEqual(16)
			expect(total).toBeLessThanOrEqual(21)
		}
	})
})

describe('細分割盤の当選色整合性', () => {
	it('当選プレイヤーの各セグメントで止めると、その色（=プレイヤー）を指す', () => {
		for (const count of [2, 3, 4, 5, 6, 8]) {
			const repeats = wheelRepeats(count)
			const total = count * repeats
			for (let p = 0; p < count; p++) {
				for (let k = 0; k < repeats; k++) {
					const segment = p + count * k
					const angle = finalAngleForPlayer(segment, total, 5)
					expect(sectorForAngle(angle, total) % count).toBe(p)
				}
			}
		}
	})
})
```

- [ ] **Step 2: 落ちることを確認**

Run: `bun run test src/games/who-will-pay/__tests__/spin.test.ts`
Expected: FAIL（`wheelRepeats` が未定義 → `wheelRepeats is not a function` / import エラー）

- [ ] **Step 3: `spin.ts` に実装を追加**

`src/games/who-will-pay/spin.ts` の末尾（`sectorForAngle` の後）に追加:

```ts
// 盤の細分割: 各プレイヤーの色を何回くり返して並べるか（最低2回）。
// 目標総数 18 を人数で割って丸める。描画（roulette-wheel）と停止角
// （use-digit-roulette）の両方がこの関数を単一の真実として参照する。
export const WHEEL_TARGET_SEGMENTS = 18

export function wheelRepeats(playerCount: number): number {
	return Math.max(2, Math.round(WHEEL_TARGET_SEGMENTS / playerCount))
}
```

- [ ] **Step 4: PASS 確認**

Run: `bun run test src/games/who-will-pay/__tests__/spin.test.ts`
Expected: PASS（既存2テスト＋新規3テスト）

- [ ] **Step 5: typecheck / lint / commit**

Run: `bun run typecheck && bun run lint`
Expected: エラーなし

```bash
git add src/games/who-will-pay/spin.ts src/games/who-will-pay/__tests__/spin.test.ts
git commit -m "feat: ルーレット盤の分割数ロジック wheelRepeats を追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 盤の描画を総セグメント数ベースに（表示専用）

**Files:**

- Modify: `src/games/who-will-pay/roulette-wheel.tsx`

**Interfaces:**

- Consumes: Task 1 の `wheelRepeats(playerCount)`、既存 `WWP`（theme）
- Produces: `<RouletteWheel playerColors={string[]} rotation={SharedValue<number>} size={number} />`（Props 不変。描画のみ変更）

表示専用コンポーネントのため単体テストは追加しない（既存方針踏襲）。検証は typecheck / lint / expo export で行う（Task 3 の Step 5 でまとめて実施）。

- [ ] **Step 1: `roulette-wheel.tsx` を差し替え**

ファイル全体を次に置き換える（変更点: `spin` から `wheelRepeats` を import、セクター数を `total` に、色を `playerColors[i % playerColors.length]` に、描画ループを `Array.from({ length: total })` に）:

```tsx
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, G, Path, Polygon } from 'react-native-svg'
import { WWP } from './theme'
import { wheelRepeats } from './spin'

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
	const total = playerColors.length * wheelRepeats(playerColors.length)
	const sector = 360 / total
	const style = useAnimatedStyle(() => ({ transform: [{ rotateZ: `${rotation.value}deg` }] }))

	return (
		<View style={{ width: size, height: size, alignItems: 'center' }}>
			<Animated.View style={[StyleSheet.absoluteFill, style]}>
				<Svg width={size} height={size}>
					<G>
						{Array.from({ length: total }, (_, i) => (
							<Path
								key={i}
								d={sectorPath(r, r, r - 6, i * sector, (i + 1) * sector)}
								fill={playerColors[i % playerColors.length]}
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

- [ ] **Step 2: typecheck / lint 確認**

Run: `bun run typecheck && bun run lint`
Expected: エラーなし

- [ ] **Step 3: commit**

```bash
git add src/games/who-will-pay/roulette-wheel.tsx
git commit -m "feat: ルーレット盤を細分割して描画（色を周回くり返し）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 停止角を当選プレイヤーのセグメント選択ベースに

**Files:**

- Modify: `src/games/who-will-pay/use-digit-roulette.ts`（`pending` を処理する `useEffect` 内の回転計算のみ）

**Interfaces:**

- Consumes: Task 1 の `wheelRepeats(playerCount)`、既存 `finalAngleForPlayer`、既存 `pickPlayerIndex`
- Produces: 変更なし（`useDigitRoulette(amount, playerCount)` の返り値・当選挙動は不変）

- [ ] **Step 1: import に `wheelRepeats` を追加**

`src/games/who-will-pay/use-digit-roulette.ts` の6行目を次に変更:

変更前:

```ts
import { finalAngleForPlayer } from './spin'
```

変更後:

```ts
import { finalAngleForPlayer, wheelRepeats } from './spin'
```

- [ ] **Step 2: `pending` effect の回転計算をセグメント選択に変更**

`pending` を処理する `useEffect` 内の先頭（`const { targetIndex, playerIndex } = pending` の直後、`rotation.value = withTiming(...)` の呼び出し）を次のように変更する。

変更前:

```ts
const { targetIndex, playerIndex } = pending
rotation.value = withTiming(rotation.value + finalAngleForPlayer(playerIndex, playerCount), {
	duration: SPIN_DURATION,
	easing: Easing.out(Easing.cubic),
})
```

変更後:

```ts
const { targetIndex, playerIndex } = pending
// 当選プレイヤーが盤上に持つ repeats 個のセグメント（playerIndex, +playerCount, ...）
// から1つをランダムに選び、その中心で止める。描画と同じ wheelRepeats を参照。
const repeats = wheelRepeats(playerCount)
const total = playerCount * repeats
const segment = playerIndex + playerCount * Math.floor(Math.random() * repeats)
rotation.value = withTiming(rotation.value + finalAngleForPlayer(segment, total), {
	duration: SPIN_DURATION,
	easing: Easing.out(Easing.cubic),
})
```

（`timerRef.current = setTimeout(...)` 以降の reveal 処理は不変。スロットへの担当割当は従来どおり `playerIndex` = 当選プレイヤー。）

- [ ] **Step 3: 既存フックテストが通ることを確認（挙動不変）**

Run: `bun run test src/games/who-will-pay/__tests__/use-digit-roulette.test.ts`
Expected: PASS（当選者は `pickPlayerIndex` のままで、スロット割当・`currentIndex`・`allDone` の遷移は不変）

- [ ] **Step 4: 全検証**

```bash
bun run test && bun run typecheck && bun run lint && bunx prettier --check .
bunx expo export --platform web && rm -rf dist
```

Expected: すべてパス（`expo export` は import 整合を担保）

- [ ] **Step 5: commit**

```bash
git add src/games/who-will-pay/use-digit-roulette.ts
git commit -m "feat: 当選プレイヤーの細セグメントで停止するよう回転角を調整

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 複数回スピンの回転ドリフトを解消（停止角を絶対角に）

**背景:** 最終レビューで既存バグを検出。`use-digit-roulette.ts` は `rotation.value + finalAngleForPlayer(...)` と絶対角を累積回転値に加算しているため、2回目以降のスピンで前回の残り角がオフセットになり、ポインタが当選者と違う色のセグメントで止まって見える（当選＝スロット割当は正しいが、見た目の停止位置がズレる）。金額に非0桁が2つ以上あると必ず再現する。Task 3 の整合性テストは回転0のケースしか検証できず、これを検知できない。本タスクで停止角を「現在角を基準に対象セグメント中心へ正確に着地する絶対角（毎回 turns 回転以上前進）」に変え、複数スピンの回帰テストで守る。

**Files:**

- Modify: `src/games/who-will-pay/spin.ts`（純粋関数 `nextAngleForSegment` を追加。既存関数は不変）
- Modify: `src/games/who-will-pay/use-digit-roulette.ts`（`pending` effect の回転計算を `nextAngleForSegment` 使用に変更、import 調整）
- Test: `src/games/who-will-pay/__tests__/spin.test.ts`（複数スピンの回帰テストを追加）

**Interfaces:**

- Consumes: 既存 `finalAngleForPlayer(index, count, turns?)`, `sectorForAngle(angle, count)`, `wheelRepeats(playerCount)`
- Produces:
    - `nextAngleForSegment(current: number, segmentIndex: number, segmentCount: number, turns?: number): number`（現在角 `current` から、対象セグメント中心を真上へ運ぶ絶対目標角を返す。結果 `mod 360` はセグメント中心に一致し、`current` より常に `turns` 回転以上大きい＝累積ドリフトなし）

- [ ] **Step 1: 失敗するテストを追加**

`src/games/who-will-pay/__tests__/spin.test.ts` の import 行を差し替え、末尾に describe を追加する。

import 行（1行目）を次に変更:

```ts
import { finalAngleForPlayer, nextAngleForSegment, sectorForAngle, wheelRepeats } from '../spin'
```

ファイル末尾に追加:

```ts
describe('nextAngleForSegment（複数スピンのドリフト非発生）', () => {
	it('累積回転しても毎回セグメント中心（=当選色）で止まる', () => {
		for (const count of [2, 3, 4, 5, 6, 8]) {
			const repeats = wheelRepeats(count)
			const total = count * repeats
			let current = 0
			// 連続する当選プレイヤー列を回し、毎回その色で止まることを確認
			for (const p of [0, 1, count - 1, 1, 0, count - 1]) {
				const segment = p + count * (1 % repeats)
				current = nextAngleForSegment(current, segment, total, 5)
				expect(sectorForAngle(current, total) % count).toBe(p)
			}
		}
	})

	it('各スピンで少なくとも turns 回転ぶん前進する', () => {
		const total = 3 * wheelRepeats(3)
		const prev = 1234 // 任意の累積角
		const next = nextAngleForSegment(prev, 1, total, 5)
		expect(next - prev).toBeGreaterThanOrEqual(360 * 5)
	})
})
```

- [ ] **Step 2: 落ちることを確認**

Run: `bun run test src/games/who-will-pay/__tests__/spin.test.ts`
Expected: FAIL（`nextAngleForSegment` 未定義）

- [ ] **Step 3: `spin.ts` に `nextAngleForSegment` を追加**

`src/games/who-will-pay/spin.ts` の末尾（`wheelRepeats` の後）に追加:

```ts
// 現在角 current から、対象セグメント中心を真上へ運ぶ「絶対」目標角を返す。
// finalAngleForPlayer を累積値に加算するとドリフトするため、毎回 current を基準に
// 「turns 回転ぶん前進 ＋ セグメント中心へ合わせる差分」で絶対角を作る。
// 結果 mod 360 はセグメント中心に一致し、current より常に turns 回転以上大きい。
export function nextAngleForSegment(
	current: number,
	segmentIndex: number,
	segmentCount: number,
	turns = 5,
): number {
	const base = finalAngleForPlayer(segmentIndex, segmentCount, 0) // 0..360 のセグメント中心角
	const delta = (((base - (current % 360)) % 360) + 360) % 360
	return current + turns * 360 + delta
}
```

- [ ] **Step 4: PASS 確認**

Run: `bun run test src/games/who-will-pay/__tests__/spin.test.ts`
Expected: PASS（既存＋新規すべて）

- [ ] **Step 5: `use-digit-roulette.ts` を `nextAngleForSegment` 使用に変更**

6行目の import を次に変更（`finalAngleForPlayer` はフックから直接使わなくなるので除去し、`nextAngleForSegment` を追加）:

変更前:

```ts
import { finalAngleForPlayer, wheelRepeats } from './spin'
```

変更後:

```ts
import { nextAngleForSegment, wheelRepeats } from './spin'
```

`pending` effect の回転計算を次に変更する。

変更前:

```ts
const repeats = wheelRepeats(playerCount)
const total = playerCount * repeats
const segment = playerIndex + playerCount * Math.floor(Math.random() * repeats)
rotation.value = withTiming(rotation.value + finalAngleForPlayer(segment, total), {
	duration: SPIN_DURATION,
	easing: Easing.out(Easing.cubic),
})
```

変更後:

```ts
const repeats = wheelRepeats(playerCount)
const total = playerCount * repeats
const segment = playerIndex + playerCount * Math.floor(Math.random() * repeats)
// 累積値に足すのではなく、現在角を基準に絶対目標角を作る（複数スピンでもズレない）
rotation.value = withTiming(nextAngleForSegment(rotation.value, segment, total), {
	duration: SPIN_DURATION,
	easing: Easing.out(Easing.cubic),
})
```

（`timerRef.current = setTimeout(...)` 以降の reveal 処理・スロット割当は不変。当選は従来どおり `playerIndex`。）

- [ ] **Step 6: 全検証**

```bash
bun run test && bun run typecheck && bun run lint && bunx prettier --check .
bunx expo export --platform web && rm -rf dist
```

Expected: すべてパス（既存フックテストも挙動不変で通過）

- [ ] **Step 7: commit**

```bash
git add src/games/who-will-pay/spin.ts src/games/who-will-pay/use-digit-roulette.ts src/games/who-will-pay/__tests__/spin.test.ts
git commit -m "fix: 複数回スピンの回転ドリフトを解消し停止色を当選者と一致させる (#9)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review 済みチェック

- スペック対応: 分割数 `wheelRepeats`=Task1 / 盤の細分割描画=Task2 / 停止角のセグメント選択=Task3 / 整合性テスト=Task1 / 当選挙動不変=Task3（既存テスト維持）/ 複数スピンのドリフト解消=Task4
- 型整合: `wheelRepeats(playerCount: number): number` を Task1 で定義し、Task2・Task3 が同一シグネチャで参照。Task4 で `nextAngleForSegment(current, segmentIndex, segmentCount, turns?)` を追加し、フックが `finalAngleForPlayer` 直呼びからこれに置き換え
- 境界: `finalAngleForPlayer` はセグメント中心を狙うため区切り線上に止まらない（不変条件）。Task4 後は複数スピンでも `mod 360` がセグメント中心に一致し、描かれた色＝当選者を保証
- 新規依存なし。`roulette-wheel.tsx` は表示専用のためテストなし（既存方針）
