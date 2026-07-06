# WaiPa デザインシステム Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WaiPa 全画面の土台となるダークテーマのデザイントークン・共通UIコンポーネント・効果音/Haptics ユーティリティを実装する（Issue #2）。

**Architecture:** RN 標準 StyleSheet ＋ 自作トークン（`src/theme/`）。設定（効果音/バイブ ON/OFF）は AsyncStorage 永続化の軽量ストア（`useSyncExternalStore`）で持ち、サウンド/Haptics ユーティリティがそれを参照する。コンポーネントは `src/components/ui/` に1ファイル1責務で置き、開発ビルド限定のギャラリー画面で目視確認する。

**Tech Stack:** Expo SDK 57 / TypeScript / expo-linear-gradient / expo-haptics / expo-audio / @react-native-async-storage/async-storage / jest-expo / @testing-library/react-native

## Global Constraints

- フォーマット: タブインデント幅4・セミコロンなし・シングルクォート（`.prettierrc` が正）
- カラーは CLAUDE.md 準拠: 背景 `#17142A` / サーフェス `#211D3A` / アクセントグラデ `#E85BF7 → #7B5CFA`
- ダークテーマ固定（`userInterfaceStyle: dark`）。ライトモード分岐は作らない（YAGNI）
- UI 文言は日本語。アプリ名表記は「WaiPa」
- 新規依存は上記 Tech Stack 記載のもの以外追加しない
- 各タスク完了時に `bun run typecheck && bun run lint` がパスすること
- コミットは `feat:`/`test:`/`chore:` プレフィックス＋日本語、`Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` を付ける

---

### Task 1: テスト基盤＋デザイントークン

**Files:**
- Create: `src/theme/tokens.ts`
- Create: `src/theme/__tests__/tokens.test.ts`
- Modify: `package.json`（jest 設定・scripts 追加）

**Interfaces:**
- Produces: `colors.background/surface/surfaceBorder/accentFrom/accentTo/text/textMuted/success/danger/gold: string`、`spacing.xs/sm/md/lg/xl: number`、`radii.sm/md/lg/pill: number`、`typography.hero/title/body/caption: TextStyle`

- [ ] **Step 1: 依存を追加する**

```bash
bunx expo install expo-linear-gradient expo-haptics expo-audio @react-native-async-storage/async-storage
bun add -d jest jest-expo @testing-library/react-native @types/jest
```

- [ ] **Step 2: package.json に jest 設定と test script を追加**

`package.json` の scripts に `"test": "jest"` を追加し、ルートに以下を追加:

```json
"jest": {
	"preset": "jest-expo",
	"transformIgnorePatterns": [
		"node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|expo-router|expo-modules-core|react-native-reanimated|react-native-worklets)/)"
	]
}
```

- [ ] **Step 3: 失敗するテストを書く**

`src/theme/__tests__/tokens.test.ts`:

```ts
import { colors, radii, spacing, typography } from '../tokens'

describe('デザイントークン', () => {
	it('CLAUDE.md 指定のカラーを持つ', () => {
		expect(colors.background).toBe('#17142A')
		expect(colors.surface).toBe('#211D3A')
		expect(colors.accentFrom).toBe('#E85BF7')
		expect(colors.accentTo).toBe('#7B5CFA')
	})

	it('スペーシングは昇順', () => {
		expect(spacing.xs).toBeLessThan(spacing.sm)
		expect(spacing.sm).toBeLessThan(spacing.md)
		expect(spacing.md).toBeLessThan(spacing.lg)
		expect(spacing.lg).toBeLessThan(spacing.xl)
	})

	it('カードの角丸は大きめ（20以上）', () => {
		expect(radii.lg).toBeGreaterThanOrEqual(20)
	})

	it('タイポグラフィ各種を持つ', () => {
		expect(typography.hero.fontSize).toBeGreaterThan(typography.title.fontSize!)
		expect(typography.title.fontSize).toBeGreaterThan(typography.body.fontSize!)
		expect(typography.body.fontSize).toBeGreaterThan(typography.caption.fontSize!)
	})
})
```

- [ ] **Step 4: テストが落ちることを確認**

Run: `bun run test src/theme`
Expected: FAIL（`../tokens` が存在しない）

- [ ] **Step 5: tokens.ts を実装**

