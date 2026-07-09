import { deviationMs, formatDeviation, formatSeconds, rankRecords, tierOf } from '../judge'

describe('deviationMs', () => {
	it('5000ms との差の絶対値を返す', () => {
		expect(deviationMs(5320)).toBe(320)
		expect(deviationMs(4680)).toBe(320)
		expect(deviationMs(5000)).toBe(0)
	})
})

describe('tierOf', () => {
	it('境界値で正しい tier を返す', () => {
		expect(tierOf(5049)).toBe('pittari')
		expect(tierOf(5050)).toBe('pittari') // 50ms ちょうどはぴったり賞
		expect(tierOf(5051)).toBe('good')
		expect(tierOf(4950)).toBe('pittari')
		expect(tierOf(5200)).toBe('good') // 200ms ちょうど
		expect(tierOf(5201)).toBe('close')
		expect(tierOf(5500)).toBe('close') // 500ms ちょうど
		expect(tierOf(5501)).toBe('far')
	})
})

describe('rankRecords', () => {
	it('deviation 昇順に並び、最大 deviation の人が敗者になる', () => {
		const ranked = rankRecords([4710, 4980, 5170, 5820])
		expect(ranked.map((r) => r.playerIndex)).toEqual([1, 2, 0, 3])
		expect(ranked.map((r) => r.isLoser)).toEqual([false, false, false, true])
		expect(ranked[0].tier).toBe('pittari')
	})

	it('同率最下位は全員敗者', () => {
		const ranked = rankRecords([5300, 4700, 5000])
		expect(ranked.filter((r) => r.isLoser).map((r) => r.playerIndex)).toEqual([0, 1])
	})

	it('全員同記録なら全員敗者', () => {
		const ranked = rankRecords([5100, 5100])
		expect(ranked.every((r) => r.isLoser)).toBe(true)
	})

	it('同率は playerIndex 昇順で安定', () => {
		const ranked = rankRecords([5200, 4800, 5100])
		expect(ranked.map((r) => r.playerIndex)).toEqual([2, 0, 1])
	})
})

describe('formatSeconds', () => {
	it('小数2桁の秒表示にする', () => {
		expect(formatSeconds(5320)).toBe('5.32')
		expect(formatSeconds(4980)).toBe('4.98')
		expect(formatSeconds(0)).toBe('0.00')
	})
})

describe('formatDeviation', () => {
	it('符号付き偏差を返す', () => {
		expect(formatDeviation(5320)).toBe('+0.32')
		expect(formatDeviation(4980)).toBe('-0.02')
		expect(formatDeviation(5000)).toBe('±0.00')
	})
})
