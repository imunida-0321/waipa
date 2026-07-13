# ささやきリミット（#65）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** マイク音量メーターを見ながらお題セリフを「緑ゾーン内の音量」で言い切るプレミアムゲーム「ささやきリミット」を実装する。

**Architecture:** 純粋エンジン（ゾーン計算・判定・集計）＋ reducer（ターン進行）＋ expo-audio metering ラッパーフック、の3層を UI から分離（daut-dice / word-wolf 準拠）。マイク権限・キャリブレーションはルートコンポーネントの stage として reducer の外で扱う。

**Tech Stack:** Expo SDK 57 / expo-audio（metering）/ expo-file-system（録音破棄）/ react-native-reanimated / jest-expo + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-07-13-sasayaki-limit-design.md`

## Global Constraints

- 作業ブランチ: `feature/65-sasayaki-limit`（作成済み。develop へは PR でマージ）
- フォーマット: タブインデント・セミコロンなし・シングルクォート（prettier 設定準拠。コミット前に `npm run format`）
- パスエイリアス `@/` = `src/`
- テスト: `npm test -- <path>`。タイマー系は React 19 の await act 規約（`await act(async () => { jest.advanceTimersByTime(...) })`、参照実装 kimagure-ox）
- コミットメッセージは日本語 `feat: ...（#65）` 形式、末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- ゲーム ID は `sasayaki-limit`、表示名「ささやきリミット」、プレミアム限定（`premium: true`）、2〜12人
- dBFS 範囲は -160〜0。無音定数 `SILENCE_DB = -160`

---

### Task 1: engine.ts — ゾーン計算・判定・集計の純関数

**Files:**

- Create: `src/games/sasayaki-limit/engine.ts`
- Test: `src/games/sasayaki-limit/__tests__/engine.test.ts`

**Interfaces:**

- Produces: `Rng`, `Zone {low,high}`, `Judgement 'low'|'ok'|'high'`, `VoiceRange {floorDb,ceilDb}`, `median(samples)`, `voiceRange(noiseFloorDb)`, `normalizeDb(db, range)`, `zoneWidthForRound(round)`, `makeZone(width, rng)`, `judge(peakNorm, zone)`, `tallyLosers(successCounts)`, 定数 `ROUNDS=3` `MEASURE_MS=3000` `CALIBRATION_MS=3000` `METER_INTERVAL_MS=50` `SILENCE_DB=-160` `SUDDEN_DEATH_ZONE_WIDTH=0.15`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/games/sasayaki-limit/__tests__/engine.test.ts
import {
	ROUNDS,
	SILENCE_DB,
	SUDDEN_DEATH_ZONE_WIDTH,
	ZONE_WIDTHS,
	judge,
	makeZone,
	median,
	normalizeDb,
	tallyLosers,
	voiceRange,
	zoneWidthForRound,
} from '../engine'

describe('median', () => {
	it('奇数個は中央値', () => {
		expect(median([-40, -30, -50])).toBe(-40)
	})
	it('偶数個は中央2値の平均', () => {
		expect(median([-40, -30, -50, -20])).toBe(-35)
	})
	it('空配列は無音（SILENCE_DB）', () => {
		expect(median([])).toBe(SILENCE_DB)
	})
	it('突発音（外れ値）に引きずられない', () => {
		expect(median([-45, -44, -46, -45, -5])).toBe(-45)
	})
})

describe('voiceRange', () => {
	it('floor = ノイズフロア + 8dB', () => {
		expect(voiceRange(-40)).toEqual({ floorDb: -32, ceilDb: -2 })
	})
	it('静かな環境でも floor は -45 まで', () => {
		expect(voiceRange(-80).floorDb).toBe(-45)
	})
	it('うるさい環境でも floor は -20 まで', () => {
		expect(voiceRange(-10).floorDb).toBe(-20)
	})
})

describe('normalizeDb', () => {
	const range = { floorDb: -42, ceilDb: -2 }
	it('floor で 0、ceil で 1', () => {
		expect(normalizeDb(-42, range)).toBe(0)
		expect(normalizeDb(-2, range)).toBe(1)
	})
	it('中間は線形', () => {
		expect(normalizeDb(-22, range)).toBeCloseTo(0.5)
	})
	it('範囲外は 0..1 にクランプ', () => {
		expect(normalizeDb(-160, range)).toBe(0)
		expect(normalizeDb(0, range)).toBe(1)
	})
})

describe('zoneWidthForRound', () => {
	it('R1→R3 で狭くなる（40% → 30% → 22%）', () => {
		expect(zoneWidthForRound(1)).toBe(0.4)
		expect(zoneWidthForRound(2)).toBe(0.3)
		expect(zoneWidthForRound(3)).toBe(0.22)
	})
	it('ROUNDS 超の round は R3 と同じ幅', () => {
		expect(zoneWidthForRound(ROUNDS + 1)).toBe(ZONE_WIDTHS[ROUNDS - 1])
	})
	it('サドンデスは 15%', () => {
		expect(SUDDEN_DEATH_ZONE_WIDTH).toBe(0.15)
	})
})

describe('makeZone', () => {
	it('ゲージ内（0..1）に収まりはみ出さない', () => {
		const zone = makeZone(0.3, () => 0.999)
		expect(zone.high).toBeLessThanOrEqual(1)
		expect(zone.high - zone.low).toBeCloseTo(0.3)
	})
	it('rng=0 で最下部から始まる', () => {
		expect(makeZone(0.4, () => 0)).toEqual({ low: 0, high: 0.4 })
	})
})

describe('judge（境界は閉区間で ok）', () => {
	const zone = { low: 0.3, high: 0.6 }
	it('ゾーン端ぴったりは ok', () => {
		expect(judge(0.3, zone)).toBe('ok')
		expect(judge(0.6, zone)).toBe('ok')
	})
	it('端の直下は low・直上は high', () => {
		expect(judge(0.29999, zone)).toBe('low')
		expect(judge(0.60001, zone)).toBe('high')
	})
	it('ゾーン内は ok', () => {
		expect(judge(0.45, zone)).toBe('ok')
	})
})

