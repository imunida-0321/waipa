# Liquid Glass UI フェーズ1 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WaiPa の共通 UI・主要画面・モーダル群に Liquid Glass（iOS 26 ネイティブ）＋ blur/疑似ガラスフォールバックを導入する。

**Architecture:** ガラス描画は `GlassSurface` 1コンポーネントに集約（native / blur / pseudo の3分岐、判定はモジュール読込時1回）。透け感の土台として各画面に静的ネオンブロブ背景 `AppBackground` を敷く。既存コンポーネントは土台 View を `GlassSurface` に差し替えるだけで波及させる。

**Tech Stack:** Expo SDK 57 / expo-glass-effect（導入済み）/ expo-blur（本計画で追加）/ react-native-svg（導入済み）/ Jest + jest-expo + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-07-20-liquid-glass-ui-design.md`

## Global Constraints

- コードフォーマット: タブインデント・セミコロンなし・シングルクォート（既存コードに準拠）
- TDD 必須: RED（失敗するテスト＋失敗ログ確認）→ GREEN（最小実装＋パス確認）。テストを実装に合わせて書き換えない。`.skip` / `.only` / テストでの `any` 禁止
- テストは既存規約に従う: `await render(...)` 形式・テスト名は日本語・`jest.mock` はファイル先頭
- テスト実行: `npx jest <path>`（個別）/ `npx jest`（全体）
- 作業ブランチ: `feat/liquid-glass-ui`（スペックコミットを含む `docs/liquid-glass-ui-design` から作成）
- コミットメッセージ末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Android の BlurView は1画面1枚ルール: 常設 UI（variant `card`）では blur を使わない
- 疑似ガラスの塗り不透明度は 0.72 を下回らない（白文字コントラスト維持）
- `gradient-button` はガラス化しない（主要 CTA の視認性優先）
- ヒーローバナーはグラデ面のためガラス化対象外（スペック「バナー内の画像はそのまま」の適用）

---

### Task 0: 作業ブランチの作成

**Files:** なし（git 操作のみ）

- [ ] **Step 1: ブランチ作成**

```bash
git checkout docs/liquid-glass-ui-design
git checkout -b feat/liquid-glass-ui
```

Run: `git branch --show-current`
Expected: `feat/liquid-glass-ui`

---

### Task 1: glass テーマトークン

**Files:**
- Modify: `src/theme/tokens.ts`（末尾に `glass` を追加）
- Test: `src/theme/__tests__/glass-tokens.test.ts`（新規）

**Interfaces:**
- Produces: `export const glass = { fallbackFill: string, borderHighlight: string, blurIntensity: number, tint: string }`（以降の全タスクが `@/theme/tokens` から import する）

- [ ] **Step 1: 失敗するテストを書く**

`src/theme/__tests__/glass-tokens.test.ts` を新規作成:

```ts
import { glass } from '../tokens'

describe('glass トークン', () => {
	it('疑似ガラスの塗りは不透明度 0.72 を下回らない', () => {
		expect(glass.fallbackFill).toBe('rgba(33, 29, 58, 0.72)')
	})

	it('ハイライト枠線・blur 強度・紫ティントを定義する', () => {
		expect(glass.borderHighlight).toBe('rgba(255, 255, 255, 0.14)')
		expect(glass.blurIntensity).toBe(40)
		expect(glass.tint).toBe('rgba(123, 92, 250, 0.10)')
	})
})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx jest src/theme/__tests__/glass-tokens.test.ts`
Expected: FAIL（`glass` が tokens.ts に存在しない）

- [ ] **Step 3: 最小実装**

`src/theme/tokens.ts` の `typography` の後（ファイル末尾）に追加:

```ts
// Liquid Glass / ガラスモーフィズム用トークン。
// fallbackFill の不透明度 0.72 は白文字コントラストの下限保証（下げない）
export const glass = {
	fallbackFill: 'rgba(33, 29, 58, 0.72)',
	borderHighlight: 'rgba(255, 255, 255, 0.14)',
	blurIntensity: 40,
	tint: 'rgba(123, 92, 250, 0.10)',
} as const
```

- [ ] **Step 4: パスを確認する**

Run: `npx jest src/theme`
Expected: PASS（既存の theme テスト含め全パス）

- [ ] **Step 5: コミット**

```bash
git add src/theme/tokens.ts src/theme/__tests__/glass-tokens.test.ts
git commit -m "feat: glass テーマトークンを追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: GlassSurface コンポーネント（expo-blur 導入・モック含む）

**Files:**
- Create: `src/components/ui/glass-surface.tsx`
- Create: `__mocks__/expo-glass-effect.tsx`
- Create: `__mocks__/expo-blur.tsx`
- Modify: `package.json`（expo-blur 追加。`bunx expo install` が行う）
- Test: `src/components/ui/__tests__/glass-surface.test.tsx`（新規）

**Interfaces:**
- Consumes: `glass`, `radii`（`@/theme/tokens`）
- Produces:
  - `export function GlassSurface(props: PropsWithChildren<{ style?: StyleProp<ViewStyle>; variant?: 'card' | 'overlay' }>): JSX.Element` — variant 省略時は `'card'`
  - `export function resolveGlassMode(variant: 'card' | 'overlay', env?: { liquidGlass: boolean; os: typeof Platform.OS }): 'native' | 'blur' | 'pseudo'`
  - 描画ルートの testID: `glass-surface-native` / `glass-surface-blur` / `glass-surface-pseudo`（テストはこれで分岐を検証する）

