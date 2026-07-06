# WaiPa ホーム画面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 参考スクショ準拠のホーム画面（ヘッダー＋ヒーローバナー＋ゲーム一覧2列グリッド）を実装し、Expo テンプレートのデモ画面・タブを撤去する（Issue #3）。設定画面は骨組みのみ同梱（完全版は #5）。

**Architecture:** タブ廃止・単画面構成（brainstorming 決定）。ルートは `index`（ホーム）/ `settings`（骨組み）/ `gallery`（既存・dev）/ `game/[id]`（既存）を root Stack に平置き。ホームはレジストリ（`@/games/registry`）駆動の2列グリッドで、カードは「テーマ色グラデ＋絵文字＋タイトル」＋下にキャッチコピー（決定済みの仮組方式）。ヒーローバナーはブランド1枚（カルーセル機構は入れず、複数枚化する時に ScrollView 化する。ドット1個は視覚的整合のため表示）。

**Tech Stack:** 既存依存のみ。**新規依存の追加は禁止。**

## Global Constraints

- フォーマット: タブインデント幅4・セミコロンなし・シングルクォート（`.prettierrc` が正）
- 色は `@/theme/tokens` を使用（ゲームカードのグラデはレジストリの `game.gradient` を使用 — 例外として許容）
- **RNTL v14: `render()` は async**（`await render(...)`）。expo-router のモックは各テストの先頭で `jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }))` 形式
- ナビゲーションは typedRoutes 有効のためオブジェクト形式（`router.push({ pathname: '/game/[id]', params: { id } })`）。静的ルートは `router.push('/settings')` で可
- ダークテーマ固定・UI 文言は日本語・アプリ名表記は「WaiPa」
- 各タスク完了時 `bun run test && bun run typecheck && bun run lint` がパスすること
- コミットは `feat:`/`chore:` プレフィックス＋日本語、末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: GameCard＋GameGrid

**Files:**

- Create: `src/components/home/game-card.tsx`
- Create: `src/components/home/game-grid.tsx`
- Create: `src/components/home/__tests__/game-grid.test.tsx`

**Interfaces:**

- Consumes: `games/GameMeta`（`@/games/registry`）、`haptics.tap`、トークン
- Produces: `<GameCard game onPress />`、`<GameGrid />`（レジストリ全件を2列で描画、タップで `/game/[id]` へ）

- [ ] **Step 1: 失敗するテストを書く**

`src/components/home/__tests__/game-grid.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import { router } from 'expo-router'
import { games } from '@/games/registry'
import { GameGrid } from '../game-grid'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }))
jest.mock('expo-linear-gradient', () => {
	const { View } = require('react-native')
	return { LinearGradient: View }
})

it('レジストリの全ゲームがカード表示される', async () => {
	const { getByText } = await render(<GameGrid />)
	for (const g of games) {
		expect(getByText(g.title)).toBeTruthy()
		expect(getByText(g.tagline)).toBeTruthy()
	}
})

it('カードタップで該当ゲームへ遷移する', async () => {
	const { getByText } = await render(<GameGrid />)
	fireEvent.press(getByText('BOMB!! 2/16'))
	expect(router.push).toHaveBeenCalledWith({
		pathname: '/game/[id]',
		params: { id: 'bomb-2-16' },
	})
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test src/components/home`
Expected: FAIL（コンポーネントが存在しない）

- [ ] **Step 3: game-card.tsx を実装**

```tsx
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { GameMeta } from '@/games/registry'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	game: GameMeta
	onPress: () => void
}

// ゲーム一覧のカード。サムネ画像が用意されるまでテーマ色グラデ＋絵文字で仮組（決定事項）
export function GameCard({ game, onPress }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [styles.container, pressed && styles.pressed]}
		>
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
			<Text style={styles.tagline} numberOfLines={2}>
				{game.tagline}
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: { width: '48%', marginBottom: spacing.lg },
	pressed: { opacity: 0.8 },
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
	emoji: { fontSize: 40 },
	title: { ...typography.body, fontWeight: '800', textAlign: 'center' },
	tagline: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
})
```

