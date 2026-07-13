// ささやきリミット: ゾーン計算・判定・集計の純関数群（dBFS: -160..0）

export type Rng = () => number

export const ROUNDS = 3
export const MEASURE_MS = 3000
export const CALIBRATION_MS = 3000
export const METER_INTERVAL_MS = 50
export const SILENCE_DB = -160

// 有効音域: floor = clamp(ノイズフロア + 8dB, -45, -20)、ceil = -2dBFS
const FLOOR_MARGIN_DB = 8
const FLOOR_MIN_DB = -45
const FLOOR_MAX_DB = -20
const CEIL_DB = -2

// ゾーン幅（有効音域 0..1 比）。ラウンドが進むほど狭い
export const ZONE_WIDTHS = [0.4, 0.3, 0.22] as const
export const SUDDEN_DEATH_ZONE_WIDTH = 0.15

export type VoiceRange = { floorDb: number; ceilDb: number }
export type Zone = { low: number; high: number }
export type Judgement = 'low' | 'ok' | 'high'

// キャリブレーションのノイズフロア推定。中央値なので乾杯コール等の突発音に強い
export function median(samples: readonly number[]): number {
	if (samples.length === 0) return SILENCE_DB
	const sorted = [...samples].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)
	return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function voiceRange(noiseFloorDb: number): VoiceRange {
	const floorDb = Math.min(Math.max(noiseFloorDb + FLOOR_MARGIN_DB, FLOOR_MIN_DB), FLOOR_MAX_DB)
	return { floorDb, ceilDb: CEIL_DB }
}

export function normalizeDb(db: number, range: VoiceRange): number {
	const t = (db - range.floorDb) / (range.ceilDb - range.floorDb)
	return Math.min(Math.max(t, 0), 1)
}

export function zoneWidthForRound(round: number): number {
	return ZONE_WIDTHS[Math.min(round, ROUNDS) - 1]
}

export function makeZone(width: number, rng: Rng): Zone {
	const low = rng() * (1 - width)
	return { low, high: low + width }
}

export function judge(peakNorm: number, zone: Zone): Judgement {
	if (peakNorm < zone.low) return 'low'
	if (peakNorm > zone.high) return 'high'
	return 'ok'
}

export function tallyLosers(successCounts: readonly number[]): number[] {
	const min = Math.min(...successCounts)
	return successCounts.flatMap((c, i) => (c === min ? [i] : []))
}
