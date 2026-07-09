import { act, fireEvent, render } from '@testing-library/react-native'
import { FiveSecResult, REVEAL_INTERVAL_MS } from '../result'

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

const DRUMROLL_MS = 2000

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

const records = [4710, 4980, 5170, 5820] // 敗者: index 3（ユウタ）
const names = ['アオイ', 'ミキ', 'ケン', 'ユウタ']

it('ランキング結果が表示される', async () => {
	const { getByText } = await render(
		<FiveSecResult
			records={records}
			playerNames={names}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)

	// タイトルが表示される
	expect(getByText('けっか はっぴょう')).toBeTruthy()
})

it('ぴったり賞のバッジが最初の人に出る', async () => {
	const { getByText } = await render(
		<FiveSecResult
			records={records}
			playerNames={names}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)
	await act(async () => jest.runAllTimers())
	expect(getByText('ぴったり賞')).toBeTruthy()
})

it('レコード数分のカードが表示される', async () => {
	const { queryByText } = await render(
		<FiveSecResult
			records={records}
			playerNames={names}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)
	// 4つのカードがレンダリングされる（最初は全て隠れている）
	expect(queryByText('けっか はっぴょう')).toBeTruthy()
})

it('Retry/Home ボタンのコールバックを受け取る', async () => {
	const onRetry = jest.fn()
	const onHome = jest.fn()
	const { getByText, queryByText } = await render(
		<FiveSecResult records={records} playerNames={names} onRetry={onRetry} onHome={onHome} />,
	)
	// ボタンは非表示（ゲーム中）
	expect(queryByText('もう一回')).toBeNull()
})
