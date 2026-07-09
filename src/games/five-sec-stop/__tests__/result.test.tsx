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

it('1位から順にカードがめくれ、敗者はドラムロール後に発表される', async () => {
	const { getByText, queryByText } = await render(
		<FiveSecResult
			records={records}
			playerNames={names}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)

	// 最初は誰もめくれていない
	expect(queryByText('ミキ')).toBeNull()

	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS))
	expect(getByText('ミキ')).toBeTruthy() // 1位: 4.98
	expect(getByText('4.98')).toBeTruthy()

	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS * 2))
	expect(getByText('ケン')).toBeTruthy()
	expect(getByText('アオイ')).toBeTruthy()

	// 敗者はまだ伏せられている
	expect(queryByText('ユウタ')).toBeNull()

	// ドラムロール終了で敗者発表
	await act(async () => jest.advanceTimersByTime(DRUMROLL_MS))
	expect(getByText('ユウタ')).toBeTruthy()
	expect(getByText('5.82')).toBeTruthy()
	expect(getByText(/敗者/)).toBeTruthy()
})

it('ぴったり賞のバッジが1位カードに出る', async () => {
	const { getByText } = await render(
		<FiveSecResult
			records={records}
			playerNames={names}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS * 3 + DRUMROLL_MS))
	expect(getByText('ぴったり賞')).toBeTruthy()
})

it('同率最下位は複数人まとめて発表される', async () => {
	const { getByText, getAllByText } = await render(
		<FiveSecResult
			records={[5300, 4700, 5000]}
			playerNames={['A', 'B', 'C']}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS * 1 + DRUMROLL_MS))
	expect(getByText('A')).toBeTruthy()
	expect(getByText('B')).toBeTruthy()
	expect(getAllByText(/敗者/).length).toBeGreaterThanOrEqual(2)
})

it('全員同率敗者（safeが0人）の場合、めくり無しで即ドラムロールになり、2000ms後に全員が敗者として表示される', async () => {
	const { getByText, queryByText, getAllByText } = await render(
		<FiveSecResult
			records={[5100, 4900]}
			playerNames={['A', 'B']}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)

	// ドラムロール経過前は誰もめくれていない
	expect(queryByText('A')).toBeNull()
	expect(queryByText('B')).toBeNull()

	await act(async () => jest.advanceTimersByTime(DRUMROLL_MS))

	expect(getByText('A')).toBeTruthy()
	expect(getByText('B')).toBeTruthy()
	expect(getAllByText(/敗者/).length).toBe(2)
	expect(getByText('もう一回')).toBeTruthy()
})

it('発表完了後に「もう一回」でonRetryが呼ばれる', async () => {
	const onRetry = jest.fn()
	const { getByText, queryByText } = await render(
		<FiveSecResult
			records={records}
			playerNames={names}
			onRetry={onRetry}
			onHome={jest.fn()}
		/>,
	)
	// 発表が終わるまでボタンは出ない
	expect(queryByText('もう一回')).toBeNull()
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS * 3 + DRUMROLL_MS))
	await act(async () => fireEvent.press(getByText('もう一回')))
	expect(onRetry).toHaveBeenCalled()
})
