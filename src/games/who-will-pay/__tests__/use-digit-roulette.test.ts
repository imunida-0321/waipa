import { act, renderHook } from '@testing-library/react-native'
import { withTiming } from 'react-native-reanimated'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { useDigitRoulette } from '../use-digit-roulette'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))
jest.mock('expo-audio', () => ({
	createAudioPlayer: jest.fn(),
}))
jest.mock('@/lib/sound', () => ({
	playSound: jest.fn(),
	registerSound: jest.fn(),
}))
jest.mock('react-native-reanimated', () => {
	// 実際の SharedValue と同じく、再レンダーで参照を維持する
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { useRef } = require('react') as typeof import('react')
	return {
		__esModule: true,
		useSharedValue: (initial: number) => useRef({ value: initial }).current,
		withTiming: jest.fn((toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
		runOnJS: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
	}
})

beforeEach(() => {
	jest.useFakeTimers()
	jest.clearAllMocks()
	jest.spyOn(Math, 'random').mockReturnValue(0.6)
	jest.spyOn(haptics, 'heavy').mockResolvedValue(undefined)
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

it('0桁を飛ばして非0桁だけスピンし、全桁確定で allDone になる', async () => {
	const { result } = await renderHook(() => useDigitRoulette(120, 3)) // 桁: 1,2,0（0はスキップ）
	expect(result.current.currentIndex).toBe(0)
	await act(async () => result.current.spin())
	await act(async () => jest.advanceTimersByTime(4000))
	expect(result.current.currentIndex).toBe(1)
	await act(async () => result.current.spin())
	await act(async () => jest.advanceTimersByTime(4000))
	expect(result.current.allDone).toBe(true) // index2 は '0' なのでスキップ
	const assigned = result.current.slots.filter((s) => s.playerIndex !== null)
	expect(assigned).toHaveLength(2)
})

describe('pending effect の実行タイミング', () => {
	it('回転中の再レンダー・金額・人数変更では再抽選や延長をせず、次の回転で新しい人数を使う', async () => {
		const { result, rerender } = await renderHook(
			({ amount, playerCount }: { amount: number; playerCount: number }) =>
				useDigitRoulette(amount, playerCount),
			{ initialProps: { amount: 120, playerCount: 3 } },
		)
		expect(withTiming).not.toHaveBeenCalled()
		expect(playSound).not.toHaveBeenCalled()
		await act(async () => result.current.spin())
		expect(withTiming).toHaveBeenCalledTimes(1)
		expect(jest.mocked(playSound).mock.calls).toEqual([['spin']])
		await act(async () => jest.advanceTimersByTime(1000))
		await rerender({ amount: 120, playerCount: 3 })
		await rerender({ amount: 990, playerCount: 4 })
		await act(async () => result.current.spin()) // 回転中の GO は無視
		expect(withTiming).toHaveBeenCalledTimes(1)
		await act(async () => jest.advanceTimersByTime(2499))
		expect(result.current.isSpinning).toBe(true)
		expect(result.current.slots[0].playerIndex).toBeNull()
		expect(haptics.heavy).not.toHaveBeenCalled()
		await act(async () => jest.advanceTimersByTime(1))
		expect(result.current.isSpinning).toBe(false)
		expect(result.current.slots[0].playerIndex).toBe(1) // floor(0.6 * 3)
		expect(result.current.currentIndex).toBe(1)
		expect(haptics.heavy).toHaveBeenCalledTimes(1)
		expect(jest.mocked(playSound).mock.calls).toEqual([['spin'], ['reveal']])

		await act(async () => result.current.spin())
		expect(withTiming).toHaveBeenCalledTimes(2)
		await act(async () => jest.advanceTimersByTime(3500))
		expect(result.current.slots.map(({ playerIndex }) => playerIndex)).toEqual([1, 2, null])
		expect(result.current.allDone).toBe(true)
		await rerender({ amount: 990, playerCount: 4 })
		await act(async () => result.current.spin()) // 全桁確定後も GO は無視
		await act(async () => jest.advanceTimersByTime(7000))
		expect(withTiming).toHaveBeenCalledTimes(2)
		expect(haptics.heavy).toHaveBeenCalledTimes(2)
		expect(jest.mocked(playSound).mock.calls).toEqual([
			['spin'],
			['reveal'],
			['spin'],
			['reveal'],
		])
	})

	it('回転途中のアンマウントでは確定時の音・バイブを発火しない', async () => {
		const { result, unmount } = await renderHook(() => useDigitRoulette(10, 3))
		await act(async () => result.current.spin())
		await act(async () => jest.advanceTimersByTime(3499))
		await unmount()
		await act(async () => jest.advanceTimersByTime(7000))
		expect(withTiming).toHaveBeenCalledTimes(1)
		expect(jest.mocked(playSound).mock.calls).toEqual([['spin']])
		expect(haptics.heavy).not.toHaveBeenCalled()
	})
})
