// ホームカードの人数バッジ表示用整形（例: 2人 / 2〜8人）
export function formatPlayerCount(min: number, max: number): string {
	return min === max ? `${min}人` : `${min}〜${max}人`
}
