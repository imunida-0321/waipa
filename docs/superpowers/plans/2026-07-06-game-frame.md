# WaiPa ゲーム共通フレーム Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 8ゲームが「ロジックと盤面だけ書けば済む」状態を作る（Issue #4）— ゲームレジストリ / プレイヤーストア（名前対応）/ ゲーム画面ルート / 遊び方モーダル / 演出部品キット。

**Architecture:** レジストリ（`src/games/registry.ts`）がゲームのメタ情報と画面コンポーネントを束ね、動的ルート `app/game/[id]` が共通レイアウト `GameScreen`（ヘッダー・遊び方モーダル・人数シート）で包んで表示する。リザルト演出は固定せず、`useDrumroll` / `DrumrollReveal` / `ResultOverlay` の**部品キット**として提供し各ゲームが組み合わせる（brainstorming 決定事項）。プレイヤーは番号ベース＋任意の名前（未入力は「N番」フォールバック）。ストアは settings-store と同型の useSyncExternalStore パターン。

**Tech Stack:** 既存依存のみ（Expo SDK 57 / expo-router / Reanimated / AsyncStorage / jest-expo / @testing-library/react-native v14）。**新規依存の追加は禁止。**

## Global Constraints

- フォーマット: タブインデント幅4・セミコロンなし・シングルクォート（`.prettierrc` が正）
- トークンは `@/theme/tokens` の `colors/spacing/radii/typography` を使う。生の色コードをコンポーネントに書かない（レジストリのゲームテーマ色のみ例外）
- **RNTL v14: `render()` / `renderHook()` は async** — テストは `async () => { const r = await render(...) }` 形式（`src/components/ui/__tests__/buttons.test.tsx` が既存パターン）
- テストの jest.mock ブロック（async-storage / expo-haptics）は既存テストからコピーして統一
- ダークテーマ固定・UI 文言は日本語
- 各タスク完了時 `bun run test && bun run typecheck && bun run lint` がパスすること
- コミットは `feat:`/`test:`/`chore:` プレフィックス＋日本語、末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: ゲームレジストリ＋ComingSoon プレースホルダー

**Files:**

- Create: `src/games/registry.ts`
- Create: `src/games/coming-soon.tsx`
- Create: `src/games/__tests__/registry.test.ts`
- Delete: `src/games/.gitkeep`

**Interfaces:**

- Produces: `GameMeta = { id: string; title: string; tagline: string; emoji: string; gradient: readonly [string, string]; minPlayers: number; maxPlayers: number; howToPlay: readonly string[]; Component: ComponentType }`、`games: readonly GameMeta[]`（8件）、`getGame(id: string): GameMeta | undefined`

- [ ] **Step 1: 失敗するテストを書く**

`src/games/__tests__/registry.test.ts`:

```ts
import { games, getGame } from '../registry'

describe('ゲームレジストリ', () => {
	it('MVP の8ゲームが登録されている', () => {
		expect(games).toHaveLength(8)
	})

	it('id が一意', () => {
		const ids = games.map((g) => g.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it('全ゲームにメタ情報が揃っている', () => {
		for (const g of games) {
			expect(g.title.length).toBeGreaterThan(0)
			expect(g.tagline.length).toBeGreaterThan(0)
			expect(g.emoji.length).toBeGreaterThan(0)
			expect(g.gradient).toHaveLength(2)
			expect(g.minPlayers).toBeGreaterThanOrEqual(2)
			expect(g.maxPlayers).toBeLessThanOrEqual(12)
			expect(g.minPlayers).toBeLessThanOrEqual(g.maxPlayers)
			expect(g.howToPlay.length).toBeGreaterThan(0)
			expect(g.Component).toBeDefined()
		}
	})

	it('getGame が id で引ける・不明 id は undefined', () => {
		expect(getGame('who-will-pay')?.title).toBe('Who will pay')
		expect(getGame('unknown')).toBeUndefined()
	})
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test src/games`
Expected: FAIL（`../registry` が存在しない）

- [ ] **Step 3: coming-soon.tsx を実装**

`src/games/coming-soon.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native'
import { spacing, typography } from '@/theme/tokens'

// ゲーム本体（#9〜#16）が実装されるまでの仮画面
export function ComingSoonGame() {
	return (
		<View style={styles.center}>
			<Text style={styles.emoji}>🚧</Text>
			<Text style={typography.title}>近日実装！</Text>
			<Text style={styles.caption}>このゲームは開発中です</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
	emoji: { fontSize: 64 },
	caption: { ...typography.caption },
})
```

