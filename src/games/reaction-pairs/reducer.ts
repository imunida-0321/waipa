import type { Topic } from '@/lib/topics-store'
import {
	createDeck,
	isMatch,
	pickPunishTarget,
	type Card,
	type PunishTarget,
	type Rng,
} from './engine'

export type Phase = 'play' | 'roulette' | 'punish' | 'result'

export type GameState = {
	phase: Phase
	cards: Card[]
	playerCount: number
	turnIndex: number
	flippedIds: string[]
	scores: number[]
	punishCounts: number[]
	passHolder: number | null
	roulette: PunishTarget | null
	punish: { playerIndex: number; topic: Topic } | null
	loserIndex: number | null
	usedTopicIds: string[]
}

export type Action =
	| { type: 'flip'; cardId: string; rng: Rng }
	| { type: 'hideMismatch' }
	| { type: 'rouletteDone'; topic: Topic }
	| { type: 'punishDone' }
	| { type: 'retry'; rng: Rng }

export function initialState(playerCount: number, rng: Rng): GameState {
	return {
		phase: 'play',
		cards: createDeck(rng),
		playerCount,
		turnIndex: 0,
		flippedIds: [],
		scores: Array(playerCount).fill(0),
		punishCounts: Array(playerCount).fill(0),
		passHolder: null,
		roulette: null,
		punish: null,
		loserIndex: null,
		usedTopicIds: [],
	}
}

// 不成立の2枚を見せている最中か（コンポーネントが 1.5 秒タイマーで hideMismatch を送る）
export function isMismatchShown(state: GameState): boolean {
	if (state.phase !== 'play' || state.flippedIds.length !== 2) return false
	const [a, b] = state.flippedIds.map((id) => state.cards.find((c) => c.id === id) as Card)
	return !isMatch(a, b)
}

function setCardState(cards: Card[], ids: string[], cardState: Card['state']): Card[] {
	return cards.map((c) => (ids.includes(c.id) ? { ...c, state: cardState } : c))
}

function nextTurn(state: GameState): number {
	return (state.turnIndex + 1) % state.playerCount
}

// 「未消化の絵柄カードが残っていない」で判定する（枚数固定に依存しないので、
// テストで小さい盤面に差し替えても正しく動く）
function allPairsCleared(cards: Card[]): boolean {
	return cards.every((c) => c.kind !== 'pair' || c.state === 'removed')
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'flip':
			return flip(state, action.cardId, action.rng)
		case 'hideMismatch':
			return hideMismatch(state)
		case 'rouletteDone':
			return rouletteDone(state, action.topic)
		case 'punishDone':
			return punishDone(state)
		case 'retry':
			return initialState(state.playerCount, action.rng)
	}
}

function flip(state: GameState, cardId: string, rng: Rng): GameState {
	if (state.phase !== 'play' || state.flippedIds.length >= 2) return state
	const card = state.cards.find((c) => c.id === cardId)
	if (!card || card.state !== 'hidden') return state

	if (card.kind === 'joker') {
		return {
			...state,
			cards: setCardState(state.cards, [cardId], 'revealed'),
			loserIndex: state.turnIndex,
			phase: 'result',
		}
	}
	if (card.kind === 'lucky') {
		return {
			...state,
			cards: setCardState(state.cards, [cardId], 'removed'),
			passHolder: state.turnIndex,
		}
	}

	const cards = setCardState(state.cards, [cardId], 'revealed')
	const flippedIds = [...state.flippedIds, cardId]
	if (flippedIds.length < 2) return { ...state, cards, flippedIds }

	const [a, b] = flippedIds.map((id) => cards.find((c) => c.id === id) as Card)
	if (!isMatch(a, b)) return { ...state, cards, flippedIds } // 1.5秒後に hideMismatch が来る

	const scores = [...state.scores]
	scores[state.turnIndex] += 1
	return {
		...state,
		cards: setCardState(cards, flippedIds, 'removed'),
		flippedIds: [],
		scores,
		roulette: pickPunishTarget(state.playerCount, state.passHolder, rng),
		phase: 'roulette',
	}
}

function hideMismatch(state: GameState): GameState {
	if (!isMismatchShown(state)) return state
	return {
		...state,
		cards: setCardState(state.cards, state.flippedIds, 'hidden'),
		flippedIds: [],
		turnIndex: nextTurn(state),
	}
}

function rouletteDone(state: GameState, topic: Topic): GameState {
	if (state.phase !== 'roulette' || !state.roulette) return state
	const { finalIndex, passConsumed } = state.roulette
	const punishCounts = [...state.punishCounts]
	punishCounts[finalIndex] += 1
	return {
		...state,
		phase: 'punish',
		punish: { playerIndex: finalIndex, topic },
		punishCounts,
		usedTopicIds: [...state.usedTopicIds, topic.id],
		passHolder: passConsumed ? null : state.passHolder,
	}
}

function punishDone(state: GameState): GameState {
	if (state.phase !== 'punish') return state
	return {
		...state,
		punish: null,
		roulette: null,
		turnIndex: nextTurn(state),
		phase: allPairsCleared(state.cards) ? 'result' : 'play',
	}
}
