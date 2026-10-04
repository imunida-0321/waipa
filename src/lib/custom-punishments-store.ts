import { createPersistedStore, useStore } from './create-store'

const STORAGE_KEY = 'waipa.inshu-suijaku.custom-punishments'

export const MAX_NORMAL_ITEMS = 20
export const MAX_SPECIAL_ITEMS = 5
export const MAX_TEXT_LENGTH = 40
export const MAX_SETS = 5
export const MAX_SET_NAME_LENGTH = 12

export type CustomPunishment = { id: string; text: string; type: 'normal' | 'special' }
export type CustomSet = { id: string; name: string; items: CustomPunishment[] }
export type CustomPunishmentsState = {
	enabled: boolean
	activeSetId: string
	sets: CustomSet[]
	nextId: number
}

const DEFAULT_SET: CustomSet = { id: 'set1', name: 'マイセット', items: [] }

function defaultState(): CustomPunishmentsState {
	return {
		enabled: true,
		activeSetId: DEFAULT_SET.id,
		sets: [{ ...DEFAULT_SET, items: [] }],
		nextId: 2,
	}
}

const store = createPersistedStore<CustomPunishmentsState>({
	key: STORAGE_KEY,
	initial: defaultState,
	parse: (raw) =>
		normalizeState({ ...defaultState(), ...(raw as Partial<CustomPunishmentsState>) }),
})

function normalizeText(text: string, maxLength: number): string {
	return text.trim().slice(0, maxLength)
}

function normalizeState(next: CustomPunishmentsState): CustomPunishmentsState {
	const sets = next.sets.length > 0 ? next.sets : defaultState().sets
	const activeSetId = sets.some((set) => set.id === next.activeSetId)
		? next.activeSetId
		: sets[0].id
	return { ...next, sets, activeSetId }
}

function updateActiveSet(
	state: CustomPunishmentsState,
	fn: (set: CustomSet) => CustomSet,
): CustomPunishmentsState {
	const active = getActiveSet(state)
	return {
		...state,
		activeSetId: active.id,
		sets: state.sets.map((set) => (set.id === active.id ? fn(set) : set)),
	}
}

export const customPunishmentsStore = {
	getState: store.getState,
	subscribe: store.subscribe,
	hydrate: store.hydrate,
	async setEnabled(on: boolean) {
		store.setState((state) => ({ ...state, enabled: on }))
		await store.persist()
	},
	async selectSet(setId: string) {
		const state = store.getState()
		if (!state.sets.some((set) => set.id === setId)) return
		store.setState({ ...state, activeSetId: setId })
		await store.persist()
	},
	async addSet(name: string) {
		const state = store.getState()
		if (state.sets.length >= MAX_SETS) return
		const id = `set${state.nextId}`
		const trimmed = normalizeText(name, MAX_SET_NAME_LENGTH)
		const set: CustomSet = {
			id,
			name: trimmed || `セット${state.sets.length + 1}`,
			items: [],
		}
		store.setState({
			...state,
			activeSetId: id,
			sets: [...state.sets, set],
			nextId: state.nextId + 1,
		})
		await store.persist()
	},
	async removeSet(setId: string) {
		const state = store.getState()
		if (state.sets.length <= 1) return
		const sets = state.sets.filter((set) => set.id !== setId)
		if (sets.length === state.sets.length) return
		store.setState({
			...state,
			sets,
			activeSetId: state.activeSetId === setId ? sets[0].id : state.activeSetId,
		})
		await store.persist()
	},
	async addItem(type: CustomPunishment['type'], text: string) {
		const state = store.getState()
		const trimmed = normalizeText(text, MAX_TEXT_LENGTH)
		if (!trimmed) return
		const active = getActiveSet(state)
		const max = type === 'normal' ? MAX_NORMAL_ITEMS : MAX_SPECIAL_ITEMS
		if (countByType(active, type) >= max) return
		const item: CustomPunishment = { id: `c${state.nextId}`, text: trimmed, type }
		store.setState({
			...updateActiveSet(state, (set) => ({ ...set, items: [...set.items, item] })),
			nextId: state.nextId + 1,
		})
		await store.persist()
	},
	async updateItem(itemId: string, text: string) {
		const trimmed = normalizeText(text, MAX_TEXT_LENGTH)
		if (!trimmed) return
		store.setState((state) =>
			updateActiveSet(state, (set) => ({
				...set,
				items: set.items.map((item) =>
					item.id === itemId ? { ...item, text: trimmed } : item,
				),
			})),
		)
		await store.persist()
	},
	async removeItem(itemId: string) {
		store.setState((state) =>
			updateActiveSet(state, (set) => ({
				...set,
				items: set.items.filter((item) => item.id !== itemId),
			})),
		)
		await store.persist()
	},
}

export function useCustomPunishments(): CustomPunishmentsState {
	return useStore(customPunishmentsStore)
}

export function getActiveSet(s: CustomPunishmentsState): CustomSet {
	return s.sets.find((set) => set.id === s.activeSetId) ?? s.sets[0] ?? DEFAULT_SET
}

export function getActivePool(s: CustomPunishmentsState): {
	normals: CustomPunishment[]
	specials: CustomPunishment[]
} {
	if (!s.enabled) return { normals: [], specials: [] }
	const active = getActiveSet(s)
	return {
		normals: active.items.filter((item) => item.type === 'normal'),
		specials: active.items.filter((item) => item.type === 'special'),
	}
}

export function countByType(set: CustomSet, type: CustomPunishment['type']): number {
	return set.items.filter((item) => item.type === type).length
}