`src/theme/tokens.ts`:

```ts
import type { TextStyle } from 'react-native'

// CLAUDE.md「デザインコンセプト > カラートークン」準拠
export const colors = {
	background: '#17142A',
	surface: '#211D3A',
	surfaceBorder: '#332E52',
	accentFrom: '#E85BF7',
	accentTo: '#7B5CFA',
	text: '#FFFFFF',
	textMuted: '#9A94B8',
	success: '#34C759',
	danger: '#FF4D4F',
	gold: '#FFC53D',
} as const

export const spacing = {
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 32,
} as const

export const radii = {
	sm: 8,
	md: 16,
	lg: 24,
	pill: 999,
} as const

export const typography = {
	hero: { fontSize: 32, fontWeight: '800', color: colors.text },
	title: { fontSize: 22, fontWeight: '700', color: colors.text },
	body: { fontSize: 16, fontWeight: '400', color: colors.text },
	caption: { fontSize: 13, fontWeight: '400', color: colors.textMuted },
} as const satisfies Record<string, TextStyle>
```

- [ ] **Step 6: テストが通ることを確認**

Run: `bun run test src/theme`
Expected: PASS（4 tests）

- [ ] **Step 7: typecheck / lint / commit**

```bash
bun run typecheck && bun run lint
git add -A && git commit -m "feat: デザイントークンとテスト基盤を追加 (#2)"
```

---

### Task 2: 設定ストア（効果音・バイブの永続化）

**Files:**
- Create: `src/lib/settings-store.ts`
- Create: `src/lib/__tests__/settings-store.test.ts`

**Interfaces:**
- Produces: `settingsStore.getState(): { soundEnabled: boolean; hapticsEnabled: boolean }`、`settingsStore.setSoundEnabled(v: boolean): Promise<void>`、`settingsStore.setHapticsEnabled(v: boolean): Promise<void>`、`settingsStore.subscribe(fn: () => void): () => void`、`settingsStore.hydrate(): Promise<void>`、`useSettings(): SettingsState`（React hook）

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/__tests__/settings-store.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { settingsStore } from '../settings-store'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

