import { INITIAL_LIVES, isTruthful, rollDice, validDeclarations, type Rng } from './engine'

export type Phase = 'roll' | 'peek' | 'declare' | 'handover' | 'respond' | 'reveal' | 'result'

export type GameState = {
	phase: Phase
	playerCount: number
	lives: number[]
	turnIndex: number
	handoverNext: 'roll' | 'respond'
	prevDeclaration: number | null
	prevDeclarerIndex: number | null
	actualRoll: { d1: number; d2: number; value: number } | null
	rollId: number
	reveal: { wasBluff: boolean; lifeLoserIndex: number } | null
	loserIndex: number | null
}

export type Action =
	| { type: 'roll'; rng: Rng }
	| { type: 'toDeclare' }
	| { type: 'declare'; value: number }
	| { type: 'handedOver' }
	| { type: 'believe' }
	| { type: 'doubt' }
	| { type: 'revealDone' }
	| { type: 'retry' }

export function initialState(playerCount: number): GameState {
	return {
		phase: 'roll',
		playerCount,
		lives: Array(playerCount).fill(INITIAL_LIVES),
		turnIndex: 0,
		handoverNext: 'roll',
		prevDeclaration: null,
		prevDeclarerIndex: null,
		actualRoll: null,
		rollId: 0,
		reveal: null,
		loserIndex: null,
	}
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'roll':
			if (state.phase !== 'roll') return state
			return {
				...state,
				actualRoll: rollDice(action.rng),
				rollId: state.rollId + 1,
				phase: 'peek',
			}
		case 'toDeclare':
			if (state.phase !== 'peek') return state
			return { ...state, phase: 'declare' }
		case 'declare': {
			if (state.phase !== 'declare') return state
			if (!validDeclarations(state.prevDeclaration).includes(action.value)) return state
			return {
				...state,
				prevDeclaration: action.value,
				prevDeclarerIndex: state.turnIndex,
				turnIndex: (state.turnIndex + 1) % state.playerCount,
				handoverNext: 'respond',
				phase: 'handover',
			}
		}
		case 'handedOver':
			if (state.phase !== 'handover') return state
			return { ...state, phase: state.handoverNext }
		case 'believe':
			if (state.phase !== 'respond') return state
			return { ...state, phase: 'roll' }
		case 'doubt': {
			if (
				state.phase !== 'respond' ||
				state.prevDeclaration === null ||
				state.prevDeclarerIndex === null ||
				state.actualRoll === null
			)
				return state
			const wasBluff = !isTruthful(state.prevDeclaration, state.actualRoll.value)
			const lifeLoserIndex = wasBluff ? state.prevDeclarerIndex : state.turnIndex
			const lives = [...state.lives]
			lives[lifeLoserIndex] -= 1
			return {
				...state,
				lives,
				reveal: { wasBluff, lifeLoserIndex },
				loserIndex: lives[lifeLoserIndex] === 0 ? lifeLoserIndex : null,
				phase: 'reveal',
			}
		}
		case 'revealDone': {
			if (state.phase !== 'reveal' || state.reveal === null) return state
			if (state.loserIndex !== null) return { ...state, phase: 'result' }
			// ダウト失敗（応答者自身がライフを失う）は今スマホを持っている人がそのまま次の先手なので
			// handover を挟まず直接 roll へ進む
			const selfContinues = state.reveal.lifeLoserIndex === state.turnIndex
			return {
				...state,
				turnIndex: state.reveal.lifeLoserIndex,
				prevDeclaration: null,
				prevDeclarerIndex: null,
				actualRoll: null,
				reveal: null,
				handoverNext: 'roll',
				phase: selfContinues ? 'roll' : 'handover',
			}
		}
		case 'retry': {
			if (state.phase !== 'result' || state.loserIndex === null) return state
			return {
				...initialState(state.playerCount),
				rollId: state.rollId,
				turnIndex: state.loserIndex,
				handoverNext: 'roll',
				phase: 'handover',
			}
		}
	}
}
