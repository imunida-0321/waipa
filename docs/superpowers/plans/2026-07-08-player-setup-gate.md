# ゲーム開始前プレイヤー設定ゲート Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** プレイヤー設定が必要なゲーム（`requiresPlayers: true`）で、ゲーム本体が始まる前に「参加メンバー」画面を必須ゲートとして挟み、名前未入力があればバリデーションエラーでブロックする。

**Architecture:** 判定は `registry.ts` の `GameMeta.requiresPlayers` フラグで行う。ゲートの分岐は共通フレーム `GameScreen` に持たせ、`PlayerSetupSheet` をモーダル編集用から「ゲート専用の全画面ステップ」に書き換える。名前検証は `players-store.ts` の純粋関数 `allNamesFilled` に切り出し TDD で固める。

**Tech Stack:** Expo SDK 57 / expo-router / jest-expo / @testing-library/react-native v14。**追加の新規依存は禁止。**

## Global Constraints

- フォーマット: タブインデント幅4・セミコロンなし・シングルクォート（`.prettierrc` が正）
- 色は `@/theme/tokens`（`colors` / `spacing` / `radii` / `typography`）。エラー表現は `colors.danger`（`#FF4D4F`）
- **RNTL v14: `render()` は async**（`await render(...)`）。jest.mock ファクタで `require()` を使う箇所は直前に `// eslint-disable-next-line @typescript-eslint/no-require-imports`
- ダークテーマ固定・UI 文言は日本語・アプリ名は「WaiPa」
- 各タスク完了時 `bun run test && bun run typecheck && bun run lint` がパス。最終タスクで `bunx prettier --check .` と `bunx expo export --platform web` も通す
- コミットは `feat:` プレフィックス＋日本語、末尾に `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
- 👥ボタン（ゲーム開始後の参加メンバー編集導線）は撤去する（ユーザー指示: 開始後の編集は不自然）
- 「もう一度」（各ゲームのリトライ）は `GameScreen` を再マウントしないため、自動的に再ゲートしない（対応不要）

---

### Task 1: 名前検証の純粋関数 `allNamesFilled`

**Files:**

- Modify: `src/lib/players-store.ts`（末尾に関数を追加。既存のエクスポート・実装は不変）
- Test: `src/lib/__tests__/players-store.test.ts`（既存テストは不変。describe を追加）

**Interfaces:**

- Consumes: 既存 `PlayersState`（`{ count: number; names: string[]; history: string[][] }`）
- Produces: `allNamesFilled(s: PlayersState): boolean`（`count` 人ぶんの `names[i]` が全員 trim 後 非空なら true）

- [ ] **Step 1: 失敗するテストを追加**

`src/lib/__tests__/players-store.test.ts` の末尾（ファイル末尾）に追加。まず import 行（2行目）を次に変更:

変更前:

```ts
import { getDisplayNames, playersStore } from '../players-store'
```

変更後:

```ts
import { allNamesFilled, getDisplayNames, playersStore } from '../players-store'
```

ファイル末尾に追加:

```ts
describe('allNamesFilled', () => {
	it('全員名前が入力されていれば true', () => {
		const s = { count: 2, names: ['ひろ', 'たろう'], history: [] }
		expect(allNamesFilled(s)).toBe(true)
	})

	it('誰か1人でも未入力なら false', () => {
		const s = { count: 3, names: ['ひろ', '', 'たろう'], history: [] }
		expect(allNamesFilled(s)).toBe(false)
	})

	it('空白のみの名前は未入力扱いで false', () => {
		const s = { count: 2, names: ['ひろ', '   '], history: [] }
		expect(allNamesFilled(s)).toBe(false)
	})

	it('names 配列が count より短い場合も false', () => {
		const s = { count: 2, names: ['ひろ'], history: [] }
		expect(allNamesFilled(s)).toBe(false)
	})
})
```

- [ ] **Step 2: 落ちることを確認**

Run: `bun run test src/lib/__tests__/players-store.test.ts`
Expected: FAIL（`allNamesFilled is not a function` / import エラー）

- [ ] **Step 3: `players-store.ts` に実装を追加**

`src/lib/players-store.ts` の末尾（`getDisplayNames` の後）に追加:

```ts
// count 人ぶんの名前が全員入力済み（空白のみは未入力扱い）か判定する
export function allNamesFilled(s: PlayersState): boolean {
	return Array.from({ length: s.count }, (_, i) => s.names[i]?.trim()).every(Boolean)
}
```

- [ ] **Step 4: PASS 確認**

Run: `bun run test src/lib/__tests__/players-store.test.ts`
Expected: PASS（既存6テスト＋新規4テスト）

- [ ] **Step 5: typecheck / lint / commit**

Run: `bun run typecheck && bun run lint`
Expected: エラーなし

```bash
git add src/lib/players-store.ts src/lib/__tests__/players-store.test.ts
git commit -m "feat: プレイヤー名の全員入力チェック allNamesFilled を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `registry.ts` に `requiresPlayers` フラグを追加

