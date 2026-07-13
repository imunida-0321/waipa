export type Rng = () => number

export const LIMIT_MIN = 21
export const LIMIT_MAX = 30
export const STOP_UNLOCK = 15

export type Phase = 'playing' | 'exploded' | 'settled'

export type State = {
	phase: Phase
	limit: number // 秘密の上限 L。リザルトの答え合わせまで UI に出さない
	total: number
	turnIndex: number
	startIndex: number // このラウンドの開始プレイヤー（restart で +1 ローテーション）
	playerCount: number
	contributions: number[] // players と同順の累計貢献ポイント
	losers: number[] // バースト1人 or 精算の1人以上
	stopperIndex: number | null
}

export type Action =
	{ type: 'add'; amount: 1 | 2 | 3 } | { type: 'stop' } | { type: 'restart'; rng: Rng }

// 秘密の上限: 21〜30 の整数を一様ランダムで決める
export function pickLimit(rng: Rng): number {
	return LIMIT_MIN + Math.floor(rng() * (LIMIT_MAX - LIMIT_MIN + 1))
}

export function createInitialState(playerCount: number, rng: Rng, startIndex = 0): State {
	return {
		phase: 'playing',
		limit: pickLimit(rng),
		total: 0,
		turnIndex: startIndex,
		startIndex,
		playerCount,
		contributions: Array(playerCount).fill(0),
		losers: [],
		stopperIndex: null,
	}
}

export function canStop(state: State): boolean {
	return state.phase === 'playing' && state.total >= STOP_UNLOCK
}

// ストップ精算: 貢献最少が負け。宣言者がタイを含む最少なら宣言者の単独負け、
// 宣言者以外のタイはタイ全員負け（2026-07-11 ブレスト決定）
export function settle(contributions: number[], stopperIndex: number): number[] {
	const min = Math.min(...contributions)
	if (contributions[stopperIndex] === min) return [stopperIndex]
	return contributions.flatMap((c, i) => (c === min ? [i] : []))
}

export function reduce(state: State, action: Action): State {
	switch (action.type) {
		case 'add': {
			if (state.phase !== 'playing') return state
			const total = state.total + action.amount
			const contributions = state.contributions.map((c, i) =>
				i === state.turnIndex ? c + action.amount : c,
			)
			if (total > state.limit) {
				// バースト: 積んだ本人が負け。手番はそのまま（敗者表示に使う）
				return {
					...state,
					total,
					contributions,
					phase: 'exploded',
					losers: [state.turnIndex],
				}
			}
			return {
				...state,
				total,
				contributions,
				turnIndex: (state.turnIndex + 1) % state.playerCount,
			}
		}
		case 'stop': {
			if (!canStop(state)) return state
			return {
				...state,
				phase: 'settled',
				stopperIndex: state.turnIndex,
				losers: settle(state.contributions, state.turnIndex),
			}
		}
		case 'restart': {
			if (state.phase === 'playing') return state
			return createInitialState(
				state.playerCount,
				action.rng,
				(state.startIndex + 1) % state.playerCount,
			)
		}
	}
}
