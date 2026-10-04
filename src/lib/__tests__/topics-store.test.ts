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
		status: 200,
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
	it('refresh は必須フィールドの欠落・型違いの行を捨て、正しい行だけを保存する', async () => {
		mockFetchOk([
			sample[0],
			{ pack: 'king', text: 'id 欠落' },
			{ id: 'missing-pack', text: 'pack 欠落' },
			{ id: 'missing-text', pack: 'king' },
			{ id: 123, pack: 'king', text: 'id 型違い' },
			{ id: 'wrong-pack', pack: 123, text: 'pack 型違い' },
			{ id: 'wrong-text', pack: 'king', text: 123 },
			null,
			sample[1],
		])

		await expect(topicsStore.refresh()).resolves.toBe(true)

		expect(topicsStore.getState().topics).toEqual([sample[0], sample[1]])
	})

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

	describe('pickTopic の rng 注入', () => {
		afterEach(() => {
			jest.restoreAllMocks()
		})

		it.each([
			{ value: 0, expectedId: 'b', position: '先頭' },
			{ value: 0.999, expectedId: 'd', position: '末尾' },
		])(
			'rng が $value を返すと excludeIds 適用後のプールの $position を選ぶ',
			async ({ value, expectedId }) => {
				mockFetchOk([
					...sample,
					{ id: 'd', pack: 'king', text: 'お題D' },
					{ id: 'e', pack: 'king', text: 'お題E' },
				])
				await topicsStore.refresh()
				// 第3引数を無視する実装が偶然パスしないよう、逆の端を選ぶ値に固定する
				jest.spyOn(Math, 'random').mockReturnValue(value === 0 ? 0.999 : 0)

				expect(pickTopic('king', ['a', 'e'], () => value)?.id).toBe(expectedId)
			},
		)
	})
})

describe('refreshPremiumPack', () => {
	it('パック名に含まれる & を URL エンコードする', async () => {
		mockFetchOk([{ id: 'p1', pack: 'a&b', text: 'プレミアムお題' }])

		await topicsStore.refreshPremiumPack('a&b')

		expect(globalThis.fetch).toHaveBeenCalledWith(
			expect.stringContaining('pack=eq.a%26b'),
			expect.objectContaining({
				headers: expect.objectContaining({ apikey: 'test-anon-key' }),
			}),
		)
	})

	it('不正行を捨て、既存のお題に正しい行だけを追加する', async () => {
		mockFetchOk(sample)
		await topicsStore.refresh()
		const premium = { id: 'p1', pack: 'king_premium', text: 'プレミアムお題' }
		mockFetchOk([
			{ id: 'missing-text', pack: 'king_premium' },
			premium,
			{ id: 'wrong-text', pack: 'king_premium', text: 123 },
		])

		await expect(topicsStore.refreshPremiumPack('king_premium')).resolves.toBe(true)

		expect(topicsStore.getState().topics).toEqual([...sample, premium])
	})

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

	it('200 で空配列を取得したら false を返し state のお題を変更しない', async () => {
		mockFetchOk(sample)
		await topicsStore.refresh()
		const before = [...topicsStore.getState().topics]
		mockFetchOk([])

		const ok = await topicsStore.refreshPremiumPack('king_premium')

		expect(topicsStore.getState().topics).toEqual(before)
		expect(ok).toBe(false)
	})
})
