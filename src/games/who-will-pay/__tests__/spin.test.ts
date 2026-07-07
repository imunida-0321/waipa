import { finalAngleForPlayer, nextAngleForSegment, sectorForAngle, wheelRepeats } from '../spin'

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

describe('wheelRepeats', () => {
	it('各色を最低2回くり返す', () => {
		for (let count = 2; count <= 8; count++) {
			expect(wheelRepeats(count)).toBeGreaterThanOrEqual(2)
		}
	})

	it('総セグメント数が概ね 16〜21 に収まる', () => {
		for (let count = 2; count <= 8; count++) {
			const total = count * wheelRepeats(count)
			expect(total).toBeGreaterThanOrEqual(16)
			expect(total).toBeLessThanOrEqual(21)
		}
	})
})

describe('細分割盤の当選色整合性', () => {
	it('当選プレイヤーの各セグメントで止めると、その色（=プレイヤー）を指す', () => {
		for (const count of [2, 3, 4, 5, 6, 8]) {
			const repeats = wheelRepeats(count)
			const total = count * repeats
			for (let p = 0; p < count; p++) {
				for (let k = 0; k < repeats; k++) {
					const segment = p + count * k
					const angle = finalAngleForPlayer(segment, total, 5)
					expect(sectorForAngle(angle, total) % count).toBe(p)
				}
			}
		}
	})
})

describe('nextAngleForSegment（複数スピンのドリフト非発生）', () => {
	it('累積回転しても毎回セグメント中心（=当選色）で止まる', () => {
		for (const count of [2, 3, 4, 5, 6, 8]) {
			const repeats = wheelRepeats(count)
			const total = count * repeats
			let current = 0
			// 連続する当選プレイヤー列を回し、毎回その色で止まることを確認
			for (const p of [0, 1, count - 1, 1, 0, count - 1]) {
				const segment = p + count * (1 % repeats)
				current = nextAngleForSegment(current, segment, total, 5)
				expect(sectorForAngle(current, total) % count).toBe(p)
			}
		}
	})

	it('各スピンで少なくとも turns 回転ぶん前進する', () => {
		const total = 3 * wheelRepeats(3)
		const prev = 1234 // 任意の累積角
		const next = nextAngleForSegment(prev, 1, total, 5)
		expect(next - prev).toBeGreaterThanOrEqual(360 * 5)
	})
})
