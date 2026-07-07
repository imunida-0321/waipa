import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'waipa.players'
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12

export type PlayersState = {
	count: number
	names: string[]
	history: string[][]
}

const DEFAULTS: PlayersState = { count: 4, names: [], history: [] }

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
	async addPlayer() {
		if (state.count >= MAX_PLAYERS) return
		state = { ...state, count: state.count + 1 }
		emit()
		await persist()
	},
	async removePlayer(index: number) {
		if (state.count <= MIN_PLAYERS) return
		const names = state.names.slice(0, state.count)
		names.splice(index, 1)
		state = { ...state, count: state.count - 1, names }
		emit()
		await persist()
	},
	async saveToHistory() {
		const set = Array.from({ length: state.count }, (_, i) => state.names[i] ?? '')
		if (!set.some((n) => n.trim())) return
		const history = [
			set,
			...state.history.filter((h) => JSON.stringify(h) !== JSON.stringify(set)),
		].slice(0, 5)
		state = { ...state, history }
		emit()
		await persist()
	},
	async applyHistory(index: number) {
		const set = state.history[index]
		if (!set) return
		state = {
			...state,
			count: Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, set.length)),
			names: [...set],
		}
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

// count 人ぶんの名前が全員入力済み（空白のみは未入力扱い）か判定する
export function allNamesFilled(s: PlayersState): boolean {
	return Array.from({ length: s.count }, (_, i) => s.names[i]?.trim()).every(Boolean)
}
