# ホーム千鳥グリッド刷新 Implementation Plan（Issue #44）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホームのゲーム一覧を千鳥（ずらし）2列グリッドに刷新し、カードに人数バッジを載せ、カード下キャッチを廃止する（spec: `docs/superpowers/specs/2026-07-20-home-layout-redesign-design.md`）。

**Architecture:** 変更は `GameGrid`（flexWrap → 左右2カラム＋右列半タイルオフセット）と `GameCard`（人数バッジオーバーレイ・tagline 廃止・グラデフォールバックのタイル内タイトル化）に閉じる。`index.tsx`・`GameMeta`・プレミアムロック・広告は無変更。人数整形は純関数 `formatPlayerCount` として `src/lib/` に切り出す。

**Tech Stack:** Expo (React Native) / TypeScript / Jest (jest-expo) + @testing-library/react-native

## Global Constraints

- TDD 必須: RED（失敗ログ確認）→ GREEN（パス確認）→ REFACTOR。テストを実装に合わせて捻じ曲げない・`.skip`/`.only` 残置禁止・テストで `any` 禁止
- インデントはタブ（既存コード準拠）。テーマ値は `@/theme/tokens` の `colors` / `spacing` / `radii` / `typography` を使う
- タイル比率は 1.3:1 のまま。既存 card.jpg・プレミアムロック UI・タップ遷移ロジックは変更しない
- ブランチ: `feature/44-home-staggered-grid`（develop ベース、作成済み）。コミットメッセージ末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- テスト実行: `npx jest <path>`（個別）/ `npx jest`（全体）。型: `npm run typecheck`

---

### Task 1: `formatPlayerCount` 純関数

**Files:**
- Create: `src/lib/format-players.ts`
- Test: `src/lib/__tests__/format-players.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `formatPlayerCount(min: number, max: number): string` — `min === max` なら `'2人'`、それ以外 `'2〜8人'`（区切りは全角波ダッシュ `〜` U+301C。既存モック・UI 文言と同じ文字）

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/__tests__/format-players.test.ts`:

```ts
import { formatPlayerCount } from '../format-players'

describe('formatPlayerCount', () => {
	it('min と max が同じなら「2人」形式', () => {
		expect(formatPlayerCount(2, 2)).toBe('2人')
	})

	it('min と max が異なれば「2〜8人」形式', () => {
		expect(formatPlayerCount(2, 8)).toBe('2〜8人')
	})

	it('3〜12人のケース', () => {
		expect(formatPlayerCount(3, 12)).toBe('3〜12人')
	})
})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx jest src/lib/__tests__/format-players.test.ts`
Expected: FAIL（`Cannot find module '../format-players'`）

- [ ] **Step 3: 最小実装**

`src/lib/format-players.ts`:

```ts
// ホームカードの人数バッジ表示用整形（例: 2人 / 2〜8人）
export function formatPlayerCount(min: number, max: number): string {
	return min === max ? `${min}人` : `${min}〜${max}人`
}
```

- [ ] **Step 4: パスを確認する**

Run: `npx jest src/lib/__tests__/format-players.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: コミット**

```bash
git add src/lib/format-players.ts src/lib/__tests__/format-players.test.ts
git commit -m "feat: 人数バッジ用の formatPlayerCount を追加 (#44)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `PlayerCountBadge` コンポーネント

**Files:**
- Create: `src/components/home/player-count-badge.tsx`
- Test: `src/components/home/__tests__/player-count-badge.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `formatPlayerCount(min, max)`
- Produces: `PlayerCountBadge({ game }: { game: GameMeta })` — サムネ左上に絶対配置される人数ピル。`testID="player-count-badge"`

- [ ] **Step 1: 失敗するテストを書く**

`src/components/home/__tests__/player-count-badge.test.tsx`:

```tsx
import { render } from '@testing-library/react-native'
import type { GameMeta } from '@/games/registry'
import { PlayerCountBadge } from '../player-count-badge'

