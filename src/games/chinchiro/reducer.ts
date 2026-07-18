import { evaluateDice, MAX_THROWS, resolveThrows, rollThrow, type Hand, type Throw } from './dice'

export type Phase = 'idle' | 'rolling' | 'open' | 'choice' | 'settled' | 'result'

export type GameState = {
	phase: Phase
	playerCount: number
	playerIndex: number
	throws: Throw[]
	hands: Hand[]
	displayThrow: Throw | null
	rollId: number
	rulesOpen: boolean
}

export type Action =
	| { type: 'roll'; rng: () => number }
	| { type: 'rollRevealed' }
	| { type: 'confirmHand' }
	| { type: 'openRules' }
	| { type: 'closeRules' }

export function initialState(playerCount: number): GameState {
	return {
		phase: 'idle',
		playerCount,
		playerIndex: 0,
		throws: [],
		hands: [],
		displayThrow: null,
		rollId: 0,
		rulesOpen: false,
	}
}

function rollCurrentPlayer(state: GameState, throwItem: Throw): GameState {
	return {
		...state,
		phase: 'rolling',
		throws: [...state.throws, throwItem],
		displayThrow: throwItem,
		rollId: state.rollId + 1,
	}
}

function rollNextPlayer(state: GameState, throwItem: Throw): GameState {
	return {
		...state,
		phase: 'rolling',
		playerIndex: state.playerIndex + 1,
		throws: [throwItem],
		hands: [...state.hands, resolveThrows(state.throws)],
		displayThrow: throwItem,
		rollId: state.rollId + 1,
	}
}

function settleOrContinue(state: GameState): Phase {
	const throwItem = state.throws[state.throws.length - 1]
	if (!throwItem) return 'settled'

	const hand = throwItem.shonben ? null : evaluateDice(throwItem.dice)
	const isLastThrow = state.throws.length >= MAX_THROWS

	if (hand?.type === 'pinzoro') return 'settled'
	if (isLastThrow) return 'settled'
	if (hand) return 'choice'
	return 'open'
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'roll': {
			if (state.phase === 'rolling' || state.phase === 'result') return state
			if (state.phase === 'settled') {
				const hands = [...state.hands, resolveThrows(state.throws)]
				if (state.playerIndex + 1 >= state.playerCount)
					return { ...state, hands, phase: 'result' }
				return rollNextPlayer(state, rollThrow(action.rng))
			}
			return rollCurrentPlayer(state, rollThrow(action.rng))
		}
		case 'rollRevealed':
			if (state.phase !== 'rolling') return state
			return { ...state, phase: settleOrContinue(state) }
		case 'confirmHand':
			if (state.phase !== 'choice') return state
			return { ...state, phase: 'settled' }
		case 'openRules':
			return { ...state, rulesOpen: true }
		case 'closeRules':
			return { ...state, rulesOpen: false }
	}
}