- [ ] **Step 4: registry.ts を実装**

`src/games/registry.ts`:

```ts
import type { ComponentType } from 'react'
import { ComingSoonGame } from './coming-soon'

export type GameMeta = {
	id: string
	title: string
	tagline: string
	emoji: string
	gradient: readonly [string, string]
	minPlayers: number
	maxPlayers: number
	howToPlay: readonly string[]
	Component: ComponentType
}

// MVP 8ゲーム。Component は各ゲーム Issue (#9〜#16) で差し替える
export const games: readonly GameMeta[] = [
	{
		id: 'who-will-pay',
		title: 'Who will pay',
		tagline: '会計はルーレットで決めよう！',
		emoji: '💸',
		gradient: ['#E85BF7', '#7B5CFA'],
		minPlayers: 2,
		maxPlayers: 12,
		howToPlay: [
			'ルーレットを回して「支払う人」を決めます',
			'止まった番号の人が今日の会計！結果には逆らえません',
		],
		Component: ComingSoonGame,
	},
	{
		id: 'bomb-2-16',
		title: 'BOMB!! 2/16',
		tagline: '16個のボタンにハズレが2個！',
		emoji: '💣',
		gradient: ['#FF6B6B', '#C0392B'],
		minPlayers: 2,
		maxPlayers: 12,
		howToPlay: [
			'16個のボタンの中に爆弾が2つ隠れています',
			'順番にタップしていき、爆弾を引いた人が負け！',
			'「全員負け爆弾」を引いたら…全員アウト！',
		],
		Component: ComingSoonGame,
	},
	{
		id: 'five-sec-stop',
		title: '5秒STOP',
		tagline: '5秒ぴったりで止めろ！',
		emoji: '⏱️',
		gradient: ['#4ECDC4', '#2C7A7B'],
		minPlayers: 2,
		maxPlayers: 12,
		howToPlay: [
			'タイマーを 5.00 秒ぴったりを狙って止めます',
			'途中から数字は見えなくなります！',
			'一番ズレた人が負け',
		],
		Component: ComingSoonGame,
	},
	{
		id: 'kimagure-ox',
		title: 'きまぐれ◯×',
		tagline: '普通じゃない◯×ゲーム',
		emoji: '⭕',
		gradient: ['#F7B731', '#E67E22'],
		minPlayers: 2,
		maxPlayers: 2,
		howToPlay: [
			'普通の◯×ゲーム…と思いきや、ターンの合間に「きまぐれイベント」が発生！',
			'マスが入れ替わったり、駒が消えたり。最後に笑うのは誰だ',
		],
		Component: ComingSoonGame,
	},
	{
		id: 'no-king-game',
		title: '王様のいない王様ゲーム',
		tagline: 'お題も実行役もランダム！',
		emoji: '👑',
		gradient: ['#F1C40F', '#B7791F'],
		minPlayers: 3,
		maxPlayers: 12,
		howToPlay: [
			'全員に番号が配られます（自分の番号は内緒）',
			'お題と実行する番号がランダムで発表されます',
			'王様はいないので、誰も文句は言えません！',
		],
		Component: ComingSoonGame,
	},
	{
		id: 'pointing-heat-up',
		title: '指差しヒートアップ',
		tagline: 'せーので一斉に指差せ！',
		emoji: '👉',
		gradient: ['#FF9F43', '#EE5253'],
		minPlayers: 3,
		maxPlayers: 12,
		howToPlay: [
			'お題（例:「一番寝坊しそうな人」）が表示されます',
			'カウントダウンで全員一斉に「その人」を指差します',
			'一番指を差された人が負け！',
		],
		Component: ComingSoonGame,
	},
	{
		id: 'bomb-relay',
		title: 'カウントダウン爆弾リレー',
		tagline: '爆発した時に持ってた人が負け',
		emoji: '🧨',
		gradient: ['#A55EEA', '#8854D0'],
		minPlayers: 3,
		maxPlayers: 12,
		howToPlay: [
			'お題に答えたらスマホを次の人へ回します',
			'爆弾のタイマーはランダム。チクタク音が速くなってきたら…',
			'爆発した瞬間に持っていた人が負け！',
		],
		Component: ComingSoonGame,
	},
	{
		id: 'reaction-pairs',
		title: 'リアクション神経衰弱',
		tagline: 'ペアが揃ったら罰ゲーム!?',
		emoji: '🃏',
		gradient: ['#26DE81', '#20BF6B'],
		minPlayers: 2,
		maxPlayers: 12,
		howToPlay: [
			'みんなで順番にカードをめくる神経衰弱',
			'ペアが揃った瞬間、罰ゲーム対象者がルーレットで決定！',
			'ジョーカーを引いた人は即アウト',
		],
		Component: ComingSoonGame,
	},
]

export function getGame(id: string): GameMeta | undefined {
	return games.find((g) => g.id === id)
}
```

