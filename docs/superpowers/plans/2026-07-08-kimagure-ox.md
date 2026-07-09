# きまぐれ◯× (Issue #12) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3×3の◯×ゲームに「きまぐれイベント」4種（マスシャッフル/1マス封鎖/駒消滅/ダブル手番）がランダム発生する2人対戦ゲームを実装する。

**Architecture:** 純粋関数エンジン（engine.ts / events.ts / reducer.ts、乱数は引数注入）＋ useReducer で状態管理する UI（board.tsx / event-cutin.tsx / kimagure-ox-game.tsx）。who-will-pay と同じ構成。仕様は `docs/superpowers/specs/2026-07-08-kimagure-ox-design.md`。

**Tech Stack:** Expo (React Native) / TypeScript / react-native-reanimated 4.5 / Jest + @testing-library/react-native

## Global Constraints

- ブランチ `feature/12-kimagure-ox` を develop から切る。PR は develop 宛。
- コードスタイル: タブインデント・セミコロンなし・シングルクォート（プロジェクトの prettier 設定に従う）。コメントは日本語で「コードから読めない制約」だけを書く。
- パスエイリアス: `@/` = `src/`。
- `.env` 系ファイルは絶対に読まない（PreToolUse フックが強制）。
- テスト実行: `npx jest <path>`。全テストは `npm test`。型チェック `npm run typecheck`。
- 効果音は `playSound('event')` を呼ぶが音源未登録のため無音でよい（sound.ts が無音スキップする仕様）。音源追加はスコープ外。
- プレイヤー登録連携はしない（`requiresPlayers` を付けない）。◯と×のみ。

---

### Task 1: engine.ts — 盤面・着手・勝敗判定の純粋関数

**Files:**
- Create: `src/games/kimagure-ox/engine.ts`
- Test: `src/games/kimagure-ox/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: なし（最初のタスク）
- Produces: `type Mark = 'o' | 'x'` / `type Cell = Mark | null` / `type Board = readonly Cell[]`（長さ9） / `type Winner = Mark | 'draw' | null` / `emptyBoard(): Board` / `canPlace(board, blocked: number | null, index: number): boolean` / `place(board, index, mark): Board` / `judge(board, blocked: number | null): Winner`

- [ ] **Step 0: ブランチ作成**

```bash
git checkout develop && git pull && git checkout -b feature/12-kimagure-ox
```

- [ ] **Step 1: 失敗するテストを書く**

`src/games/kimagure-ox/__tests__/engine.test.ts`:

```ts
import { canPlace, emptyBoard, judge, place, type Cell } from '../engine'

// 'o.x......' 形式の文字列から盤面を作るヘルパ（. は空きマス）
const B = (s: string): Cell[] =>
	[...s].map((c) => (c === 'o' ? 'o' : c === 'x' ? 'x' : null))

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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/kimagure-ox`
Expected: FAIL（`../engine` が存在しない）

- [ ] **Step 3: engine.ts を実装**

`src/games/kimagure-ox/engine.ts`:

```ts
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
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/kimagure-ox`
Expected: PASS（全ケース green）

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/games/kimagure-ox
git add src/games/kimagure-ox
git commit -m "feat: きまぐれ◯× の盤面エンジンを追加 (#12)"
```

---

### Task 2: events.ts — きまぐれイベント4種の定義・抽選・適用

**Files:**
- Create: `src/games/kimagure-ox/events.ts`
- Test: `src/games/kimagure-ox/__tests__/events.test.ts`

**Interfaces:**
- Consumes: Task 1 の `Board` / `Mark`
- Produces: `type EventId = 'shuffle' | 'block' | 'vanish' | 'double'` / `type Rng = () => number` / `EVENT_META: Record<EventId, { name: string; emoji: string }>` / `EVENT_CHANCE = 0.3` / `MIN_MOVES_BEFORE_EVENT = 3` / `applicableEvents(board, blocked): EventId[]` / `pickEvent({ board, blocked, moveCount, lastEvent, rng }): EventId | null` / `type EventResult = { board: Board; blocked: number | null; extraMoves: number }` / `applyEvent(id, board, blocked, rng): EventResult`

- [ ] **Step 1: 失敗するテストを書く**

`src/games/kimagure-ox/__tests__/events.test.ts`:

