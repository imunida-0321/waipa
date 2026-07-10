export type Rng = () => number

export const MIE = 21
export const INITIAL_LIVES = 3

// 強い順の全21宣言: ミエ > ゾロ目（66→11）> 通常目（65→31）
export const DECLARATIONS: readonly number[] = [
	21, 66, 55, 44, 33, 22, 11, 65, 64, 63, 62, 61, 54, 53, 52, 51, 43, 42, 41, 32, 31,
]

// 大きい方を十の位にした2桁の値（3,5 → 53）。2と1 は自然に 21（ミエ）になる
export function normalizeRoll(d1: number, d2: number): number {
	const hi = Math.max(d1, d2)
	const lo = Math.min(d1, d2)
	return hi * 10 + lo
}

// 全順序: 21 → 300 / ゾロ目 dd → 200+d / 通常目 → 2桁値そのまま（大きいほど強い）
export function rank(value: number): number {
	if (value === MIE) return 300
	const hi = Math.floor(value / 10)
	const lo = value % 10
	if (hi === lo) return 200 + hi
	return value
}

export function isStrongerThan(a: number, b: number): boolean {
	return rank(a) > rank(b)
}

// prev より厳密に強い宣言を強い順で返す（ラウンド最初は全件）
export function validDeclarations(prev: number | null): number[] {
	if (prev === null) return [...DECLARATIONS]
	return DECLARATIONS.filter((v) => isStrongerThan(v, prev))
}

// 「宣言が本当」= 実出目の役が宣言と同じか強い（マイヤー準拠）
export function isTruthful(declaration: number, actual: number): boolean {
	return rank(actual) >= rank(declaration)
}

export function rollDice(rng: Rng): { d1: number; d2: number; value: number } {
	const d1 = Math.floor(rng() * 6) + 1
	const d2 = Math.floor(rng() * 6) + 1
	return { d1, d2, value: normalizeRoll(d1, d2) }
}

export function declarationLabel(value: number): string {
	if (value === MIE) return '21（ミエ）'
	const hi = Math.floor(value / 10)
	if (hi === value % 10) return `${value}（ゾロ目）`
	return String(value)
}
