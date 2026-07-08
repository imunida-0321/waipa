import type { Cell } from '../engine'
import type { Rng } from '../events'
import { initialState, reduce, type GameState } from '../reducer'

const B = (s: string): Cell[] => [...s].map((c) => (c === 'o' ? 'o' : c === 'x' ? 'x' : null))

const seq = (...values: number[]): Rng => {
	let i = 0
	return () => values[i++] ?? 0.999
}

// イベントが発生しない乱数（抽選で必ずハズレ）
const noEvent: Rng = () => 0.999

const playing = (over: Partial<GameState>): GameState => ({
	...initialState(seq(0)),
	phase: 'playing',
	...over,
})

describe('initialState', () => {
	it('乱数 < 0.5 なら先手 o、フェーズは intro', () => {
		const s = initialState(seq(0.4))
		expect(s.turn).toBe('o')
		expect(s.phase).toBe('intro')
	})
	it('乱数 >= 0.5 なら先手 x', () => {
		expect(initialState(seq(0.6)).turn).toBe('x')
	})
})

describe('start / retry', () => {
	it('start で intro → playing', () => {
		const s = reduce(initialState(seq(0)), { type: 'start' })
		expect(s.phase).toBe('playing')
	})
	it('retry で新しいゲーム（intro に戻る）', () => {
		const s = reduce(playing({ moveCount: 5 }), { type: 'retry', rng: seq(0) })
		expect(s.phase).toBe('intro')
		expect(s.moveCount).toBe(0)
	})
})

describe('tap', () => {
	it('駒を置いて手番が交代する', () => {
		const s = reduce(playing({ turn: 'o' }), { type: 'tap', index: 0, rng: noEvent })
		expect(s.board[0]).toBe('o')
		expect(s.turn).toBe('x')
		expect(s.moveCount).toBe(1)
	})
	it('置けないマス（使用済み・封鎖）では何も起きない', () => {
		const base = playing({ board: B('o........'), blocked: 4 })
		expect(reduce(base, { type: 'tap', index: 0, rng: noEvent })).toBe(base)
		expect(reduce(base, { type: 'tap', index: 4, rng: noEvent })).toBe(base)
	})
	it('3並びで即 finished', () => {
		const s = reduce(playing({ board: B('oo.xx....'), turn: 'o', moveCount: 4 }), {
			type: 'tap',
			index: 2,
			rng: noEvent,
		})
		expect(s.phase).toBe('finished')
		expect(s.winner).toBe('o')
	})
	it('ダブル手番の残りがあれば手番は交代しない', () => {
		const s = reduce(playing({ turn: 'o', extraMoves: 1, moveCount: 4 }), {
			type: 'tap',
			index: 0,
			rng: noEvent,
		})
		expect(s.turn).toBe('o')
		expect(s.extraMoves).toBe(0)
	})
	it('3手目以降の着手後にイベント抽選され cutin へ（効果は未適用）', () => {
		const s = reduce(playing({ board: B('ox.x.....'), turn: 'o', moveCount: 3 }), {
			type: 'tap',
			index: 4,
			rng: seq(0, 0), // 当選 → 候補先頭 shuffle
		})
		expect(s.phase).toBe('cutin')
		expect(s.pendingEvent).toBe('shuffle')
		expect(s.board).toEqual(B('ox.xo....')) // イベント効果はまだ反映されない
	})
})

describe('cutinDone', () => {
	it('イベント効果を反映して playing に戻り lastEvent を記録', () => {
		const s = reduce(
			playing({ board: B('ox.......'), pendingEvent: 'block', phase: 'cutin' }),
			{ type: 'cutinDone', rng: seq(0) },
		)
		expect(s.blocked).toBe(2)
		expect(s.phase).toBe('playing')
		expect(s.lastEvent).toBe('block')
		expect(s.pendingEvent).toBeNull()
	})
	it('double は次の手番に extraMoves を与える', () => {
		const s = reduce(playing({ pendingEvent: 'double', phase: 'cutin' }), {
			type: 'cutinDone',
			rng: seq(),
		})
		expect(s.extraMoves).toBe(1)
	})
	it('シャッフルで3並びになったら即 finished（イベントでも勝敗判定）', () => {
		const s = reduce(
			playing({ board: B('xxooo....'), pendingEvent: 'shuffle', phase: 'cutin' }),
			{ type: 'cutinDone', rng: () => 0 }, // Task 2 のテストより '.xxooo...' になり o の横並び
		)
		expect(s.phase).toBe('finished')
		expect(s.winner).toBe('o')
	})
})
