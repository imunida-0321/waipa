import { finalAngleForPlayer, sectorForAngle } from '../spin'

describe('スピン角ロジック', () => {
	it('finalAngle を適用するとポインタが対象セクターを指す', () => {
		for (const count of [2, 3, 5, 8]) {
			for (let target = 0; target < count; target++) {
				const angle = finalAngleForPlayer(target, count, 5)
				expect(sectorForAngle(angle, count)).toBe(target)
			}
		}
	})

	it('turns 分の全回転を含む（角度が 360*turns 以上）', () => {
		expect(finalAngleForPlayer(0, 4, 5)).toBeGreaterThanOrEqual(360 * 5)
	})
})
