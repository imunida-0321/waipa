import { fireEvent, render } from '@testing-library/react-native'
import { router } from 'expo-router'
import { games } from '@/games/registry'
import { GameGrid } from '../game-grid'

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
jest.mock('expo-audio', () => ({
	createAudioPlayer: jest.fn(),
}))
jest.mock('@/lib/sound', () => ({
	playSound: jest.fn(),
	registerSound: jest.fn(),
}))
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }))
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
		default: View,
		Svg: View,
		G: View,
		Path: View,
		Circle: View,
		Polygon: View,
	}
})
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: { View },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
		runOnJS: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
	}
})

it('レジストリの全ゲームがカード表示される', async () => {
	const { getByText } = await render(<GameGrid />)
	for (const g of games) {
		expect(getByText(g.title)).toBeTruthy()
		expect(getByText(g.tagline)).toBeTruthy()
	}
})

it('カードタップで該当ゲームへ遷移する', async () => {
	const { getByText } = await render(<GameGrid />)
	fireEvent.press(getByText('BOMB!! 2/16'))
	expect(router.push).toHaveBeenCalledWith({
		pathname: '/game/[id]',
		params: { id: 'bomb-2-16' },
	})
})