- [ ] **Step 5: .gitkeep を削除しテスト確認**

```bash
rm src/games/.gitkeep
bun run test src/games
```

Expected: PASS（4 tests）

- [ ] **Step 6: typecheck / lint / commit**

```bash
bun run typecheck && bun run lint
git add -A && git commit -m "feat: ゲームレジストリと8ゲームのメタ情報を追加 (#4)"
```

---

### Task 2: プレイヤーストア（人数＋名前、永続化）

**Files:**

- Create: `src/lib/players-store.ts`
- Create: `src/lib/__tests__/players-store.test.ts`

**Interfaces:**

- Consumes: なし（settings-store と同パターン）
- Produces: `playersStore.getState(): { count: number; names: string[] }`、`playersStore.setCount(n: number): Promise<void>`（2〜12にクランプ）、`playersStore.setName(index: number, name: string): Promise<void>`、`playersStore.subscribe/hydrate`、`usePlayers(): PlayersState`、`getDisplayNames(state: PlayersState): string[]`（未入力は `'N番'`）

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/__tests__/players-store.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDisplayNames, playersStore } from '../players-store'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

describe('playersStore', () => {
	beforeEach(async () => {
		await AsyncStorage.clear()
		await playersStore.hydrate()
	})

	it('初期値は4人・名前なし', () => {
		expect(playersStore.getState().count).toBe(4)
	})

	it('setCount は 2〜12 にクランプされる', async () => {
		await playersStore.setCount(1)
		expect(playersStore.getState().count).toBe(2)
		await playersStore.setCount(99)
		expect(playersStore.getState().count).toBe(12)
	})

	it('setName で名前を設定でき、AsyncStorage に永続化される', async () => {
		await playersStore.setName(0, 'ひろかず')
		expect(playersStore.getState().names[0]).toBe('ひろかず')
		expect(await AsyncStorage.getItem('waipa.players')).toContain('ひろかず')
	})

	it('getDisplayNames は未入力を「N番」で埋める', async () => {
		await playersStore.setCount(3)
		await playersStore.setName(1, 'たろう')
		expect(getDisplayNames(playersStore.getState())).toEqual(['1番', 'たろう', '3番'])
	})

	it('hydrate が保存済み状態を復元する', async () => {
		await AsyncStorage.setItem('waipa.players', JSON.stringify({ count: 6, names: ['A'] }))
		await playersStore.hydrate()
		expect(playersStore.getState().count).toBe(6)
		expect(playersStore.getState().names[0]).toBe('A')
	})
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test src/lib/__tests__/players-store.test.ts`
Expected: FAIL（`../players-store` が存在しない）

- [ ] **Step 3: players-store.ts を実装**

`src/lib/players-store.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'waipa.players'
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12

export type PlayersState = {
	count: number
	names: string[]
}

const DEFAULTS: PlayersState = { count: 4, names: [] }

let state: PlayersState = { ...DEFAULTS }
const listeners = new Set<() => void>()

function emit() {
	listeners.forEach((fn) => fn())
}

async function persist() {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const playersStore = {
	getState(): PlayersState {
		return state
	},
	subscribe(fn: () => void): () => void {
		listeners.add(fn)
		return () => listeners.delete(fn)
	},
	async hydrate() {
		const raw = await AsyncStorage.getItem(STORAGE_KEY)
		state = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
		emit()
	},
	async setCount(n: number) {
		const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.floor(n)))
		state = { ...state, count }
		emit()
		await persist()
	},
	async setName(index: number, name: string) {
		const names = [...state.names]
		names[index] = name
		state = { ...state, names }
		emit()
		await persist()
	},
}

export function usePlayers(): PlayersState {
	return useSyncExternalStore(
		playersStore.subscribe,
		playersStore.getState,
		playersStore.getState,
	)
}

// 未入力の参加者は「N番」表記にフォールバック
export function getDisplayNames(s: PlayersState): string[] {
	return Array.from({ length: s.count }, (_, i) => {
		const name = s.names[i]?.trim()
		return name ? name : `${i + 1}番`
	})
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `bun run test src/lib`
Expected: PASS（players 5 + settings 4 + haptics 2）

- [ ] **Step 5: typecheck / lint / commit**

```bash
bun run typecheck && bun run lint
git add -A && git commit -m "feat: プレイヤーストア（人数・名前の永続化）を追加 (#4)"
```

---

### Task 3: 遊び方モーダル

**Files:**

- Create: `src/components/game/how-to-play-modal.tsx`
- Create: `src/components/game/__tests__/how-to-play-modal.test.tsx`

**Interfaces:**

- Consumes: `colors/spacing/radii/typography`、`GradientButton`
- Produces: `<HowToPlayModal visible title pages onClose />`（pages: readonly string[]、1要素=1ページ、ドット＋次へ/はじめる）

- [ ] **Step 1: 失敗するテストを書く**

`src/components/game/__tests__/how-to-play-modal.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import { HowToPlayModal } from '../how-to-play-modal'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))

const pages = ['ページ1の説明', 'ページ2の説明'] as const

it('最初のページが表示される', async () => {
	const { getByText, queryByText } = await render(
		<HowToPlayModal visible title="テストゲーム" pages={pages} onClose={jest.fn()} />,
	)
	expect(getByText('ページ1の説明')).toBeTruthy()
	expect(queryByText('ページ2の説明')).toBeNull()
})

it('「次へ」で2ページ目、最終ページの「はじめる」で onClose', async () => {
	const onClose = jest.fn()
	const { getByText } = await render(
		<HowToPlayModal visible title="テストゲーム" pages={pages} onClose={onClose} />,
	)
	fireEvent.press(getByText('次へ'))
	expect(getByText('ページ2の説明')).toBeTruthy()
	fireEvent.press(getByText('はじめる'))
	expect(onClose).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test src/components/game`
Expected: FAIL（コンポーネントが存在しない）

- [ ] **Step 3: how-to-play-modal.tsx を実装**

`src/components/game/how-to-play-modal.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Modal, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	visible: boolean
	title: string
	pages: readonly string[]
	onClose: () => void
}

// 全ゲーム共通の遊び方解説モーダル。初回は自動表示、ヘッダー「？」で随時表示
export function HowToPlayModal({ visible, title, pages, onClose }: Props) {
	const [page, setPage] = useState(0)
	const isLast = page >= pages.length - 1

	useEffect(() => {
		if (visible) setPage(0)
	}, [visible])

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.backdrop}>
				<View style={styles.card}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.howto}>あそびかた</Text>
					<Text style={styles.body}>{pages[page]}</Text>
					<View style={styles.dots}>
						{pages.map((_, i) => (
							<View key={i} style={[styles.dot, i === page && styles.dotActive]} />
						))}
					</View>
					<GradientButton
						title={isLast ? 'はじめる' : '次へ'}
						onPress={() => (isLast ? onClose() : setPage((p) => p + 1))}
					/>
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.7)',
		justifyContent: 'center',
		padding: spacing.lg,
	},
	card: {
		backgroundColor: colors.surface,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		padding: spacing.lg,
		gap: spacing.md,
	},
	title: { ...typography.title, textAlign: 'center' },
	howto: { ...typography.caption, textAlign: 'center' },
	body: { ...typography.body, minHeight: 72, textAlign: 'center' },
	dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
	dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceBorder },
	dotActive: { backgroundColor: colors.accentFrom },
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `bun run test src/components/game`
Expected: PASS（2 tests）

- [ ] **Step 5: typecheck / lint / commit**

```bash
bun run typecheck && bun run lint
git add -A && git commit -m "feat: 遊び方解説モーダルを追加 (#4)"
```

---

### Task 4: プレイヤー設定シート

**Files:**

- Create: `src/components/game/player-setup-sheet.tsx`
- Create: `src/components/game/__tests__/player-setup-sheet.test.tsx`

**Interfaces:**

- Consumes: `playersStore/usePlayers/MIN_PLAYERS/MAX_PLAYERS`（Task 2）、`GradientButton`、トークン
- Produces: `<PlayerSetupSheet visible onClose minPlayers? maxPlayers? />`（人数ステッパー＋名前入力欄。min/max はゲームの制約で上書き可、デフォルトは 2/12）

- [ ] **Step 1: 失敗するテストを書く**

`src/components/game/__tests__/player-setup-sheet.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { playersStore } from '@/lib/players-store'
import { PlayerSetupSheet } from '../player-setup-sheet'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))

