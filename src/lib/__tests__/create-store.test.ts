import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook } from '@testing-library/react-native'
import { createPersistedStore, createStore, useStore } from '../create-store'

jest.mock('@react-native-async-storage/async-storage', () => ({
	getItem: jest.fn(),
	setItem: jest.fn(),
}))

type CounterState = { count: number }

beforeEach(() => {
	jest.mocked(AsyncStorage.getItem).mockReset().mockResolvedValue(null)
	jest.mocked(AsyncStorage.setItem).mockReset().mockResolvedValue(undefined)
})

describe('createStore', () => {
	it('初期値を返し、値による setState は状態を差し替えて購読者に通知する', () => {
		const initial = { count: 0 }
		const store = createStore(initial)
		const observed: CounterState[] = []
		const listener = jest.fn(() => observed.push(store.getState()))
		store.subscribe(listener)
		expect(store.getState()).toBe(initial)
		expect(listener).not.toHaveBeenCalled()

		const next = { count: 3 }
		store.setState(next)

		expect(store.getState()).toBe(next)
		expect(listener).toHaveBeenCalledTimes(1)
		expect(observed).toEqual([next])
	})

	it('関数による setState は最新の状態から更新し、その都度通知する', () => {
		const store = createStore<CounterState>({ count: 1 })
		const observed: CounterState[] = []
		store.subscribe(() => observed.push(store.getState()))
		const update = jest.fn((prev: CounterState) => ({ count: prev.count + 2 }))

		store.setState(update)
		store.setState(update)

		expect(update).toHaveBeenNthCalledWith(1, { count: 1 })
		expect(update).toHaveBeenNthCalledWith(2, { count: 3 })
		expect(store.getState()).toEqual({ count: 5 })
		expect(observed).toEqual([{ count: 3 }, { count: 5 }])
	})

	it('unsubscribe した購読者への通知を止め、他の購読者には通知する', () => {
		const store = createStore(0)
		const removed = jest.fn()
		const remaining = jest.fn()
		const unsubscribe = store.subscribe(removed)
		store.subscribe(remaining)
		store.setState(1)

		unsubscribe()
		store.setState(2)

		expect(removed).toHaveBeenCalledTimes(1)
		expect(remaining).toHaveBeenCalledTimes(2)
	})
})

describe('createPersistedStore', () => {
	const key = 'test.counter'

	it('hydrate は指定キーの JSON を parse に渡し、正規化後の状態を通知する', async () => {
		const raw = { count: '7' }
		const normalized = { count: 7 }
		const parse = jest.fn((_raw: unknown) => normalized)
		const store = createPersistedStore({ key, initial: () => ({ count: 0 }), parse })
		store.setState({ count: 99 })
		const observed: CounterState[] = []
		store.subscribe(() => observed.push(store.getState()))
		jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(raw))

		await expect(store.hydrate()).resolves.toBeUndefined()

		expect(AsyncStorage.getItem).toHaveBeenCalledWith(key)
		expect(parse).toHaveBeenCalledTimes(1)
		expect(parse).toHaveBeenCalledWith(raw)
		expect(store.getState()).toBe(normalized)
		expect(observed).toEqual([normalized])
	})

	it.each(['getItem 失敗', 'JSON 破損', 'parse 例外'])(
		'hydrate は %s でも resolve し、initial() に戻して通知する',
		async (failure) => {
			const initial = jest.fn(() => ({ count: 0 }))
			const parse = jest.fn((_raw: unknown): CounterState => {
				throw new Error('invalid state')
			})
			const store = createPersistedStore({ key, initial, parse })
			expect(store.getState()).toEqual({ count: 0 })
			store.setState({ count: 99 })
			initial.mockClear()
			const observed: CounterState[] = []
			store.subscribe(() => observed.push(store.getState()))
			if (failure === 'getItem 失敗') {
				jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('read error'))
			} else {
				jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(
					failure === 'JSON 破損' ? '{broken' : JSON.stringify({ count: 'invalid' }),
				)
			}

			await expect(store.hydrate()).resolves.toBeUndefined()

			expect(initial).toHaveBeenCalledTimes(1)
			expect(store.getState()).toEqual({ count: 0 })
			expect(observed).toEqual([{ count: 0 }])
			if (failure === 'parse 例外') {
				expect(parse).toHaveBeenCalledWith({ count: 'invalid' })
			} else {
				expect(parse).not.toHaveBeenCalled()
			}
		},
	)

	it('persist は指定キーに現在の状態を JSON で保存する', async () => {
		const store = createPersistedStore({
			key,
			initial: () => ({ count: 0 }),
			parse: (_raw: unknown) => ({ count: 0 }),
		})
		store.setState({ count: 8 })
		jest.mocked(AsyncStorage.setItem).mockClear()

		await expect(store.persist()).resolves.toBeUndefined()

		expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1)
		expect(AsyncStorage.setItem).toHaveBeenCalledWith(key, JSON.stringify({ count: 8 }))
	})

	it('persist は serialize を現在の状態に適用して Set を配列として保存できる', async () => {
		const serialize = jest.fn((state: Set<string>) => [...state])
		const store = createPersistedStore({
			key,
			initial: () => new Set<string>(),
			parse: (_raw: unknown) => new Set<string>(),
			serialize,
		})
		const next = new Set(['burst-chicken', 'daut-dice'])
		store.setState(next)

		await expect(store.persist()).resolves.toBeUndefined()

		expect(serialize).toHaveBeenCalledWith(next)
		expect(AsyncStorage.setItem).toHaveBeenCalledWith(
			key,
			JSON.stringify(['burst-chicken', 'daut-dice']),
		)
		expect(store.getState()).toBe(next)
	})

	it('setItem が reject しても persist は resolve し、メモリの状態を保持する', async () => {
		const store = createPersistedStore({
			key,
			initial: () => ({ count: 0 }),
			parse: (_raw: unknown) => ({ count: 0 }),
		})
		store.setState({ count: 8 })
		jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('write error'))

		await expect(store.persist()).resolves.toBeUndefined()

		expect(AsyncStorage.setItem).toHaveBeenCalledWith(key, JSON.stringify({ count: 8 }))
		expect(store.getState()).toEqual({ count: 8 })
	})
})

describe('useStore', () => {
	it('初期値を返し、setState による更新を反映する', async () => {
		const store = createStore<CounterState>({ count: 0 })
		const { result } = await renderHook(() => useStore(store))
		expect(result.current).toEqual({ count: 0 })

		await act(async () => {
			store.setState({ count: 1 })
		})
		expect(result.current).toEqual({ count: 1 })

		await act(async () => {
			store.setState((prev: CounterState) => ({ count: prev.count + 1 }))
		})
		expect(result.current).toEqual({ count: 2 })
	})
})
