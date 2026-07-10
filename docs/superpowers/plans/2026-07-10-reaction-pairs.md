# リアクション神経衰弱（G8 / #16）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 4×4 神経衰弱（7ペア＋ジョーカー＋ラッキー）でペア成立のたびに全員ルーレットで罰対象を抽選するパーティーゲームを実装し、registry の `reaction-pairs`（ComingSoonGame）を差し替える。

**Architecture:** 純粋エンジン（`engine.ts`）＋ reducer（`reducer.ts`）方式（きまぐれ◯× / 王様のいない王様ゲーム準拠）。乱数・タイマー・お題ストアは境界（component / action 引数）から注入し、ロジックは全て純関数としてテストする。UI は play（盤面）→ roulette（全員ルーレット）→ punish（罰発表）→ play のフェーズをオーバーレイで切り替える。

**Tech Stack:** Expo (React Native) / TypeScript / react-native-reanimated / jest-expo + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-07-10-reaction-pairs-design.md`

## Global Constraints

- コードフォーマット: タブ幅4・セミコロンなし・シングルクォート（Prettier 設定済み。コミット前に `npx prettier --write <files>`）
- ブランチ: `feature/16-reaction-pairs`（作成済み。この上でコミットを積む）
- テスト: `npm test -- src/games/reaction-pairs`。React 19 のため **タイマー系・状態更新系は必ず `await act(async () => { ... })`**（同期 act は失敗する。参照実装: `src/games/kimagure-ox/__tests__/`）
- RNTL v14 では `render()` が Promise を返すため **コンポーネントテストは `await render(...)`**。状態更新を起こす `fireEvent.press` は `await act(async () => { fireEvent.press(...) })` で包む
- `StyleSheet.absoluteFillObject` は RN 0.86 に存在しない。全画面オーバーレイは `...StyleSheet.absoluteFill` を使う（kimagure-ox の event-cutin.tsx 前例）
- 素の `npm test`（全体）は `.claude/worktrees/` 配下の並行作業テストを拾って落ちることがある。全体回帰は `npm test -- src` で確認する
- カラートークンは `@/theme/tokens` の `colors` / `spacing` / `radii` / `typography` を使う。ゲーム固有色は `theme.ts` に定義（registry グラデ `#26DE81 → #20BF6B` と統一）
- プレイヤー色は `@/theme/player-colors` の `playerColor(index)` を使う
- 効果音は `playSound('drumroll' | 'reveal' | ...)`、バイブは `haptics.tap() / heavy() / success()` のみ経由
- `.env` 系ファイルは読まない（セキュリティポリシー）

---

### Task 1: engine.ts（デッキ生成・マッチ判定・罰対象抽選）

**Files:**

- Create: `src/games/reaction-pairs/engine.ts`
- Test: `src/games/reaction-pairs/__tests__/engine.test.ts`

**Interfaces:**

- Consumes: なし（純関数のみ）
- Produces:
    - `type Rng = () => number`
    - `type Card = { id: string; kind: 'pair' | 'joker' | 'lucky'; pairId: string | null; symbol: string; state: 'hidden' | 'revealed' | 'removed' }`
    - `PAIR_SYMBOLS: readonly string[]`（7種）, `PAIR_COUNT = 7`, `BOARD_SIZE = 16`
    - `createDeck(rng: Rng): Card[]`（16枚シャッフル済み）
    - `isMatch(a: Card, b: Card): boolean`
    - `pickPunishTarget(playerCount: number, passHolder: number | null, rng: Rng): { firstIndex: number; finalIndex: number; passConsumed: boolean }`

- [ ] **Step 1: 失敗するテストを書く**

`src/games/reaction-pairs/__tests__/engine.test.ts`:

```ts
import {
	BOARD_SIZE,
	PAIR_COUNT,
	PAIR_SYMBOLS,
	createDeck,
	isMatch,
	pickPunishTarget,
	type Card,
} from '../engine'

// 固定順で値を返す rng（プールが尽きたら 0 を返す）
function seqRng(values: number[]) {
	let i = 0
	return () => values[i++] ?? 0
}

describe('createDeck', () => {
	it('16枚・7ペア×2・ジョーカー1・ラッキー1で構成される', async () => {
		const deck = createDeck(() => 0.5)
		expect(deck).toHaveLength(BOARD_SIZE)
		expect(deck.filter((c) => c.kind === 'pair')).toHaveLength(PAIR_COUNT * 2)
		expect(deck.filter((c) => c.kind === 'joker')).toHaveLength(1)
		expect(deck.filter((c) => c.kind === 'lucky')).toHaveLength(1)
	})

	it('各ペアはちょうど2枚ずつ・シンボルは PAIR_SYMBOLS から重複なし', async () => {
		const deck = createDeck(() => 0.5)
		const byPair = new Map<string, Card[]>()
		for (const c of deck) {
			if (c.kind !== 'pair') continue
			byPair.set(c.pairId as string, [...(byPair.get(c.pairId as string) ?? []), c])
		}
		expect(byPair.size).toBe(PAIR_COUNT)
		const symbols = new Set<string>()
		for (const cards of byPair.values()) {
			expect(cards).toHaveLength(2)
			expect(cards[0].symbol).toBe(cards[1].symbol)
			expect(PAIR_SYMBOLS).toContain(cards[0].symbol)
			symbols.add(cards[0].symbol)
		}
		expect(symbols.size).toBe(PAIR_COUNT)
	})

	it('全カードが hidden で始まり id は一意', async () => {
		const deck = createDeck(() => 0.5)
		expect(deck.every((c) => c.state === 'hidden')).toBe(true)
		expect(new Set(deck.map((c) => c.id)).size).toBe(BOARD_SIZE)
	})

	it('rng によって並び順が変わる（シャッフルされている）', async () => {
		const a = createDeck(seqRng([0.1, 0.9, 0.3, 0.7, 0.5]))
		const b = createDeck(seqRng([0.9, 0.1, 0.7, 0.3, 0.5]))
		expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id))
	})
})

describe('isMatch', () => {
	const pair = (pairId: string, suffix: string): Card => ({
		id: `${pairId}-${suffix}`,
		kind: 'pair',
		pairId,
		symbol: '🎲',
		state: 'revealed',
	})
	it('同じ pairId の2枚は成立', async () => {
		expect(isMatch(pair('p1', 'a'), pair('p1', 'b'))).toBe(true)
	})
	it('異なる pairId は不成立', async () => {
		expect(isMatch(pair('p1', 'a'), pair('p2', 'a'))).toBe(false)
	})
})

describe('pickPunishTarget', () => {
	it('パス保持者なし: rng の値に応じた index が first=final になる', async () => {
		const r = pickPunishTarget(4, null, () => 0.5) // floor(0.5*4)=2
		expect(r).toEqual({ firstIndex: 2, finalIndex: 2, passConsumed: false })
	})

	it('パス保持者が当選したら消費して本人を除いて再抽選', async () => {
		// 1回目: floor(0.25*4)=1（パス保持者）→ 再抽選: floor(0.5*3)=1 → 保持者(1)を飛ばして 2
		const r = pickPunishTarget(4, 1, seqRng([0.25, 0.5]))
		expect(r.firstIndex).toBe(1)
		expect(r.passConsumed).toBe(true)
		expect(r.finalIndex).toBe(2)
		expect(r.finalIndex).not.toBe(1)
	})

	it('パス保持者が当選しなければ消費しない', async () => {
		const r = pickPunishTarget(4, 1, () => 0.9) // floor(0.9*4)=3
		expect(r).toEqual({ firstIndex: 3, finalIndex: 3, passConsumed: false })
	})

	it('2人プレイでパス保持者が当選したらもう1人に確定', async () => {
		const r = pickPunishTarget(2, 0, seqRng([0.1, 0.99])) // first=0 → 再抽選は必ず 1
		expect(r).toEqual({ firstIndex: 0, finalIndex: 1, passConsumed: true })
	})
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/engine.test.ts`
Expected: FAIL（`Cannot find module '../engine'`）

- [ ] **Step 3: engine.ts を実装**

`src/games/reaction-pairs/engine.ts`:

