import type { Topic } from '@/lib/topics-store'
import type { Rng } from './engine'

// 全年齢向けの無難な罰お題（Supabase 'batsu' パック未取得時のフォールバック）
// 0003_seed_batsu_topics.sql と同じ方針: 飲酒・恋愛の直接的表現は入れない
export const FALLBACK_BATSU_TOPICS: readonly Topic[] = [
	{ id: 'fb-batsu-1', pack: 'batsu', text: '一発ギャグをする' },
	{ id: 'fb-batsu-2', pack: 'batsu', text: '変顔を5秒キープする' },
	{ id: 'fb-batsu-3', pack: 'batsu', text: '10秒間ロボットダンスをする' },
	{ id: 'fb-batsu-4', pack: 'batsu', text: 'ものまねを1つ披露する' },
	{ id: 'fb-batsu-5', pack: 'batsu', text: '全力で「イェーイ！」と叫ぶ' },
	{ id: 'fb-batsu-6', pack: 'batsu', text: '自分の名前を逆から3回言う' },
	{ id: 'fb-batsu-7', pack: 'batsu', text: '好きな食べ物を30秒間熱く語る' },
	{ id: 'fb-batsu-8', pack: 'batsu', text: '隣の人を全力で褒める' },
	{ id: 'fb-batsu-9', pack: 'batsu', text: '直近で撮った写真を1枚見せる' },
	{ id: 'fb-batsu-10', pack: 'batsu', text: 'ちょっと恥ずかしい話を1つする' },
	{ id: 'fb-batsu-11', pack: 'batsu', text: '30秒間ずっと笑顔でいる' },
	{ id: 'fb-batsu-12', pack: 'batsu', text: '動物のモノマネをして当ててもらう' },
	{ id: 'fb-batsu-13', pack: 'batsu', text: '全員に1人ずつあだ名をつける' },
	{ id: 'fb-batsu-14', pack: 'batsu', text: '子供の頃の夢を発表する' },
	{ id: 'fb-batsu-15', pack: 'batsu', text: '早口言葉「生麦生米生卵」を3回言う' },
	{ id: 'fb-batsu-16', pack: 'batsu', text: '最近の失敗談を1つ話す' },
	{ id: 'fb-batsu-17', pack: 'batsu', text: '次の自分の手番まで語尾に「ニャン」をつける' },
	{ id: 'fb-batsu-18', pack: 'batsu', text: 'その場でスクワットを10回する' },
	{ id: 'fb-batsu-19', pack: 'batsu', text: '真顔で「ととのいました」と言って一句詠む' },
	{ id: 'fb-batsu-20', pack: 'batsu', text: '全員とハイタッチして回る' },
]

// リモート batsu → フォールバックの順で、usedIds を除外して rng 抽選。
// 除外後に空でも usedIds を無視して必ず1つ返す（罰は最大7回・プール20個なので通常は枯渇しない）
export function pickBatsuTopic(topics: Topic[], usedIds: string[], rng: Rng): Topic {
	const remote = topics.filter((t) => t.pack === 'batsu')
	const source = remote.length > 0 ? remote : FALLBACK_BATSU_TOPICS
	const pool = source.filter((t) => !usedIds.includes(t.id))
	const candidates = pool.length > 0 ? pool : source
	return candidates[Math.floor(rng() * candidates.length)]
}
