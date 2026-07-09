import { canPlace, emptyBoard, judge, place, type Board, type Mark, type Winner } from './engine'
import { applyEvent, pickEvent, type EventId, type Rng } from './events'

export type Phase = 'intro' | 'playing' | 'cutin' | 'finished'

export type GameState = {
	board: Board
	turn: Mark
	blocked: number | null
	extraMoves: number
	moveCount: number
	lastEvent: EventId | null
	pendingEvent: EventId | null
	phase: Phase
	winner: Winner
}

export type Action =
	| { type: 'start' }
	| { type: 'tap'; index: number; rng: Rng }
	| { type: 'cutinDone'; rng: Rng }
	| { type: 'retry'; rng: Rng }

// 先手はコイントスでランダム決定
export function initialState(rng: Rng): GameState {
	return {
		board: emptyBoard(),
		turn: rng() < 0.5 ? 'o' : 'x',
		blocked: null,
		extraMoves: 0,
		moveCount: 0,
		lastEvent: null,
		pendingEvent: null,
		phase: 'intro',
		winner: null,
	}
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'start':
			return state.phase === 'intro' ? { ...state, phase: 'playing' } : state
		case 'tap':
			return tap(state, action.index, action.rng)
		case 'cutinDone':
			return cutinDone(state, action.rng)
		case 'retry':
			return initialState(action.rng)
	}
}

function tap(state: GameState, index: number, rng: Rng): GameState {
	if (state.phase !== 'playing' || !canPlace(state.board, state.blocked, index)) return state
	const board = place(state.board, index, state.turn)
	const moveCount = state.moveCount + 1
	const winner = judge(board, state.blocked)
	if (winner) return { ...state, board, moveCount, winner, phase: 'finished' }

	const keepTurn = state.extraMoves > 0
	const turn: Mark = keepTurn ? state.turn : state.turn === 'o' ? 'x' : 'o'
	const extraMoves = keepTurn ? state.extraMoves - 1 : 0

	const event = pickEvent({
		board,
		blocked: state.blocked,
		moveCount,
		lastEvent: state.lastEvent,
		rng,
	})
	if (event)
		return { ...state, board, moveCount, turn, extraMoves, pendingEvent: event, phase: 'cutin' }
	return { ...state, board, moveCount, turn, extraMoves }
}

// イベント効果はカットイン終了時に反映する（カットイン→盤面更新の順で見せる）
function cutinDone(state: GameState, rng: Rng): GameState {
	if (state.phase !== 'cutin' || state.pendingEvent === null) return state
	const result = applyEvent(state.pendingEvent, state.board, state.blocked, rng)
	const winner = judge(result.board, result.blocked)
	return {
		...state,
		board: result.board,
		blocked: result.blocked,
		extraMoves: state.extraMoves + result.extraMoves,
		lastEvent: state.pendingEvent,
		pendingEvent: null,
		winner,
		phase: winner ? 'finished' : 'playing',
	}
}