- [ ] **Step 4: game-grid.tsx を実装**

```tsx
import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { games } from '@/games/registry'
import { haptics } from '@/lib/haptics'
import { GameCard } from './game-card'

// レジストリ駆動の2列グリッド。ゲーム追加はレジストリに足すだけで反映される
export function GameGrid() {
	return (
		<View style={styles.grid}>
			{games.map((game) => (
				<GameCard
					key={game.id}
					game={game}
					onPress={() => {
						haptics.tap()
						router.push({ pathname: '/game/[id]', params: { id: game.id } })
					}}
				/>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
})
```

- [ ] **Step 5: テスト・typecheck / lint / commit**

```bash
bun run test src/components/home && bun run typecheck && bun run lint
git add -A && git commit -m "feat: ゲーム一覧グリッドとゲームカードを追加 (#3)"
```

---

### Task 2: HomeHeader＋HeroBanner

**Files:**

- Create: `src/components/home/home-header.tsx`
- Create: `src/components/home/hero-banner.tsx`
- Create: `src/components/home/__tests__/home-header.test.tsx`

**Interfaces:**

- Consumes: `PillButton`、`haptics.tap`、トークン
- Produces: `<HomeHeader />`（左=WaiPa ロゴ / 右=👑プレミアム＋≡、どちらも `/settings` へ）、`<HeroBanner />`（ブランドバナー1枚＋ドット）

- [ ] **Step 1: 失敗するテストを書く**

`src/components/home/__tests__/home-header.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import { router } from 'expo-router'
import { HeroBanner } from '../hero-banner'
import { HomeHeader } from '../home-header'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }))
jest.mock('expo-linear-gradient', () => {
	const { View } = require('react-native')
	return { LinearGradient: View }
})

it('ロゴとプレミアムボタンとメニューが表示される', async () => {
	const { getByText, getByLabelText } = await render(<HomeHeader />)
	expect(getByText('WaiPa')).toBeTruthy()
	expect(getByText('👑 プレミアム')).toBeTruthy()
	expect(getByLabelText('メニュー')).toBeTruthy()
})

it('プレミアムボタンとメニューで設定へ遷移する', async () => {
	const { getByText, getByLabelText } = await render(<HomeHeader />)
	fireEvent.press(getByText('👑 プレミアム'))
	fireEvent.press(getByLabelText('メニュー'))
	expect(router.push).toHaveBeenCalledTimes(2)
	expect(router.push).toHaveBeenCalledWith('/settings')
})

it('ヒーローバナーにキャッチコピーが表示される', async () => {
	const { getByText } = await render(<HeroBanner />)
	expect(getByText('WAIPA GAME')).toBeTruthy()
	expect(getByText('スマホ1台で、みんなでワイワイ')).toBeTruthy()
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test src/components/home/__tests__/home-header.test.tsx`
Expected: FAIL

- [ ] **Step 3: home-header.tsx を実装**

```tsx
import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { PillButton } from '@/components/ui/pill-button'
import { haptics } from '@/lib/haptics'
import { colors, spacing, typography } from '@/theme/tokens'

// ホームのヘッダー。プレミアム導線・メニューはどちらも設定画面へ（ペイウォールは #7 で差し替え）
export function HomeHeader() {
	return (
		<View style={styles.row}>
			<Text style={styles.logo}>WaiPa</Text>
			<View style={styles.right}>
				<PillButton title="👑 プレミアム" onPress={() => router.push('/settings')} />
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="メニュー"
					onPress={() => {
						haptics.tap()
						router.push('/settings')
					}}
					style={styles.menuBtn}
				>
					<Text style={styles.menuIcon}>≡</Text>
				</Pressable>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: spacing.sm,
	},
	logo: { ...typography.title, fontSize: 26, fontWeight: '800' },
	right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
	menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
	menuIcon: { fontSize: 26, color: colors.text },
})
```

- [ ] **Step 4: hero-banner.tsx を実装**

