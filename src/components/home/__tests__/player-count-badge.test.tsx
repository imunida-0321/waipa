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
