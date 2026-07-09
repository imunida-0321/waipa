import type { Topic } from '@/lib/topics-store'
import { dealNumbers, drawTopic, MAX_COUNT, MIN_COUNT, type Rng } from './engine'

export type Phase = 'count' | 'deal' | 'reveal' | 'done'

export const MAX_SKIPS = 2
export const DEFAULT_COUNT = 4

export type GameState = {
	phase: Phase
	playerCount: number
	numbers: number[]
	dealIndex: number
	round: number
	topicId: string | null
	topicText: string
	executorNumber: number
	usedTopicIds: string[]
	skipsLeft: number
}

export type Action =
	| { type: 'setCount'; count: number }
	| { type: 'deal'; rng: Rng }
	| { type: 'confirmNumber'; topics: readonly Topic[]; rng: Rng }
	| { type: 'skip'; topics: readonly Topic[]; rng: Rng }
	| { type: 'revealDone' }
	| { type: 'nextRound'; rng: Rng }

export function initialState(): GameState {
	return {
		phase: 'count',
		playerCount: DEFAULT_COUNT,
		numbers: [],
		dealIndex: 0,
		round: 1,
		topicId: null,
		topicText: '',
		executorNumber: 0,
		usedTopicIds: [],
		skipsLeft: MAX_SKIPS,
	}
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'setCount': {
			if (state.phase !== 'count') return state
			const count = Math.min(MAX_COUNT, Math.max(MIN_COUNT, action.count))
			return { ...state, playerCount: count }
		}
		case 'deal': {
			if (state.phase !== 'count') return state
			return {
				...state,
				phase: 'deal',
				numbers: dealNumbers(state.playerCount, action.rng),
				dealIndex: 0,
			}
		}
		case 'confirmNumber': {
			if (state.phase !== 'deal') return state
			const dealIndex = state.dealIndex + 1
			if (dealIndex < state.playerCount) return { ...state, dealIndex }
			// 全員確認 → お題＆実行役を抽選して発表へ
			const drawn = drawTopic(
				action.topics,
				state.usedTopicIds,
				state.playerCount,
				action.rng,
			)
			return { ...state, dealIndex, phase: 'reveal', ...drawn }
		}
		case 'skip': {
			if (state.phase !== 'reveal' || state.skipsLeft <= 0) return state
			const drawn = drawTopic(
				action.topics,
				state.usedTopicIds,
				state.playerCount,
				action.rng,
			)
			return { ...state, ...drawn, skipsLeft: state.skipsLeft - 1 }
		}
		case 'revealDone':
			return state.phase === 'reveal' ? { ...state, phase: 'done' } : state
		case 'nextRound': {
			if (state.phase !== 'done') return state
			return {
				...state,
				phase: 'deal',
				round: state.round + 1,
				numbers: dealNumbers(state.playerCount, action.rng),
				dealIndex: 0,
				topicId: null,
				topicText: '',
				executorNumber: 0,
			}
		}
	}
}