```ts
import type { Cell } from '../engine'
import { applicableEvents, applyEvent, pickEvent, type Rng } from '../events'

const B = (s: string): Cell[] =>
	[...s].map((c) => (c === 'o' ? 'o' : c === 'x' ? 'x' : null))

// 固定値列を順に返す乱数（使い切ったら 0.999）
const seq = (...values: number[]): Rng => {
	let i = 0
	return () => values[i++] ?? 0.999
}

describe('applicableEvents', () => {
	it('空盤面では block と double のみ（駒が無いので shuffle / vanish は不可）', () => {
		expect(applicableEvents(B('.........'), null)).toEqual(['block', 'double'])
	})
	it('駒1個なら vanish が加わる（shuffle は駒2個から）', () => {
		expect(applicableEvents(B('o........'), null)).toEqual(['block', 'vanish', 'double'])
	})
	it('駒2個なら全イベントが候補', () => {
		expect(applicableEvents(B('ox.......'), null)).toEqual([
			'shuffle',
			'block',
			'vanish',
			'double',
		])
	})
	it('封鎖が既にあるなら block は候補外', () => {
		expect(applicableEvents(B('ox.......'), 8)).toEqual(['shuffle', 'vanish', 'double'])
	})
	it('空きマスが1以下なら block は候補外', () => {
		expect(applicableEvents(B('oxoxoxox.'), null)).toEqual(['shuffle', 'vanish', 'double'])
	})
})

describe('pickEvent', () => {
	const board = B('oxo......')
	it('3手目未満では発生しない', () => {
		expect(
			pickEvent({ board, blocked: null, moveCount: 2, lastEvent: null, rng: seq(0) }),
		).toBeNull()
	})
	it('乱数が確率以上なら発生しない（30%）', () => {
		expect(
			pickEvent({ board, blocked: null, moveCount: 3, lastEvent: null, rng: seq(0.3) }),
		).toBeNull()
	})
	it('乱数が確率未満なら候補から選ばれる', () => {
		expect(
			pickEvent({ board, blocked: null, moveCount: 3, lastEvent: null, rng: seq(0, 0) }),
		).toBe('shuffle')
	})
	it('直前と同じイベントは選ばれない', () => {
		expect(
			pickEvent({ board, blocked: null, moveCount: 3, lastEvent: 'shuffle', rng: seq(0, 0) }),
		).toBe('block')
	})
})

describe('applyEvent', () => {
	it('block: 空きマスから1つ選んで封鎖する（盤面は不変）', () => {
		const board = B('ox.......')
		const result = applyEvent('block', board, null, seq(0))
		expect(result.blocked).toBe(2) // 空きマス [2..8] の先頭
		expect(result.board).toEqual(board)
		expect(result.extraMoves).toBe(0)
	})
	it('vanish: 駒1個がランダムに消える', () => {
		const result = applyEvent('vanish', B('ox.......'), null, seq(0.6))
		expect(result.board).toEqual(B('o........')) // 駒 [0,1] の floor(0.6*2)=1 番目
	})
	it('shuffle: 駒数を保ったまま再配置される（rng=0 で決定的）', () => {
		const result = applyEvent('shuffle', B('xxooo....'), null, () => 0)
		expect(result.board).toEqual(B('.xxooo...'))
	})
	it('shuffle: 封鎖マスには駒を置かない', () => {
		const result = applyEvent('shuffle', B('xxooo....'), 1, () => 0)
		expect(result.board[1]).toBeNull()
		expect(result.board.filter((c) => c !== null)).toHaveLength(5)
	})
	it('double: extraMoves が 1 になる', () => {
		const result = applyEvent('double', B('ox.......'), null, seq())
		expect(result.extraMoves).toBe(1)
		expect(result.board).toEqual(B('ox.......'))
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/kimagure-ox/__tests__/events.test.ts`
Expected: FAIL（`../events` が存在しない）

- [ ] **Step 3: events.ts を実装**

`src/games/kimagure-ox/events.ts`:

