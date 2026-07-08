import { createBoard, hiddenCount, revealTile, TILE_COUNT } from '../board'

describe('createBoard', () => {
	it('16タイル全部 hidden で始まる', () => {
		const b = createBoard()
		expect(b.tiles).toHaveLength(TILE_COUNT)
		expect(b.tiles.every((t) => t === 'hidden')).toBe(true)
		expect(b.exploded).toBeNull()
	})

	it('爆弾2個は必ず異なるマスに置かれる', () => {
		for (let i = 0; i < 200; i++) {
			const b = createBoard()
			expect(b.soloIndex).not.toBe(b.allIndex)
			expect(b.soloIndex).toBeGreaterThanOrEqual(0)
			expect(b.soloIndex).toBeLessThan(TILE_COUNT)
			expect(b.allIndex).toBeGreaterThanOrEqual(0)
			expect(b.allIndex).toBeLessThan(TILE_COUNT)
		}
	})

	it('rng 注入で配置を固定できる（衝突時は後者がずれる）', () => {
		// rng が同じ値を返しても allIndex は soloIndex を避ける
		const b = createBoard(() => 0)
		expect(b.soloIndex).toBe(0)
		expect(b.allIndex).toBe(1)
	})
})

describe('revealTile', () => {
	// solo=0, all=1 の盤面
	const fixed = () => createBoard(() => 0)

	it('セーフのマスを開けると safe になり残数が減る', () => {
		const { board, outcome } = revealTile(fixed(), 5)
		expect(outcome).toBe('safe')
		expect(board.tiles[5]).toBe('safe')
		expect(board.exploded).toBeNull()
		expect(hiddenCount(board)).toBe(TILE_COUNT - 1)
	})

	it('1人負け爆弾で solo、盤面は exploded になる', () => {
		const { board, outcome } = revealTile(fixed(), 0)
		expect(outcome).toBe('solo')
		expect(board.tiles[0]).toBe('solo')
		expect(board.exploded).toBe('solo')
	})

	it('全員負け爆弾で all', () => {
		const { board, outcome } = revealTile(fixed(), 1)
		expect(outcome).toBe('all')
		expect(board.exploded).toBe('all')
	})

	it('開封済みマスの再タップは ignored（冪等）', () => {
		const first = revealTile(fixed(), 5)
		const second = revealTile(first.board, 5)
		expect(second.outcome).toBe('ignored')
		expect(second.board).toBe(first.board)
	})

	it('爆発後はどのマスも ignored', () => {
		const exploded = revealTile(fixed(), 0)
		const after = revealTile(exploded.board, 5)
		expect(after.outcome).toBe('ignored')
	})

	it('元の board オブジェクトは変更しない（イミュータブル）', () => {
		const b = fixed()
		revealTile(b, 5)
		expect(b.tiles[5]).toBe('hidden')
	})
})
