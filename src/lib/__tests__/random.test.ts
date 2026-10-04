import { defaultRng, pickRandom } from '../random'

afterEach(() => {
	jest.restoreAllMocks()
})

describe('defaultRng', () => {
	it('インポート後に設定した Math.random の spy を呼び出しの都度反映する', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.25)

		expect(defaultRng()).toBe(0.25)

		randomSpy.mockReturnValue(0.75)

		expect(defaultRng()).toBe(0.75)
	})
})

describe('pickRandom', () => {
	const items = ['先頭', '中央', '末尾'] as const

	it.each([
		{ value: 0, expected: '先頭' },
		{ value: 0.5, expected: '中央' },
		{ value: 0.999, expected: '末尾' },
	])('rng が $value を返すと $expected を選ぶ', ({ value, expected }) => {
		jest.spyOn(Math, 'random').mockReturnValue(value === 0 ? 0.999 : 0)

		expect(pickRandom(items, () => value)).toBe(expected)
	})

	it('空配列なら undefined を返す', () => {
		expect(pickRandom([], () => 0)).toBeUndefined()
	})

	it('rng 省略時は defaultRng を使い Math.random の spy を反映する', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)

		expect(pickRandom(items)).toBe('先頭')

		randomSpy.mockReturnValue(0.999)

		expect(pickRandom(items)).toBe('末尾')
	})
})
