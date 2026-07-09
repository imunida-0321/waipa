import { useCallback, useEffect, useRef, useState } from 'react'

export const STOP_GUARD_MS = 300
export const HIDE_START_MS = 2500
export const HIDE_END_MS = 3000

const TICK_MS = 16

// 記録はストップ時の Date.now() 差分で確定する（表示 interval のフレーム落ちに依存しない）
export function useStopwatch() {
	const [displayMs, setDisplayMs] = useState(0)
	const [running, setRunning] = useState(false)
	const startedAt = useRef(0)
	const interval = useRef<ReturnType<typeof setInterval> | null>(null)

	const clear = useCallback(() => {
		if (interval.current) {
			clearInterval(interval.current)
			interval.current = null
		}
	}, [])

	const start = useCallback(() => {
		clear()
		startedAt.current = Date.now()
		setDisplayMs(0)
		setRunning(true)
		interval.current = setInterval(() => {
			setDisplayMs(Date.now() - startedAt.current)
		}, TICK_MS)
	}, [clear])

	const stop = useCallback((): number | null => {
		const ms = Date.now() - startedAt.current
		if (ms < STOP_GUARD_MS) return null // スタート直後の誤爆は無視
		clear()
		setRunning(false)
		setDisplayMs(ms)
		return ms
	}, [clear])

	const reset = useCallback(() => {
		clear()
		setRunning(false)
		setDisplayMs(0)
	}, [clear])

	useEffect(() => () => clear(), [clear])

	return { displayMs, running, start, stop, reset }
}
