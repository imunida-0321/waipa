import { MAX_THROWS, NOME, type Hand, type Throw } from '../dice'
import { initialState, reduce, type Action, type GameState } from '../reducer'

function seqRng(values: number[]): () => number {
	let i = 0
	return () => values[i++] ?? 0.999
}

const die = (n: number) => (n - 0.5) / 6

function apply(state: GameState, ...actions: Action[]): GameState {
	return actions.reduce(reduce, state)
}

function roll(dice: [number, number, number], shonben = false): Action {
	return {
		type: 'roll',
		rng: seqRng([shonben ? 0.01 : 0.9, die(dice[0]), die(dice[1]), die(dice[2])]),
	}
}

function rollRevealed(): Action {
	return { type: 'rollRevealed' }
}

function confirmHand(): Action {
	return { type: 'confirmHand' }
}

function hand(type: Hand['type'], value: number, score: number): Hand {
	return { type, value, score }
}

function throwOf(dice: [number, number, number], shonben = false): Throw {
	return { dice, shonben }
}

describe('chinchiro reducer', () => {
	it('initialState は未投擲の1人目から始まる', () => {
		const state = initialState(3)

		expect(state).toEqual({
			phase: 'idle',
			playerCount: 3,
			playerIndex: 0,
			throws: [],
			hands: [],
			displayThrow: null,
			rollId: 0,
			rulesOpen: false,
		})
	})

	it('roll は rng から1投を作り rolling に入り表示投と rollId を更新する', () => {
		const state = reduce(initialState(2), roll([4, 5, 6]))

		expect(state.phase).toBe('rolling')
		expect(state.throws).toEqual([throwOf([4, 5, 6])])
		expect(state.displayThrow).toEqual(throwOf([4, 5, 6]))
		expect(state.rollId).toBe(1)
	})

	it('rolling 後のピンゾロは choice を経由せず settled になる', () => {
		const state = apply(initialState(1), roll([1, 1, 1]), rollRevealed())

		expect(state.phase).toBe('settled')
		expect(state.throws).toEqual([throwOf([1, 1, 1])])
	})

	it('rolling 後のピンゾロ以外の役は choice になり confirmHand で settled になる', () => {
		let state = apply(initialState(1), roll([4, 5, 6]), rollRevealed())

		expect(state.phase).toBe('choice')
		state = reduce(state, confirmHand())
		expect(state.phase).toBe('settled')
	})

	it('役なしは残投があれば open、3投目なら settled になる', () => {
		let state = apply(initialState(1), roll([2, 4, 6]), rollRevealed())

		expect(state.phase).toBe('open')
		state = apply(state, roll([1, 3, 5]), rollRevealed())
		expect(state.phase).toBe('open')
		state = apply(state, roll([2, 4, 6]), rollRevealed())
		expect(state.phase).toBe('settled')
		expect(state.throws).toHaveLength(MAX_THROWS)
	})

	it('ションベンは出目の役を無効にして1投を消費する', () => {
		let state = apply(initialState(1), roll([1, 1, 1], true), rollRevealed())

		expect(state.phase).toBe('open')
		expect(state.displayThrow).toEqual(throwOf([1, 1, 1], true))
		state = apply(state, roll([3, 3, 5]), rollRevealed())
		expect(state.phase).toBe('choice')
	})

	it('choice で確定せず roll すると前の役を捨てて最後の投で最終役が決まる', () => {
		let state = apply(initialState(1), roll([4, 5, 6]), rollRevealed())
		expect(state.phase).toBe('choice')

		state = apply(state, roll([2, 4, 6]), rollRevealed())
		expect(state.phase).toBe('open')
		state = apply(state, roll([1, 3, 5]), rollRevealed())
		expect(state.phase).toBe('settled')
		state = reduce(state, roll([6, 6, 6]))

		expect(state.phase).toBe('result')
		expect(state.hands).toEqual([NOME])
	})

	it('settled で roll すると確定役を積み、次プレイヤーが即 rolling から始まる', () => {
		let state = apply(initialState(2), roll([4, 5, 6]), rollRevealed(), confirmHand())

		state = reduce(state, roll([1, 2, 3]))

		expect(state.phase).toBe('rolling')
		expect(state.playerIndex).toBe(1)
		expect(state.hands).toEqual([hand('shigoro', 0, 800)])
		expect(state.throws).toEqual([throwOf([1, 2, 3])])
		expect(state.displayThrow).toEqual(throwOf([1, 2, 3]))
		expect(state.rollId).toBe(2)
	})

	it('最後のプレイヤーが settled で roll すると全員分の hands を持って result になる', () => {
		let state = apply(initialState(2), roll([4, 5, 6]), rollRevealed(), confirmHand())
		state = apply(state, roll([1, 2, 3]), rollRevealed(), confirmHand())
		expect(state.phase).toBe('settled')

		state = reduce(state, roll([6, 6, 6]))

		expect(state.phase).toBe('result')
		expect(state.hands).toEqual([hand('shigoro', 0, 800), hand('hifumi', 0, 0)])
		expect(state.playerIndex).toBe(1)
	})

	it('openRules と closeRules はフェーズを変えず rulesOpen だけを切り替える', () => {
		let state = apply(initialState(1), { type: 'openRules' })

		expect(state.rulesOpen).toBe(true)
		expect(state.phase).toBe('idle')
		state = apply(state, roll([2, 4, 6]), { type: 'closeRules' })
		expect(state.rulesOpen).toBe(false)
		expect(state.phase).toBe('rolling')
	})

	it('不正フェーズの action は同じ state インスタンスを返して無視する', () => {
		const idle = initialState(1)
		expect(reduce(idle, rollRevealed())).toBe(idle)
		expect(reduce(idle, confirmHand())).toBe(idle)

		const rolling = reduce(idle, roll([4, 5, 6]))
		expect(reduce(rolling, roll([1, 1, 1]))).toBe(rolling)

		const open = apply(idle, roll([2, 4, 6]), rollRevealed())
		expect(reduce(open, confirmHand())).toBe(open)

		const settled = apply(idle, roll([1, 1, 1]), rollRevealed())
		expect(reduce(settled, rollRevealed())).toBe(settled)

		const result = reduce(settled, roll([6, 6, 6]))
		expect(reduce(result, roll([4, 5, 6]))).toBe(result)
		expect(reduce(result, confirmHand())).toBe(result)
	})
})
