import type { Topic } from '@/lib/topics-store'
import { FALLBACK_TALK_TOPICS, pickTalkTopic } from '../topics'

describe('FALLBACK_TALK_TOPICS', () => {
	it('20個・全て pack=talk・id 重複なし', () => {
		expect(FALLBACK_TALK_TOPICS.length).toBeGreaterThanOrEqual(20)
		expect(FALLBACK_TALK_TOPICS.every((t) => t.pack === 'talk')).toBe(true)
		expect(new Set(FALLBACK_TALK_TOPICS.map((t) => t.id)).size).toBe(
			FALLBACK_TALK_TOPICS.length,
		)
	})
})

describe('pickTalkTopic', () => {
	const remote: Topic[] = [
		{ id: 'r1', pack: 'talk', text: 'リモートお題1' },
		{ id: 'r2', pack: 'talk', text: 'リモートお題2' },
		{ id: 'k1', pack: 'king', text: '王様お題（対象外）' },
	]

	it('talk パックのお題から rng で選ぶ（他パックは無視）', () => {
		expect(pickTalkTopic(remote, [], () => 0).id).toBe('r1')
	})

	it('使用済み ID を除外する', () => {
		expect(pickTalkTopic(remote, ['r1'], () => 0).id).toBe('r2')
	})

	it('リモートに talk がなければフォールバックから選ぶ', () => {
		expect(pickTalkTopic([], [], () => 0).id).toBe(FALLBACK_TALK_TOPICS[0].id)
	})

	it('プール枯渇時は usedIds を無視して必ず返す（残る1件が返る）', () => {
		const t = pickTalkTopic(remote.slice(0, 1), ['r1'], () => 0)
		expect(t.id).toBe('r1')
	})
})
