import { act, renderHook } from '@testing-library/react-native'
import { useDrumroll } from '../use-drumroll'

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

jest.useFakeTimers()

it('start で rolling になり、時間経過で revealed になる', async () => {
	const { result } = await renderHook(() => useDrumroll(2000))
	expect(result.current.phase).toBe('idle')
	await act(async () => result.current.start())
	expect(result.current.phase).toBe('rolling')
	await act(async () => jest.advanceTimersByTime(2000))
	expect(result.current.phase).toBe('revealed')
})

it('reset で idle に戻る', async () => {
	const { result } = await renderHook(() => useDrumroll(1000))
	await act(async () => result.current.start())
	await act(async () => jest.advanceTimersByTime(1000))
	await act(async () => result.current.reset())
	expect(result.current.phase).toBe('idle')
})
