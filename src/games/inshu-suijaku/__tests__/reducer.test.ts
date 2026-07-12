import type { Card } from '../engine'
import { initialState, isMismatchShown, reduce, type GameState } from '../reducer'

function pairCard(id: string, pairId: string, overrides: Partial<Card> = {}): Card {
	return {
		id,
		pairId,
		rank: 'A',
		suit: '♠',
		punishmentId: 'n01',
		punishment: '1杯飲む',
		state: 'hidden',
		...overrides,
	}
}

function jokerCard(id: string, overrides: Partial<Card> = {}): Card {
	return {
		id,
		pairId: null,
		rank: 'JOKER',
		suit: null,
		punishmentId: 's01',
		punishment: 'グラスの残りを飲み干す（無理は禁物！）',
		state: 'hidden',
		...overrides,
	}
}

// 2ペア＋ジョーカー1枚のミニ盤面（枚数固定に依存しない reducer 設計を利用）
function playState(overrides: Partial<GameState> = {}): GameState {
	return {
		phase: 'play',
		size: 'small',
		cards: [
			pairCard('p1-a', 'p1'),
			pairCard('p1-b', 'p1'),
			pairCard('p2-a', 'p2', {
				rank: 'Q',
				suit: '♦',
				punishmentId: 'n07',
				punishment: '全員と乾杯して1杯',
			}),
			pairCard('p2-b', 'p2', {
				rank: 'Q',
				suit: '♦',
				punishmentId: 'n07',
				punishment: '全員と乾杯して1杯',
			}),
			jokerCard('joker-1'),
		],
		playerCount: 3,
		turnIndex: 0,
		flippedIds: [],
		scores: [0, 0, 0],
		punish: null,
		...overrides,
	}
}

it('initialState は size フェーズ・盤面なしで始まる', () => {
	const s = initialState(4)
	expect(s.phase).toBe('size')
	expect(s.cards).toHaveLength(0)
	expect(s.scores).toEqual([0, 0, 0, 0])
})

it('start でデッキが生成され play フェーズになる', () => {
	const s = reduce(initialState(3), { type: 'start', size: 'medium', rng: () => 0.5 })
	expect(s.phase).toBe('play')
	expect(s.size).toBe('medium')
	expect(s.cards).toHaveLength(9 * 2 + 2)
})

it('flip: 1枚目は revealed になり手番はそのまま', () => {
	const s = reduce(playState(), { type: 'flip', cardId: 'p1-a' })
	expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('revealed')
	expect(s.flippedIds).toEqual(['p1-a'])
	expect(s.turnIndex).toBe(0)
})

it('flip: 同じカードの再タップ・revealed/removed タップは無効', () => {
	const s1 = reduce(playState(), { type: 'flip', cardId: 'p1-a' })
	expect(reduce(s1, { type: 'flip', cardId: 'p1-a' })).toBe(s1)
	const withRemoved = playState({
		cards: playState().cards.map((c) =>
			c.id === 'p2-a' ? { ...c, state: 'removed' as const } : c,
		),
	})
	expect(reduce(withRemoved, { type: 'flip', cardId: 'p2-a' })).toBe(withRemoved)
})

it('不成立: 2枚見せ → hideMismatch で裏に戻り次の人へ', () => {
	let s = reduce(playState(), { type: 'flip', cardId: 'p1-a' })
	s = reduce(s, { type: 'flip', cardId: 'p2-a' })
	expect(s.phase).toBe('play')
	expect(isMismatchShown(s)).toBe(true)
	// 表示中は3枚目をめくれない
	expect(reduce(s, { type: 'flip', cardId: 'p2-b' })).toBe(s)
	s = reduce(s, { type: 'hideMismatch' })
	expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('hidden')
	expect(s.flippedIds).toEqual([])
	expect(s.turnIndex).toBe(1)
})

it('成立: matchAnim → punish → punishDone で除外・獲得カウント・次の人へ', () => {
	let s = reduce(playState(), { type: 'flip', cardId: 'p1-a' })
	s = reduce(s, { type: 'flip', cardId: 'p1-b' })
	expect(s.phase).toBe('matchAnim')
	expect(s.scores).toEqual([1, 0, 0])
	expect(s.punish).toEqual({
		kind: 'pair',
		punishmentId: 'n01',
		text: '1杯飲む',
		playerIndex: 0,
	})
	// 成立演出中もカードは revealed のまま（クロスフェード表示用）
	expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('revealed')
	s = reduce(s, { type: 'matchAnimDone' })
	expect(s.phase).toBe('punish')
	s = reduce(s, { type: 'punishDone' })
	expect(s.phase).toBe('play')
	expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('removed')
	expect(s.punish).toBeNull()
	expect(s.turnIndex).toBe(1)
})

it('ジョーカー1枚目: 即 punish・場から除外・手番は2枚目をめくれず終了', () => {
	let s = reduce(playState(), { type: 'flip', cardId: 'joker-1' })
	expect(s.phase).toBe('punish')
	expect(s.punish?.kind).toBe('joker')
	expect(s.punish?.playerIndex).toBe(0)
	expect(s.cards.find((c) => c.id === 'joker-1')?.state).toBe('removed')
	expect(s.flippedIds).toEqual([])
	s = reduce(s, { type: 'punishDone' })
	expect(s.phase).toBe('play')
	expect(s.turnIndex).toBe(1)
	expect(s.scores).toEqual([0, 0, 0])
})

it('ジョーカー2枚目: 1枚目は裏に戻る', () => {
	let s = reduce(playState(), { type: 'flip', cardId: 'p1-a' })
	s = reduce(s, { type: 'flip', cardId: 'joker-1' })
	expect(s.phase).toBe('punish')
	expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('hidden')
	expect(s.cards.find((c) => c.id === 'joker-1')?.state).toBe('removed')
})

it('punish 表示中の flip は無効', () => {
	const s = reduce(playState(), { type: 'flip', cardId: 'joker-1' })
	expect(reduce(s, { type: 'flip', cardId: 'p1-a' })).toBe(s)
})

it('全ペア消化で result になる（ジョーカーが残っていても終了）', () => {
	// p2 は消化済み。p1 を揃えると全ペア消化
	const cards = playState().cards.map((c) =>
		c.pairId === 'p2' ? { ...c, state: 'removed' as const } : c,
	)
	let s = playState({ cards })
	s = reduce(s, { type: 'flip', cardId: 'p1-a' })
	s = reduce(s, { type: 'flip', cardId: 'p1-b' })
	s = reduce(s, { type: 'matchAnimDone' })
	s = reduce(s, { type: 'punishDone' })
	expect(s.phase).toBe('result')
})

it('手番は周回する（最後の人の次は最初の人）', () => {
	let s = playState({ turnIndex: 2 })
	s = reduce(s, { type: 'flip', cardId: 'p1-a' })
	s = reduce(s, { type: 'flip', cardId: 'p2-a' })
	s = reduce(s, { type: 'hideMismatch' })
	expect(s.turnIndex).toBe(0)
})

it('retry: 同サイズの新デッキで play から再開・スコアリセット', () => {
	const done = playState({ phase: 'result', scores: [2, 1, 0], size: 'small' })
	const s = reduce(done, { type: 'retry', rng: () => 0.5 })
	expect(s.phase).toBe('play')
	expect(s.size).toBe('small')
	expect(s.cards).toHaveLength(7 * 2 + 2)
	expect(s.scores).toEqual([0, 0, 0])
	expect(s.turnIndex).toBe(0)
})
