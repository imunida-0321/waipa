import { act, fireEvent, render } from '@testing-library/react-native'
import type { Hand } from '../dice'
import { ChinchiroResult, REVEAL_INTERVAL_MS } from '../result'

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

const hand = (score: number, type: Hand['type'] = 'me', value = 0): Hand => ({
	type,
	value,
	score,
})

function seqRng(values: number[]): () => number {
	let i = 0
	return () => values[i++] ?? 0.999
}
const die = (n: number) => (n - 0.5) / 6

it('1位から順にめくれ、単独敗者はドラムロール後に発表される', async () => {
	const hands = [
		hand(106, 'me', 6),
		hand(1000, 'pinzoro'),
		hand(800, 'shigoro'),
		hand(0, 'hifumi'),
	]
	const names = ['アオイ', 'ミキ', 'ケン', 'ユウタ']
	const { getByText, queryByText } = await render(
		<ChinchiroResult
			hands={hands}
			playerNames={names}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)

	expect(queryByText('ミキ')).toBeNull()
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS))
	expect(getByText('ミキ')).toBeTruthy() // 1位 ピンゾロ
	expect(getByText('ピンゾロ！')).toBeTruthy()

	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS * 2))
	expect(getByText('ケン')).toBeTruthy()
	expect(getByText('アオイ')).toBeTruthy()
	expect(queryByText('ユウタ')).toBeNull() // 敗者はまだ伏せ

	await act(async () => jest.advanceTimersByTime(DRUMROLL_MS))
	expect(getByText('ユウタ')).toBeTruthy()
	expect(getByText(/敗者/)).toBeTruthy()
	expect(getByText('もう一回')).toBeTruthy()
})

it('同率最下位が複数ならサドンデスになり、1投勝負で敗者が決まる', async () => {
	// A と C が目なし同率、B は6の目
	const hands = [hand(10, 'nome'), hand(106, 'me', 6), hand(10, 'nome')]
	const names = ['A', 'B', 'C']
	// サドンデス rng: A の投=[セーフ, 3,3,5]=5の目 / C の投=[セーフ, 2,4,6]=役なし→目なし扱い
	const rng = seqRng([0.9, die(3), die(3), die(5), 0.9, die(2), die(4), die(6)])
	const { getByText, queryByText } = await render(
		<ChinchiroResult
			hands={hands}
			playerNames={names}
			onRetry={jest.fn()}
			onHome={jest.fn()}
			rng={rng}
		/>,
	)

	// めくり(1人) + ドラムロール
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS + DRUMROLL_MS))
	expect(getByText(/サドンデス/)).toBeTruthy()
	expect(queryByText('もう一回')).toBeNull() // 決着まではボタンなし

	// A の1投
	expect(getByText('A さんの番')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(1200))
	// C の1投
	expect(getByText('C さんの番')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(1200))

	// C が目なしで敗者
	expect(getByText(/C/)).toBeTruthy()
	expect(getByText(/敗者/)).toBeTruthy()
	expect(getByText('もう一回')).toBeTruthy()
})

it('全員同率なら全員がサドンデスに進む', async () => {
	const hands = [hand(10, 'nome'), hand(10, 'nome')]
	// 1投目同士も同率 → 再サドンデス → 2巡目で決着
	const rng = seqRng([
		0.9,
		die(2),
		die(4),
		die(6), // A: 目なし
		0.9,
		die(1),
		die(3),
		die(5), // B: 目なし → 同率continue
		0.9,
		die(3),
		die(3),
		die(6), // A: 6の目
		0.9,
		die(2),
		die(4),
		die(6), // B: 目なし → B 敗者
	])
	const { getByText } = await render(
		<ChinchiroResult
			hands={hands}
			playerNames={['A', 'B']}
			onRetry={jest.fn()}
			onHome={jest.fn()}
			rng={rng}
		/>,
	)

	// safe 0人 → 即ドラムロール
	await act(async () => jest.advanceTimersByTime(DRUMROLL_MS))
	expect(getByText(/サドンデス/)).toBeTruthy()

	for (let i = 0; i < 4; i++) {
		await act(async () => fireEvent.press(getByText('タップで振る！')))
		await act(async () => jest.advanceTimersByTime(1200))
	}

	expect(getByText(/敗者/)).toBeTruthy()
})

it('発表完了後に「もう一回」で onRetry が呼ばれる', async () => {
	const onRetry = jest.fn()
	const { getByText } = await render(
		<ChinchiroResult
			hands={[hand(106, 'me', 6), hand(10, 'nome')]}
			playerNames={['A', 'B']}
			onRetry={onRetry}
			onHome={jest.fn()}
		/>,
	)
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS + 2000))
	await act(async () => fireEvent.press(getByText('もう一回')))
	expect(onRetry).toHaveBeenCalled()
})
