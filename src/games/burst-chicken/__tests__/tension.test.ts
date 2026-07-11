import { TENSION_FULL, TENSION_START, tensionLevel } from '../tension'

it('TENSION_START 以下は 0', () => {
	expect(tensionLevel(0)).toBe(0)
	expect(tensionLevel(TENSION_START)).toBe(0)
})

it('TENSION_FULL 以上は 1 にクランプ', () => {
	expect(tensionLevel(TENSION_FULL)).toBe(1)
	expect(tensionLevel(TENSION_FULL + 10)).toBe(1)
})

it('合計に対して単調非減少', () => {
	let prev = 0
	for (let total = 0; total <= TENSION_FULL + 5; total++) {
		const level = tensionLevel(total)
		expect(level).toBeGreaterThanOrEqual(prev)
		expect(level).toBeGreaterThanOrEqual(0)
		expect(level).toBeLessThanOrEqual(1)
		prev = level
	}
})