- [ ] **Step 1: expo-blur を導入する**

```bash
bunx expo install expo-blur
```

Run: `grep expo-blur package.json`
Expected: `"expo-blur": "~57.x.x"` の行が出る

- [ ] **Step 2: Jest 用モックを作る**

Jest（jest-expo の iOS プラットフォーム）では expo-glass-effect / expo-blur のネイティブ実装がないため、`node_modules` 隣接の `__mocks__/` で自動モックする（既存の `react-native-purchases.ts` 等と同じ方式）。

`__mocks__/expo-glass-effect.tsx` を新規作成:

```tsx
import { View, type ViewProps } from 'react-native'

// Jest には Liquid Glass のネイティブ実装がない。View に差し替え、
// isLiquidGlassAvailable=false（フォールバック分岐）を既定にする
export function GlassView({ children, ...props }: ViewProps) {
	return <View {...props}>{children}</View>
}

export function isLiquidGlassAvailable(): boolean {
	return false
}
```

`__mocks__/expo-blur.tsx` を新規作成:

```tsx
import { View, type ViewProps } from 'react-native'

type Props = ViewProps & {
	tint?: string
	intensity?: number
	experimentalBlurMethod?: string
}

// View が知らない props を渡すと警告になるため、blur 固有 props は落とす
export function BlurView({ children, tint: _tint, intensity: _intensity, experimentalBlurMethod: _m, ...props }: Props) {
	return <View {...props}>{children}</View>
}
```

- [ ] **Step 3: 失敗するテストを書く**

`src/components/ui/__tests__/glass-surface.test.tsx` を新規作成:

```tsx
import { render } from '@testing-library/react-native'
import { StyleSheet, Text, View, type ViewProps } from 'react-native'
import { GlassSurface, resolveGlassMode } from '../glass-surface'

describe('resolveGlassMode', () => {
	it('Liquid Glass が使えるなら variant によらず native', () => {
		expect(resolveGlassMode('card', { liquidGlass: true, os: 'ios' })).toBe('native')
		expect(resolveGlassMode('overlay', { liquidGlass: true, os: 'ios' })).toBe('native')
	})

	it('web では常に pseudo', () => {
		expect(resolveGlassMode('card', { liquidGlass: false, os: 'web' })).toBe('pseudo')
		expect(resolveGlassMode('overlay', { liquidGlass: false, os: 'web' })).toBe('pseudo')
	})

	it('ネイティブのフォールバックは overlay のみ blur、card は pseudo', () => {
		expect(resolveGlassMode('card', { liquidGlass: false, os: 'android' })).toBe('pseudo')
		expect(resolveGlassMode('overlay', { liquidGlass: false, os: 'android' })).toBe('blur')
		expect(resolveGlassMode('card', { liquidGlass: false, os: 'ios' })).toBe('pseudo')
		expect(resolveGlassMode('overlay', { liquidGlass: false, os: 'ios' })).toBe('blur')
	})
})

describe('GlassSurface', () => {
	it('既定（card・Jest 環境）は疑似ガラスで子要素を描画する', async () => {
		const { getByTestId, getByText } = await render(
			<GlassSurface>
				<Text>中身</Text>
			</GlassSurface>,
		)
		expect(getByTestId('glass-surface-pseudo')).toBeTruthy()
		expect(getByText('中身')).toBeTruthy()
	})

	it('overlay は BlurView で描画する', async () => {
		const { getByTestId, getByText } = await render(
			<GlassSurface variant="overlay">
				<Text>中身</Text>
			</GlassSurface>,
		)
		expect(getByTestId('glass-surface-blur')).toBeTruthy()
		expect(getByText('中身')).toBeTruthy()
	})

	it('style の上書きが最後に適用される', async () => {
		const { getByTestId } = await render(<GlassSurface style={{ borderRadius: 999 }} />)
		const flat = StyleSheet.flatten(getByTestId('glass-surface-pseudo').props.style)
		expect(flat.borderRadius).toBe(999)
	})

	it('Liquid Glass 利用可能時は GlassView で描画する', async () => {
		jest.resetModules()
		jest.doMock('expo-glass-effect', () => ({
			GlassView: ({ children, ...props }: ViewProps) => <View {...props}>{children}</View>,
			isLiquidGlassAvailable: () => true,
		}))
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const nativeModule = require('../glass-surface') as typeof import('../glass-surface')
		const NativeGlassSurface = nativeModule.GlassSurface
		const { getByTestId } = await render(
			<NativeGlassSurface>
				<Text>中身</Text>
			</NativeGlassSurface>,
		)
		expect(getByTestId('glass-surface-native')).toBeTruthy()
		jest.dontMock('expo-glass-effect')
	})
})
```

補足: `GlassSurface` はフックを持たない設計なので、`jest.resetModules` 後に require し直したコンポーネントを既存レンダラで描画しても問題ない。

- [ ] **Step 4: 失敗を確認する**

Run: `npx jest src/components/ui/__tests__/glass-surface.test.tsx`
Expected: FAIL（`../glass-surface` が存在しない）

