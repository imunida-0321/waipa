import { amountToSlots, assignSlot, needsSpin, playerTotals, pickPlayerIndex } from '../payment'
import type { Rng } from '../payment'

describe('amountToSlots', () => {
	it('124 を位取り付きスロットに分解する', () => {
		const slots = amountToSlots(124)
		expect(slots.map((s) => s.char)).toEqual(['1', '2', '4'])
		expect(slots.map((s) => s.place)).toEqual([100, 10, 1])
		expect(slots.map((s) => s.value)).toEqual([100, 20, 4])
		expect(slots.every((s) => s.playerIndex === null)).toBe(true)
	})

	it('0 の桁は value 0 を持つ', () => {
		const slots = amountToSlots(120)
		expect(slots.map((s) => s.value)).toEqual([100, 20, 0])
	})

	it('0 は単一の 0 桁スロットになりスピン不要・支払0', () => {
		const slots = amountToSlots(0)
		expect(slots).toHaveLength(1)
		expect(slots[0]).toMatchObject({ char: '0', place: 1, value: 0, playerIndex: null })
		expect(needsSpin(slots[0])).toBe(false)
		expect(playerTotals(slots, 2)).toEqual([0, 0])
	})

	it('1桁の金額は1スロット・全額がその桁', () => {
		const slots = amountToSlots(7)
		expect(slots).toHaveLength(1)
		expect(slots[0]).toMatchObject({ char: '7', place: 1, value: 7 })
	})
})

describe('needsSpin', () => {
	it('0 の桁はスピン不要', () => {
		const [hundred, , zero] = amountToSlots(120)
		expect(needsSpin(hundred)).toBe(true)
		expect(needsSpin(zero)).toBe(false)
	})
})

describe('assignSlot / playerTotals', () => {
	it('割り当てた桁の位取り額を担当者に加算し、合計が入力額に一致する', () => {
		let slots = amountToSlots(124) // 100 / 20 / 4
		slots = assignSlot(slots, 0, 0) // 百の位 → プレイヤー0
		slots = assignSlot(slots, 1, 0) // 十の位 → プレイヤー0
		slots = assignSlot(slots, 2, 1) // 一の位 → プレイヤー1
		const totals = playerTotals(slots, 2)
		expect(totals).toEqual([120, 4])
		expect(totals.reduce((a, b) => a + b, 0)).toBe(124)
	})

	it('未割り当て・0桁は誰にも加算されない', () => {
		const slots = amountToSlots(120)
		expect(playerTotals(slots, 3)).toEqual([0, 0, 0])
	})
})

describe('pickPlayerIndex', () => {
	it('playerCount=1 は必ず 0 を返す', () => {
		for (let i = 0; i < 20; i++) expect(pickPlayerIndex(1, Math.random)).toBe(0)
	})

	it('0..playerCount-1 の範囲に収まる', () => {
		for (let i = 0; i < 100; i++) {
			const v = pickPlayerIndex(5, Math.random)
			expect(v).toBeGreaterThanOrEqual(0)
			expect(v).toBeLessThan(5)
			expect(Number.isInteger(v)).toBe(true)
		}
	})

	it('注入された rng が 0 を返すと index 0 を返す', () => {
		const rng: Rng = () => 0
		expect(pickPlayerIndex(4, rng)).toBe(0)
	})

	it('注入された rng が 1 に極めて近い値を返すと最後の index を返す', () => {
		const rng: Rng = () => 0.999999
		expect(pickPlayerIndex(4, rng)).toBe(3)
	})

	it('注入された rng の中間値から決定的に index を選ぶ', () => {
		const rng: Rng = () => 0.5
		expect(pickPlayerIndex(4, rng)).toBe(2)
	})
})
