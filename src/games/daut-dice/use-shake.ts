import { useEffect, useRef } from 'react'
import { Accelerometer } from 'expo-sensors'

export const SHAKE_THRESHOLD_G = 1.8
export const SHAKE_COOLDOWN_MS = 1200
const UPDATE_INTERVAL_MS = 120

// 端末シェイクの検出。enabled の間だけ購読し、合成加速度が閾値を超えたら
// onShake を発火（クールダウン付き）。センサー不可（Web 等）では何もしない
export function useShake(enabled: boolean, onShake: () => void) {
	const onShakeRef = useRef(onShake)
	useEffect(() => {
		onShakeRef.current = onShake
	}, [onShake])

	useEffect(() => {
		if (!enabled) return
		let cancelled = false
		let sub: { remove: () => void } | null = null
		let lastFired = 0
		Accelerometer.isAvailableAsync()
			.then((available) => {
				if (!available || cancelled) return
				Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS)
				sub = Accelerometer.addListener(({ x, y, z }) => {
					const g = Math.sqrt(x * x + y * y + z * z)
					const now = Date.now()
					if (g > SHAKE_THRESHOLD_G && now - lastFired > SHAKE_COOLDOWN_MS) {
						lastFired = now
						onShakeRef.current()
					}
				})
			})
			.catch(() => {
				// センサー取得失敗は無視（タップフォールバックで動作）
			})
		return () => {
			cancelled = true
			sub?.remove()
		}
	}, [enabled])
}