const baseGame: GameMeta = {
	id: 'test-game',
	title: 'テストゲーム',
	tagline: 'テスト用のゲーム',
	emoji: '🎮',
	gradient: ['#111111', '#222222'],
	minPlayers: 2,
	maxPlayers: 8,
	howToPlay: ['遊び方1'],
	Component: () => null,
}

it('人数範囲を「2〜8人」形式で表示する', async () => {
	const { getByText, getByTestId } = await render(<PlayerCountBadge game={baseGame} />)
	expect(getByTestId('player-count-badge')).toBeTruthy()
	expect(getByText('2〜8人')).toBeTruthy()
})

it('min と max が同じなら「2人」形式で表示する', async () => {
	const twoPlayers = { ...baseGame, minPlayers: 2, maxPlayers: 2 }
	const { getByText } = await render(<PlayerCountBadge game={twoPlayers} />)
	expect(getByText('2人')).toBeTruthy()
})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx jest src/components/home/__tests__/player-count-badge.test.tsx`
Expected: FAIL（`Cannot find module '../player-count-badge'`）

- [ ] **Step 3: 最小実装**

`src/components/home/player-count-badge.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native'
import type { GameMeta } from '@/games/registry'
import { formatPlayerCount } from '@/lib/format-players'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	game: GameMeta
}

// サムネ左上に重ねる人数ピル（モック準拠: 半透明黒＋白 caption）
export function PlayerCountBadge({ game }: Props) {
	return (
		<View testID="player-count-badge" style={styles.badge}>
			<Text style={styles.text}>{formatPlayerCount(game.minPlayers, game.maxPlayers)}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	badge: {
		position: 'absolute',
		top: spacing.sm,
		left: spacing.sm,
		backgroundColor: 'rgba(0, 0, 0, 0.28)',
		borderRadius: radii.pill,
		paddingHorizontal: spacing.sm,
		paddingVertical: 2,
	},
	text: { ...typography.caption, color: colors.text },
})
```

- [ ] **Step 4: パスを確認する**

Run: `npx jest src/components/home/__tests__/player-count-badge.test.tsx`
Expected: PASS（2 tests）

- [ ] **Step 5: コミット**

```bash
git add src/components/home/player-count-badge.tsx src/components/home/__tests__/player-count-badge.test.tsx
git commit -m "feat: ホームカード用の人数バッジ PlayerCountBadge を追加 (#44)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `GameCard` 刷新（バッジ・tagline 廃止・フォールバック刷新）

**Files:**
- Modify: `src/components/home/game-card.tsx`
- Test: `src/components/home/__tests__/game-card.test.tsx`（既存テストの仕様変更部分を更新）

**Interfaces:**
- Consumes: Task 2 の `PlayerCountBadge`
- Produces: `GameCard({ game, onPress })` — props・`accessibilityLabel={game.title}`・`testID` 群（`card-thumb-image` / `premium-lock-mask` / `icon-crown` / `player-count-badge`）は維持。カード幅は親任せ（`width: '100%'`）に変わる（Task 4 の2カラム化の前提）

- [ ] **Step 1: 既存テストを新仕様に更新して失敗させる（RED）**

`src/components/home/__tests__/game-card.test.tsx` の既存 3 テストを差し替え（プレミアムロックの describe 4 件は無変更で残す）:

