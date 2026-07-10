import type { Topic } from '@/lib/topics-store'
import { FALLBACK_BATSU_TOPICS, pickBatsuTopic } from '../topics'

describe('FALLBACK_BATSU_TOPICS', () => {
	it('20個・全て pack=batsu・id 重複なし', async () => {
		expect(FALLBACK_BATSU_TOPICS.length).toBeGreaterThanOrEqual(20)
		expect(FALLBACK_BATSU_TOPICS.every((t) => t.pack === 'batsu')).toBe(true)
		expect(new Set(FALLBACK_BATSU_TOPICS.map((t) => t.id)).size).toBe(
			FALLBACK_BATSU_TOPICS.length,
		)
	})
})

describe('pickBatsuTopic', () => {
	const remote: Topic[] = [
		{ id: 'r1', pack: 'batsu', text: 'リモート罰1' },
		{ id: 'r2', pack: 'batsu', text: 'リモート罰2' },
		{ id: 'k1', pack: 'king', text: '王様お題（対象外）' },
	]

	it('batsu パックのお題から rng で選ぶ（他パックは無視）', async () => {
		const t = pickBatsuTopic(remote, [], () => 0) // pool=[r1,r2] の先頭
		expect(t.id).toBe('r1')
	})

	it('使用済み ID を除外する', async () => {
		const t = pickBatsuTopic(remote, ['r1'], () => 0)
		expect(t.id).toBe('r2')
	})

	it('リモートに batsu がなければフォールバックから選ぶ', async () => {
		const t = pickBatsuTopic([], [], () => 0)
		expect(t.id).toBe(FALLBACK_BATSU_TOPICS[0].id)
	})

	it('プール枯渇時は usedIds を無視して必ず返す', async () => {
		const t = pickBatsuTopic(remote.slice(0, 1), ['r1'], () => 0)
		expect(t).toBeDefined()
		expect(t.pack).toBe('batsu')
	})
})