```ts
export type Rng = () => number

export type CardKind = 'pair' | 'joker' | 'lucky'
export type CardState = 'hidden' | 'revealed' | 'removed'

export type Card = {
	id: string // 'p3-a' | 'p3-b' | 'joker' | 'lucky'
	kind: CardKind
	pairId: string | null // pair 以外は null
	symbol: string
	state: CardState
}

// ネオン映えする絵柄7種（#67 のトランプ風と差別化）
export const PAIR_SYMBOLS = ['🎤', '🎲', '🌶️', '💃', '🎯', '⚡', '🦄'] as const
export const PAIR_COUNT = 7
export const BOARD_SIZE = 16

export const JOKER_SYMBOL = '🃏'
export const LUCKY_SYMBOL = '🍀'

// Fisher–Yates。rng は [0,1) を返す想定
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
	const arr = [...items]
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}

// 7ペア（14枚）＋ジョーカー1＋ラッキー1 = 16枚をシャッフルして返す
export function createDeck(rng: Rng): Card[] {
	const cards: Card[] = []
	PAIR_SYMBOLS.forEach((symbol, i) => {
		const pairId = `p${i + 1}`
		cards.push(
			{ id: `${pairId}-a`, kind: 'pair', pairId, symbol, state: 'hidden' },
			{ id: `${pairId}-b`, kind: 'pair', pairId, symbol, state: 'hidden' },
		)
	})
	cards.push({ id: 'joker', kind: 'joker', pairId: null, symbol: JOKER_SYMBOL, state: 'hidden' })
	cards.push({ id: 'lucky', kind: 'lucky', pairId: null, symbol: LUCKY_SYMBOL, state: 'hidden' })
	return shuffle(cards, rng)
}

export function isMatch(a: Card, b: Card): boolean {
	return a.kind === 'pair' && b.kind === 'pair' && a.pairId === b.pairId
}

export type PunishTarget = {
	firstIndex: number
	finalIndex: number
	passConsumed: boolean
}

// 全員から1人抽選。パス保持者が当選したら消費して本人を除き再抽選
export function pickPunishTarget(
	playerCount: number,
	passHolder: number | null,
	rng: Rng,
): PunishTarget {
	const firstIndex = Math.floor(rng() * playerCount)
	if (passHolder === null || firstIndex !== passHolder) {
		return { firstIndex, finalIndex: firstIndex, passConsumed: false }
	}
	// 保持者を除いた playerCount-1 枠から引き、保持者以降は index を +1 詰め替え
	const slot = Math.floor(rng() * (playerCount - 1))
	const finalIndex = slot >= passHolder ? slot + 1 : slot
	return { firstIndex, finalIndex, passConsumed: true }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/engine.test.ts`
Expected: PASS（4 describe / 9 tests）

- [ ] **Step 5: フォーマット＆コミット**

```bash
npx prettier --write src/games/reaction-pairs
git add src/games/reaction-pairs
git commit -m "feat: リアクション神経衰弱のエンジン（デッキ生成・マッチ判定・罰対象抽選）"
```

---

### Task 2: topics.ts（batsu フォールバックお題＋抽選ヘルパー）

**Files:**

- Create: `src/games/reaction-pairs/topics.ts`
- Test: `src/games/reaction-pairs/__tests__/topics.test.ts`

**Interfaces:**

- Consumes: `Topic`（`@/lib/topics-store`）, `Rng`（Task 1）
- Produces:
    - `FALLBACK_BATSU_TOPICS: readonly Topic[]`（pack: 'batsu'、20個、id は `fb-batsu-1` 形式）
    - `pickBatsuTopic(topics: Topic[], usedIds: string[], rng: Rng): Topic`
        - `topics` は呼び出し側が `useTopics()` で取った全パックの配列をそのまま渡す（関数内で pack を絞る）
        - Supabase 由来の batsu が空ならフォールバックから抽選。usedIds 除外後に空なら usedIds を無視して全プールから抽選（枯渇時も必ず返す）

- [ ] **Step 1: 失敗するテストを書く**

`src/games/reaction-pairs/__tests__/topics.test.ts`:

```ts
import type { Topic } from '@/lib/topics-store'
import { FALLBACK_BATSU_TOPICS, pickBatsuTopic } from '../topics'

describe('FALLBACK_BATSU_TOPICS', () => {
	it('20個・全て pack=batsu・id 重複なし', async () => {
		expect(FALLBACK_BATSU_TOPICS.length).toBeGreaterThanOrEqual(20)
		expect(FALLBACK_BATSU_TOPICS.every((t) => t.pack === 'batsu')).toBe(true)
		expect(new Set(FALLBACK_BATSU_TOPICS.map((t) => t.id)).size).toBe(
			FALLBACK_BATSU_TOPICS.length,
		)
	})
})

describe('pickBatsuTopic', () => {
	const remote: Topic[] = [
		{ id: 'r1', pack: 'batsu', text: 'リモート罰1' },
		{ id: 'r2', pack: 'batsu', text: 'リモート罰2' },
		{ id: 'k1', pack: 'king', text: '王様お題（対象外）' },
	]

	it('batsu パックのお題から rng で選ぶ（他パックは無視）', async () => {
		const t = pickBatsuTopic(remote, [], () => 0) // pool=[r1,r2] の先頭
		expect(t.id).toBe('r1')
	})

	it('使用済み ID を除外する', async () => {
		const t = pickBatsuTopic(remote, ['r1'], () => 0)
		expect(t.id).toBe('r2')
	})

	it('リモートに batsu がなければフォールバックから選ぶ', async () => {
		const t = pickBatsuTopic([], [], () => 0)
		expect(t.id).toBe(FALLBACK_BATSU_TOPICS[0].id)
	})

	it('プール枯渇時は usedIds を無視して必ず返す', async () => {
		const t = pickBatsuTopic(remote.slice(0, 1), ['r1'], () => 0)
		expect(t).toBeDefined()
		expect(t.pack).toBe('batsu')
	})
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/topics.test.ts`
Expected: FAIL（`Cannot find module '../topics'`）

- [ ] **Step 3: topics.ts を実装**

`src/games/reaction-pairs/topics.ts`:

```ts
import type { Topic } from '@/lib/topics-store'
import type { Rng } from './engine'

// 全年齢向けの無難な罰お題（Supabase 'batsu' パック未取得時のフォールバック）
// 0003_seed_batsu_topics.sql と同じ方針: 飲酒・恋愛の直接的表現は入れない
export const FALLBACK_BATSU_TOPICS: readonly Topic[] = [
	{ id: 'fb-batsu-1', pack: 'batsu', text: '一発ギャグをする' },
	{ id: 'fb-batsu-2', pack: 'batsu', text: '変顔を5秒キープする' },
	{ id: 'fb-batsu-3', pack: 'batsu', text: '10秒間ロボットダンスをする' },
	{ id: 'fb-batsu-4', pack: 'batsu', text: 'ものまねを1つ披露する' },
	{ id: 'fb-batsu-5', pack: 'batsu', text: '全力で「イェーイ！」と叫ぶ' },
	{ id: 'fb-batsu-6', pack: 'batsu', text: '自分の名前を逆から3回言う' },
	{ id: 'fb-batsu-7', pack: 'batsu', text: '好きな食べ物を30秒間熱く語る' },
	{ id: 'fb-batsu-8', pack: 'batsu', text: '隣の人を全力で褒める' },
	{ id: 'fb-batsu-9', pack: 'batsu', text: '直近で撮った写真を1枚見せる' },
	{ id: 'fb-batsu-10', pack: 'batsu', text: 'ちょっと恥ずかしい話を1つする' },
	{ id: 'fb-batsu-11', pack: 'batsu', text: '30秒間ずっと笑顔でいる' },
	{ id: 'fb-batsu-12', pack: 'batsu', text: '動物のモノマネをして当ててもらう' },
	{ id: 'fb-batsu-13', pack: 'batsu', text: '全員に1人ずつあだ名をつける' },
	{ id: 'fb-batsu-14', pack: 'batsu', text: '子供の頃の夢を発表する' },
	{ id: 'fb-batsu-15', pack: 'batsu', text: '早口言葉「生麦生米生卵」を3回言う' },
	{ id: 'fb-batsu-16', pack: 'batsu', text: '最近の失敗談を1つ話す' },
	{ id: 'fb-batsu-17', pack: 'batsu', text: '次の自分の手番まで語尾に「ニャン」をつける' },
	{ id: 'fb-batsu-18', pack: 'batsu', text: 'その場でスクワットを10回する' },
	{ id: 'fb-batsu-19', pack: 'batsu', text: '真顔で「ととのいました」と言って一句詠む' },
	{ id: 'fb-batsu-20', pack: 'batsu', text: '全員とハイタッチして回る' },
]

// リモート batsu → フォールバックの順で、usedIds を除外して rng 抽選。
// 除外後に空でも usedIds を無視して必ず1つ返す（罰は最大7回・プール20個なので通常は枯渇しない）
export function pickBatsuTopic(topics: Topic[], usedIds: string[], rng: Rng): Topic {
	const remote = topics.filter((t) => t.pack === 'batsu')
	const source = remote.length > 0 ? remote : FALLBACK_BATSU_TOPICS
	const pool = source.filter((t) => !usedIds.includes(t.id))
	const candidates = pool.length > 0 ? pool : source
	return candidates[Math.floor(rng() * candidates.length)]
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/topics.test.ts`
Expected: PASS

- [ ] **Step 5: フォーマット＆コミット**

