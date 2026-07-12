export type Rng = () => number

export const MINE_MIN = 60
export const MINE_MAX = 95
export const SCORE_MAX = 100

// 地雷位置: 60〜95 の整数を一様ランダムで決める（プレイヤーごとに1個）
export function pickMine(rng: Rng): number {
	return MINE_MIN + Math.floor(rng() * (MINE_MAX - MINE_MIN + 1))
}

// 地雷ちょうども「踏んだ」扱いで爆発（2026-07-13 ブレスト決定）
export function isExploded(score: number, mine: number): boolean {
	return score >= mine
}

// 上方向ドラッグ量(px)をスコア 0〜100 に変換。レイアウト確定前(trackPx<=0)は 0
export function scoreFromDrag(dragPx: number, trackPx: number): number {
	if (trackPx <= 0) return 0
	return Math.min(SCORE_MAX, Math.max(0, Math.round((dragPx / trackPx) * SCORE_MAX)))
}

export type PlayerResult = {
	score: number
	exploded: boolean
}

// 爆発者がいれば爆発者全員、いなければ最低スコア全員（同率含む）が負け
export function decideLosers(results: PlayerResult[]): number[] {
	const exploded = results.flatMap((r, i) => (r.exploded ? [i] : []))
	if (exploded.length > 0) return exploded
	const min = Math.min(...results.map((r) => r.score))
	return results.flatMap((r, i) => (r.score === min ? [i] : []))
}
