export type DigitSlot = {
	index: number
	char: string
	place: number
	value: number
	playerIndex: number | null
}

export type Rng = () => number

// 合計金額を左（上位桁）から位取り付きスロットに分解する
export function amountToSlots(amount: number): DigitSlot[] {
	const digits = Math.max(0, Math.floor(amount)).toString().split('')
	const n = digits.length
	return digits.map((char, i) => {
		const place = 10 ** (n - 1 - i)
		return { index: i, char, place, value: Number(char) * place, playerIndex: null }
	})
}

// 0 の桁は支払額0なのでスピン不要
export function needsSpin(slot: DigitSlot): boolean {
	return slot.char !== '0'
}

export function assignSlot(slots: DigitSlot[], index: number, playerIndex: number): DigitSlot[] {
	return slots.map((s) => (s.index === index ? { ...s, playerIndex } : s))
}

// 各プレイヤーの支払額（担当桁の位取り額の総和）
export function playerTotals(slots: DigitSlot[], playerCount: number): number[] {
	const totals = new Array(playerCount).fill(0)
	for (const s of slots) {
		if (s.playerIndex !== null && s.playerIndex >= 0 && s.playerIndex < playerCount) {
			totals[s.playerIndex] += s.value
		}
	}
	return totals
}

// 均等乱数で担当プレイヤーを選ぶ
export function pickPlayerIndex(playerCount: number, rng: Rng): number {
	return Math.floor(rng() * playerCount)
}