```bash
npx prettier --write src/games/reaction-pairs
git add src/games/reaction-pairs
git commit -m "feat: リアクション神経衰弱の罰お題（batsu フォールバック＋抽選ヘルパー）"
```

---

### Task 3: reducer.ts（フェーズ遷移・手番・スコア）

**Files:**

- Create: `src/games/reaction-pairs/reducer.ts`
- Test: `src/games/reaction-pairs/__tests__/reducer.test.ts`

**Interfaces:**

- Consumes: `Card` / `Rng` / `createDeck` / `isMatch` / `pickPunishTarget`（Task 1）、`Topic`（`@/lib/topics-store`）
- Produces:
    - `type Phase = 'play' | 'roulette' | 'punish' | 'result'`
    - `type GameState = { phase: Phase; cards: Card[]; playerCount: number; turnIndex: number; flippedIds: string[]; scores: number[]; punishCounts: number[]; passHolder: number | null; roulette: PunishTarget | null; punish: { playerIndex: number; topic: Topic } | null; loserIndex: number | null; usedTopicIds: string[] }`
    - `type Action = { type: 'flip'; cardId: string; rng: Rng } | { type: 'hideMismatch' } | { type: 'rouletteDone'; topic: Topic } | { type: 'punishDone' } | { type: 'retry'; rng: Rng }`
    - `initialState(playerCount: number, rng: Rng): GameState`
    - `reduce(state: GameState, action: Action): GameState`
    - 派生ヘルパー `isMismatchShown(state: GameState): boolean`（不成立2枚を見せている最中か。コンポーネントの 1.5 秒タイマー起動判定に使う）

**挙動仕様（テストが担保する）:**

- `flip` は phase が `play` かつ対象カードが `hidden` かつ `flippedIds.length < 2` のときだけ有効
- 絵柄カード: `revealed` にして `flippedIds` へ追加。2枚目で成立なら両方 `removed`・`scores[turnIndex]+1`・`roulette = pickPunishTarget(...)`・phase `roulette`・`flippedIds` クリア。不成立なら `revealed` のまま維持（コンポーネントが 1.5 秒後に `hideMismatch` を送る）
- ジョーカー: `revealed` にして `loserIndex = turnIndex`・phase `result`（1枚目/2枚目どちらでも）
- ラッキー: `removed` にして `passHolder = turnIndex`。`flippedIds` にはカウントせず手番続行
- `hideMismatch`: 不成立2枚を `hidden` に戻し `flippedIds` クリア・手番を次へ（周回）
- `rouletteDone`: phase `roulette` でのみ有効。`punish = { playerIndex: roulette.finalIndex, topic }`・`punishCounts[finalIndex]+1`・`usedTopicIds` に追加・`passConsumed` なら `passHolder = null`・phase `punish`
- `punishDone`: `punish`/`roulette` をクリアし手番を次へ。未消化ペアが残っていれば phase `play`、全7ペア消化済みなら phase `result`（`loserIndex` は null のまま）
- `retry`: `initialState(playerCount, rng)` で作り直し

- [ ] **Step 1: 失敗するテストを書く**

`src/games/reaction-pairs/__tests__/reducer.test.ts`:

```ts
import type { Topic } from '@/lib/topics-store'
import type { Card } from '../engine'
import { initialState, isMismatchShown, reduce, type Action, type GameState } from '../reducer'

const topic: Topic = { id: 't1', pack: 'batsu', text: '一発ギャグをする' }

// テスト用に盤面を決め打ちで差し替える（シャッフルに依存しない）
function withCards(state: GameState, cards: Card[]): GameState {
	return { ...state, cards }
}

const fixedCards: Card[] = [
	{ id: 'p1-a', kind: 'pair', pairId: 'p1', symbol: '🎤', state: 'hidden' },
	{ id: 'p1-b', kind: 'pair', pairId: 'p1', symbol: '🎤', state: 'hidden' },
	{ id: 'p2-a', kind: 'pair', pairId: 'p2', symbol: '🎲', state: 'hidden' },
	{ id: 'p2-b', kind: 'pair', pairId: 'p2', symbol: '🎲', state: 'hidden' },
	{ id: 'joker', kind: 'joker', pairId: null, symbol: '🃏', state: 'hidden' },
	{ id: 'lucky', kind: 'lucky', pairId: null, symbol: '🍀', state: 'hidden' },
]

function freshState(playerCount = 3): GameState {
	return withCards(
		initialState(playerCount, () => 0.5),
		fixedCards,
	)
}

function flip(state: GameState, cardId: string, rng: () => number = () => 0.5): GameState {
	return reduce(state, { type: 'flip', cardId, rng })
}

describe('initialState', () => {
	it('16枚・play フェーズ・スコア0で始まる', async () => {
		const s = initialState(4, () => 0.5)
		expect(s.cards).toHaveLength(16)
		expect(s.phase).toBe('play')
		expect(s.turnIndex).toBe(0)
		expect(s.scores).toEqual([0, 0, 0, 0])
		expect(s.punishCounts).toEqual([0, 0, 0, 0])
		expect(s.passHolder).toBeNull()
		expect(s.loserIndex).toBeNull()
	})
})

describe('flip: 絵柄カード', () => {
	it('1枚目は revealed になり flippedIds に入る', async () => {
		const s = flip(freshState(), 'p1-a')
		expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('revealed')
		expect(s.flippedIds).toEqual(['p1-a'])
		expect(s.phase).toBe('play')
	})

	it('同じカードの再タップ・revealed カードのタップは無効', async () => {
		const s1 = flip(freshState(), 'p1-a')
		expect(flip(s1, 'p1-a')).toBe(s1)
	})

	it('2枚目で成立: removed・スコア加算・roulette フェーズへ', async () => {
		const s = flip(flip(freshState(), 'p1-a'), 'p1-b', () => 0.5) // floor(0.5*3)=1
		expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('removed')
		expect(s.cards.find((c) => c.id === 'p1-b')?.state).toBe('removed')
		expect(s.scores).toEqual([1, 0, 0])
		expect(s.phase).toBe('roulette')
		expect(s.roulette).toEqual({ firstIndex: 1, finalIndex: 1, passConsumed: false })
		expect(s.flippedIds).toEqual([])
	})

	it('2枚目で不成立: revealed のまま・3枚目はめくれない', async () => {
		const s = flip(flip(freshState(), 'p1-a'), 'p2-a')
		expect(s.phase).toBe('play')
		expect(isMismatchShown(s)).toBe(true)
		expect(flip(s, 'p2-b')).toBe(s)
	})
})

describe('hideMismatch', () => {
	it('2枚を hidden に戻し手番を次へ', async () => {
		const s = reduce(flip(flip(freshState(), 'p1-a'), 'p2-a'), { type: 'hideMismatch' })
		expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('hidden')
		expect(s.cards.find((c) => c.id === 'p2-a')?.state).toBe('hidden')
		expect(s.flippedIds).toEqual([])
		expect(s.turnIndex).toBe(1)
	})

	it('最後のプレイヤーの次は先頭へ周回', async () => {
		const base = { ...freshState(3), turnIndex: 2 }
		const s = reduce(flip(flip(base, 'p1-a'), 'p2-a'), { type: 'hideMismatch' })
		expect(s.turnIndex).toBe(0)
	})
})

describe('flip: ジョーカー', () => {
	it('1枚目でも即 result・めくった人が loser', async () => {
		const s = flip(freshState(), 'joker')
		expect(s.phase).toBe('result')
		expect(s.loserIndex).toBe(0)
		expect(s.cards.find((c) => c.id === 'joker')?.state).toBe('revealed')
	})

	it('2枚目（1枚 revealed 中）でも即 result', async () => {
		const s = flip(flip(freshState(), 'p1-a'), 'joker')
		expect(s.phase).toBe('result')
		expect(s.loserIndex).toBe(0)
	})
})

describe('flip: ラッキー', () => {
	it('パス付与・removed・flippedIds にカウントせず手番続行', async () => {
		const s = flip(freshState(), 'lucky')
		expect(s.passHolder).toBe(0)
		expect(s.cards.find((c) => c.id === 'lucky')?.state).toBe('removed')
		expect(s.flippedIds).toEqual([])
		expect(s.phase).toBe('play')
		expect(s.turnIndex).toBe(0)
	})

	it('1枚めくった後にラッキー → まだ2枚目の絵柄をめくれる', async () => {
		const s = flip(flip(freshState(), 'p1-a'), 'lucky')
		expect(s.flippedIds).toEqual(['p1-a'])
		const s2 = flip(s, 'p1-b')
		expect(s2.phase).toBe('roulette')
	})
})

describe('rouletteDone / punishDone', () => {
	function toRoulette(passHolder: number | null = null, rouletteRng = () => 0.5) {
		const base = { ...freshState(3), passHolder }
		return flip(flip(base, 'p1-a'), 'p1-b', rouletteRng)
	}

	it('rouletteDone: punish セット・罰回数加算・お題を使用済みに', async () => {
		const s = reduce(toRoulette(), { type: 'rouletteDone', topic })
		expect(s.phase).toBe('punish')
		expect(s.punish).toEqual({ playerIndex: 1, topic })
		expect(s.punishCounts).toEqual([0, 1, 0])
		expect(s.usedTopicIds).toEqual(['t1'])
	})

	it('passConsumed のとき passHolder をクリアする', async () => {
		// turnIndex=0 が成立、パス保持者=1。1回目 floor(0.34*3)=1 → 再抽選 floor(0.9*2)=1 → 保持者を飛ばして 2
		let i = 0
		const rng = () => [0.34, 0.9][i++] ?? 0
		const s = reduce(toRoulette(1, rng), { type: 'rouletteDone', topic })
		expect(s.passHolder).toBeNull()
		expect(s.punish?.playerIndex).toBe(2)
	})

	it('punishDone: play に戻り手番が次へ', async () => {
		const s = reduce(reduce(toRoulette(), { type: 'rouletteDone', topic }), {
			type: 'punishDone',
		})
		expect(s.phase).toBe('play')
		expect(s.punish).toBeNull()
		expect(s.roulette).toBeNull()
		expect(s.turnIndex).toBe(1)
	})

	it('全ペア消化後の punishDone は result へ', async () => {
		// p1 成立 → 罰消化 → p2 成立 → 罰消化で絵柄カードが尽きる
		let s = reduce(reduce(toRoulette(), { type: 'rouletteDone', topic }), {
			type: 'punishDone',
		})
		s = flip(flip(s, 'p2-a'), 'p2-b')
		s = reduce(s, { type: 'rouletteDone', topic: { ...topic, id: 't2' } })
		s = reduce(s, { type: 'punishDone' })
		expect(s.phase).toBe('result')
		expect(s.loserIndex).toBeNull()
	})
})

describe('retry', () => {
	it('同じ人数で初期状態に戻る', async () => {
		const s = reduce(flip(freshState(), 'joker'), { type: 'retry', rng: () => 0.5 })
		expect(s.phase).toBe('play')
		expect(s.playerCount).toBe(3)
		expect(s.cards).toHaveLength(16)
		expect(s.loserIndex).toBeNull()
	})
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/reducer.test.ts`
Expected: FAIL（`Cannot find module '../reducer'`）

