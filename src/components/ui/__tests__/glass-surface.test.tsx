import { render } from '@testing-library/react-native'
import { StyleSheet, Text, View, type ViewProps } from 'react-native'
import { GlassSurface, resolveGlassMode } from '../glass-surface'

describe('resolveGlassMode', () => {
	it('Liquid Glass が使えるなら variant によらず native', () => {
		expect(resolveGlassMode('card', { liquidGlass: true, os: 'ios' })).toBe('native')
		expect(resolveGlassMode('overlay', { liquidGlass: true, os: 'ios' })).toBe('native')
	})

	it('web では常に pseudo', () => {
		expect(resolveGlassMode('card', { liquidGlass: false, os: 'web' })).toBe('pseudo')
		expect(resolveGlassMode('overlay', { liquidGlass: false, os: 'web' })).toBe('pseudo')
	})

	it('ネイティブのフォールバックは overlay のみ blur、card は pseudo', () => {
		expect(resolveGlassMode('card', { liquidGlass: false, os: 'android' })).toBe('pseudo')
		expect(resolveGlassMode('overlay', { liquidGlass: false, os: 'android' })).toBe('blur')
		expect(resolveGlassMode('card', { liquidGlass: false, os: 'ios' })).toBe('pseudo')
		expect(resolveGlassMode('overlay', { liquidGlass: false, os: 'ios' })).toBe('blur')
	})
})

describe('GlassSurface', () => {
	it('既定（card・Jest 環境）は疑似ガラスで子要素を描画する', async () => {
		const { getByTestId, getByText } = await render(
			<GlassSurface>
				<Text>中身</Text>
			</GlassSurface>,
		)
		expect(getByTestId('glass-surface-pseudo')).toBeTruthy()
		expect(getByText('中身')).toBeTruthy()
	})

	it('overlay は BlurView で描画する', async () => {
		const { getByTestId, getByText } = await render(
			<GlassSurface variant="overlay">
				<Text>中身</Text>
			</GlassSurface>,
		)
		expect(getByTestId('glass-surface-blur')).toBeTruthy()
		expect(getByText('中身')).toBeTruthy()
	})

	it('style の上書きが最後に適用される', async () => {
		const { getByTestId } = await render(<GlassSurface style={{ borderRadius: 999 }} />)
		const flat = StyleSheet.flatten(getByTestId('glass-surface-pseudo').props.style)
		expect(flat.borderRadius).toBe(999)
	})

	it('Liquid Glass 利用可能時は GlassView で描画する', async () => {
		jest.resetModules()
		jest.doMock('expo-glass-effect', () => ({
			GlassView: ({ children, ...props }: ViewProps) => <View {...props}>{children}</View>,
			isLiquidGlassAvailable: () => true,
		}))
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const nativeModule = require('../glass-surface') as typeof import('../glass-surface')
		const NativeGlassSurface = nativeModule.GlassSurface
		const { getByTestId } = await render(
			<NativeGlassSurface>
				<Text>中身</Text>
			</NativeGlassSurface>,
		)
		expect(getByTestId('glass-surface-native')).toBeTruthy()
		jest.dontMock('expo-glass-effect')
	})
})
