import { act, fireEvent, render } from '@testing-library/react-native'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { FUSE_MIN_MS, TICK_START_MS } from '../engine'
import { EXPLOSION_HOLD_MS } from '../explosion-overlay'
import { BombRelayGame } from '../bomb-relay-game'

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
		withRepeat: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
	}
})
jest.mock('@/lib/topics-store', () => ({
	useTopics: () => ({ topics: [], fetchedAt: null }),
}))

// Math.random を 0 に固定: 初期お題 = fb-talk-1「ラーメンの具といえば？」、導火線 = FUSE_MIN_MS (10000ms)
beforeEach(() => {
	// playSound / haptics.tap の呼び出し履歴はテスト間で残るため、explosion-overlay.test.tsx /
	// event-cutin.test.tsx と同様に毎回クリアする（jest.restoreAllMocks は spy の実装のみ復元し、
	// jest.fn() の呼び出し履歴は消さないため）
	jest.clearAllMocks()
	jest.spyOn(Math, 'random').mockReturnValue(0)
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

async function startGame() {
	const utils = await render(<BombRelayGame />)
	await act(async () => {
		fireEvent.press(utils.getByText('スタート'))
	})
	return utils
}

it('ready でお題とスタートを表示する', async () => {
	const { getByText } = await render(<BombRelayGame />)
	expect(getByText('ラーメンの具といえば？')).toBeTruthy()
	expect(getByText('スタート')).toBeTruthy()
})

it('スタートで ticking になりチクタクが加速発火する', async () => {
	const { getByText, queryByText } = await startGame()
	expect(getByText('答えたら次の人へ回せ！')).toBeTruthy()
	expect(queryByText('スタート')).toBeNull()

	const tapMock = haptics.tap as jest.Mock
	const afterStart = tapMock.mock.calls.length // スタート押下分
	await act(async () => {
		jest.advanceTimersByTime(TICK_START_MS)
	})
	expect(tapMock.mock.calls.length).toBeGreaterThan(afterStart) // 最初の tick

	const afterFirstTick = tapMock.mock.calls.length
	await act(async () => {
		jest.advanceTimersByTime(3000)
	})
	expect(tapMock.mock.calls.length).toBeGreaterThan(afterFirstTick + 2) // 加速して複数回
})

it('導火線が尽きると爆発し、もう一回で新お題の ready に戻る', async () => {
	const { getByText } = await startGame()
	await act(async () => {
		jest.advanceTimersByTime(FUSE_MIN_MS)
	})
	expect(getByText('💥 今持ってる人の負け！')).toBeTruthy()

	await act(async () => {
		jest.advanceTimersByTime(EXPLOSION_HOLD_MS)
	})
	await act(async () => {
		fireEvent.press(getByText('もう一回'))
	})
	// usedIds に fb-talk-1 が入っているので次は fb-talk-2
	expect(getByText('都道府県の名前')).toBeTruthy()
	expect(getByText('スタート')).toBeTruthy()
})

it('ticking 中に unmount すると爆発もチクタクも発火しない', async () => {
	// jest.getTimerCount() は RN 内部タイマーが混ざるため使わない（event-cutin.test.tsx 慣習）
	const { unmount } = await startGame()
	const soundMock = playSound as jest.Mock
	const tapMock = haptics.tap as jest.Mock
	await unmount()
	const soundsBefore = soundMock.mock.calls.length
	const tapsBefore = tapMock.mock.calls.length
	await act(async () => {
		jest.advanceTimersByTime(FUSE_MIN_MS + 1000)
	})
	expect(soundMock).not.toHaveBeenCalledWith('explosion')
	expect(soundMock.mock.calls.length).toBe(soundsBefore) // tick も発火しない
	expect(tapMock.mock.calls.length).toBe(tapsBefore)
})
