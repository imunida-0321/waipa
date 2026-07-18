import * as ReactNative from 'react-native'
import { render } from '@testing-library/react-native'
import { ExplosionOverlay } from '../explosion-overlay'
import { FenceOverlay } from '../fence-overlay'
import { HazardPanel } from '../hazard-panel'

jest.mock('lottie-react-native', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { __esModule: true, default: () => <View testID="lottie-view" /> }
})
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('react-native-svg', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: ({ children }: { children?: import('react').ReactNode }) => (
			<View testID="svg-view">{children}</View>
		),
		Svg: ({ children }: { children?: import('react').ReactNode }) => (
			<View testID="svg-view">{children}</View>
		),
		Line: () => <View testID="fence-line" />,
		Polygon: () => <View testID="hazard-polygon" />,
		Rect: () => <View testID="hazard-rect" />,
	}
})

describe('bomb-216 overlays', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('ExplosionOverlay は盤面用 overlay と Lottie を表示する', async () => {
		const { getByTestId } = await render(<ExplosionOverlay />)

		expect(getByTestId('explosion-overlay')).toBeTruthy()
		expect(getByTestId('lottie-view')).toBeTruthy()
	})

	it('FenceOverlay は画面サイズに応じた斜め格子を描画する', async () => {
		jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
			width: 100,
			height: 92,
			scale: 1,
			fontScale: 1,
		})

		const { getByTestId, getAllByTestId } = await render(<FenceOverlay />)

		expect(getByTestId('fence-overlay')).toBeTruthy()
		expect(getByTestId('svg-view')).toBeTruthy()
		expect(getAllByTestId('fence-line').length).toBeGreaterThan(0)
	})

	it('HazardPanel は警告パネル内に children と上下ストライプを描画する', async () => {
		const { getByTestId, getByText, getAllByTestId } = await render(
			<HazardPanel>
				<ReactNative.Text>危険度テキスト</ReactNative.Text>
			</HazardPanel>,
		)

		expect(getByTestId('hazard-panel')).toBeTruthy()
		expect(getByText('危険度テキスト')).toBeTruthy()
		expect(getAllByTestId('hazard-rect')).toHaveLength(2)
		expect(getAllByTestId('hazard-polygon')).toHaveLength(24)
	})
})
