import { act, fireEvent, render } from '@testing-library/react-native'
import { ROLL_DURATION_MS } from '../dice-roll'
import { REVEAL_INTERVAL_MS } from '../result'
import { ChinchiroGame } from '../chinchiro-game'

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
jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('@/lib/players-store', () => {
	const actual = jest.requireActual('@/lib/players-store')
	return {
		...actual,
		usePlayers: () => ({ count: 2, names: ['アオイ', 'ユウタ'], history: [] }),
	}
})

const DRUMROLL_MS = 2000

// React 19 の act() は初回フラッシュ時に内部で1回だけ Math.random を消費する
// （enqueueTask の require 文字列生成トリック）。beforeEach で乱数列を固定する前に
// 一度空の act() を通して消費させておかないと、以降の固定シーケンスが1つずれてしまう。
beforeAll(async () => {
	await act(async () => {})
})

beforeEach(() => {
	jest.useFakeTimers()
	// 乱数固定: ションベン判定は常にセーフ(0.9)、出目は 0.9→6
	// 1人目: [セーフ, 6,6,6]=アラシ6 / 2人目: [セーフ, 1,2,3]=ヒフミ
	const values = [0.9, 0.99, 0.99, 0.99, 0.9, 0.01, 0.2, 0.4]
	let call = 0
	jest.spyOn(Math, 'random').mockImplementation(() => values[call++] ?? 0.9)
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

it('2人が順番に振り、リザルトで敗者が発表される', async () => {
	const { getByText } = await render(<ChinchiroGame />)

	// 1人目: アオイ（アラシ6）
	expect(getByText('1人目 / 2人')).toBeTruthy()
	expect(getByText('アオイ さんの番')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText('アラシ（6）！')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('つぎの人へ')))

	// 2人目: ユウタ（ヒフミ）
	expect(getByText('2人目 / 2人')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('タップで振る！')))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText('ヒフミ…')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('結果発表へ')))

	// リザルト
	expect(getByText('けっか はっぴょう')).toBeTruthy()
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS + DRUMROLL_MS))
	expect(getByText('ユウタ')).toBeTruthy()
	expect(getByText(/敗者/)).toBeTruthy()
})

it('「もう一回」で1人目からやり直せる', async () => {
	const { getByText } = await render(<ChinchiroGame />)

	for (const label of ['つぎの人へ', '結果発表へ']) {
		await act(async () => fireEvent.press(getByText('タップで振る！')))
		await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
		await act(async () => fireEvent.press(getByText(label)))
	}
	await act(async () => jest.advanceTimersByTime(REVEAL_INTERVAL_MS + DRUMROLL_MS))

	await act(async () => fireEvent.press(getByText('もう一回')))
	expect(getByText('1人目 / 2人')).toBeTruthy()
	expect(getByText('アオイ さんの番')).toBeTruthy()
})