- [ ] **Step 5: 最小実装**

`src/components/ui/glass-surface.tsx` を新規作成:

```tsx
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import type { PropsWithChildren } from 'react'
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { glass, radii } from '@/theme/tokens'

export type GlassVariant = 'card' | 'overlay'
export type GlassMode = 'native' | 'blur' | 'pseudo'

type GlassEnv = { liquidGlass: boolean; os: typeof Platform.OS }

// 起動環境は実行中に変わらないため、ネイティブ判定はモジュール読込時に1回だけ行う
const ENV: GlassEnv = { liquidGlass: isLiquidGlassAvailable(), os: Platform.OS }

// ガラス描画方式の唯一の分岐点。
// Android の BlurView は高負荷のため、常設 UI（card）は blur を使わず疑似ガラスに落とす
export function resolveGlassMode(variant: GlassVariant, env: GlassEnv = ENV): GlassMode {
	if (env.liquidGlass) return 'native'
	if (env.os === 'web') return 'pseudo'
	return variant === 'overlay' ? 'blur' : 'pseudo'
}

type Props = PropsWithChildren<{
	style?: StyleProp<ViewStyle>
	variant?: GlassVariant
}>

// ガラス面の共通土台。iOS 26+ はネイティブ Liquid Glass、
// それ以外は blur（overlay のみ）/ 疑似ガラスにフォールバックする
export function GlassSurface({ children, style, variant = 'card' }: Props) {
	const mode = resolveGlassMode(variant)
	if (mode === 'native') {
		return (
			<GlassView
				testID="glass-surface-native"
				glassEffectStyle="regular"
				tintColor={glass.tint}
				colorScheme="dark"
				style={[styles.base, style]}
			>
				{children}
			</GlassView>
		)
	}
	if (mode === 'blur') {
		return (
			<BlurView
				testID="glass-surface-blur"
				tint="dark"
				intensity={glass.blurIntensity}
				experimentalBlurMethod="dimezisBlurView"
				style={[styles.base, styles.bordered, style]}
			>
				<View style={styles.blurTint} pointerEvents="none" />
				{children}
			</BlurView>
		)
	}
	return (
		<View
			testID="glass-surface-pseudo"
			style={[styles.base, styles.bordered, styles.pseudoFill, style]}
		>
			{children}
		</View>
	)
}

const styles = StyleSheet.create({
	base: { borderRadius: radii.lg, overflow: 'hidden' },
	bordered: { borderWidth: 1, borderColor: glass.borderHighlight },
	blurTint: { ...StyleSheet.absoluteFillObject, backgroundColor: glass.tint },
	pseudoFill: { backgroundColor: glass.fallbackFill },
})
```

- [ ] **Step 6: パスを確認する**

Run: `npx jest src/components/ui/__tests__/glass-surface.test.tsx`
Expected: PASS（6テスト）

- [ ] **Step 7: コミット**

```bash
git add src/components/ui/glass-surface.tsx src/components/ui/__tests__/glass-surface.test.tsx __mocks__/expo-glass-effect.tsx __mocks__/expo-blur.tsx package.json bun.lock
git commit -m "feat: ガラス描画を一元化する GlassSurface を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: AppBackground（ネオンブロブ背景）と主要画面への設置

**Files:**
- Create: `src/components/ui/app-background.tsx`
- Modify: `src/app/index.tsx`
- Modify: `src/app/settings.tsx`
- Modify: `src/app/gallery.tsx`
- Modify: `src/app/paywall.tsx`
- Modify: `docs/superpowers/specs/2026-07-20-liquid-glass-ui-design.md`（設置方針の修正）
- Test: `src/components/ui/__tests__/app-background.test.tsx`（新規）

**Interfaces:**
- Consumes: `colors`（`@/theme/tokens`）
- Produces: `export function AppBackground(): JSX.Element` — `position: absolute` 全面・`pointerEvents="none"`・testID `app-background`。各画面のルート View（`backgroundColor: colors.background` を持つ）の最初の子として置く

**設計メモ（スペックからの変更）:** スペックは「`_layout.tsx` に1回だけ敷く」としていたが、expo-router の native-stack はプッシュされた画面が前の画面の上に不透明に重なるため、ルートに敷いた背景は2画面目以降で見えない。透過 contentStyle にすると前の画面が透けるバグ経路になるため、**各画面のルートに置く方式に変更**する。Step 7 でスペックも修正する。

- [ ] **Step 1: 失敗するテストを書く**

`src/components/ui/__tests__/app-background.test.tsx` を新規作成:

```tsx
import { render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { AppBackground } from '../app-background'

// react-native-svg は transformIgnorePatterns の対象でロードが不安定なためスタブする
jest.mock('react-native-svg', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	function Stub({ children }: { children?: ReactNode }) {
		return <View>{children}</View>
	}
	return {
		__esModule: true,
		default: Stub,
		Circle: Stub,
		Defs: Stub,
		RadialGradient: Stub,
		Stop: Stub,
	}
})

describe('AppBackground', () => {
	it('タッチを奪わない（pointerEvents: none）', async () => {
		const { getByTestId } = await render(<AppBackground />)
		expect(getByTestId('app-background').props.pointerEvents).toBe('none')
	})
})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx jest src/components/ui/__tests__/app-background.test.tsx`
Expected: FAIL（`../app-background` が存在しない）

- [ ] **Step 3: 最小実装**

`src/components/ui/app-background.tsx` を新規作成:

```tsx
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { colors } from '@/theme/tokens'

