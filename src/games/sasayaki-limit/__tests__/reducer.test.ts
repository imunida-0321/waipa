import { ROUNDS } from '../engine'
import { initialState, reduce, type GameState } from '../reducer'

const rng = () => 0.5

// ヘルパー: 現在の発声者が peakNorm で計測を終える
function playTurn(s: GameState, peakNorm: number): GameState {
	const measuring = reduce(s, { type: 'startMeasure' })
	const judged = reduce(measuring, { type: 'measured', peakNorm })
	return reduce(judged, { type: 'next', rng })
}

// ヘルパー: ゾーン内の値（成功）とゾーン外の値（失敗）
function inZone(s: GameState): number {
	return (s.zone.low + s.zone.high) / 2
}

describe('initialState', () => {
	it('3人・R1・全員が activePlayers・ゾーンは R1 幅', () => {
		const s = initialState(3, rng)
		expect(s.phase).toBe('speech')
		expect(s.activePlayers).toEqual([0, 1, 2])
		expect(s.round).toBe(1)
		expect(s.zone.high - s.zone.low).toBeCloseTo(0.4)
	})
})

describe('通常ラウンド進行', () => {
	it('startMeasure → measured で judged になり成功がカウントされる', () => {
		const s0 = initialState(2, rng)
		const s1 = reduce(s0, { type: 'startMeasure' })
		expect(s1.phase).toBe('measuring')
		const s2 = reduce(s1, { type: 'measured', peakNorm: inZone(s1) })
		expect(s2.phase).toBe('judged')
		expect(s2.lastJudgement).toBe('ok')
		expect(s2.successCounts[0]).toBe(1)
	})
	it('失敗（low/high）はカウントされない', () => {
		const s0 = initialState(2, rng)
		const s1 = reduce(s0, { type: 'startMeasure' })
		const s2 = reduce(s1, { type: 'measured', peakNorm: 0 })
		expect(s2.lastJudgement).toBe('low')
		expect(s2.successCounts[0]).toBe(0)
	})
	it('全員発声し終えたら round-result（R1・R2）', () => {
		let s = initialState(2, rng)
		s = playTurn(s, inZone(s))
		expect(s.phase).toBe('speech')
		expect(s.turnPos).toBe(1)
		s = playTurn(s, inZone(s))
		expect(s.phase).toBe('round-result')
	})
	it('nextRound で次ラウンドへ（ゾーンが狭くなる）', () => {
		let s = initialState(2, rng)
		s = playTurn(s, inZone(s))
		s = playTurn(s, inZone(s))
		const s2 = reduce(s, { type: 'nextRound', rng })
		expect(s2.phase).toBe('speech')
		expect(s2.round).toBe(2)
		expect(s2.turnPos).toBe(0)
		expect(s2.zone.high - s2.zone.low).toBeCloseTo(0.3)
	})
})

// ヘルパー: 指定の成功者だけ成功させて1ラウンド消化
function playRound(s: GameState, winners: number[]): GameState {
	for (let i = 0; i < s.activePlayers.length; i++) {
		const player = s.activePlayers[s.turnPos]
		s = playTurn(s, winners.includes(player) ? inZone(s) : 0)
	}
	return s
}

function playAllRounds(playerCount: number, winners: number[]): GameState {
	let s = initialState(playerCount, rng)
	for (let r = 1; r <= ROUNDS; r++) {
		s = playRound(s, winners)
		if (s.phase === 'round-result') s = reduce(s, { type: 'nextRound', rng })
	}
	return s
}

describe('最終判定', () => {
	it('最下位が1人なら result で敗者確定', () => {
		const s = playAllRounds(3, [0, 1]) // player2 だけ全敗
		expect(s.phase).toBe('result')
		expect(s.losers).toEqual([2])
	})
	it('同率最下位が複数なら sudden-death-intro（対象者のみ・極狭ゾーン）', () => {
		const s = playAllRounds(3, [0]) // player1,2 が同率最下位
		expect(s.phase).toBe('sudden-death-intro')
		expect(s.suddenDeath).toBe(true)
		expect(s.activePlayers).toEqual([1, 2])
		expect(s.zone.high - s.zone.low).toBeCloseTo(0.15)
	})
})

describe('サドンデス', () => {
	function toSuddenDeath(): GameState {
		const s = playAllRounds(3, [0])
		return reduce(s, { type: 'sdStart' })
	}
	it('sdStart で speech に入り対象者が発声', () => {
		const s = toSuddenDeath()
		expect(s.phase).toBe('speech')
		expect(s.activePlayers).toEqual([1, 2])
	})
	it('失敗者が1人ならその人が敗者', () => {
		let s = toSuddenDeath()
		s = playTurn(s, inZone(s)) // player1 成功
		s = playTurn(s, 0) // player2 失敗
		expect(s.phase).toBe('result')
		expect(s.losers).toEqual([2])
	})
	it('全員成功なら同メンバーで再戦（intro に戻る）', () => {
		let s = toSuddenDeath()
		s = playTurn(s, inZone(s))
		s = playTurn(s, inZone(s))
		expect(s.phase).toBe('sudden-death-intro')
		expect(s.activePlayers).toEqual([1, 2])
	})
	it('失敗者が複数なら失敗者だけで反復', () => {
		let s = playAllRounds(4, [0]) // player1,2,3 同率
		s = reduce(s, { type: 'sdStart' })
		s = playTurn(s, 0) // player1 失敗
		s = playTurn(s, inZone(s)) // player2 成功
		s = playTurn(s, 0) // player3 失敗
		expect(s.phase).toBe('sudden-death-intro')
		expect(s.activePlayers).toEqual([1, 3])
	})
})

describe('retry', () => {
	it('result から初期状態に戻る', () => {
		const s = playAllRounds(3, [0, 1])
		const s2 = reduce(s, { type: 'retry', rng })
		expect(s2.phase).toBe('speech')
		expect(s2.round).toBe(1)
		expect(s2.successCounts).toEqual([0, 0, 0])
	})
})

describe('不正フェーズのアクションは無視', () => {
	it('speech 中の measured は状態を変えない', () => {
		const s = initialState(2, rng)
		expect(reduce(s, { type: 'measured', peakNorm: 0.5 })).toBe(s)
	})
})
