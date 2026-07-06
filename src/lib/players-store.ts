import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'waipa.players'
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12

export type PlayersState = {
	count: number
	names: string[]
}

const DEFAULTS: PlayersState = { count: 4, names: [] }

let state: PlayersState = { ...DEFAULTS }
const listeners = new Set<() => void>()

function emit() {
	listeners.forEach((fn) => fn())
}

async function persist() {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const playersStore = {
	getState(): PlayersState {
		return state
	},
	subscribe(fn: () => void): () => void {
		listeners.add(fn)
		return () => listeners.delete(fn)
	},
	async hydrate() {
		const raw = await AsyncStorage.getItem(STORAGE_KEY)
		state = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
		emit()
	},
	async setCount(n: number) {
		const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.floor(n)))
		state = { ...state, count }
		emit()
		await persist()
	},
	async setName(index: number, name: string) {
		const names = [...state.names]
		names[index] = name
		state = { ...state, names }
		emit()
		await persist()
	},
}

export function usePlayers(): PlayersState {
	return useSyncExternalStore(
		playersStore.subscribe,
		playersStore.getState,
		playersStore.getState,
	)
}

// 未入力の参加者は「N番」表記にフォールバック
export function getDisplayNames(s: PlayersState): string[] {
	return Array.from({ length: s.count }, (_, i) => {
		const name = s.names[i]?.trim()
		return name ? name : `${i + 1}番`
	})
}
