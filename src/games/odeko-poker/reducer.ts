import { dealCards, judge, type Declaration, type Judgement, type Rng } from './engine'

export type Phase = 'deal' | 'forehead' | 'declare' | 'result'

export type GameState = {
	phase: Phase
	playerCount: number
	round: number
	cards: number[]
	turnIndex: number
	declarations: Declaration[]
	judgement: Judgement | null
}

export type Action =
	| { type: 'start'; rng: Rng }
	| { type: 'foreheadDone' }
	| { type: 'declare'; choice: Declaration }
	| { type: 'nextRound' }

export function initialState(playerCount: number): GameState {
	return {
		phase: 'deal',
		playerCount,
		round: 1,
		cards: [],
		turnIndex: 0,
		declarations: [],
		judgement: null,
	}
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'start':
			if (state.phase !== 'deal') return state
			return {
				...state,
				cards: dealCards(state.playerCount, action.rng),
				turnIndex: 0,
				phase: 'forehead',
			}
		case 'foreheadDone': {
			if (state.phase !== 'forehead') return state
			const next = state.turnIndex + 1
			if (next < state.playerCount) return { ...state, turnIndex: next }
			return { ...state, turnIndex: 0, phase: 'declare' }
		}
		case 'declare': {
			if (state.phase !== 'declare') return state
			const declarations = [...state.declarations, action.choice]
			const next = state.turnIndex + 1
			if (next < state.playerCount) return { ...state, declarations, turnIndex: next }
			return {
				...state,
				declarations,
				turnIndex: 0,
				judgement: judge(state.cards, declarations),
				phase: 'result',
			}
		}
		case 'nextRound':
			if (state.phase !== 'result') return state
			return { ...initialState(state.playerCount), round: state.round + 1 }
	}
}
