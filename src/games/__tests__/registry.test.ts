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
