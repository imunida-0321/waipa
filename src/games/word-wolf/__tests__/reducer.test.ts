import type { WordPair } from '../engine'
import { currentVoter, initialState, reduce, type Action, type GameState } from '../reducer'

const pair: WordPair = { id: 'p1', pack: 'food', word_a: 'ラーメン', word_b: 'うどん' }
const pair2: WordPair = { id: 'p2', pack: 'food', word_a: '寿司', word_b: '刺身' }

// rng() => 0 固定: assignRoles はウルフ index 0、swapWords は word_a が多数派
const rng0 = () => 0

function start(playerCount: number, wolfCount: 1 | 2 = 1): GameState {
	return reduce(initialState(playerCount), {
		type: 'start',
		config: { wolfCount, discussSeconds: 180, pack: 'food' },
		pair,
		rng: rng0,
	})
}

function apply(state: GameState, ...actions: Action[]): GameState {
	return actions.reduce(reduce, state)
}

// deal を全員ぶん進めて discuss へ
function toDiscuss(state: GameState): GameState {
	let s = state
	for (let i = 0; i < s.playerCount; i++) s = reduce(s, { type: 'dealtOne' })
	return s
}

describe('start / deal', () => {
	it('start でウルフとお題が確定し deal へ', () => {
		const s = start(3)
		expect(s.phase).toBe('deal')
		expect(s.wolfIndices).toEqual([0])
		expect(s.words).toEqual({ majority: 'ラーメン', wolf: 'うどん' })
		expect(s.usedPairIds).toEqual(['p1'])
	})

	it('7人未満は wolfCount 2 を指定しても 1 に丸める', () => {
		const s = start(6, 2)
		expect(s.wolfIndices).toHaveLength(1)
	})

	it('dealtOne を人数ぶん繰り返すと discuss へ', () => {
		let s = start(3)
		s = apply(s, { type: 'dealtOne' })
		expect(s.dealIndex).toBe(1)
		s = apply(s, { type: 'dealtOne' }, { type: 'dealtOne' })
		expect(s.phase).toBe('discuss')
	})
})

describe('vote / 開票', () => {
	it('discussDone で全員が投票キューに入る', () => {
		const s = apply(toDiscuss(start(3)), { type: 'discussDone' })
		expect(s.phase).toBe('vote')
		expect(s.voterQueue).toEqual([0, 1, 2])
		expect(currentVoter(s)).toBe(0)
	})

	it('自分への投票は無効', () => {
		const s = apply(toDiscuss(start(3)), { type: 'discussDone' })
		expect(reduce(s, { type: 'vote', target: 0 })).toBe(s)
	})

	it('最多票1人なら reveal へ', () => {
		let s = apply(toDiscuss(start(3)), { type: 'discussDone' })
		s = apply(
			s,
			{ type: 'vote', target: 1 }, // 0 → 1
			{ type: 'vote', target: 0 }, // 1 → 0
			{ type: 'vote', target: 0 }, // 2 → 0
		)
		expect(s.phase).toBe('reveal')
		expect(s.eliminatedIndex).toBe(0)
	})

	it('同票なら即・決選投票（候補以外が投票者）', () => {
		let s = apply(toDiscuss(start(4)), { type: 'discussDone' })
		s = apply(
			s,
			{ type: 'vote', target: 1 }, // 0 → 1
			{ type: 'vote', target: 0 }, // 1 → 0
			{ type: 'vote', target: 0 }, // 2 → 0
			{ type: 'vote', target: 1 }, // 3 → 1（0 と 1 が 2 票ずつ）
		)
		expect(s.phase).toBe('vote')
		expect(s.voteCandidates).toEqual([0, 1])
		expect(s.voterQueue).toEqual([2, 3])
	})

	it('決選投票の候補外への投票は無効', () => {
		let s = apply(toDiscuss(start(4)), { type: 'discussDone' })
		s = apply(
			s,
			{ type: 'vote', target: 1 },
			{ type: 'vote', target: 0 },
			{ type: 'vote', target: 0 },
			{ type: 'vote', target: 1 },
		)
		expect(reduce(s, { type: 'vote', target: 3 })).toBe(s)
	})

	it('決選投票でも同票なら runoff-discuss へ', () => {
		let s = apply(toDiscuss(start(4)), { type: 'discussDone' })
		s = apply(
			s,
			{ type: 'vote', target: 1 },
			{ type: 'vote', target: 0 },
			{ type: 'vote', target: 0 },
			{ type: 'vote', target: 1 },
			// 決選: 投票者 2, 3 が割れる
			{ type: 'vote', target: 0 }, // 2 → 0
			{ type: 'vote', target: 1 }, // 3 → 1
		)
		expect(s.phase).toBe('runoff-discuss')
		expect(s.voteCandidates).toEqual([0, 1])
	})

	it('runoff-discuss 後の discussDone で候補以外が再投票する', () => {
		let s = apply(toDiscuss(start(4)), { type: 'discussDone' })
		s = apply(
			s,
			{ type: 'vote', target: 1 },
			{ type: 'vote', target: 0 },
			{ type: 'vote', target: 0 },
			{ type: 'vote', target: 1 },
			{ type: 'vote', target: 0 },
			{ type: 'vote', target: 1 },
			{ type: 'discussDone' },
		)
		expect(s.phase).toBe('vote')
		expect(s.voterQueue).toEqual([2, 3])
		// 今度は 0 に寄せて決着
		s = apply(s, { type: 'vote', target: 0 }, { type: 'vote', target: 0 })
		expect(s.phase).toBe('reveal')
		expect(s.eliminatedIndex).toBe(0)
	})

	it('全員同票（候補＝全員）は再議論後に通常投票へフォールバック', () => {
		let s = apply(toDiscuss(start(3)), { type: 'discussDone' })
		s = apply(
			s,
			{ type: 'vote', target: 1 }, // 0 → 1
			{ type: 'vote', target: 2 }, // 1 → 2
			{ type: 'vote', target: 0 }, // 2 → 0（全員 1 票）
		)
		expect(s.phase).toBe('runoff-discuss')
		expect(s.voteCandidates).toBeNull()
		s = apply(s, { type: 'discussDone' })
		expect(s.voterQueue).toEqual([0, 1, 2])
	})
})

