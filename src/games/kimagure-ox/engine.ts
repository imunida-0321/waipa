export type Mark = 'o' | 'x'
export type Cell = Mark | null
export type Board = readonly Cell[] // 長さ9
export type Winner = Mark | 'draw' | null

const LINES = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6],
] as const

export function emptyBoard(): Board {
	return Array<Cell>(9).fill(null)
}

export function canPlace(board: Board, blocked: number | null, index: number): boolean {
	return index >= 0 && index < 9 && index !== blocked && board[index] === null
}

export function place(board: Board, index: number, mark: Mark): Board {
	const next = [...board]
	next[index] = mark
	return next
}

function hasLine(board: Board, mark: Mark): boolean {
	return LINES.some((line) => line.every((i) => board[i] === mark))
}

// イベント（シャッフル等）の直後にも呼ばれるため、両者同時3並び＝draw を明示的に扱う
export function judge(board: Board, blocked: number | null): Winner {
	const o = hasLine(board, 'o')
	const x = hasLine(board, 'x')
	if (o && x) return 'draw'
	if (o) return 'o'
	if (x) return 'x'
	const full = board.every((cell, i) => cell !== null || i === blocked)
	return full ? 'draw' : null
}
