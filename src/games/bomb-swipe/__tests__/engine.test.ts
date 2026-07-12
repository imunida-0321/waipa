import { MINE_MAX, MINE_MIN, isExploded, pickMine, scoreFromDrag } from '../engine'

describe('pickMine', () => {
	it('rng=0 で下限、rng≒1 で上限になる', () => {
		expect(pickMine(() => 0)).toBe(MINE_MIN)
		expect(pickMine(() => 0.9999999)).toBe(MINE_MAX)
	})

	it('常に整数で 60〜95 に収まる', () => {
		for (let i = 0; i < 100; i++) {
			const mine = pickMine(Math.random)
			expect(Number.isInteger(mine)).toBe(true)
			expect(mine).toBeGreaterThanOrEqual(MINE_MIN)
			expect(mine).toBeLessThanOrEqual(MINE_MAX)
		}
	})
})

describe('isExploded', () => {
	it('地雷ちょうどは爆発（踏んだらアウト）', () => {
		expect(isExploded(60, 60)).toBe(true)
	})

	it('地雷未満はセーフ、超過は爆発', () => {
		expect(isExploded(59, 60)).toBe(false)
		expect(isExploded(61, 60)).toBe(true)
	})
})

describe('scoreFromDrag', () => {
	it('ドラッグ量をトラック高さ比の 0〜100 整数に変換する', () => {
		expect(scoreFromDrag(0, 400)).toBe(0)
		expect(scoreFromDrag(200, 400)).toBe(50)
		expect(scoreFromDrag(400, 400)).toBe(100)
	})

	it('範囲外はクランプする（下方向ドラッグ・トラック超え）', () => {
		expect(scoreFromDrag(-50, 400)).toBe(0)
		expect(scoreFromDrag(500, 400)).toBe(100)
	})

	it('トラック高さ 0 以下では 0 を返す（レイアウト前の防御）', () => {
		expect(scoreFromDrag(100, 0)).toBe(0)
	})
})