describe('settingsStore', () => {
	beforeEach(async () => {
		await AsyncStorage.clear()
		await settingsStore.hydrate()
	})

	it('初期値は両方 ON', () => {
		expect(settingsStore.getState()).toEqual({ soundEnabled: true, hapticsEnabled: true })
	})

	it('setSoundEnabled が状態と AsyncStorage を更新する', async () => {
		await settingsStore.setSoundEnabled(false)
		expect(settingsStore.getState().soundEnabled).toBe(false)
		expect(await AsyncStorage.getItem('waipa.settings')).toContain('"soundEnabled":false')
	})

	it('hydrate が保存済み設定を復元する', async () => {
		await AsyncStorage.setItem(
			'waipa.settings',
			JSON.stringify({ soundEnabled: false, hapticsEnabled: false }),
		)
		await settingsStore.hydrate()
		expect(settingsStore.getState()).toEqual({ soundEnabled: false, hapticsEnabled: false })
	})

	it('subscribe で変更通知を受け取れる', async () => {
		const listener = jest.fn()
		const unsubscribe = settingsStore.subscribe(listener)
		await settingsStore.setHapticsEnabled(false)
		expect(listener).toHaveBeenCalled()
		unsubscribe()
	})
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test src/lib`
Expected: FAIL（`../settings-store` が存在しない）

- [ ] **Step 3: settings-store.ts を実装**

`src/lib/settings-store.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'waipa.settings'

export type SettingsState = {
	soundEnabled: boolean
	hapticsEnabled: boolean
}

const DEFAULTS: SettingsState = { soundEnabled: true, hapticsEnabled: true }

let state: SettingsState = { ...DEFAULTS }
const listeners = new Set<() => void>()

function emit() {
	listeners.forEach((fn) => fn())
}

async function persist() {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const settingsStore = {
	getState(): SettingsState {
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
	async setSoundEnabled(v: boolean) {
		state = { ...state, soundEnabled: v }
		emit()
		await persist()
	},
	async setHapticsEnabled(v: boolean) {
		state = { ...state, hapticsEnabled: v }
		emit()
		await persist()
	},
}

export function useSettings(): SettingsState {
	return useSyncExternalStore(settingsStore.subscribe, settingsStore.getState, settingsStore.getState)
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `bun run test src/lib`
Expected: PASS（4 tests）

- [ ] **Step 5: typecheck / lint / commit**

```bash
bun run typecheck && bun run lint
git add -A && git commit -m "feat: 効果音・バイブ設定の永続化ストアを追加 (#2)"
```

---

### Task 3: Haptics・サウンドユーティリティ

**Files:**
- Create: `src/lib/haptics.ts`
- Create: `src/lib/sound.ts`
- Create: `src/lib/__tests__/haptics.test.ts`

**Interfaces:**
- Consumes: `settingsStore.getState()`（Task 2）
- Produces: `haptics.tap(): Promise<void>`、`haptics.success(): Promise<void>`、`haptics.heavy(): Promise<void>`、`registerSound(name: string, source: number): void`、`playSound(name: string): void`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/__tests__/haptics.test.ts`:

```ts
import * as ExpoHaptics from 'expo-haptics'
import { haptics } from '../haptics'
import { settingsStore } from '../settings-store'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	notificationAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
}))

describe('haptics', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('設定 ON のとき impactAsync を呼ぶ', async () => {
		await settingsStore.setHapticsEnabled(true)
		await haptics.tap()
		expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith('light')
	})

	it('設定 OFF のとき何も呼ばない', async () => {
		await settingsStore.setHapticsEnabled(false)
		await haptics.tap()
		await haptics.success()
		await haptics.heavy()
		expect(ExpoHaptics.impactAsync).not.toHaveBeenCalled()
		expect(ExpoHaptics.notificationAsync).not.toHaveBeenCalled()
	})
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test src/lib/__tests__/haptics.test.ts`
Expected: FAIL（`../haptics` が存在しない）

- [ ] **Step 3: haptics.ts を実装**

`src/lib/haptics.ts`:

```ts
import * as ExpoHaptics from 'expo-haptics'
import { settingsStore } from './settings-store'

// 設定 OFF 時は何もしない。ゲーム演出からは haptics.* だけを呼ぶこと
export const haptics = {
	async tap() {
		if (!settingsStore.getState().hapticsEnabled) return
		await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light)
	},
	async heavy() {
		if (!settingsStore.getState().hapticsEnabled) return
		await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy)
	},
	async success() {
		if (!settingsStore.getState().hapticsEnabled) return
		await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success)
	},
}
```

- [ ] **Step 4: sound.ts を実装（音源は後日追加のためレジストリ方式・未登録は無音でスキップ）**

`src/lib/sound.ts`:

```ts
import { createAudioPlayer, type AudioPlayer } from 'expo-audio'
import { settingsStore } from './settings-store'

const players = new Map<string, AudioPlayer>()

// 起動時に app/_layout.tsx から registerSound('tap', require('@assets/sounds/tap.mp3')) の形で登録する
export function registerSound(name: string, source: number) {
	if (players.has(name)) return
	players.set(name, createAudioPlayer(source))
}

