import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

const CACHE_KEY = 'waipa.topics.v1'

function getSupabaseUrl() {
	return process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
}

function getAnonKey() {
	return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''
}

export type Topic = {
	id: string
	pack: string
	text: string
}

type TopicsState = {
	topics: Topic[]
	fetchedAt: number | null
}

let state: TopicsState = { topics: [], fetchedAt: null }
const listeners = new Set<() => void>()

function emit() {
	listeners.forEach((fn) => fn())
}

export const topicsStore = {
	getState(): TopicsState {
		return state
	},
	subscribe(fn: () => void): () => void {
		listeners.add(fn)
		return () => listeners.delete(fn)
	},
	// キャッシュ→メモリ復元（起動直後・オフライン時の土台）
	async hydrate() {
		try {
			const raw = await AsyncStorage.getItem(CACHE_KEY)
			if (raw) {
				const cached = JSON.parse(raw) as TopicsState
				state = { topics: cached.topics ?? [], fetchedAt: cached.fetchedAt ?? null }
				emit()
			}
		} catch {
			// 壊れたキャッシュは無視（次の refresh で上書きされる）
		}
	},
	// ネットワーク取得。失敗しても throw せず false（キャッシュ温存）
	async refresh(): Promise<boolean> {
		try {
			const anonKey = getAnonKey()
			const supabaseUrl = getSupabaseUrl()
			const res = await fetch(
				`${supabaseUrl}/rest/v1/topics?select=id,pack,text&is_premium=eq.false&limit=1000`,
				{
					headers: {
						apikey: anonKey,
						Authorization: `Bearer ${anonKey}`,
					},
				},
			)
			if (!res.ok) return false
			const topics = (await res.json()) as Topic[]
			state = { topics, fetchedAt: Date.now() }
			emit()
			await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(state))
			return true
		} catch {
			return false
		}
	},
	// テスト用: モジュール状態を初期化
	_resetForTest() {
		state = { topics: [], fetchedAt: null }
	},
}

export function useTopics(): TopicsState {
	return useSyncExternalStore(topicsStore.subscribe, topicsStore.getState, topicsStore.getState)
}

export function getTopicsByPack(pack: string): Topic[] {
	return state.topics.filter((t) => t.pack === pack)
}

// ゲームから使うランダムピッカー。使用済み ID を除外して重複出題を防ぐ
export function pickTopic(pack: string, excludeIds: string[] = []): Topic | undefined {
	const pool = getTopicsByPack(pack).filter((t) => !excludeIds.includes(t.id))
	if (pool.length === 0) return undefined
	return pool[Math.floor(Math.random() * pool.length)]
}
