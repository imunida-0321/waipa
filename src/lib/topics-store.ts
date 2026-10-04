import AsyncStorage from '@react-native-async-storage/async-storage'
import { createStore, useStore } from './create-store'
import { fetchRows } from './supabase-rest'

const CACHE_KEY = 'waipa.topics.v1'

export type Topic = {
	id: string
	pack: string
	text: string
}

type TopicsState = {
	topics: Topic[]
	fetchedAt: number | null
}

const store = createStore<TopicsState>({ topics: [], fetchedAt: null })

function isTopic(value: unknown): value is Topic {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof value.id === 'string' &&
		'pack' in value &&
		typeof value.pack === 'string' &&
		'text' in value &&
		typeof value.text === 'string'
	)
}

export const topicsStore = {
	getState: store.getState,
	subscribe: store.subscribe,
	// キャッシュ→メモリ復元（起動直後・オフライン時の土台）
	async hydrate() {
		try {
			const raw = await AsyncStorage.getItem(CACHE_KEY)
			if (raw) {
				const cached = JSON.parse(raw) as TopicsState
				store.setState({ topics: cached.topics ?? [], fetchedAt: cached.fetchedAt ?? null })
			}
		} catch {
			// 壊れたキャッシュは無視（次の refresh で上書きされる）
		}
	},
	// ネットワーク取得。失敗しても throw せず false（キャッシュ温存）
	async refresh(): Promise<boolean> {
		try {
			const topics = await fetchRows(
				'topics',
				{ select: 'id,pack,text', is_premium: 'eq.false', limit: '1000' },
				isTopic,
			)
			if (topics === null) return false
			store.setState({ topics, fetchedAt: Date.now() })
			await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(store.getState()))
			return true
		} catch {
			return false
		}
	},
	// プレミアムお題パックの取得（リワード解放時・プレミアム時に呼ぶ）。
	// 通常の refresh は is_premium=false のみなので、ここで対象パックだけ追加取得してマージする
	async refreshPremiumPack(pack: string): Promise<boolean> {
		try {
			const fetched = await fetchRows(
				'topics',
				{ select: 'id,pack,text', pack: `eq.${pack}`, limit: '1000' },
				isTopic,
			)
			if (fetched === null || fetched.length === 0) return false
			const state = store.getState()
			const known = new Set(state.topics.map((t) => t.id))
			store.setState({
				...state,
				topics: [...state.topics, ...fetched.filter((t) => !known.has(t.id))],
			})
			await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(store.getState()))
			return true
		} catch {
			return false
		}
	},
	// テスト用: モジュール状態を初期化
	_resetForTest() {
		store.setState({ topics: [], fetchedAt: null })
	},
}

export function useTopics(): TopicsState {
	return useStore(topicsStore)
}

export function getTopicsByPack(pack: string): Topic[] {
	return store.getState().topics.filter((t) => t.pack === pack)
}

// ゲームから使うランダムピッカー。使用済み ID を除外して重複出題を防ぐ
export function pickTopic(pack: string, excludeIds: string[] = []): Topic | undefined {
	const pool = getTopicsByPack(pack).filter((t) => !excludeIds.includes(t.id))
	if (pool.length === 0) return undefined
	return pool[Math.floor(Math.random() * pool.length)]
}