// 全画面共通のネオンブロブ背景（静止画）。ガラスの透け感を出すための光の玉。
// native-stack はプッシュ画面が不透明に重なるため、_layout ではなく
// 各画面のルート View（backgroundColor: colors.background）の最初の子として置く
export function AppBackground() {
	return (
		<View testID="app-background" style={styles.fill} pointerEvents="none">
			<Svg width="100%" height="100%">
				<Defs>
					<RadialGradient id="blob-pink" cx="50%" cy="50%" r="50%">
						<Stop offset="0%" stopColor={colors.accentFrom} stopOpacity={0.32} />
						<Stop offset="100%" stopColor={colors.accentFrom} stopOpacity={0} />
					</RadialGradient>
					<RadialGradient id="blob-purple" cx="50%" cy="50%" r="50%">
						<Stop offset="0%" stopColor={colors.accentTo} stopOpacity={0.38} />
						<Stop offset="100%" stopColor={colors.accentTo} stopOpacity={0} />
					</RadialGradient>
				</Defs>
				<Circle cx="12%" cy="8%" r="42%" fill="url(#blob-pink)" />
				<Circle cx="95%" cy="42%" r="38%" fill="url(#blob-purple)" />
				<Circle cx="25%" cy="98%" r="45%" fill="url(#blob-pink)" />
			</Svg>
		</View>
	)
}