```tsx
it('thumbnail なし: 絵文字＋タイトル＋人数バッジのグラデカードを表示し、キャッチは出さない', async () => {
	const { getByText, queryByText, queryByTestId, getByTestId } = await render(
		<GameCard game={baseGame} onPress={jest.fn()} />,
	)
	expect(getByText('🎮')).toBeTruthy()
	expect(getByText('テストゲーム')).toBeTruthy()
	expect(getByTestId('player-count-badge')).toBeTruthy()
	expect(getByText('2〜8人')).toBeTruthy()
	// カード下キャッチは廃止（Issue #44）
	expect(queryByText('テスト用のゲーム')).toBeNull()
	expect(queryByTestId('card-thumb-image')).toBeNull()
})

it('thumbnail あり: 画像＋人数バッジを表示し、タイトル文字とキャッチは重ねない', async () => {
	const withThumb = { ...baseGame, cardThumbnail: 1 }
	const { queryByText, getByTestId, getByLabelText } = await render(
		<GameCard game={withThumb} onPress={jest.fn()} />,
	)
	expect(getByTestId('card-thumb-image')).toBeTruthy()
	expect(getByTestId('player-count-badge')).toBeTruthy()
	expect(queryByText('🎮')).toBeNull()
	expect(queryByText('テストゲーム')).toBeNull()
	// タイトルは読み上げ用ラベルとして残す
	expect(getByLabelText('テストゲーム')).toBeTruthy()
	// カード下キャッチは廃止（Issue #44）
	expect(queryByText('テスト用のゲーム')).toBeNull()
})

it('タップで onPress が呼ばれる（thumbnail あり）', async () => {
	const onPress = jest.fn()
	const withThumb = { ...baseGame, cardThumbnail: 1 }
	const { getByLabelText } = await render(<GameCard game={withThumb} onPress={onPress} />)
	fireEvent.press(getByLabelText('テストゲーム'))
	expect(onPress).toHaveBeenCalled()
})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx jest src/components/home/__tests__/game-card.test.tsx`
Expected: FAIL（`player-count-badge` が見つからない / 「テスト用のゲーム」が表示されている）。プレミアムロックの 4 テストは PASS のまま

- [ ] **Step 3: 実装（GREEN）**

`src/components/home/game-card.tsx` 全体を以下に置き換え:

```tsx
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { GameMeta } from '@/games/registry'
import { usePremium } from '@/lib/premium'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { PlayerCountBadge } from './player-count-badge'

type Props = {
	game: GameMeta
	onPress: () => void
}

// ゲーム一覧のカード。cardThumbnail があれば画像（タイトル入りキービジュアル前提で文字は重ねない）、
// なければテーマ色グラデ＋右上絵文字＋左下タイトルのフォールバック（Issue #44 モック準拠）。
// 人数バッジを左上に重ねる。カード下キャッチ（tagline）は廃止。
// プレミアム限定ゲームは未解放の間、薄い黒マスク＋👑バッジを重ねて課金枠だと分かるようにする
export function GameCard({ game, onPress }: Props) {
	const premiumUnlocked = usePremium()
	const locked = game.premium === true && !premiumUnlocked
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
				<PlayerCountBadge game={game} />
				{locked && (
					<View testID="premium-lock-mask" style={styles.lockMask}>
						<View style={styles.lockBadge}>
							<MaterialCommunityIcons
								name="crown"
								testID="icon-crown"
								size={13}
								color={colors.premiumGold}
							/>
							<Text style={styles.lockBadgeText}>プレミアム</Text>
						</View>
					</View>
				)}
			</View>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: { width: '100%', marginBottom: spacing.lg },
	pressed: { opacity: 0.8 },
	thumbWrap: { position: 'relative' },
	thumb: {
		aspectRatio: 1.3,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		justifyContent: 'flex-end',
		padding: spacing.sm,
		overflow: 'hidden',
	},
	thumbImage: {
		aspectRatio: 1.3,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
	},
	lockMask: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10, 8, 20, 0.55)',
		borderRadius: radii.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	lockBadge: {
		backgroundColor: 'rgba(23, 20, 42, 0.9)',
		borderWidth: 1,
		borderColor: colors.premiumGold,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	lockBadgeText: { ...typography.caption, color: colors.premiumGold },
	emoji: {
		position: 'absolute',
		top: spacing.xs,
		right: spacing.sm,
		fontSize: 44,
		opacity: 0.55,
	},
	title: { ...typography.body, fontWeight: '800', textAlign: 'left' },
})
```

