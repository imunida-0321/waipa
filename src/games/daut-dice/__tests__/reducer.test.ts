import { INITIAL_LIVES, MIE } from '../engine'
import { initialState, reduce, type GameState } from '../reducer'

// 3人プレイ・出目を固定して roll する（rng 2連続値で d1,d2 を制御）
function rollWith(state: GameState, d1: number, d2: number): GameState {
	const seq = [(d1 - 1) / 6 + 0.001, (d2 - 1) / 6 + 0.001]
	let i = 0
	return reduce(state, { type: 'roll', rng: () => seq[i++] })
}

// roll → peek → declare(value) → handover → respond まで進める
function declareFlow(state: GameState, d1: number, d2: number, value: number): GameState {
	let s = rollWith(state, d1, d2)
	s = reduce(s, { type: 'toDeclare' })
	s = reduce(s, { type: 'declare', value })
	return reduce(s, { type: 'handedOver' })
}

describe('initialState', () => {
	it('3人・全員ライフ3・roll フェーズ・先手は0番', () => {
		const s = initialState(3)
		expect(s.phase).toBe('roll')
		expect(s.lives).toEqual([3, 3, 3])
		expect(s.turnIndex).toBe(0)
		expect(s.prevDeclaration).toBeNull()
		expect(INITIAL_LIVES).toBe(3)
	})
})

describe('roll → peek → declare → handover → respond', () => {
	it('roll で実出目がセットされ peek へ（rollId が進む）', () => {
		const s = rollWith(initialState(3), 3, 5)
		expect(s.phase).toBe('peek')
		expect(s.actualRoll).toEqual({ d1: 3, d2: 5, value: 53 })
		expect(s.rollId).toBe(1)
	})

	it('declare で宣言が記録され手番が次へ・respond 向け handover', () => {
		let s = rollWith(initialState(3), 3, 5)
		s = reduce(s, { type: 'toDeclare' })
		s = reduce(s, { type: 'declare', value: 54 }) // 実出目と違ってよい（ブラフ）
		expect(s.phase).toBe('handover')
		expect(s.handoverNext).toBe('respond')
		expect(s.prevDeclaration).toBe(54)
		expect(s.prevDeclarerIndex).toBe(0)
		expect(s.turnIndex).toBe(1)
		const s2 = reduce(s, { type: 'handedOver' })
		expect(s2.phase).toBe('respond')
	})

	it('直前以下の宣言は無効（state 不変）', () => {
		let s = declareFlow(initialState(3), 3, 5, 54)
		s = reduce(s, { type: 'believe' })
		s = rollWith(s, 3, 1)
		s = reduce(s, { type: 'toDeclare' })
		const before = s
		expect(reduce(s, { type: 'declare', value: 54 })).toBe(before) // 同値
		expect(reduce(s, { type: 'declare', value: 31 })).toBe(before) // 弱い
	})
})

describe('believe（信じて振る）', () => {
	it('応答者がそのまま roll フェーズへ・宣言は維持', () => {
		let s = declareFlow(initialState(3), 3, 5, 54)
		s = reduce(s, { type: 'believe' })
		expect(s.phase).toBe('roll')
		expect(s.turnIndex).toBe(1)
		expect(s.prevDeclaration).toBe(54)
	})
})

describe('doubt（ダウト）', () => {
	it('嘘（宣言66・実出目53）→ 宣言者がライフ-1', () => {
		let s = declareFlow(initialState(3), 3, 5, 66)
		s = reduce(s, { type: 'doubt' })
		expect(s.phase).toBe('reveal')
		expect(s.reveal).toEqual({ wasBluff: true, lifeLoserIndex: 0 })
		expect(s.lives).toEqual([2, 3, 3])
	})

	it('本当ちょうど（宣言53・実出目53）→ ダウト側がライフ-1', () => {
		let s = declareFlow(initialState(3), 3, 5, 53)
		s = reduce(s, { type: 'doubt' })
		expect(s.reveal).toEqual({ wasBluff: false, lifeLoserIndex: 1 })
		expect(s.lives).toEqual([3, 2, 3])
	})

	it('実出目が宣言を上回る（宣言53・実出目ゾロ目44）→ 本当扱い', () => {
		let s = declareFlow(initialState(3), 4, 4, 53)
		s = reduce(s, { type: 'doubt' })
		expect(s.reveal?.wasBluff).toBe(false)
	})

	it('21 宣言で実出目 21 → 本当（ダウト側-1）', () => {
		let s = declareFlow(initialState(3), 2, 1, MIE)
		s = reduce(s, { type: 'doubt' })
		expect(s.reveal?.wasBluff).toBe(false)
	})
})

