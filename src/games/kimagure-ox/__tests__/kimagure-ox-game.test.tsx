import { act, fireEvent, render } from '@testing-library/react-native'
import { KimagureOxGame } from '../kimagure-ox-game'

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
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
	}
})

// Math.random を 0.999 に固定: 先手は ×、イベントは発生しない
beforeEach(() => {
	jest.spyOn(Math, 'random').mockReturnValue(0.999)
})
afterEach(() => jest.restoreAllMocks())

it('イントロ→スタート→交互に着手→勝利でリザルトが出る', async () => {
	const { getByText, getByTestId, queryByText } = await render(<KimagureOxGame />)

	// イントロ: 先手発表（rng=0.999 → 先手 ×）
	expect(getByText(/先手は/)).toBeTruthy()
	await act(async () => fireEvent.press(getByText('スタート')))

	// × → o → × → o → × で縦列 0,3,6 が × の勝ち
	await act(async () => fireEvent.press(getByTestId('cell-0'))) // x
	await act(async () => fireEvent.press(getByTestId('cell-1'))) // o
	await act(async () => fireEvent.press(getByTestId('cell-3'))) // x
	await act(async () => fireEvent.press(getByTestId('cell-2'))) // o
	expect(queryByText(/勝ち/)).toBeNull()
	await act(async () => fireEvent.press(getByTestId('cell-6'))) // x 勝利

	expect(getByText('× の勝ち！')).toBeTruthy()
})

it('もう一回でイントロに戻る', async () => {
	const { getByText, getByTestId } = await render(<KimagureOxGame />)
	await act(async () => fireEvent.press(getByText('スタート')))
	await act(async () => fireEvent.press(getByTestId('cell-0')))
	await act(async () => fireEvent.press(getByTestId('cell-1')))
	await act(async () => fireEvent.press(getByTestId('cell-3')))
	await act(async () => fireEvent.press(getByTestId('cell-2')))
	await act(async () => fireEvent.press(getByTestId('cell-6')))
	await act(async () => fireEvent.press(getByText('もう一回')))
	expect(getByText(/先手は/)).toBeTruthy()
})
