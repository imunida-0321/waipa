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
