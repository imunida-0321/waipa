import { initialState, reduce, type GameState } from '../reducer'

const rng = () => 0

function afterStart(count = 3): GameState {
	return reduce(initialState(count), { type: 'start', rng })
}

function afterAllForehead(count = 3): GameState {
	let s = afterStart(count)
	for (let i = 0; i < count; i++) s = reduce(s, { type: 'foreheadDone' })
	return s
}

it('初期状態は deal フェーズ・ラウンド1', () => {
	const s = initialState(4)
	expect(s.phase).toBe('deal')
	expect(s.round).toBe(1)
	expect(s.cards).toEqual([])
	expect(s.judgement).toBeNull()
})

it('start でカードが人数分配られ forehead フェーズへ', () => {
	const s = afterStart(4)
	expect(s.phase).toBe('forehead')
	expect(s.cards).toHaveLength(4)
	expect(s.turnIndex).toBe(0)
})

it('foreheadDone で次の人へ。全員終わったら declare フェーズへ', () => {
	let s = afterStart(3)
	s = reduce(s, { type: 'foreheadDone' })
	expect(s.phase).toBe('forehead')
	expect(s.turnIndex).toBe(1)
	s = reduce(s, { type: 'foreheadDone' })
	s = reduce(s, { type: 'foreheadDone' })
	expect(s.phase).toBe('declare')
	expect(s.turnIndex).toBe(0)
})

it('declare で宣言が記録され次の人へ。全員宣言したら judgement 付きで result へ', () => {
	let s = afterAllForehead(3)
	s = reduce(s, { type: 'declare', choice: 'fight' })
	expect(s.phase).toBe('declare')
	expect(s.turnIndex).toBe(1)
	expect(s.declarations).toEqual(['fight'])
	s = reduce(s, { type: 'declare', choice: 'fold' })
	s = reduce(s, { type: 'declare', choice: 'fold' })
	expect(s.phase).toBe('result')
	expect(s.declarations).toEqual(['fight', 'fold', 'fold'])
	expect(s.judgement?.outcome).toBe('solo-fight')
	expect(s.judgement?.winnerIndex).toBe(0)
})

it('nextRound で round+1 の deal に戻り、カード・宣言・判定がリセットされる', () => {
	let s = afterAllForehead(3)
	s = reduce(s, { type: 'declare', choice: 'fold' })
	s = reduce(s, { type: 'declare', choice: 'fold' })
	s = reduce(s, { type: 'declare', choice: 'fold' })
	s = reduce(s, { type: 'nextRound' })
	expect(s.phase).toBe('deal')
	expect(s.round).toBe(2)
	expect(s.cards).toEqual([])
	expect(s.declarations).toEqual([])
	expect(s.judgement).toBeNull()
})

it('フェーズ違いのアクションは無視される', () => {
	const s = initialState(3)
	expect(reduce(s, { type: 'foreheadDone' })).toBe(s)
	expect(reduce(s, { type: 'declare', choice: 'fight' })).toBe(s)
	expect(reduce(s, { type: 'nextRound' })).toBe(s)
	const played = afterStart(3)
	expect(reduce(played, { type: 'start', rng })).toBe(played)
})
