import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

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

let state: CustomPunishmentsState = defaultState()
const listeners = new Set<() => void>()

function emit() {
	listeners.forEach((fn) => fn())
}

async function persist() {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

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

function updateActiveSet(fn: (set: CustomSet) => CustomSet): CustomPunishmentsState {
	const active = getActiveSet(state)
	return {
		...state,
		activeSetId: active.id,
		sets: state.sets.map((set) => (set.id === active.id ? fn(set) : set)),
	}
}

export const customPunishmentsStore = {
	getState(): CustomPunishmentsState {
		return state
	},
	subscribe(fn: () => void): () => void {
		listeners.add(fn)
		return () => listeners.delete(fn)
	},
	async hydrate() {
		try {
			const raw = await AsyncStorage.getItem(STORAGE_KEY)
			state = raw ? normalizeState({ ...defaultState(), ...JSON.parse(raw) }) : defaultState()
		} catch {
			// 読み取り失敗・破損データはメモリ上だけデフォルトへ戻す
			state = defaultState()
		}
		emit()
	},
	async setEnabled(on: boolean) {
		state = { ...state, enabled: on }
		emit()
		await persist()
	},
	async selectSet(setId: string) {
		if (!state.sets.some((set) => set.id === setId)) return
		state = { ...state, activeSetId: setId }
		emit()
		await persist()
	},
	async addSet(name: string) {
		if (state.sets.length >= MAX_SETS) return
		const id = `set${state.nextId}`
		const trimmed = normalizeText(name, MAX_SET_NAME_LENGTH)
		const set: CustomSet = {
			id,
			name: trimmed || `セット${state.sets.length + 1}`,
			items: [],
		}
		state = {
			...state,
			activeSetId: id,
			sets: [...state.sets, set],
			nextId: state.nextId + 1,
		}
		emit()
		await persist()
	},
	async removeSet(setId: string) {
		if (state.sets.length <= 1) return
		const sets = state.sets.filter((set) => set.id !== setId)
		if (sets.length === state.sets.length) return
		state = {
			...state,
			sets,
			activeSetId: state.activeSetId === setId ? sets[0].id : state.activeSetId,
		}
		emit()
		await persist()
	},
	async addItem(type: CustomPunishment['type'], text: string) {
		const trimmed = normalizeText(text, MAX_TEXT_LENGTH)
		if (!trimmed) return
		const active = getActiveSet(state)
		const max = type === 'normal' ? MAX_NORMAL_ITEMS : MAX_SPECIAL_ITEMS
		if (countByType(active, type) >= max) return
		const item: CustomPunishment = { id: `c${state.nextId}`, text: trimmed, type }
		state = updateActiveSet((set) => ({ ...set, items: [...set.items, item] }))
		state = { ...state, nextId: state.nextId + 1 }
		emit()
		await persist()
	},
	async updateItem(itemId: string, text: string) {
		const trimmed = normalizeText(text, MAX_TEXT_LENGTH)
		if (!trimmed) return
		state = updateActiveSet((set) => ({
			...set,
			items: set.items.map((item) =>
				item.id === itemId ? { ...item, text: trimmed } : item,
			),
		}))
		emit()
		await persist()
	},
	async removeItem(itemId: string) {
		state = updateActiveSet((set) => ({
			...set,
			items: set.items.filter((item) => item.id !== itemId),
		}))
		emit()
		await persist()
	},
}

export function useCustomPunishments(): CustomPunishmentsState {
	return useSyncExternalStore(
		customPunishmentsStore.subscribe,
		customPunishmentsStore.getState,
		customPunishmentsStore.getState,
	)
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
