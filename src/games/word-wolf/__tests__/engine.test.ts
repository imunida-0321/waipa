import {
	assignRoles,
	choosePair,
	FALLBACK_PAIRS,
	judgeResult,
	PACKS,
	swapWords,
	tallyVotes,
	type WordPair,
} from '../engine'

// 固定シーケンスを順に返す擬似乱数
function seqRng(values: number[]) {
	let i = 0
	return () => values[i++ % values.length]
}

describe('assignRoles', () => {
	it('wolfCount ぶんの index を重複なく昇順で返す', () => {
		const wolves = assignRoles(7, 2, seqRng([0.99, 0.0]))
		expect(wolves).toHaveLength(2)
		expect(new Set(wolves).size).toBe(2)
		expect(wolves).toEqual([...wolves].sort((a, b) => a - b))
	})

	it('全 index がウルフになり得る', () => {
		const seen = new Set<number>()
		for (let i = 0; i < 5; i++) {
			seen.add(assignRoles(5, 1, seqRng([i / 5]))[0])
		}
		expect(seen.size).toBe(5)
	})
})

describe('swapWords', () => {
	const pair: WordPair = { id: 'x', pack: 'food', word_a: 'ラーメン', word_b: 'うどん' }
	it('rng < 0.5 で word_a が多数派', () => {
		expect(swapWords(pair, () => 0.2)).toEqual({ majority: 'ラーメン', wolf: 'うどん' })
	})
	it('rng >= 0.5 で word_b が多数派', () => {
		expect(swapWords(pair, () => 0.7)).toEqual({ majority: 'うどん', wolf: 'ラーメン' })
	})
})

describe('tallyVotes', () => {
	it('最多票の index を返す', () => {
		expect(tallyVotes([1, 0, 0, 2])).toEqual([0])
	})
	it('同票は昇順で全員返す', () => {
		expect(tallyVotes([1, 0, 3, 2])).toEqual([0, 1, 2, 3])
	})
	it('null（未投票枠）は無視する', () => {
		expect(tallyVotes([null, 2, 2, null])).toEqual([2])
	})
})

describe('judgeResult', () => {
	it('吊られたのがウルフなら市民の勝ち', () => {
		expect(judgeResult(2, [2, 5])).toBe('citizens')
	})
	it('吊られたのが市民ならウルフの勝ち', () => {
		expect(judgeResult(1, [2])).toBe('wolf')
	})
})

describe('choosePair', () => {
	const pool: WordPair[] = [
		{ id: 'p1', pack: 'food', word_a: 'A', word_b: 'B' },
		{ id: 'p2', pack: 'food', word_a: 'C', word_b: 'D' },
		{ id: 'p3', pack: 'place', word_a: 'E', word_b: 'F' },
	]
	it('パックで絞って used を除外して選ぶ', () => {
		expect(choosePair(pool, 'food', ['p1'], () => 0).id).toBe('p2')
	})
	it('pool が空なら FALLBACK_PAIRS から選ぶ', () => {
		const picked = choosePair([], 'food', [], () => 0)
		expect(picked.pack).toBe('food')
		expect(FALLBACK_PAIRS.some((p) => p.id === picked.id)).toBe(true)
	})
	it('全て使用済みなら used を無視して選び直す', () => {
		const picked = choosePair(pool, 'food', ['p1', 'p2'], () => 0)
		expect(['p1', 'p2']).toContain(picked.id)
	})
})

describe('FALLBACK_PAIRS / PACKS', () => {
	it('全パックにフォールバックが2件以上ある', () => {
		for (const pack of PACKS) {
			expect(FALLBACK_PAIRS.filter((p) => p.pack === pack.id).length).toBeGreaterThanOrEqual(2)
		}
	})
})
