import {
	FUSE_MAX_MS,
	FUSE_MIN_MS,
	TICK_END_MS,
	TICK_START_MS,
	nextTickDelay,
	pickFuseMs,
} from '../engine'

describe('pickFuseMs', () => {
	it('rng=0 で下限 10000ms', () => {
		expect(pickFuseMs(() => 0)).toBe(FUSE_MIN_MS)
	})

	it('rng が 1 に近いとき上限 45000ms 未満に収まる', () => {
		const fuse = pickFuseMs(() => 0.9999999)
		expect(fuse).toBeLessThan(FUSE_MAX_MS)
		expect(fuse).toBeGreaterThan(FUSE_MAX_MS - 10)
	})

	it('中間値: rng=0.5 で 27500ms', () => {
		expect(pickFuseMs(() => 0.5)).toBe(27500)
	})
})

describe('nextTickDelay', () => {
	const FUSE = 10000

	it('開始時は TICK_START_MS', () => {
		expect(nextTickDelay(0, FUSE)).toBe(TICK_START_MS)
	})

	it('導火線が尽きる時点で TICK_END_MS', () => {
		expect(nextTickDelay(FUSE, FUSE)).toBe(TICK_END_MS)
	})

	it('進行率の2乗で加速する（中間点は線形より遅い減少）', () => {
		// progress=0.5 → 700 + (140-700)*0.25 = 560
		expect(nextTickDelay(FUSE / 2, FUSE)).toBe(560)
	})

	it('単調減少（後の時刻ほど間隔が短い）', () => {
		let prev = Number.POSITIVE_INFINITY
		for (let t = 0; t <= FUSE; t += 500) {
			const d = nextTickDelay(t, FUSE)
			expect(d).toBeLessThanOrEqual(prev)
			prev = d
		}
	})

	it('elapsed が fuse を超えても TICK_END_MS で下限クランプ', () => {
		expect(nextTickDelay(FUSE * 2, FUSE)).toBe(TICK_END_MS)
	})

	it('負の elapsed は TICK_START_MS 扱い', () => {
		expect(nextTickDelay(-100, FUSE)).toBe(TICK_START_MS)
	})

	it('fuse=0 などの異常入力は TICK_END_MS を返す', () => {
		expect(nextTickDelay(0, 0)).toBe(TICK_END_MS)
		expect(nextTickDelay(100, -5)).toBe(TICK_END_MS)
	})
})