```tsx
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme/tokens'

// ブランドバナー（1枚固定）。複数枚化する際は横 ScrollView ページングに置き換える
export function HeroBanner() {
	return (
		<View>
			<LinearGradient
				colors={[colors.accentFrom, colors.accentTo]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.banner}
			>
				<Text style={styles.kicker}>PARTY MINI GAMES</Text>
				<Text style={styles.title}>WAIPA GAME</Text>
				<Text style={styles.subtitle}>スマホ1台で、みんなでワイワイ</Text>
			</LinearGradient>
			<View style={styles.dots}>
				<View style={styles.dotActive} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	banner: {
		borderRadius: radii.lg,
		padding: spacing.lg,
		minHeight: 150,
		justifyContent: 'flex-end',
		gap: spacing.xs,
	},
	kicker: { ...typography.caption, color: colors.text, letterSpacing: 2 },
	title: { ...typography.hero, fontSize: 36, fontStyle: 'italic' },
	subtitle: { ...typography.body, fontWeight: '600' },
	dots: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
	dotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text },
})
```

- [ ] **Step 5: テスト・typecheck / lint / commit**

```bash
bun run test src/components/home && bun run typecheck && bun run lint
git add -A && git commit -m "feat: ホームヘッダーとヒーローバナーを追加 (#3)"
```

---

### Task 3: 設定画面（骨組み）

**Files:**

- Create: `src/app/settings.tsx`
- Modify: `src/app/_layout.tsx`（Stack に `settings` を追加）
- Create: `src/app/__tests__/settings.test.tsx`

**Interfaces:**

- Consumes: `SectionHeader`/`Card`/`SettingToggleRow`、`settingsStore/useSettings`
- Produces: ルート `/settings`（効果音・バイブのトグルのみ。完全版は #5）

- [ ] **Step 1: 失敗するテストを書く**

`src/app/__tests__/settings.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { settingsStore } from '@/lib/settings-store'
import SettingsScreen from '../settings'

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
	await settingsStore.hydrate()
})

it('効果音とバイブレーションのトグルが表示される', async () => {
	const { getByText } = await render(<SettingsScreen />)
	expect(getByText('効果音')).toBeTruthy()
	expect(getByText('バイブレーション')).toBeTruthy()
})

it('トグル操作でストアが更新される', async () => {
	const { getAllByRole } = await render(<SettingsScreen />)
	fireEvent(getAllByRole('switch')[0], 'valueChange', false)
	expect(settingsStore.getState().soundEnabled).toBe(false)
})
```

- [ ] **Step 2: テストが落ちることを確認 → settings.tsx を実装**

`src/app/settings.tsx`:

```tsx
import { ScrollView, StyleSheet, Text } from 'react-native'
import { Card } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/section-header'
import { SettingToggleRow } from '@/components/ui/setting-toggle-row'
import { settingsStore, useSettings } from '@/lib/settings-store'
import { colors, spacing, typography } from '@/theme/tokens'

// 設定画面の骨組み。プレミアム誘導カード・購入復元等の完全版は #5 で実装
export default function SettingsScreen() {
	const settings = useSettings()

	return (
		<ScrollView style={styles.screen} contentContainerStyle={styles.content}>
			<SectionHeader title="設定" />
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
			</Card>
			<Text style={styles.note}>プレミアム・言語設定などは準備中です</Text>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	content: { padding: spacing.md, paddingBottom: spacing.xl },
	note: { ...typography.caption, textAlign: 'center', marginTop: spacing.lg },
})
```

`src/app/_layout.tsx` の Stack（gallery の Screen の後）に追加:

```tsx
<Stack.Screen
	name="settings"
	options={{
		headerShown: true,
		title: '設定とアクティビティ',
		headerStyle: { backgroundColor: colors.background },
		headerTintColor: colors.text,
	}}
/>
```

- [ ] **Step 3: テスト・typecheck / lint / commit**

```bash
bun run test src/app && bun run typecheck && bun run lint
git add -A && git commit -m "feat: 設定画面の骨組みを追加 (#3)"
```

---

