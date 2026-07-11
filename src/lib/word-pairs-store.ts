import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

const CACHE_KEY = 'waipa.word_pairs.v1'

function getSupabaseUrl() {
	return process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
}

function getAnonKey() {
	return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''
}

export type WordPairRow = {
	id: string
	pack: string
	word_a: string
	word_b: string
}

type WordPairsState = {
	pairs: WordPairRow[]
	fetchedAt: number | null
}

let state: WordPairsState = { pairs: [], fetchedAt: null }
const listeners = new Set<() => void>()

function emit() {
	listeners.forEach((fn) => fn())
}

export const wordPairsStore = {
	getState(): WordPairsState {
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
				const cached = JSON.parse(raw) as WordPairsState
				state = { pairs: cached.pairs ?? [], fetchedAt: cached.fetchedAt ?? null }
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
				`${supabaseUrl}/rest/v1/word_pairs?select=id,pack,word_a,word_b&is_premium=eq.false&limit=1000`,
				{
					headers: {
						apikey: anonKey,
						Authorization: `Bearer ${anonKey}`,
					},
				},
			)
			if (!res.ok) return false
			const pairs = (await res.json()) as WordPairRow[]
			state = { pairs, fetchedAt: Date.now() }
			emit()
			await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(state))
			return true
		} catch {
			return false
		}
	},
	// テスト用: モジュール状態を初期化
	_resetForTest() {
		state = { pairs: [], fetchedAt: null }
	},
}

export function useWordPairs(): WordPairsState {
	return useSyncExternalStore(
		wordPairsStore.subscribe,
		wordPairsStore.getState,
		wordPairsStore.getState,
	)
}

export function getPairsByPack(pack: string): WordPairRow[] {
	return state.pairs.filter((p) => p.pack === pack)
}
