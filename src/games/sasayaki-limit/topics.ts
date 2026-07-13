import type { Topic } from '@/lib/topics-store'
import type { Rng } from './engine'

// Supabase 'whisper' パック未取得時のフォールバック（0006_seed_whisper_topics.sql の先頭20問と同一文言）
export const FALLBACK_WHISPER_TOPICS: readonly Topic[] = [
	{ id: 'fb-whisper-1', pack: 'whisper', text: '乾杯ーー！' },
	{ id: 'fb-whisper-2', pack: 'whisper', text: '今日は無礼講だ！' },
	{ id: 'fb-whisper-3', pack: 'whisper', text: 'よっ、待ってました！' },
	{ id: 'fb-whisper-4', pack: 'whisper', text: '幹事さん、ありがとう！' },
	{ id: 'fb-whisper-5', pack: 'whisper', text: '明日もがんばるぞー！' },
	{ id: 'fb-whisper-6', pack: 'whisper', text: 'ここのからあげ、世界一！' },
	{ id: 'fb-whisper-7', pack: 'whisper', text: 'みんな大好きだーー！' },
	{ id: 'fb-whisper-8', pack: 'whisper', text: '次いくぞ、次！' },
	{ id: 'fb-whisper-9', pack: 'whisper', text: '今日という日を忘れない！' },
	{ id: 'fb-whisper-10', pack: 'whisper', text: 'しーっ、静かに！' },
	{ id: 'fb-whisper-11', pack: 'whisper', text: '俺の話を聞けーー！' },
	{ id: 'fb-whisper-12', pack: 'whisper', text: 'ラストオーダーです！' },
	{ id: 'fb-whisper-13', pack: 'whisper', text: '優勝ーー！' },
	{ id: 'fb-whisper-14', pack: 'whisper', text: 'それな！！' },
	{ id: 'fb-whisper-15', pack: 'whisper', text: 'まじで！？' },
	{ id: 'fb-whisper-16', pack: 'whisper', text: 'やっぱりそうだと思った！' },
	{ id: 'fb-whisper-17', pack: 'whisper', text: '全員集合ーー！' },
	{ id: 'fb-whisper-18', pack: 'whisper', text: 'お疲れさまでした！' },
	{ id: 'fb-whisper-19', pack: 'whisper', text: 'さすがです先輩！' },
	{ id: 'fb-whisper-20', pack: 'whisper', text: 'アンコール！アンコール！' },
]

// リモート whisper → フォールバックの順で、usedIds を除外して rng 抽選。
// 除外後に空でも usedIds を無視して必ず1つ返す（bomb-relay の pickTalkTopic と同アルゴリズム）
export function pickWhisperTopic(topics: Topic[], usedIds: string[], rng: Rng): Topic {
	const remote = topics.filter((t) => t.pack === 'whisper')
	const source = remote.length > 0 ? remote : FALLBACK_WHISPER_TOPICS
	const pool = source.filter((t) => !usedIds.includes(t.id))
	const candidates = pool.length > 0 ? pool : source
	return candidates[Math.floor(rng() * candidates.length)]
}
