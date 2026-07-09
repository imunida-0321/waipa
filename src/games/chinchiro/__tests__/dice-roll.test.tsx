import { act, fireEvent, render } from '@testing-library/react-native'
import { DiceRoll, ROLL_DURATION_MS } from '../dice-roll'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('lottie-react-native', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { __esModule: true, default: View }
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

// rng を並べて出目を固定する。1投 = [ションベン判定, 目1, 目2, 目3]
function seqRng(values: number[]): () => number {
	let i = 0
	return () => values[i++] ?? 0.999
}

// 出目 n を出す rng 値（floor(v*6)+1 = n となる代表値）
const die = (n: number) => (n - 0.5) / 6

async function setup(rngValues: number[], onDone = jest.fn()) {
	const utils = await render(
		<DiceRoll
			playerIndex={0}
			playerName="アオイ"
			orderLabel="1人目 / 2人"
			doneLabel="つぎの人へ"
			onDone={onDone}
			rng={seqRng(rngValues)}
		/>,
	)
	return { onDone, ...utils }
}

it('スタンバイ→振る→転がり→役確定→onDone と進む（シゴロ）', async () => {
	const { onDone, getByText, queryByText } = await setup([
		0.9,
		die(4),
		die(5),
		die(6), // 1投目: セーフ、4-5-6
	])

	expect(getByText('アオイ さんの番')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップで振る！')))

	// 転がり中は役はまだ出ない
	expect(queryByText('シゴロ！')).toBeNull()
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))

	expect(getByText('シゴロ！')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('つぎの人へ')))
	expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ type: 'shigoro', score: 800 }))
})

it('役なしなら振り直しでき、3投目で目なし確定になる', async () => {
	const { onDone, getByText } = await setup([
		0.9,
		die(2),
		die(4),
		die(6), // 1投目: 役なし
		0.9,
		die(1),
		die(3),
		die(5), // 2投目: 役なし
		0.9,
		die(2),
		die(4),
		die(6), // 3投目: 役なし → 目なし確定
	])

	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText(/役なし/)).toBeTruthy()

	await act(async () => fireEvent.press(getByText('もう一度振る')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText(/役なし/)).toBeTruthy()

	await act(async () => fireEvent.press(getByText('もう一度振る')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))

	// 3投目役なし → 目なしとして record へ
	expect(getByText('目なし…')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('つぎの人へ')))
	expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ type: 'nome', score: 10 }))
})

it('ションベンはその投が無効になり、表示が出る', async () => {
	const { getByText } = await setup([
		0.01,
		die(1),
		die(1),
		die(1), // 1投目: ションベン（ピンゾロは無効）
		0.9,
		die(3),
		die(3),
		die(5), // 2投目: 5の目
	])

	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))

	expect(getByText('ションベン！')).toBeTruthy()
	expect(getByText(/のこり2投/)).toBeTruthy()

	await act(async () => fireEvent.press(getByText('もう一度振る')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText('5の目')).toBeTruthy()
})

it('ピンゾロで紙吹雪が出る', async () => {
	const { getByText, getByTestId } = await setup([0.9, die(1), die(1), die(1)])

	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))

	expect(getByText('ピンゾロ！')).toBeTruthy()
	expect(getByTestId('confetti-burst')).toBeTruthy()
})
