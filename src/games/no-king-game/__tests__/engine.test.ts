import type { Topic } from '@/lib/topics-store'
import { dealNumbers, drawTopic, FALLBACK_TOPICS, type Rng } from '../engine'

const seq = (...values: number[]): Rng => {
	let i = 0
	return () => values[i++] ?? 0.999
}

const topics: Topic[] = [
	{ id: 't1', pack: 'king', text: '30秒間ずっと笑顔でいる' },
	{ id: 't2', pack: 'king', text: '{B}番の人を全力で褒める' },
	{ id: 't3', pack: 'king', text: 'ものまねをする' },
]

describe('dealNumbers', () => {
	it('1..n のシャッフル順列を返す', () => {
		const nums = dealNumbers(5, seq(0.1, 0.9, 0.3, 0.7, 0.5))
		expect([...nums].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
	})
	it('乱数によって並びが変わる', () => {
		const a = dealNumbers(6, seq(0, 0, 0, 0, 0, 0))
		const b = dealNumbers(6, seq(0.99, 0.99, 0.99, 0.99, 0.99, 0.99))
		expect(a).not.toEqual(b)
	})
})

describe('drawTopic', () => {
	it('未使用のお題から抽選し、実行役番号は 1..count の範囲', () => {
		const r = drawTopic(topics, [], 4, seq(0, 0, 0))
		expect(topics.map((t) => t.id)).toContain(r.topicId)
		expect(r.executorNumber).toBeGreaterThanOrEqual(1)
		expect(r.executorNumber).toBeLessThanOrEqual(4)
		expect(r.usedTopicIds).toContain(r.topicId)
	})
	it('使用済み ID は抽選対象から外れる', () => {
		const r = drawTopic(topics, ['t1', 't3'], 4, seq(0, 0, 0))
		expect(r.topicId).toBe('t2')
	})
	it('{B} は実行役以外の番号に置換される', () => {
		// 全乱数パターンで実行役と {B} が一致しないこと
		for (let i = 0; i < 20; i++) {
			const rng: Rng = () => (((i * 7919) % 100) + 0.5) / 100
			const r = drawTopic([topics[1]], [], 3, rng)
			const bNum = Number(r.topicText.match(/^(\d+)番/)?.[1])
			expect(bNum).toBeGreaterThanOrEqual(1)
			expect(bNum).toBeLessThanOrEqual(3)
			expect(bNum).not.toBe(r.executorNumber)
		}
	})
	it('全お題使用済みなら usedTopicIds をリセットして再抽選する', () => {
		const r = drawTopic(topics, ['t1', 't2', 't3'], 4, seq(0, 0, 0))
		expect(r.topicId).not.toBeNull()
		expect(r.usedTopicIds).toEqual([r.topicId])
	})
	it('お題リストが空なら内蔵フォールバックから抽選する', () => {
		const r = drawTopic([], [], 4, seq(0, 0, 0))
		expect(FALLBACK_TOPICS.map((t) => t.id)).toContain(r.topicId)
		expect(r.topicText).not.toBe('')
	})
})

describe('FALLBACK_TOPICS', () => {
	it('10件あり、id が一意', () => {
		expect(FALLBACK_TOPICS).toHaveLength(10)
		expect(new Set(FALLBACK_TOPICS.map((t) => t.id)).size).toBe(10)
	})
})
