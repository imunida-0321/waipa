import { LUCKY_PUNISHMENT_ID, NORMAL_PUNISHMENTS, SPECIAL_PUNISHMENTS } from '../punishments'

it('通常罰は40個・特大罰は10個ある', () => {
	expect(NORMAL_PUNISHMENTS).toHaveLength(40)
	expect(SPECIAL_PUNISHMENTS).toHaveLength(10)
})

it('ID は n01..n40 / s01..s10 で重複がない', () => {
	const nIds = NORMAL_PUNISHMENTS.map((p) => p.id)
	const sIds = SPECIAL_PUNISHMENTS.map((p) => p.id)
	expect(nIds).toEqual(Array.from({ length: 40 }, (_, i) => `n${String(i + 1).padStart(2, '0')}`))
	expect(sIds).toEqual(Array.from({ length: 10 }, (_, i) => `s${String(i + 1).padStart(2, '0')}`))
})

it('type が正しく、テキストは空でなく重複しない', () => {
	NORMAL_PUNISHMENTS.forEach((p) => expect(p.type).toBe('normal'))
	SPECIAL_PUNISHMENTS.forEach((p) => expect(p.type).toBe('special'))
	const texts = [...NORMAL_PUNISHMENTS, ...SPECIAL_PUNISHMENTS].map((p) => p.text)
	expect(new Set(texts).size).toBe(texts.length)
	texts.forEach((t) => expect(t.length).toBeGreaterThan(0))
})

it('ラッキーカードは n40', () => {
	expect(LUCKY_PUNISHMENT_ID).toBe('n40')
	expect(NORMAL_PUNISHMENTS.find((p) => p.id === 'n40')?.text).toContain('ラッキー')
})