beforeEach(async () => {
	await AsyncStorage.clear()
	await playersStore.hydrate()
})

it('現在の人数が表示される', async () => {
	const { getByText } = await render(<PlayerSetupSheet visible onClose={jest.fn()} />)
	expect(getByText('4人')).toBeTruthy()
})

it('＋で人数が増える', async () => {
	const { getByText } = await render(<PlayerSetupSheet visible onClose={jest.fn()} />)
	fireEvent.press(getByText('＋'))
	expect(playersStore.getState().count).toBe(5)
})

it('名前入力がストアに反映される', async () => {
	const { getByPlaceholderText } = await render(<PlayerSetupSheet visible onClose={jest.fn()} />)
	fireEvent.changeText(getByPlaceholderText('1番'), 'ひろ')
	expect(playersStore.getState().names[0]).toBe('ひろ')
})

it('「決定」で onClose が呼ばれる', async () => {
	const onClose = jest.fn()
	const { getByText } = await render(<PlayerSetupSheet visible onClose={onClose} />)
	fireEvent.press(getByText('決定'))
	expect(onClose).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test src/components/game/__tests__/player-setup-sheet.test.tsx`
Expected: FAIL

- [ ] **Step 3: player-setup-sheet.tsx を実装**

`src/components/game/player-setup-sheet.tsx`:

```tsx
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { MAX_PLAYERS, MIN_PLAYERS, playersStore, usePlayers } from '@/lib/players-store'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	visible: boolean
	onClose: () => void
	minPlayers?: number
	maxPlayers?: number
}

// 参加人数と名前（任意）の設定シート。人数・名前はゲーム間で共有・永続化される
export function PlayerSetupSheet({
	visible,
	onClose,
	minPlayers = MIN_PLAYERS,
	maxPlayers = MAX_PLAYERS,
}: Props) {
	const players = usePlayers()

	const step = (delta: number) => {
		haptics.tap()
		playersStore.setCount(Math.min(maxPlayers, Math.max(minPlayers, players.count + delta)))
	}

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.backdrop}>
				<View style={styles.sheet}>
					<Text style={styles.title}>参加メンバー</Text>
					<View style={styles.stepper}>
						<Pressable
							accessibilityRole="button"
							onPress={() => step(-1)}
							style={styles.stepBtn}
						>
							<Text style={styles.stepLabel}>−</Text>
						</Pressable>
						<Text style={styles.count}>{players.count}人</Text>
						<Pressable
							accessibilityRole="button"
							onPress={() => step(1)}
							style={styles.stepBtn}
						>
							<Text style={styles.stepLabel}>＋</Text>
						</Pressable>
					</View>
					<Text style={styles.hint}>
						名前は入力しなくてもOK（「1番」のように呼ばれます）
					</Text>
					<ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
						{Array.from({ length: players.count }, (_, i) => (
							<TextInput
								key={i}
								style={styles.input}
								placeholder={`${i + 1}番`}
								placeholderTextColor={colors.textMuted}
								value={players.names[i] ?? ''}
								onChangeText={(t) => playersStore.setName(i, t)}
								maxLength={10}
							/>
						))}
					</ScrollView>
					<GradientButton title="決定" onPress={onClose} />
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
	sheet: {
		backgroundColor: colors.surface,
		borderTopLeftRadius: radii.lg,
		borderTopRightRadius: radii.lg,
		padding: spacing.lg,
		gap: spacing.md,
		maxHeight: '80%',
	},
	title: { ...typography.title, textAlign: 'center' },
	stepper: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.lg,
	},
	stepBtn: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepLabel: { ...typography.title, lineHeight: 26 },
	count: { ...typography.hero, minWidth: 96, textAlign: 'center' },
	hint: { ...typography.caption, textAlign: 'center' },
	list: { maxHeight: 240 },
	input: {
		...typography.body,
		backgroundColor: colors.background,
		borderRadius: radii.sm,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		marginBottom: spacing.sm,
	},
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `bun run test src/components/game`
Expected: PASS（modal 2 + sheet 4）