const styles = StyleSheet.create({
	fill: StyleSheet.absoluteFillObject,
})
```

- [ ] **Step 4: パスを確認する**

Run: `npx jest src/components/ui/__tests__/app-background.test.tsx`
Expected: PASS

- [ ] **Step 5: 主要4画面に設置する**

`src/app/index.tsx` — import を追加し、ルート View の最初の子に置く:

```tsx
import { AppBackground } from '@/components/ui/app-background'
```

```tsx
	return (
		<View style={[styles.screen, { paddingTop: insets.top }]}>
			<AppBackground />
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
```

`src/app/settings.tsx` — ルートが ScrollView なので View で包む。import に `View` と `AppBackground` を追加:

```tsx
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { AppBackground } from '@/components/ui/app-background'
```

```tsx
	return (
		<View style={styles.screen}>
			<AppBackground />
			<ScrollView contentContainerStyle={styles.content}>
			{/* …既存の中身は変更なし… */}
			</ScrollView>
		</View>
	)
```

ScrollView から `style={styles.screen}` を外す（`screen` スタイル自体は View 側で使うので残す）。

`src/app/gallery.tsx` — settings と同じ構造変更（ルート ScrollView を `<View style={styles.screen}>` ＋ `<AppBackground />` で包み、ScrollView の `style={styles.screen}` を外す）。

`src/app/paywall.tsx` — 同じ構造変更。ルートの `<ScrollView style={styles.screen} …>` を:

```tsx
	return (
		<View style={styles.screen}>
			<AppBackground />
			<ScrollView contentContainerStyle={styles.content}>
			{/* …既存の中身は変更なし… */}
			</ScrollView>
		</View>
	)
```

import の `react-native` 行に `View` を追加（paywall は既に `View` を import 済みなら不要）し、`AppBackground` を追加。

- [ ] **Step 6: 回帰テストを確認する**

Run: `npx jest src/app`
Expected: PASS（画面スナップショット・挙動テストが全パス。構造変更でスナップショットが割れた場合は、差分が「View ラップ＋AppBackground 追加」のみであることを確認して `npx jest src/app -u` で更新する）

- [ ] **Step 7: スペックを実装に合わせて修正する**

`docs/superpowers/specs/2026-07-20-liquid-glass-ui-design.md` の `app-background.tsx` セクションの記述

「`app/_layout.tsx` のルートに1回だけ敷く。」

を以下に置き換える:

「native-stack はプッシュ画面が前の画面の上に不透明に重なるため、`_layout.tsx` ではなく各画面のルート View の最初の子として置く（フェーズ1: index / settings / gallery / paywall）。」

- [ ] **Step 8: コミット**

```bash
git add src/components/ui/app-background.tsx src/components/ui/__tests__/app-background.test.tsx src/app/index.tsx src/app/settings.tsx src/app/gallery.tsx src/app/paywall.tsx docs/superpowers/specs/2026-07-20-liquid-glass-ui-design.md
git commit -m "feat: ネオンブロブ背景 AppBackground を主要4画面に設置

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Card を GlassSurface 土台に差し替え

**Files:**
- Modify: `src/components/ui/card.tsx`
- Test: `src/components/ui/__tests__/card.test.tsx`（新規）

**Interfaces:**
- Consumes: `GlassSurface`（Task 2）
- Produces: `Card` の外部 API は不変（`PropsWithChildren<{ style?: … }>`）。`style` の型は `ViewStyle` → `StyleProp<ViewStyle>` に広がる（後方互換）

- [ ] **Step 1: 失敗するテストを書く**

`src/components/ui/__tests__/card.test.tsx` を新規作成:

```tsx
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Card } from '../card'

describe('Card', () => {
	it('ガラス面を土台に子要素を描画する', async () => {
		const { getByTestId, getByText } = await render(
			<Card>
				<Text>中身</Text>
			</Card>,
		)
		expect(getByTestId('glass-surface-pseudo')).toBeTruthy()
		expect(getByText('中身')).toBeTruthy()
	})
})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx jest src/components/ui/__tests__/card.test.tsx`
Expected: FAIL（`glass-surface-pseudo` が見つからない）

- [ ] **Step 3: 実装**

`src/components/ui/card.tsx` を全置換:

```tsx
import type { PropsWithChildren } from 'react'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { radii, spacing } from '@/theme/tokens'
import { GlassSurface } from './glass-surface'

type Props = PropsWithChildren<{ style?: StyleProp<ViewStyle> }>

// ガラス面＋大きめ角丸の基本カード（ゲームカード・設定カード共通の土台）
export function Card({ children, style }: Props) {
	return <GlassSurface style={[styles.card, style]}>{children}</GlassSurface>
}

const styles = StyleSheet.create({
	card: {
		borderRadius: radii.lg,
		padding: spacing.md,
	},
})
```

- [ ] **Step 4: パスと回帰を確認する**

Run: `npx jest src/components/ui src/app`
Expected: PASS（card.test.tsx＋settings / gallery の既存テスト）

- [ ] **Step 5: コミット**

```bash
git add src/components/ui/card.tsx src/components/ui/__tests__/card.test.tsx
git commit -m "feat: Card の土台を GlassSurface に差し替え

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: PillButton / SecondaryButton のガラス化

**Files:**
- Modify: `src/components/ui/pill-button.tsx`
- Modify: `src/components/ui/secondary-button.tsx`
- Test: `src/components/ui/__tests__/buttons.test.tsx`（追記）

**Interfaces:**
- Consumes: `GlassSurface`（Task 2）
- Produces: 両ボタンの外部 API（props）は不変。Pressable がタップ・押下表現を持ち、視覚面は内側の GlassSurface が持つ構造になる

**設計メモ:** ResultOverlay は自前のパネルを持たない（背景＋子コンテンツ＋ボタン2つ）ため、本タスクの SecondaryButton ガラス化によって自動的にガラス要素を得る。ResultOverlay 自体のファイル変更は不要。

- [ ] **Step 1: 失敗するテストを書く**

`src/components/ui/__tests__/buttons.test.tsx` の `describe('PillButton', …)` 内に追記:

```tsx
	it('ガラス面を土台にする', async () => {
		const { getByTestId } = await render(
			<PillButton title="プレミアム" onPress={() => {}} />,
		)
		expect(getByTestId('glass-surface-pseudo')).toBeTruthy()
	})
```

同ファイル末尾に SecondaryButton の describe を新設（import に `SecondaryButton` を追加）:

```tsx
import { SecondaryButton } from '../secondary-button'
```

```tsx
describe('SecondaryButton', () => {
	it('ガラス面を土台にし、タップで onPress が呼ばれる', async () => {
		const onPress = jest.fn()
		const { getByTestId, getByText } = await render(
			<SecondaryButton title="ホームへ" onPress={onPress} />,
		)
		expect(getByTestId('glass-surface-pseudo')).toBeTruthy()
		fireEvent.press(getByText('ホームへ'))
		expect(onPress).toHaveBeenCalledTimes(1)
	})
})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx jest src/components/ui/__tests__/buttons.test.tsx`
Expected: FAIL（`glass-surface-pseudo` が見つからない）×2

- [ ] **Step 3: 実装**

`src/components/ui/pill-button.tsx` を全置換:

```tsx
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { radii, spacing, typography } from '@/theme/tokens'
import { GlassSurface } from './glass-surface'

type Props = {
	title: string
	icon?: ReactNode
	onPress: () => void
}

// ヘッダーの「プレミアム」（王冠アイコン付き）等、ガラス面ピル型の小ボタン
export function PillButton({ title, icon, onPress }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => pressed && styles.pressed}
		>
			<GlassSurface style={styles.pill}>
				{icon}
				<Text style={styles.title}>{title}</Text>
			</GlassSurface>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	pill: {
		borderRadius: radii.pill,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	pressed: { opacity: 0.7 },
	title: { ...typography.body, fontSize: 14, fontWeight: '600' },
})
```

`src/components/ui/secondary-button.tsx` を全置換:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { radii, spacing, typography } from '@/theme/tokens'
import { GlassSurface } from './glass-surface'

type Props = {
	title: string
	onPress: () => void
}

// GradientButton と同ジオメトリ（余白・角丸・中央寄せ・太字）のガラス面ボタン。
// 「もう一回（Gradient）＋ホームへ（Secondary）」のようなペアで使い、色以外を揃える
export function SecondaryButton({ title, onPress }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => pressed && styles.pressed}
		>
			<GlassSurface style={styles.button}>
				<Text style={styles.title}>{title}</Text>
			</GlassSurface>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	button: {
		borderRadius: radii.md,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.md,
		alignItems: 'center',
	},
	pressed: { opacity: 0.7 },
	title: { ...typography.body, fontWeight: '700' },
})
```

- [ ] **Step 4: パスと回帰を確認する**

