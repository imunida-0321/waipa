import {
	evaluateDice,
	handLabel,
	rankPlayers,
	resolveThrows,
	rollThrow,
	type Hand,
	type Throw,
} from '../dice'

// 決められた値を順に返す rng を作る
function seqRng(values: number[]): () => number {
	let i = 0
	return () => values[i++] ?? 0.999
}

describe('evaluateDice', () => {
	it('ピンゾロ・アラシ・シゴロ・ヒフミを判定する', () => {
		expect(evaluateDice([1, 1, 1])).toEqual({ type: 'pinzoro', value: 0, score: 1000 })
		expect(evaluateDice([5, 5, 5])).toEqual({ type: 'arashi', value: 5, score: 905 })
		expect(evaluateDice([2, 2, 2])).toEqual({ type: 'arashi', value: 2, score: 902 })
		expect(evaluateDice([4, 5, 6])).toEqual({ type: 'shigoro', value: 0, score: 800 })
		expect(evaluateDice([6, 5, 4])).toEqual({ type: 'shigoro', value: 0, score: 800 }) // 順不同
		expect(evaluateDice([1, 2, 3])).toEqual({ type: 'hifumi', value: 0, score: 0 })
		expect(evaluateDice([3, 1, 2])).toEqual({ type: 'hifumi', value: 0, score: 0 }) // 順不同
	})

	it('目（ペア＋1個）を判定する', () => {
		expect(evaluateDice([2, 2, 5])).toEqual({ type: 'me', value: 5, score: 105 })
		expect(evaluateDice([5, 2, 2])).toEqual({ type: 'me', value: 5, score: 105 }) // 順不同
		expect(evaluateDice([6, 6, 1])).toEqual({ type: 'me', value: 1, score: 101 })
		expect(evaluateDice([1, 1, 6])).toEqual({ type: 'me', value: 6, score: 106 })
	})

	it('役なしは null を返す', () => {
		expect(evaluateDice([2, 4, 6])).toBeNull()
		expect(evaluateDice([1, 3, 5])).toBeNull()
	})

	it('序列: 隣接する役の大小が正しい', () => {
		const score = (d: [number, number, number]) => evaluateDice(d)!.score
		expect(score([1, 1, 1])).toBeGreaterThan(score([6, 6, 6])) // ピンゾロ > アラシ6
		expect(score([2, 2, 2])).toBeGreaterThan(score([4, 5, 6])) // アラシ2 > シゴロ
		expect(score([4, 5, 6])).toBeGreaterThan(score([3, 3, 6])) // シゴロ > 6の目
		expect(score([3, 3, 1])).toBeGreaterThan(10) // 1の目 > 目なし(10)
		expect(score([1, 2, 3])).toBeLessThan(10) // ヒフミ < 目なし
	})
})

describe('rollThrow', () => {
	it('rng からションベン判定と出目3個を生成する', () => {
		// 1個目の rng がションベン判定: 0.049 → ションベン
		const t1 = rollThrow(seqRng([0.049, 0, 0.5, 0.999]))
		expect(t1.shonben).toBe(true)
		// 0.05 ちょうどはセーフ
		const t2 = rollThrow(seqRng([0.05, 0, 0.5, 0.999]))
		expect(t2.shonben).toBe(false)
		expect(t2.dice).toEqual([1, 4, 6]) // floor(0*6)+1, floor(0.5*6)+1, floor(0.999*6)+1
	})
})

describe('resolveThrows', () => {
	const t = (dice: [number, number, number], shonben = false): Throw => ({ dice, shonben })

	it('確定役が出た投の役を返す', () => {
		expect(resolveThrows([t([4, 5, 6])]).type).toBe('shigoro')
		expect(resolveThrows([t([2, 4, 6]), t([3, 3, 2])]).type).toBe('me')
	})

	it('3投役なしなら目なし', () => {
		const hand = resolveThrows([t([2, 4, 6]), t([1, 3, 5]), t([2, 4, 6])])
		expect(hand).toEqual({ type: 'nome', value: 0, score: 10 })
	})

	it('ションベン投は無視される（3投目ションベンなら目なし）', () => {
		const hand = resolveThrows([t([2, 4, 6]), t([1, 1, 1], true), t([2, 4, 6])])
		expect(hand.type).toBe('nome') // ピンゾロが出た投はションベンなので無効
	})
})

describe('handLabel', () => {
	const hand = (type: Hand['type'], value = 0, score = 0): Hand => ({ type, value, score })

	it('役名を表示用文字列にする', () => {
		expect(handLabel(hand('pinzoro'))).toBe('ピンゾロ！')
		expect(handLabel(hand('arashi', 5))).toBe('アラシ（5）！')
		expect(handLabel(hand('shigoro'))).toBe('シゴロ！')
		expect(handLabel(hand('me', 5))).toBe('5の目')
		expect(handLabel(hand('nome'))).toBe('目なし…')
		expect(handLabel(hand('hifumi'))).toBe('ヒフミ…')
	})
})

describe('rankPlayers', () => {
	const hand = (score: number): Hand => ({ type: 'me', value: 0, score })

	it('score 降順・最小 score が敗者', () => {
		const ranked = rankPlayers([hand(105), hand(1000), hand(10), hand(800)])
		expect(ranked.map((r) => r.playerIndex)).toEqual([1, 3, 0, 2])
		expect(ranked.map((r) => r.isLoser)).toEqual([false, false, false, true])
	})

	it('同率最下位は全員 isLoser', () => {
		const ranked = rankPlayers([hand(10), hand(105), hand(10)])
		expect(ranked.filter((r) => r.isLoser).map((r) => r.playerIndex)).toEqual([0, 2])
	})

	it('同率は playerIndex 昇順で安定', () => {
		const ranked = rankPlayers([hand(105), hand(800), hand(105)])
		expect(ranked.map((r) => r.playerIndex)).toEqual([1, 0, 2])
	})
})
