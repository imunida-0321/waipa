import { act, fireEvent, render } from '@testing-library/react-native'
import { router } from 'expo-router'
import { HeroBanner } from '../hero-banner'
import { HomeHeader } from '../home-header'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const React = require('react')
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	const LinearGradient = React.forwardRef((props: any, ref: any) =>
		React.createElement(View, { ...props, ref }, props.children),
	)
	LinearGradient.displayName = 'LinearGradient'
	return { LinearGradient }
})
jest.mock('@/lib/settings-store', () => ({
	settingsStore: {
		getState: () => ({ hapticsEnabled: false, soundEnabled: false }),
	},
}))

beforeEach(() => {
	jest.clearAllMocks()
})

it('ロゴとプレミアムボタンとメニューが表示される', async () => {
	const { getByText, getByLabelText } = await render(<HomeHeader />)
	expect(getByText('WaiPa')).toBeTruthy()
	expect(getByText('👑 プレミアム')).toBeTruthy()
	expect(getByLabelText('メニュー')).toBeTruthy()
})

it('プレミアムボタンとメニューで設定へ遷移する', async () => {
	const { getByText, getByLabelText } = await render(<HomeHeader />)
	await act(async () => {
		fireEvent.press(getByText('👑 プレミアム'))
	})
	await act(async () => {
		fireEvent.press(getByLabelText('メニュー'))
	})
	expect(router.push).toHaveBeenCalledTimes(2)
	expect(router.push).toHaveBeenCalledWith('/settings')
})

it('ヒーローバナーにキャッチコピーが表示される', async () => {
	const { getByText } = await render(<HeroBanner />)
	expect(getByText('WAIPA GAME')).toBeTruthy()
	expect(getByText('スマホ1台で、みんなでワイワイ')).toBeTruthy()
})