Run: `npx jest src/components/ui src/components/home src/components/game`
Expected: PASS（ボタンを使う home-header / result-overlay 系の既存テスト含む）

- [ ] **Step 5: コミット**

```bash
git add src/components/ui/pill-button.tsx src/components/ui/secondary-button.tsx src/components/ui/__tests__/buttons.test.tsx
git commit -m "feat: PillButton / SecondaryButton をガラス面化

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: GameCard のプレミアムロックバッジをガラス化

**Files:**
- Modify: `src/components/home/game-card.tsx`
- Test: `src/components/home/__tests__/` の game-card 既存テスト（追記）

**Interfaces:**
- Consumes: `GlassSurface`（Task 2）
- Produces: 外部 API 不変。サムネイル（画像・グラデ面）はガラス化しない

- [ ] **Step 1: 失敗するテストを書く**

game-card の既存テストファイル（`src/components/home/__tests__/` 配下）に、ロック表示のテストと同じモック・props 構成で追記:

```tsx
	it('ロックバッジはガラス面で描画される', async () => {
		// 既存の「プレミアム未解放でロックマスクが出る」テストと同じ premium ゲームの props を使う
		const { getByTestId } = await render(<GameCard game={premiumGame} onPress={() => {}} />)
		expect(getByTestId('glass-surface-pseudo')).toBeTruthy()
	})
```

（`premiumGame` は既存テストで使っている premium: true のフィクスチャ名に合わせる）

- [ ] **Step 2: 失敗を確認する**

Run: `npx jest src/components/home`
Expected: 追記テストのみ FAIL

- [ ] **Step 3: 実装**

`src/components/home/game-card.tsx` — import に追加:

```tsx
import { GlassSurface } from '@/components/ui/glass-surface'
```

ロックバッジの `<View style={styles.lockBadge}>…</View>` を差し替え:

```tsx
					{locked && (
						<View testID="premium-lock-mask" style={styles.lockMask}>
							<GlassSurface style={styles.lockBadge}>
								<MaterialCommunityIcons
									name="crown"
									testID="icon-crown"
									size={13}
									color={colors.premiumGold}
								/>
								<Text style={styles.lockBadgeText}>プレミアム</Text>
							</GlassSurface>
						</View>
					)}
