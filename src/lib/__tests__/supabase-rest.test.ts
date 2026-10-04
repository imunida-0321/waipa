import { fetchRows } from '../supabase-rest'

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

type Row = { id: string; pack: string; text: string }

function isRow(value: unknown): value is Row {
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

const originalFetch = globalThis.fetch
const mockFetch = jest.fn<Promise<Response>, Parameters<typeof fetch>>()

function mockResponse(data: unknown, status = 200) {
	mockFetch.mockResolvedValueOnce({
		ok: status >= 200 && status < 300,
		status,
		json: async () => data,
	} as Response)
}

beforeEach(() => {
	mockFetch.mockReset()
	globalThis.fetch = mockFetch
})

afterEach(() => {
	globalThis.fetch = originalFetch
})

describe('fetchRows', () => {
	it('環境変数の URL とテーブルを使い、クエリ値をエンコードして取得する', async () => {
		mockResponse([])

		await expect(
			fetchRows('topics', { select: 'id,pack,text', pack: 'eq.a&b' }, isRow),
		).resolves.toEqual([])

		expect(mockFetch).toHaveBeenCalledTimes(1)
		const [url] = mockFetch.mock.calls[0]
		expect(typeof url).toBe('string')
		expect(url).toEqual(expect.stringContaining('https://test.supabase.co/rest/v1/topics?'))
		expect(url).toEqual(expect.stringContaining('a%26b'))
		const query = new URL(String(url)).searchParams
		expect(query.get('select')).toBe('id,pack,text')
		expect(query.get('pack')).toBe('eq.a&b')
		expect(Array.from(query.keys()).sort()).toEqual(['pack', 'select'])
	})

	it('環境変数の anon キーを apikey と Authorization ヘッダに設定する', async () => {
		mockResponse([])

		await fetchRows('word_pairs', { select: 'id' }, isRow)

		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/rest/v1/word_pairs?'),
			expect.objectContaining({
				headers: expect.objectContaining({
					apikey: 'test-anon-key',
					Authorization: 'Bearer test-anon-key',
				}),
			}),
		)
	})

	it.each([301, 401, 500])('非 2xx（%i）のレスポンスは null を返す', async (status) => {
		mockResponse([{ id: 'a', pack: 'king', text: 'お題A' }], status)

		await expect(fetchRows('topics', { select: 'id,pack,text' }, isRow)).resolves.toBeNull()
	})

	it('fetch 例外は reject せず null を返す', async () => {
		mockFetch.mockRejectedValueOnce(new Error('network'))

		await expect(fetchRows('topics', { select: 'id,pack,text' }, isRow)).resolves.toBeNull()
	})

	it.each([null, { id: 'a', pack: 'king', text: 'お題A' }, 'invalid', 1])(
		'配列でないレスポンス（%p）は null を返す',
		async (data) => {
			mockResponse(data)

			await expect(fetchRows('topics', { select: 'id,pack,text' }, isRow)).resolves.toBeNull()
		},
	)

	it('isRow を満たす行だけを元の順序で返す', async () => {
		const first = { id: 'a', pack: 'king', text: 'お題A' }
		const second = { id: 'b', pack: 'talk', text: 'お題B' }
		mockResponse([
			first,
			{ id: 'missing', pack: 'king' },
			{ id: 'wrong', pack: 'king', text: 123 },
			null,
			'invalid',
			second,
		])

		await expect(fetchRows('topics', { select: 'id,pack,text' }, isRow)).resolves.toEqual([
			first,
			second,
		])
	})
})
