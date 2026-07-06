import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'waipa.settings'

export type SettingsState = {
	soundEnabled: boolean
	hapticsEnabled: boolean
}

const DEFAULTS: SettingsState = { soundEnabled: true, hapticsEnabled: true }

let state: SettingsState = { ...DEFAULTS }
const listeners = new Set<() => void>()

function emit() {
	listeners.forEach((fn) => fn())
}

async function persist() {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const settingsStore = {
	getState(): SettingsState {
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
	async setSoundEnabled(v: boolean) {
		state = { ...state, soundEnabled: v }
		emit()
		await persist()
	},
	async setHapticsEnabled(v: boolean) {
		state = { ...state, hapticsEnabled: v }
		emit()
		await persist()
	},
}

export function useSettings(): SettingsState {
	return useSyncExternalStore(
		settingsStore.subscribe,
		settingsStore.getState,
		settingsStore.getState,
	)
}
