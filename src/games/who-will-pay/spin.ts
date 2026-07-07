// ポインタは真上(12時)固定。セクター i は時計回りに i*sector 〜 (i+1)*sector を占め、
// 中心は (i+0.5)*sector。盤を rotation 度（時計回り）回すと、真上には
// 「元の角 -rotation」の位置が来る。対象セクター中心を真上へ運ぶ回転量を求める。
export function finalAngleForPlayer(playerIndex: number, playerCount: number, turns = 5): number {
	const sector = 360 / playerCount
	const center = (playerIndex + 0.5) * sector
	// 中心角 center を真上(0)へ: rotation ≡ -center (mod 360)。正の全回転を足す。
	const base = (360 - (center % 360)) % 360
	return turns * 360 + base
}

// 真上ポインタが指すセクター index（finalAngle の逆算・検証用）
export function sectorForAngle(angle: number, playerCount: number): number {
	const sector = 360 / playerCount
	// 盤を angle 回した後、真上に来る元の角度 = (-angle) mod 360
	const atTop = ((-angle % 360) + 360) % 360
	return Math.floor(atTop / sector) % playerCount
}

// 盤の細分割: 各プレイヤーの色を何回くり返して並べるか（最低2回）。
// 目標総数 18 を人数で割って丸める。描画（roulette-wheel）と停止角
// （use-digit-roulette）の両方がこの関数を単一の真実として参照する。
export const WHEEL_TARGET_SEGMENTS = 18

export function wheelRepeats(playerCount: number): number {
	return Math.max(2, Math.round(WHEEL_TARGET_SEGMENTS / playerCount))
}
