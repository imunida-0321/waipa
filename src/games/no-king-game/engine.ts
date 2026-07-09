import type { Topic } from '@/lib/topics-store'

export type Rng = () => number

export const MIN_COUNT = 3
export const MAX_COUNT = 12

// topics が空（初回起動がオフライン等）でも遊べるようにする内蔵お題
export const FALLBACK_TOPICS: readonly Topic[] = [
	{ id: 'fb-1', pack: 'king', text: '30秒間ずっと笑顔でいる' },
	{ id: 'fb-2', pack: 'king', text: '{B}番の人を全力で褒める' },
	{ id: 'fb-3', pack: 'king', text: '好きな食べ物を30秒間熱く語る' },
	{ id: 'fb-4', pack: 'king', text: '{B}番の人とハイタッチを10回する' },
	{ id: 'fb-5', pack: 'king', text: '一発ギャグをする' },
	{ id: 'fb-6', pack: 'king', text: '{B}番の人のモノマネをする' },
	{ id: 'fb-7', pack: 'king', text: '全員に向かってウインクする' },
	{ id: 'fb-8', pack: 'king', text: '自分の枕の匂いを説明する' },
	{ id: 'fb-9', pack: 'king', text: '{B}番の人とじゃんけんして負けたら変顔をする' },
	{ id: 'fb-10', pack: 'king', text: '10秒間ロボットダンスをする' },
]

// 1..count のシャッフル順列（Fisher–Yates）
export function dealNumbers(count: number, rng: Rng): number[] {
	const nums = Array.from({ length: count }, (_, i) => i + 1)
	for (let i = nums.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[nums[i], nums[j]] = [nums[j], nums[i]]
	}
	return nums
}

export type DrawResult = {
	topicId: string
	topicText: string
	executorNumber: number
	usedTopicIds: string[]
}

// お題抽選＋実行役決定。{B} は実行役以外の番号に置換する。
// プールが空なら usedTopicIds をリセットして重複許容で引き直す。
export function drawTopic(
	topics: readonly Topic[],
	usedTopicIds: string[],
	count: number,
	rng: Rng,
): DrawResult {
	const source = topics.length > 0 ? topics : FALLBACK_TOPICS
	let pool = source.filter((t) => !usedTopicIds.includes(t.id))
	let used = usedTopicIds
	if (pool.length === 0) {
		pool = [...source]
		used = []
	}
	const topic = pool[Math.floor(rng() * pool.length)]
	const executorNumber = Math.floor(rng() * count) + 1
	return {
		topicId: topic.id,
		topicText: replaceB(topic.text, executorNumber, count, rng),
		executorNumber,
		usedTopicIds: [...used, topic.id],
	}
}

// {B} を実行役以外のランダムな参加者番号に置換（seed データの規約）
function replaceB(text: string, executor: number, count: number, rng: Rng): string {
	if (!text.includes('{B}')) return text
	const candidates = Array.from({ length: count }, (_, i) => i + 1).filter((n) => n !== executor)
	const b = candidates[Math.floor(rng() * candidates.length)]
	return text.replaceAll('{B}', String(b))
}
