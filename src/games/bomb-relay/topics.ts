import type { Topic } from '@/lib/topics-store'
import type { Rng } from './engine'

// Supabase 'talk' パック未取得時のフォールバック（0002_seed_topics.sql の先頭20問と同一文言）
export const FALLBACK_TALK_TOPICS: readonly Topic[] = [
	{ id: 'fb-talk-1', pack: 'talk', text: 'ラーメンの具といえば？' },
	{ id: 'fb-talk-2', pack: 'talk', text: '都道府県の名前' },
	{ id: 'fb-talk-3', pack: 'talk', text: 'コンビニで買えるもの' },
	{ id: 'fb-talk-4', pack: 'talk', text: '赤いもの' },
	{ id: 'fb-talk-5', pack: 'talk', text: '丸いもの' },
	{ id: 'fb-talk-6', pack: 'talk', text: '学校にあるもの' },
	{ id: 'fb-talk-7', pack: 'talk', text: '冷蔵庫に入っているもの' },
	{ id: 'fb-talk-8', pack: 'talk', text: '動物園にいる動物' },
	{ id: 'fb-talk-9', pack: 'talk', text: '海の生き物' },
	{ id: 'fb-talk-10', pack: 'talk', text: 'スポーツの名前' },
	{ id: 'fb-talk-11', pack: 'talk', text: '国の名前' },
	{ id: 'fb-talk-12', pack: 'talk', text: 'アニメのキャラクター' },
	{ id: 'fb-talk-13', pack: 'talk', text: 'おにぎりの具' },
	{ id: 'fb-talk-14', pack: 'talk', text: '寿司ネタ' },
	{ id: 'fb-talk-15', pack: 'talk', text: 'パンの種類' },
	{ id: 'fb-talk-16', pack: 'talk', text: '飲み物の名前' },
	{ id: 'fb-talk-17', pack: 'talk', text: '果物の名前' },
	{ id: 'fb-talk-18', pack: 'talk', text: '野菜の名前' },
	{ id: 'fb-talk-19', pack: 'talk', text: '芸能人の名前' },
	{ id: 'fb-talk-20', pack: 'talk', text: '駅の名前' },
]

// リモート talk → フォールバックの順で、usedIds を除外して rng 抽選。
// 除外後に空でも usedIds を無視して必ず1つ返す（reaction-pairs の pickBatsuTopic と同アルゴリズム）
export function pickTalkTopic(topics: Topic[], usedIds: string[], rng: Rng): Topic {
	const remote = topics.filter((t) => t.pack === 'talk')
	const source = remote.length > 0 ? remote : FALLBACK_TALK_TOPICS
	const pool = source.filter((t) => !usedIds.includes(t.id))
	const candidates = pool.length > 0 ? pool : source
	return candidates[Math.floor(rng() * candidates.length)]
}
