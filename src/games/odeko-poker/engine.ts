/** [0, 1) を返す（Math.random 互換）。1 ちょうどを返す実装は不可 */
export type Rng = () => number

export const CARD_MAX = 13

export type Declaration = 'fight' | 'fold'
export type Outcome = 'normal' | 'solo-fight' | 'all-fold'

export type Judgement = {
	outcome: Outcome
	/** 負け（飲む人）。normal は勝負者中の最弱1人、all-fold は全員、solo-fight は空 */
	loserIndices: number[]
	/** solo-fight の一人勝ち index（それ以外は null） */
	winnerIndex: number | null
	/** その回の最強カードで降りた人（いなければ null）。outcome に関係なく判定する */
	hetareIndex: number | null
}

// 1〜13 をシャッフルして先頭 playerCount 枚を配る（重複なし）
export function dealCards(playerCount: number, rng: Rng): number[] {
	const deck = Array.from({ length: CARD_MAX }, (_, i) => i + 1)
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[deck[i], deck[j]] = [deck[j], deck[i]]
	}
	return deck.slice(0, playerCount)
}

export function judge(cards: number[], declarations: Declaration[]): Judgement {
	const fighters = declarations.map((d, i) => (d === 'fight' ? i : -1)).filter((i) => i >= 0)

	const strongestIndex = cards.indexOf(Math.max(...cards))
	const hetareIndex = declarations[strongestIndex] === 'fold' ? strongestIndex : null

	if (fighters.length === 0) {
		return {
			outcome: 'all-fold',
			loserIndices: cards.map((_, i) => i),
			winnerIndex: null,
			hetareIndex,
		}
	}
	if (fighters.length === 1) {
		return { outcome: 'solo-fight', loserIndices: [], winnerIndex: fighters[0], hetareIndex }
	}
	const weakest = fighters.reduce((min, i) => (cards[i] < cards[min] ? i : min), fighters[0])
	return { outcome: 'normal', loserIndices: [weakest], winnerIndex: null, hetareIndex }
}
