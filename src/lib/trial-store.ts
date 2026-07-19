import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { TRIAL_ROUNDS } from '@/constants/trial'
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

let state: TrialState = {
	usedGameIds: new Set(),
	active: null,
}
const listeners = new Set<() => void>()

function emit() {
	listeners.forEach((fn) => fn())
}

async function persistUsed() {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...state.usedGameIds]))
}

function parseUsedGameIds(raw: string | null): ReadonlySet<string> {
	if (raw === null) return new Set()
	const parsed: unknown = JSON.parse(raw)
	if (!Array.isArray(parsed)) return new Set()
	return new Set(parsed.filter((value): value is string => typeof value === 'string'))
}

export const trialStore = {
	getState(): TrialState {
		return state
	},
	subscribe(fn: () => void): () => void {
		listeners.add(fn)
		return () => listeners.delete(fn)
	},
	async hydrate() {
		try {
			state = {
				usedGameIds: parseUsedGameIds(await AsyncStorage.getItem(STORAGE_KEY)),
				active: null,
			}
		} catch {
			// 破損データは未使用扱いに戻す。次回 startTrial の永続化で正常な配列に戻る
			state = { usedGameIds: new Set(), active: null }
		}
		emit()
	},
	async startTrial(gameId: string) {
		state = {
			usedGameIds: new Set(state.usedGameIds).add(gameId),
			active: { gameId, consumedRounds: 0 },
		}
		emit()
		await persistUsed()
	},
	consumeRound(gameId: string) {
		if (state.active?.gameId !== gameId) return
		state = {
			...state,
			active: {
				gameId,
				consumedRounds: state.active.consumedRounds + 1,
			},
		}
		emit()
	},
	endTrial() {
		if (state.active === null) return
		state = { ...state, active: null }
		emit()
	},
	_resetForTest() {
		state = { usedGameIds: new Set(), active: null }
		emit()
	},
}

export function isTrialUsed(gameId: string): boolean {
	return state.usedGameIds.has(gameId)
}

export function canOfferTrial(gameId: string): boolean {
	return !isPremiumUnlocked() && !isTrialUsed(gameId)
}

export function isTrialActive(gameId: string): boolean {
	return state.active?.gameId === gameId
}

export function isTrialExhausted(gameId: string): boolean {
	return state.active?.gameId === gameId && state.active.consumedRounds >= TRIAL_ROUNDS
}

function useTrialState(): TrialState {
	return useSyncExternalStore(trialStore.subscribe, trialStore.getState, trialStore.getState)
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
