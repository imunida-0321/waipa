import { fireEvent, render, within } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import type { GameMeta } from '@/games/registry'
import { colors, radii, spacing } from '@/theme/tokens'
import { GameCard } from '../game-card'

jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

let mockPremiumUnlocked = false
jest.mock('@/lib/premium', () => ({
	isPremiumUnlocked: () => mockPremiumUnlocked,
	usePremium: () => mockPremiumUnlocked,
}))

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

it('thumbnail なし: 絵文字＋タイトル＋人数バッジ＋キャッチのグラデカードを表示する', async () => {
	const { getByText, queryByTestId, getByTestId } = await render(
		<GameCard game={baseGame} onPress={jest.fn()} />,
	)
	expect(getByText('🎮')).toBeTruthy()
	expect(getByText('テストゲーム')).toBeTruthy()
	expect(getByTestId('player-count-badge')).toBeTruthy()
	expect(getByText('2〜8人')).toBeTruthy()
	// カード下キャッチは表示する（2026-07-20 レビューで復活）
	expect(getByText('テスト用のゲーム')).toBeTruthy()
	expect(queryByTestId('card-thumb-image')).toBeNull()
})

it('thumbnail あり: 画像＋人数バッジ＋カード下キャッチを表示し、タイトル文字は重ねない', async () => {
	const withThumb = { ...baseGame, cardThumbnail: 1 }
	const { getByText, queryByText, getByTestId, getByLabelText } = await render(
		<GameCard game={withThumb} onPress={jest.fn()} />,
	)
	expect(getByTestId('card-thumb-image')).toBeTruthy()
	expect(getByTestId('player-count-badge')).toBeTruthy()
	expect(queryByText('🎮')).toBeNull()
	expect(queryByText('テストゲーム')).toBeNull()
	// タイトルは読み上げ用ラベルとして残す
	expect(getByLabelText('テストゲーム')).toBeTruthy()
	// キャッチコピーは画像の下に出る
	expect(getByText('テスト用のゲーム')).toBeTruthy()
})

it('タップで onPress が呼ばれる（thumbnail あり）', async () => {
	const onPress = jest.fn()
	const withThumb = { ...baseGame, cardThumbnail: 1 }
	const { getByLabelText } = await render(<GameCard game={withThumb} onPress={onPress} />)
	fireEvent.press(getByLabelText('テストゲーム'))
	expect(onPress).toHaveBeenCalled()
})

it('キャッチは小さめフォント＋2行分の固定高さで段ずれを防ぐ', async () => {
	const { getByText } = await render(<GameCard game={baseGame} onPress={jest.fn()} />)
	const style = StyleSheet.flatten(getByText('テスト用のゲーム').props.style)
	expect(style.fontSize).toBe(12)
	expect(style.lineHeight).toBe(16)
	expect(style.minHeight).toBe(32)
})

it('サムネとキャッチをサーフェス背景のカード面で包む', async () => {
	const { getByTestId, getByText } = await render(<GameCard game={baseGame} onPress={jest.fn()} />)
	const surface = getByTestId('game-card-surface')
	const style = StyleSheet.flatten(surface.props.style)
	expect(style.backgroundColor).toBe(colors.surface)
	expect(style.borderColor).toBe(colors.surfaceBorder)
	expect(style.borderRadius).toBe(radii.lg)
	expect(style.padding).toBe(spacing.sm)
	// キャッチはカード面の中に入る
	const tagline = getByText('テスト用のゲーム')
	expect(within(surface).getByText('テスト用のゲーム')).toBe(tagline)
})

describe('プレミアムロック表示', () => {
	beforeEach(() => {
		mockPremiumUnlocked = false
	})

	it('premium かつ未解放: 黒マスク＋王冠アイコンのバッジを重ねる（グラデフォールバック）', async () => {
		const { getByTestId, getByText, queryByText } = await render(
			<GameCard game={{ ...baseGame, premium: true }} onPress={jest.fn()} />,
		)
		expect(getByTestId('premium-lock-mask')).toBeTruthy()
		expect(getByTestId('icon-crown')).toBeTruthy()
		expect(getByText('プレミアム')).toBeTruthy()
		expect(queryByText('👑 プレミアム')).toBeNull()
	})

	it('premium かつ未解放: cardThumbnail ありでもマスクを重ねる', async () => {
		const { getByTestId } = await render(
			<GameCard
				game={{ ...baseGame, premium: true, cardThumbnail: 1 }}
				onPress={jest.fn()}
			/>,
		)
		expect(getByTestId('card-thumb-image')).toBeTruthy()
		expect(getByTestId('premium-lock-mask')).toBeTruthy()
	})

	it('premium でも解放済みなら通常表示', async () => {
		mockPremiumUnlocked = true
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
