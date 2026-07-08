import { act, fireEvent, render } from '@testing-library/react-native'
import { BombGame } from '../bomb-game'

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
	const LinearGradient = React.forwardRef((props: object, ref: unknown) =>
		React.createElement(View, { ...props, ref }),
	)
	LinearGradient.displayName = 'LinearGradient'
	return { LinearGradient }
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
		withSequence: jest.fn((toValue: number) => toValue),
		withSpring: jest.fn((toValue: number) => toValue),
	}
})

// createBoard を固定盤面（solo=0, all=1）に差し替え
jest.mock('../board', () => {
	const actual = jest.requireActual('../board')
	return { ...actual, createBoard: () => actual.createBoard(() => 0) }
})

const press = async (element: unknown) => {
	await act(async () => {
		fireEvent.press(element)
	})
}

describe('BombGame', () => {
	it('16タイルと残数・確率を表示する', async () => {
		const { getByText } = await render(<BombGame />)
		expect(getByText('1')).toBeTruthy()
		expect(getByText('16')).toBeTruthy()
		expect(getByText(/のこり 16/)).toBeTruthy()
		expect(getByText(/💣 2\/16/)).toBeTruthy()
	})

	it('セーフ開封で残数が減りリアクションが出る', async () => {
		const { getByText } = await render(<BombGame />)
		await press(getByText('6')) // index 5 = セーフ
		expect(getByText(/のこり 15/)).toBeTruthy()
		expect(getByText(/💣 2\/15/)).toBeTruthy()
		expect(getByText('🍀')).toBeTruthy()
	})

	it('1人負け爆弾でリザルト（1人負け）が表示される', async () => {
		jest.useFakeTimers()
		const { getByText } = await render(<BombGame />)
		await press(getByText('1')) // index 0 = solo
		await act(async () => {
			jest.runAllTimers()
		})
		expect(getByText(/1人負け/)).toBeTruthy()
		jest.useRealTimers()
	})

	it('全員負け爆弾でリザルト（全員負け）が表示される', async () => {
		jest.useFakeTimers()
		const { getByText } = await render(<BombGame />)
		await press(getByText('2')) // index 1 = all
		await act(async () => {
			jest.runAllTimers()
		})
		expect(getByText(/全員負け/)).toBeTruthy()
		jest.useRealTimers()
	})

	it('「もう一回」で盤面がリセットされる', async () => {
		jest.useFakeTimers()
		const { getByText, queryByText } = await render(<BombGame />)
		await press(getByText('1'))
		await act(async () => {
			jest.runAllTimers()
		})
		await press(getByText('もう一回'))
		expect(queryByText(/1人負け/)).toBeNull()
		expect(getByText(/のこり 16/)).toBeTruthy()
		jest.useRealTimers()
	})
})