describe('revealDone → 続行 / 終了', () => {
	it('続行（嘘）: 宣言者がライフを失う→ 手番を渡すため handover 経由', () => {
		let s = declareFlow(initialState(3), 3, 5, 66)
		s = reduce(s, { type: 'doubt' }) // 0番（宣言者）がライフ-1、いま手元にあるのは1番
		expect(s.reveal).toEqual({ wasBluff: true, lifeLoserIndex: 0 })
		s = reduce(s, { type: 'revealDone' })
		expect(s.phase).toBe('handover')
		expect(s.handoverNext).toBe('roll')
		expect(s.turnIndex).toBe(0)
		expect(s.prevDeclaration).toBeNull()
		expect(s.actualRoll).toBeNull()
		expect(s.reveal).toBeNull()
	})

	it('続行（本当）: 応答者自身がライフを失う→ 自己手渡しをスキップして直接 roll', () => {
		let s = declareFlow(initialState(3), 3, 5, 53)
		s = reduce(s, { type: 'doubt' }) // 1番（応答者＝いま手元にある人）がライフ-1
		expect(s.reveal).toEqual({ wasBluff: false, lifeLoserIndex: 1 })
		expect(s.turnIndex).toBe(1)
		s = reduce(s, { type: 'revealDone' })
		expect(s.phase).toBe('roll')
		expect(s.turnIndex).toBe(1)
		expect(s.prevDeclaration).toBeNull()
		expect(s.actualRoll).toBeNull()
		expect(s.reveal).toBeNull()
	})

	it('ライフ0 → loserIndex 確定・result へ', () => {
		let s = initialState(3)
		// 0番が3回連続で嘘ダウトされる
		for (let i = 0; i < 3; i++) {
			s = declareFlow(s, 3, 5, 66)
			s = reduce(s, { type: 'doubt' })
			if (i < 2) {
				s = reduce(s, { type: 'revealDone' })
				s = reduce(s, { type: 'handedOver' }) // 0番の roll へ
			}
		}
		expect(s.lives[0]).toBe(0)
		expect(s.loserIndex).toBe(0)
		s = reduce(s, { type: 'revealDone' })
		expect(s.phase).toBe('result')
	})
})

describe('retry（もう一回）', () => {
	it('ライフ全回復・敗者が先手・roll 向け handover', () => {
		let s = initialState(3)
		for (let i = 0; i < 3; i++) {
			s = declareFlow(s, 3, 5, 66)
			s = reduce(s, { type: 'doubt' })
			s = reduce(s, { type: 'revealDone' })
			if (i < 2) s = reduce(s, { type: 'handedOver' })
		}
		expect(s.phase).toBe('result')
		s = reduce(s, { type: 'retry' })
		expect(s.phase).toBe('handover')
		expect(s.handoverNext).toBe('roll')
		expect(s.turnIndex).toBe(0) // 敗者（0番）が先手
		expect(s.lives).toEqual([3, 3, 3])
		expect(s.loserIndex).toBeNull()
	})
})

describe('フェーズガード', () => {
	it('誤フェーズのアクションは state 不変（同一参照）', () => {
		const s = initialState(3)
		expect(reduce(s, { type: 'doubt' })).toBe(s)
		expect(reduce(s, { type: 'believe' })).toBe(s)
		expect(reduce(s, { type: 'revealDone' })).toBe(s)
		expect(reduce(s, { type: 'retry' })).toBe(s)
		expect(reduce(s, { type: 'declare', value: 53 })).toBe(s)
	})
})
