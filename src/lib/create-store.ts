import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

type Store<T> = {
	getState: () => T
	setState: (next: T | ((prev: T) => T)) => void
	subscribe: (listener: () => void) => () => void
}

export function createStore<T>(initial: T): Store<T> {
	let state = initial
	const listeners = new Set<() => void>()

	return {
		getState: () => state,
		setState(next) {
			state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next
			listeners.forEach((listener) => listener())
		},
		subscribe(listener) {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
	}
}

export function useStore<T>(store: Pick<Store<T>, 'subscribe' | 'getState'>): T {
	return useSyncExternalStore(store.subscribe, store.getState, store.getState)
}

export function createPersistedStore<T>({
	key,
	initial,
	parse,
	serialize,
}: {
	key: string
	initial: () => T
	parse: (raw: unknown) => T
	serialize?: (state: T) => unknown
}) {
	const store = createStore(initial())

	return {
		...store,
		async hydrate() {
			let next: T
			try {
				const raw = await AsyncStorage.getItem(key)
				next = raw ? parse(JSON.parse(raw)) : initial()
			} catch {
				next = initial()
			}
			store.setState(next)
		},
		async persist() {
			try {
				const state = store.getState()
				await AsyncStorage.setItem(
					key,
					JSON.stringify(serialize ? serialize(state) : state),
				)
			} catch {
				// 保存に失敗しても、楽観更新したメモリの状態は維持する
			}
		},
	}
}
