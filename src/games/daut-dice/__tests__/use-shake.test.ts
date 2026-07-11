import { act, renderHook } from '@testing-library/react-native'
import { Accelerometer } from 'expo-sensors'
import { SHAKE_THRESHOLD_G, useShake } from '../use-shake'

type Listener = (data: { x: number; y: number; z: number }) => void
let listener: Listener | null = null
const mockRemove = jest.fn()

jest.mock('expo-sensors', () => ({
	Accelerometer: {
		isAvailableAsync: jest.fn(async () => true),
		setUpdateInterval: jest.fn(),
		addListener: jest.fn((fn: Listener) => {
			listener = fn
			return { remove: mockRemove }
		}),
	},
}))

beforeEach(() => {
	jest.useFakeTimers()
	listener = null
	jest.clearAllMocks()
})
afterEach(() => {
	jest.useRealTimers()
})

// isAvailableAsync の解決を待って購読させる
async function flush() {
	await act(async () => {
		await Promise.resolve()
	})
}

it('閾値超えの加速度で onShake が発火する', async () => {
	const onShake = jest.fn()
	await renderHook(() => useShake(true, onShake))
	await flush()
	expect(Accelerometer.addListener).toHaveBeenCalled()
	await act(async () => {
		listener?.({ x: SHAKE_THRESHOLD_G + 1, y: 0, z: 0 })
	})
	expect(onShake).toHaveBeenCalledTimes(1)
})

it('閾値未満では発火しない', async () => {
	const onShake = jest.fn()
	await renderHook(() => useShake(true, onShake))
	await flush()
	await act(async () => {
		listener?.({ x: 0.5, y: 0.5, z: 0.5 })
	})
	expect(onShake).not.toHaveBeenCalled()
})

it('クールダウン中は連続発火しない', async () => {
	const onShake = jest.fn()
	await renderHook(() => useShake(true, onShake))
	await flush()
	const strong = { x: SHAKE_THRESHOLD_G + 1, y: 0, z: 0 }
	await act(async () => {
		listener?.(strong)
		listener?.(strong)
	})
	expect(onShake).toHaveBeenCalledTimes(1)
})

it('enabled=false では購読しない', async () => {
	await renderHook(() => useShake(false, jest.fn()))
	await flush()
	expect(Accelerometer.addListener).not.toHaveBeenCalled()
})

it('unmount で購読解除する', async () => {
	const { unmount } = await renderHook(() => useShake(true, jest.fn()))
	await flush()
	await act(async () => {
		unmount()
	})
	expect(mockRemove).toHaveBeenCalled()
})