describe('tallyLosers', () => {
	it('最少成功数のプレイヤー index 配列を返す', () => {
		expect(tallyLosers([2, 0, 3, 1])).toEqual([1])
	})
	it('同率最下位は全員返す', () => {
		expect(tallyLosers([1, 3, 1, 2])).toEqual([0, 2])
	})
	it('全員同数なら全員', () => {
		expect(tallyLosers([2, 2, 2])).toEqual([0, 1, 2])
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/engine.test.ts`
Expected: FAIL（`../engine` が存在しない）

- [ ] **Step 3: engine.ts を実装**

```ts
// src/games/sasayaki-limit/engine.ts
// ささやきリミット: ゾーン計算・判定・集計の純関数群（dBFS: -160..0）

export type Rng = () => number

export const ROUNDS = 3
export const MEASURE_MS = 3000
export const CALIBRATION_MS = 3000
export const METER_INTERVAL_MS = 50
export const SILENCE_DB = -160

// 有効音域: floor = clamp(ノイズフロア + 8dB, -45, -20)、ceil = -2dBFS
const FLOOR_MARGIN_DB = 8
const FLOOR_MIN_DB = -45
const FLOOR_MAX_DB = -20
const CEIL_DB = -2

// ゾーン幅（有効音域 0..1 比）。ラウンドが進むほど狭い
export const ZONE_WIDTHS = [0.4, 0.3, 0.22] as const
export const SUDDEN_DEATH_ZONE_WIDTH = 0.15

export type VoiceRange = { floorDb: number; ceilDb: number }
export type Zone = { low: number; high: number }
export type Judgement = 'low' | 'ok' | 'high'

// キャリブレーションのノイズフロア推定。中央値なので乾杯コール等の突発音に強い
export function median(samples: readonly number[]): number {
	if (samples.length === 0) return SILENCE_DB
	const sorted = [...samples].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)
	return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function voiceRange(noiseFloorDb: number): VoiceRange {
	const floorDb = Math.min(Math.max(noiseFloorDb + FLOOR_MARGIN_DB, FLOOR_MIN_DB), FLOOR_MAX_DB)
	return { floorDb, ceilDb: CEIL_DB }
}

export function normalizeDb(db: number, range: VoiceRange): number {
	const t = (db - range.floorDb) / (range.ceilDb - range.floorDb)
	return Math.min(Math.max(t, 0), 1)
}

export function zoneWidthForRound(round: number): number {
	return ZONE_WIDTHS[Math.min(round, ROUNDS) - 1]
}

export function makeZone(width: number, rng: Rng): Zone {
	const low = rng() * (1 - width)
	return { low, high: low + width }
}

export function judge(peakNorm: number, zone: Zone): Judgement {
	if (peakNorm < zone.low) return 'low'
	if (peakNorm > zone.high) return 'high'
	return 'ok'
}

export function tallyLosers(successCounts: readonly number[]): number[] {
	const min = Math.min(...successCounts)
	return successCounts.flatMap((c, i) => (c === min ? [i] : []))
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/engine.test.ts`
Expected: PASS（全ケース）

- [ ] **Step 5: コミット**

```bash
git add src/games/sasayaki-limit/engine.ts src/games/sasayaki-limit/__tests__/engine.test.ts
git commit -m "feat: ささやきリミットのゾーン計算・判定エンジンを追加（#65）"
```

---

### Task 2: topics.ts — whisper パックのフォールバックと抽選

**Files:**

- Create: `src/games/sasayaki-limit/topics.ts`
- Test: `src/games/sasayaki-limit/__tests__/topics.test.ts`

**Interfaces:**

- Consumes: `Topic`（`@/lib/topics-store`）、`Rng`（Task 1）
- Produces: `FALLBACK_WHISPER_TOPICS: readonly Topic[]`（20本）、`pickWhisperTopic(topics: Topic[], usedIds: string[], rng: Rng): Topic`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/games/sasayaki-limit/__tests__/topics.test.ts
import type { Topic } from '@/lib/topics-store'
import { FALLBACK_WHISPER_TOPICS, pickWhisperTopic } from '../topics'

const remote: Topic[] = [
	{ id: 'r1', pack: 'whisper', text: 'リモートお題1' },
	{ id: 'r2', pack: 'whisper', text: 'リモートお題2' },
	{ id: 'x1', pack: 'talk', text: '別パック' },
]

describe('pickWhisperTopic', () => {
	it('リモートに whisper があればそこから選ぶ（他パックは混ぜない）', () => {
		const t = pickWhisperTopic(remote, [], () => 0)
		expect(t.id).toBe('r1')
		expect(t.pack).toBe('whisper')
	})
	it('リモートに whisper が無ければフォールバックから選ぶ', () => {
		const t = pickWhisperTopic([{ id: 'x1', pack: 'talk', text: '別パック' }], [], () => 0)
		expect(t.id).toBe(FALLBACK_WHISPER_TOPICS[0].id)
	})
	it('使用済み ID は除外される', () => {
		const t = pickWhisperTopic(remote, ['r1'], () => 0)
		expect(t.id).toBe('r2')
	})
	it('全て使用済みなら usedIds を無視して必ず1つ返す', () => {
		const t = pickWhisperTopic(remote, ['r1', 'r2'], () => 0)
		expect(t.pack).toBe('whisper')
	})
	it('フォールバックは20本で全て whisper パック', () => {
		expect(FALLBACK_WHISPER_TOPICS).toHaveLength(20)
		expect(FALLBACK_WHISPER_TOPICS.every((t) => t.pack === 'whisper')).toBe(true)
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/topics.test.ts`
Expected: FAIL（`../topics` が存在しない）

- [ ] **Step 3: topics.ts を実装**

```ts
// src/games/sasayaki-limit/topics.ts
import type { Topic } from '@/lib/topics-store'
import type { Rng } from './engine'

// Supabase 'whisper' パック未取得時のフォールバック（0006_seed_whisper_topics.sql の先頭20問と同一文言）
export const FALLBACK_WHISPER_TOPICS: readonly Topic[] = [
	{ id: 'fb-whisper-1', pack: 'whisper', text: '乾杯ーー！' },
	{ id: 'fb-whisper-2', pack: 'whisper', text: '今日は無礼講だ！' },
	{ id: 'fb-whisper-3', pack: 'whisper', text: 'よっ、待ってました！' },
	{ id: 'fb-whisper-4', pack: 'whisper', text: '幹事さん、ありがとう！' },
	{ id: 'fb-whisper-5', pack: 'whisper', text: '明日もがんばるぞー！' },
	{ id: 'fb-whisper-6', pack: 'whisper', text: 'ここのからあげ、世界一！' },
	{ id: 'fb-whisper-7', pack: 'whisper', text: 'みんな大好きだーー！' },
	{ id: 'fb-whisper-8', pack: 'whisper', text: '次いくぞ、次！' },
	{ id: 'fb-whisper-9', pack: 'whisper', text: '今日という日を忘れない！' },
	{ id: 'fb-whisper-10', pack: 'whisper', text: 'しーっ、静かに！' },
	{ id: 'fb-whisper-11', pack: 'whisper', text: '俺の話を聞けーー！' },
	{ id: 'fb-whisper-12', pack: 'whisper', text: 'ラストオーダーです！' },
	{ id: 'fb-whisper-13', pack: 'whisper', text: '優勝ーー！' },
	{ id: 'fb-whisper-14', pack: 'whisper', text: 'それな！！' },
	{ id: 'fb-whisper-15', pack: 'whisper', text: 'まじで！？' },
	{ id: 'fb-whisper-16', pack: 'whisper', text: 'やっぱりそうだと思った！' },
	{ id: 'fb-whisper-17', pack: 'whisper', text: '全員集合ーー！' },
	{ id: 'fb-whisper-18', pack: 'whisper', text: 'お疲れさまでした！' },
	{ id: 'fb-whisper-19', pack: 'whisper', text: 'さすがです先輩！' },
	{ id: 'fb-whisper-20', pack: 'whisper', text: 'アンコール！アンコール！' },
]

// リモート whisper → フォールバックの順で、usedIds を除外して rng 抽選。
// 除外後に空でも usedIds を無視して必ず1つ返す（bomb-relay の pickTalkTopic と同アルゴリズム）
export function pickWhisperTopic(topics: Topic[], usedIds: string[], rng: Rng): Topic {
	const remote = topics.filter((t) => t.pack === 'whisper')
	const source = remote.length > 0 ? remote : FALLBACK_WHISPER_TOPICS
	const pool = source.filter((t) => !usedIds.includes(t.id))
	const candidates = pool.length > 0 ? pool : source
	return candidates[Math.floor(rng() * candidates.length)]
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/topics.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/games/sasayaki-limit/topics.ts src/games/sasayaki-limit/__tests__/topics.test.ts
git commit -m "feat: ささやきリミットの whisper お題フォールバックと抽選を追加（#65）"
```

---

### Task 3: reducer.ts — ターン進行のステートマシン

**Files:**

- Create: `src/games/sasayaki-limit/reducer.ts`
- Test: `src/games/sasayaki-limit/__tests__/reducer.test.ts`

**Interfaces:**

- Consumes: Task 1 の `judge` / `makeZone` / `tallyLosers` / `zoneWidthForRound` / `ROUNDS` / `SUDDEN_DEATH_ZONE_WIDTH` / `Rng` / `Zone` / `Judgement`
- Produces:
    - `Phase = 'speech' | 'measuring' | 'judged' | 'round-result' | 'sudden-death-intro' | 'result'`
    - `GameState { phase, playerCount, round, turnPos, activePlayers: number[], zone, successCounts: number[], lastJudgement, lastPeak, suddenDeath, sdFailed: number[], losers: number[] }`
    - `Action = {type:'startMeasure'} | {type:'measured'; peakNorm:number} | {type:'next'; rng:Rng} | {type:'nextRound'; rng:Rng} | {type:'sdStart'} | {type:'retry'; rng:Rng}`
    - `initialState(playerCount: number, rng: Rng): GameState`、`reduce(state, action): GameState`
    - 現在の発声者は `state.activePlayers[state.turnPos]`（プレイヤー index）

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/games/sasayaki-limit/__tests__/reducer.test.ts
import { ROUNDS } from '../engine'
import { initialState, reduce, type GameState } from '../reducer'

const rng = () => 0.5

// ヘルパー: 現在の発声者が peakNorm で計測を終える
function playTurn(s: GameState, peakNorm: number): GameState {
	const measuring = reduce(s, { type: 'startMeasure' })
	const judged = reduce(measuring, { type: 'measured', peakNorm })
	return reduce(judged, { type: 'next', rng })
}

// ヘルパー: ゾーン内の値（成功）とゾーン外の値（失敗）
function inZone(s: GameState): number {
	return (s.zone.low + s.zone.high) / 2
}

describe('initialState', () => {
	it('3人・R1・全員が activePlayers・ゾーンは R1 幅', () => {
		const s = initialState(3, rng)
		expect(s.phase).toBe('speech')
		expect(s.activePlayers).toEqual([0, 1, 2])
		expect(s.round).toBe(1)
		expect(s.zone.high - s.zone.low).toBeCloseTo(0.4)
	})
})

describe('通常ラウンド進行', () => {
	it('startMeasure → measured で judged になり成功がカウントされる', () => {
		const s0 = initialState(2, rng)
		const s1 = reduce(s0, { type: 'startMeasure' })
		expect(s1.phase).toBe('measuring')
		const s2 = reduce(s1, { type: 'measured', peakNorm: inZone(s1) })
		expect(s2.phase).toBe('judged')
		expect(s2.lastJudgement).toBe('ok')
		expect(s2.successCounts[0]).toBe(1)
	})
	it('失敗（low/high）はカウントされない', () => {
		const s0 = initialState(2, rng)
		const s1 = reduce(s0, { type: 'startMeasure' })
		const s2 = reduce(s1, { type: 'measured', peakNorm: 0 })
		expect(s2.lastJudgement).toBe('low')
		expect(s2.successCounts[0]).toBe(0)
	})
	it('全員発声し終えたら round-result（R1・R2）', () => {
		let s = initialState(2, rng)
		s = playTurn(s, inZone(s))
		expect(s.phase).toBe('speech')
		expect(s.turnPos).toBe(1)
		s = playTurn(s, inZone(s))
		expect(s.phase).toBe('round-result')
	})
	it('nextRound で次ラウンドへ（ゾーンが狭くなる）', () => {
		let s = initialState(2, rng)
		s = playTurn(s, inZone(s))
		s = playTurn(s, inZone(s))
		const s2 = reduce(s, { type: 'nextRound', rng })
		expect(s2.phase).toBe('speech')
		expect(s2.round).toBe(2)
		expect(s2.turnPos).toBe(0)
		expect(s2.zone.high - s2.zone.low).toBeCloseTo(0.3)
	})
})

// ヘルパー: 指定の成功者だけ成功させて1ラウンド消化
function playRound(s: GameState, winners: number[]): GameState {
	for (let i = 0; i < s.activePlayers.length; i++) {
		const player = s.activePlayers[s.turnPos]
		s = playTurn(s, winners.includes(player) ? inZone(s) : 0)
	}
	return s
}

function playAllRounds(playerCount: number, winners: number[]): GameState {
	let s = initialState(playerCount, rng)
	for (let r = 1; r <= ROUNDS; r++) {
		s = playRound(s, winners)
		if (s.phase === 'round-result') s = reduce(s, { type: 'nextRound', rng })
	}
	return s
}

describe('最終判定', () => {
	it('最下位が1人なら result で敗者確定', () => {
		const s = playAllRounds(3, [0, 1]) // player2 だけ全敗
		expect(s.phase).toBe('result')
		expect(s.losers).toEqual([2])
	})
	it('同率最下位が複数なら sudden-death-intro（対象者のみ・極狭ゾーン）', () => {
		const s = playAllRounds(3, [0]) // player1,2 が同率最下位
		expect(s.phase).toBe('sudden-death-intro')
		expect(s.suddenDeath).toBe(true)
		expect(s.activePlayers).toEqual([1, 2])
		expect(s.zone.high - s.zone.low).toBeCloseTo(0.15)
	})
})

describe('サドンデス', () => {
	function toSuddenDeath(): GameState {
		const s = playAllRounds(3, [0])
		return reduce(s, { type: 'sdStart' })
	}
	it('sdStart で speech に入り対象者が発声', () => {
		const s = toSuddenDeath()
		expect(s.phase).toBe('speech')
		expect(s.activePlayers).toEqual([1, 2])
	})
	it('失敗者が1人ならその人が敗者', () => {
		let s = toSuddenDeath()
		s = playTurn(s, inZone(s)) // player1 成功
		s = playTurn(s, 0) // player2 失敗
		expect(s.phase).toBe('result')
		expect(s.losers).toEqual([2])
	})
	it('全員成功なら同メンバーで再戦（intro に戻る）', () => {
		let s = toSuddenDeath()
		s = playTurn(s, inZone(s))
		s = playTurn(s, inZone(s))
		expect(s.phase).toBe('sudden-death-intro')
		expect(s.activePlayers).toEqual([1, 2])
	})
	it('失敗者が複数なら失敗者だけで反復', () => {
		let s = playAllRounds(4, [0]) // player1,2,3 同率
		s = reduce(s, { type: 'sdStart' })
		s = playTurn(s, 0) // player1 失敗
		s = playTurn(s, inZone(s)) // player2 成功
		s = playTurn(s, 0) // player3 失敗
		expect(s.phase).toBe('sudden-death-intro')
		expect(s.activePlayers).toEqual([1, 3])
	})
})

describe('retry', () => {
	it('result から初期状態に戻る', () => {
		const s = playAllRounds(3, [0, 1])
		const s2 = reduce(s, { type: 'retry', rng })
		expect(s2.phase).toBe('speech')
		expect(s2.round).toBe(1)
		expect(s2.successCounts).toEqual([0, 0, 0])
	})
})

describe('不正フェーズのアクションは無視', () => {
	it('speech 中の measured は状態を変えない', () => {
		const s = initialState(2, rng)
		expect(reduce(s, { type: 'measured', peakNorm: 0.5 })).toBe(s)
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/reducer.test.ts`
Expected: FAIL（`../reducer` が存在しない）

- [ ] **Step 3: reducer.ts を実装**

```ts
// src/games/sasayaki-limit/reducer.ts
import {
	ROUNDS,
	SUDDEN_DEATH_ZONE_WIDTH,
	judge,
	makeZone,
	tallyLosers,
	zoneWidthForRound,
	type Judgement,
	type Rng,
	type Zone,
} from './engine'

export type Phase =
	'speech' | 'measuring' | 'judged' | 'round-result' | 'sudden-death-intro' | 'result'

export type GameState = {
	phase: Phase
	playerCount: number
	round: number
	turnPos: number
	// 発声順のプレイヤー index。通常は全員、サドンデス中は対象者のみ
	activePlayers: number[]
	zone: Zone
	successCounts: number[]
	lastJudgement: Judgement | null
	lastPeak: number | null
	suddenDeath: boolean
	// 現在のサドンデス周回で失敗したプレイヤー index
	sdFailed: number[]
	losers: number[]
}

export type Action =
	| { type: 'startMeasure' }
	| { type: 'measured'; peakNorm: number }
	| { type: 'next'; rng: Rng }
	| { type: 'nextRound'; rng: Rng }
	| { type: 'sdStart' }
	| { type: 'retry'; rng: Rng }

export function initialState(playerCount: number, rng: Rng): GameState {
	return {
		phase: 'speech',
		playerCount,
		round: 1,
		turnPos: 0,
		activePlayers: Array.from({ length: playerCount }, (_, i) => i),
		zone: makeZone(zoneWidthForRound(1), rng),
		successCounts: Array(playerCount).fill(0),
		lastJudgement: null,
		lastPeak: null,
		suddenDeath: false,
		sdFailed: [],
		losers: [],
	}
}

function toSuddenDeathIntro(state: GameState, members: number[], rng: Rng): GameState {
	return {
		...state,
		phase: 'sudden-death-intro',
		suddenDeath: true,
		activePlayers: members,
		turnPos: 0,
		zone: makeZone(SUDDEN_DEATH_ZONE_WIDTH, rng),
		sdFailed: [],
		lastJudgement: null,
		lastPeak: null,
	}
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'startMeasure': {
			if (state.phase !== 'speech') return state
			return { ...state, phase: 'measuring', lastJudgement: null, lastPeak: null }
		}
		case 'measured': {
			if (state.phase !== 'measuring') return state
			const player = state.activePlayers[state.turnPos]
			const judgement = judge(action.peakNorm, state.zone)
			const successCounts = [...state.successCounts]
			let sdFailed = state.sdFailed
			if (state.suddenDeath) {
				if (judgement !== 'ok') sdFailed = [...sdFailed, player]
			} else if (judgement === 'ok') {
				successCounts[player] += 1
			}
			return {
				...state,
				phase: 'judged',
				lastJudgement: judgement,
				lastPeak: action.peakNorm,
				successCounts,
				sdFailed,
			}
		}
		case 'next': {
			if (state.phase !== 'judged') return state
			// まだ発声していない人がいる
			if (state.turnPos + 1 < state.activePlayers.length) {
				return {
					...state,
					phase: 'speech',
					turnPos: state.turnPos + 1,
					lastJudgement: null,
					lastPeak: null,
				}
			}
			// サドンデス周回の決着判定
			if (state.suddenDeath) {
				if (state.sdFailed.length === 1) {
					return { ...state, phase: 'result', losers: state.sdFailed }
				}
				// 全員成功 → 同メンバーで再戦 / 複数失敗 → 失敗者だけで反復
				const members = state.sdFailed.length === 0 ? state.activePlayers : state.sdFailed
				return toSuddenDeathIntro(state, members, action.rng)
			}
			// 通常ラウンド終了
			if (state.round < ROUNDS) {
				return { ...state, phase: 'round-result' }
			}
			// 最終ラウンド終了 → 集計
			const tied = tallyLosers(state.successCounts)
			if (tied.length === 1) {
				return { ...state, phase: 'result', losers: tied }
			}
			return toSuddenDeathIntro(state, tied, action.rng)
		}
		case 'nextRound': {
			if (state.phase !== 'round-result') return state
			const round = state.round + 1
			return {
				...state,
				phase: 'speech',
				round,
				turnPos: 0,
				zone: makeZone(zoneWidthForRound(round), action.rng),
				lastJudgement: null,
				lastPeak: null,
			}
		}
		case 'sdStart': {
			if (state.phase !== 'sudden-death-intro') return state
			return { ...state, phase: 'speech' }
		}
		case 'retry': {
			if (state.phase !== 'result') return state
			return initialState(state.playerCount, action.rng)
		}
	}
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/reducer.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/games/sasayaki-limit/reducer.ts src/games/sasayaki-limit/__tests__/reducer.test.ts
git commit -m "feat: ささやきリミットのターン進行 reducer を追加（#65）"
```

---

### Task 4: マイク層 — app 設定と use-mic-level.ts

**Files:**

- Modify: `app.json`（plugins に expo-audio を追加）
- Modify: `package.json`（`npx expo install expo-file-system` で追加）
- Create: `src/games/sasayaki-limit/use-mic-level.ts`
- Test: `src/games/sasayaki-limit/__tests__/use-mic-level.test.ts`

**Interfaces:**

- Consumes: `METER_INTERVAL_MS`, `SILENCE_DB`（Task 1）
- Produces: `useMicLevel(intervalMs?)` → `{ permission: 'pending'|'granted'|'denied', requestPermission(): Promise<boolean>, start(): Promise<void>, stop(): Promise<void>, levelDb: number, isRecording: boolean, meteringSupported: boolean | null }`

- [ ] **Step 1: 依存追加と app.json 設定**

Run: `npx expo install expo-file-system`

`app.json` の `plugins` 配列（26行目付近、`expo-router` の後）に追加:

```json
[
	"expo-audio",
	{
		"microphonePermission": "声の大きさを測るゲームでマイクを使用します。録音は保存されません。"
	}
]
```

- [ ] **Step 2: 失敗するテストを書く**

```ts
// src/games/sasayaki-limit/__tests__/use-mic-level.test.ts
import { act, renderHook } from '@testing-library/react-native'
import { SILENCE_DB } from '../engine'
import { useMicLevel } from '../use-mic-level'

let mockGranted = true
let mockState: { isRecording: boolean; metering?: number; durationMillis: number } = {
	isRecording: false,
	durationMillis: 0,
}
const mockRecorder = {
	prepareToRecordAsync: jest.fn(async () => {}),
	record: jest.fn(),
	stop: jest.fn(async () => {}),
	uri: 'file:///cache/rec.m4a',
}
const mockSetAudioMode = jest.fn(async () => {})

jest.mock('expo-audio', () => ({
	AudioModule: {
		requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: mockGranted })),
	},
	RecordingPresets: { HIGH_QUALITY: {} },
	setAudioModeAsync: (...args: unknown[]) => mockSetAudioMode(...args),
	useAudioRecorder: jest.fn(() => mockRecorder),
	useAudioRecorderState: jest.fn(() => mockState),
}))

const mockDelete = jest.fn()
jest.mock('expo-file-system', () => ({
	File: jest.fn(() => ({ delete: mockDelete })),
}))

beforeEach(() => {
	jest.clearAllMocks()
	mockGranted = true
	mockState = { isRecording: false, durationMillis: 0 }
})

describe('useMicLevel', () => {
	it('許可されると granted になり録音モードを設定する', async () => {
		const { result } = renderHook(() => useMicLevel())
		expect(result.current.permission).toBe('pending')
		await act(async () => {
			await result.current.requestPermission()
		})
		expect(result.current.permission).toBe('granted')
		expect(mockSetAudioMode).toHaveBeenCalledWith({
			allowsRecording: true,
			playsInSilentMode: true,
		})
	})
	it('拒否されると denied になる', async () => {
		mockGranted = false
		const { result } = renderHook(() => useMicLevel())
		await act(async () => {
			await result.current.requestPermission()
		})
		expect(result.current.permission).toBe('denied')
	})
	it('非録音中の levelDb は無音、録音中は metering 値', () => {
		const { result, rerender } = renderHook(() => useMicLevel())
		expect(result.current.levelDb).toBe(SILENCE_DB)
		mockState = { isRecording: true, metering: -23.5, durationMillis: 100 }
		rerender({})
		expect(result.current.levelDb).toBe(-23.5)
		expect(result.current.meteringSupported).toBe(true)
	})
	it('stop で録音ファイルを削除する', async () => {
		const { result } = renderHook(() => useMicLevel())
		await act(async () => {
			await result.current.stop()
		})
		expect(mockRecorder.stop).toHaveBeenCalled()
		expect(mockDelete).toHaveBeenCalled()
	})
})
```

- [ ] **Step 3: テストが失敗することを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/use-mic-level.test.ts`
Expected: FAIL（`../use-mic-level` が存在しない）

- [ ] **Step 4: use-mic-level.ts を実装**

```ts
// src/games/sasayaki-limit/use-mic-level.ts
// expo-audio の録音 metering ラッパー。録音データは判定にしか使わず stop 時に即削除する
import {
	AudioModule,
	RecordingPresets,
	setAudioModeAsync,
	useAudioRecorder,
	useAudioRecorderState,
} from 'expo-audio'
import { File } from 'expo-file-system'
import { useCallback, useEffect, useRef, useState } from 'react'
import { METER_INTERVAL_MS, SILENCE_DB } from './engine'

export type MicPermission = 'pending' | 'granted' | 'denied'

// metering 値が来ないまま録音がこの時間続いたら「非対応端末」と判断
const METERING_DETECT_MS = 600

export function useMicLevel(intervalMs: number = METER_INTERVAL_MS) {
	const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true })
	const recorderState = useAudioRecorderState(recorder, intervalMs)
	const [permission, setPermission] = useState<MicPermission>('pending')
	const [meteringSupported, setMeteringSupported] = useState<boolean | null>(null)
	const recordStartRef = useRef<number | null>(null)

	const requestPermission = useCallback(async () => {
		const res = await AudioModule.requestRecordingPermissionsAsync()
		if (res.granted) {
			await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
			setPermission('granted')
		} else {
			setPermission('denied')
		}
		return res.granted
	}, [])

	const start = useCallback(async () => {
		await recorder.prepareToRecordAsync()
		recorder.record()
	}, [recorder])

	const stop = useCallback(async () => {
		await recorder.stop()
		const uri = recorder.uri
		if (uri) {
			try {
				new File(uri).delete()
			} catch {
				// キャッシュ領域なので削除失敗は無視（OS が回収する）
			}
		}
	}, [recorder])

	useEffect(() => {
		if (!recorderState.isRecording) {
			recordStartRef.current = null
			return
		}
		if (recordStartRef.current == null) recordStartRef.current = Date.now()
		if (typeof recorderState.metering === 'number') {
			setMeteringSupported(true)
		} else if (Date.now() - recordStartRef.current > METERING_DETECT_MS) {
			setMeteringSupported(false)
		}
	}, [recorderState])

	const levelDb =
		recorderState.isRecording && typeof recorderState.metering === 'number'
			? recorderState.metering
			: SILENCE_DB

	return {
		permission,
		requestPermission,
		start,
		stop,
		levelDb,
		isRecording: recorderState.isRecording,
		meteringSupported,
	}
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/use-mic-level.test.ts`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add app.json package.json package-lock.json src/games/sasayaki-limit/use-mic-level.ts src/games/sasayaki-limit/__tests__/use-mic-level.test.ts
git commit -m "feat: expo-audio metering ラッパーとマイク権限設定を追加（#65）"
```

---

### Task 5: theme.ts と volume-gauge.tsx — リアルタイム音量ゲージ

**Files:**

- Create: `src/games/sasayaki-limit/theme.ts`
- Create: `src/games/sasayaki-limit/volume-gauge.tsx`
- Test: `src/games/sasayaki-limit/__tests__/volume-gauge.test.tsx`

**Interfaces:**

- Consumes: `Zone`, `METER_INTERVAL_MS`（Task 1）
- Produces: `SL`（カラートークン）、`VolumeGauge({ level, peak, zone, active })`（level/peak は 0..1 正規化値、peak は null 可）

- [ ] **Step 1: 失敗するテストを書く**

```tsx
// src/games/sasayaki-limit/__tests__/volume-gauge.test.tsx
import { render } from '@testing-library/react-native'
import { VolumeGauge } from '../volume-gauge'

jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: { View },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
	}
})

describe('VolumeGauge', () => {
	const zone = { low: 0.3, high: 0.6 }
	it('ゲージ・ゾーン帯が描画される', () => {
		const { getByTestId } = render(
			<VolumeGauge level={0} peak={null} zone={zone} active={false} />,
		)
		expect(getByTestId('volume-gauge')).toBeTruthy()
		expect(getByTestId('zone-band')).toBeTruthy()
	})
	it('peak があるとピークマーカーが出る', () => {
		const { getByTestId, queryByTestId, rerender } = render(
			<VolumeGauge level={0.5} peak={null} zone={zone} active />,
		)
		expect(queryByTestId('peak-marker')).toBeNull()
		rerender(<VolumeGauge level={0.5} peak={0.45} zone={zone} active />)
		expect(getByTestId('peak-marker')).toBeTruthy()
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/volume-gauge.test.tsx`
Expected: FAIL（`../volume-gauge` が存在しない）

- [ ] **Step 3: theme.ts と volume-gauge.tsx を実装**

```ts
// src/games/sasayaki-limit/theme.ts
// ささやきリミットのカラートークン（registry グラデと統一する緑系ネオン）
export const SL = {
	green: '#3DDC84',
	greenGlow: '#7CF7B4',
	blue: '#4D96FF',
	red: '#EE5253',
	track: '#211D3A',
	trackBorder: '#3A3560',
	sub: '#9A94C2',
} as const
```

```tsx
// src/games/sasayaki-limit/volume-gauge.tsx
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { METER_INTERVAL_MS, type Zone } from './engine'
import { SL } from './theme'

type Props = {
	// 0..1 正規化済みの現在音量
	level: number
	// 0..1 のピーク残留マーカー（未計測は null）
	peak: number | null
	zone: Zone
	active: boolean
}

export function VolumeGauge({ level, peak, zone, active }: Props) {
	const fill = useSharedValue(0)
	useEffect(() => {
		fill.value = withTiming(active ? level : 0, { duration: METER_INTERVAL_MS })
	}, [level, active, fill])

	const fillStyle = useAnimatedStyle(() => ({ height: `${fill.value * 100}%` }))
	const inZone = active && level >= zone.low && level <= zone.high
	const barColor = inZone ? SL.green : level > zone.high ? SL.red : SL.blue

	return (
		<View style={styles.track} testID="volume-gauge">
			<View
				style={[
					styles.zoneBand,
					{ bottom: `${zone.low * 100}%`, height: `${(zone.high - zone.low) * 100}%` },
					inZone && styles.zoneGlow,
				]}
				testID="zone-band"
			/>
			<Animated.View style={[styles.fill, fillStyle, { backgroundColor: barColor }]} />
			{peak != null && (
				<View
					style={[styles.peakMarker, { bottom: `${peak * 100}%` }]}
					testID="peak-marker"
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	track: {
		width: 72,
		height: 320,
		borderRadius: 16,
		backgroundColor: SL.track,
		borderWidth: 1,
		borderColor: SL.trackBorder,
		overflow: 'hidden',
		justifyContent: 'flex-end',
	},
	fill: {
		width: '100%',
		borderTopLeftRadius: 6,
		borderTopRightRadius: 6,
	},
	zoneBand: {
		position: 'absolute',
		left: 0,
		right: 0,
		backgroundColor: 'rgba(61, 220, 132, 0.22)',
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: SL.green,
	},
	zoneGlow: {
		backgroundColor: 'rgba(61, 220, 132, 0.45)',
		shadowColor: SL.greenGlow,
		shadowOpacity: 0.9,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 0 },
		elevation: 8,
	},
	peakMarker: {
		position: 'absolute',
		left: 0,
		right: 0,
		height: 3,
		backgroundColor: '#FFFFFF',
	},
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/volume-gauge.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/games/sasayaki-limit/theme.ts src/games/sasayaki-limit/volume-gauge.tsx src/games/sasayaki-limit/__tests__/volume-gauge.test.tsx
git commit -m "feat: ささやきリミットのリアルタイム音量ゲージを追加（#65）"
```

---

### Task 6: calibration-screen.tsx — 環境音キャリブレーション

**Files:**

- Create: `src/games/sasayaki-limit/calibration-screen.tsx`
- Test: `src/games/sasayaki-limit/__tests__/calibration-screen.test.tsx`

**Interfaces:**

- Consumes: `CALIBRATION_MS`, `METER_INTERVAL_MS`, `median`（Task 1）
- Produces: `CalibrationScreen({ levelDb, onConfirm })` — 3秒サンプリング後「再計測」「スタート」を表示し、スタートで `onConfirm(noiseFloorDb: number)` を呼ぶ

- [ ] **Step 1: 失敗するテストを書く**

```tsx
// src/games/sasayaki-limit/__tests__/calibration-screen.test.tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { CALIBRATION_MS } from '../engine'
import { CalibrationScreen } from '../calibration-screen'

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

describe('CalibrationScreen', () => {
	it('3秒間サンプリング後にスタート・再計測ボタンが出て、スタートでノイズフロアを返す', async () => {
		const onConfirm = jest.fn()
		const { getByText, queryByText } = render(
			<CalibrationScreen levelDb={-42} onConfirm={onConfirm} />,
		)
		expect(queryByText('スタート')).toBeNull()
		await act(async () => {
			jest.advanceTimersByTime(CALIBRATION_MS + 100)
		})
		expect(getByText('スタート')).toBeTruthy()
		fireEvent.press(getByText('スタート'))
		expect(onConfirm).toHaveBeenCalledWith(-42)
	})
	it('再計測でサンプリングをやり直す', async () => {
		const { getByText, queryByText } = render(
			<CalibrationScreen levelDb={-42} onConfirm={jest.fn()} />,
		)
		await act(async () => {
			jest.advanceTimersByTime(CALIBRATION_MS + 100)
		})
		fireEvent.press(getByText('再計測'))
		expect(queryByText('スタート')).toBeNull()
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/calibration-screen.test.tsx`
Expected: FAIL（`../calibration-screen` が存在しない）

- [ ] **Step 3: calibration-screen.tsx を実装**

```tsx
// src/games/sasayaki-limit/calibration-screen.tsx
// 環境音を3秒サンプリングしてノイズフロア（中央値）を決める。居酒屋の騒音対策
import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { CALIBRATION_MS, METER_INTERVAL_MS, median } from './engine'
import { SL } from './theme'

type Props = {
	levelDb: number
	onConfirm: (noiseFloorDb: number) => void
}

export function CalibrationScreen({ levelDb, onConfirm }: Props) {
	const levelRef = useRef(levelDb)
	levelRef.current = levelDb
	const [floorDb, setFloorDb] = useState<number | null>(null)
	const [progress, setProgress] = useState(0)
	const [runId, setRunId] = useState(0)

	useEffect(() => {
		if (floorDb != null) return
		const samples: number[] = []
		const timer = setInterval(() => {
			samples.push(levelRef.current)
			setProgress(Math.min((samples.length * METER_INTERVAL_MS) / CALIBRATION_MS, 1))
			if (samples.length * METER_INTERVAL_MS >= CALIBRATION_MS) {
				clearInterval(timer)
				setFloorDb(median(samples))
			}
		}, METER_INTERVAL_MS)
		return () => clearInterval(timer)
	}, [floorDb, runId])

	const recalibrate = () => {
		setProgress(0)
		setFloorDb(null)
		setRunId((n) => n + 1)
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>🎤 まわりの音をはかっています</Text>
			{floorDb == null ? (
				<>
					<Text style={styles.sub}>3秒間、しゃべらず静かにしてね</Text>
					<View style={styles.progressTrack}>
						<View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
					</View>
				</>
			) : (
				<>
					<Text style={styles.sub}>準備OK！この場の音を基準にゾーンを作りました</Text>
					<View style={styles.row}>
						<Pressable style={styles.subButton} onPress={recalibrate}>
							<Text style={styles.subButtonLabel}>再計測</Text>
						</Pressable>
						<Pressable style={styles.mainButton} onPress={() => onConfirm(floorDb)}>
							<Text style={styles.mainButtonLabel}>スタート</Text>
						</Pressable>
					</View>
				</>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
	title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
	sub: { color: SL.sub, fontSize: 14, textAlign: 'center' },
	progressTrack: {
		width: '80%',
		height: 10,
		borderRadius: 5,
		backgroundColor: SL.track,
		overflow: 'hidden',
	},
	progressFill: { height: '100%', backgroundColor: SL.green },
	row: { flexDirection: 'row', gap: 16 },
	subButton: {
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: SL.trackBorder,
	},
	subButtonLabel: { color: SL.sub, fontSize: 16, fontWeight: '600' },
	mainButton: {
		paddingHorizontal: 40,
		paddingVertical: 14,
		borderRadius: 999,
		backgroundColor: SL.green,
	},
	mainButtonLabel: { color: '#0B2818', fontSize: 16, fontWeight: '800' },
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/calibration-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/games/sasayaki-limit/calibration-screen.tsx src/games/sasayaki-limit/__tests__/calibration-screen.test.tsx
git commit -m "feat: ささやきリミットの環境音キャリブレーション画面を追加（#65）"
```

---

### Task 7: result-screen.tsx — 最終結果と敗者発表

**Files:**

- Create: `src/games/sasayaki-limit/result-screen.tsx`
- Test: `src/games/sasayaki-limit/__tests__/result-screen.test.tsx`

**Interfaces:**

- Consumes: `SL`（Task 5）
- Produces: `ResultScreen({ names, successCounts, losers, onRetry })` — 成功数ランキング表示＋敗者発表＋「もう一回」ボタン

- [ ] **Step 1: 失敗するテストを書く**

```tsx
// src/games/sasayaki-limit/__tests__/result-screen.test.tsx
import { fireEvent, render } from '@testing-library/react-native'
import { ResultScreen } from '../result-screen'

describe('ResultScreen', () => {
	const props = {
		names: ['あか', 'あお', 'きいろ'],
		successCounts: [2, 0, 3],
		losers: [1],
		onRetry: jest.fn(),
	}
	it('敗者名と全員の成功数が表示される', () => {
		const { getByText, getByTestId } = render(<ResultScreen {...props} />)
		expect(getByTestId('loser-name').props.children).toBe('あお')
		expect(getByText('2 / 3 成功')).toBeTruthy()
		expect(getByText('0 / 3 成功')).toBeTruthy()
	})
	it('もう一回で onRetry が呼ばれる', () => {
		const { getByText } = render(<ResultScreen {...props} />)
		fireEvent.press(getByText('もう一回あそぶ'))
		expect(props.onRetry).toHaveBeenCalled()
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/result-screen.test.tsx`
Expected: FAIL（`../result-screen` が存在しない）

- [ ] **Step 3: result-screen.tsx を実装**

```tsx
// src/games/sasayaki-limit/result-screen.tsx
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ROUNDS } from './engine'
import { SL } from './theme'

type Props = {
	names: string[]
	successCounts: number[]
	losers: number[]
	onRetry: () => void
}

export function ResultScreen({ names, successCounts, losers, onRetry }: Props) {
	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.heading}>結果発表</Text>
			<Text style={styles.loserLabel}>🍻 負けはこの人！</Text>
			{losers.map((i) => (
				<Text key={i} style={styles.loserName} testID="loser-name">
					{names[i]}
				</Text>
			))}
			<View style={styles.list}>
				{names.map((name, i) => (
					<View key={i} style={[styles.row, losers.includes(i) && styles.rowLoser]}>
						<Text style={styles.name}>{name}</Text>
						<Text style={styles.count}>{`${successCounts[i]} / ${ROUNDS} 成功`}</Text>
					</View>
				))}
			</View>
			<Pressable style={styles.retryButton} onPress={onRetry}>
				<Text style={styles.retryLabel}>もう一回あそぶ</Text>
			</Pressable>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: { alignItems: 'center', gap: 12, padding: 24, paddingTop: 48 },
	heading: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
	loserLabel: { color: SL.sub, fontSize: 14, marginTop: 8 },
	loserName: { color: SL.red, fontSize: 32, fontWeight: '900' },
	list: { alignSelf: 'stretch', gap: 8, marginTop: 16 },
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		backgroundColor: SL.track,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderWidth: 1,
		borderColor: SL.trackBorder,
	},
	rowLoser: { borderColor: SL.red },
	name: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
	count: { color: SL.sub, fontSize: 14 },
	retryButton: {
		marginTop: 24,
		paddingHorizontal: 40,
		paddingVertical: 14,
		borderRadius: 999,
		backgroundColor: SL.green,
	},
	retryLabel: { color: '#0B2818', fontSize: 16, fontWeight: '800' },
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/result-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/games/sasayaki-limit/result-screen.tsx src/games/sasayaki-limit/__tests__/result-screen.test.tsx
git commit -m "feat: ささやきリミットの結果発表画面を追加（#65）"
```

---

### Task 8: sasayaki-limit-game.tsx — ルート結線（権限→キャリブレーション→プレイ）

**Files:**

- Create: `src/games/sasayaki-limit/sasayaki-limit-game.tsx`
- Test: `src/games/sasayaki-limit/__tests__/sasayaki-limit-game.test.tsx`

**Interfaces:**

- Consumes: Task 1〜7 の全て、`usePlayers`/`getDisplayNames`（`@/lib/players-store`）、`useTopics`（`@/lib/topics-store`）
- Produces: `SasayakiLimitGame`（registry の Component）

- [ ] **Step 1: 失敗するテストを書く**

```tsx
// src/games/sasayaki-limit/__tests__/sasayaki-limit-game.test.tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { MEASURE_MS } from '../engine'
import { SasayakiLimitGame } from '../sasayaki-limit-game'

jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: { View },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
	}
})
jest.mock('@/lib/players-store', () => ({
	usePlayers: jest.fn(() => ({ count: 2, names: ['あか', 'あお'], history: [] })),
	getDisplayNames: jest.fn(() => ['あか', 'あお']),
}))
jest.mock('@/lib/topics-store', () => ({
	useTopics: jest.fn(() => ({ topics: [], fetchedAt: null })),
}))

const mockRequestPermission = jest.fn(async () => true)
const mockStart = jest.fn(async () => {})
const mockStop = jest.fn(async () => {})
let mockMic = {
	permission: 'pending' as string,
	requestPermission: mockRequestPermission,
	start: mockStart,
	stop: mockStop,
	levelDb: -30,
	isRecording: false,
	meteringSupported: true as boolean | null,
}
jest.mock('../use-mic-level', () => ({
	useMicLevel: jest.fn(() => mockMic),
}))

beforeEach(() => {
	jest.useFakeTimers()
	jest.clearAllMocks()
	mockMic = { ...mockMic, permission: 'granted', meteringSupported: true }
})
afterEach(() => {
	jest.useRealTimers()
})

describe('SasayakiLimitGame', () => {
	it('権限拒否で案内画面が出る', () => {
		mockMic = { ...mockMic, permission: 'denied' }
		const { getByText } = render(<SasayakiLimitGame />)
		expect(getByText(/マイクの許可が必要/)).toBeTruthy()
	})
	it('metering 非対応端末はガード表示', () => {
		mockMic = { ...mockMic, meteringSupported: false }
		const { getByText } = render(<SasayakiLimitGame />)
		expect(getByText(/この端末ではマイクを利用できません/)).toBeTruthy()
	})
	it('キャリブレーション → speech → 3秒計測 → 判定まで流れる', async () => {
		const { getByText } = render(<SasayakiLimitGame />)
		// キャリブレーション（3秒）
		await act(async () => {
			jest.advanceTimersByTime(3100)
		})
		fireEvent.press(getByText('スタート'))
		// speech: 1人目のお題とスタートボタン
		expect(getByText('あか')).toBeTruthy()
		fireEvent.press(getByText('タップして発声スタート'))
		// measuring: 3秒経過で判定へ
		await act(async () => {
			jest.advanceTimersByTime(MEASURE_MS + 200)
		})
		expect(getByText('つぎの人へ')).toBeTruthy()
	})
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/sasayaki-limit-game.test.tsx`
Expected: FAIL（`../sasayaki-limit-game` が存在しない）

- [ ] **Step 3: sasayaki-limit-game.tsx を実装**

```tsx
// src/games/sasayaki-limit/sasayaki-limit-game.tsx
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { useTopics, type Topic } from '@/lib/topics-store'
import { useEffect, useReducer, useRef, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { CalibrationScreen } from './calibration-screen'
import {
	MEASURE_MS,
	METER_INTERVAL_MS,
	ROUNDS,
	normalizeDb,
	voiceRange,
	type VoiceRange,
} from './engine'
import { initialState, reduce } from './reducer'
import { ResultScreen } from './result-screen'
import { pickWhisperTopic } from './topics'
import { SL } from './theme'
import { useMicLevel } from './use-mic-level'
import { VolumeGauge } from './volume-gauge'

type Stage = 'permission' | 'calibration' | 'playing'

const JUDGEMENT_LABELS = {
	low: '🔻 小さすぎ…',
	ok: '✅ 緑ゾーン内！',
	high: '🔺 大きすぎ！',
} as const

export function SasayakiLimitGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const { topics } = useTopics()
	const mic = useMicLevel()

	const [stage, setStage] = useState<Stage>('permission')
	const [range, setRange] = useState<VoiceRange | null>(null)
	const [state, dispatch] = useReducer(reduce, players.count, (n) => initialState(n, Math.random))
	const [liveLevel, setLiveLevel] = useState(0)
	const [topic, setTopic] = useState<Topic | null>(null)
	const usedIdsRef = useRef<string[]>([])
	const peakRef = useRef(0)
	const levelDbRef = useRef(mic.levelDb)
	levelDbRef.current = mic.levelDb

	// マイク権限（初回マウント時にリクエスト）
	useEffect(() => {
		if (stage !== 'permission' || mic.permission !== 'pending') return
		mic.requestPermission().then((granted) => {
			if (granted) setStage('calibration')
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stage, mic.permission])
	useEffect(() => {
		if (stage === 'permission' && mic.permission === 'granted') setStage('calibration')
	}, [stage, mic.permission])

	// キャリブレーション・計測中はマイクを回す
	const shouldRecord =
		stage === 'calibration' || (stage === 'playing' && state.phase === 'measuring')
	useEffect(() => {
		if (!shouldRecord) return
		mic.start()
		return () => {
			mic.stop()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shouldRecord])

	// speech に入るたびにお題を引く
	useEffect(() => {
		if (stage !== 'playing' || state.phase !== 'speech') return
		const next = pickWhisperTopic(topics, usedIdsRef.current, Math.random)
		usedIdsRef.current = [...usedIdsRef.current, next.id]
		setTopic(next)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stage, state.phase, state.turnPos, state.round])

	// 3秒計測: METER_INTERVAL_MS ごとにサンプリングし、終了で measured を dispatch
	useEffect(() => {
		if (stage !== 'playing' || state.phase !== 'measuring' || range == null) return
		peakRef.current = 0
		setLiveLevel(0)
		const sampler = setInterval(() => {
			const norm = normalizeDb(levelDbRef.current, range)
			peakRef.current = Math.max(peakRef.current, norm)
			setLiveLevel(norm)
		}, METER_INTERVAL_MS)
		const finish = setTimeout(() => {
			clearInterval(sampler)
			dispatch({ type: 'measured', peakNorm: peakRef.current })
		}, MEASURE_MS)
		return () => {
			clearInterval(sampler)
			clearTimeout(finish)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stage, state.phase, range])

	if (mic.permission === 'denied') {
		return (
			<View style={styles.center}>
				<Text style={styles.guardTitle}>🎤 マイクの許可が必要です</Text>
				<Text style={styles.guardText}>
					このゲームは声の大きさで遊びます。{'\n'}設定からマイクを許可してね。{'\n'}
					録音は保存されません。
				</Text>
				<Pressable style={styles.mainButton} onPress={() => Linking.openSettings()}>
					<Text style={styles.mainButtonLabel}>設定を開く</Text>
				</Pressable>
			</View>
		)
	}
	if (mic.meteringSupported === false) {
		return (
			<View style={styles.center}>
				<Text style={styles.guardTitle}>この端末ではマイクを利用できません</Text>
				<Text style={styles.guardText}>
					音量の計測に対応していないため、このゲームは遊べません。
				</Text>
			</View>
		)
	}
	if (stage === 'permission') {
		return <View style={styles.center} />
	}
	if (stage === 'calibration') {
		return (
			<CalibrationScreen
				levelDb={mic.levelDb}
				onConfirm={(noiseFloorDb) => {
					setRange(voiceRange(noiseFloorDb))
					setStage('playing')
				}}
			/>
		)
	}

	const currentPlayer = state.activePlayers[state.turnPos]

	if (state.phase === 'result') {
		return (
			<ResultScreen
				names={names}
				successCounts={state.successCounts}
				losers={state.losers}
				onRetry={() => dispatch({ type: 'retry', rng: Math.random })}
			/>
		)
	}
	if (state.phase === 'round-result') {
		return (
			<View style={styles.center}>
				<Text style={styles.heading}>ラウンド {state.round} おわり！</Text>
				<View style={styles.scoreList}>
					{names.map((name, i) => (
						<Text key={i} style={styles.scoreRow}>
							{name}：{state.successCounts[i]} 成功
						</Text>
					))}
				</View>
				<Text style={styles.guardText}>次のラウンドはゾーンが狭くなるよ！</Text>
				<Pressable
					style={styles.mainButton}
					onPress={() => dispatch({ type: 'nextRound', rng: Math.random })}
				>
					<Text style={styles.mainButtonLabel}>ラウンド {state.round + 1} へ</Text>
				</Pressable>
			</View>
		)
	}
	if (state.phase === 'sudden-death-intro') {
		return (
			<View style={styles.center}>
				<Text style={styles.heading}>⚡ サドンデス！</Text>
				<Text style={styles.guardText}>
					{state.activePlayers.map((i) => names[i]).join(' vs ')}
					{'\n'}極狭ゾーンで1発勝負。外したら負け！
				</Text>
				<Pressable style={styles.mainButton} onPress={() => dispatch({ type: 'sdStart' })}>
					<Text style={styles.mainButtonLabel}>はじめる</Text>
				</Pressable>
			</View>
		)
	}

	// speech / measuring / judged 共通レイアウト
	return (
		<View style={styles.playContainer}>
			<Text style={styles.roundLabel}>
				{state.suddenDeath ? '⚡ サドンデス' : `ラウンド ${state.round} / ${ROUNDS}`}
			</Text>
			<Text style={styles.playerName}>{names[currentPlayer]}</Text>
			{topic != null && <Text style={styles.topicText}>「{topic.text}」</Text>}
			<View style={styles.gaugeRow}>
				<VolumeGauge
					level={liveLevel}
					peak={state.lastPeak}
					zone={state.zone}
					active={state.phase === 'measuring'}
				/>
			</View>
			{state.phase === 'speech' && (
				<Pressable
					style={styles.mainButton}
					onPress={() => dispatch({ type: 'startMeasure' })}
				>
					<Text style={styles.mainButtonLabel}>タップして発声スタート</Text>
				</Pressable>
			)}
			{state.phase === 'measuring' && (
				<Text style={styles.measuringLabel}>🎤 いまだ！言え！</Text>
			)}
			{state.phase === 'judged' && state.lastJudgement != null && (
				<>
					<Text style={styles.judgement}>{JUDGEMENT_LABELS[state.lastJudgement]}</Text>
					<Pressable
						style={styles.mainButton}
						onPress={() => dispatch({ type: 'next', rng: Math.random })}
					>
						<Text style={styles.mainButtonLabel}>つぎの人へ</Text>
					</Pressable>
				</>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
	playContainer: { flex: 1, alignItems: 'center', paddingTop: 32, gap: 12, padding: 24 },
	heading: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
	guardTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
	guardText: { color: SL.sub, fontSize: 14, textAlign: 'center', lineHeight: 22 },
	roundLabel: { color: SL.sub, fontSize: 14 },
	playerName: { color: SL.green, fontSize: 24, fontWeight: '800' },
	topicText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', textAlign: 'center' },
	gaugeRow: { flex: 1, justifyContent: 'center' },
	measuringLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
	judgement: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
	scoreList: { gap: 6, alignItems: 'center' },
	scoreRow: { color: '#FFFFFF', fontSize: 16 },
	mainButton: {
		paddingHorizontal: 36,
		paddingVertical: 14,
		borderRadius: 999,
		backgroundColor: SL.green,
	},
	mainButtonLabel: { color: '#0B2818', fontSize: 16, fontWeight: '800' },
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- src/games/sasayaki-limit/__tests__/sasayaki-limit-game.test.tsx`
Expected: PASS（3ケース）

- [ ] **Step 5: コミット**

```bash
git add src/games/sasayaki-limit/sasayaki-limit-game.tsx src/games/sasayaki-limit/__tests__/sasayaki-limit-game.test.tsx
git commit -m "feat: ささやきリミットのゲーム本体を結線（#65）"
```

---

### Task 9: registry 追加・registry テスト更新・CLAUDE.md 追記

**Files:**

- Modify: `src/games/registry.ts`（import 追加＋ games 配列末尾にエントリ追加）
- Modify: `src/games/__tests__/registry.test.ts`（件数 12→13）
- Modify: `CLAUDE.md`（収録ゲーム候補に追記）

**Interfaces:**

- Consumes: `SasayakiLimitGame`（Task 8）

- [ ] **Step 1: registry テストの期待値を先に更新（失敗を確認）**

`src/games/__tests__/registry.test.ts` の該当テストを差し替え:

```ts
it('MVP の8ゲーム＋プレミアム5本（バーストチキン・ダウトダイス・ワードウルフ・飲酒衰弱・ささやきリミット）が登録されている', () => {
	expect(games).toHaveLength(13)
})
```

Run: `npm test -- src/games/__tests__/registry.test.ts`
Expected: FAIL（12 !== 13）

- [ ] **Step 2: registry.ts にエントリ追加**

import 追加（アルファベット順の並びに合わせて `ReactionPairsGame` の後）:

```ts
import { SasayakiLimitGame } from './sasayaki-limit/sasayaki-limit-game'
```

`games` 配列末尾（inshu-suijaku エントリの後）に追加:

```ts
	{
		id: 'sasayaki-limit',
		title: 'ささやきリミット',
		tagline: '緑ゾーンの声量で言い切れ！',
		emoji: '🤫',
		gradient: ['#3DDC84', '#0FA3B1'],
		minPlayers: 2,
		maxPlayers: 12,
		requiresPlayers: true,
		premium: true,
		catchCopy: '大きすぎても小さすぎてもアウト！\nお題セリフを「ちょうどいい声」で言い切れ！',
		summary:
			'このゲームは、マイクの音量メーターを見ながらお題セリフを「緑ゾーン内の音量」で言い切るゲームです！ラウンドが進むと緑ゾーンはどんどん狭くなり、3ラウンド合計の成功数が最少の人が負け。録音は保存されないので安心です！',
		howToPlay: [
			'① メンバーを登録（2〜12名）して、まわりの音を3秒はかろう！（マイク許可が必要）',
			'② 自分の番が来たらタップ！3秒以内にお題セリフを発声！',
			'③ 声の大きさ（ピーク）が緑ゾーン内なら成功。大きすぎても小さすぎても失敗！',
			'④ ラウンドごとにゾーンが狭くなる全3ラウンド。成功数最少の人が負け！（同率はサドンデス）',
		],
		Component: SasayakiLimitGame,
	},
```

- [ ] **Step 3: テストが通ることを確認**

Run: `npm test -- src/games/__tests__/registry.test.ts`
Expected: PASS

- [ ] **Step 4: CLAUDE.md の収録ゲーム候補に追記**

「• ワードウルフ – …」の行の直後に追加:

```markdown
• ささやきリミット – マイクの音量メーターを見ながらお題セリフを「緑ゾーン内の音量」で言い切る声量チャレンジ（プレミアム）。
```

- [ ] **Step 5: コミット**

```bash
git add src/games/registry.ts src/games/__tests__/registry.test.ts CLAUDE.md
git commit -m "feat: ささやきリミットを registry に追加（プレミアム・2〜12人）（#65）"
```

---

### Task 10: Supabase seed — whisper パック配信

**Files:**

- Create: `supabase/migrations/0006_seed_whisper_topics.sql`

**Interfaces:**

- Consumes: 既存 `public.topics` テーブル（`pack`, `text`, `is_premium` は default false）
- Produces: pack `'whisper'` のお題30件（先頭20件は Task 2 のフォールバックと同一文言・同一順序）

- [ ] **Step 1: seed SQL を作成**

```sql
-- ささやきリミット用セリフお題（30件・無料 pack）
-- 先頭20件は src/games/sasayaki-limit/topics.ts のフォールバックと同一文言（同期必須）
-- 年齢レーティング配慮: 飲酒・恋愛の直接的表現を入れない

insert into public.topics (pack, text) values
('whisper', '乾杯ーー！'),
('whisper', '今日は無礼講だ！'),
('whisper', 'よっ、待ってました！'),
('whisper', '幹事さん、ありがとう！'),
('whisper', '明日もがんばるぞー！'),
('whisper', 'ここのからあげ、世界一！'),
('whisper', 'みんな大好きだーー！'),
('whisper', '次いくぞ、次！'),
('whisper', '今日という日を忘れない！'),
('whisper', 'しーっ、静かに！'),
('whisper', '俺の話を聞けーー！'),
('whisper', 'ラストオーダーです！'),
('whisper', '優勝ーー！'),
('whisper', 'それな！！'),
('whisper', 'まじで！？'),
('whisper', 'やっぱりそうだと思った！'),
('whisper', '全員集合ーー！'),
('whisper', 'お疲れさまでした！'),
('whisper', 'さすがです先輩！'),
('whisper', 'アンコール！アンコール！'),
('whisper', 'ちょっと聞いてくださいよ！'),
('whisper', '天才かもしれない！'),
('whisper', '今日は帰りたくない！'),
('whisper', '見て見て、これすごい！'),
('whisper', '神ってる！'),
('whisper', '早く言ってよ〜！'),
('whisper', 'なんでやねん！'),
('whisper', '本日の主役はあなたです！'),
('whisper', '世界一楽しい夜！'),
('whisper', 'また来週も集まろう！');
```

- [ ] **Step 2: 適用（Supabase CLI がリンク済みの場合）**

Run: `npx supabase db push`（未リンクなら適用はスキップし、PR に「要 db push」と明記）
Expected: 0006 が適用される

- [ ] **Step 3: コミット**

```bash
git add supabase/migrations/0006_seed_whisper_topics.sql
git commit -m "feat: whisper パックのお題30件を seed 追加（#65）"
```

---

### Task 11: 最終検証と PR 作成

**Files:** なし（検証と PR のみ）

- [ ] **Step 1: 全チェックを実行**

```bash
npm run typecheck && npm run lint && npm test && npm run format:check
```

Expected: 全て成功（format:check が落ちたら `npm run format` → 差分をコミット）

- [ ] **Step 2: 実機/シミュレータでの動作メモ**

シミュレータはマイク入力が不安定なため、metering ガード表示（unavailable）の確認のみ行い、キャリブレーション精度・機種差の検証は Issue の備考通り **実機テスト（#42 と合わせて）** に委ねる。PR 本文にその旨を記載する。

- [ ] **Step 3: push して PR 作成**

```bash
git push -u origin feature/65-sasayaki-limit
gh pr create --base develop --title "feat: ささやきリミット（音量ゲージチャレンジ・プレミアム）を追加 (#65)" --body "$(cat <<'EOF'
## 概要
#65 ささやきリミットの実装。マイク音量メーターを見ながらお題セリフを「緑ゾーン内の音量」で言い切るプレミアムゲーム。

## 実装内容
- ゾーン計算・判定・集計の純関数エンジン（境界値テスト付き）
- 3秒キャリブレーション（環境音の中央値でノイズフロア補正）
- expo-audio metering ラッパー（権限フロー・録音即削除・非対応端末ガード）
- Reanimated 音量ゲージ（緑ゾーングロー・ピークマーカー）
- 3ラウンド＋極狭ゾーンサドンデスの reducer
- whisper パック seed（30件）＋ローカルフォールバック20件
- registry 追加（プレミアム・2〜12人）、CLAUDE.md 追記

## テスト
- `npm run typecheck` / `npm run lint` / `npm test` 通過

## 残タスク
- 実機でのキャリブレーション精度・機種差検証（#42 と合わせて）
- Supabase への `npx supabase db push`（未適用の場合）

Closes #65

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR が develop 向けに作成される
