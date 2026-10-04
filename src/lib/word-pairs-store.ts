import AsyncStorage from '@react-native-async-storage/async-storage'
import { createStore, useStore } from './create-store'
import { fetchRows } from './supabase-rest'

const CACHE_KEY = 'waipa.word_pairs.v1'

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

const store = createStore<WordPairsState>({ pairs: [], fetchedAt: null })

function isWordPairRow(value: unknown): value is WordPairRow {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof value.id === 'string' &&
		'pack' in value &&
		typeof value.pack === 'string' &&
		'word_a' in value &&
		typeof value.word_a === 'string' &&
		'word_b' in value &&
		typeof value.word_b === 'string'
	)
}

export const wordPairsStore = {
	getState: store.getState,
	subscribe: store.subscribe,
	// キャッシュ→メモリ復元（起動直後・オフライン時の土台）
	async hydrate() {
		try {
			const raw = await AsyncStorage.getItem(CACHE_KEY)
			if (raw) {
				const cached = JSON.parse(raw) as WordPairsState
				store.setState({ pairs: cached.pairs ?? [], fetchedAt: cached.fetchedAt ?? null })
			}
		} catch {
			// 壊れたキャッシュは無視（次の refresh で上書きされる）
		}
	},
	// ネットワーク取得。失敗しても throw せず false（キャッシュ温存）
	async refresh(): Promise<boolean> {
		try {
			const pairs = await fetchRows(
				'word_pairs',
				{ select: 'id,pack,word_a,word_b', is_premium: 'eq.false', limit: '1000' },
				isWordPairRow,
			)
			if (pairs === null) return false
			store.setState({ pairs, fetchedAt: Date.now() })
			await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(store.getState()))
			return true
		} catch {
			return false
		}
	},
	// テスト用: モジュール状態を初期化
	_resetForTest() {
		store.setState({ pairs: [], fetchedAt: null })
	},
}

export function useWordPairs(): WordPairsState {
	return useStore(wordPairsStore)
}

export function getPairsByPack(pack: string): WordPairRow[] {
	return store.getState().pairs.filter((p) => p.pack === pack)
}
