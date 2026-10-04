import { createPersistedStore, useStore } from './create-store'

const STORAGE_KEY = 'waipa.players'
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12

export type PlayersState = {
	count: number
	names: string[]
	history: string[][]
}

const DEFAULTS: PlayersState = { count: 4, names: [], history: [] }

const store = createPersistedStore<PlayersState>({
	key: STORAGE_KEY,
	initial: () => ({ ...DEFAULTS }),
	parse: (raw) => ({ ...DEFAULTS, ...(raw as Partial<PlayersState>) }),
})

export const playersStore = {
	getState: store.getState,
	subscribe: store.subscribe,
	hydrate: store.hydrate,
	async setCount(n: number) {
		const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.floor(n)))
		store.setState((state) => ({ ...state, count }))
		await store.persist()
	},
	async setName(index: number, name: string) {
		const state = store.getState()
		const names = [...state.names]
		names[index] = name
		store.setState({ ...state, names })
		await store.persist()
	},
	async addPlayer() {
		const state = store.getState()
		if (state.count >= MAX_PLAYERS) return
		store.setState({ ...state, count: state.count + 1 })
		await store.persist()
	},
	async removePlayer(index: number) {
		const state = store.getState()
		if (state.count <= MIN_PLAYERS) return
		const names = state.names.slice(0, state.count)
		names.splice(index, 1)
		store.setState({ ...state, count: state.count - 1, names })
		await store.persist()
	},
	async saveToHistory() {
		const state = store.getState()
		const set = Array.from({ length: state.count }, (_, i) => state.names[i] ?? '')
		if (!set.some((n) => n.trim())) return
		const history = [
			set,
			...state.history.filter((h) => JSON.stringify(h) !== JSON.stringify(set)),
		].slice(0, 5)
		store.setState({ ...state, history })
		await store.persist()
	},
	async applyHistory(index: number) {
		const state = store.getState()
		const set = state.history[index]
		if (!set) return
		store.setState({
			...state,
			count: Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, set.length)),
			names: [...set],
		})
		await store.persist()
	},
}

export function usePlayers(): PlayersState {
	return useStore(playersStore)
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
