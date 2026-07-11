// 緊張演出の強度。合計が上限帯（21〜30）に近づくほど画面が赤く・バイブが強くなる。
// ストップ解禁（15）から赤みが乗り始め、上限帯の上端（30）で最大になる線形カーブ
export const TENSION_START = 15
export const TENSION_FULL = 30

export function tensionLevel(total: number): number {
	const t = (total - TENSION_START) / (TENSION_FULL - TENSION_START)
	return Math.min(1, Math.max(0, t))
}