- [ ] **Step 3: reducer.ts を実装**

`src/games/reaction-pairs/reducer.ts`:

```ts
import type { Topic } from '@/lib/topics-store'
import {
	createDeck,
	isMatch,
	pickPunishTarget,
	type Card,
	type PunishTarget,
	type Rng,
} from './engine'

export type Phase = 'play' | 'roulette' | 'punish' | 'result'

export type GameState = {
	phase: Phase
	cards: Card[]
	playerCount: number
	turnIndex: number
	flippedIds: string[]
	scores: number[]
	punishCounts: number[]
	passHolder: number | null
	roulette: PunishTarget | null
	punish: { playerIndex: number; topic: Topic } | null
	loserIndex: number | null
	usedTopicIds: string[]
}

export type Action =
	| { type: 'flip'; cardId: string; rng: Rng }
	| { type: 'hideMismatch' }
	| { type: 'rouletteDone'; topic: Topic }
	| { type: 'punishDone' }
	| { type: 'retry'; rng: Rng }

export function initialState(playerCount: number, rng: Rng): GameState {
	return {
		phase: 'play',
		cards: createDeck(rng),
		playerCount,
		turnIndex: 0,
		flippedIds: [],
		scores: Array(playerCount).fill(0),
		punishCounts: Array(playerCount).fill(0),
		passHolder: null,
		roulette: null,
		punish: null,
		loserIndex: null,
		usedTopicIds: [],
	}
}

// 不成立の2枚を見せている最中か（コンポーネントが 1.5 秒タイマーで hideMismatch を送る）
export function isMismatchShown(state: GameState): boolean {
	if (state.phase !== 'play' || state.flippedIds.length !== 2) return false
	const [a, b] = state.flippedIds.map((id) => state.cards.find((c) => c.id === id) as Card)
	return !isMatch(a, b)
}

function setCardState(cards: Card[], ids: string[], cardState: Card['state']): Card[] {
	return cards.map((c) => (ids.includes(c.id) ? { ...c, state: cardState } : c))
}

function nextTurn(state: GameState): number {
	return (state.turnIndex + 1) % state.playerCount
}

// 「未消化の絵柄カードが残っていない」で判定する（枚数固定に依存しないので、
// テストで小さい盤面に差し替えても正しく動く）
function allPairsCleared(cards: Card[]): boolean {
	return cards.every((c) => c.kind !== 'pair' || c.state === 'removed')
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'flip':
			return flip(state, action.cardId, action.rng)
		case 'hideMismatch':
			return hideMismatch(state)
		case 'rouletteDone':
			return rouletteDone(state, action.topic)
		case 'punishDone':
			return punishDone(state)
		case 'retry':
			return initialState(state.playerCount, action.rng)
	}
}

function flip(state: GameState, cardId: string, rng: Rng): GameState {
	if (state.phase !== 'play' || state.flippedIds.length >= 2) return state
	const card = state.cards.find((c) => c.id === cardId)
	if (!card || card.state !== 'hidden') return state

	if (card.kind === 'joker') {
		return {
			...state,
			cards: setCardState(state.cards, [cardId], 'revealed'),
			loserIndex: state.turnIndex,
			phase: 'result',
		}
	}
	if (card.kind === 'lucky') {
		return {
			...state,
			cards: setCardState(state.cards, [cardId], 'removed'),
			passHolder: state.turnIndex,
		}
	}

	const cards = setCardState(state.cards, [cardId], 'revealed')
	const flippedIds = [...state.flippedIds, cardId]
	if (flippedIds.length < 2) return { ...state, cards, flippedIds }

	const [a, b] = flippedIds.map((id) => cards.find((c) => c.id === id) as Card)
	if (!isMatch(a, b)) return { ...state, cards, flippedIds } // 1.5秒後に hideMismatch が来る

	const scores = [...state.scores]
	scores[state.turnIndex] += 1
	return {
		...state,
		cards: setCardState(cards, flippedIds, 'removed'),
		flippedIds: [],
		scores,
		roulette: pickPunishTarget(state.playerCount, state.passHolder, rng),
		phase: 'roulette',
	}
}

function hideMismatch(state: GameState): GameState {
	if (!isMismatchShown(state)) return state
	return {
		...state,
		cards: setCardState(state.cards, state.flippedIds, 'hidden'),
		flippedIds: [],
		turnIndex: nextTurn(state),
	}
}

function rouletteDone(state: GameState, topic: Topic): GameState {
	if (state.phase !== 'roulette' || !state.roulette) return state
	const { finalIndex, passConsumed } = state.roulette
	const punishCounts = [...state.punishCounts]
	punishCounts[finalIndex] += 1
	return {
		...state,
		phase: 'punish',
		punish: { playerIndex: finalIndex, topic },
		punishCounts,
		usedTopicIds: [...state.usedTopicIds, topic.id],
		passHolder: passConsumed ? null : state.passHolder,
	}
}

function punishDone(state: GameState): GameState {
	if (state.phase !== 'punish') return state
	return {
		...state,
		punish: null,
		roulette: null,
		turnIndex: nextTurn(state),
		phase: allPairsCleared(state.cards) ? 'result' : 'play',
	}
}
```

（`PAIR_COUNT` は reducer では使わないので import から外してよい。`createDeck` / `isMatch` / `pickPunishTarget` と型だけ import する）

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/reducer.test.ts`
Expected: PASS（全 describe）

- [ ] **Step 5: engine / topics 含め回帰確認＆コミット**

Run: `npm test -- src/games/reaction-pairs`
Expected: PASS

```bash
npx prettier --write src/games/reaction-pairs
git add src/games/reaction-pairs
git commit -m "feat: リアクション神経衰弱の reducer（フェーズ遷移・手番・スコア）"
```

---

### Task 4: theme.ts＋card-grid.tsx（盤面グリッド＋フリップ表示）

**Files:**

- Create: `src/games/reaction-pairs/theme.ts`
- Create: `src/games/reaction-pairs/card-grid.tsx`
- Test: `src/games/reaction-pairs/__tests__/card-grid.test.tsx`

**Interfaces:**

- Consumes: `Card`（Task 1）、`colors/spacing/radii/typography`（`@/theme/tokens`）
- Produces:
    - `RP`（theme 定数）: `{ green: '#26DE81', greenDeep: '#20BF6B', joker: '#FF4D6D', lucky: '#FFC53D' }`
    - `<CardGrid cards={Card[]} onFlip={(id: string) => void} disabled={boolean} />`
        - hidden: 裏面（グラデ＋「WaiPa」ロゴ風テキスト）。タップで `onFlip(id)`
        - revealed: シンボルを表示（joker は赤系背景で「JOKER」表記付き）。表になる瞬間に reanimated の rotateY 90°→0° フリップイン（約200ms、テストでは reanimated をモックするため見た目は検証しない）
        - removed: 空スロット（薄い枠のみ、タップ不可）
        - `disabled` 時は全タップ無視
        - 各カードに `accessibilityLabel`: hidden は `カード{n}`（n は 1 始まりの盤面位置）、revealed は `{symbol}`

- [ ] **Step 1: 失敗するテストを書く**

`src/games/reaction-pairs/__tests__/card-grid.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import type { Card } from '../engine'
import { CardGrid } from '../card-grid'

jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
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
	}
})

const cards: Card[] = [
	{ id: 'p1-a', kind: 'pair', pairId: 'p1', symbol: '🎤', state: 'hidden' },
	{ id: 'p1-b', kind: 'pair', pairId: 'p1', symbol: '🎤', state: 'revealed' },
	{ id: 'joker', kind: 'joker', pairId: null, symbol: '🃏', state: 'revealed' },
	{ id: 'lucky', kind: 'lucky', pairId: null, symbol: '🍀', state: 'removed' },
]

it('hidden カードのタップで onFlip が呼ばれる', async () => {
	const onFlip = jest.fn()
	const { getByLabelText } = await render(<CardGrid cards={cards} onFlip={onFlip} />)
	fireEvent.press(getByLabelText('カード1'))
	expect(onFlip).toHaveBeenCalledWith('p1-a')
})

it('revealed はシンボルが見え、タップしても onFlip は呼ばれない', async () => {
	const onFlip = jest.fn()
	const { getByText, getByLabelText } = await render(<CardGrid cards={cards} onFlip={onFlip} />)
	expect(getByText('🎤')).toBeTruthy()
	fireEvent.press(getByLabelText('🎤'))
	expect(onFlip).not.toHaveBeenCalled()
})

it('removed はシンボルを表示しない', async () => {
	const { queryByText } = await render(<CardGrid cards={cards} onFlip={jest.fn()} />)
	expect(queryByText('🍀')).toBeNull()
})

it('disabled 中は hidden をタップしても無視', async () => {
	const onFlip = jest.fn()
	const { getByLabelText } = await render(<CardGrid cards={cards} onFlip={onFlip} disabled />)
	fireEvent.press(getByLabelText('カード1'))
	expect(onFlip).not.toHaveBeenCalled()
})

it('JOKER は表記付きで表示される', async () => {
	const { getByText } = await render(<CardGrid cards={cards} onFlip={jest.fn()} />)
	expect(getByText('JOKER')).toBeTruthy()
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/card-grid.test.tsx`
Expected: FAIL（`Cannot find module '../card-grid'`）

- [ ] **Step 3: theme.ts と card-grid.tsx を実装**

`src/games/reaction-pairs/theme.ts`:

```ts
// ネオングリーン系（registry の gradient ['#26DE81', '#20BF6B'] と統一）
export const RP = {
	green: '#26DE81',
	greenDeep: '#20BF6B',
	joker: '#FF4D6D',
	lucky: '#FFC53D',
} as const
```

`src/games/reaction-pairs/card-grid.tsx`:

```tsx
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing } from '@/theme/tokens'
import type { Card } from './engine'
import { RP } from './theme'

const FLIP_MS = 200

type Props = {
	cards: Card[]
	onFlip: (cardId: string) => void
	disabled?: boolean
}

// 4×4 盤面。カードの状態はすべて props（reducer の cards）から描画する
export function CardGrid({ cards, onFlip, disabled = false }: Props) {
	return (
		<View style={styles.grid}>
			{cards.map((card, i) => (
				<CardCell
					key={card.id}
					card={card}
					position={i + 1}
					onPress={() => {
						if (disabled || card.state !== 'hidden') return
						haptics.tap()
						onFlip(card.id)
					}}
				/>
			))}
		</View>
	)
}

function CardCell({
	card,
	position,
	onPress,
}: {
	card: Card
	position: number
	onPress: () => void
}) {
	if (card.state === 'removed') {
		return <View style={[styles.cell, styles.removed]} />
	}
	if (card.state === 'hidden') {
		return (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`カード${position}`}
				onPress={onPress}
				style={styles.cell}
			>
				<LinearGradient
					colors={[colors.accentFrom, colors.accentTo]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.back}
				>
					<Text style={styles.backText}>W</Text>
				</LinearGradient>
			</Pressable>
		)
	}
	const isJoker = card.kind === 'joker'
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={card.symbol}
			onPress={onPress}
			style={styles.cell}
		>
			<FlipIn style={[styles.faceFill, styles.face, isJoker && styles.jokerFace]}>
				<Text style={styles.symbol}>{card.symbol}</Text>
				{isJoker && <Text style={styles.jokerLabel}>JOKER</Text>}
			</FlipIn>
		</Pressable>
	)
}

// 表になった瞬間の rotateY 90°→0° フリップイン
function FlipIn({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
	const angle = useSharedValue(90)
	useEffect(() => {
		angle.value = withTiming(0, { duration: FLIP_MS })
	}, [angle])
	const anim = useAnimatedStyle(() => ({
		transform: [{ perspective: 600 }, { rotateY: `${angle.value}deg` }],
	}))
	return <Animated.View style={[style, anim]}>{children}</Animated.View>
}

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
		justifyContent: 'center',
	},
	cell: {
		width: '22%',
		aspectRatio: 0.72,
		borderRadius: radii.md,
		overflow: 'hidden',
	},
	back: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	backText: { fontSize: 28, fontWeight: '800', color: colors.text, opacity: 0.85 },
	faceFill: { flex: 1, borderRadius: radii.md },
	face: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: RP.green,
		alignItems: 'center',
		justifyContent: 'center',
	},
	jokerFace: { borderColor: RP.joker, backgroundColor: '#2A1024' },
	symbol: { fontSize: 34 },
	jokerLabel: { fontSize: 11, fontWeight: '800', color: RP.joker, marginTop: 2 },
	removed: {
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		opacity: 0.25,
	},
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/card-grid.test.tsx`
Expected: PASS（5 tests）

- [ ] **Step 5: フォーマット＆コミット**

```bash
npx prettier --write src/games/reaction-pairs
git add src/games/reaction-pairs
git commit -m "feat: リアクション神経衰弱の盤面グリッド"
```

---

### Task 5: player-roulette.tsx（全員ルーレット演出）

**Files:**

- Create: `src/games/reaction-pairs/player-roulette.tsx`
- Test: `src/games/reaction-pairs/__tests__/player-roulette.test.tsx`

**Interfaces:**

- Consumes: `playerColor`（`@/theme/player-colors`）、`playSound` / `haptics`
- Produces:
    - `<PlayerRoulette names={string[]} firstIndex={number} finalIndex={number} passConsumed={boolean} onDone={() => void} />`
    - タイミング定数（テストから import して使う）: `ROLL_MS = 2000`（1回目の回転）、`PASS_PAUSE_MS = 1200`（免除パス演出）、`REROLL_MS = 1200`（再抽選の回転）、`LANDED_MS = 900`（当選者表示 → onDone）、`TICK_MS = 90`（ハイライト送り）

**挙動仕様:**

- マウント時に `playSound('drumroll')`、`TICK_MS` ごとに名前リストのハイライトを順送り
- `ROLL_MS` 経過で `firstIndex` に停止
    - `passConsumed=false`: `haptics.heavy()`＋`playSound('reveal')` → 「{names[finalIndex]}さん！」を `LANDED_MS` 表示 → `onDone()`
    - `passConsumed=true`: 「🍀 免除パス発動！」を `PASS_PAUSE_MS` 表示 → 再度回転 `REROLL_MS` → `finalIndex` に停止 → 同様に `LANDED_MS` 後 `onDone()`
- 名前は全員分を縦リスト表示し、ハイライト行はそのプレイヤーの `playerColor(index).value` を背景色にする

- [ ] **Step 1: 失敗するテストを書く**

`src/games/reaction-pairs/__tests__/player-roulette.test.tsx`:

```tsx
import { act, render } from '@testing-library/react-native'
import { LANDED_MS, PASS_PAUSE_MS, PlayerRoulette, REROLL_MS, ROLL_MS } from '../player-roulette'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))

const names = ['あか', 'あお', 'みどり']

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

