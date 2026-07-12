import AsyncStorage from '@react-native-async-storage/async-storage'
import { getPairsByPack, wordPairsStore } from '../word-pairs-store'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

const sample = [
	{ id: 'a', pack: 'food', word_a: 'ラーメン', word_b: 'うどん' },
	{ id: 'b', pack: 'food', word_a: '寿司', word_b: '刺身' },
	{ id: 'c', pack: 'place', word_a: '海', word_b: 'プール' },
]

function mockFetchOk(data: unknown) {
	globalThis.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: async () => data,
	}) as unknown as typeof fetch
}

function mockFetchFail() {
	globalThis.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
}

beforeEach(async () => {
	await AsyncStorage.clear()
	wordPairsStore._resetForTest()
})

describe('wordPairsStore', () => {
	it('refresh 成功でメモリとキャッシュが更新される', async () => {
		mockFetchOk(sample)
		const ok = await wordPairsStore.refresh()
		expect(ok).toBe(true)
		expect(wordPairsStore.getState().pairs).toHaveLength(3)
		expect(await AsyncStorage.getItem('waipa.word_pairs.v1')).toContain('ラーメン')
	})

	it('refresh は anon キー付きで正しい URL を叩く', async () => {
		mockFetchOk([])
		await wordPairsStore.refresh()
		const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0]
		expect(url).toContain('/rest/v1/word_pairs')
		expect(url).toContain('is_premium=eq.false')
		expect((init.headers as Record<string, string>).apikey).toBeTruthy()
	})

	it('refresh 失敗時は false を返しキャッシュを温存する', async () => {
		mockFetchOk(sample)
		await wordPairsStore.refresh()
		mockFetchFail()
		const ok = await wordPairsStore.refresh()
		expect(ok).toBe(false)
		expect(wordPairsStore.getState().pairs).toHaveLength(3)
	})

	it('hydrate がキャッシュから復元する', async () => {
		await AsyncStorage.setItem(
			'waipa.word_pairs.v1',
			JSON.stringify({ fetchedAt: 123, pairs: sample }),
		)
		await wordPairsStore.hydrate()
		expect(wordPairsStore.getState().pairs).toHaveLength(3)
		expect(wordPairsStore.getState().fetchedAt).toBe(123)
	})

	it('getPairsByPack がパックで絞り込む', async () => {
		mockFetchOk(sample)
		await wordPairsStore.refresh()
		expect(getPairsByPack('food')).toHaveLength(2)
		expect(getPairsByPack('none')).toHaveLength(0)
	})
})
