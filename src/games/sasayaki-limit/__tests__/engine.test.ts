import {
	ROUNDS,
	SILENCE_DB,
	SUDDEN_DEATH_ZONE_WIDTH,
	ZONE_WIDTHS,
	judge,
	makeZone,
	median,
	normalizeDb,
	tallyLosers,
	voiceRange,
	zoneWidthForRound,
} from '../engine'

describe('median', () => {
	it('奇数個は中央値', () => {
		expect(median([-40, -30, -50])).toBe(-40)
	})
	it('偶数個は中央2値の平均', () => {
		expect(median([-40, -30, -50, -20])).toBe(-35)
	})
	it('空配列は無音（SILENCE_DB）', () => {
		expect(median([])).toBe(SILENCE_DB)
	})
	it('突発音（外れ値）に引きずられない', () => {
		expect(median([-45, -44, -46, -45, -5])).toBe(-45)
	})
})

describe('voiceRange', () => {
	it('floor = ノイズフロア + 8dB', () => {
		expect(voiceRange(-40)).toEqual({ floorDb: -32, ceilDb: -2 })
	})
	it('静かな環境でも floor は -45 まで', () => {
		expect(voiceRange(-80).floorDb).toBe(-45)
	})
	it('うるさい環境でも floor は -20 まで', () => {
		expect(voiceRange(-10).floorDb).toBe(-20)
	})
})

describe('normalizeDb', () => {
	const range = { floorDb: -42, ceilDb: -2 }
	it('floor で 0、ceil で 1', () => {
		expect(normalizeDb(-42, range)).toBe(0)
		expect(normalizeDb(-2, range)).toBe(1)
	})
	it('中間は線形', () => {
		expect(normalizeDb(-22, range)).toBeCloseTo(0.5)
	})
	it('範囲外は 0..1 にクランプ', () => {
		expect(normalizeDb(-160, range)).toBe(0)
		expect(normalizeDb(0, range)).toBe(1)
	})
})

describe('zoneWidthForRound', () => {
	it('R1→R3 で狭くなる（40% → 30% → 22%）', () => {
		expect(zoneWidthForRound(1)).toBe(0.4)
		expect(zoneWidthForRound(2)).toBe(0.3)
		expect(zoneWidthForRound(3)).toBe(0.22)
	})
	it('ROUNDS 超の round は R3 と同じ幅', () => {
		expect(zoneWidthForRound(ROUNDS + 1)).toBe(ZONE_WIDTHS[ROUNDS - 1])
	})
	it('サドンデスは 15%', () => {
		expect(SUDDEN_DEATH_ZONE_WIDTH).toBe(0.15)
	})
})

describe('makeZone', () => {
	it('ゲージ内（0..1）に収まりはみ出さない', () => {
		const zone = makeZone(0.3, () => 0.999)
		expect(zone.high).toBeLessThanOrEqual(1)
		expect(zone.high - zone.low).toBeCloseTo(0.3)
	})
	it('rng=0 で最下部から始まる', () => {
		expect(makeZone(0.4, () => 0)).toEqual({ low: 0, high: 0.4 })
	})
})

describe('judge（境界は閉区間で ok）', () => {
	const zone = { low: 0.3, high: 0.6 }
	it('ゾーン端ぴったりは ok', () => {
		expect(judge(0.3, zone)).toBe('ok')
		expect(judge(0.6, zone)).toBe('ok')
	})
	it('端の直下は low・直上は high', () => {
		expect(judge(0.29999, zone)).toBe('low')
		expect(judge(0.60001, zone)).toBe('high')
	})
	it('ゾーン内は ok', () => {
		expect(judge(0.45, zone)).toBe('ok')
	})
})

describe('tallyLosers', () => {
	it('最少成功数のプレイヤー index 配列を返す', () => {
		expect(tallyLosers([2, 0, 3, 1])).toEqual([1])
	})
	it('同率最下位は全員返す', () => {
		expect(tallyLosers([1, 3, 1, 2])).toEqual([0, 2])
	})
	it('全員同数なら全員', () => {
		expect(tallyLosers([2, 2, 2])).toEqual([0, 1, 2])
	})
})