it('回転 → 停止 → 当選者表示のあと onDone が呼ばれる', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(
		<PlayerRoulette
			names={names}
			firstIndex={1}
			finalIndex={1}
			passConsumed={false}
			onDone={onDone}
		/>,
	)
	await act(async () => {
		jest.advanceTimersByTime(ROLL_MS)
	})
	expect(getByText('あおさん！')).toBeTruthy()
	expect(onDone).not.toHaveBeenCalled()
	await act(async () => {
		jest.advanceTimersByTime(LANDED_MS)
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})

it('免除パス発動時は再抽選を挟んで finalIndex で確定する', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(
		<PlayerRoulette
			names={names}
			firstIndex={0}
			finalIndex={2}
			passConsumed={true}
			onDone={onDone}
		/>,
	)
	await act(async () => {
		jest.advanceTimersByTime(ROLL_MS)
	})
	expect(getByText('🍀 免除パス発動！')).toBeTruthy()
	// step 遷移ごとに useEffect が次のタイマーを張るので、advance は段階ごとに分ける
	await act(async () => {
		jest.advanceTimersByTime(PASS_PAUSE_MS)
	})
	await act(async () => {
		jest.advanceTimersByTime(REROLL_MS)
	})
	expect(getByText('みどりさん！')).toBeTruthy()
	await act(async () => {
		jest.advanceTimersByTime(LANDED_MS)
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})

it('全員の名前が表示される', async () => {
	const { getAllByText } = await render(
		<PlayerRoulette
			names={names}
			firstIndex={0}
			finalIndex={0}
			passConsumed={false}
			onDone={jest.fn()}
		/>,
	)
	for (const n of names) {
		expect(getAllByText(n).length).toBeGreaterThanOrEqual(1)
	}
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/player-roulette.test.tsx`
Expected: FAIL（`Cannot find module '../player-roulette'`）

- [ ] **Step 3: player-roulette.tsx を実装**

```tsx
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { RP } from './theme'

export const ROLL_MS = 2000
export const PASS_PAUSE_MS = 1200
export const REROLL_MS = 1200
export const LANDED_MS = 900
export const TICK_MS = 90

type Props = {
	names: string[]
	firstIndex: number
	finalIndex: number
	passConsumed: boolean
	onDone: () => void
}

type Step = 'rolling' | 'passPause' | 'rerolling' | 'landed'

// ペア成立時の「誰が罰？」全員ルーレット。firstIndex/finalIndex は reducer 側で確定済みで、
// このコンポーネントは演出（ハイライト送り→停止）だけを担当する
export function PlayerRoulette({ names, firstIndex, finalIndex, passConsumed, onDone }: Props) {
	const [step, setStep] = useState<Step>('rolling')
	const [highlight, setHighlight] = useState(0)
	const tick = useRef<ReturnType<typeof setInterval> | null>(null)
	const onDoneRef = useRef(onDone)
	onDoneRef.current = onDone

	// step ごとにタイマーを張り替える単純な状態機械
	useEffect(() => {
		const stopTick = () => {
			if (tick.current) clearInterval(tick.current)
			tick.current = null
		}
		if (step === 'rolling' || step === 'rerolling') {
			if (step === 'rolling') playSound('drumroll')
			tick.current = setInterval(() => {
				setHighlight((h) => (h + 1) % names.length)
			}, TICK_MS)
			const t = setTimeout(
				() => {
					stopTick()
					if (step === 'rolling' && passConsumed) {
						setHighlight(firstIndex)
						setStep('passPause')
					} else {
						setHighlight(finalIndex)
						haptics.heavy()
						playSound('reveal')
						setStep('landed')
					}
				},
				step === 'rolling' ? ROLL_MS : REROLL_MS,
			)
			return () => {
				stopTick()
				clearTimeout(t)
			}
		}
		if (step === 'passPause') {
			const t = setTimeout(() => setStep('rerolling'), PASS_PAUSE_MS)
			return () => clearTimeout(t)
		}
		// landed
		const t = setTimeout(() => onDoneRef.current(), LANDED_MS)
		return () => clearTimeout(t)
	}, [step, names.length, firstIndex, finalIndex, passConsumed])

	return (
		<View style={styles.backdrop}>
			<Text style={styles.title}>
				{step === 'passPause' ? '🍀 免除パス発動！' : '誰が罰ゲーム！？'}
			</Text>
			<View style={styles.list}>
				{names.map((name, i) => (
					<View
						key={`${i}-${name}`}
						style={[
							styles.row,
							i === highlight && {
								backgroundColor: playerColor(i).value,
								borderColor: playerColor(i).value,
							},
						]}
					>
						<Text style={[styles.name, i === highlight && styles.nameActive]}>
							{name}
						</Text>
					</View>
				))}
			</View>
			{step === 'landed' && <Text style={styles.landed}>{names[finalIndex]}さん！</Text>}
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10,8,24,0.94)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.md,
	},
	title: { ...typography.title, color: RP.green },
	list: { alignSelf: 'stretch', gap: spacing.xs },
	row: {
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.sm,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		backgroundColor: colors.surface,
	},
	name: { ...typography.body, textAlign: 'center' },
	nameActive: { fontWeight: '800' },
	landed: { ...typography.hero, color: RP.lucky },
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/player-roulette.test.tsx`
Expected: PASS（3 tests）

- [ ] **Step 5: フォーマット＆コミット**

```bash
npx prettier --write src/games/reaction-pairs
git add src/games/reaction-pairs
git commit -m "feat: リアクション神経衰弱の全員ルーレット演出"
```

---

### Task 6: punish-reveal.tsx＋result-screen.tsx（罰発表・リザルト）

**Files:**

- Create: `src/games/reaction-pairs/punish-reveal.tsx`
- Create: `src/games/reaction-pairs/result-screen.tsx`
- Test: `src/games/reaction-pairs/__tests__/punish-reveal.test.tsx`
- Test: `src/games/reaction-pairs/__tests__/result-screen.test.tsx`

**Interfaces:**

- Consumes: `GradientButton`（`@/components/ui/gradient-button`）、`ResultOverlay`（`@/components/game/result-overlay`）、`playerColor`
- Produces:
    - `<PunishReveal playerName={string} playerIndex={number} topicText={string} onDone={() => void} />` — 全画面オーバーレイ。マウント時 `haptics.heavy()`＋`playSound('reveal')`。「実行した！」ボタンで `onDone`
    - `<ResultScreen names={string[]} scores={number[]} punishCounts={number[]} loserIndex={number | null} onRetry={() => void} onHome={() => void} />` — `ResultOverlay` を使用。`loserIndex` 非 null なら「{name}さん、ジョーカーで即負け！」見出し。スコア降順ランキング（同数同順位）＋「罰 {n}回」表示

- [ ] **Step 1: 失敗するテストを書く**

`src/games/reaction-pairs/__tests__/punish-reveal.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import { PunishReveal } from '../punish-reveal'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

it('対象者名とお題を表示し「実行した！」で onDone', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(
		<PunishReveal
			playerName="あお"
			playerIndex={1}
			topicText="一発ギャグをする"
			onDone={onDone}
		/>,
	)
	expect(getByText('あおさんが罰！')).toBeTruthy()
	expect(getByText('一発ギャグをする')).toBeTruthy()
	fireEvent.press(getByText('実行した！'))
	expect(onDone).toHaveBeenCalledTimes(1)
})
```

`src/games/reaction-pairs/__tests__/result-screen.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
import { ResultScreen } from '../result-screen'

jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))

const base = {
	names: ['あか', 'あお', 'みどり'],
	scores: [2, 0, 2],
	punishCounts: [1, 3, 0],
	onRetry: jest.fn(),
	onHome: jest.fn(),
}

it('スコア降順・同数同順位のランキングを表示する', async () => {
	const { getAllByText, getByText } = await render(<ResultScreen {...base} loserIndex={null} />)
	expect(getAllByText('1位')).toHaveLength(2) // あか・みどり が同率1位
	expect(getByText('3位')).toBeTruthy() // あお
	expect(getByText('罰 3回')).toBeTruthy()
})

it('ジョーカー終了時は即負け見出しを出す', async () => {
	const { getByText } = await render(<ResultScreen {...base} loserIndex={1} />)
	expect(getByText('あおさん、ジョーカーで即負け！')).toBeTruthy()
})

it('もう一回 / ホームへ が動く', async () => {
	const { getByText } = await render(<ResultScreen {...base} loserIndex={null} />)
	fireEvent.press(getByText('もう一回'))
	expect(base.onRetry).toHaveBeenCalled()
	fireEvent.press(getByText('ホームへ'))
	expect(base.onHome).toHaveBeenCalled()
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/punish-reveal.test.tsx src/games/reaction-pairs/__tests__/result-screen.test.tsx`
Expected: FAIL（両モジュールとも `Cannot find module`）

- [ ] **Step 3: 実装**

`src/games/reaction-pairs/punish-reveal.tsx`:

```tsx
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { RP } from './theme'

type Props = {
	playerName: string
	playerIndex: number
	topicText: string
	onDone: () => void
}

// ルーレット確定後の罰発表オーバーレイ
export function PunishReveal({ playerName, playerIndex, topicText, onDone }: Props) {
	useEffect(() => {
		haptics.heavy()
		playSound('reveal')
	}, [])

	return (
		<View style={styles.backdrop}>
			<Text style={[styles.who, { color: playerColor(playerIndex).value }]}>
				{playerName}さんが罰！
			</Text>
			<View style={styles.card}>
				<Text style={styles.topic}>{topicText}</Text>
			</View>
			<GradientButton title="実行した！" onPress={onDone} />
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10,8,24,0.94)',
		alignItems: 'stretch',
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.lg,
	},
	who: { ...typography.hero, textAlign: 'center' },
	card: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: RP.green,
		borderRadius: radii.lg,
		padding: spacing.lg,
	},
	topic: { ...typography.title, textAlign: 'center', lineHeight: 32 },
})
```

`src/games/reaction-pairs/result-screen.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native'
import { ResultOverlay } from '@/components/game/result-overlay'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { RP } from './theme'

