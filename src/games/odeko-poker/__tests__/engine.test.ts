import { CARD_MAX, dealCards, judge, type Declaration } from '../engine'

// 決定的な疑似乱数（テスト用シード付き）
function mulberry32(seed: number): () => number {
	let s = seed >>> 0
	return () => {
		s = (s + 0x6d2b79f5) >>> 0
		let t = s
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

describe('dealCards', () => {
	it('人数分のカードを 1〜13 から重複なしで配る', () => {
		for (const count of [3, 7, 12]) {
			const cards = dealCards(count, mulberry32(1))
			expect(cards).toHaveLength(count)
			expect(new Set(cards).size).toBe(count)
			for (const c of cards) {
				expect(c).toBeGreaterThanOrEqual(1)
				expect(c).toBeLessThanOrEqual(CARD_MAX)
			}
		}
	})

	it('同じ乱数シードなら同じ配布になる（rng 注入で決定的）', () => {
		expect(dealCards(5, mulberry32(42))).toEqual(dealCards(5, mulberry32(42)))
	})

	it('シャッフルされる（rng が偏れば並びが変わる）', () => {
		expect(dealCards(13, mulberry32(1))).not.toEqual(dealCards(13, mulberry32(2)))
	})
})

describe('judge', () => {
	const F: Declaration = 'fight'
	const D: Declaration = 'fold'

	it('勝負者2人以上: 勝負者の中で最弱カードの人が負け', () => {
		const j = judge([5, 9, 2, 13], [F, F, D, F])
		expect(j.outcome).toBe('normal')
		expect(j.loserIndices).toEqual([0]) // 勝負者 {5, 9, 13} の最弱は 5
		expect(j.winnerIndex).toBeNull()
	})

	it('降りた人の最弱カードは負け判定に含まれない', () => {
		const j = judge([5, 9, 2, 13], [F, F, D, D])
		expect(j.loserIndices).toEqual([0]) // 2 を持つ index 2 は降りているのでセーフ
	})

	it('勝負者1人: 負けなしの一人勝ち', () => {
		const j = judge([5, 9, 2], [D, F, D])
		expect(j.outcome).toBe('solo-fight')
		expect(j.loserIndices).toEqual([])
		expect(j.winnerIndex).toBe(1)
	})

	it('全員降り: 全員負け', () => {
		const j = judge([5, 9, 2], [D, D, D])
		expect(j.outcome).toBe('all-fold')
		expect(j.loserIndices).toEqual([0, 1, 2])
		expect(j.winnerIndex).toBeNull()
	})

	it('ヘタレ賞: その回の最強カード保持者が降りていたらその index', () => {
		const j = judge([5, 13, 2, 9], [F, D, D, F])
		expect(j.hetareIndex).toBe(1)
	})

	it('ヘタレ賞なし: 最強カード保持者が勝負していたら null', () => {
		const j = judge([5, 13, 2, 9], [F, F, D, D])
		expect(j.hetareIndex).toBeNull()
	})

	it('全員降りでもヘタレ賞は判定される（バッジ表示用）', () => {
		const j = judge([5, 13, 2], [D, D, D])
		expect(j.outcome).toBe('all-fold')
		expect(j.hetareIndex).toBe(1)
	})

	it('一人勝ちとヘタレ賞は同時に発生しうる', () => {
		const j = judge([5, 13, 2], [F, D, D])
		expect(j.outcome).toBe('solo-fight')
		expect(j.winnerIndex).toBe(0)
		expect(j.hetareIndex).toBe(1)
	})
})
