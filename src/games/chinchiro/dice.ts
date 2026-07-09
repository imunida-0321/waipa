export const MAX_THROWS = 3
export const SHONBEN_RATE = 0.05

export type HandType = 'pinzoro' | 'arashi' | 'shigoro' | 'me' | 'hifumi' | 'nome'

export type Hand = {
	type: HandType
	/** アラシ=ゾロ目の目 / 目=目の値 / それ以外 0 */
	value: number
	score: number
}

export type Throw = { dice: [number, number, number]; shonben: boolean }

export type Ranked = { playerIndex: number; hand: Hand; isLoser: boolean }

export const NOME: Hand = { type: 'nome', value: 0, score: 10 }

// 1投ぶん: ションベン判定(5%) → 出目3個。rng は [0,1) を返す想定
export function rollThrow(rng: () => number): Throw {
	const shonben = rng() < SHONBEN_RATE
	const die = () => Math.floor(rng() * 6) + 1
	return { dice: [die(), die(), die()], shonben }
}

// 出目から役を判定。null = 役なし（振り直し対象）。非 null は即確定
export function evaluateDice(dice: [number, number, number]): Hand | null {
	const sorted = [...dice].sort((a, b) => a - b)
	const [a, b, c] = sorted
	if (a === b && b === c) {
		if (a === 1) return { type: 'pinzoro', value: 0, score: 1000 }
		return { type: 'arashi', value: a, score: 900 + a }
	}
	if (a === 4 && b === 5 && c === 6) return { type: 'shigoro', value: 0, score: 800 }
	if (a === 1 && b === 2 && c === 3) return { type: 'hifumi', value: 0, score: 0 }
	if (a === b) return { type: 'me', value: c, score: 100 + c }
	if (b === c) return { type: 'me', value: a, score: 100 + a }
	return null
}

// 最終役は「最後の投」で決まる（振り直しは前の役を捨てる）。最後がションベン/役なしなら目なし
export function resolveThrows(throws: Throw[]): Hand {
	const last = throws[throws.length - 1]
	if (!last || last.shonben) return NOME
	return evaluateDice(last.dice) ?? NOME
}

export function handLabel(hand: Hand): string {
	switch (hand.type) {
		case 'pinzoro':
			return 'ピンゾロ！'
		case 'arashi':
			return `アラシ（${hand.value}）！`
		case 'shigoro':
			return 'シゴロ！'
		case 'me':
			return `${hand.value}の目`
		case 'nome':
			return '目なし…'
		case 'hifumi':
			return 'ヒフミ…'
	}
}

// score 降順（同率は playerIndex 昇順）。最小 score は同率含め全員敗者
export function rankPlayers(hands: Hand[]): Ranked[] {
	const entries = hands.map((hand, playerIndex) => ({ playerIndex, hand }))
	const sorted = [...entries].sort(
		(a, b) => b.hand.score - a.hand.score || a.playerIndex - b.playerIndex,
	)
	const worst = sorted[sorted.length - 1]?.hand.score ?? 0
	return sorted.map((e) => ({ ...e, isLoser: e.hand.score === worst }))
}

// 転がり効果音の選択。出目合計の偶奇で2種を切り替える（3個の合計の偶奇は50/50のランダム）
export function rollSoundFor(t: Throw): 'diceRoll1' | 'diceRoll2' {
	return (t.dice[0] + t.dice[1] + t.dice[2]) % 2 === 0 ? 'diceRoll1' : 'diceRoll2'
}