describe('reveal / reversal / result', () => {
	function toReveal(): GameState {
		let s = apply(toDiscuss(start(3)), { type: 'discussDone' })
		return apply(
			s,
			{ type: 'vote', target: 1 },
			{ type: 'vote', target: 0 },
			{ type: 'vote', target: 0 },
		)
	}

	it('ウルフを吊ったら reversal へ', () => {
		const s = apply(toReveal(), { type: 'revealDone' })
		expect(s.phase).toBe('reversal')
	})

	it('逆転成功で wolf-reversal、失敗で citizens', () => {
		const base = apply(toReveal(), { type: 'revealDone' })
		expect(apply(base, { type: 'reversalJudged', guessed: true }).outcome).toBe('wolf-reversal')
		expect(apply(base, { type: 'reversalJudged', guessed: false }).outcome).toBe('citizens')
	})

	it('市民を吊ったら即 result（ウルフの勝ち）', () => {
		let s = apply(toDiscuss(start(3)), { type: 'discussDone' })
		// 全員が 1 に投票（0 は 1 へ、1 は 2 へ…とせず、1 を 2 票にする）
		s = apply(
			s,
			{ type: 'vote', target: 1 }, // 0 → 1
			{ type: 'vote', target: 2 }, // 1 → 2
			{ type: 'vote', target: 1 }, // 2 → 1
			{ type: 'revealDone' },
		)
		expect(s.phase).toBe('result')
		expect(s.outcome).toBe('wolf')
	})
})

describe('retry', () => {
	it('もう一回で新お題・新ウルフ・usedPairIds 蓄積', () => {
		let s = apply(toDiscuss(start(3)), { type: 'discussDone' })
		s = apply(
			s,
			{ type: 'vote', target: 1 },
			{ type: 'vote', target: 0 },
			{ type: 'vote', target: 0 },
			{ type: 'revealDone' },
			{ type: 'reversalJudged', guessed: false },
			{ type: 'retry', pair: pair2, rng: rng0 },
		)
		expect(s.phase).toBe('deal')
		expect(s.usedPairIds).toEqual(['p1', 'p2'])
		expect(s.words).toEqual({ majority: '寿司', wolf: '刺身' })
		expect(s.eliminatedIndex).toBeNull()
		expect(s.outcome).toBeNull()
	})

	it('使用済み pair が再登場したら usedPairIds をリセット', () => {
		let s = apply(toDiscuss(start(3)), { type: 'discussDone' })
		s = apply(
			s,
			{ type: 'vote', target: 1 },
			{ type: 'vote', target: 0 },
			{ type: 'vote', target: 0 },
			{ type: 'revealDone' },
			{ type: 'reversalJudged', guessed: false },
			{ type: 'retry', pair, rng: rng0 }, // p1 を再利用
		)
		expect(s.usedPairIds).toEqual(['p1'])
	})
})