- [ ] **Step 5: typecheck / lint / commit**

```bash
bun run typecheck && bun run lint
git add -A && git commit -m "feat: プレイヤー設定シートを追加 (#4)"
```

---

### Task 5: リザルト演出部品キット

**Files:**

- Create: `src/components/game/use-drumroll.ts`
- Create: `src/components/game/drumroll-reveal.tsx`
- Create: `src/components/game/result-overlay.tsx`
- Create: `src/components/game/__tests__/use-drumroll.test.ts`

**Interfaces:**

- Consumes: `haptics`、`playSound`、トークン、`GradientButton`/`PillButton`
- Produces:
    - `useDrumroll(durationMs?: number): { phase: 'idle' | 'rolling' | 'revealed'; start(): void; reset(): void }`（reveal 時に haptics.heavy + playSound('reveal')）
    - `<DrumrollReveal phase>{children}</DrumrollReveal>`（rolling 中は「？？？」パルス、revealed で children をスケールイン表示。Reanimated 使用、テスト対象外の純表示部品）
    - `<ResultOverlay visible onRetry onHome>{children}</ResultOverlay>`（全画面オーバーレイ＋「もう一回」「ホームへ」）

- [ ] **Step 1: 失敗するテストを書く（フックのみ・fake timers）**

`src/components/game/__tests__/use-drumroll.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react-native'
import { useDrumroll } from '../use-drumroll'

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

it('start で rolling になり、時間経過で revealed になる', async () => {
	const { result } = await renderHook(() => useDrumroll(2000))
	expect(result.current.phase).toBe('idle')
	act(() => result.current.start())
	expect(result.current.phase).toBe('rolling')
	act(() => jest.advanceTimersByTime(2000))
	expect(result.current.phase).toBe('revealed')
})

it('reset で idle に戻る', async () => {
	const { result } = await renderHook(() => useDrumroll(1000))
	act(() => result.current.start())
	act(() => jest.advanceTimersByTime(1000))
	act(() => result.current.reset())
	expect(result.current.phase).toBe('idle')
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test src/components/game/__tests__/use-drumroll.test.ts`
Expected: FAIL

