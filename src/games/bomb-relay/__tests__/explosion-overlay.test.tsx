import { act, fireEvent, render } from '@testing-library/react-native'
import { playSound } from '@/lib/sound'
import { EXPLOSION_HOLD_MS, ExplosionOverlay } from '../explosion-overlay'

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
	}
})

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
	jest.clearAllMocks()
})

it('マウント時に敗者宣言と爆発音、ボタンは HOLD 経過後に出る', async () => {
	const onRetry = jest.fn()
	const { getByText, queryByText } = await render(
		<ExplosionOverlay onRetry={onRetry} onHome={jest.fn()} />,
	)
	expect(getByText('💥 今持ってる人の負け！')).toBeTruthy()
	expect(playSound).toHaveBeenCalledWith('explosion')
	expect(queryByText('もう一回')).toBeNull()

	await act(async () => {
		jest.advanceTimersByTime(EXPLOSION_HOLD_MS)
	})
	expect(getByText('もう一回')).toBeTruthy()
	await act(async () => {
		fireEvent.press(getByText('もう一回'))
	})
	expect(onRetry).toHaveBeenCalledTimes(1)
})

it('ホームへ が動く', async () => {
	const onHome = jest.fn()
	const { getByText } = await render(<ExplosionOverlay onRetry={jest.fn()} onHome={onHome} />)
	await act(async () => {
		jest.advanceTimersByTime(EXPLOSION_HOLD_MS)
	})
	await act(async () => {
		fireEvent.press(getByText('ホームへ'))
	})
	expect(onHome).toHaveBeenCalledTimes(1)
})

it('HOLD 前に unmount すると保留タイマーが clear される', async () => {
	// React 19 は unmount 後 setState の警告を出さないため、console.error 監視では
	// cleanup 欠落を検出できない。setTimeout の戻り値を捕まえて clear を直接検証する
	const setSpy = jest.spyOn(global, 'setTimeout')
	const clearSpy = jest.spyOn(global, 'clearTimeout')
	const { unmount } = await render(<ExplosionOverlay onRetry={jest.fn()} onHome={jest.fn()} />)
	const holdIndex = setSpy.mock.calls.findIndex(([, ms]) => ms === EXPLOSION_HOLD_MS)
	expect(holdIndex).toBeGreaterThanOrEqual(0)
	const holdId = setSpy.mock.results[holdIndex].value
	await unmount()
	expect(clearSpy.mock.calls.some(([id]) => id === holdId)).toBe(true)
	setSpy.mockRestore()
	clearSpy.mockRestore()
})
