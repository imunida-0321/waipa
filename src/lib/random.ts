/** [0, 1) を返す。1 ちょうどを返す実装は不可 */
export type Rng = () => number

// 呼び出しの都度評価し、インポート後の spy による差し替えも反映する
export const defaultRng: Rng = () => Math.random()

export function pickRandom<T>(items: readonly T[], rng: Rng = defaultRng): T | undefined {
	if (items.length === 0) return undefined
	return items[Math.floor(rng() * items.length)]
}
