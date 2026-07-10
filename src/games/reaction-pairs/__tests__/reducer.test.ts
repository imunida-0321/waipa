import type { Topic } from '@/lib/topics-store'
import type { Card } from '../engine'
import { initialState, isLuckyShown, isMismatchShown, reduce, type GameState } from '../reducer'

const topic: Topic = { id: 't1', pack: 'batsu', text: '一発ギャグをする' }

// テスト用に盤面を決め打ちで差し替える（シャッフルに依存しない）
function withCards(state: GameState, cards: Card[]): GameState {
	return { ...state, cards }
}

const fixedCards: Card[] = [
	{ id: 'p1-a', kind: 'pair', pairId: 'p1', symbol: '🎤', state: 'hidden' },
	{ id: 'p1-b', kind: 'pair', pairId: 'p1', symbol: '🎤', state: 'hidden' },
	{ id: 'p2-a', kind: 'pair', pairId: 'p2', symbol: '🎲', state: 'hidden' },
	{ id: 'p2-b', kind: 'pair', pairId: 'p2', symbol: '🎲', state: 'hidden' },
	{ id: 'joker', kind: 'joker', pairId: null, symbol: '🃏', state: 'hidden' },
	{ id: 'lucky', kind: 'lucky', pairId: null, symbol: '🍀', state: 'hidden' },
]

function freshState(playerCount = 3): GameState {
	return withCards(
		initialState(playerCount, () => 0.5),
		fixedCards,
	)
}

function flip(state: GameState, cardId: string, rng: () => number = () => 0.5): GameState {
	return reduce(state, { type: 'flip', cardId, rng })
}

describe('initialState', () => {
	it('16枚・play フェーズ・スコア0で始まる', async () => {
		const s = initialState(4, () => 0.5)
		expect(s.cards).toHaveLength(16)
		expect(s.phase).toBe('play')
		expect(s.turnIndex).toBe(0)
		expect(s.scores).toEqual([0, 0, 0, 0])
		expect(s.punishCounts).toEqual([0, 0, 0, 0])
		expect(s.passHolder).toBeNull()
		expect(s.loserIndex).toBeNull()
	})
})

describe('flip: 絵柄カード', () => {
	it('1枚目は revealed になり flippedIds に入る', async () => {
		const s = flip(freshState(), 'p1-a')
		expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('revealed')
		expect(s.flippedIds).toEqual(['p1-a'])
		expect(s.phase).toBe('play')
	})

	it('同じカードの再タップ・revealed カードのタップは無効', async () => {
		const s1 = flip(freshState(), 'p1-a')
		expect(flip(s1, 'p1-a')).toBe(s1)
	})

	it('2枚目で成立: removed・スコア加算・roulette フェーズへ', async () => {
		const s = flip(flip(freshState(), 'p1-a'), 'p1-b', () => 0.5) // floor(0.5*3)=1
		expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('removed')
		expect(s.cards.find((c) => c.id === 'p1-b')?.state).toBe('removed')
		expect(s.scores).toEqual([1, 0, 0])
		expect(s.phase).toBe('roulette')
		expect(s.roulette).toEqual({ firstIndex: 1, finalIndex: 1, passConsumed: false })
		expect(s.flippedIds).toEqual([])
	})

	it('2枚目で不成立: revealed のまま・3枚目はめくれない', async () => {
		const s = flip(flip(freshState(), 'p1-a'), 'p2-a')
		expect(s.phase).toBe('play')
		expect(isMismatchShown(s)).toBe(true)
		expect(flip(s, 'p2-b')).toBe(s)
	})
})

describe('hideMismatch', () => {
	it('2枚を hidden に戻し手番を次へ', async () => {
		const s = reduce(flip(flip(freshState(), 'p1-a'), 'p2-a'), { type: 'hideMismatch' })
		expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('hidden')
		expect(s.cards.find((c) => c.id === 'p2-a')?.state).toBe('hidden')
		expect(s.flippedIds).toEqual([])
		expect(s.turnIndex).toBe(1)
	})

	it('最後のプレイヤーの次は先頭へ周回', async () => {
		const base = { ...freshState(3), turnIndex: 2 }
		const s = reduce(flip(flip(base, 'p1-a'), 'p2-a'), { type: 'hideMismatch' })
		expect(s.turnIndex).toBe(0)
	})
})

