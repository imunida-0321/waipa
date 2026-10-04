import { useEffect, useMemo, useRef } from 'react'
import { TRIAL_ROUNDS } from '@/constants/trial'
import { createPersistedStore, useStore } from './create-store'
import { isPremiumUnlocked } from './premium'

const STORAGE_KEY = 'waipa.trials.used'

type ActiveTrial = {
	gameId: string
	consumedRounds: number
}

type TrialState = {
	usedGameIds: ReadonlySet<string>
	active: ActiveTrial | null
}

const store = createPersistedStore<TrialState>({
	key: STORAGE_KEY,
	initial: () => ({ usedGameIds: new Set(), active: null }),
	parse: (raw) => ({ usedGameIds: parseUsedGameIds(raw), active: null }),
	serialize: (state) => [...state.usedGameIds],
})

function parseUsedGameIds(raw: unknown): ReadonlySet<string> {
	if (!Array.isArray(raw)) return new Set()
	return new Set(raw.filter((value): value is string => typeof value === 'string'))
}

export const trialStore = {
	getState: store.getState,
	subscribe: store.subscribe,
	hydrate: store.hydrate,
	async startTrial(gameId: string) {
		store.setState((state) => ({
			usedGameIds: new Set(state.usedGameIds).add(gameId),
			active: { gameId, consumedRounds: 0 },
		}))
		await store.persist()
	},
	consumeRound(gameId: string) {
		const state = store.getState()
		if (state.active?.gameId !== gameId) return
		store.setState({
			...state,
			active: {
				gameId,
				consumedRounds: state.active.consumedRounds + 1,
			},
		})
	},
	endTrial() {
		const state = store.getState()
		if (state.active === null) return
		store.setState({ ...state, active: null })
	},
	_resetForTest() {
		store.setState({ usedGameIds: new Set(), active: null })
	},
}

export function isTrialUsed(gameId: string): boolean {
	return store.getState().usedGameIds.has(gameId)
}

export function canOfferTrial(gameId: string): boolean {
	return !isPremiumUnlocked() && !isTrialUsed(gameId)
}

export function isTrialActive(gameId: string): boolean {
	return store.getState().active?.gameId === gameId
}

export function isTrialExhausted(gameId: string): boolean {
	const state = store.getState()
	return state.active?.gameId === gameId && state.active.consumedRounds >= TRIAL_ROUNDS
}

function useTrialState(): TrialState {
	return useStore(trialStore)
}

export function useTrialOffer(gameId: string): { canOffer: boolean; used: boolean } {
	const trialState = useTrialState()
	return useMemo(
		() => ({
			canOffer: !isPremiumUnlocked() && trialState.usedGameIds.has(gameId) === false,
			used: trialState.usedGameIds.has(gameId),
		}),
		[gameId, trialState],
	)
}

export function useTrialExhausted(gameId: string): boolean {
	useTrialState()
	return isTrialExhausted(gameId)
}

export function useTrialRoundConsumer(gameId: string, isRoundEnd: boolean): void {
	const wasRoundEnd = useRef(isRoundEnd)

	useEffect(() => {
		if (!wasRoundEnd.current && isRoundEnd) {
			trialStore.consumeRound(gameId)
		}
		wasRoundEnd.current = isRoundEnd
	}, [gameId, isRoundEnd])
}
