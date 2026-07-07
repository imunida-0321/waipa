import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { playersStore } from '@/lib/players-store'
import { WhoWillPayGame } from '../who-will-pay-game'

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
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('expo-audio', () => ({
	createAudioPlayer: jest.fn(),
}))
jest.mock('@/lib/sound', () => ({
	playSound: jest.fn(),
	registerSound: jest.fn(),
}))
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
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
		runOnJS: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
	}
})

beforeEach(async () => {
	await AsyncStorage.clear()
	await playersStore.hydrate()
	await playersStore.setCount(2)
})

it('金額入力→確定でルーレット画面へ進む', async () => {
	const { getByText } = await render(<WhoWillPayGame />)
	await act(async () => {
		fireEvent.press(getByText('1'))
	})
	await act(async () => {
		fireEvent.press(getByText('2'))
	})
	await act(async () => {
		fireEvent.press(getByText('4'))
	})
	await act(async () => {
		fireEvent.press(getByText('確定'))
	})
	await waitFor(() => expect(getByText('GO!')).toBeTruthy())
})
