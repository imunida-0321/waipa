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

// setter は emit（UI更新）を先に、persist（永続化）を後に行う楽観更新。保存失敗してもUIは進む
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
		try {
			const raw = await AsyncStorage.getItem(STORAGE_KEY)
			state = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
		} catch {
			// 読み取り失敗・破損データはメモリ上だけデフォルトへ（次回の persist で正常値に上書きされる）
			state = { ...DEFAULTS }
		}
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
