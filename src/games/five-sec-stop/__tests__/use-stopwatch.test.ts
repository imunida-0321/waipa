import { act, renderHook } from '@testing-library/react-native'
import { STOP_GUARD_MS, useStopwatch } from '../use-stopwatch'

// modern fake timers は Date.now も進めるので、advanceTimersByTime だけで計測を再現できる
beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

it('start から stop までの経過 ms を返す', async () => {
	const { result } = await renderHook(() => useStopwatch())
	await act(async () => {
		result.current.start()
	})
	await act(async () => {
		jest.advanceTimersByTime(5320)
	})
	let ms: number | null = null
	await act(async () => {
		ms = result.current.stop()
	})
	expect(ms).toBe(5320)
	expect(result.current.running).toBe(false)
})

it('displayMs が計測中に更新される', async () => {
	const { result } = await renderHook(() => useStopwatch())
	await act(async () => {
		result.current.start()
	})
	await act(async () => {
		jest.advanceTimersByTime(1000)
	})
	expect(result.current.displayMs).toBeGreaterThanOrEqual(984)
	expect(result.current.displayMs).toBeLessThanOrEqual(1000)
})

it(`start 後 ${STOP_GUARD_MS}ms 未満の stop は無効（null を返し計測継続）`, async () => {
	const { result } = await renderHook(() => useStopwatch())
	await act(async () => {
		result.current.start()
	})
	await act(async () => {
		jest.advanceTimersByTime(STOP_GUARD_MS - 1)
	})
	let ms: number | null = 0
	await act(async () => {
		ms = result.current.stop()
	})
	expect(ms).toBeNull()
	expect(result.current.running).toBe(true)
	// ガードを越えれば止められる
	await act(async () => {
		jest.advanceTimersByTime(5000)
	})
	await act(async () => {
		ms = result.current.stop()
	})
	expect(ms).toBe(STOP_GUARD_MS - 1 + 5000)
})

it('reset で初期状態に戻る', async () => {
	const { result } = await renderHook(() => useStopwatch())
	await act(async () => {
		result.current.start()
	})
	await act(async () => {
		jest.advanceTimersByTime(2000)
	})
	await act(async () => {
		result.current.reset()
	})
	expect(result.current.displayMs).toBe(0)
	expect(result.current.running).toBe(false)
})
