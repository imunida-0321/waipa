import { createDeck, isMatch, type BoardSize, type Card, type Rng } from './engine'

export type Phase = 'size' | 'play' | 'matchAnim' | 'punish' | 'result'

export type Punish = {
	kind: 'pair' | 'joker'
	punishmentId: string
	text: string
	playerIndex: number
}

export type GameState = {
	phase: Phase
	size: BoardSize
	cards: Card[]
	playerCount: number
	turnIndex: number
	flippedIds: string[] // 今ターンめくったカード（0..2枚）
	scores: number[] // player index → 獲得ペア数
	punish: Punish | null
}

export type Action =
	| { type: 'start'; size: BoardSize; rng: Rng }
	| { type: 'flip'; cardId: string }
	| { type: 'hideMismatch' }
	| { type: 'matchAnimDone' }
	| { type: 'punishDone' }
	| { type: 'retry'; rng: Rng }

export function initialState(playerCount: number): GameState {
	return {
		phase: 'size',
		size: 'small',
		cards: [],
		playerCount,
		turnIndex: 0,
		flippedIds: [],
		scores: Array(playerCount).fill(0),
		punish: null,
	}
}

// 不成立の2枚を見せている最中か（コンポーネントが約1.5秒タイマーで hideMismatch を送る）
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

// 未消化のペアカードが残っていないか（枚数固定に依存しないのでテストで小盤面に差し替え可能）
function allPairsCleared(cards: Card[]): boolean {
	return cards.every((c) => c.pairId === null || c.state === 'removed')
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'start':
			return {
				...initialState(state.playerCount),
				phase: 'play',
				size: action.size,
				cards: createDeck(action.size, action.rng),
			}
		case 'flip':
			return flip(state, action.cardId)
		case 'hideMismatch':
			return hideMismatch(state)
		case 'matchAnimDone':
			return state.phase === 'matchAnim' ? { ...state, phase: 'punish' } : state
		case 'punishDone':
			return punishDone(state)
		case 'retry':
			return reduce(initialState(state.playerCount), {
				type: 'start',
				size: state.size,
				rng: action.rng,
			})
	}
}

function flip(state: GameState, cardId: string): GameState {
	if (state.phase !== 'play' || state.flippedIds.length >= 2) return state
	const card = state.cards.find((c) => c.id === cardId)
	if (!card || card.state !== 'hidden') return state

	// ジョーカー: めくった瞬間に特大罰（本人実行）。場から除外し、1枚目があれば裏に戻す
	if (card.rank === 'JOKER') {
		const cards = setCardState(
			setCardState(state.cards, state.flippedIds, 'hidden'),
			[cardId],
			'removed',
		)
		return {
			...state,
			cards,
			flippedIds: [],
			punish: {
				kind: 'joker',
				punishmentId: card.punishmentId,
				text: card.punishment,
				playerIndex: state.turnIndex,
			},
			phase: 'punish',
		}
	}

	const cards = setCardState(state.cards, [cardId], 'revealed')
	const flippedIds = [...state.flippedIds, cardId]
	if (flippedIds.length < 2) return { ...state, cards, flippedIds }

	const [a, b] = flippedIds.map((id) => cards.find((c) => c.id === id) as Card)
	if (!isMatch(a, b)) return { ...state, cards, flippedIds } // 約1.5秒後に hideMismatch が来る

	// 成立: クロスフェード演出（matchAnim）へ。カードは revealed のまま、除外は punishDone で行う
	const scores = [...state.scores]
	scores[state.turnIndex] += 1
	return {
		...state,
		cards,
		flippedIds,
		scores,
		punish: {
			kind: 'pair',
			punishmentId: a.punishmentId,
			text: a.punishment,
			playerIndex: state.turnIndex,
		},
		phase: 'matchAnim',
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

function punishDone(state: GameState): GameState {
	if (state.phase !== 'punish' || !state.punish) return state
	const cards =
		state.punish.kind === 'pair'
			? setCardState(state.cards, state.flippedIds, 'removed')
			: state.cards // ジョーカーは flip 時に除外済み
	return {
		...state,
		cards,
		flippedIds: [],
		punish: null,
		turnIndex: nextTurn(state),
		phase: allPairsCleared(cards) ? 'result' : 'play',
	}
}