export function playSound(name: string) {
	if (!settingsStore.getState().soundEnabled) return
	const player = players.get(name)
	if (!player) return // 未登録音源は無音でスキップ（クラッシュさせない）
	player.seekTo(0)
	player.play()
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `bun run test src/lib`
Expected: PASS（settings 4 + haptics 2 tests）

- [ ] **Step 6: typecheck / lint / commit**

```bash
bun run typecheck && bun run lint
git add -A && git commit -m "feat: Haptics・サウンドユーティリティを追加 (#2)"
```

---

### Task 4: GradientButton・PillButton

**Files:**
- Create: `src/components/ui/gradient-button.tsx`
- Create: `src/components/ui/pill-button.tsx`
- Create: `src/components/ui/__tests__/buttons.test.tsx`

**Interfaces:**
- Consumes: `colors/spacing/radii/typography`（Task 1）、`haptics.tap`（Task 3）
- Produces: `<GradientButton title onPress disabled? />`、`<PillButton title onPress icon? />`

- [ ] **Step 1: 失敗するテストを書く**

`src/components/ui/__tests__/buttons.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import { GradientButton } from '../gradient-button'
import { PillButton } from '../pill-button'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))

describe('GradientButton', () => {
	it('タイトルを表示し、タップで onPress が呼ばれる', () => {
		const onPress = jest.fn()
		const { getByText } = render(<GradientButton title="アップグレード" onPress={onPress} />)
		fireEvent.press(getByText('アップグレード'))
		expect(onPress).toHaveBeenCalledTimes(1)
	})

	it('disabled のとき onPress が呼ばれない', () => {
		const onPress = jest.fn()
		const { getByText } = render(<GradientButton title="実行" onPress={onPress} disabled />)
		fireEvent.press(getByText('実行'))
		expect(onPress).not.toHaveBeenCalled()
	})
})

describe('PillButton', () => {
	it('タイトルを表示し、タップで onPress が呼ばれる', () => {
		const onPress = jest.fn()
		const { getByText } = render(<PillButton title="👑 プレミアム" onPress={onPress} />)
		fireEvent.press(getByText('👑 プレミアム'))
		expect(onPress).toHaveBeenCalledTimes(1)
	})
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test src/components`
Expected: FAIL（コンポーネントが存在しない）

- [ ] **Step 3: gradient-button.tsx を実装**

`src/components/ui/gradient-button.tsx`:

```tsx
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	title: string
	onPress: () => void
	disabled?: boolean
}

// 参考スクショの「アップグレード」ボタン相当。主要アクション全般に使う
export function GradientButton({ title, onPress, disabled = false }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			disabled={disabled}
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => [styles.pressable, (pressed || disabled) && styles.dimmed]}
		>
			<LinearGradient
				colors={[colors.accentFrom, colors.accentTo]}
				start={{ x: 0, y: 0.5 }}
				end={{ x: 1, y: 0.5 }}
				style={styles.gradient}
			>
				<Text style={styles.title}>{title}</Text>
			</LinearGradient>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	pressable: { borderRadius: radii.md, overflow: 'hidden' },
	dimmed: { opacity: 0.6 },
	gradient: { paddingVertical: spacing.md, alignItems: 'center', borderRadius: radii.md },
	title: { ...typography.body, fontWeight: '700' },
})
```

- [ ] **Step 4: pill-button.tsx を実装**

`src/components/ui/pill-button.tsx`:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	title: string
	onPress: () => void
}

// ヘッダーの「👑 プレミアム」等、枠線ピル型の小ボタン
export function PillButton({ title, onPress }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
		>
			<Text style={styles.title}>{title}</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	pill: {
		borderRadius: radii.pill,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		backgroundColor: colors.surface,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	pressed: { opacity: 0.7 },
	title: { ...typography.body, fontSize: 14, fontWeight: '600' },
})
```

- [ ] **Step 5: テストが通ることを確認**

Run: `bun run test src/components`
Expected: PASS（3 tests）

- [ ] **Step 6: typecheck / lint / commit**

```bash
bun run typecheck && bun run lint
git add -A && git commit -m "feat: GradientButton / PillButton を追加 (#2)"
```

---

### Task 5: Card・SectionHeader・SettingToggleRow・ChevronRow

**Files:**
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/section-header.tsx`
- Create: `src/components/ui/setting-toggle-row.tsx`
- Create: `src/components/ui/chevron-row.tsx`
- Create: `src/components/ui/__tests__/rows.test.tsx`

**Interfaces:**
- Consumes: `colors/spacing/radii/typography`（Task 1）、`haptics.tap`（Task 3）
- Produces: `<Card children style? />`、`<SectionHeader title />`、`<SettingToggleRow icon label value onValueChange />`、`<ChevronRow icon label onPress />`

- [ ] **Step 1: 失敗するテストを書く**

