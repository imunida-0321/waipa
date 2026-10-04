import { createPersistedStore, useStore } from './create-store'

const STORAGE_KEY = 'waipa.settings'

export type SettingsState = {
	soundEnabled: boolean
	hapticsEnabled: boolean
}

const DEFAULTS: SettingsState = { soundEnabled: true, hapticsEnabled: true }

const store = createPersistedStore<SettingsState>({
	key: STORAGE_KEY,
	initial: () => ({ ...DEFAULTS }),
	parse: (raw) => ({ ...DEFAULTS, ...(raw as Partial<SettingsState>) }),
})

export const settingsStore = {
	getState: store.getState,
	subscribe: store.subscribe,
	hydrate: store.hydrate,
	async setSoundEnabled(v: boolean) {
		store.setState((state) => ({ ...state, soundEnabled: v }))
		await store.persist()
	},
	async setHapticsEnabled(v: boolean) {
		store.setState((state) => ({ ...state, hapticsEnabled: v }))
		await store.persist()
	},
}

export function useSettings(): SettingsState {
	return useStore(settingsStore)
}