ポイント: `container` を `width: '48%'` → `'100%'`（Task 4 の列側で幅を持つ）、`tagline` の描画と style を削除、フォールバックは左下タイトル＋右上半透明絵文字（`overflow: 'hidden'` で角丸からのはみ出し防止）。

- [ ] **Step 4: パスを確認する**

Run: `npx jest src/components/home/__tests__/game-card.test.tsx`
Expected: PASS（7 tests）

- [ ] **Step 5: コミット**

```bash
git add src/components/home/game-card.tsx src/components/home/__tests__/game-card.test.tsx
git commit -m "feat: GameCard に人数バッジを追加しキャッチ廃止・フォールバック刷新 (#44)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `GameGrid` 千鳥2カラム化

**Files:**
- Modify: `src/components/home/game-grid.tsx`
- Test: `src/components/home/__tests__/game-grid.test.tsx`（列分割・オフセットのテストを追加、tagline 依存を削除）

**Interfaces:**
- Consumes: Task 3 の `GameCard`（`width: '100%'` 前提）
- Produces: `GameGrid()` — `testID="grid-left-column"` / `testID="grid-right-column"` の2カラム。偶数 index → 左列、奇数 index → 右列。右列に `paddingTop: '18.5%'`（半タイル分。親幅 48% ÷ 1.3 ÷ 2 ≒ 18.46%）

- [ ] **Step 1: 既存テストを新仕様に更新して失敗させる（RED）**

`src/components/home/__tests__/game-grid.test.tsx`:

1. 「レジストリの全ゲームがカード表示される」テストから `expect(getByText(g.tagline)).toBeTruthy()` の行を削除（tagline はホームで廃止）
2. import に `within` と `StyleSheet` を追加し、千鳥構造のテストを追加:

```tsx
import { act, fireEvent, render, within } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
```

```tsx
describe('千鳥グリッド構造', () => {
	it('偶数番目が左列・奇数番目が右列に分かれる', async () => {
		const { getByTestId } = await render(<GameGrid />)
		const left = within(getByTestId('grid-left-column'))
		const right = within(getByTestId('grid-right-column'))
		expect(left.getByLabelText(games[0].title)).toBeTruthy()
		expect(right.getByLabelText(games[1].title)).toBeTruthy()
		expect(left.getByLabelText(games[2].title)).toBeTruthy()
		expect(right.queryByLabelText(games[0].title)).toBeNull()
	})

	it('全ゲームが左右いずれかの列に表示される', async () => {
		const { getByTestId } = await render(<GameGrid />)
		const left = within(getByTestId('grid-left-column'))
		const right = within(getByTestId('grid-right-column'))
		for (const [i, g] of games.entries()) {
			const column = i % 2 === 0 ? left : right
			expect(column.getByLabelText(g.title)).toBeTruthy()
		}
	})

	it('右列には半タイル分の上オフセットがある', async () => {
		const { getByTestId } = await render(<GameGrid />)
		const style = StyleSheet.flatten(getByTestId('grid-right-column').props.style)
		expect(style.paddingTop).toBe('18.5%')
		const leftStyle = StyleSheet.flatten(getByTestId('grid-left-column').props.style)
		expect(leftStyle.paddingTop).toBeUndefined()
	})
})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx jest src/components/home/__tests__/game-grid.test.tsx`
Expected: FAIL（`grid-left-column` が見つからない）。既存の遷移・プレミアムゲートのテストは PASS のまま

- [ ] **Step 3: 実装（GREEN）**

`src/components/home/game-grid.tsx` 全体を以下に置き換え:

```tsx
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { games, type GameMeta } from '@/games/registry'
import { haptics } from '@/lib/haptics'
import { usePremium } from '@/lib/premium'
import { GameCard } from './game-card'
import { PremiumLockModal } from './premium-lock-modal'