type Props = {
	names: string[]
	scores: number[]
	punishCounts: number[]
	loserIndex: number | null
	onRetry: () => void
	onHome: () => void
}

// スコア降順・同数同順位（1位, 1位, 3位 方式）
export function rankOf(scores: number[]): number[] {
	return scores.map((s) => scores.filter((o) => o > s).length + 1)
}

export function ResultScreen({ names, scores, punishCounts, loserIndex, onRetry, onHome }: Props) {
	const ranks = rankOf(scores)
	const order = names.map((_, i) => i).sort((a, b) => ranks[a] - ranks[b] || a - b)

	return (
		<ResultOverlay visible onRetry={onRetry} onHome={onHome}>
			<View style={styles.container}>
				{loserIndex !== null && (
					<Text style={styles.loser}>{names[loserIndex]}さん、ジョーカーで即負け！</Text>
				)}
				<Text style={styles.heading}>獲得ペア数ランキング</Text>
				{order.map((i) => (
					<View key={i} style={styles.row}>
						<Text style={styles.rank}>{ranks[i]}位</Text>
						<View
							style={[styles.colorBar, { backgroundColor: playerColor(i).value }]}
						/>
						<Text style={styles.name} numberOfLines={1}>
							{names[i]}
						</Text>
						<Text style={styles.score}>{scores[i]}ペア</Text>
						<Text style={styles.punish}>罰 {punishCounts[i]}回</Text>
					</View>
				))}
			</View>
		</ResultOverlay>
	)
}

const styles = StyleSheet.create({
	container: { gap: spacing.sm },
	loser: { ...typography.title, color: RP.joker, textAlign: 'center', marginBottom: spacing.md },
	heading: { ...typography.caption, textAlign: 'center', marginBottom: spacing.xs },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	rank: { ...typography.body, fontWeight: '800', width: 40 },
	colorBar: { width: 4, height: 24, borderRadius: 2 },
	name: { ...typography.body, flex: 1 },
	score: { ...typography.body, fontWeight: '700', color: RP.green },
	punish: { ...typography.caption },
})
```

（`RP.joker` を使うので Task 4 の theme.ts が前提。`rankOf` は export しておくとテスト・後続ゲームから再利用しやすい）

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/punish-reveal.test.tsx src/games/reaction-pairs/__tests__/result-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: フォーマット＆コミット**

```bash
npx prettier --write src/games/reaction-pairs
git add src/games/reaction-pairs
git commit -m "feat: リアクション神経衰弱の罰発表・リザルト画面"
```

---

### Task 7: reaction-pairs-game.tsx＋registry 差し替え

**Files:**

- Create: `src/games/reaction-pairs/reaction-pairs-game.tsx`
- Modify: `src/games/registry.ts`（`reaction-pairs` エントリ）
- Test: `src/games/reaction-pairs/__tests__/reaction-pairs-game.test.tsx`

**Interfaces:**

- Consumes: Task 1〜6 の全部品、`usePlayers`/`getDisplayNames`（`@/lib/players-store`）、`useTopics`（`@/lib/topics-store`）、`pickBatsuTopic`（Task 2）
- Produces: `export function ReactionPairsGame()`（registry の `Component` に載る）

**挙動仕様:**

- `usePlayers()`＋`getDisplayNames` で名前取得。`useReducer` ではなく `useState<GameState>`＋`dispatch` ラッパでも `useReducer(reduce, ...)` でも可（既存は useReducer 準拠が多い）。`initialState(players.count, Math.random)` は lazy init で
- ヘッダー行: 「{現在の手番名}さんの番」（`playerColor(turnIndex).value` の色付きドット）＋ passHolder 非 null なら「🍀 {名前}」バッジ
- `isMismatchShown(state)` が true になったら 1.5 秒（`MISMATCH_MS = 1500` を export）後に `hideMismatch` を dispatch（`useEffect`＋cleanup で連打・再レンダー安全に）
- phase `roulette`: `<PlayerRoulette>` を重ねる。`onDone` で `pickBatsuTopic(topics.topics, state.usedTopicIds, Math.random)` を引いて `rouletteDone`
- phase `punish`: `<PunishReveal>`。`onDone` → `punishDone`
- phase `result`: `<ResultScreen>`。`onRetry` → `{ type: 'retry', rng: Math.random }`、`onHome` → `router.replace('/')`
- 盤面 `disabled` は「`flippedIds.length === 2`（不成立表示中）または phase !== 'play'」

- [ ] **Step 1: 失敗するスモークテストを書く**

`src/games/reaction-pairs/__tests__/reaction-pairs-game.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { LANDED_MS, ROLL_MS } from '../player-roulette'
import { MISMATCH_MS, ReactionPairsGame } from '../reaction-pairs-game'

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
jest.mock('@/lib/players-store', () => ({
	usePlayers: () => ({ count: 2, names: ['あか', 'あお'], history: [] }),
	getDisplayNames: () => ['あか', 'あお'],
}))
jest.mock('@/lib/topics-store', () => ({
	useTopics: () => ({ topics: [], fetchedAt: null }),
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
	}
})

