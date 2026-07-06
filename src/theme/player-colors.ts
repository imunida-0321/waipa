// プレイヤー識別色。index 順に割り当て、13人目以降は循環（MVP は最大12人）
export const PLAYER_COLORS = [
	{ name: '赤', value: '#FF3B5C' },
	{ name: '青', value: '#3B82F6' },
	{ name: '緑', value: '#22C55E' },
	{ name: '黄', value: '#FACC15' },
	{ name: '紫', value: '#A855F7' },
	{ name: 'オレンジ', value: '#FB923C' },
	{ name: 'ピンク', value: '#F472B6' },
	{ name: '水色', value: '#38BDF8' },
	{ name: '黄緑', value: '#A3E635' },
	{ name: 'ゴールド', value: '#EAB308' },
	{ name: 'シルバー', value: '#94A3B8' },
	{ name: '茶', value: '#A16207' },
] as const

export function playerColor(index: number) {
	return PLAYER_COLORS[index % PLAYER_COLORS.length]
}