```ts
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
	if (id === 'shuffle') return { board: shuffleBoard(board, blocked, rng), blocked, extraMoves: 0 }
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
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/kimagure-ox`
Expected: PASS（engine / events 両方 green）

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/games/kimagure-ox
git add src/games/kimagure-ox
git commit -m "feat: きまぐれイベント4種の抽選・適用ロジックを追加 (#12)"
```

---

### Task 3: reducer.ts — ゲーム状態機械

**Files:**
- Create: `src/games/kimagure-ox/reducer.ts`
- Test: `src/games/kimagure-ox/__tests__/reducer.test.ts`

**Interfaces:**
- Consumes: Task 1 の `Board` / `Mark` / `Winner` / `emptyBoard` / `canPlace` / `place` / `judge`、Task 2 の `EventId` / `Rng` / `pickEvent` / `applyEvent`
- Produces: `type Phase = 'intro' | 'playing' | 'cutin' | 'finished'` / `type GameState = { board: Board; turn: Mark; blocked: number | null; extraMoves: number; moveCount: number; lastEvent: EventId | null; pendingEvent: EventId | null; phase: Phase; winner: Winner }` / `type Action = { type: 'start' } | { type: 'tap'; index: number; rng: Rng } | { type: 'cutinDone'; rng: Rng } | { type: 'retry'; rng: Rng }` / `initialState(rng: Rng): GameState` / `reduce(state: GameState, action: Action): GameState`

- [ ] **Step 1: 失敗するテストを書く**

`src/games/kimagure-ox/__tests__/reducer.test.ts`:

```ts
import type { Cell } from '../engine'
import type { Rng } from '../events'
import { initialState, reduce, type GameState } from '../reducer'

const B = (s: string): Cell[] =>
	[...s].map((c) => (c === 'o' ? 'o' : c === 'x' ? 'x' : null))

const seq = (...values: number[]): Rng => {
	let i = 0
	return () => values[i++] ?? 0.999
}

// イベントが発生しない乱数（抽選で必ずハズレ）
const noEvent: Rng = () => 0.999

const playing = (over: Partial<GameState>): GameState => ({
	...initialState(seq(0)),
	phase: 'playing',
	...over,
})

describe('initialState', () => {
	it('乱数 < 0.5 なら先手 o、フェーズは intro', () => {
		const s = initialState(seq(0.4))
		expect(s.turn).toBe('o')
		expect(s.phase).toBe('intro')
	})
	it('乱数 >= 0.5 なら先手 x', () => {
		expect(initialState(seq(0.6)).turn).toBe('x')
	})
})

describe('start / retry', () => {
	it('start で intro → playing', () => {
		const s = reduce(initialState(seq(0)), { type: 'start' })
		expect(s.phase).toBe('playing')
	})
	it('retry で新しいゲーム（intro に戻る）', () => {
		const s = reduce(playing({ moveCount: 5 }), { type: 'retry', rng: seq(0) })
		expect(s.phase).toBe('intro')
		expect(s.moveCount).toBe(0)
	})
})

describe('tap', () => {
	it('駒を置いて手番が交代する', () => {
		const s = reduce(playing({ turn: 'o' }), { type: 'tap', index: 0, rng: noEvent })
		expect(s.board[0]).toBe('o')
		expect(s.turn).toBe('x')
		expect(s.moveCount).toBe(1)
	})
	it('置けないマス（使用済み・封鎖）では何も起きない', () => {
		const base = playing({ board: B('o........'), blocked: 4 })
		expect(reduce(base, { type: 'tap', index: 0, rng: noEvent })).toBe(base)
		expect(reduce(base, { type: 'tap', index: 4, rng: noEvent })).toBe(base)
	})
	it('3並びで即 finished', () => {
		const s = reduce(playing({ board: B('oo.xx....'), turn: 'o', moveCount: 4 }), {
			type: 'tap',
			index: 2,
			rng: noEvent,
		})
		expect(s.phase).toBe('finished')
		expect(s.winner).toBe('o')
	})
	it('ダブル手番の残りがあれば手番は交代しない', () => {
		const s = reduce(playing({ turn: 'o', extraMoves: 1, moveCount: 4 }), {
			type: 'tap',
			index: 0,
			rng: noEvent,
		})
		expect(s.turn).toBe('o')
		expect(s.extraMoves).toBe(0)
	})
	it('3手目以降の着手後にイベント抽選され cutin へ（効果は未適用）', () => {
		const s = reduce(playing({ board: B('ox.x.....'), turn: 'o', moveCount: 3 }), {
			type: 'tap',
			index: 4,
			rng: seq(0, 0), // 当選 → 候補先頭 shuffle
		})
		expect(s.phase).toBe('cutin')
		expect(s.pendingEvent).toBe('shuffle')
		expect(s.board).toEqual(B('ox.xo....')) // イベント効果はまだ反映されない
	})
})

