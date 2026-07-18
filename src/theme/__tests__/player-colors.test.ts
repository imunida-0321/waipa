import { PLAYER_COLORS, playerColor } from '../player-colors'

describe('player-colors', () => {
	it('12色のプレイヤー色を定義している', () => {
		expect(PLAYER_COLORS).toHaveLength(12)
		expect(PLAYER_COLORS[0]).toEqual({ name: '赤', value: '#FF3B5C' })
		expect(PLAYER_COLORS[11]).toEqual({ name: '茶', value: '#A16207' })
	})

	it('index 順にプレイヤー色を返す', () => {
		expect(playerColor(1)).toBe(PLAYER_COLORS[1])
		expect(playerColor(5)).toBe(PLAYER_COLORS[5])
	})

	it('13人目以降は先頭から循環する', () => {
		expect(playerColor(12)).toBe(PLAYER_COLORS[0])
		expect(playerColor(14)).toBe(PLAYER_COLORS[2])
	})
})
