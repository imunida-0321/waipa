import { canPlace, emptyBoard, judge, place, type Cell } from '../engine'

// 'o.x......' 形式の文字列から盤面を作るヘルパ（. は空きマス）
const B = (s: string): Cell[] => [...s].map((c) => (c === 'o' ? 'o' : c === 'x' ? 'x' : null))

describe('emptyBoard', () => {
	it('9マスすべて null', () => {
		expect(emptyBoard()).toEqual(Array(9).fill(null))
	})
})

describe('canPlace', () => {
	it('空きマスには置ける', () => {
		expect(canPlace(emptyBoard(), null, 0)).toBe(true)
	})
	it('使用済みマスには置けない', () => {
		expect(canPlace(B('o........'), null, 0)).toBe(false)
	})
	it('封鎖マスには置けない', () => {
		expect(canPlace(emptyBoard(), 4, 4)).toBe(false)
	})
	it('範囲外には置けない', () => {
		expect(canPlace(emptyBoard(), null, -1)).toBe(false)
		expect(canPlace(emptyBoard(), null, 9)).toBe(false)
	})
})

describe('place', () => {
	it('新しい盤面を返し、元の盤面は変更しない', () => {
		const before = emptyBoard()
		const after = place(before, 4, 'o')
		expect(after[4]).toBe('o')
		expect(before[4]).toBeNull()
	})
})

describe('judge', () => {
	it('横の3並びで勝ち', () => {
		expect(judge(B('ooo.xx.x.'), null)).toBe('o')
	})
	it('縦の3並びで勝ち', () => {
		expect(judge(B('x.ox.ox..'), null)).toBe('x')
	})
	it('斜めの3並びで勝ち', () => {
		expect(judge(B('o.x.o.x.o'), null)).toBe('o')
	})
	it('両者同時に3並びなら draw（シャッフル後に起こりうる）', () => {
		expect(judge(B('oooxxx...'), null)).toBe('draw')
	})
	it('全マス埋まりで勝者なしなら draw', () => {
		expect(judge(B('oxoxxooox'), null)).toBe('draw')
	})
	it('封鎖マス以外が埋まっていれば draw（封鎖マスは埋まった扱い）', () => {
		expect(judge(B('oxox.ooox'), 4)).toBe('draw')
	})
	it('勝敗未決なら null', () => {
		expect(judge(B('ox.......'), null)).toBeNull()
		expect(judge(B('oxox.ooox'), null)).toBeNull() // 4 が空きで封鎖もなし
	})
})
