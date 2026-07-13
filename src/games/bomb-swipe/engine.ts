export type Rng = () => number

export const MINE_MIN = 60
export const MINE_MAX = 95
export const SCORE_MAX = 100

// 地雷位置: 60〜95 の整数を一様ランダムで決める（プレイヤーごとに1個）
export function pickMine(rng: Rng): number {
	return MINE_MIN + Math.floor(rng() * (MINE_MAX - MINE_MIN + 1))
}

// 地雷ちょうども「踏んだ」扱いで爆発（2026-07-13 ブレスト決定）
export function isExploded(score: number, mine: number): boolean {
	return score >= mine
}

// 上方向ドラッグ量(px)をスコア 0〜100 に変換。レイアウト確定前(trackPx<=0)は 0
export function scoreFromDrag(dragPx: number, trackPx: number): number {
	if (trackPx <= 0) return 0
	return Math.min(SCORE_MAX, Math.max(0, Math.round((dragPx / trackPx) * SCORE_MAX)))
}

export type PlayerResult = {
	score: number
	exploded: boolean
}

// 爆発者がいれば爆発者全員、いなければ最低スコア全員（同率含む）が負け
export function decideLosers(results: PlayerResult[]): number[] {
	const exploded = results.flatMap((r, i) => (r.exploded ? [i] : []))
	if (exploded.length > 0) return exploded
	const min = Math.min(...results.map((r) => r.score))
	return results.flatMap((r, i) => (r.score === min ? [i] : []))
}

export type Phase = 'handoff' | 'swiping' | 'safe' | 'exploded' | 'result'

export type State = {
	phase: Phase
	turnIndex: number
	playerCount: number
	mines: number[]
	results: (PlayerResult | null)[]
}

export type Action =
	| { type: 'startSwipe' }
	| { type: 'release'; score: number }
	| { type: 'next' }
	| { type: 'restart'; rng: Rng }

export function createInitialState(playerCount: number, rng: Rng): State {
	return {
		phase: 'handoff',
		turnIndex: 0,
		playerCount,
		mines: Array.from({ length: playerCount }, () => pickMine(rng)),
		results: Array(playerCount).fill(null),
	}
}

export function reduce(state: State, action: Action): State {
	switch (action.type) {
		case 'startSwipe': {
			if (state.phase !== 'handoff') return state
			return { ...state, phase: 'swiping' }
		}
		case 'release': {
			if (state.phase !== 'swiping') return state
			const exploded = isExploded(action.score, state.mines[state.turnIndex])
			const results = state.results.map((r, i) =>
				i === state.turnIndex ? { score: action.score, exploded } : r,
			)
			return { ...state, results, phase: exploded ? 'exploded' : 'safe' }
		}
		case 'next': {
			if (state.phase !== 'safe' && state.phase !== 'exploded') return state
			if (state.turnIndex + 1 < state.playerCount) {
				return { ...state, phase: 'handoff', turnIndex: state.turnIndex + 1 }
			}
			return { ...state, phase: 'result' }
		}
		case 'restart': {
			if (state.phase !== 'result') return state
			return createInitialState(state.playerCount, action.rng)
		}
	}
}
