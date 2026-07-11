import {
	DECLARATIONS,
	MIE,
	declarationLabel,
	isStrongerThan,
	isTruthful,
	normalizeRoll,
	rank,
	rollDice,
	validDeclarations,
} from '../engine'

describe('normalizeRoll', () => {
	it('大きい方が十の位（3,5 → 53）', () => {
		expect(normalizeRoll(3, 5)).toBe(53)
		expect(normalizeRoll(5, 3)).toBe(53)
	})
	it('2と1 は 21（ミエ）になる', () => {
		expect(normalizeRoll(1, 2)).toBe(MIE)
	})
	it('ゾロ目はそのまま2桁（4,4 → 44）', () => {
		expect(normalizeRoll(4, 4)).toBe(44)
	})
})

describe('rank の序列境界', () => {
	it('21（ミエ）は最強: 21 > 66', () => {
		expect(rank(MIE)).toBeGreaterThan(rank(66))
	})
	it('最弱ゾロ目は最強通常目より強い: 11 > 65', () => {
		expect(rank(11)).toBeGreaterThan(rank(65))
	})
	it('ゾロ目同士は目の大きさ順: 66 > 55 > 11', () => {
		expect(rank(66)).toBeGreaterThan(rank(55))
		expect(rank(55)).toBeGreaterThan(rank(11))
	})
	it('通常目は数値順: 65 > 54 > 31', () => {
		expect(rank(65)).toBeGreaterThan(rank(54))
		expect(rank(54)).toBeGreaterThan(rank(31))
	})
	it('31 が全体の最弱', () => {
		for (const v of DECLARATIONS) {
			if (v !== 31) expect(rank(v)).toBeGreaterThan(rank(31))
		}
	})
})

describe('DECLARATIONS', () => {
	it('21件・強い順・重複なし', () => {
		expect(DECLARATIONS).toHaveLength(21)
		expect(new Set(DECLARATIONS).size).toBe(21)
		for (let i = 1; i < DECLARATIONS.length; i++) {
			expect(rank(DECLARATIONS[i - 1])).toBeGreaterThan(rank(DECLARATIONS[i]))
		}
	})
	it('先頭は 21、末尾は 31', () => {
		expect(DECLARATIONS[0]).toBe(MIE)
		expect(DECLARATIONS[20]).toBe(31)
	})
})

describe('isStrongerThan / validDeclarations', () => {
	it('null（ラウンド最初）は全21件', () => {
		expect(validDeclarations(null)).toHaveLength(21)
	})
	it('中間値: 54 より強いのは 21 + ゾロ目6 + 65..61 の 12件', () => {
		const valid = validDeclarations(54)
		expect(valid).toEqual([21, 66, 55, 44, 33, 22, 11, 65, 64, 63, 62, 61])
	})
	it('66 の次は 21 のみ', () => {
		expect(validDeclarations(66)).toEqual([21])
	})
	it('21 の次は存在しない（強制ダウト）', () => {
		expect(validDeclarations(MIE)).toEqual([])
	})
	it('isStrongerThan は厳密比較（同値は false）', () => {
		expect(isStrongerThan(53, 53)).toBe(false)
		expect(isStrongerThan(11, 65)).toBe(true)
	})
})

describe('isTruthful（「本当」= 実出目 rank ≥ 宣言 rank）', () => {
	it('実出目ちょうど → 本当', () => {
		expect(isTruthful(53, 53)).toBe(true)
	})
	it('実出目が上回る → 本当（宣言53・実出目ゾロ目11）', () => {
		expect(isTruthful(53, 11)).toBe(true)
	})
	it('実出目が下回る → 嘘（宣言66・実出目65）', () => {
		expect(isTruthful(66, 65)).toBe(false)
	})
	it('21 宣言は実出目 21 のときだけ本当', () => {
		expect(isTruthful(MIE, MIE)).toBe(true)
		expect(isTruthful(MIE, 66)).toBe(false)
	})
})

describe('rollDice', () => {
	it('rng=0 で (1,1) → 11', () => {
		expect(rollDice(() => 0)).toEqual({ d1: 1, d2: 1, value: 11 })
	})
	it('rng が 1 に近いと (6,6) → 66', () => {
		expect(rollDice(() => 0.9999999).value).toBe(66)
	})
	it('出目は常に 1〜6・value は正規化2桁', () => {
		let i = 0
		const seq = [0.1, 0.9]
		const r = rollDice(() => seq[i++ % 2])
		expect(r.d1).toBeGreaterThanOrEqual(1)
		expect(r.d2).toBeLessThanOrEqual(6)
		expect(r.value).toBe(normalizeRoll(r.d1, r.d2))
	})
})

describe('declarationLabel', () => {
	it('21 はミエ表記', () => {
		expect(declarationLabel(MIE)).toBe('21（ミエ）')
	})
	it('ゾロ目表記', () => {
		expect(declarationLabel(44)).toBe('44（ゾロ目）')
	})
	it('通常目はそのまま', () => {
		expect(declarationLabel(53)).toBe('53')
	})
})
