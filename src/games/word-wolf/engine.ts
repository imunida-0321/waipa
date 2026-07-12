/** [0, 1) を返す（Math.random 互換）。1 ちょうどを返す実装は不可 */
export type Rng = () => number

export type WordPair = {
	id: string
	pack: string
	word_a: string
	word_b: string
}

export type AssignedWords = { majority: string; wolf: string }

export const PACKS = [
	{ id: 'food', label: 'たべもの' },
	{ id: 'place', label: 'ばしょ' },
	{ id: 'aruaru', label: 'あるある' },
	{ id: 'adult', label: 'おとなの夜' },
] as const

// オフライン初回（配信もキャッシュも空）でも必ず遊べるための同梱ペア
export const FALLBACK_PAIRS: readonly WordPair[] = [
	{ id: 'fb-food-1', pack: 'food', word_a: 'ラーメン', word_b: 'うどん' },
	{ id: 'fb-food-2', pack: 'food', word_a: 'たこ焼き', word_b: 'お好み焼き' },
	{ id: 'fb-place-1', pack: 'place', word_a: '海', word_b: 'プール' },
	{ id: 'fb-place-2', pack: 'place', word_a: '温泉', word_b: '銭湯' },
	{ id: 'fb-aruaru-1', pack: 'aruaru', word_a: '遅刻', word_b: '寝坊' },
	{ id: 'fb-aruaru-2', pack: 'aruaru', word_a: '満員電車', word_b: '渋滞' },
	{ id: 'fb-adult-1', pack: 'adult', word_a: '居酒屋', word_b: 'バー' },
	{ id: 'fb-adult-2', pack: 'adult', word_a: '終電', word_b: '始発' },
]

// ウルフの index を wolfCount ぶん重複なく選ぶ（昇順で返す）
export function assignRoles(playerCount: number, wolfCount: number, rng: Rng): number[] {
	const indices = Array.from({ length: playerCount }, (_, i) => i)
	const wolves: number[] = []
	for (let k = 0; k < wolfCount; k++) {
		const pick = Math.floor(rng() * indices.length)
		wolves.push(indices[pick])
		indices.splice(pick, 1)
	}
	return wolves.sort((a, b) => a - b)
}

// どちらを多数派にするかを 50/50 で決める（word_a 固定だと常連にバレる）
export function swapWords(pair: WordPair, rng: Rng): AssignedWords {
	return rng() < 0.5
		? { majority: pair.word_a, wolf: pair.word_b }
		: { majority: pair.word_b, wolf: pair.word_a }
}

// 最多票の index を昇順で返す。null（決選投票の非投票枠）は数えない
export function tallyVotes(votes: readonly (number | null)[]): number[] {
	const counts = new Map<number, number>()
	for (const v of votes) {
		if (v === null) continue
		counts.set(v, (counts.get(v) ?? 0) + 1)
	}
	let max = 0
	for (const c of counts.values()) max = Math.max(max, c)
	return [...counts.entries()]
		.filter(([, c]) => c === max)
		.map(([i]) => i)
		.sort((a, b) => a - b)
}

export function judgeResult(
	eliminatedIndex: number,
	wolfIndices: readonly number[],
): 'citizens' | 'wolf' {
	return wolfIndices.includes(eliminatedIndex) ? 'citizens' : 'wolf'
}

// 配信 pool が空でも FALLBACK_PAIRS で必ず1件返す。
// 全て使用済みなら used を無視して選び直す（連戦の枯渇対策）
export function choosePair(
	pool: readonly WordPair[],
	pack: string,
	usedIds: readonly string[],
	rng: Rng,
): WordPair {
	const packPool = pool.filter((p) => p.pack === pack)
	let source = packPool.length > 0 ? packPool : FALLBACK_PAIRS.filter((p) => p.pack === pack)
	if (source.length === 0) source = [...FALLBACK_PAIRS]
	const fresh = source.filter((p) => !usedIds.includes(p.id))
	const candidates = fresh.length > 0 ? fresh : source
	return candidates[Math.floor(rng() * candidates.length)]
}