- [ ] **Step 3: use-drumroll.ts を実装**

`src/components/game/use-drumroll.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'

export type DrumrollPhase = 'idle' | 'rolling' | 'revealed'

// 「ダラダラダラ…ドン！」のタメ→発表を管理するフック。
// 見た目は DrumrollReveal 等の表示部品側で自由に組み替える（ゲームごとに演出を変える方針）
export function useDrumroll(durationMs = 2000) {
	const [phase, setPhase] = useState<DrumrollPhase>('idle')
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

	const start = useCallback(() => {
		setPhase('rolling')
		playSound('drumroll')
		timer.current = setTimeout(() => {
			setPhase('revealed')
			haptics.heavy()
			playSound('reveal')
		}, durationMs)
	}, [durationMs])

	const reset = useCallback(() => {
		if (timer.current) clearTimeout(timer.current)
		setPhase('idle')
	}, [])

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current)
		},
		[],
	)

	return { phase, start, reset }
}
```

- [ ] **Step 4: drumroll-reveal.tsx を実装（表示部品・テスト対象外）**

`src/components/game/drumroll-reveal.tsx`:

```tsx
import type { PropsWithChildren } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { typography } from '@/theme/tokens'
import type { DrumrollPhase } from './use-drumroll'

type Props = PropsWithChildren<{ phase: DrumrollPhase }>

// rolling: 「？？？」がドクドク脈打つ / revealed: children がドン！とスケールイン
export function DrumrollReveal({ phase, children }: Props) {
	const pulse = useSharedValue(1)
	const pop = useSharedValue(0)

	useEffect(() => {
		if (phase === 'rolling') {
			pulse.value = withRepeat(
				withSequence(withTiming(1.15, { duration: 240 }), withTiming(1, { duration: 240 })),
				-1,
			)
		}
		if (phase === 'revealed') {
			pop.value = withSpring(1, { damping: 9 })
		}
		if (phase === 'idle') {
			pop.value = 0
		}
	}, [phase, pulse, pop])

	const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }))
	const popStyle = useAnimatedStyle(() => ({
		transform: [{ scale: pop.value }],
		opacity: pop.value,
	}))

	if (phase === 'rolling') {
		return (
			<View style={styles.center}>
				<Animated.Text style={[styles.question, pulseStyle]}>？？？</Animated.Text>
			</View>
		)
	}
	if (phase === 'revealed') {
		return (
			<View style={styles.center}>
				<Animated.View style={popStyle}>{children}</Animated.View>
			</View>
		)
	}
	return (
		<View style={styles.center}>
			<Text style={typography.caption}>　</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	center: { alignItems: 'center', justifyContent: 'center', minHeight: 120 },
	question: { ...typography.hero, fontSize: 48 },
})
```

