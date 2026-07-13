import { act, fireEvent, render } from '@testing-library/react-native'
import { PREP_SECONDS, SHOW_SECONDS } from '../forehead-screen'
import { OdekoPokerGame } from '../odeko-poker-game'

jest.mock('@/lib/haptics', () => ({ haptics: { tap: jest.fn(), heavy: jest.fn() } }))
jest.mock('@/lib/sound', () => ({ playSound: jest.fn() }))
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }))
jest.mock('@/lib/players-store', () => ({
	usePlayers: () => ({ count: 3, names: ['あか', 'あお', 'みどり'], history: [] }),
	getDisplayNames: () => ['あか', 'あお', 'みどり'],
}))
jest.mock('lottie-react-native', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: () => <View testID="lottie-view" />,
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
		withSequence: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withSpring: jest.fn((toValue: number) => toValue),
		getUseOfValueInStyleWarning: jest.fn(() => jest.fn()),
	}
})

beforeEach(() => {
	jest.useFakeTimers()
	jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

type Utils = Awaited<ReturnType<typeof render>>

// deal → 3人分の額当てを消化して宣言フェーズ先頭まで進める
async function toDeclarePhase(utils: Utils) {
	await act(async () => fireEvent.press(utils.getByText('カードを配る')))
	for (let i = 0; i < 3; i++) {
		await act(async () => fireEvent.press(utils.getByText(/受け取った！額当て準備/)))
		// PREP→showing 遷移で新しい setInterval が張り直されるため、1回の advance にまとめず
		// act() を分けて間に効果（useEffect）を1回フラッシュさせる（forehead-screen.test.tsx と同じ作法）
		await act(async () => {
			jest.advanceTimersByTime(PREP_SECONDS * 1000)
		})
		await act(async () => {
			jest.advanceTimersByTime(SHOW_SECONDS * 1000)
		})
	}
}

async function declareAll(utils: Utils, choices: ('勝負' | '降りる')[]) {
	for (const choice of choices) {
		await act(async () => fireEvent.press(utils.getByText('受け取った！')))
		await act(async () => fireEvent(utils.getByText(new RegExp(choice)), 'longPress'))
	}
}

it('deal 画面から始まり、額当て→宣言→全員降りで「全員負け」発表まで通る', async () => {
	const utils = await render(<OdekoPokerGame />)
	expect(utils.getByText(/ラウンド 1/)).toBeTruthy()
	await toDeclarePhase(utils)
	expect(utils.getByText(/あかさんにスマホを渡して/)).toBeTruthy()
	await declareAll(utils, ['降りる', '降りる', '降りる'])
	await act(async () => {
		jest.advanceTimersByTime(2100)
	})
	expect(utils.getByText(/全員降り/)).toBeTruthy()
})

it('勝負1人なら一人勝ちが発表され、次のラウンドで deal に戻る', async () => {
	const utils = await render(<OdekoPokerGame />)
	await toDeclarePhase(utils)
	await declareAll(utils, ['勝負', '降りる', '降りる'])
	await act(async () => {
		jest.advanceTimersByTime(2100)
	})
	expect(utils.getByText(/あかさんの一人勝ち/)).toBeTruthy()
	await act(async () => fireEvent.press(utils.getByText('次のラウンド')))
	expect(utils.getByText(/ラウンド 2/)).toBeTruthy()
})

it('宣言確定の直後は次の人の handoff（中立画面）で、宣言内容は表示されない', async () => {
	const utils = await render(<OdekoPokerGame />)
	await toDeclarePhase(utils)
	await act(async () => fireEvent.press(utils.getByText('受け取った！')))
	await act(async () => fireEvent(utils.getByText(/勝負/), 'longPress'))
	expect(utils.getByText(/あおさんにスマホを渡して/)).toBeTruthy()
	expect(utils.queryByText(/勝負/)).toBeNull()
})