**Files:**

- Modify: `src/games/registry.ts`（`GameMeta` 型に1フィールド追加、`who-will-pay` エントリに1行追加。他エントリは無変更）

**Interfaces:**

- Produces: `GameMeta.requiresPlayers?: boolean`（省略時 `undefined` は「不要」= falsy として扱われる。Task 4 の `GameScreen` は `meta.requiresPlayers` を真偽判定で使う）

- [ ] **Step 1: `GameMeta` 型にフィールドを追加**

`src/games/registry.ts` の型定義（`export type GameMeta = { ... }`）内、`maxPlayers: number` の下に1行追加:

変更前:

```ts
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
```

変更後:

```ts
export type GameMeta = {
	id: string
	title: string
	tagline: string
	emoji: string
	gradient: readonly [string, string]
	minPlayers: number
	maxPlayers: number
	requiresPlayers?: boolean
	howToPlay: readonly string[]
	Component: ComponentType
}
```

- [ ] **Step 2: `who-will-pay` エントリに `requiresPlayers: true` を追加**

`who-will-pay` エントリの `maxPlayers: 8,` の直後に1行追加:

変更前:

```ts
		minPlayers: 2,
		maxPlayers: 8,
		howToPlay: [
			'① 一緒に遊ぶメンバーを登録しよう！（2〜8名、各自に色がつきます）',
```

変更後:

```ts
		minPlayers: 2,
		maxPlayers: 8,
		requiresPlayers: true,
		howToPlay: [
			'① 一緒に遊ぶメンバーを登録しよう！（2〜8名、各自に色がつきます）',
```

- [ ] **Step 3: typecheck / lint 確認**

Run: `bun run typecheck && bun run lint`
Expected: エラーなし（`requiresPlayers` はオプショナルなので他エントリは無改修で型エラーにならない）

- [ ] **Step 4: 既存テストが通ることを確認**

Run: `bun run test src/games/__tests__/registry.test.ts src/components/home/__tests__/game-grid.test.tsx`
Expected: PASS（両テストとも `requiresPlayers` を検証していないため無改修で通る）

- [ ] **Step 5: commit**

```bash
git add src/games/registry.ts
git commit -m "feat: GameMeta に requiresPlayers フラグを追加し Who will pay を対象にする

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: `PlayerSetupSheet` をゲート専用に書き換え

**Files:**

- Modify: `src/components/game/player-setup-sheet.tsx`（全面書き換え）
- Modify: `src/components/game/__tests__/player-setup-sheet.test.tsx`（全面書き換え）

**Interfaces:**

- Consumes: Task 1 の `allNamesFilled(s: PlayersState): boolean`、既存 `playersStore` / `usePlayers` / `MIN_PLAYERS` / `MAX_PLAYERS` / `playerColor`、`expo-router` の `router`
- Produces: `<PlayerSetupSheet onProceed={() => void} minPlayers?: number maxPlayers?: number />`（`visible`/`onClose` Props は廃止。常に全画面表示。`Modal` ラッパー廃止）

**破壊的変更（Task 4 で呼び出し元を追従させる）:** 旧 Props `{ visible, onClose, minPlayers?, maxPlayers? }` → 新 Props `{ onProceed, minPlayers?, maxPlayers? }`。`onClose` は削除（× ボタンは内部で直接 `router.back()` を呼ぶ）。

- [ ] **Step 1: 失敗するテストを書く（全面書き換え）**

`src/components/game/__tests__/player-setup-sheet.test.tsx` を次の内容で置き換える:

```tsx
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { playersStore } from '@/lib/players-store'
import { PlayerSetupSheet } from '../player-setup-sheet'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}))
jest.mock('@/theme/player-colors', () => ({
	playerColor: (index: number) => ({ name: `色${index}`, value: '#FF0000' }),
}))
jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: jest.fn(() => ({
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
	})),
}))

beforeEach(async () => {
	await AsyncStorage.clear()
	await playersStore.hydrate()
	jest.clearAllMocks()
})