### Task 4: ホーム統合＋タブ・デモ撤去

**Files:**

- Create: `src/app/index.tsx`（新ホーム）
- Modify: `src/app/_layout.tsx`（`(tabs)` → `index` に変更）
- Delete: `src/app/(tabs)/`（_layout / index / explore）
- Delete: 参照が消えるデモ部品・資産（下記手順で安全に）
- Modify: `package.json`（壊れた `reset-project` script を削除）

- [ ] **Step 1: 新ホーム src/app/index.tsx を実装**

```tsx
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import { GameGrid } from '@/components/home/game-grid'
import { HeroBanner } from '@/components/home/hero-banner'
import { HomeHeader } from '@/components/home/home-header'
import { SectionHeader } from '@/components/ui/section-header'
import { colors, spacing, typography } from '@/theme/tokens'

export default function HomeScreen() {
	const insets = useSafeAreaInsets()

	return (
		<View style={[styles.screen, { paddingTop: insets.top }]}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<HomeHeader />
				<HeroBanner />
				<SectionHeader title="ゲーム一覧" />
				<GameGrid />
				{__DEV__ && (
					<Link href="/gallery" style={styles.devLink}>
						デザインギャラリー
					</Link>
				)}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
	devLink: { ...typography.caption, textAlign: 'center', marginTop: spacing.lg },
})
```

- [ ] **Step 2: \_layout.tsx のルート構成を更新**

`<Stack.Screen name="(tabs)" />` を `<Stack.Screen name="index" />` に置き換え（他の Screen は維持）。

- [ ] **Step 3: 旧画面・デモ部品を安全に削除**

```bash
git rm -r "src/app/(tabs)"
```

その後、参照が消えたファイルを削除する。**必ず削除前に `grep -r "<ファイル名>" src` で参照ゼロを確認**し、ゼロのものだけ削除:

- 候補コンポーネント: `app-tabs.tsx` / `app-tabs.web.tsx` / `web-badge.tsx` / `hint-row.tsx` / `external-link.tsx` / `ui/collapsible.tsx`
- 注意: `animated-icon.*`（root _layout のスプラッシュで使用中）、`themed-text/themed-view`（gallery で使用中）、`use-theme` / `use-color-scheme*` / `constants/theme.ts`（上記が参照）は**残す**
- 資産: `assets/images/` の `react-logo*` / `expo-badge*` / `expo-logo.png` / `tutorial-web.png` / `tabIcons/` を削除（`icon.png` / `android-icon-*` / `splash-icon.png` / `favicon.png` / `logo-glow.png` / `expo.icon/` は使用中につき残す。削除前に grep で確認）
- `package.json` の scripts から `reset-project` を削除（参照先 `scripts/` が存在しない壊れたエントリ）

- [ ] **Step 4: 全検証**

```bash
bun run test && bun run typecheck && bun run lint && bunx prettier --check .
bunx expo export --platform web && rm -rf dist
```

Expected: 全テストパス、export のルートが `/`（index）/ `/settings` / `/gallery` / `/game/[id]` になっている（`(tabs)` と `/explore` が消えている）

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: ホーム画面を実装しテンプレートのタブ・デモ画面を撤去 (#3)"
```

---

## Self-Review 済みチェック

- Issue #3 受け入れ条件との対応: ヘッダー（ロゴ/👑プレミアム/ハンバーガー）=Task 2 / ヒーローバナー（1枚＋ドット、複数化はカルーセル置換で対応）=Task 2 / ゲーム一覧2列グリッド（レジストリ自動連動）=Task 1 / カードタップで遷移=Task 1（`/game/[id]` は #4 で実装済み）/ ハンバーガー→設定=Task 2+3
- brainstorming 決定の反映: バナー1枚のみ / タブ廃止 / 設定は骨組み
- 型整合: GameGrid→GameCard は Task 1 内で完結。HomeHeader/HeroBanner は独立。settings は既存 ui 部品のみ使用
- 削除安全策: Task 4 Step 3 で grep 確認を必須化（animated-icon 等の誤削除防止）
