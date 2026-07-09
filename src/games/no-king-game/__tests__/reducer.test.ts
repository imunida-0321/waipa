import type { Topic } from '@/lib/topics-store'
import type { Rng } from '../engine'
import { initialState, MAX_SKIPS, reduce, type GameState } from '../reducer'

const seq = (...values: number[]): Rng => {
	let i = 0
	return () => values[i++] ?? 0.999
}

const rng: Rng = () => 0.5

const topics: Topic[] = [
	{ id: 't1', pack: 'king', text: 'お題A' },
	{ id: 't2', pack: 'king', text: 'お題B' },
	{ id: 't3', pack: 'king', text: 'お題C' },
]

// deal フェーズまで進めたステート
function dealt(count = 3): GameState {
	let s = reduce(initialState(), { type: 'setCount', count })
	s = reduce(s, { type: 'deal', rng })
	return s
}

// reveal フェーズまで進めたステート
function revealed(count = 3): GameState {
	let s = dealt(count)
	for (let i = 0; i < count; i++) {
		s = reduce(s, { type: 'confirmNumber', topics, rng })
	}
	return s
}

describe('initialState / setCount', () => {
	it('初期フェーズは count、スキップ残は MAX_SKIPS', () => {
		const s = initialState()
		expect(s.phase).toBe('count')
		expect(s.skipsLeft).toBe(MAX_SKIPS)
		expect(s.round).toBe(1)
	})
	it('setCount は 3..12 にクランプされる', () => {
		expect(reduce(initialState(), { type: 'setCount', count: 2 }).playerCount).toBe(3)
		expect(reduce(initialState(), { type: 'setCount', count: 13 }).playerCount).toBe(12)
		expect(reduce(initialState(), { type: 'setCount', count: 8 }).playerCount).toBe(8)
	})
})

describe('deal / confirmNumber', () => {
	it('deal で count → deal、人数分の番号が配られる', () => {
		const s = dealt(4)
		expect(s.phase).toBe('deal')
		expect(s.numbers).toHaveLength(4)
		expect([...s.numbers].sort((a, b) => a - b)).toEqual([1, 2, 3, 4])
		expect(s.dealIndex).toBe(0)
	})
	it('confirmNumber で dealIndex が進み、全員確認で reveal へ＋お題抽選', () => {
		let s = dealt(3)
		s = reduce(s, { type: 'confirmNumber', topics, rng })
		expect(s.dealIndex).toBe(1)
		expect(s.phase).toBe('deal')
		s = reduce(s, { type: 'confirmNumber', topics, rng })
		s = reduce(s, { type: 'confirmNumber', topics, rng })
		expect(s.phase).toBe('reveal')
		expect(s.topicId).not.toBeNull()
		expect(s.topicText).not.toBe('')
		expect(s.executorNumber).toBeGreaterThanOrEqual(1)
		expect(s.executorNumber).toBeLessThanOrEqual(3)
	})
})

describe('skip', () => {
	it('reveal 中にスキップするとお題が引き直され、残数が減る', () => {
		const s0 = revealed()
		const before = s0.topicId
		const s1 = reduce(s0, { type: 'skip', topics, rng: seq(0, 0) })
		expect(s1.skipsLeft).toBe(MAX_SKIPS - 1)
		expect(s1.topicId).not.toBe(before)
		expect(s1.usedTopicIds).toContain(before)
	})
	it('スキップ残 0 では何も起きない', () => {
		let s = revealed()
		s = reduce(s, { type: 'skip', topics, rng })
		s = reduce(s, { type: 'skip', topics, rng })
		const exhausted = s
		const after = reduce(exhausted, { type: 'skip', topics, rng })
		expect(after).toBe(exhausted)
	})
	it('発表後（done）はスキップできない', () => {
		let s = revealed()
		s = reduce(s, { type: 'revealDone' })
		const after = reduce(s, { type: 'skip', topics, rng })
		expect(after).toBe(s)
	})
})

describe('revealDone / nextRound', () => {
	it('revealDone で reveal → done', () => {
		const s = reduce(revealed(), { type: 'revealDone' })
		expect(s.phase).toBe('done')
	})
	it('nextRound で done → deal、round+1、番号再配布、スキップ残と使用済みお題は維持', () => {
		let s = revealed()
		const usedBefore = s.usedTopicIds
		s = reduce(s, { type: 'skip', topics, rng: seq(0, 0) })
		const skipsAfter = s.skipsLeft
		s = reduce(s, { type: 'revealDone' })
		s = reduce(s, { type: 'nextRound', rng: seq(0.9, 0.1, 0.5) })
		expect(s.phase).toBe('deal')
		expect(s.round).toBe(2)
		expect(s.dealIndex).toBe(0)
		expect(s.numbers).toHaveLength(3)
		expect(s.skipsLeft).toBe(skipsAfter)
		expect(s.usedTopicIds.length).toBeGreaterThanOrEqual(usedBefore.length)
	})
})
