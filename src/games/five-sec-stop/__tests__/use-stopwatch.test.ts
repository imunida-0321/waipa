import { act, renderHook } from '@testing-library/react-native'
import { STOP_GUARD_MS, useStopwatch } from '../use-stopwatch'

// modern fake timers は Date.now も進めるので、advanceTimersByTime だけで計測を再現できる
beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

it('start から stop までの経過 ms を返す', () => {
	const { result } = renderHook(() => useStopwatch())
	act(() => result.current.start())
	act(() => jest.advanceTimersByTime(5320))
	let ms: number | null = null
	act(() => {
		ms = result.current.stop()
	})
	expect(ms).toBe(5320)
	expect(result.current.running).toBe(false)
})

it('displayMs が計測中に更新される', () => {
	const { result } = renderHook(() => useStopwatch())
	act(() => result.current.start())
	act(() => jest.advanceTimersByTime(1000))
	expect(result.current.displayMs).toBeGreaterThanOrEqual(984)
	expect(result.current.displayMs).toBeLessThanOrEqual(1000)
})

it(`start 後 ${STOP_GUARD_MS}ms 未満の stop は無効（null を返し計測継続）`, () => {
	const { result } = renderHook(() => useStopwatch())
	act(() => result.current.start())
	act(() => jest.advanceTimersByTime(STOP_GUARD_MS - 1))
	let ms: number | null = 0
	act(() => {
		ms = result.current.stop()
	})
	expect(ms).toBeNull()
	expect(result.current.running).toBe(true)
	// ガードを越えれば止められる
	act(() => jest.advanceTimersByTime(5000))
	act(() => {
		ms = result.current.stop()
	})
	expect(ms).toBe(STOP_GUARD_MS - 1 + 5000)
})

it('reset で初期状態に戻る', () => {
	const { result } = renderHook(() => useStopwatch())
	act(() => result.current.start())
	act(() => jest.advanceTimersByTime(2000))
	act(() => result.current.reset())
	expect(result.current.displayMs).toBe(0)
	expect(result.current.running).toBe(false)
})
