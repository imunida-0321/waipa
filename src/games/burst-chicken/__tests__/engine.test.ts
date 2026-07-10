import {
	LIMIT_MAX,
	LIMIT_MIN,
	STOP_UNLOCK,
	canStop,
	createInitialState,
	pickLimit,
	reduce,
	settle,
	type State,
} from '../engine'

// rng 固定で limit を決定的にする（rng=0 → 21, rng≈1 → 30）
const rngMin = () => 0
const rngMax = () => 0.9999999

function addTimes(state: State, amounts: (1 | 2 | 3)[]): State {
	return amounts.reduce((s, amount) => reduce(s, { type: 'add', amount }), state)
}

describe('pickLimit', () => {
	it('rng=0 で LIMIT_MIN、rng≈1 で LIMIT_MAX の整数を返す', () => {
		expect(pickLimit(rngMin)).toBe(LIMIT_MIN)
		expect(pickLimit(rngMax)).toBe(LIMIT_MAX)
		expect(Number.isInteger(pickLimit(() => 0.5))).toBe(true)
	})
})

describe('createInitialState', () => {
	it('全員の貢献 0・合計 0・playing で開始し、startIndex が手番になる', () => {
		const s = createInitialState(3, rngMin, 1)
		expect(s.phase).toBe('playing')
		expect(s.total).toBe(0)
		expect(s.contributions).toEqual([0, 0, 0])
		expect(s.turnIndex).toBe(1)
		expect(s.startIndex).toBe(1)
		expect(s.losers).toEqual([])
		expect(s.stopperIndex).toBeNull()
	})
})

describe('add', () => {
	it('合計と手番プレイヤーの貢献に加算し、手番が循環する', () => {
		let s = createInitialState(2, rngMax) // limit=30
		s = reduce(s, { type: 'add', amount: 3 })
		expect(s.total).toBe(3)
		expect(s.contributions).toEqual([3, 0])
		expect(s.turnIndex).toBe(1)
		s = reduce(s, { type: 'add', amount: 1 })
		expect(s.contributions).toEqual([3, 1])
		expect(s.turnIndex).toBe(0) // 2人で1周
	})

	it('合計 = L ちょうどはセーフ、L 超過でバースト（手番は動かさない）', () => {
		let s = createInitialState(2, rngMin) // limit=21
		s = addTimes(s, [3, 3, 3, 3, 3, 3, 3]) // 合計21ちょうど
		expect(s.total).toBe(21)
		expect(s.phase).toBe('playing')
		const burstTurn = s.turnIndex
		s = reduce(s, { type: 'add', amount: 1 }) // 22 > 21
		expect(s.phase).toBe('exploded')
		expect(s.losers).toEqual([burstTurn])
		expect(s.turnIndex).toBe(burstTurn)
	})

	it('exploded 後の add は無視する', () => {
		let s = createInitialState(2, rngMin)
		s = addTimes(s, [3, 3, 3, 3, 3, 3, 3, 3]) // 24 でバースト
		const after = reduce(s, { type: 'add', amount: 1 })
		expect(after).toBe(s)
	})
})

describe('canStop / stop', () => {
	it('合計 14 では不可・15 で解禁（境界）', () => {
		let s = createInitialState(2, rngMax)
		s = addTimes(s, [3, 3, 3, 3, 2]) // 14
		expect(canStop(s)).toBe(false)
		expect(reduce(s, { type: 'stop' })).toBe(s) // 解禁前は無視
		s = reduce(s, { type: 'add', amount: 1 }) // 15
		expect(s.total).toBe(STOP_UNLOCK)
		expect(canStop(s)).toBe(true)
	})

	it('stop で settled になり、宣言者と敗者が記録される', () => {
		let s = createInitialState(2, rngMax)
		s = addTimes(s, [3, 1, 3, 1, 3, 1, 3]) // 貢献 [12, 3]、合計15、手番=1
		s = reduce(s, { type: 'stop' })
		expect(s.phase).toBe('settled')
		expect(s.stopperIndex).toBe(1)
		expect(s.losers).toEqual([1]) // 最少 3 = 宣言者本人
	})
})

describe('settle', () => {
	it('単独最少がそのまま負け', () => {
		expect(settle([5, 3, 7], 0)).toEqual([1])
	})
	it('宣言者がタイを含む最少なら宣言者の単独負け', () => {
		expect(settle([3, 3, 7], 0)).toEqual([0])
		expect(settle([3, 3, 3], 2)).toEqual([2])
	})
	it('宣言者以外のタイはタイ全員負け', () => {
		expect(settle([3, 3, 7], 2)).toEqual([0, 1])
	})
})

describe('restart', () => {
	it('終了後の restart で開始プレイヤーが +1 ローテーションし全てリセットされる', () => {
		let s = createInitialState(2, rngMin, 1)
		s = addTimes(s, [3, 3, 3, 3, 3, 3, 3, 3]) // バーストで終了
		expect(s.phase).toBe('exploded')
		const next = reduce(s, { type: 'restart', rng: rngMax })
		expect(next.phase).toBe('playing')
		expect(next.total).toBe(0)
		expect(next.contributions).toEqual([0, 0])
		expect(next.startIndex).toBe(0) // (1 + 1) % 2
		expect(next.limit).toBe(LIMIT_MAX) // 新しい rng で再抽選
	})

	it('playing 中の restart は無視する', () => {
		const s = createInitialState(2, rngMin)
		expect(reduce(s, { type: 'restart', rng: rngMax })).toBe(s)
	})
})
