import type { Topic } from '@/lib/topics-store'
import { FALLBACK_WHISPER_TOPICS, pickWhisperTopic } from '../topics'

const remote: Topic[] = [
	{ id: 'r1', pack: 'whisper', text: 'リモートお題1' },
	{ id: 'r2', pack: 'whisper', text: 'リモートお題2' },
	{ id: 'x1', pack: 'talk', text: '別パック' },
]

describe('pickWhisperTopic', () => {
	it('リモートに whisper があればそこから選ぶ（他パックは混ぜない）', () => {
		const t = pickWhisperTopic(remote, [], () => 0)
		expect(t.id).toBe('r1')
		expect(t.pack).toBe('whisper')
	})
	it('リモートに whisper が無ければフォールバックから選ぶ', () => {
		const t = pickWhisperTopic([{ id: 'x1', pack: 'talk', text: '別パック' }], [], () => 0)
		expect(t.id).toBe(FALLBACK_WHISPER_TOPICS[0].id)
	})
	it('使用済み ID は除外される', () => {
		const t = pickWhisperTopic(remote, ['r1'], () => 0)
		expect(t.id).toBe('r2')
	})
	it('全て使用済みなら usedIds を無視して必ず1つ返す', () => {
		const t = pickWhisperTopic(remote, ['r1', 'r2'], () => 0)
		expect(t.pack).toBe('whisper')
	})
	it('フォールバックは20本で全て whisper パック', () => {
		expect(FALLBACK_WHISPER_TOPICS).toHaveLength(20)
		expect(FALLBACK_WHISPER_TOPICS.every((t) => t.pack === 'whisper')).toBe(true)
	})
})