`src/components/ui/__tests__/rows.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Card } from '../card'
import { ChevronRow } from '../chevron-row'
import { SectionHeader } from '../section-header'
import { SettingToggleRow } from '../setting-toggle-row'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))

it('Card が children を描画する', () => {
	const { getByText } = render(
		<Card>
			<Text>中身</Text>
		</Card>,
	)
	expect(getByText('中身')).toBeTruthy()
})

it('SectionHeader がタイトルを描画する', () => {
	const { getByText } = render(<SectionHeader title="ゲーム一覧" />)
	expect(getByText('ゲーム一覧')).toBeTruthy()
})

it('SettingToggleRow のスイッチ操作で onValueChange が呼ばれる', () => {
	const onValueChange = jest.fn()
	const { getByRole } = render(
		<SettingToggleRow icon="🔊" label="効果音" value={true} onValueChange={onValueChange} />,
	)
	fireEvent(getByRole('switch'), 'valueChange', false)
	expect(onValueChange).toHaveBeenCalledWith(false)
})

it('ChevronRow のタップで onPress が呼ばれる', () => {
	const onPress = jest.fn()
	const { getByText } = render(<ChevronRow icon="⭐" label="レビューを書く" onPress={onPress} />)
	fireEvent.press(getByText('レビューを書く'))
	expect(onPress).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test src/components/ui/__tests__/rows.test.tsx`
Expected: FAIL（コンポーネントが存在しない）

- [ ] **Step 3: card.tsx / section-header.tsx を実装**

`src/components/ui/card.tsx`:

```tsx
import type { PropsWithChildren } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { colors, radii, spacing } from '@/theme/tokens'

type Props = PropsWithChildren<{ style?: ViewStyle }>

// サーフェス色＋薄枠＋大きめ角丸の基本カード（ゲームカード・設定カード共通の土台）
export function Card({ children, style }: Props) {
	return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.surface,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		padding: spacing.md,
	},
})
```

`src/components/ui/section-header.tsx`:

```tsx
import { StyleSheet, Text } from 'react-native'
import { spacing, typography } from '@/theme/tokens'

// 「ゲーム一覧」「設定」等のセクション見出し
export function SectionHeader({ title }: { title: string }) {
	return <Text style={styles.title}>{title}</Text>
}

const styles = StyleSheet.create({
	title: { ...typography.title, marginVertical: spacing.md },
})
```

- [ ] **Step 4: setting-toggle-row.tsx / chevron-row.tsx を実装**

`src/components/ui/setting-toggle-row.tsx`:

```tsx
import { StyleSheet, Switch, Text, View } from 'react-native'
import { colors, spacing, typography } from '@/theme/tokens'

type Props = {
	icon: string
	label: string
	value: boolean
	onValueChange: (v: boolean) => void
}

// 設定画面の「効果音」「バイブレーション」行（参考スクショ準拠）
export function SettingToggleRow({ icon, label, value, onValueChange }: Props) {
	return (
		<View style={styles.row}>
			<Text style={styles.icon}>{icon}</Text>
			<Text style={styles.label}>{label}</Text>
			<Switch
				accessibilityRole="switch"
				value={value}
				onValueChange={onValueChange}
				trackColor={{ true: colors.success, false: colors.surfaceBorder }}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
	icon: { fontSize: 20, marginRight: spacing.md },
	label: { ...typography.body, flex: 1 },
})
```

`src/components/ui/chevron-row.tsx`:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { colors, spacing, typography } from '@/theme/tokens'

type Props = {
	icon: string
	label: string
	onPress: () => void
}

// 設定画面の「購入を復元する」「レビューを書く」等の遷移行
export function ChevronRow({ icon, label, onPress }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => [styles.row, pressed && styles.pressed]}
		>
			<Text style={styles.icon}>{icon}</Text>
			<Text style={styles.label}>{label}</Text>
			<Text style={styles.chevron}>›</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
	pressed: { opacity: 0.7 },
	icon: { fontSize: 20, marginRight: spacing.md },
	label: { ...typography.body, flex: 1 },
	chevron: { fontSize: 22, color: colors.textMuted },
})
```

- [ ] **Step 5: テストが通ることを確認**

Run: `bun run test src/components`
Expected: PASS（buttons 3 + rows 4 tests）

- [ ] **Step 6: typecheck / lint / commit**

```bash
bun run typecheck && bun run lint
git add -A && git commit -m "feat: Card / SectionHeader / 設定行コンポーネントを追加 (#2)"
```

---

### Task 6: ギャラリー画面（開発ビルド限定）＋総仕上げ

**Files:**
- Create: `src/app/gallery.tsx`
- Modify: `src/app/index.tsx`（ギャラリーへの導線を開発ビルド時のみ表示）

**Interfaces:**
- Consumes: Task 1〜5 の全コンポーネント・ユーティリティ

- [ ] **Step 1: gallery.tsx を実装**

`src/app/gallery.tsx`:

```tsx
import { Redirect } from 'expo-router'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Card } from '@/components/ui/card'
import { ChevronRow } from '@/components/ui/chevron-row'
import { GradientButton } from '@/components/ui/gradient-button'
import { PillButton } from '@/components/ui/pill-button'
import { SectionHeader } from '@/components/ui/section-header'
import { SettingToggleRow } from '@/components/ui/setting-toggle-row'
import { haptics } from '@/lib/haptics'
import { settingsStore, useSettings } from '@/lib/settings-store'
import { playSound } from '@/lib/sound'
import { colors, spacing } from '@/theme/tokens'
import { ThemedText } from '@/components/themed-text'

