export type Rng = () => number

export const FUSE_MIN_MS = 10000
export const FUSE_MAX_MS = 45000
export const TICK_START_MS = 700
export const TICK_END_MS = 140

// 導火線: 10〜45秒のランダム。残り時間は UI に一切出さない
export function pickFuseMs(rng: Rng): number {
	return FUSE_MIN_MS + rng() * (FUSE_MAX_MS - FUSE_MIN_MS)
}

// チクタク間隔: 進行率の2乗で 700ms → 140ms へ加速（単調減少・下限クランプ）
export function nextTickDelay(elapsedMs: number, fuseMs: number): number {
	if (fuseMs <= 0) return TICK_END_MS
	const progress = Math.min(1, Math.max(0, elapsedMs / fuseMs))
	return TICK_START_MS + (TICK_END_MS - TICK_START_MS) * progress * progress
}
