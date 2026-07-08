export const TILE_COUNT = 16

export type TileState = 'hidden' | 'safe' | 'solo' | 'all'

export type Board = {
	tiles: TileState[]
	soloIndex: number
	allIndex: number
	exploded: 'solo' | 'all' | null
}

// 爆弾2個（1人負け solo ＋ 全員負け all）を必ず別マスへ配置する。
// rng は [0,1) を返す関数（テストで注入可、既定 Math.random）
export function createBoard(rng: () => number = Math.random): Board {
	const soloIndex = Math.floor(rng() * TILE_COUNT)
	let allIndex = Math.floor(rng() * (TILE_COUNT - 1))
	if (allIndex >= soloIndex) allIndex += 1
	return {
		tiles: Array.from({ length: TILE_COUNT }, () => 'hidden'),
		soloIndex,
		allIndex,
		exploded: null,
	}
}

export type RevealOutcome = 'safe' | 'solo' | 'all' | 'ignored'

// 開封。爆発後・開封済みは ignored を返し board をそのまま返す（冪等）
export function revealTile(
	board: Board,
	index: number,
): { board: Board; outcome: RevealOutcome } {
	if (board.exploded !== null || board.tiles[index] !== 'hidden') {
		return { board, outcome: 'ignored' }
	}
	const kind: Exclude<RevealOutcome, 'ignored'> =
		index === board.soloIndex ? 'solo' : index === board.allIndex ? 'all' : 'safe'
	const tiles = board.tiles.slice()
	tiles[index] = kind
	return {
		board: { ...board, tiles, exploded: kind === 'safe' ? null : kind },
		outcome: kind,
	}
}

export function hiddenCount(board: Board): number {
	return board.tiles.filter((t) => t === 'hidden').length
}