// レジストリ駆動の千鳥（ずらし）2列グリッド（Issue #44）。偶数 index → 左列、奇数 index → 右列で、
// 右列を半タイル分（列幅 48% ÷ 比率 1.3 ÷ 2 ≒ 18.5% 親幅）下げてリズムを付ける。
// ゲーム追加はレジストリに足すだけで反映される。
// プレミアム限定ゲームは未解放の間タップでロックモーダルを出す（解放判定は @/lib/premium に集約）
export function GameGrid() {
	const [lockedGame, setLockedGame] = useState<GameMeta | null>(null)
	const premiumUnlocked = usePremium()

	const handlePress = (game: GameMeta) => {
		haptics.tap()
		if (game.premium === true && !premiumUnlocked) {
			setLockedGame(game)
			return
		}
		router.push({ pathname: '/game/[id]', params: { id: game.id } })
	}

	const leftGames = games.filter((_, i) => i % 2 === 0)
	const rightGames = games.filter((_, i) => i % 2 === 1)

	return (
		<View style={styles.grid}>
			<View testID="grid-left-column" style={styles.column}>
				{leftGames.map((game) => (
					<GameCard key={game.id} game={game} onPress={() => handlePress(game)} />
				))}
			</View>
			<View testID="grid-right-column" style={[styles.column, styles.rightColumn]}>
				{rightGames.map((game) => (
					<GameCard key={game.id} game={game} onPress={() => handlePress(game)} />
				))}
			</View>
			<PremiumLockModal
				visible={lockedGame !== null}
				gameId={lockedGame?.id ?? ''}
				gameTitle={lockedGame ? `${lockedGame.emoji} ${lockedGame.title}` : ''}
				onClose={() => setLockedGame(null)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	grid: { flexDirection: 'row', justifyContent: 'space-between' },
	column: { width: '48%' },
	// 千鳥オフセット: 列幅 48% ÷ アスペクト比 1.3 ÷ 2 ≒ 18.46%（RN の % padding は親幅基準）
	rightColumn: { paddingTop: '18.5%' },
})
```

- [ ] **Step 4: パスを確認する**

Run: `npx jest src/components/home/__tests__/game-grid.test.tsx`
Expected: PASS（8 tests: 既存5＋千鳥3）

- [ ] **Step 5: コミット**

```bash
git add src/components/home/game-grid.tsx src/components/home/__tests__/game-grid.test.tsx
git commit -m "feat: ホームのゲーム一覧を千鳥2列グリッドに刷新 (#44)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 全体検証と PR 作成

**Files:**
- なし（検証のみ）

**Interfaces:**
- Consumes: Task 1〜4 の全成果物
- Produces: develop 向け PR

- [ ] **Step 1: 全テスト実行**

Run: `npx jest`
Expected: 全 suite PASS（他画面のテストに tagline / GameCard 幅依存がないことを確認。失敗があれば該当 suite を修正してからコミット）

- [ ] **Step 2: 型チェックと lint**

Run: `npm run typecheck && npm run lint`
Expected: エラー 0（`styles.tagline` の残置などがあればここで検出）

- [ ] **Step 3: push と PR 作成**

```bash
git push -u origin feature/44-home-staggered-grid
gh pr create --repo imunida-0321/waipa --base develop \
	--title "feat: ホーム画面を千鳥グリッドに刷新 (#44)" \
	--body "$(cat <<'EOF'
## 概要
Issue #44 の案3（千鳥グリッド）を採用したホーム刷新。

- ゲーム一覧を千鳥（右列半タイルずらし）2列グリッド化
- カード左上に人数バッジ（例: 2〜8人）を追加
- カード下キャッチ（tagline）を廃止、グラデフォールバックはタイル内左下タイトル＋右上絵文字に刷新
- ヒーローバナー・「ゲーム一覧」見出し・プレミアムロック・広告は現状維持（index.tsx 無変更）

spec: docs/superpowers/specs/2026-07-20-home-layout-redesign-design.md
（Issue #44 は実機確認後にクローズ判断のため Closes は付けない）

## テスト
- `npx jest` 全 suite PASS
- `npm run typecheck` / `npm run lint` エラー 0

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL が出力される
