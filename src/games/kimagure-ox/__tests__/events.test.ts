import type { Cell } from '../engine'
import { applicableEvents, applyEvent, pickEvent, type Rng } from '../events'

const B = (s: string): Cell[] => [...s].map((c) => (c === 'o' ? 'o' : c === 'x' ? 'x' : null))

// 固定値列を順に返す乱数（使い切ったら 0.999）
const seq = (...values: number[]): Rng => {
	let i = 0
	return () => values[i++] ?? 0.999
}

describe('applicableEvents', () => {
	it('空盤面では block と double のみ（駒が無いので shuffle / vanish は不可）', () => {
		expect(applicableEvents(B('.........'), null)).toEqual(['block', 'double'])
	})
	it('駒1個なら vanish が加わる（shuffle は駒2個から）', () => {
		expect(applicableEvents(B('o........'), null)).toEqual(['block', 'vanish', 'double'])
	})
	it('駒2個なら全イベントが候補', () => {
		expect(applicableEvents(B('ox.......'), null)).toEqual([
			'shuffle',
			'block',
			'vanish',
			'double',
		])
	})
	it('封鎖が既にあるなら block は候補外', () => {
		expect(applicableEvents(B('ox.......'), 8)).toEqual(['shuffle', 'vanish', 'double'])
	})
	it('空きマスが1以下なら block は候補外', () => {
		expect(applicableEvents(B('oxoxoxox.'), null)).toEqual(['shuffle', 'vanish', 'double'])
	})
})

describe('pickEvent', () => {
	const board = B('oxo......')
	it('3手目未満では発生しない', () => {
		expect(
			pickEvent({ board, blocked: null, moveCount: 2, lastEvent: null, rng: seq(0) }),
		).toBeNull()
	})
	it('乱数が確率以上なら発生しない（30%）', () => {
		expect(
			pickEvent({ board, blocked: null, moveCount: 3, lastEvent: null, rng: seq(0.3) }),
		).toBeNull()
	})
	it('乱数が確率未満なら候補から選ばれる', () => {
		expect(
			pickEvent({ board, blocked: null, moveCount: 3, lastEvent: null, rng: seq(0, 0) }),
		).toBe('shuffle')
	})
	it('直前と同じイベントは選ばれない', () => {
		expect(
			pickEvent({ board, blocked: null, moveCount: 3, lastEvent: 'shuffle', rng: seq(0, 0) }),
		).toBe('block')
	})
})

describe('applyEvent', () => {
	it('block: 空きマスから1つ選んで封鎖する（盤面は不変）', () => {
		const board = B('ox.......')
		const result = applyEvent('block', board, null, seq(0))
		expect(result.blocked).toBe(2) // 空きマス [2..8] の先頭
		expect(result.board).toEqual(board)
		expect(result.extraMoves).toBe(0)
	})
	it('vanish: 駒1個がランダムに消える', () => {
		const result = applyEvent('vanish', B('ox.......'), null, seq(0.6))
		expect(result.board).toEqual(B('o........')) // 駒 [0,1] の floor(0.6*2)=1 番目
	})
	it('shuffle: 駒数を保ったまま再配置される（rng=0 で決定的）', () => {
		const result = applyEvent('shuffle', B('xxooo....'), null, () => 0)
		expect(result.board).toEqual(B('.xxooo...'))
	})
	it('shuffle: 封鎖マスには駒を置かない', () => {
		const result = applyEvent('shuffle', B('xxooo....'), 1, () => 0)
		expect(result.board[1]).toBeNull()
		expect(result.board.filter((c) => c !== null)).toHaveLength(5)
	})
	it('double: extraMoves が 1 になる', () => {
		const result = applyEvent('double', B('ox.......'), null, seq())
		expect(result.extraMoves).toBe(1)
		expect(result.board).toEqual(B('ox.......'))
	})
})
