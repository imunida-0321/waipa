import { Platform } from 'react-native'
import { BottomTabInset, Colors, Fonts, MaxContentWidth, Spacing } from '../theme'

jest.mock('@/global.css', () => ({}))

describe('theme', () => {
	it('light と dark は同じテーマカラーキーを持つ', () => {
		expect(Object.keys(Colors.light)).toEqual([
			'text',
			'background',
			'backgroundElement',
			'backgroundSelected',
			'textSecondary',
		])
		expect(Object.keys(Colors.dark)).toEqual(Object.keys(Colors.light))
	})

	it('light と dark の基本色を定義している', () => {
		expect(Colors.light.text).toBe('#000000')
		expect(Colors.light.background).toBe('#ffffff')
		expect(Colors.dark.text).toBe('#ffffff')
		expect(Colors.dark.background).toBe('#000000')
	})

	it('Spacing は 2 から 64 までの固定値を持つ', () => {
		expect(Spacing).toEqual({
			half: 2,
			one: 4,
			two: 8,
			three: 16,
			four: 24,
			five: 32,
			six: 64,
		})
	})

	it('Platform ごとのフォントとタブ下余白を返す', () => {
		const expectedInset = Platform.OS === 'ios' ? 50 : Platform.OS === 'android' ? 80 : 0
		expect(Fonts).toEqual(
			Platform.select({
				ios: {
					sans: 'system-ui',
					serif: 'ui-serif',
					rounded: 'ui-rounded',
					mono: 'ui-monospace',
				},
				default: {
					sans: 'normal',
					serif: 'serif',
					rounded: 'normal',
					mono: 'monospace',
				},
				web: {
					sans: 'var(--font-display)',
					serif: 'var(--font-serif)',
					rounded: 'var(--font-rounded)',
					mono: 'var(--font-mono)',
				},
			}),
		)
		expect(BottomTabInset).toBe(expectedInset)
		expect(MaxContentWidth).toBe(800)
	})
})