- [ ] **Step 5: result-overlay.tsx を実装（表示部品・テスト対象外）**

`src/components/game/result-overlay.tsx`:

```tsx
import type { PropsWithChildren } from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { PillButton } from '@/components/ui/pill-button'
import { colors, spacing } from '@/theme/tokens'

type Props = PropsWithChildren<{
	visible: boolean
	onRetry: () => void
	onHome: () => void
}>

// リザルトの共通枠。中身（敗者発表の演出）は各ゲームが自由に構成する
export function ResultOverlay({ visible, onRetry, onHome, children }: Props) {
	return (
		<Modal visible={visible} transparent animationType="fade">
			<View style={styles.backdrop}>
				<View style={styles.content}>{children}</View>
				<View style={styles.actions}>
					<GradientButton title="もう一回" onPress={onRetry} />
					<PillButton title="ホームへ" onPress={onHome} />
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(10,8,24,0.92)',
		justifyContent: 'center',
		padding: spacing.lg,
	},
	content: { flex: 1, justifyContent: 'center' },
	actions: { gap: spacing.md, paddingBottom: spacing.xl, alignItems: 'stretch' },
})
```

※ `colors` を backdrop に直接使わないのは半透明黒が必要なため（デザイントークン外の例外として許容）

- [ ] **Step 6: テスト・typecheck / lint / commit**

```bash
bun run test src/components/game && bun run typecheck && bun run lint
git add -A && git commit -m "feat: リザルト演出部品キット（useDrumroll / DrumrollReveal / ResultOverlay）を追加 (#4)"
```

---

### Task 6: ゲーム画面ルート＋初回遊び方表示＋統合

**Files:**

- Create: `src/lib/first-visit.ts`
- Create: `src/components/game/game-screen.tsx`
- Create: `src/app/game/[id].tsx`
- Modify: `src/app/_layout.tsx`（Stack に `game/[id]` を追加）
- Modify: `src/app/gallery.tsx`（デモ導線を追加）
- Create: `src/lib/__tests__/first-visit.test.ts`

**Interfaces:**

- Consumes: Task 1〜5 の全成果物
- Produces: `hasSeenHowTo(gameId: string): Promise<boolean>`、`markHowToSeen(gameId: string): Promise<void>`、`<GameScreen meta />`、ルート `/game/[id]`

- [ ] **Step 1: first-visit の失敗するテストを書く**

`src/lib/__tests__/first-visit.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { hasSeenHowTo, markHowToSeen } from '../first-visit'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

beforeEach(async () => {
	await AsyncStorage.clear()
})

it('未閲覧なら false、markHowToSeen 後は true', async () => {
	expect(await hasSeenHowTo('bomb-2-16')).toBe(false)
	await markHowToSeen('bomb-2-16')
	expect(await hasSeenHowTo('bomb-2-16')).toBe(true)
	expect(await hasSeenHowTo('five-sec-stop')).toBe(false)
})
```

- [ ] **Step 2: テストが落ちることを確認 → first-visit.ts を実装**

`src/lib/first-visit.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'

const key = (gameId: string) => `waipa.howto.${gameId}`

export async function hasSeenHowTo(gameId: string): Promise<boolean> {
	return (await AsyncStorage.getItem(key(gameId))) === '1'
}

export async function markHowToSeen(gameId: string): Promise<void> {
	await AsyncStorage.setItem(key(gameId), '1')
}
```

Run: `bun run test src/lib/__tests__/first-visit.test.ts` → PASS

- [ ] **Step 3: game-screen.tsx を実装**

`src/components/game/game-screen.tsx`:

