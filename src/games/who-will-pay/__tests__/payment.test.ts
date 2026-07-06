import { amountToSlots, assignSlot, needsSpin, playerTotals } from '../payment'

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