describe('cutinDone', () => {
	it('イベント効果を反映して playing に戻り lastEvent を記録', () => {
		const s = reduce(
			playing({ board: B('ox.......'), pendingEvent: 'block', phase: 'cutin' }),
			{ type: 'cutinDone', rng: seq(0) },
		)
		expect(s.blocked).toBe(2)
		expect(s.phase).toBe('playing')
		expect(s.lastEvent).toBe('block')
		expect(s.pendingEvent).toBeNull()
	})
	it('double は次の手番に extraMoves を与える', () => {
		const s = reduce(
			playing({ pendingEvent: 'double', phase: 'cutin' }),
			{ type: 'cutinDone', rng: seq() },
		)
		expect(s.extraMoves).toBe(1)
	})
	it('シャッフルで3並びになったら即 finished（イベントでも勝敗判定）', () => {
		const s = reduce(
			playing({ board: B('xxooo....'), pendingEvent: 'shuffle', phase: 'cutin' }),
			{ type: 'cutinDone', rng: () => 0 }, // Task 2 のテストより '.xxooo...' になり o の横並び
		)
		expect(s.phase).toBe('finished')
		expect(s.winner).toBe('o')
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/kimagure-ox/__tests__/reducer.test.ts`
Expected: FAIL（`../reducer` が存在しない）

- [ ] **Step 3: reducer.ts を実装**

`src/games/kimagure-ox/reducer.ts`:

```ts
import { canPlace, emptyBoard, judge, place, type Board, type Mark, type Winner } from './engine'
import { applyEvent, pickEvent, type EventId, type Rng } from './events'

export type Phase = 'intro' | 'playing' | 'cutin' | 'finished'

export type GameState = {
	board: Board
	turn: Mark
	blocked: number | null
	extraMoves: number
	moveCount: number
	lastEvent: EventId | null
	pendingEvent: EventId | null
	phase: Phase
	winner: Winner
}

export type Action =
	| { type: 'start' }
	| { type: 'tap'; index: number; rng: Rng }
	| { type: 'cutinDone'; rng: Rng }
	| { type: 'retry'; rng: Rng }

// 先手はコイントスでランダム決定
export function initialState(rng: Rng): GameState {
	return {
		board: emptyBoard(),
		turn: rng() < 0.5 ? 'o' : 'x',
		blocked: null,
		extraMoves: 0,
		moveCount: 0,
		lastEvent: null,
		pendingEvent: null,
		phase: 'intro',
		winner: null,
	}
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'start':
			return state.phase === 'intro' ? { ...state, phase: 'playing' } : state
		case 'tap':
			return tap(state, action.index, action.rng)
		case 'cutinDone':
			return cutinDone(state, action.rng)
		case 'retry':
			return initialState(action.rng)
	}
}

function tap(state: GameState, index: number, rng: Rng): GameState {
	if (state.phase !== 'playing' || !canPlace(state.board, state.blocked, index)) return state
	const board = place(state.board, index, state.turn)
	const moveCount = state.moveCount + 1
	const winner = judge(board, state.blocked)
	if (winner) return { ...state, board, moveCount, winner, phase: 'finished' }

	const keepTurn = state.extraMoves > 0
	const turn: Mark = keepTurn ? state.turn : state.turn === 'o' ? 'x' : 'o'
	const extraMoves = keepTurn ? state.extraMoves - 1 : 0

	const event = pickEvent({
		board,
		blocked: state.blocked,
		moveCount,
		lastEvent: state.lastEvent,
		rng,
	})
	if (event) return { ...state, board, moveCount, turn, extraMoves, pendingEvent: event, phase: 'cutin' }
	return { ...state, board, moveCount, turn, extraMoves }
}

// イベント効果はカットイン終了時に反映する（カットイン→盤面更新の順で見せる）
function cutinDone(state: GameState, rng: Rng): GameState {
	if (state.phase !== 'cutin' || state.pendingEvent === null) return state
	const result = applyEvent(state.pendingEvent, state.board, state.blocked, rng)
	const winner = judge(result.board, result.blocked)
	return {
		...state,
		board: result.board,
		blocked: result.blocked,
		extraMoves: state.extraMoves + result.extraMoves,
		lastEvent: state.pendingEvent,
		pendingEvent: null,
		winner,
		phase: winner ? 'finished' : 'playing',
	}
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/kimagure-ox`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/games/kimagure-ox
git add src/games/kimagure-ox
git commit -m "feat: きまぐれ◯× の状態機械 reducer を追加 (#12)"
```

---

### Task 4: theme.ts + board.tsx — 3×3盤面 UI

**Files:**
- Create: `src/games/kimagure-ox/theme.ts`
- Create: `src/games/kimagure-ox/board.tsx`
- Test: `src/games/kimagure-ox/__tests__/board.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `Board`
- Produces: `KOX = { o: '#4ECDC4', x: '#E85BF7' }` / `BoardView({ board, blocked, disabled, onCellPress }: { board: Board; blocked: number | null; disabled: boolean; onCellPress: (index: number) => void })`（各マスは `testID="cell-0"`〜`"cell-8"`）

- [ ] **Step 1: 失敗するテストを書く**

`src/games/kimagure-ox/__tests__/board.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import { BoardView } from '../board'
import { emptyBoard, type Cell } from '../engine'

const B = (s: string): Cell[] =>
	[...s].map((c) => (c === 'o' ? 'o' : c === 'x' ? 'x' : null))

it('9マスが描画され、空きマスのタップで onCellPress が呼ばれる', () => {
	const onCellPress = jest.fn()
	const { getByTestId } = render(
		<BoardView board={emptyBoard()} blocked={null} disabled={false} onCellPress={onCellPress} />,
	)
	fireEvent.press(getByTestId('cell-4'))
	expect(onCellPress).toHaveBeenCalledWith(4)
	expect(getByTestId('cell-8')).toBeTruthy()
})

it('駒のあるマス・封鎖マスはタップしても反応しない', () => {
	const onCellPress = jest.fn()
	const { getByTestId, getByText } = render(
		<BoardView board={B('o........')} blocked={4} disabled={false} onCellPress={onCellPress} />,
	)
	fireEvent.press(getByTestId('cell-0'))
	fireEvent.press(getByTestId('cell-4'))
	expect(onCellPress).not.toHaveBeenCalled()
	expect(getByText('🚧')).toBeTruthy() // 封鎖マスの表示
})

it('disabled 中は空きマスも反応しない（カットイン表示中など）', () => {
	const onCellPress = jest.fn()
	const { getByTestId } = render(
		<BoardView board={emptyBoard()} blocked={null} disabled={true} onCellPress={onCellPress} />,
	)
	fireEvent.press(getByTestId('cell-0'))
	expect(onCellPress).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/kimagure-ox/__tests__/board.test.tsx`
Expected: FAIL（`../board` が存在しない）

- [ ] **Step 3: theme.ts と board.tsx を実装**

`src/games/kimagure-ox/theme.ts`:

```ts
// ◯×それぞれのマークカラー（盤面・手番表示・リザルトで共通利用）
export const KOX = {
	o: '#4ECDC4',
	x: '#E85BF7',
} as const
```

`src/games/kimagure-ox/board.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing } from '@/theme/tokens'
import type { Board } from './engine'
import { KOX } from './theme'

type Props = {
	board: Board
	blocked: number | null
	disabled: boolean
	onCellPress: (index: number) => void
}

export function BoardView({ board, blocked, disabled, onCellPress }: Props) {
	return (
		<View style={styles.grid}>
			{board.map((cell, i) => (
				<Pressable
					key={i}
					testID={`cell-${i}`}
					accessibilityRole="button"
					disabled={disabled || cell !== null || i === blocked}
					onPress={() => onCellPress(i)}
					style={styles.cell}
				>
					{i === blocked ? (
						<Text style={styles.blockedIcon}>🚧</Text>
					) : cell ? (
						<Text style={[styles.mark, { color: cell === 'o' ? KOX.o : KOX.x }]}>
							{cell === 'o' ? '◯' : '×'}
						</Text>
					) : null}
				</Pressable>
			))}
		</View>
	)
}

const CELL = 100

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignSelf: 'center',
		width: CELL * 3 + spacing.xs * 2,
		gap: spacing.xs,
	},
	cell: {
		width: CELL,
		height: CELL,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		backgroundColor: colors.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	mark: { fontSize: 56, fontWeight: '800', lineHeight: 64 },
	blockedIcon: { fontSize: 40 },
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/kimagure-ox`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/games/kimagure-ox
git add src/games/kimagure-ox
git commit -m "feat: きまぐれ◯× の盤面 UI を追加 (#12)"
```

---

### Task 5: event-cutin.tsx — イベントカットイン演出

**Files:**
- Create: `src/games/kimagure-ox/event-cutin.tsx`
- Test: `src/games/kimagure-ox/__tests__/event-cutin.test.tsx`

**Interfaces:**
- Consumes: Task 2 の `EventId` / `EVENT_META`、共通の `playSound` / `haptics`
- Produces: `EventCutin({ event, onDone }: { event: EventId; onDone: () => void })` / `CUTIN_DURATION_MS = 1400`

- [ ] **Step 1: 失敗するテストを書く**

`src/games/kimagure-ox/__tests__/event-cutin.test.tsx`:

```tsx
import { render } from '@testing-library/react-native'
import { playSound } from '@/lib/sound'
import { haptics } from '@/lib/haptics'
import { CUTIN_DURATION_MS, EventCutin } from '../event-cutin'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
	}
})

beforeEach(() => {
	jest.useFakeTimers()
	jest.clearAllMocks()
})
afterEach(() => jest.useRealTimers())

it('イベント名を表示し、効果音とバイブを鳴らす', () => {
	const { getByText } = render(<EventCutin event="shuffle" onDone={jest.fn()} />)
	expect(getByText('マスシャッフル')).toBeTruthy()
	expect(playSound).toHaveBeenCalledWith('event')
	expect(haptics.heavy).toHaveBeenCalled()
})

it('表示時間経過後に onDone が1回呼ばれる', () => {
	const onDone = jest.fn()
	render(<EventCutin event="double" onDone={onDone} />)
	expect(onDone).not.toHaveBeenCalled()
	jest.advanceTimersByTime(CUTIN_DURATION_MS)
	expect(onDone).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/kimagure-ox/__tests__/event-cutin.test.tsx`
Expected: FAIL（`../event-cutin` が存在しない）

- [ ] **Step 3: event-cutin.tsx を実装**

`src/games/kimagure-ox/event-cutin.tsx`:

```tsx
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from 'react-native-reanimated'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { EVENT_META, type EventId } from './events'

export const CUTIN_DURATION_MS = 1400

type Props = {
	event: EventId
	onDone: () => void
}

// 全画面カットイン。オーバーレイが下の盤面へのタップを遮る
export function EventCutin({ event, onDone }: Props) {
	const scale = useSharedValue(0.3)

	useEffect(() => {
		playSound('event')
		haptics.heavy()
		scale.value = withSequence(
			withTiming(1.15, { duration: 250, easing: Easing.out(Easing.cubic) }),
			withTiming(1, { duration: 150 }),
		)
		const timer = setTimeout(onDone, CUTIN_DURATION_MS)
		return () => clearTimeout(timer)
	}, [event, onDone, scale])

	const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
	const meta = EVENT_META[event]

	return (
		<View style={styles.backdrop}>
			<Animated.View style={[styles.card, animatedStyle]}>
				<Text style={styles.emoji}>{meta.emoji}</Text>
				<Text style={styles.label}>きまぐれ発動！</Text>
				<Text style={styles.name}>{meta.name}</Text>
			</Animated.View>
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(10,8,24,0.85)',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 10,
	},
	card: {
		alignItems: 'center',
		gap: spacing.sm,
		paddingVertical: spacing.xl,
		paddingHorizontal: spacing.xl,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		backgroundColor: colors.surface,
	},
	emoji: { fontSize: 72 },
	label: { ...typography.caption, color: colors.accentFrom },
	name: { ...typography.hero },
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/kimagure-ox`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/games/kimagure-ox
git add src/games/kimagure-ox
git commit -m "feat: きまぐれイベントのカットイン演出を追加 (#12)"
```

---

### Task 6: kimagure-ox-game.tsx — ゲーム本体の結線

**Files:**
- Create: `src/games/kimagure-ox/kimagure-ox-game.tsx`
- Test: `src/games/kimagure-ox/__tests__/kimagure-ox-game.test.tsx`

**Interfaces:**
- Consumes: Task 3 の `initialState` / `reduce`、Task 4 の `BoardView` / `KOX`、Task 5 の `EventCutin`、共通の `ResultOverlay`（`@/components/game/result-overlay`、props: `visible` / `onRetry` / `onHome` / children）、`GradientButton`（`@/components/ui/gradient-button`、props: `title` / `onPress`）
- Produces: `KimagureOxGame()`（props なし。Task 7 で registry に登録される）

- [ ] **Step 1: 失敗するテストを書く**

`src/games/kimagure-ox/__tests__/kimagure-ox-game.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import { KimagureOxGame } from '../kimagure-ox-game'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
	}
})

// Math.random を 0.999 に固定: 先手は ×、イベントは発生しない
beforeEach(() => {
	jest.spyOn(Math, 'random').mockReturnValue(0.999)
})
afterEach(() => jest.restoreAllMocks())

it('イントロ→スタート→交互に着手→勝利でリザルトが出る', () => {
	const { getByText, getByTestId, queryByText } = render(<KimagureOxGame />)

	// イントロ: 先手発表（rng=0.999 → 先手 ×）
	expect(getByText(/先手は/)).toBeTruthy()
	fireEvent.press(getByText('スタート'))

	// × → o → × → o → × で縦列 0,3,6 が × の勝ち
	fireEvent.press(getByTestId('cell-0')) // x
	fireEvent.press(getByTestId('cell-1')) // o
	fireEvent.press(getByTestId('cell-3')) // x
	fireEvent.press(getByTestId('cell-2')) // o
	expect(queryByText(/勝ち/)).toBeNull()
	fireEvent.press(getByTestId('cell-6')) // x 勝利

	expect(getByText('× の勝ち！')).toBeTruthy()
})

it('もう一回でイントロに戻る', () => {
	const { getByText, getByTestId } = render(<KimagureOxGame />)
	fireEvent.press(getByText('スタート'))
	fireEvent.press(getByTestId('cell-0'))
	fireEvent.press(getByTestId('cell-1'))
	fireEvent.press(getByTestId('cell-3'))
	fireEvent.press(getByTestId('cell-2'))
	fireEvent.press(getByTestId('cell-6'))
	fireEvent.press(getByText('もう一回'))
	expect(getByText(/先手は/)).toBeTruthy()
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx jest src/games/kimagure-ox/__tests__/kimagure-ox-game.test.tsx`
Expected: FAIL（`../kimagure-ox-game` が存在しない）

- [ ] **Step 3: kimagure-ox-game.tsx を実装**

`src/games/kimagure-ox/kimagure-ox-game.tsx`:

```tsx
import { useEffect, useReducer } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ResultOverlay } from '@/components/game/result-overlay'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { colors, spacing, typography } from '@/theme/tokens'
import type { Mark } from './engine'
import { BoardView } from './board'
import { EventCutin } from './event-cutin'
import { initialState, reduce } from './reducer'
import { KOX } from './theme'

const rng = Math.random

const markText = (m: Mark) => (m === 'o' ? '◯' : '×')
const markColor = (m: Mark) => (m === 'o' ? KOX.o : KOX.x)

export function KimagureOxGame() {
	const [state, dispatch] = useReducer(reduce, rng, initialState)

	useEffect(() => {
		if (state.phase === 'finished') haptics.success()
	}, [state.phase])

	// Text のネストは RNTL のテキストマッチが不安定になるため、1行=1ノードで描画する
	if (state.phase === 'intro') {
		return (
			<View style={styles.intro}>
				<Text style={styles.introLabel}>コイントスの結果…</Text>
				<Text style={[styles.introTurn, { color: markColor(state.turn) }]}>
					先手は {markText(state.turn)}！
				</Text>
				<GradientButton title="スタート" onPress={() => dispatch({ type: 'start' })} />
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<View style={styles.turnRow}>
				<Text style={[styles.turnText, { color: markColor(state.turn) }]}>
					{markText(state.turn)} の番
				</Text>
				{state.extraMoves > 0 && <Text style={styles.extraBadge}>⚡ ダブル手番中</Text>}
			</View>

			<BoardView
				board={state.board}
				blocked={state.blocked}
				disabled={state.phase !== 'playing'}
				onCellPress={(index) => {
					haptics.tap()
					dispatch({ type: 'tap', index, rng })
				}}
			/>

			{state.phase === 'cutin' && state.pendingEvent && (
				<EventCutin
					event={state.pendingEvent}
					onDone={() => dispatch({ type: 'cutinDone', rng })}
				/>
			)}

			<ResultOverlay
				visible={state.phase === 'finished'}
				onRetry={() => dispatch({ type: 'retry', rng })}
				onHome={() => router.replace('/')}
			>
				<View style={styles.resultContent}>
					<Text style={styles.resultEmoji}>{state.winner === 'draw' ? '🤝' : '🎉'}</Text>
					{state.winner === 'draw' ? (
						<Text style={styles.resultText}>引き分け</Text>
					) : (
						state.winner && (
							<Text style={[styles.resultText, { color: markColor(state.winner) }]}>
								{markText(state.winner)} の勝ち！
							</Text>
						)
					)}
				</View>
			</ResultOverlay>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: 'center', gap: spacing.lg },
	intro: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.lg,
		padding: spacing.lg,
	},
	introLabel: { ...typography.caption },
	introTurn: { ...typography.hero },
	turnRow: { alignItems: 'center', gap: spacing.xs },
	turnText: { ...typography.title },
	extraBadge: { ...typography.caption, color: colors.gold },
	resultContent: { alignItems: 'center', gap: spacing.md },
	resultEmoji: { fontSize: 72 },
	resultText: { ...typography.hero },
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx jest src/games/kimagure-ox`
Expected: PASS（全6テストファイル green）

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/games/kimagure-ox
git add src/games/kimagure-ox
git commit -m "feat: きまぐれ◯× ゲーム本体を実装 (#12)"
```

---

### Task 7: registry 差し替え・全体検証・PR

**Files:**
- Modify: `src/games/registry.ts:68-80`（kimagure-ox のエントリ）

**Interfaces:**
- Consumes: Task 6 の `KimagureOxGame`
- Produces: ホーム画面のカードから きまぐれ◯× が起動可能になる

- [ ] **Step 1: registry.ts を修正**

import を追加:

```ts
import { KimagureOxGame } from './kimagure-ox/kimagure-ox-game'
```

`kimagure-ox` エントリの `howToPlay` と `Component` を差し替え（他フィールドは変更しない）:

```ts
	{
		id: 'kimagure-ox',
		title: 'きまぐれ◯×',
		tagline: '普通じゃない◯×ゲーム',
		emoji: '⭕',
		gradient: ['#F7B731', '#E67E22'],
		minPlayers: 2,
		maxPlayers: 2,
		howToPlay: [
			'① 交互にマスをタップして、タテ・ヨコ・ナナメに3つ並べたら勝ち！',
			'② ただしターンの合間に「きまぐれイベント」がランダム発生！',
			'③ イベントは マスシャッフル / 1マス封鎖 / 駒消滅 / ダブル手番 の4種類',
			'④ イベントで3つ並んでも勝ち。何が起きても恨みっこなし！',
		],
		Component: KimagureOxGame,
	},
```

- [ ] **Step 2: レジストリのテストが通ることを確認**

Run: `npx jest src/games/__tests__/registry.test.ts`
Expected: PASS（8ゲーム・メタ情報チェックとも green）

- [ ] **Step 3: 全体検証**

```bash
npm run typecheck
npm run lint
npm test
```

Expected: すべてエラーなし。失敗したら修正してから次へ。

- [ ] **Step 4: コミット**

```bash
npx prettier --write src/games/registry.ts
git add src/games/registry.ts
git commit -m "feat: きまぐれ◯× を registry に登録 (#12)"
```

- [ ] **Step 5: push して PR 作成**

```bash
git push -u origin feature/12-kimagure-ox
gh pr create --base develop --title "feat: きまぐれ◯× を実装 (#12)" --body "$(cat <<'EOF'
## 概要
Issue #12 #G4 きまぐれ◯× の実装。

- 3×3 の◯×盤面（2人対戦・端末回し、プレイヤー登録不要）
- きまぐれイベント4種: マスシャッフル / 1マス封鎖 / 駒消滅 / ダブル手番
- 各着手後 30% で抽選（3手目以降、直前と同じイベントは除外、適用不能イベントは候補外）
- イベント発生時のカットイン演出（reanimated＋効果音フック＋バイブ）
- イベント後も勝敗判定（両者同時3並びは引き分け）
- リザルト演出（共通 ResultOverlay）・遊び方文言更新

仕様: docs/superpowers/specs/2026-07-08-kimagure-ox-design.md

## テスト
- engine / events / reducer の純粋関数ユニットテスト
- board / event-cutin / ゲーム本体のコンポーネントテスト
- `npm run typecheck` / `npm run lint` / `npm test` 全通過

Closes #12

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