// デザインシステム確認用ギャラリー。本番ビルドではアクセス不可
export default function GalleryScreen() {
	const settings = useSettings()

	if (!__DEV__) {
		return <Redirect href="/" />
	}

	return (
		<ScrollView style={styles.screen} contentContainerStyle={styles.content}>
			<SectionHeader title="ボタン" />
			<GradientButton title="アップグレード" onPress={() => playSound('tap')} />
			<View style={styles.gap} />
			<GradientButton title="無効状態" onPress={() => {}} disabled />
			<View style={styles.gap} />
			<PillButton title="👑 プレミアム" onPress={() => haptics.success()} />

			<SectionHeader title="カード" />
			<Card>
				<ThemedText>サーフェス #211D3A / 枠線 #332E52 / 角丸 24</ThemedText>
			</Card>

			<SectionHeader title="設定行" />
			<Card>
				<SettingToggleRow
					icon="🔊"
					label="効果音"
					value={settings.soundEnabled}
					onValueChange={(v) => settingsStore.setSoundEnabled(v)}
				/>
				<SettingToggleRow
					icon="📳"
					label="バイブレーション"
					value={settings.hapticsEnabled}
					onValueChange={(v) => settingsStore.setHapticsEnabled(v)}
				/>
				<ChevronRow icon="⭐" label="レビューを書く" onPress={() => haptics.heavy()} />
			</Card>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	content: { padding: spacing.md, paddingBottom: spacing.xl },
	gap: { height: spacing.sm },
})
```

- [ ] **Step 2: 起動時ハイドレーションを _layout.tsx に追加**

`src/app/_layout.tsx` のルートコンポーネント内（既存の return より前）に追加:

```tsx
import { useEffect } from 'react'
import { settingsStore } from '@/lib/settings-store'

// 既存コンポーネント内:
useEffect(() => {
	settingsStore.hydrate()
}, [])
```

- [ ] **Step 3: 全テスト・検証を実行**

```bash
bun run test && bun run typecheck && bun run lint && bunx prettier --check .
bunx expo export --platform web && rm -rf dist
```

Expected: すべて成功（テスト 13 件パス）

- [ ] **Step 4: 実機確認（可能なら）**

Run: `bun run ios`（シミュレータ）で `/gallery` を開き、グラデボタン・トグル・Haptics を目視確認
確認後スクリーンショットを PR に添付

- [ ] **Step 5: Commit & PR**

```bash
git add -A && git commit -m "feat: デザインギャラリー画面を追加 (#2)"
git push -u origin feature/2-design-system
gh pr create --base develop --title "feat: デザインシステム＆共通UIコンポーネント (#2)" --body "Closes #2"
```

---

## Self-Review 済みチェック

- Issue #2 受け入れ条件との対応: カラートークン=Task 1 / タイポ・角丸・スペーシング=Task 1 / GradientButton・Card・PillButton・SectionHeader・Toggle行・ChevronRow=Task 4-5 / 効果音＋Haptics（設定でON/OFF可）=Task 2-3 / 確認画面（開発ビルド限定）=Task 6
- 型整合: `settingsStore` の API 名は Task 2 定義と Task 3/6 の使用箇所で一致（`getState/subscribe/hydrate/setSoundEnabled/setHapticsEnabled`）
- 未定義参照なし: `ThemedText` は既存テンプレート由来（`src/components/themed-text.tsx` 存在確認済み）
- 音源アセット（mp3）は未調達のため sound.ts はレジストリ方式で無音フォールバック（#基盤4 で素材追加時に `registerSound` を呼ぶ）