// Math.random を固定してデッキ順を決定的にする。
// shuffle が Fisher–Yates（後ろから rng() * (i+1)）なので、常に 0.999… を返すと
// swap が自分自身になり、デッキは生成順（p1-a, p1-b, p2-a, ... , joker, lucky）のまま並ぶ
beforeEach(() => {
	jest.spyOn(Math, 'random').mockReturnValue(0.9999999)
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

it('手番表示 → ペア成立 → ルーレット → 罰発表 → 手番交代まで通る', async () => {
	const { getByText, getByLabelText, queryByText } = await render(<ReactionPairsGame />)
	expect(getByText(/あかさんの番/)).toBeTruthy()

	// デッキは生成順のまま: カード1 = p1-a, カード2 = p1-b（ペア成立）
	await act(async () => {
		fireEvent.press(getByLabelText('カード1'))
	})
	await act(async () => {
		fireEvent.press(getByLabelText('カード2'))
	})
	expect(getByText('誰が罰ゲーム！？')).toBeTruthy()

	// ルーレット消化（rng=0.9999 → floor(0.9999*2)=1 → あお が対象）
	// step 遷移ごとに useEffect が次のタイマーを張るので advance は2段階に分ける
	await act(async () => {
		jest.advanceTimersByTime(ROLL_MS)
	})
	await act(async () => {
		jest.advanceTimersByTime(LANDED_MS)
	})
	expect(getByText('あおさんが罰！')).toBeTruthy()

	await act(async () => {
		fireEvent.press(getByText('実行した！'))
	})
	expect(queryByText('あおさんが罰！')).toBeNull()
	expect(getByText(/あおさんの番/)).toBeTruthy()
})

it('不成立の2枚は MISMATCH_MS 後に裏へ戻り手番交代', async () => {
	const { getByText, getByLabelText } = await render(<ReactionPairsGame />)
	// カード1 = p1-a, カード3 = p2-a（不成立）
	await act(async () => {
		fireEvent.press(getByLabelText('カード1'))
	})
	await act(async () => {
		fireEvent.press(getByLabelText('カード3'))
	})
	await act(async () => {
		jest.advanceTimersByTime(MISMATCH_MS)
	})
	expect(getByText(/あおさんの番/)).toBeTruthy()
	expect(getByLabelText('カード1')).toBeTruthy() // 裏に戻っている
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test -- src/games/reaction-pairs/__tests__/reaction-pairs-game.test.tsx`
Expected: FAIL（`Cannot find module '../reaction-pairs-game'`）

- [ ] **Step 3: reaction-pairs-game.tsx を実装**

```tsx
import { router } from 'expo-router'
import { useEffect, useReducer } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { useTopics } from '@/lib/topics-store'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { CardGrid } from './card-grid'
import { PlayerRoulette } from './player-roulette'
import { PunishReveal } from './punish-reveal'
import { ResultScreen } from './result-screen'
import { initialState, isMismatchShown, reduce } from './reducer'
import { pickBatsuTopic } from './topics'

export const MISMATCH_MS = 1500

export function ReactionPairsGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const topics = useTopics()
	const [state, dispatch] = useReducer(reduce, players.count, (count) =>
		initialState(count, Math.random),
	)

	const mismatch = isMismatchShown(state)
	useEffect(() => {
		if (!mismatch) return
		const t = setTimeout(() => dispatch({ type: 'hideMismatch' }), MISMATCH_MS)
		return () => clearTimeout(t)
	}, [mismatch])

	const turnColor = playerColor(state.turnIndex).value

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={[styles.turnDot, { backgroundColor: turnColor }]} />
				<Text style={styles.turnText}>{names[state.turnIndex]}さんの番</Text>
				{state.passHolder !== null && (
					<Text style={styles.passBadge}>🍀 {names[state.passHolder]}</Text>
				)}
			</View>

			<CardGrid
				cards={state.cards}
				disabled={state.phase !== 'play' || state.flippedIds.length === 2}
				onFlip={(cardId) => dispatch({ type: 'flip', cardId, rng: Math.random })}
			/>

			{state.phase === 'roulette' && state.roulette && (
				<PlayerRoulette
					names={names}
					firstIndex={state.roulette.firstIndex}
					finalIndex={state.roulette.finalIndex}
					passConsumed={state.roulette.passConsumed}
					onDone={() =>
						dispatch({
							type: 'rouletteDone',
							topic: pickBatsuTopic(topics.topics, state.usedTopicIds, Math.random),
						})
					}
				/>
			)}

			{state.phase === 'punish' && state.punish && (
				<PunishReveal
					playerName={names[state.punish.playerIndex]}
					playerIndex={state.punish.playerIndex}
					topicText={state.punish.topic.text}
					onDone={() => dispatch({ type: 'punishDone' })}
				/>
			)}

			{state.phase === 'result' && (
				<ResultScreen
					names={names}
					scores={state.scores}
					punishCounts={state.punishCounts}
					loserIndex={state.loserIndex}
					onRetry={() => dispatch({ type: 'retry', rng: Math.random })}
					onHome={() => router.replace('/')}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: spacing.md, gap: spacing.md },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	turnDot: { width: 12, height: 12, borderRadius: 6 },
	turnText: { ...typography.title, flex: 1 },
	passBadge: { ...typography.caption, color: colors.gold },
})
```

- [ ] **Step 4: registry.ts を差し替え**

`src/games/registry.ts` の import に追加:

```ts
import { ReactionPairsGame } from './reaction-pairs/reaction-pairs-game'
```

`reaction-pairs` エントリを更新（`Component: ComingSoonGame` → `ReactionPairsGame`、`requiresPlayers: true` 追加、howToPlay 更新）:

```ts
{
	id: 'reaction-pairs',
	title: 'リアクション神経衰弱',
	tagline: 'ペアが揃ったら罰ゲーム!?',
	emoji: '🃏',
	gradient: ['#26DE81', '#20BF6B'],
	minPlayers: 2,
	maxPlayers: 12,
	requiresPlayers: true,
	catchCopy: 'ペアが揃った瞬間、\n全員ルーレットで罰ゲーム対象者が決定！',
	summary:
		'このゲームは、4×4の神経衰弱です！ペアが揃うたびに全員ルーレットで罰ゲーム対象者を抽選。ジョーカーを引いたら即負け、ラッキー🍀を引けば罰免除パスがもらえます！',
	howToPlay: [
		'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
		'② 順番にカードを2枚めくる神経衰弱！揃っても揃わなくても次の人へ',
		'③ ペアが揃った瞬間、全員ルーレットで罰ゲーム対象者が決定！',
		'④ ジョーカーは即負けで終了、ラッキー🍀は罰免除パス。全ペアそろえてもゴール！',
	],
	Component: ReactionPairsGame,
},
```

- [ ] **Step 5: テスト・型・lint を確認**

Run: `npm test -- src/games/reaction-pairs && npx tsc --noEmit`
Expected: 全 PASS・型エラーなし

Run: `npm test -- src`（全体回帰。registry を触ったのでホーム系テストが影響を受けていないか。素の `npm test` は並行ワークツリーを拾うので使わない）
Expected: PASS

- [ ] **Step 6: フォーマット＆コミット**

```bash
npx prettier --write src/games/reaction-pairs src/games/registry.ts
git add src/games/reaction-pairs src/games/registry.ts
git commit -m "feat: リアクション神経衰弱を実装し registry を差し替え (#16)"
```

---

### Task 8: Supabase batsu パックのシード＋README 更新

**Files:**

- Create: `supabase/migrations/0003_seed_batsu_topics.sql`
- Modify: `supabase/README.md`（パック表・適用手順）

**Interfaces:**

- Consumes: `public.topics` テーブル（0001 で作成済み）
- Produces: pack `batsu`（無料・30件）。アプリ側は Task 2 の `pickBatsuTopic` が自動でリモート優先になる

- [ ] **Step 1: マイグレーション SQL を作成**

`supabase/migrations/0003_seed_batsu_topics.sql`:

```sql
-- リアクション神経衰弱(#16) 罰お題パック（30件・無料）
-- 年齢レーティング配慮: 飲酒・恋愛の直接的表現を入れない（無料パック共通方針）

insert into public.topics (pack, text) values
('batsu', '一発ギャグをする'),
('batsu', '変顔を5秒キープする'),
('batsu', '10秒間ロボットダンスをする'),
('batsu', 'ものまねを1つ披露する'),
('batsu', '全力で「イェーイ！」と叫ぶ'),
('batsu', '自分の名前を逆から3回言う'),
('batsu', '好きな食べ物を30秒間熱く語る'),
('batsu', '隣の人を全力で褒める'),
('batsu', '直近で撮った写真を1枚見せる'),
('batsu', 'ちょっと恥ずかしい話を1つする'),
('batsu', '30秒間ずっと笑顔でいる'),
('batsu', '動物のモノマネをして当ててもらう'),
('batsu', '全員に1人ずつあだ名をつける'),
('batsu', '子供の頃の夢を発表する'),
('batsu', '早口言葉「生麦生米生卵」を3回言う'),
('batsu', '最近の失敗談を1つ話す'),
('batsu', '次の自分の手番まで語尾に「ニャン」をつける'),
('batsu', 'その場でスクワットを10回する'),
('batsu', '真顔で「ととのいました」と言って一句詠む'),
('batsu', '全員とハイタッチして回る'),
('batsu', 'スマホの一番古い写真を見せる'),
('batsu', '30秒間エアギターを全力で弾く'),
('batsu', '自分の今日の服装をファッションショー風に紹介する'),
('batsu', '「あいうえお作文」を自分の名前でつくる'),
('batsu', '利き手と逆の手で自分の名前を空中に書く'),
('batsu', '全員の前で3秒間キメ顔をする'),
('batsu', '好きな歌のサビをアカペラで歌う'),
('batsu', '思い出せる限り昨日の晩ごはんを詳しく説明する'),
('batsu', '「実は私…」から始まるプチ告白をする'),
('batsu', '次のペアが揃うまで正座で待つ');
```

- [ ] **Step 2: README のパック表に追記**

`supabase/README.md` の表に行を追加し、適用手順に `0003` を追記:

```markdown
| `batsu` | リアクション神経衰弱（罰お題） | false |
```

```markdown
3. `0003_seed_batsu_topics.sql` — リアクション神経衰弱の罰お題（30件）
```

- [ ] **Step 3: コミット**

```bash
npx prettier --write supabase/README.md
git add supabase
git commit -m "feat: batsu お題パックのシード SQL (#16)"
```

**ユーザーへの引き継ぎ:** SQL の適用は手動（Supabase ダッシュボード → SQL Editor で 0003 を Run）。適用しなくてもアプリはフォールバックお題で動作する。

---

### Task 9: 全体検証＆仕上げ

**Files:**

- Modify: なし（検証のみ。問題が出た場合のみ修正）

- [ ] **Step 1: 全テスト・型・フォーマット確認**

```bash
npm test -- src
npx tsc --noEmit
npx prettier --check .
```

Expected: 全 PASS

- [ ] **Step 2: 手動スモーク（可能な環境なら）**

`npx expo start` でホーム → 「リアクション神経衰弱」→ イントロ → メンバー登録 → 盤面表示 → ペア成立でルーレット → 罰発表 → ジョーカーで即リザルト、を目視確認。

- [ ] **Step 3: 残作業があれば修正してコミット**

```bash
git add -A && git commit -m "fix: リアクション神経衰弱の検証で見つかった調整"
```

（何もなければスキップ）