```

`styles.lockBadge` から `backgroundColor` を外し、金枠は残す（GlassSurface の白枠より style 配列で勝つ）:

```tsx
	lockBadge: {
		borderWidth: 1,
		borderColor: colors.premiumGold,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
```

- [ ] **Step 4: パスを確認する**

Run: `npx jest src/components/home`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/components/home/game-card.tsx src/components/home/__tests__
git commit -m "feat: GameCard のロックバッジをガラス面化

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: モーダル群のガラス化（overlay variant）

**Files:**
- Modify: `src/components/game/how-to-play-modal.tsx`
- Modify: `src/components/home/premium-lock-modal.tsx`
- Modify: `src/components/game/trial-lock-overlay.tsx`
- Test: 各コンポーネントの既存テストファイルに追記

**Interfaces:**
- Consumes: `GlassSurface`（variant `overlay` → Jest では testID `glass-surface-blur` になる）
- Produces: 各モーダルの外部 API 不変。バックドロップ（暗幕）は blur 1枚ルールのため既存の rgba のまま

**共通の変換レシピ:** パネルの `<View style={styles.X}>` を `<GlassSurface variant="overlay" style={styles.X}>` にし、`styles.X` から `backgroundColor` / `borderWidth` / `borderColor` を外す（角丸・padding・レイアウトは残す）。

- [ ] **Step 1: 失敗するテストを書く（3ファイルに追記）**

各既存テストファイルの describe 内に、既存テストと同じモック・props 構成で追記する。

how-to-play-modal:

```tsx
	it('パネルはガラス面（overlay）で描画される', async () => {
		const { getByTestId } = await render(
			<HowToPlayModal visible title="テスト" pages={['1ページ']} onClose={() => {}} />,
		)
		expect(getByTestId('glass-surface-blur')).toBeTruthy()
	})
```

premium-lock-modal（既存テストの gma / trial-store モックをそのまま利用）:

```tsx
	it('シートはガラス面（overlay）で描画される', async () => {
		const { getByTestId } = await render(
			<PremiumLockModal visible gameId="chinchiro" gameTitle="チンチロ" onClose={() => {}} />,
		)
		expect(getByTestId('glass-surface-blur')).toBeTruthy()
	})
```

trial-lock-overlay（既存テストの「表示される」ケースと同じストアモックを利用）:

```tsx
	it('パネルはガラス面（overlay）で描画される', async () => {
		const { getByTestId } = await render(<TrialLockOverlay gameId="burst-chicken" />)
		expect(getByTestId('glass-surface-blur')).toBeTruthy()
	})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx jest src/components/game src/components/home`
Expected: 追記した3テストのみ FAIL

- [ ] **Step 3: how-to-play-modal を実装**

import 追加と JSX 差し替え:

```tsx
import { GlassSurface } from '@/components/ui/glass-surface'
```

```tsx
			<View style={styles.backdrop}>
				<GlassSurface variant="overlay" style={styles.card}>
					{/* …中身は変更なし… */}
				</GlassSurface>
			</View>
```

`styles.card` を以下に変更:

```tsx
	card: {
		borderRadius: radii.lg,
		padding: spacing.lg,
		gap: spacing.md,
	},
```

- [ ] **Step 4: premium-lock-modal を実装**

import 追加後、シートの内側 Pressable を「タップ遮断のみ」にし、視覚は GlassSurface に移す:

```tsx
			<Pressable style={styles.backdrop} onPress={onClose}>
				<Pressable style={styles.sheetWrap} onPress={() => {}}>
					<GlassSurface variant="overlay" style={styles.sheet}>
						{/* …王冠アイコン以下、中身は変更なし… */}
					</GlassSurface>
				</Pressable>
			</Pressable>
```

styles の変更:

```tsx
	sheetWrap: { width: '100%' },
	sheet: {
		borderRadius: radii.lg,
		padding: spacing.xl,
		alignItems: 'center',
		gap: spacing.md,
	},
```

（旧 `sheet` の `backgroundColor` / `borderWidth` / `borderColor` / `width` を外し、`width` は `sheetWrap` へ）

- [ ] **Step 5: trial-lock-overlay を実装**

import 追加と JSX 差し替え:

```tsx
		<View testID="trial-lock-overlay" style={styles.overlay}>
			<GlassSurface variant="overlay" style={styles.panel}>
				{/* …中身は変更なし… */}
			</GlassSurface>
		</View>
```

`styles.panel` を以下に変更:

```tsx
	panel: {
		width: '100%',
		borderRadius: radii.lg,
		padding: spacing.xl,
		alignItems: 'center',
		gap: spacing.md,
	},
```

- [ ] **Step 6: パスと回帰を確認する**

Run: `npx jest src/components/game src/components/home`
Expected: PASS（追記3テスト＋既存全テスト）

- [ ] **Step 7: コミット**

```bash
git add src/components/game/how-to-play-modal.tsx src/components/home/premium-lock-modal.tsx src/components/game/trial-lock-overlay.tsx src/components/game/__tests__ src/components/home/__tests__
git commit -m "feat: モーダル・オーバーレイ群をガラスパネル化

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: 常設パネル群のガラス化（player-setup-sheet / premium-upsell-card / paywall）

**Files:**
- Modify: `src/components/game/player-setup-sheet.tsx`
- Modify: `src/components/settings/premium-upsell-card.tsx`
- Modify: `src/app/paywall.tsx`
- Test: 各既存テストファイルに追記

**Interfaces:**
- Consumes: `GlassSurface`（variant `card`＝既定。リスト内の常設パネルなので blur 1枚ルールにより疑似ガラス側）
- Produces: 各コンポーネントの外部 API 不変

- [ ] **Step 1: 失敗するテストを書く**

premium-upsell-card の既存テストに追記:

```tsx
	it('ガラス面を土台にする', async () => {
		const { getByTestId } = await render(<PremiumUpsellCard onUpgradePress={() => {}} />)
		expect(getByTestId('glass-surface-pseudo')).toBeTruthy()
	})
```

player-setup-sheet の既存テストに追記。**まず既存テストファイルを読み、レンダーに使っている props とストアモックをそのまま流用する**（本体の render 引数だけ既存の表示テストからコピーする）:

```tsx
	it('プレイヤーカードはガラス面で描画される', async () => {
		// render の引数は既存の「プレイヤーカードが表示される」系テストと同一にする
		const { getAllByTestId } = await render(/* 既存テストと同じ <PlayerSetupSheet …/> */)
		expect(getAllByTestId('glass-surface-pseudo').length).toBeGreaterThan(0)
	})
```

paywall の既存テストに追記:

```tsx
	it('特典行・プランカードはガラス面で描画される', async () => {
		const { getAllByTestId } = await render(<PaywallScreen />)
		expect(getAllByTestId('glass-surface-pseudo').length).toBeGreaterThan(0)
	})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx jest src/components/game src/components/settings src/app/__tests__`
Expected: 追記3テストのみ FAIL

- [ ] **Step 3: premium-upsell-card を実装**

import 追加、ルート `<View style={styles.card}>` → `<GlassSurface style={styles.card}>`、`styles.card` から `backgroundColor` / `borderWidth` / `borderColor` を外す:

```tsx
	card: {
		borderRadius: radii.lg,
		padding: spacing.lg,
		alignItems: 'center',
		gap: spacing.sm,
	},
```

- [ ] **Step 4: player-setup-sheet を実装**

import 追加。3箇所を差し替える。

プレイヤーカード（`key` は GlassSurface に付ける）:

```tsx
						<GlassSurface
							key={`${i}-${players.count}`}
							style={[styles.card, showError && empty && styles.cardError]}
						>
							{/* …colorBar / cardBody / removeBtn は変更なし… */}
						</GlassSurface>
```

範囲調整バナー:

```tsx
			{rangeAdjusted && (
				<GlassSurface style={[styles.banner, styles.bannerNotice]}>
					<Text style={styles.bannerText}>
						このゲームは{rangeLabel}用のため人数を調整しました
					</Text>
				</GlassSurface>
			)}
```

履歴ボックス: `<View style={styles.historyBox}>` → `<GlassSurface style={styles.historyBox}>`。

styles の変更（`card` から bg/枠、`bannerNotice` から bg、`historyBox` から bg を外す。`cardError` の赤枠と `bannerNotice` の紫枠は GlassSurface の白枠に style 配列で勝つため残す）:

```tsx
	bannerNotice: { borderWidth: 1, borderColor: colors.accentTo },
	card: {
		flexDirection: 'row',
		borderRadius: radii.md,
		overflow: 'hidden',
	},
	historyBox: {
		borderRadius: radii.md,
		padding: spacing.md,
		minHeight: 96,
		justifyContent: 'center',
	},
```

エラー時の危険バナー（`styles.banner` 単体・赤背景）はガラス化しない。

- [ ] **Step 5: paywall を実装**

import 追加。4種のパネルを差し替える。

特典行:

```tsx
				{BENEFITS.map((benefit) => (
					<GlassSurface key={benefit.title} style={styles.benefitRow}>
						{/* …中身は変更なし… */}
					</GlassSurface>
				))}
```

プランカード（PlanOption 内。Pressable はタップ担当、視覚は GlassSurface）:

```tsx
		<Pressable accessibilityRole="button" onPress={onPress} style={styles.planWrap}>
			<GlassSurface style={[styles.plan, selected && styles.selectedPlan]}>
				<Text style={styles.planLabel}>{hasPackages ? label : `${label} ${price}`}</Text>
				{hasPackages && <Text style={styles.planPrice}>{price}</Text>}
			</GlassSurface>
		</Pressable>
```

「約39%お得」バッジ: `<View style={styles.badge}>` → `<GlassSurface style={styles.badge}>`
プレミアム利用中ボックス: `<View style={styles.activeBox}>` → `<GlassSurface style={styles.activeBox}>`

styles の変更（bg と灰枠を外す。金枠 `selectedPlan` / `badge` / `activeBox` は残す）:

```tsx
	benefitRow: {
		borderRadius: radii.sm,
		padding: spacing.md,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	planWrap: { flex: 1 },
	plan: {
		minHeight: 88,
		borderRadius: radii.sm,
		padding: spacing.md,
		justifyContent: 'center',
		gap: spacing.xs,
	},
	badge: {
		alignSelf: 'center',
		borderWidth: 1,
		borderColor: colors.premiumGold,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
	},
	activeBox: {
		borderWidth: 1,
		borderColor: colors.premiumGold,
		borderRadius: radii.sm,
		padding: spacing.lg,
		alignItems: 'center',
	},
```

（`plan` の `flex: 1` は `planWrap` へ移動）

- [ ] **Step 6: パスと回帰を確認する**

Run: `npx jest src/components/game src/components/settings src/app`
Expected: PASS

- [ ] **Step 7: コミット**

```bash
git add src/components/game/player-setup-sheet.tsx src/components/settings/premium-upsell-card.tsx src/app/paywall.tsx src/components/game/__tests__ src/components/settings/__tests__ src/app/__tests__
git commit -m "feat: 常設パネル群（プレイヤー設定・upsell・paywall）をガラス面化

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: 全体検証と PR 作成

**Files:** なし（検証・PR のみ）

- [ ] **Step 1: 全テスト実行**

Run: `npx jest`
Expected: 全スイート PASS。失敗があれば修正してから進む（テストを実装に合わせて書き換えるのは禁止）

- [ ] **Step 2: 型チェックと lint**

Run: `npx tsc --noEmit && npx eslint src __mocks__`
Expected: エラー 0

- [ ] **Step 3: iOS dev build で目視確認**

Run: `LANG=UTF-8 bunx expo run:ios`（メモリ「iOS dev build 手順」参照。Expo Go 不可）

確認項目:
- ホーム: ブロブ背景が見える / ピルボタン・ロックバッジがガラス
- 設定・gallery: カードがガラスでスクロール時に背景が透ける
- paywall: 特典行・プランカードがガラス、選択時の金枠が出る
- 遊び方モーダル・プレミアムロック・トライアルロック: パネル越しに背景が透ける（iOS 26 実機ならネイティブガラスの屈折）
- プレイヤー設定シート: カード・履歴ボックスがガラス、削除・追加・入力が正常
- 「設定 > アクセシビリティ > 透明度を下げる」ON で不透明化されること

- [ ] **Step 4: push と PR 作成**

```bash
git push -u origin feat/liquid-glass-ui
gh pr create --base develop --title "feat: Liquid Glass UI フェーズ1（GlassSurface / ネオンブロブ背景 / 共通UI・モーダル群）" --body "$(cat <<'EOF'
## 概要
- ガラス描画を一元化する GlassSurface（iOS 26 ネイティブ / blur / 疑似ガラスの3段フォールバック）
- 静的ネオンブロブ背景 AppBackground を主要4画面に設置
- Card / PillButton / SecondaryButton / GameCard ロックバッジ / モーダル7種をガラス化
- 設計書: docs/superpowers/specs/2026-07-20-liquid-glass-ui-design.md

## テスト
- [ ] npx jest 全パス
- [ ] iOS dev build で目視確認

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: フェーズ2の Issue を起票（ユーザー確認の上）**

ゲーム内パネル系（リザルト画面・ルールモーダル・お題表示）の選択的ガラス化を別 Issue として起票する。プレイ盤面系（サイコロトレー・カードグリッド・ゲージ）は対象外であることを Issue 本文に明記。
