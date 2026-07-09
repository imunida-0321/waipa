import { act, fireEvent, render } from '@testing-library/react-native'
import { StopwatchPlay } from '../stopwatch-play'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
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

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

async function setup(onDone = jest.fn()) {
	const utils = await render(
		<StopwatchPlay
			playerIndex={0}
			playerName="アオイ"
			orderLabel="1人目 / 2人"
			doneLabel="つぎの人へ"
			onDone={onDone}
		/>,
	)
	return { onDone, ...utils }
}

it('スタンバイ→スタート→ストップ→記録表示→onDone の順に進む', async () => {
	const { onDone, getByText, getByTestId } = await setup()

	expect(getByText('アオイ さんの番')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップでスタート')))

	await act(async () => jest.advanceTimersByTime(5320))
	await act(async () => fireEvent.press(getByTestId('stop-area')))

	expect(getByText('5.32')).toBeTruthy()
	expect(getByText('+0.32 ズレ')).toBeTruthy()

	await act(async () => fireEvent.press(getByText('つぎの人へ')))
	expect(onDone).toHaveBeenCalledWith(5320)
})

it('3秒未満は数字が見え、3秒以降は「？？？」になる', async () => {
	const { getByText, getByTestId, queryByText } = await setup()
	await act(async () => fireEvent.press(getByText('タップでスタート')))

	await act(async () => jest.advanceTimersByTime(1000))
	expect(getByTestId('timer-digits')).toBeTruthy()

	await act(async () => jest.advanceTimersByTime(2100)) // 3.1秒経過
	expect(queryByText('？？？')).toBeTruthy()
})

it('スタート直後300ms未満のタップでは止まらない', async () => {
	const { getByText, getByTestId, queryByText } = await setup()
	await act(async () => fireEvent.press(getByText('タップでスタート')))

	await act(async () => jest.advanceTimersByTime(100))
	await act(async () => fireEvent.press(getByTestId('stop-area')))
	expect(queryByText('つぎの人へ')).toBeNull() // まだ record フェーズに進まない

	await act(async () => jest.advanceTimersByTime(5000))
	await act(async () => fireEvent.press(getByTestId('stop-area')))
	expect(getByText('5.10')).toBeTruthy()
})

it('±0.05秒以内はぴったり賞の演出が出る', async () => {
	const { getByText, getByTestId } = await setup()
	await act(async () => fireEvent.press(getByText('タップでスタート')))

	await act(async () => jest.advanceTimersByTime(4980))
	await act(async () => fireEvent.press(getByTestId('stop-area')))

	expect(getByText(/ぴったり賞/)).toBeTruthy()
	expect(getByText('4.98')).toBeTruthy()
	expect(getByText('-0.02 ズレ')).toBeTruthy()
})