it('人数分のプレイヤーカードが表示される', async () => {
	const { getAllByPlaceholderText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	expect(getAllByPlaceholderText('プレイヤー名を入力...')).toHaveLength(4)
})

it('「追加」で1人増える', async () => {
	const { getByText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	fireEvent.press(getByText('⊕ 追加'))
	expect(playersStore.getState().count).toBe(5)
})

it('×で対象プレイヤーが名前ごと削除される', async () => {
	await playersStore.setName(0, 'A')
	await playersStore.setName(1, 'B')
	await playersStore.setName(2, 'C')
	await playersStore.setName(3, 'D')
	const { getAllByLabelText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	fireEvent.press(getAllByLabelText('プレイヤーを削除')[1])
	const s = playersStore.getState()
	expect(s.count).toBe(3)
	expect(s.names.slice(0, 3)).toEqual(['A', 'C', 'D'])
})

it('最小人数では削除ボタンが表示されない', async () => {
	await playersStore.setCount(2)
	const { queryAllByLabelText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	expect(queryAllByLabelText('プレイヤーを削除')).toHaveLength(0)
})

it('名前入力がストアに反映される', async () => {
	const { getAllByPlaceholderText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	fireEvent.changeText(getAllByPlaceholderText('プレイヤー名を入力...')[0], 'ひろ')
	expect(playersStore.getState().names[0]).toBe('ひろ')
})

it('履歴が空のとき空状態メッセージを表示', async () => {
	const { getByText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	expect(getByText('履歴がまだありません。')).toBeTruthy()
})

it('全員名前が入力されていれば「つぎへ」で履歴保存と onProceed が呼ばれる', async () => {
	await playersStore.setCount(2)
	await playersStore.setName(0, 'ひろ')
	await playersStore.setName(1, 'たろう')
	const onProceed = jest.fn()
	const { getByText } = await render(<PlayerSetupSheet onProceed={onProceed} />)
	fireEvent.press(getByText('つぎへ'))
	await waitFor(() => {
		expect(onProceed).toHaveBeenCalledTimes(1)
		expect(playersStore.getState().history.length).toBeGreaterThan(0)
	})
})

it('名前未入力があると「つぎへ」でエラーバナーが出て onProceed は呼ばれない', async () => {
	await playersStore.setCount(2)
	await playersStore.setName(0, 'ひろ')
	// 2人目は未入力のまま
	const onProceed = jest.fn()
	const { getByText } = await render(<PlayerSetupSheet onProceed={onProceed} />)
	fireEvent.press(getByText('つぎへ'))
	await waitFor(() => {
		expect(getByText('名前が入力されていないものがあります')).toBeTruthy()
	})
	expect(onProceed).not.toHaveBeenCalled()
})

it('×を押すと router.back が呼ばれる', async () => {
	const { getByLabelText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	fireEvent.press(getByLabelText('閉じる'))
	expect(router.back).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: 落ちることを確認**

Run: `bun run test src/components/game/__tests__/player-setup-sheet.test.tsx`
Expected: FAIL（`onProceed` を呼ぶ実装がない・エラーバナーが存在しない・型エラーで `visible`/`onClose` が不明などで多数 FAIL）

- [ ] **Step 3: `player-setup-sheet.tsx` を全面書き換え**

`src/components/game/player-setup-sheet.tsx` をファイル全体、次の内容に置き換える:

```tsx
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { haptics } from '@/lib/haptics'
import {
	allNamesFilled,
	MAX_PLAYERS,
	MIN_PLAYERS,
	playersStore,
	usePlayers,
} from '@/lib/players-store'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	onProceed: () => void
	minPlayers?: number
	maxPlayers?: number
}

// ゲーム開始前の必須ゲート。参考UI準拠: プレイヤーカラー付きカード / ⊕追加 / 履歴 / 白い「つぎへ」
export function PlayerSetupSheet({
	onProceed,
	minPlayers = MIN_PLAYERS,
	maxPlayers = MAX_PLAYERS,
}: Props) {
	const insets = useSafeAreaInsets()
	const players = usePlayers()
	const [showError, setShowError] = useState(false)

	const proceed = async () => {
		haptics.tap()
		if (!allNamesFilled(players)) {
			setShowError(true)
			return
		}
		setShowError(false)
		await playersStore.saveToHistory()
		onProceed()
	}

	return (
		<View style={[styles.screen, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="閉じる"
					onPress={() => {
						haptics.tap()
						router.back()
					}}
					style={styles.headerBtn}
				>
					<Text style={styles.headerIcon}>×</Text>
				</Pressable>
				<Text style={styles.headerTitle}>参加メンバー</Text>
				<View style={styles.headerBtn} />
			</View>

			{showError && (
				<View style={styles.banner}>
					<Text style={styles.bannerText}>名前が入力されていないものがあります</Text>
				</View>
			)}

			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				{Array.from({ length: players.count }, (_, i) => {
					const color = playerColor(i)
					const empty = !players.names[i]?.trim()
					return (
						<View
							key={`${i}-${players.count}`}
							style={[styles.card, showError && empty && styles.cardError]}
						>
							<View style={[styles.colorBar, { backgroundColor: color.value }]} />
							<View style={styles.cardBody}>
								<Text style={[styles.colorLabel, { color: color.value }]}>
									プレイヤーカラー：{color.name}
								</Text>
								<TextInput
									style={styles.input}
									placeholder="プレイヤー名を入力..."
									placeholderTextColor={colors.textMuted}
									value={players.names[i] ?? ''}
									onChangeText={(t) => playersStore.setName(i, t)}
									maxLength={10}
								/>
							</View>
							{players.count > minPlayers && (
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="プレイヤーを削除"
									onPress={() => {
										haptics.tap()
										playersStore.removePlayer(i)
									}}
									style={styles.removeBtn}
								>
									<Text style={styles.removeIcon}>×</Text>
								</Pressable>
							)}
						</View>
					)
				})}

				{players.count < maxPlayers && (
					<Pressable
						accessibilityRole="button"
						onPress={() => {
							haptics.tap()
							playersStore.addPlayer()
						}}
						style={styles.addBtn}
					>
						<Text style={styles.addLabel}>⊕ 追加</Text>
					</Pressable>
				)}

				<Text style={styles.sectionTitle}>履歴</Text>
				<View style={styles.historyBox}>
					{players.history.length === 0 ? (
						<Text style={styles.historyEmpty}>履歴がまだありません。</Text>
					) : (
						players.history.map((set, i) => (
							<Pressable
								accessibilityRole="button"
								key={i}
								onPress={() => {
									haptics.tap()
									playersStore.applyHistory(i)
								}}
								style={styles.historyRow}
							>
								<Text style={styles.historyText} numberOfLines={1}>
									{set.map((n, j) => (n.trim() ? n : `${j + 1}番`)).join('、')}
								</Text>
							</Pressable>
						))
					)}
				</View>
			</ScrollView>

			<View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
				<Pressable accessibilityRole="button" onPress={proceed} style={styles.nextBtn}>
					<Text style={styles.nextLabel}>つぎへ</Text>
				</Pressable>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 56,
		paddingHorizontal: spacing.sm,
	},
	headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
	headerIcon: { fontSize: 28, color: colors.text },
	headerTitle: { ...typography.title, flex: 1, textAlign: 'center' },
	banner: {
		marginHorizontal: spacing.md,
		marginBottom: spacing.sm,
		backgroundColor: colors.danger,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	bannerText: { ...typography.body, fontWeight: '700', textAlign: 'center' },
	content: { padding: spacing.md, gap: spacing.md },
	card: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		overflow: 'hidden',
	},
	cardError: { borderColor: colors.danger },
	colorBar: { width: 5 },
	cardBody: { flex: 1, padding: spacing.md, gap: spacing.sm },
	colorLabel: { fontSize: 13, fontWeight: '700' },
	input: {
		...typography.body,
		borderBottomWidth: 1,
		borderBottomColor: colors.surfaceBorder,
		paddingVertical: spacing.xs,
	},
	removeBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
	removeIcon: { fontSize: 22, color: colors.text },
	addBtn: {
		alignSelf: 'center',
		borderWidth: 1,
		borderColor: colors.text,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.xl,
	},
	addLabel: { ...typography.body, fontWeight: '700' },
	sectionTitle: { ...typography.title, fontSize: 18, marginTop: spacing.md },
	historyBox: {
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		padding: spacing.md,
		minHeight: 96,
		justifyContent: 'center',
	},
	historyEmpty: { ...typography.body, fontWeight: '700', textAlign: 'center' },
	historyRow: { paddingVertical: spacing.sm },
	historyText: { ...typography.body },
	footer: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
	nextBtn: {
		backgroundColor: colors.text,
		borderRadius: radii.md,
		paddingVertical: spacing.md,
		alignItems: 'center',
	},
	nextLabel: { fontSize: 18, fontWeight: '800', color: colors.background },
})
```

（`Modal` import を削除し `View` ラッパーに変更、`visible`/`onClose` Props を削除、`onProceed` Props を追加、`showError` state と `banner`/`cardError` スタイルを追加、× ボタンが直接 `router.back()` を呼ぶ点が既存実装からの差分）

- [ ] **Step 4: PASS 確認**

Run: `bun run test src/components/game/__tests__/player-setup-sheet.test.tsx`
Expected: PASS（10テストすべて）

- [ ] **Step 5: typecheck / lint / commit**

Run: `bun run typecheck && bun run lint`
Expected: エラーなし（この時点で `game-screen.tsx` はまだ旧 Props で `PlayerSetupSheet` を呼んでいるため型エラーになる — Task 4 で解消する。もし typecheck がここで失敗する場合は許容し、Task 4 で解消されることをコミットメッセージ相当のメモとして自分の作業記録に残した上で先に進んで良い。ただし lint はプロジェクト全体ではなく変更ファイルに対して評価されるため通常は問題にならない）

```bash
git add src/components/game/player-setup-sheet.tsx src/components/game/__tests__/player-setup-sheet.test.tsx
git commit -m "feat: PlayerSetupSheet をゲート専用の全画面ステップに書き換え

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: `GameScreen` にゲート分岐を実装し👥を撤去

**Files:**

- Modify: `src/components/game/game-screen.tsx`（全面書き換え）
- Test: `src/components/game/__tests__/game-screen.test.tsx`（新規）

**Interfaces:**

- Consumes: Task 3 の `<PlayerSetupSheet onProceed={() => void} />`、既存 `GameMeta`（Task 2 で `requiresPlayers?: boolean` 追加済み）、既存 `hasSeenHowTo`/`markHowToSeen`/`HowToPlayModal`
- Produces: `<GameScreen meta={GameMeta} />`（外部シグネチャ不変。内部に `setupDone` 分岐を追加）

- [ ] **Step 1: 失敗するテストを書く**

`src/components/game/__tests__/game-screen.test.tsx` を新規作成:

```tsx
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { playersStore } from '@/lib/players-store'
import type { GameMeta } from '@/games/registry'
import { GameScreen } from '../game-screen'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}))
jest.mock('@/theme/player-colors', () => ({
	playerColor: (index: number) => ({ name: `色${index}`, value: '#FF0000' }),
}))
jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: jest.fn(() => ({
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
	})),
}))

function DummyGame() {
	return null
}

const baseMeta: GameMeta = {
	id: 'dummy',
	title: 'ダミー',
	tagline: 'テスト用',
	emoji: '🎲',
	gradient: ['#000000', '#111111'],
	minPlayers: 2,
	maxPlayers: 8,
	howToPlay: ['あそびかた1'],
	Component: DummyGame,
}

beforeEach(async () => {
	await AsyncStorage.clear()
	await playersStore.hydrate()
	await playersStore.setCount(2)
	await playersStore.setName(0, 'ひろ')
	await playersStore.setName(1, 'たろう')
})

it('requiresPlayers が true のゲームは最初にゲート画面を表示し、本体は表示しない', async () => {
	const { getByText, queryByText } = await render(
		<GameScreen meta={{ ...baseMeta, requiresPlayers: true }} />,
	)
	expect(getByText('参加メンバー')).toBeTruthy()
	expect(queryByText('？')).toBeNull()
})

it('requiresPlayers が true のゲートを通過すると本体ヘッダーと Component が表示される', async () => {
	const { getByText, queryByText } = await render(
		<GameScreen meta={{ ...baseMeta, requiresPlayers: true }} />,
	)
	fireEvent.press(getByText('つぎへ'))
	await waitFor(() => {
		expect(queryByText('参加メンバー')).toBeNull()
	})
	expect(getByText('？')).toBeTruthy()
	expect(queryByText('👥')).toBeNull()
})

it('requiresPlayers が未指定のゲームは最初から本体を表示する（ゲートなし）', async () => {
	const { getByText, queryByText } = await render(<GameScreen meta={baseMeta} />)
	expect(queryByText('参加メンバー')).toBeNull()
	expect(getByText('？')).toBeTruthy()
})

it('👥ボタンはどのゲームでも表示されない', async () => {
	const { queryByText } = await render(<GameScreen meta={baseMeta} />)
	expect(queryByText('👥')).toBeNull()
})
```

- [ ] **Step 2: 落ちることを確認**

Run: `bun run test src/components/game/__tests__/game-screen.test.tsx`
Expected: FAIL（`GameScreen` はまだ常に本体を表示し `PlayerSetupSheet` を旧 Props で呼んでいるため、ゲート表示を期待するテストが FAIL）

- [ ] **Step 3: `game-screen.tsx` を全面書き換え**

`src/components/game/game-screen.tsx` をファイル全体、次の内容に置き換える:

```tsx
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { haptics } from '@/lib/haptics'
import { hasSeenHowTo, markHowToSeen } from '@/lib/first-visit'
import type { GameMeta } from '@/games/registry'
import { colors, spacing, typography } from '@/theme/tokens'
import { HowToPlayModal } from './how-to-play-modal'
import { PlayerSetupSheet } from './player-setup-sheet'

// 全ゲーム共通の画面枠: requiresPlayers なら開始前にプレイヤー設定ゲート→
// ヘッダー（戻る/タイトル/？）＋初回の遊び方自動表示
export function GameScreen({ meta }: { meta: GameMeta }) {
	const insets = useSafeAreaInsets()
	const [howToVisible, setHowToVisible] = useState(false)
	const [setupDone, setSetupDone] = useState(!meta.requiresPlayers)

	useEffect(() => {
		if (!setupDone) return
		hasSeenHowTo(meta.id).then((seen) => {
			if (!seen) setHowToVisible(true)
		})
	}, [meta.id, setupDone])

	const closeHowTo = () => {
		setHowToVisible(false)
		markHowToSeen(meta.id)
	}

	if (!setupDone) {
		return (
			<View style={[styles.screen, { paddingTop: insets.top }]}>
				<PlayerSetupSheet
					onProceed={() => setSetupDone(true)}
					minPlayers={meta.minPlayers}
					maxPlayers={meta.maxPlayers}
				/>
			</View>
		)
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

（変更点: 👥ボタンと `playersVisible` state を削除。`setupDone` state を追加し `!meta.requiresPlayers` を初期値に。`!setupDone` のときはゲートのみを全画面描画して return（通常ヘッダー・howto は描画しない）。howto 判定の `useEffect` に `setupDone` を依存配列に追加し、ゲート完了後に発火するようにする。`PlayerSetupSheet` は新 Props `onProceed` で呼ぶ）

- [ ] **Step 4: PASS 確認**

Run: `bun run test src/components/game/__tests__/game-screen.test.tsx src/components/game/__tests__/player-setup-sheet.test.tsx`
Expected: PASS（両ファイルとも全テスト）

- [ ] **Step 5: 全検証**

```bash
bun run test && bun run typecheck && bun run lint && bunx prettier --check .
bunx expo export --platform web && rm -rf dist
```

Expected: すべてパス。特に `who-will-pay-game.test.tsx` は `<WhoWillPayGame/>` を直接 render しており `GameScreen` を経由しないため無改修のまま通ること、`registry.test.ts`・`game-grid.test.tsx` も無改修のまま通ることを確認する。

- [ ] **Step 6: commit**

```bash
git add src/components/game/game-screen.tsx src/components/game/__tests__/game-screen.test.tsx
git commit -m "feat: GameScreen にプレイヤー設定ゲートを実装し👥ボタンを撤去

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review 済みチェック

- スペック対応: `requiresPlayers` フラグ=Task2 / 名前検証=Task1 / ゲート専用UI＋バリデーション＋バナー＋ハイライト＋×で戻る=Task3 / GameScreen 分岐＋👥撤去＋howto タイミング調整=Task4
- 型整合: `allNamesFilled(s: PlayersState): boolean`（Task1）は Task3 の `PlayerSetupSheet` から一度だけ呼ばれる。`GameMeta.requiresPlayers?: boolean`（Task2）は Task4 の `GameScreen` が `!meta.requiresPlayers` として参照。`PlayerSetupSheet` の新 Props `{ onProceed, minPlayers?, maxPlayers? }`（Task3 で定義）を Task4 の `GameScreen` が呼び出し側として使用— 名前・型とも一致
- 破壊的変更の伝播: Task3 で `PlayerSetupSheet` の Props を変更した直後は `GameScreen`（旧実装）が型不整合を起こす想定だが、Task4 で即座に解消されるため実害はコミット間の一時的な状態のみ
- 影響範囲の確認: `who-will-pay-game.test.tsx`・`registry.test.ts`・`game-grid.test.tsx` はいずれも無改修で通過することを Task2/Task4 のテストステップで明示的に確認する
- 新規依存なし。既存トークン（`colors.danger`）のみ使用