describe('flip: ジョーカー', () => {
	it('1枚目でも即 result・めくった人が loser', async () => {
		const s = flip(freshState(), 'joker')
		expect(s.phase).toBe('result')
		expect(s.loserIndex).toBe(0)
		expect(s.cards.find((c) => c.id === 'joker')?.state).toBe('revealed')
		expect(s.flippedIds).toEqual([])
	})

	it('2枚目（1枚 revealed 中）でも即 result', async () => {
		const s = flip(flip(freshState(), 'p1-a'), 'joker')
		expect(s.phase).toBe('result')
		expect(s.loserIndex).toBe(0)
		expect(s.flippedIds).toEqual([])
	})
})

describe('flip: ラッキー', () => {
	it('発動カットイン表示: revealed・パス付与・flippedIds にカウントせず手番はそのまま', async () => {
		const s = flip(freshState(), 'lucky')
		expect(s.passHolder).toBe(0)
		expect(s.cards.find((c) => c.id === 'lucky')?.state).toBe('revealed')
		expect(s.flippedIds).toEqual([])
		expect(s.phase).toBe('play')
		expect(s.turnIndex).toBe(0)
		expect(isLuckyShown(s)).toBe(true)
	})

	it('luckyDone: removed になりカットインが終わる。turn/phase は変わらない', async () => {
		const s = reduce(flip(freshState(), 'lucky'), { type: 'luckyDone' })
		expect(s.cards.find((c) => c.id === 'lucky')?.state).toBe('removed')
		expect(s.phase).toBe('play')
		expect(s.turnIndex).toBe(0)
		expect(s.passHolder).toBe(0)
		expect(isLuckyShown(s)).toBe(false)
	})

	it('luckyDone はラッキーが revealed でないときは無効', async () => {
		const s = freshState()
		expect(reduce(s, { type: 'luckyDone' })).toBe(s)
	})

	it('1枚めくった後にラッキー → luckyDone 後もまだ2枚目の絵柄をめくれる', async () => {
		const s = reduce(flip(flip(freshState(), 'p1-a'), 'lucky'), { type: 'luckyDone' })
		expect(s.flippedIds).toEqual(['p1-a'])
		const s2 = flip(s, 'p1-b')
		expect(s2.phase).toBe('roulette')
	})
})

describe('rouletteDone / punishDone', () => {
	function toRoulette(passHolder: number | null = null, rouletteRng = () => 0.5) {
		const base = { ...freshState(3), passHolder }
		return flip(flip(base, 'p1-a'), 'p1-b', rouletteRng)
	}

	it('rouletteDone: punish セット・罰回数加算・お題を使用済みに', async () => {
		const s = reduce(toRoulette(), { type: 'rouletteDone', topic })
		expect(s.phase).toBe('punish')
		expect(s.punish).toEqual({ playerIndex: 1, topic })
		expect(s.punishCounts).toEqual([0, 1, 0])
		expect(s.usedTopicIds).toEqual(['t1'])
	})

	it('passConsumed のとき passHolder をクリアする', async () => {
		// turnIndex=0 が成立、パス保持者=1。1回目 floor(0.34*3)=1 → 再抽選 floor(0.9*2)=1 → 保持者を飛ばして 2
		let i = 0
		const rng = () => [0.34, 0.9][i++] ?? 0
		const s = reduce(toRoulette(1, rng), { type: 'rouletteDone', topic })
		expect(s.passHolder).toBeNull()
		expect(s.punish?.playerIndex).toBe(2)
	})

	it('punishDone: play に戻り手番が次へ', async () => {
		const s = reduce(reduce(toRoulette(), { type: 'rouletteDone', topic }), {
			type: 'punishDone',
		})
		expect(s.phase).toBe('play')
		expect(s.punish).toBeNull()
		expect(s.roulette).toBeNull()
		expect(s.turnIndex).toBe(1)
	})

	it('全ペア消化後の punishDone は result へ', async () => {
		// p1 成立 → 罰消化 → p2 成立 → 罰消化で絵柄カードが尽きる
		let s = reduce(reduce(toRoulette(), { type: 'rouletteDone', topic }), {
			type: 'punishDone',
		})
		s = flip(flip(s, 'p2-a'), 'p2-b')
		s = reduce(s, { type: 'rouletteDone', topic: { ...topic, id: 't2' } })
		s = reduce(s, { type: 'punishDone' })
		expect(s.phase).toBe('result')
		expect(s.loserIndex).toBeNull()
	})
})

describe('retry', () => {
	it('同じ人数で初期状態に戻る', async () => {
		const s = reduce(flip(freshState(), 'joker'), { type: 'retry', rng: () => 0.5 })
		expect(s.phase).toBe('play')
		expect(s.playerCount).toBe(3)
		expect(s.cards).toHaveLength(16)
		expect(s.loserIndex).toBeNull()
	})
})
