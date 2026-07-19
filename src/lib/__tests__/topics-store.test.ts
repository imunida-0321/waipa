import AsyncStorage from '@react-native-async-storage/async-storage'
import { getTopicsByPack, pickTopic, topicsStore } from '../topics-store'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

// テスト環境用の環境変数設定
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

const sample = [
	{ id: 'a', pack: 'king', text: 'お題A' },
	{ id: 'b', pack: 'king', text: 'お題B' },
	{ id: 'c', pack: 'talk', text: 'お題C' },
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
	topicsStore._resetForTest()
})

describe('topicsStore', () => {
	it('refresh 成功でメモリとキャッシュが更新される', async () => {
		mockFetchOk(sample)
		const ok = await topicsStore.refresh()
		expect(ok).toBe(true)
		expect(topicsStore.getState().topics).toHaveLength(3)
		expect(await AsyncStorage.getItem('waipa.topics.v1')).toContain('お題A')
	})

	it('refresh は anon キー付きで正しい URL を叩く', async () => {
		mockFetchOk([])
		await topicsStore.refresh()
		const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0]
		expect(url).toContain('/rest/v1/topics')
		expect(url).toContain('is_premium=eq.false')
		expect((init.headers as Record<string, string>).apikey).toBeTruthy()
	})

	it('refresh 失敗時は false を返しキャッシュを温存する', async () => {
		mockFetchOk(sample)
		await topicsStore.refresh()
		mockFetchFail()
		const ok = await topicsStore.refresh()
		expect(ok).toBe(false)
		expect(topicsStore.getState().topics).toHaveLength(3)
	})

	it('hydrate がキャッシュから復元する', async () => {
		await AsyncStorage.setItem(
			'waipa.topics.v1',
			JSON.stringify({ fetchedAt: 123, topics: sample }),
		)
		await topicsStore.hydrate()
		expect(topicsStore.getState().topics).toHaveLength(3)
		expect(topicsStore.getState().fetchedAt).toBe(123)
	})

	it('getTopicsByPack がパックで絞り込む', async () => {
		mockFetchOk(sample)
		await topicsStore.refresh()
		expect(getTopicsByPack('king')).toHaveLength(2)
		expect(getTopicsByPack('none')).toHaveLength(0)
	})

	it('pickTopic は excludeIds を除いてランダムに1件返す', async () => {
		mockFetchOk(sample)
		await topicsStore.refresh()
		const picked = pickTopic('king', ['a'])
		expect(picked?.id).toBe('b')
		expect(pickTopic('king', ['a', 'b'])).toBeUndefined()
	})
})

describe('refreshPremiumPack', () => {
	it('取得したお題を重複なくマージする', async () => {
		mockFetchOk(sample)
		await topicsStore.refresh()
		mockFetchOk([
			{ id: 'a', pack: 'king', text: 'お題A' },
			{ id: 'p1', pack: 'king_premium', text: '壁ドン' },
		])
		const ok = await topicsStore.refreshPremiumPack('king_premium')
		expect(ok).toBe(true)
		const packs = topicsStore.getState().topics.map((t) => t.id)
		expect(packs.filter((id) => id === 'a')).toHaveLength(1)
		expect(packs).toContain('p1')
	})

	it('取得失敗時は false を返し state を壊さない', async () => {
		mockFetchFail()
		const before = topicsStore.getState()
		const ok = await topicsStore.refreshPremiumPack('king_premium')
		expect(ok).toBe(false)
		expect(topicsStore.getState()).toEqual(before)
	})
})
