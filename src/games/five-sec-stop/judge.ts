export const TARGET_MS = 5000
export const PITTARI_MS = 50
export const GOOD_MS = 200
export const CLOSE_MS = 500

export type Tier = 'pittari' | 'good' | 'close' | 'far'

export type Ranked = {
	playerIndex: number
	ms: number
	deviationMs: number
	tier: Tier
	isLoser: boolean
}

export function deviationMs(ms: number): number {
	return Math.abs(ms - TARGET_MS)
}

// 色分け閾値: ±50=ぴったり賞 / ±200=いい線 / ±500=おしい / それ以上
export function tierOf(ms: number): Tier {
	const d = deviationMs(ms)
	if (d <= PITTARI_MS) return 'pittari'
	if (d <= GOOD_MS) return 'good'
	if (d <= CLOSE_MS) return 'close'
	return 'far'
}

// deviation 昇順（同率は計測順）。最大 deviation は同率含め全員敗者
export function rankRecords(records: number[]): Ranked[] {
	const entries = records.map((ms, playerIndex) => ({
		playerIndex,
		ms,
		deviationMs: deviationMs(ms),
		tier: tierOf(ms),
	}))
	const sorted = [...entries].sort(
		(a, b) => a.deviationMs - b.deviationMs || a.playerIndex - b.playerIndex,
	)
	const worst = sorted[sorted.length - 1]?.deviationMs ?? 0
	return sorted.map((e) => ({ ...e, isLoser: e.deviationMs === worst }))
}

export function formatSeconds(ms: number): string {
	return (ms / 1000).toFixed(2)
}

export function formatDeviation(ms: number): string {
	const diff = ms - TARGET_MS
	if (diff === 0) return '±0.00'
	const sign = diff > 0 ? '+' : '-'
	return `${sign}${(Math.abs(diff) / 1000).toFixed(2)}`
}
