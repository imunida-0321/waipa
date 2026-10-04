import { act, fireEvent, render } from '@testing-library/react-native'
import * as SplashScreen from 'expo-splash-screen'
import { SplashOverlay } from '@/components/splash-overlay'

jest.mock('expo-image', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native') as typeof import('react-native')
	return {
		Image: (props: import('react-native').ViewProps & { source?: unknown }) => (
			<View {...props} testID="splash-image" />
		),
	}
})

jest.mock('expo-splash-screen', () => ({
	hideAsync: jest.fn(async () => {}),
}))

jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native') as typeof import('react-native')
	return {
		__esModule: true,
		default: { View },
		Easing: { elastic: jest.fn() },
		Keyframe: jest.fn(() => ({
			duration: jest.fn().mockReturnThis(),
			withCallback: jest.fn().mockReturnThis(),
		})),
		getUseOfValueInStyleWarning: jest.fn(() => () => {}),
	}
})

jest.mock('react-native-worklets', () => ({
	scheduleOnRN: jest.fn(),
}))

describe('SplashOverlay', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('splash-icon.png を source にした画像を表示する', async () => {
		const { getByTestId } = await render(<SplashOverlay />)

		expect(getByTestId('splash-image').props.source).toEqual(
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			require('@/assets/images/splash-icon.png'),
		)
	})

	it('レイアウト前にはスプラッシュを隠さず、レイアウト後に hideAsync を呼ぶ', async () => {
		const { getByTestId } = await render(<SplashOverlay />)

		expect(SplashScreen.hideAsync).not.toHaveBeenCalled()

		await act(async () => {
			await fireEvent(getByTestId('splash-image'), 'layout', {
				nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } },
			})
		})

		expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1)
	})
})