```tsx
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { haptics } from '@/lib/haptics'
import { hasSeenHowTo, markHowToSeen } from '@/lib/first-visit'
import type { GameMeta } from '@/games/registry'
import { colors, spacing, typography } from '@/theme/tokens'
import { HowToPlayModal } from './how-to-play-modal'
import { PlayerSetupSheet } from './player-setup-sheet'

// 全ゲーム共通の画面枠: ヘッダー（戻る/タイトル/👥/？）＋初回の遊び方自動表示
export function GameScreen({ meta }: { meta: GameMeta }) {
	const insets = useSafeAreaInsets()
	const [howToVisible, setHowToVisible] = useState(false)
	const [playersVisible, setPlayersVisible] = useState(false)

	useEffect(() => {
		hasSeenHowTo(meta.id).then((seen) => {
			if (!seen) setHowToVisible(true)
		})
	}, [meta.id])

	const closeHowTo = () => {
		setHowToVisible(false)
		markHowToSeen(meta.id)
	}

	return (
		<View style={[styles.screen, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<Pressable
					accessibilityRole="button"
					onPress={() => {
						haptics.tap()
						router.back()
					}}
					style={styles.headerBtn}
				>
					<Text style={styles.headerIcon}>‹</Text>
				</Pressable>
				<Text style={styles.title} numberOfLines={1}>
					{meta.emoji} {meta.title}
				</Text>
				<View style={styles.headerRight}>
					<Pressable
						accessibilityRole="button"
						onPress={() => setPlayersVisible(true)}
						style={styles.headerBtn}
					>
						<Text style={styles.headerIcon}>👥</Text>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						onPress={() => setHowToVisible(true)}
						style={styles.headerBtn}
					>
						<Text style={styles.headerIcon}>？</Text>
					</Pressable>
				</View>
			</View>

			<View style={styles.body}>
				<meta.Component />
			</View>

			<HowToPlayModal
				visible={howToVisible}
				title={`${meta.emoji} ${meta.title}`}
				pages={meta.howToPlay}
				onClose={closeHowTo}
			/>
			<PlayerSetupSheet
				visible={playersVisible}
				onClose={() => setPlayersVisible(false)}
				minPlayers={meta.minPlayers}
				maxPlayers={meta.maxPlayers}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: spacing.sm,
		height: 56,
	},
	headerBtn: {
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerIcon: { fontSize: 22, color: colors.text },
	title: { ...typography.title, flex: 1, textAlign: 'center' },
	headerRight: { flexDirection: 'row' },
	body: { flex: 1 },
})
```

- [ ] **Step 4: ルート game/[id].tsx を実装し Stack に登録**

`src/app/game/[id].tsx`:

```tsx
import { Redirect, useLocalSearchParams } from 'expo-router'
import { GameScreen } from '@/components/game/game-screen'
import { getGame } from '@/games/registry'

export default function GameRoute() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const meta = getGame(id ?? '')
	if (!meta) return <Redirect href="/" />
	return <GameScreen meta={meta} />
}
```

`src/app/_layout.tsx` の Stack に追加（gallery の Screen の後）:

```tsx
<Stack.Screen name="game/[id]" />
```

- [ ] **Step 5: gallery.tsx にデモ導線を追加**

gallery の最後のセクションとして（既存 Card 群の後）:

```tsx
<SectionHeader title="ゲームフレーム" />
<Card>
	<ChevronRow
		icon="🎮"
		label="デモ: ゲーム画面を開く（Who will pay）"
		onPress={() => router.push('/game/who-will-pay')}
	/>
</Card>
```

（`import { router } from 'expo-router'` を追加）

- [ ] **Step 6: 全検証**

```bash
bun run test && bun run typecheck && bun run lint && bunx prettier --check .
bunx expo export --platform web && rm -rf dist
```

Expected: 全テストパス（既存17＋新規13前後）、export に `/game/[id]` ルート出力

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: ゲーム画面ルートと共通フレームを統合 (#4)"
```

---

## Self-Review 済みチェック

- Issue #4 受け入れ条件との対応: ゲームレジストリ＋ホーム連動準備=Task 1（ホーム側は #3 で接続）/ 遊び方モーダル（初回自動＋？ボタン）=Task 3+6 / 共通ゲーム画面レイアウト=Task 6 / リザルト演出=Task 5（部品キット方式に変更、brainstorming で「ゲームごとに演出を変えたい」決定のため）/ 人数設定シート（2〜12人・記憶）=Task 2+4（名前入力も追加、brainstorming 決定）
- 型整合: `GameMeta` は Task 1 定義を Task 6 が参照。`playersStore` API は Task 2 定義を Task 4 が使用。`DrumrollPhase` は Task 5 内で完結
- 未定義参照なし: `useSafeAreaInsets` は react-native-safe-area-context（テンプレート同梱）、`ChevronRow`/`Card`/`SectionHeader`/`GradientButton`/`PillButton` は #2 で実装済み
- サウンド: `playSound('drumroll')`/`playSound('reveal')` は音源未登録のため無音 no-op（既存仕様）。音源追加時に `_layout.tsx` で registerSound する
