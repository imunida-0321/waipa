import { act, fireEvent, render } from '@testing-library/react-native'
import { REVEAL_INTERVAL_MS } from '../result'
import { FiveSecStopGame } from '../five-sec-stop-game'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
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
		withRepeat: jest.fn((toValue: number) => toValue),
		withDelay: jest.fn((_delay: number, toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn(), linear: jest.fn() },
	}
})
jest.mock('@/lib/players-store', () => {
	const actual = jest.requireActual('@/lib/players-store')
	return {
		...actual,
		usePlayers: () => ({ count: 2, names: ['アオイ', 'ユウタ'], history: [] }),
	}
})

const DRUMROLL_MS = 2000

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

it('2人が順番に計測し、リザルトで敗者が発表される', async () => {
	const { getByText, getByTestId } = await render(<FiveSecStopGame />)

	// 1人目: アオイ（ぴったり賞）
	expect(getByText('1人目 / 2人')).toBeTruthy()
	expect(getByText('アオイ さんの番')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップでスタート')))
	await act(async () => jest.advanceTimersByTime(4980))
	await act(async () => fireEvent.press(getByTestId('stop-area')))
	expect(getByText(/ぴったり賞/)).toBeTruthy()
	await act(async () => fireEvent.press(getByText('つぎの人へ')))

	// 2人目: ユウタ（大きくズレて敗者）
	expect(getByText('2人目 / 2人')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップでスタート')))
	await act(async () => jest.advanceTimersByTime(5820))
	await act(async () => fireEvent.press(getByTestId('stop-area')))
	await act(async () => fireEvent.press(getByText('結果発表へ')))

	// リザルト: 1位めくり → ドラムロール → 敗者発表
	expect(getByText('結果発表')).toBeTruthy()
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS + DRUMROLL_MS))
	expect(getByText('ユウタ')).toBeTruthy()
	expect(getByText(/敗者/)).toBeTruthy()
})

it('「もう一回」で1人目からやり直せる', async () => {
	const { getByText, getByTestId } = await render(<FiveSecStopGame />)

	await act(async () => fireEvent.press(getByText('タップでスタート')))
	await act(async () => jest.advanceTimersByTime(5100))
	await act(async () => fireEvent.press(getByTestId('stop-area')))
	await act(async () => fireEvent.press(getByText('つぎの人へ')))
	await act(async () => fireEvent.press(getByText('タップでスタート')))
	await act(async () => jest.advanceTimersByTime(5200))
	await act(async () => fireEvent.press(getByTestId('stop-area')))
	await act(async () => fireEvent.press(getByText('結果発表へ')))
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS + 2000))

	await act(async () => fireEvent.press(getByText('もう一回')))
	expect(getByText('1人目 / 2人')).toBeTruthy()
	expect(getByText('アオイ さんの番')).toBeTruthy()
})
