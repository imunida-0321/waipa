import { act, renderHook } from '@testing-library/react-native'
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
jest.mock('react-native-reanimated', () => ({
	__esModule: true,
	useSharedValue: jest.fn((initial: number) => ({ value: initial })),
	withTiming: jest.fn((toValue: number) => toValue),
	Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
	runOnJS: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
}))
jest.useFakeTimers()

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
