import type { Board, Mark } from './engine'

export type EventId = 'shuffle' | 'block' | 'vanish' | 'double'
export type Rng = () => number // [0, 1)。テストでは固定値を注入する

export const EVENT_META: Record<EventId, { name: string; emoji: string }> = {
	shuffle: { name: 'マスシャッフル', emoji: '🔀' },
	block: { name: '1マス封鎖', emoji: '🚧' },
	vanish: { name: '駒消滅', emoji: '💨' },
	double: { name: 'ダブル手番', emoji: '⚡' },
}

export const EVENT_CHANCE = 0.3
export const MIN_MOVES_BEFORE_EVENT = 3 // 3手目の着手後から抽選対象

const ALL_EVENTS: readonly EventId[] = ['shuffle', 'block', 'vanish', 'double']

function pieceIndexes(board: Board): number[] {
	return board.flatMap((cell, i) => (cell !== null ? [i] : []))
}

function emptyIndexes(board: Board, blocked: number | null): number[] {
	return board.flatMap((cell, i) => (cell === null && i !== blocked ? [i] : []))
}

export function applicableEvents(board: Board, blocked: number | null): EventId[] {
	return ALL_EVENTS.filter((id) => {
		if (id === 'shuffle') return pieceIndexes(board).length >= 2
		if (id === 'block') return blocked === null && emptyIndexes(board, blocked).length >= 2
		if (id === 'vanish') return pieceIndexes(board).length >= 1
		return true // double は常に適用可能
	})
}

type PickArgs = {
	board: Board
	blocked: number | null
	moveCount: number
	lastEvent: EventId | null
	rng: Rng
}

export function pickEvent({ board, blocked, moveCount, lastEvent, rng }: PickArgs): EventId | null {
	if (moveCount < MIN_MOVES_BEFORE_EVENT) return null
	if (rng() >= EVENT_CHANCE) return null
	const candidates = applicableEvents(board, blocked).filter((id) => id !== lastEvent)
	if (candidates.length === 0) return null
	return candidates[Math.floor(rng() * candidates.length)]
}

export type EventResult = {
	board: Board
	blocked: number | null
	extraMoves: number
}

export function applyEvent(
	id: EventId,
	board: Board,
	blocked: number | null,
	rng: Rng,
): EventResult {
	if (id === 'shuffle')
		return { board: shuffleBoard(board, blocked, rng), blocked, extraMoves: 0 }
	if (id === 'block') {
		const empties = emptyIndexes(board, blocked)
		return { board, blocked: empties[Math.floor(rng() * empties.length)], extraMoves: 0 }
	}
	if (id === 'vanish') {
		const pieces = pieceIndexes(board)
		const target = pieces[Math.floor(rng() * pieces.length)]
		const next = [...board]
		next[target] = null
		return { board: next, blocked, extraMoves: 0 }
	}
	return { board, blocked, extraMoves: 1 } // double
}

// 駒を封鎖マス以外へランダム再配置（配置先は Fisher–Yates で決める）
function shuffleBoard(board: Board, blocked: number | null, rng: Rng): Board {
	const marks = pieceIndexes(board).map((i) => board[i] as Mark)
	const slots = board.map((_, i) => i).filter((i) => i !== blocked)
	for (let i = slots.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[slots[i], slots[j]] = [slots[j], slots[i]]
	}
	const next: (Mark | null)[] = Array(9).fill(null)
	marks.forEach((mark, k) => {
		next[slots[k]] = mark
	})
	return next
}
