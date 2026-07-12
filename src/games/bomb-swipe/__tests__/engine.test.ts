import {
	MINE_MAX,
	MINE_MIN,
	decideLosers,
	isExploded,
	pickMine,
	scoreFromDrag,
	createInitialState,
	reduce,
	type State,
} from '../engine'

describe('pickMine', () => {
	it('rng=0 で下限、rng≒1 で上限になる', () => {
		expect(pickMine(() => 0)).toBe(MINE_MIN)
		expect(pickMine(() => 0.9999999)).toBe(MINE_MAX)
	})

	it('常に整数で 60〜95 に収まる', () => {
		for (let i = 0; i < 100; i++) {
			const mine = pickMine(Math.random)
			expect(Number.isInteger(mine)).toBe(true)
			expect(mine).toBeGreaterThanOrEqual(MINE_MIN)
			expect(mine).toBeLessThanOrEqual(MINE_MAX)
		}
	})
})

describe('isExploded', () => {
	it('地雷ちょうどは爆発（踏んだらアウト）', () => {
		expect(isExploded(60, 60)).toBe(true)
	})

	it('地雷未満はセーフ、超過は爆発', () => {
		expect(isExploded(59, 60)).toBe(false)
		expect(isExploded(61, 60)).toBe(true)
	})
})

describe('scoreFromDrag', () => {
	it('ドラッグ量をトラック高さ比の 0〜100 整数に変換する', () => {
		expect(scoreFromDrag(0, 400)).toBe(0)
		expect(scoreFromDrag(200, 400)).toBe(50)
		expect(scoreFromDrag(400, 400)).toBe(100)
	})

	it('範囲外はクランプする（下方向ドラッグ・トラック超え）', () => {
		expect(scoreFromDrag(-50, 400)).toBe(0)
		expect(scoreFromDrag(500, 400)).toBe(100)
	})

	it('トラック高さ 0 以下では 0 を返す（レイアウト前の防御）', () => {
		expect(scoreFromDrag(100, 0)).toBe(0)
	})
})

describe('decideLosers', () => {
	const safe = (score: number) => ({ score, exploded: false })
	const boom = (score: number) => ({ score, exploded: true })

	it('爆発者がいれば爆発者全員が負け（スコアは無関係）', () => {
		expect(decideLosers([safe(10), boom(70), boom(90), safe(50)])).toEqual([1, 2])
	})

	it('全員爆発なら全員負け', () => {
		expect(decideLosers([boom(60), boom(80)])).toEqual([0, 1])
	})

	it('爆発者ゼロなら最低スコアが負け', () => {
		expect(decideLosers([safe(30), safe(10), safe(50)])).toEqual([1])
	})

	it('同率最低は全員負け', () => {
		expect(decideLosers([safe(20), safe(20), safe(50)])).toEqual([0, 1])
	})

	it('2人同スコアでも同率負け（最少人数の境界）', () => {
		expect(decideLosers([safe(0), safe(0)])).toEqual([0, 1])
	})
})

describe('reduce', () => {
	// rng=0 で全員の地雷が 60 に固定される
	const init = (count: number) => createInitialState(count, () => 0)

	it('初期状態: handoff・先頭手番・地雷はプレイヤー数ぶん生成・結果は全て null', () => {
		const s = init(3)
		expect(s.phase).toBe('handoff')
		expect(s.turnIndex).toBe(0)
		expect(s.mines).toEqual([60, 60, 60])
		expect(s.results).toEqual([null, null, null])
	})

	it('startSwipe で swiping へ', () => {
		expect(reduce(init(2), { type: 'startSwipe' }).phase).toBe('swiping')
	})

	it('release: 地雷未満なら safe、結果が記録される', () => {
		const s = reduce(reduce(init(2), { type: 'startSwipe' }), { type: 'release', score: 59 })
		expect(s.phase).toBe('safe')
		expect(s.results[0]).toEqual({ score: 59, exploded: false })
	})

	it('release: 地雷ちょうどで exploded', () => {
		const s = reduce(reduce(init(2), { type: 'startSwipe' }), { type: 'release', score: 60 })
		expect(s.phase).toBe('exploded')
		expect(s.results[0]).toEqual({ score: 60, exploded: true })
	})

	it('next: 残り手番があれば次の handoff、全員終了で result', () => {
		let s: State = init(2)
		s = reduce(s, { type: 'startSwipe' })
		s = reduce(s, { type: 'release', score: 10 })
		s = reduce(s, { type: 'next' })
		expect(s.phase).toBe('handoff')
		expect(s.turnIndex).toBe(1)
		s = reduce(s, { type: 'startSwipe' })
		s = reduce(s, { type: 'release', score: 20 })
		s = reduce(s, { type: 'next' })
		expect(s.phase).toBe('result')
	})

	it('restart: result から初期状態へ戻る', () => {
		let s: State = init(2)
		s = reduce(s, { type: 'startSwipe' })
		s = reduce(s, { type: 'release', score: 10 })
		s = reduce(s, { type: 'next' })
		s = reduce(s, { type: 'startSwipe' })
		s = reduce(s, { type: 'release', score: 20 })
		s = reduce(s, { type: 'next' })
		const restarted = reduce(s, { type: 'restart', rng: () => 0 })
		expect(restarted.phase).toBe('handoff')
		expect(restarted.turnIndex).toBe(0)
		expect(restarted.results).toEqual([null, null])
	})

	it('不正な遷移は無視する（swiping 以外で release 等）', () => {
		const s = init(2)
		expect(reduce(s, { type: 'release', score: 50 })).toBe(s)
		expect(reduce(s, { type: 'next' })).toBe(s)
		expect(reduce(s, { type: 'restart', rng: () => 0 })).toBe(s)
	})
})
