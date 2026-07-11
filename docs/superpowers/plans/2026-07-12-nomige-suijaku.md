# 飲みゲー衰弱（#67）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** トランプ素材のペア当て神経衰弱に秘匿罰ゲームを仕込んだプレミアム限定ゲーム「飲みゲー衰弱」を実装する。

**Architecture:** 純粋エンジン（`engine.ts`）＋ reducer（`reducer.ts`）＋フェーズ切替コンポーネント方式。参照実装は `src/games/reaction-pairs/`（同じ神経衰弱・カードグリッド・罰オーバーレイ構造）と `src/games/daut-dice/`（最新のテスト規約・秘匿テスト）。カード表面はパブリックドメインのトランプ画像（WebP 事前ラスタライズ）を `expo-image` で表示する。

**Tech Stack:** Expo (React Native) / TypeScript / react-native-reanimated（フリップ・クロスフェード）/ expo-image / jest + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-07-10-nomige-suijaku-design.md`（先に必ず読むこと）

**Branch:** `feature/67-nomige-suijaku`（作成済み。この上で作業する）

## Global Constraints

- コードフォーマット: **タブ幅4・セミコロンなし・シングルクォート**（既存コードに合わせる。Prettier 設定済み）
- テスト: React 19 のため **`await act(async () => { ... })` 必須**（同期 act は fake timers と併用で失敗する）。参照: `src/games/daut-dice/__tests__/daut-dice-game.test.tsx`
- `.env` 系ファイルは読まない（プロジェクトのセキュリティポリシー）
- ゲーム ID: `nomige-suijaku` / タイトル表記: **飲みゲー衰弱**
- プレミアム: 既存基盤に `premium: true` で乗るだけ（`src/lib/premium.ts` はスタブ、#7 で結線。本プランでは変更しない）
- 参加人数 2〜12、`requiresPlayers: true`
- 盤面: 小 4×4（7ペア＋J2）/ 中 4×5（9ペア＋J2）/ 大 5×6（14ペア＋J2）。ジョーカーは常に2枚
- 罰テキストは**ペア成立まで UI に描画しない**（秘匿テストで担保）
- カード素材: notpeter/Vector-Playing-Cards（パブリックドメイン）のみ使用。他ソースの画像は入れない
- コマンド: テスト `bun run test -- <path>` / 型 `bun run typecheck` / lint `bun run lint` / フォーマット `bun run format`
- コミットは各タスク末尾で行い、メッセージに `(#67)` を付ける

## File Structure

```
scripts/
  build-card-assets.sh        // 素材リポジトリ → assets/images/cards/*.webp 再生成（macOS）
  generate-card-assets.mjs    // assets の命名から card-assets.ts を自動生成
assets/images/cards/
  {RANK}{S}.webp × 52 + Joker1.webp + README.md
src/games/nomige-suijaku/
  punishments.ts              // 罰プリセット（normal 40 / special 10、スペック確定全文）
  engine.ts                   // 純関数: BOARD_CONFIG / shuffle / createDeck / isMatch / remainingPairs
  card-assets.ts              // rank+suit → require(webp) 解決マップ（自動生成）
  reducer.ts                  // GameState / Action / reduce / initialState / isMismatchShown
  theme.ts                    // NS カラー（registry グラデと統一）
  size-select.tsx             // 盤面サイズ3択＋スタート
  card-grid.tsx               // グリッド＋フリップイン＋成立クロスフェード
  punish-reveal.tsx           // 罰発表オーバーレイ（pair / joker / n40ラッキー兼用）
  result-screen.tsx           // 獲得ペア数ランキング（同数同順位・最下位ハイライト）
  nomige-suijaku-game.tsx     // 本体（useReducer＋フェーズ切替＋タイマー）
  __tests__/                  // 上記のユニット・コンポーネントテスト
src/games/registry.ts         // 修正: entry 追加（premium: true）
src/games/__tests__/registry.test.ts // 修正: ゲーム数 10 → 11
```

フェーズ設計（スペックの `punish` の前に成立演出用フェーズを1つ追加する）:

```
size → play ─(不成立: 1.5秒後 hideMismatch)→ play（次の人）
         └─(成立)→ matchAnim ─(約1秒後 matchAnimDone)→ punish ─(punishDone)→ play / result
         └─(ジョーカー)──────────────────────────────→ punish ─(punishDone)→ play / result
```

---

### Task 1: カード素材パイプライン（assets/images/cards）

**Files:**
- Create: `scripts/build-card-assets.sh`
- Create: `assets/images/cards/README.md`
- Create: `assets/images/cards/*.webp`（スクリプト実行で53枚生成）

**Interfaces:**
- Produces: `assets/images/cards/{RANK}{S}.webp`（RANK = A,2..10,J,Q,K / S = S,H,D,C）と `assets/images/cards/Joker1.webp`。Task 4 の `card-assets.ts` がこの命名を require する

- [ ] **Step 1: ビルドスクリプトを書く**

`scripts/build-card-assets.sh`:

```bash
#!/usr/bin/env bash
# assets/images/cards/*.webp をパブリックドメイン素材から再生成する（macOS 専用）
# 素材: https://github.com/notpeter/Vector-Playing-Cards (public domain / WTFPL)
set -euo pipefail

command -v cwebp >/dev/null || { echo "cwebp がありません: brew install webp" >&2; exit 1; }
command -v qlmanage >/dev/null || { echo "qlmanage がありません（macOS 専用スクリプトです）" >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/images/cards"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --depth 1 https://github.com/notpeter/Vector-Playing-Cards.git "$TMP/repo"
mkdir -p "$TMP/png" "$OUT"

# SVG → 幅360px PNG（絵札SVGは1MB超のため実行時描画せず事前ラスタライズする）
qlmanage -t -s 360 -o "$TMP/png" "$TMP/repo/cards-svg/"*.svg >/dev/null

for f in "$TMP/png"/*.svg.png; do
	base="$(basename "$f" .svg.png)"
	[ "$base" = "Joker2" ] && continue # ジョーカーは Joker1 の1種のみ使う
	cwebp -quiet -q 85 "$f" -o "$OUT/$base.webp"
done

echo "generated: $(ls "$OUT"/*.webp | wc -l | tr -d ' ') webp files -> $OUT"
```

- [ ] **Step 2: README を書く**

`assets/images/cards/README.md`:

```markdown
# トランプカード素材

- 出典: [notpeter/Vector-Playing-Cards](https://github.com/notpeter/Vector-Playing-Cards)（原作 Byron Knoll「vector-playing-cards」）
- ライセンス: パブリックドメイン（PD が認められない法域では WTFPL）。商用組み込み可
- 内容: 52枚（`{RANK}{S}.webp`、RANK=A,2..10,J,Q,K / S=S,H,D,C）＋ `Joker1.webp` の計53枚
- 形式: 幅360px・WebP(q85)。合計約700KB
- 再生成: `bash scripts/build-card-assets.sh`（macOS、要 `brew install webp`）
- 参照マップの再生成: `node scripts/generate-card-assets.mjs`
```

- [ ] **Step 3: スクリプトを実行して素材を生成する**

Run: `chmod +x scripts/build-card-assets.sh && bash scripts/build-card-assets.sh`
Expected: `generated: 53 webp files -> .../assets/images/cards`

- [ ] **Step 4: 生成結果を検証する**

Run: `ls assets/images/cards/*.webp | wc -l && du -sh assets/images/cards`
Expected: `53` と合計 1MB 未満（実測 約700KB）

Run: `ls assets/images/cards | grep -c "Joker"`
Expected: `1`（Joker1.webp のみ）

- [ ] **Step 5: Commit**

```bash
git add scripts/build-card-assets.sh assets/images/cards
git commit -m "feat: トランプカード素材（PD/WebP 53枚）とビルドスクリプトを追加 (#67)"
```

---

### Task 2: 罰プリセット punishments.ts

**Files:**
- Create: `src/games/nomige-suijaku/punishments.ts`
- Test: `src/games/nomige-suijaku/__tests__/punishments.test.ts`

**Interfaces:**
- Produces: `type Punishment = { id: string; text: string; type: 'normal' | 'special' }` / `NORMAL_PUNISHMENTS: readonly Punishment[]`（40個）/ `SPECIAL_PUNISHMENTS: readonly Punishment[]`（10個）/ `LUCKY_PUNISHMENT_ID = 'n40'`。Task 3 の `createDeck` と Task 8 の `punish-reveal` が使う

- [ ] **Step 1: 失敗するテストを書く**

`src/games/nomige-suijaku/__tests__/punishments.test.ts`:

```ts
import {
	LUCKY_PUNISHMENT_ID,
	NORMAL_PUNISHMENTS,
	SPECIAL_PUNISHMENTS,
} from '../punishments'

it('通常罰は40個・特大罰は10個ある', () => {
	expect(NORMAL_PUNISHMENTS).toHaveLength(40)
	expect(SPECIAL_PUNISHMENTS).toHaveLength(10)
})

it('ID は n01..n40 / s01..s10 で重複がない', () => {
	const nIds = NORMAL_PUNISHMENTS.map((p) => p.id)
	const sIds = SPECIAL_PUNISHMENTS.map((p) => p.id)
	expect(nIds).toEqual(Array.from({ length: 40 }, (_, i) => `n${String(i + 1).padStart(2, '0')}`))
	expect(sIds).toEqual(Array.from({ length: 10 }, (_, i) => `s${String(i + 1).padStart(2, '0')}`))
})

it('type が正しく、テキストは空でなく重複しない', () => {
	NORMAL_PUNISHMENTS.forEach((p) => expect(p.type).toBe('normal'))
	SPECIAL_PUNISHMENTS.forEach((p) => expect(p.type).toBe('special'))
	const texts = [...NORMAL_PUNISHMENTS, ...SPECIAL_PUNISHMENTS].map((p) => p.text)
	expect(new Set(texts).size).toBe(texts.length)
	texts.forEach((t) => expect(t.length).toBeGreaterThan(0))
})

it('ラッキーカードは n40', () => {
	expect(LUCKY_PUNISHMENT_ID).toBe('n40')
	expect(NORMAL_PUNISHMENTS.find((p) => p.id === 'n40')?.text).toContain('ラッキー')
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/punishments.test.ts`
Expected: FAIL（`Cannot find module '../punishments'`）

- [ ] **Step 3: punishments.ts を実装する**

`src/games/nomige-suijaku/punishments.ts`（テキストはスペック「罰プリセット確定全文」と一字一句同じにする）:

```ts
export type PunishmentType = 'normal' | 'special'

export type Punishment = {
	id: string
	text: string
	type: PunishmentType
}

// n40 は罰なしのラッキーカード。punish-reveal で煽り文言を差し替える
export const LUCKY_PUNISHMENT_ID = 'n40'

// 将来 topics-store の pack（Supabase 配信）に載せ替えられるよう ID を固定する
export const NORMAL_PUNISHMENTS: readonly Punishment[] = [
	{ id: 'n01', text: '1杯飲む', type: 'normal' },
	{ id: 'n02', text: '2杯飲む', type: 'normal' },
	{ id: 'n03', text: '3杯飲む', type: 'normal' },
	{ id: 'n04', text: 'グラス半分まで飲む', type: 'normal' },
	{ id: 'n05', text: '左隣の人と乾杯して1杯', type: 'normal' },
	{ id: 'n06', text: '右隣の人と乾杯して1杯', type: 'normal' },
	{ id: 'n07', text: '全員と乾杯して1杯', type: 'normal' },
	{ id: 'n08', text: 'ペアを揃えた人と乾杯して1杯', type: 'normal' },
	{ id: 'n09', text: '利き手と逆の手で1杯', type: 'normal' },
	{ id: 'n10', text: '目をつぶって1杯', type: 'normal' },
	{ id: 'n11', text: '「ありがとうございます！」とお礼を言ってから1杯', type: 'normal' },
	{ id: 'n12', text: '乾杯の音頭をとってから全員で1杯（自分は2杯）', type: 'normal' },
	{ id: 'n13', text: '片足立ちのまま1杯', type: 'normal' },
	{ id: 'n14', text: '立ち上がって一礼してから1杯', type: 'normal' },
	{ id: 'n15', text: 'ものまねを1つ披露、スベったら2杯', type: 'normal' },
	{ id: 'n16', text: '一発ギャグ、スベったら2杯', type: 'normal' },
	{ id: 'n17', text: '隣の人を30秒褒め続ける、噛んだら1杯', type: 'normal' },
	{ id: 'n18', text: '好きな人のタイプを発表、言えなければ2杯', type: 'normal' },
	{ id: 'n19', text: '最近の失敗談を1つ話す、話せなければ2杯', type: 'normal' },
	{ id: 'n20', text: '変顔を10秒キープ、笑ったら1杯', type: 'normal' },
	{ id: 'n21', text: '自分の第一印象を隣の人に聞いて1杯', type: 'normal' },
	{ id: 'n22', text: 'スマホの一番新しい写真を見せる、拒否なら3杯', type: 'normal' },
	{ id: 'n23', text: '今日イチ笑ったことを発表して1杯', type: 'normal' },
	{ id: 'n24', text: '「実は…」で始まる話を1つ、できなければ2杯', type: 'normal' },
	{ id: 'n25', text: 'ペアを揃えた人とじゃんけん、負けたら2杯・勝ったら1杯', type: 'normal' },
	{ id: 'n26', text: '早口言葉「生麦生米生卵」を3回、噛んだら1杯', type: 'normal' },
	{ id: 'n27', text: '次の自分の番まで敬語禁止、使ったら1杯', type: 'normal' },
	{ id: 'n28', text: '全員の名前をフルネームで言う、間違えたら1杯', type: 'normal' },
	{ id: 'n29', text: '好きな飲み物・銘柄を30秒熱弁して1杯', type: 'normal' },
	{ id: 'n30', text: '「今夜は帰さないぞ」とキメ顔で言って1杯', type: 'normal' },
	{ id: 'n31', text: '次の自分の番まで語尾は「にゃん」、忘れたら1杯', type: 'normal' },
	{ id: 'n32', text: '隣の人のグラスにドリンクを注いで、自分は1杯', type: 'normal' },
	{ id: 'n33', text: '秘密を1つ暴露、できなければ3杯', type: 'normal' },
	{ id: 'n34', text: '投げキッスを全員に、できなければ2杯', type: 'normal' },
	{ id: 'n35', text: '自己紹介をもう一度全力で、照れたら1杯', type: 'normal' },
	{ id: 'n36', text: '30秒間笑顔キープで1杯', type: 'normal' },
	{ id: 'n37', text: '隣の人と腕相撲、負けたら2杯', type: 'normal' },
	{ id: 'n38', text: '好きな芸人のギャグを1つ、スベったら2杯', type: 'normal' },
	{ id: 'n39', text: '「みんな大好き！」と叫んで1杯', type: 'normal' },
	{ id: 'n40', text: '何もなし！ラッキーカード（全員から拍手をもらう）', type: 'normal' },
]

export const SPECIAL_PUNISHMENTS: readonly Punishment[] = [
	{ id: 's01', text: 'グラスの残りを飲み干す（無理は禁物！）', type: 'special' },
	{ id: 's02', text: '全員のグラスにドリンクを注いで乾杯の音頭、自分は3杯', type: 'special' },
	{ id: 's03', text: '次のドリンクを全員分おごる宣言、できなければグラス半分', type: 'special' },
	{ id: 's04', text: '全員に一発芸、スベったら追加で2杯', type: 'special' },
	{ id: 's05', text: '好きな人（または推し）を実名で発表、言えなければグラス半分', type: 'special' },
	{ id: 's06', text: 'LINEの最新トーク画面を見せる、拒否ならグラス半分', type: 'special' },
	{ id: 's07', text: 'ゲーム終了まで王様キャラで話す、素に戻ったら1杯', type: 'special' },
	{ id: 's08', text: '全員から質問を1つずつ受けて正直に答える、パスは1回につき1杯', type: 'special' },
	{ id: 's09', text: '電話帳の5番目の人との思い出を語る、拒否ならグラス半分', type: 'special' },
	{ id: 's10', text: '幹事（いなければ最年長）に感謝を全力で伝えてグラス半分', type: 'special' },
]
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/punishments.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
git add src/games/nomige-suijaku/punishments.ts src/games/nomige-suijaku/__tests__/punishments.test.ts
git commit -m "feat: 飲みゲー衰弱の罰プリセット（normal40/special10）を追加 (#67)"
```

---

### Task 3: engine.ts（デッキ生成・マッチ判定）

**Files:**
- Create: `src/games/nomige-suijaku/engine.ts`
- Test: `src/games/nomige-suijaku/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: `NORMAL_PUNISHMENTS` / `SPECIAL_PUNISHMENTS`（Task 2）
- Produces:
  - `type Rng = () => number`
  - `type BoardSize = 'small' | 'medium' | 'large'`
  - `type Suit = '♠' | '♥' | '♦' | '♣'`
  - `type Card = { id: string; pairId: string | null; rank: string; suit: Suit | null; punishmentId: string; punishment: string; state: 'hidden' | 'revealed' | 'removed' }`
  - `BOARD_CONFIG: Record<BoardSize, { columns: number; pairs: number; label: string; estimate: string }>`
  - `JOKER_COUNT = 2`
  - `shuffle<T>(items, rng): T[]` / `createDeck(size, rng): Card[]` / `isMatch(a, b): boolean` / `remainingPairs(cards): number`

- [ ] **Step 1: 失敗するテストを書く**

`src/games/nomige-suijaku/__tests__/engine.test.ts`:

```ts
import {
	BOARD_CONFIG,
	createDeck,
	isMatch,
	JOKER_COUNT,
	remainingPairs,
	type BoardSize,
	type Card,
} from '../engine'

// 決定的な疑似乱数（mulberry32）
function mulberry32(seed: number): () => number {
	let s = seed >>> 0
	return () => {
		s = (s + 0x6d2b79f5) >>> 0
		let t = s
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

const sizes: BoardSize[] = ['small', 'medium', 'large']

describe.each(sizes)('createDeck(%s)', (size) => {
	const rng = mulberry32(42)
	const deck = createDeck(size, rng)
	const { pairs } = BOARD_CONFIG[size]

	it('枚数 = ペア数×2 + ジョーカー2', () => {
		expect(deck).toHaveLength(pairs * 2 + JOKER_COUNT)
	})

	it('ジョーカーは2枚で pairId は null', () => {
		const jokers = deck.filter((c) => c.rank === 'JOKER')
		expect(jokers).toHaveLength(2)
		jokers.forEach((j) => {
			expect(j.pairId).toBeNull()
			expect(j.suit).toBeNull()
			expect(j.punishmentId).toMatch(/^s\d{2}$/)
		})
	})

	it('各ペアは同ランク・同スート・同罰テキストの2枚組', () => {
		const byPair = new Map<string, Card[]>()
		deck.filter((c) => c.pairId).forEach((c) => {
			byPair.set(c.pairId as string, [...(byPair.get(c.pairId as string) ?? []), c])
		})
		expect(byPair.size).toBe(pairs)
		byPair.forEach((cards) => {
			expect(cards).toHaveLength(2)
			expect(cards[0].rank).toBe(cards[1].rank)
			expect(cards[0].suit).toBe(cards[1].suit)
			expect(cards[0].punishment).toBe(cards[1].punishment)
			expect(cards[0].punishmentId).toMatch(/^n\d{2}$/)
		})
	})

	it('ランク＋スートの組はペア間で重複しない', () => {
		const combos = [...new Set(deck.filter((c) => c.pairId).map((c) => `${c.rank}${c.suit}`))]
		expect(combos).toHaveLength(pairs)
	})

	it('罰はペア間・ジョーカー間で重複しない', () => {
		const ids = deck.map((c) => c.punishmentId)
		expect(new Set(ids).size).toBe(pairs + JOKER_COUNT)
	})

	it('全カード hidden で始まる', () => {
		deck.forEach((c) => expect(c.state).toBe('hidden'))
	})
})

it('isMatch: 同 pairId のみ true（ジョーカー同士は false）', () => {
	const rng = mulberry32(1)
	const deck = createDeck('small', rng)
	const pair = deck.filter((c) => c.pairId === deck.find((d) => d.pairId)?.pairId)
	expect(isMatch(pair[0], pair[1])).toBe(true)
	const jokers = deck.filter((c) => c.rank === 'JOKER')
	expect(isMatch(jokers[0], jokers[1])).toBe(false)
	expect(isMatch(pair[0], jokers[0])).toBe(false)
})

it('remainingPairs: removed を除いたペア数を返す', () => {
	const deck = createDeck('small', mulberry32(2))
	expect(remainingPairs(deck)).toBe(7)
	const firstPairId = deck.find((c) => c.pairId)?.pairId
	const removed = deck.map((c) =>
		c.pairId === firstPairId ? { ...c, state: 'removed' as const } : c,
	)
	expect(remainingPairs(removed)).toBe(6)
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/engine.test.ts`
Expected: FAIL（`Cannot find module '../engine'`）

- [ ] **Step 3: engine.ts を実装する**

`src/games/nomige-suijaku/engine.ts`:

```ts
import { NORMAL_PUNISHMENTS, SPECIAL_PUNISHMENTS } from './punishments'

export type Rng = () => number

export type BoardSize = 'small' | 'medium' | 'large'

export type Suit = '♠' | '♥' | '♦' | '♣'

export type CardState = 'hidden' | 'revealed' | 'removed'

export type Card = {
	id: string // 'p3-a' | 'p3-b' | 'joker-1'
	pairId: string | null // ジョーカーは null
	rank: string // 'A'..'K' | 'JOKER'
	suit: Suit | null // ジョーカーは null
	punishmentId: string
	punishment: string // ペア成立（またはジョーカー発動）まで UI に出さない
	state: CardState
}

export const JOKER_COUNT = 2

// columns はグリッドの列数（小・中は4列、大は5列）
export const BOARD_CONFIG = {
	small: { columns: 4, pairs: 7, label: '小 4×4', estimate: '約10分' },
	medium: { columns: 4, pairs: 9, label: '中 4×5', estimate: '約15分' },
	large: { columns: 5, pairs: 14, label: '大 5×6', estimate: '約20分' },
} as const satisfies Record<
	BoardSize,
	{ columns: number; pairs: number; label: string; estimate: string }
>

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
export const SUITS = ['♠', '♥', '♦', '♣'] as const

// Fisher–Yates。rng は [0,1) を返す想定
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
	const arr = [...items]
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}

// 標準52枚からペア数ぶんの (rank, suit) を重複なし抽出し、罰を割り当ててシャッフルする
export function createDeck(size: BoardSize, rng: Rng): Card[] {
	const { pairs } = BOARD_CONFIG[size]
	const combos = SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })))
	const picked = shuffle(combos, rng).slice(0, pairs)
	const normals = shuffle(NORMAL_PUNISHMENTS, rng).slice(0, pairs)
	const specials = shuffle(SPECIAL_PUNISHMENTS, rng).slice(0, JOKER_COUNT)

	const cards: Card[] = []
	picked.forEach((combo, i) => {
		const pairId = `p${i + 1}`
		const pun = normals[i]
		const base = {
			pairId,
			rank: combo.rank,
			suit: combo.suit,
			punishmentId: pun.id,
			punishment: pun.text,
			state: 'hidden' as const,
		}
		cards.push({ id: `${pairId}-a`, ...base }, { id: `${pairId}-b`, ...base })
	})
	specials.forEach((pun, i) => {
		cards.push({
			id: `joker-${i + 1}`,
			pairId: null,
			rank: 'JOKER',
			suit: null,
			punishmentId: pun.id,
			punishment: pun.text,
			state: 'hidden',
		})
	})
	return shuffle(cards, rng)
}

export function isMatch(a: Card, b: Card): boolean {
	return a.pairId !== null && a.pairId === b.pairId
}

// 未消化（removed でない）ペアの残り数
export function remainingPairs(cards: Card[]): number {
	const alive = new Set(
		cards.filter((c) => c.pairId !== null && c.state !== 'removed').map((c) => c.pairId),
	)
	return alive.size
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/games/nomige-suijaku/engine.ts src/games/nomige-suijaku/__tests__/engine.test.ts
git commit -m "feat: 飲みゲー衰弱エンジン（デッキ生成・マッチ判定）を追加 (#67)"
```

---

### Task 4: card-assets.ts（画像 require マップ・自動生成）

**Files:**
- Create: `scripts/generate-card-assets.mjs`
- Create: `src/games/nomige-suijaku/card-assets.ts`（スクリプトで生成してコミット）
- Test: `src/games/nomige-suijaku/__tests__/card-assets.test.ts`

**Interfaces:**
- Consumes: `type Suit`（Task 3）/ `assets/images/cards/*.webp`（Task 1）
- Produces: `cardImageSource(rank: string, suit: Suit): number` / `JOKER_IMAGE: number`。Task 7 の `card-grid.tsx` が使う

- [ ] **Step 1: 失敗するテストを書く**

`src/games/nomige-suijaku/__tests__/card-assets.test.ts`:

```ts
import { cardImageSource, JOKER_IMAGE } from '../card-assets'
import { RANKS, SUITS } from '../engine'

it('52枚すべての rank×suit が解決できる', () => {
	SUITS.forEach((suit) => {
		RANKS.forEach((rank) => {
			expect(cardImageSource(rank, suit)).toBeDefined()
		})
	})
})

it('ジョーカー画像が解決できる', () => {
	expect(JOKER_IMAGE).toBeDefined()
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/card-assets.test.ts`
Expected: FAIL（`Cannot find module '../card-assets'`）

- [ ] **Step 3: 生成スクリプトを書く**

`scripts/generate-card-assets.mjs`:

```js
// src/games/nomige-suijaku/card-assets.ts を生成する。
// React Native の require は静的パス必須のため、52枚＋ジョーカーを列挙したマップを吐く
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUIT_LETTERS = ['S', 'H', 'D', 'C']

const lines = [
	'// このファイルは scripts/generate-card-assets.mjs による自動生成。手で編集しない',
	"import type { Suit } from './engine'",
	'',
	'const CARD_IMAGES: Record<string, number> = {',
]
for (const s of SUIT_LETTERS) {
	for (const r of RANKS) {
		lines.push(`\t'${r}${s}': require('@/assets/images/cards/${r}${s}.webp'),`)
	}
}
lines.push(
	'}',
	'',
	"const SUIT_LETTER: Record<Suit, string> = { '♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C' }",
	'',
	'export function cardImageSource(rank: string, suit: Suit): number {',
	'\treturn CARD_IMAGES[`${rank}${SUIT_LETTER[suit]}`]',
	'}',
	'',
	"export const JOKER_IMAGE: number = require('@/assets/images/cards/Joker1.webp')",
	'',
)

const out = join(
	dirname(fileURLToPath(import.meta.url)),
	'../src/games/nomige-suijaku/card-assets.ts',
)
writeFileSync(out, lines.join('\n'))
console.log(`generated: ${out}`)
```

- [ ] **Step 4: 生成して検証する**

Run: `node scripts/generate-card-assets.mjs && bunx prettier --write src/games/nomige-suijaku/card-assets.ts && grep -c "require(" src/games/nomige-suijaku/card-assets.ts`
Expected: `53`（52枚＋ジョーカー。prettier で整形して format:check に通す）

Run: `bun run test -- src/games/nomige-suijaku/__tests__/card-assets.test.ts`
Expected: PASS

Run: `bun run typecheck`
Expected: エラーなし

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-card-assets.mjs src/games/nomige-suijaku/card-assets.ts src/games/nomige-suijaku/__tests__/card-assets.test.ts
git commit -m "feat: カード画像 require マップ（自動生成）を追加 (#67)"
```

---

### Task 5: reducer.ts（状態遷移）

**Files:**
- Create: `src/games/nomige-suijaku/reducer.ts`
- Test: `src/games/nomige-suijaku/__tests__/reducer.test.ts`

**Interfaces:**
- Consumes: `createDeck` / `isMatch` / `type Card, BoardSize, Rng`（Task 3）
- Produces:
  - `type Phase = 'size' | 'play' | 'matchAnim' | 'punish' | 'result'`
  - `type Punish = { kind: 'pair' | 'joker'; punishmentId: string; text: string; playerIndex: number }`
  - `type GameState = { phase: Phase; size: BoardSize; cards: Card[]; playerCount: number; turnIndex: number; flippedIds: string[]; scores: number[]; punish: Punish | null }`
  - `type Action = { type: 'start'; size: BoardSize; rng: Rng } | { type: 'flip'; cardId: string } | { type: 'hideMismatch' } | { type: 'matchAnimDone' } | { type: 'punishDone' } | { type: 'retry'; rng: Rng }`
  - `initialState(playerCount): GameState` / `reduce(state, action): GameState` / `isMismatchShown(state): boolean`

- [ ] **Step 1: 失敗するテストを書く**

`src/games/nomige-suijaku/__tests__/reducer.test.ts`:

```ts
import type { Card } from '../engine'
import { initialState, isMismatchShown, reduce, type GameState } from '../reducer'

function pairCard(
	id: string,
	pairId: string,
	overrides: Partial<Card> = {},
): Card {
	return {
		id,
		pairId,
		rank: 'A',
		suit: '♠',
		punishmentId: 'n01',
		punishment: '1杯飲む',
		state: 'hidden',
		...overrides,
	}
}

function jokerCard(id: string, overrides: Partial<Card> = {}): Card {
	return {
		id,
		pairId: null,
		rank: 'JOKER',
		suit: null,
		punishmentId: 's01',
		punishment: 'グラスの残りを飲み干す（無理は禁物！）',
		state: 'hidden',
		...overrides,
	}
}

// 2ペア＋ジョーカー1枚のミニ盤面（枚数固定に依存しない reducer 設計を利用）
function playState(overrides: Partial<GameState> = {}): GameState {
	return {
		phase: 'play',
		size: 'small',
		cards: [
			pairCard('p1-a', 'p1'),
			pairCard('p1-b', 'p1'),
			pairCard('p2-a', 'p2', { rank: 'Q', suit: '♦', punishmentId: 'n07', punishment: '全員と乾杯して1杯' }),
			pairCard('p2-b', 'p2', { rank: 'Q', suit: '♦', punishmentId: 'n07', punishment: '全員と乾杯して1杯' }),
			jokerCard('joker-1'),
		],
		playerCount: 3,
		turnIndex: 0,
		flippedIds: [],
		scores: [0, 0, 0],
		punish: null,
		...overrides,
	}
}

it('initialState は size フェーズ・盤面なしで始まる', () => {
	const s = initialState(4)
	expect(s.phase).toBe('size')
	expect(s.cards).toHaveLength(0)
	expect(s.scores).toEqual([0, 0, 0, 0])
})

it('start でデッキが生成され play フェーズになる', () => {
	const s = reduce(initialState(3), { type: 'start', size: 'medium', rng: () => 0.5 })
	expect(s.phase).toBe('play')
	expect(s.size).toBe('medium')
	expect(s.cards).toHaveLength(9 * 2 + 2)
})

it('flip: 1枚目は revealed になり手番はそのまま', () => {
	const s = reduce(playState(), { type: 'flip', cardId: 'p1-a' })
	expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('revealed')
	expect(s.flippedIds).toEqual(['p1-a'])
	expect(s.turnIndex).toBe(0)
})

it('flip: 同じカードの再タップ・revealed/removed タップは無効', () => {
	const s1 = reduce(playState(), { type: 'flip', cardId: 'p1-a' })
	expect(reduce(s1, { type: 'flip', cardId: 'p1-a' })).toBe(s1)
	const withRemoved = playState({
		cards: playState().cards.map((c) =>
			c.id === 'p2-a' ? { ...c, state: 'removed' as const } : c,
		),
	})
	expect(reduce(withRemoved, { type: 'flip', cardId: 'p2-a' })).toBe(withRemoved)
})

it('不成立: 2枚見せ → hideMismatch で裏に戻り次の人へ', () => {
	let s = reduce(playState(), { type: 'flip', cardId: 'p1-a' })
	s = reduce(s, { type: 'flip', cardId: 'p2-a' })
	expect(s.phase).toBe('play')
	expect(isMismatchShown(s)).toBe(true)
	// 表示中は3枚目をめくれない
	expect(reduce(s, { type: 'flip', cardId: 'p2-b' })).toBe(s)
	s = reduce(s, { type: 'hideMismatch' })
	expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('hidden')
	expect(s.flippedIds).toEqual([])
	expect(s.turnIndex).toBe(1)
})

it('成立: matchAnim → punish → punishDone で除外・獲得カウント・次の人へ', () => {
	let s = reduce(playState(), { type: 'flip', cardId: 'p1-a' })
	s = reduce(s, { type: 'flip', cardId: 'p1-b' })
	expect(s.phase).toBe('matchAnim')
	expect(s.scores).toEqual([1, 0, 0])
	expect(s.punish).toEqual({
		kind: 'pair',
		punishmentId: 'n01',
		text: '1杯飲む',
		playerIndex: 0,
	})
	// 成立演出中もカードは revealed のまま（クロスフェード表示用）
	expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('revealed')
	s = reduce(s, { type: 'matchAnimDone' })
	expect(s.phase).toBe('punish')
	s = reduce(s, { type: 'punishDone' })
	expect(s.phase).toBe('play')
	expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('removed')
	expect(s.punish).toBeNull()
	expect(s.turnIndex).toBe(1)
})

it('ジョーカー1枚目: 即 punish・場から除外・手番は2枚目をめくれず終了', () => {
	let s = reduce(playState(), { type: 'flip', cardId: 'joker-1' })
	expect(s.phase).toBe('punish')
	expect(s.punish?.kind).toBe('joker')
	expect(s.punish?.playerIndex).toBe(0)
	expect(s.cards.find((c) => c.id === 'joker-1')?.state).toBe('removed')
	expect(s.flippedIds).toEqual([])
	s = reduce(s, { type: 'punishDone' })
	expect(s.phase).toBe('play')
	expect(s.turnIndex).toBe(1)
	expect(s.scores).toEqual([0, 0, 0])
})

it('ジョーカー2枚目: 1枚目は裏に戻る', () => {
	let s = reduce(playState(), { type: 'flip', cardId: 'p1-a' })
	s = reduce(s, { type: 'flip', cardId: 'joker-1' })
	expect(s.phase).toBe('punish')
	expect(s.cards.find((c) => c.id === 'p1-a')?.state).toBe('hidden')
	expect(s.cards.find((c) => c.id === 'joker-1')?.state).toBe('removed')
})

it('punish 表示中の flip は無効', () => {
	const s = reduce(playState(), { type: 'flip', cardId: 'joker-1' })
	expect(reduce(s, { type: 'flip', cardId: 'p1-a' })).toBe(s)
})

it('全ペア消化で result になる（ジョーカーが残っていても終了）', () => {
	// p2 は消化済み。p1 を揃えると全ペア消化
	const cards = playState().cards.map((c) =>
		c.pairId === 'p2' ? { ...c, state: 'removed' as const } : c,
	)
	let s = playState({ cards })
	s = reduce(s, { type: 'flip', cardId: 'p1-a' })
	s = reduce(s, { type: 'flip', cardId: 'p1-b' })
	s = reduce(s, { type: 'matchAnimDone' })
	s = reduce(s, { type: 'punishDone' })
	expect(s.phase).toBe('result')
})

it('手番は周回する（最後の人の次は最初の人）', () => {
	let s = playState({ turnIndex: 2 })
	s = reduce(s, { type: 'flip', cardId: 'p1-a' })
	s = reduce(s, { type: 'flip', cardId: 'p2-a' })
	s = reduce(s, { type: 'hideMismatch' })
	expect(s.turnIndex).toBe(0)
})

it('retry: 同サイズの新デッキで play から再開・スコアリセット', () => {
	const done = playState({ phase: 'result', scores: [2, 1, 0], size: 'small' })
	const s = reduce(done, { type: 'retry', rng: () => 0.5 })
	expect(s.phase).toBe('play')
	expect(s.size).toBe('small')
	expect(s.cards).toHaveLength(7 * 2 + 2)
	expect(s.scores).toEqual([0, 0, 0])
	expect(s.turnIndex).toBe(0)
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/reducer.test.ts`
Expected: FAIL（`Cannot find module '../reducer'`）

- [ ] **Step 3: reducer.ts を実装する**

`src/games/nomige-suijaku/reducer.ts`:

```ts
import { createDeck, isMatch, type BoardSize, type Card, type Rng } from './engine'

export type Phase = 'size' | 'play' | 'matchAnim' | 'punish' | 'result'

export type Punish = {
	kind: 'pair' | 'joker'
	punishmentId: string
	text: string
	playerIndex: number
}

export type GameState = {
	phase: Phase
	size: BoardSize
	cards: Card[]
	playerCount: number
	turnIndex: number
	flippedIds: string[] // 今ターンめくったカード（0..2枚）
	scores: number[] // player index → 獲得ペア数
	punish: Punish | null
}

export type Action =
	| { type: 'start'; size: BoardSize; rng: Rng }
	| { type: 'flip'; cardId: string }
	| { type: 'hideMismatch' }
	| { type: 'matchAnimDone' }
	| { type: 'punishDone' }
	| { type: 'retry'; rng: Rng }

export function initialState(playerCount: number): GameState {
	return {
		phase: 'size',
		size: 'small',
		cards: [],
		playerCount,
		turnIndex: 0,
		flippedIds: [],
		scores: Array(playerCount).fill(0),
		punish: null,
	}
}

// 不成立の2枚を見せている最中か（コンポーネントが約1.5秒タイマーで hideMismatch を送る）
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

// 未消化のペアカードが残っていないか（枚数固定に依存しないのでテストで小盤面に差し替え可能）
function allPairsCleared(cards: Card[]): boolean {
	return cards.every((c) => c.pairId === null || c.state === 'removed')
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'start':
			return {
				...initialState(state.playerCount),
				phase: 'play',
				size: action.size,
				cards: createDeck(action.size, action.rng),
			}
		case 'flip':
			return flip(state, action.cardId)
		case 'hideMismatch':
			return hideMismatch(state)
		case 'matchAnimDone':
			return state.phase === 'matchAnim' ? { ...state, phase: 'punish' } : state
		case 'punishDone':
			return punishDone(state)
		case 'retry':
			return reduce(initialState(state.playerCount), {
				type: 'start',
				size: state.size,
				rng: action.rng,
			})
	}
}

function flip(state: GameState, cardId: string): GameState {
	if (state.phase !== 'play' || state.flippedIds.length >= 2) return state
	const card = state.cards.find((c) => c.id === cardId)
	if (!card || card.state !== 'hidden') return state

	// ジョーカー: めくった瞬間に特大罰（本人実行）。場から除外し、1枚目があれば裏に戻す
	if (card.rank === 'JOKER') {
		const cards = setCardState(
			setCardState(state.cards, state.flippedIds, 'hidden'),
			[cardId],
			'removed',
		)
		return {
			...state,
			cards,
			flippedIds: [],
			punish: {
				kind: 'joker',
				punishmentId: card.punishmentId,
				text: card.punishment,
				playerIndex: state.turnIndex,
			},
			phase: 'punish',
		}
	}

	const cards = setCardState(state.cards, [cardId], 'revealed')
	const flippedIds = [...state.flippedIds, cardId]
	if (flippedIds.length < 2) return { ...state, cards, flippedIds }

	const [a, b] = flippedIds.map((id) => cards.find((c) => c.id === id) as Card)
	if (!isMatch(a, b)) return { ...state, cards, flippedIds } // 約1.5秒後に hideMismatch が来る

	// 成立: クロスフェード演出（matchAnim）へ。カードは revealed のまま、除外は punishDone で行う
	const scores = [...state.scores]
	scores[state.turnIndex] += 1
	return {
		...state,
		cards,
		flippedIds,
		scores,
		punish: {
			kind: 'pair',
			punishmentId: a.punishmentId,
			text: a.punishment,
			playerIndex: state.turnIndex,
		},
		phase: 'matchAnim',
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

function punishDone(state: GameState): GameState {
	if (state.phase !== 'punish' || !state.punish) return state
	const cards =
		state.punish.kind === 'pair'
			? setCardState(state.cards, state.flippedIds, 'removed')
			: state.cards // ジョーカーは flip 時に除外済み
	return {
		...state,
		cards,
		flippedIds: [],
		punish: null,
		turnIndex: nextTurn(state),
		phase: allPairsCleared(cards) ? 'result' : 'play',
	}
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/reducer.test.ts`
Expected: PASS（12 tests）

- [ ] **Step 5: Commit**

```bash
git add src/games/nomige-suijaku/reducer.ts src/games/nomige-suijaku/__tests__/reducer.test.ts
git commit -m "feat: 飲みゲー衰弱 reducer（フェーズ遷移・ジョーカー分岐）を追加 (#67)"
```

---

### Task 6: theme.ts と size-select.tsx（盤面サイズ選択）

**Files:**
- Create: `src/games/nomige-suijaku/theme.ts`
- Create: `src/games/nomige-suijaku/size-select.tsx`
- Test: `src/games/nomige-suijaku/__tests__/size-select.test.tsx`

**Interfaces:**
- Consumes: `BOARD_CONFIG` / `type BoardSize`（Task 3）
- Produces: `NS`（カラー定数）/ `SizeSelect({ onStart: (size: BoardSize) => void })`。Task 10 が使う

- [ ] **Step 1: 失敗するテストを書く**

`src/games/nomige-suijaku/__tests__/size-select.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { SizeSelect } from '../size-select'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

it('3サイズが表示され、選択してスタートすると onStart が呼ばれる', async () => {
	const onStart = jest.fn()
	const utils = await render(<SizeSelect onStart={onStart} />)
	expect(utils.getByText(/小 4×4/)).toBeTruthy()
	expect(utils.getByText(/中 4×5/)).toBeTruthy()
	expect(utils.getByText(/大 5×6/)).toBeTruthy()
	expect(utils.getByText(/7ペア/)).toBeTruthy()

	await act(async () => {
		fireEvent.press(utils.getByText(/中 4×5/))
	})
	await act(async () => {
		fireEvent.press(utils.getByText('スタート'))
	})
	expect(onStart).toHaveBeenCalledWith('medium')
})

it('未選択でもデフォルト（小）でスタートできる', async () => {
	const onStart = jest.fn()
	const utils = await render(<SizeSelect onStart={onStart} />)
	await act(async () => {
		fireEvent.press(utils.getByText('スタート'))
	})
	expect(onStart).toHaveBeenCalledWith('small')
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/size-select.test.tsx`
Expected: FAIL（`Cannot find module '../size-select'`）

- [ ] **Step 3: theme.ts と size-select.tsx を実装する**

`src/games/nomige-suijaku/theme.ts`:

```ts
// 飲みゲー衰弱の赤系（registry グラデと統一）
export const NS = {
	rose: '#FF6B81',
	redDeep: '#B33939',
	jokerPurple: '#7B2CBF',
	cardFace: '#FFFFFF',
	punishInk: 'rgba(76, 46, 122, 0.75)', // 成立演出でカード上にうっすら出す罰テキスト色
	matchedFace: '#F2EEFC', // 成立演出中のカード地
} as const
```

`src/games/nomige-suijaku/size-select.tsx`:

```tsx
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { BOARD_CONFIG, JOKER_COUNT, type BoardSize } from './engine'
import { NS } from './theme'

const SIZES: readonly BoardSize[] = ['small', 'medium', 'large']

type Props = {
	onStart: (size: BoardSize) => void
}

// 盤面サイズ3択（ペア数・目安時間つき）＋スタート
export function SizeSelect({ onStart }: Props) {
	const [selected, setSelected] = useState<BoardSize>('small')

	return (
		<View style={styles.container}>
			<Text style={styles.heading}>盤面サイズをえらぼう</Text>
			<View style={styles.options}>
				{SIZES.map((size) => {
					const config = BOARD_CONFIG[size]
					const active = selected === size
					return (
						<Pressable
							key={size}
							accessibilityRole="button"
							accessibilityState={{ selected: active }}
							onPress={() => {
								haptics.tap()
								setSelected(size)
							}}
							style={[styles.option, active && styles.optionActive]}
						>
							<Text style={styles.optionLabel}>{config.label}</Text>
							<Text style={styles.optionMeta}>
								{config.pairs}ペア＋ジョーカー{JOKER_COUNT} ・ {config.estimate}
							</Text>
						</Pressable>
					)
				})}
			</View>
			<GradientButton title="スタート" onPress={() => onStart(selected)} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: 'center', padding: spacing.md, gap: spacing.lg },
	heading: { ...typography.title, textAlign: 'center' },
	options: { gap: spacing.sm },
	option: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		padding: spacing.md,
		gap: spacing.xs,
	},
	optionActive: { borderColor: NS.rose },
	optionLabel: { ...typography.title },
	optionMeta: { ...typography.caption },
})
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/size-select.test.tsx`
Expected: PASS（2 tests）

- [ ] **Step 5: Commit**

```bash
git add src/games/nomige-suijaku/theme.ts src/games/nomige-suijaku/size-select.tsx src/games/nomige-suijaku/__tests__/size-select.test.tsx
git commit -m "feat: 飲みゲー衰弱の盤面サイズ選択画面を追加 (#67)"
```

---

### Task 7: card-grid.tsx（盤面・フリップ・成立クロスフェード・秘匿）

**Files:**
- Create: `src/games/nomige-suijaku/card-grid.tsx`
- Test: `src/games/nomige-suijaku/__tests__/card-grid.test.tsx`

**Interfaces:**
- Consumes: `type Card`（Task 3）/ `cardImageSource` / `JOKER_IMAGE`（Task 4）/ `NS`（Task 6）
- Produces: `CardGrid({ cards, columns, matchAnimIds, onFlip, disabled })` / `MATCH_ANIM_MS = 1000`。Task 10 が使う
- **秘匿要件:** `punishment` テキストは `matchAnimIds` に含まれるカードにのみ描画する。それ以外（hidden / revealed / removed）では一切 render しない

- [ ] **Step 1: 失敗するテストを書く**

`src/games/nomige-suijaku/__tests__/card-grid.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import type { Card } from '../engine'
import { CardGrid } from '../card-grid'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('expo-image', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { Image: View }
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
	}
})

function card(id: string, overrides: Partial<Card> = {}): Card {
	return {
		id,
		pairId: 'p1',
		rank: '7',
		suit: '♥',
		punishmentId: 'n07',
		punishment: '全員と乾杯して1杯',
		state: 'hidden',
		...overrides,
	}
}

const deck = [
	card('p1-a'),
	card('p1-b'),
	card('joker-1', { pairId: null, rank: 'JOKER', suit: null, punishmentId: 's01', punishment: 'グラスの残りを飲み干す（無理は禁物！）', state: 'hidden' }),
]

it('hidden カードのタップで onFlip が呼ばれる', async () => {
	const onFlip = jest.fn()
	const utils = await render(
		<CardGrid cards={deck} columns={4} matchAnimIds={[]} onFlip={onFlip} />,
	)
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード1'))
	})
	expect(onFlip).toHaveBeenCalledWith('p1-a')
})

it('disabled 中・hidden 以外のカードは onFlip されない', async () => {
	const onFlip = jest.fn()
	const revealed = deck.map((c) => (c.id === 'p1-a' ? { ...c, state: 'revealed' as const } : c))
	const utils = await render(
		<CardGrid cards={revealed} columns={4} matchAnimIds={[]} onFlip={onFlip} disabled />,
	)
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード2'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード1'))
	})
	expect(onFlip).not.toHaveBeenCalled()
})

it('秘匿: revealed でも罰テキストは描画されない', async () => {
	const revealed = deck.map((c) => ({ ...c, state: 'revealed' as const }))
	const utils = await render(
		<CardGrid cards={revealed} columns={4} matchAnimIds={[]} onFlip={jest.fn()} />,
	)
	expect(utils.queryByText('全員と乾杯して1杯')).toBeNull()
	expect(utils.queryByText(/グラスの残りを飲み干す/)).toBeNull()
})

it('成立演出: matchAnimIds のカードにだけ罰テキストがうっすら出る', async () => {
	const revealed = deck.map((c) =>
		c.pairId === 'p1' ? { ...c, state: 'revealed' as const } : c,
	)
	const utils = await render(
		<CardGrid
			cards={revealed}
			columns={4}
			matchAnimIds={['p1-a', 'p1-b']}
			onFlip={jest.fn()}
		/>,
	)
	expect(utils.getAllByText('全員と乾杯して1杯')).toHaveLength(2)
	expect(utils.queryByText(/グラスの残りを飲み干す/)).toBeNull()
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/card-grid.test.tsx`
Expected: FAIL（`Cannot find module '../card-grid'`）

- [ ] **Step 3: card-grid.tsx を実装する**

`src/games/nomige-suijaku/card-grid.tsx`:

```tsx
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, type ReactNode } from 'react'
import {
	Pressable,
	StyleSheet,
	Text,
	View,
	type DimensionValue,
	type StyleProp,
	type ViewStyle,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing } from '@/theme/tokens'
import { cardImageSource, JOKER_IMAGE } from './card-assets'
import type { Card, Suit } from './engine'
import { NS } from './theme'

const FLIP_MS = 200
export const MATCH_ANIM_MS = 1000

type Props = {
	cards: Card[]
	columns: number
	matchAnimIds: string[] // 成立クロスフェード中のカード（このカードにだけ罰テキストを出す）
	onFlip: (cardId: string) => void
	disabled?: boolean
}

// 盤面グリッド。カードの状態はすべて props（reducer の cards）から描画する
export function CardGrid({ cards, columns, matchAnimIds, onFlip, disabled = false }: Props) {
	// columns 列に収まるセル幅（%）。gap ぶんの余白を引く
	const widthPercent: DimensionValue = `${Math.floor(100 / columns) - 2}%`
	return (
		<View style={styles.grid}>
			{cards.map((card, i) => (
				<CardCell
					key={card.id}
					card={card}
					position={i + 1}
					width={widthPercent}
					matchAnim={matchAnimIds.includes(card.id)}
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
	width,
	matchAnim,
	onPress,
}: {
	card: Card
	position: number
	width: DimensionValue
	matchAnim: boolean
	onPress: () => void
}) {
	if (card.state === 'removed') {
		return <View style={[styles.cell, { width }, styles.removed]} />
	}
	if (card.state === 'hidden') {
		return (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`カード${position}`}
				onPress={onPress}
				style={[styles.cell, { width }]}
			>
				<LinearGradient
					colors={[colors.accentFrom, colors.accentTo]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.back}
				>
					<View style={styles.backInner}>
						<Text style={styles.backText}>WaiPa</Text>
					</View>
				</LinearGradient>
			</Pressable>
		)
	}

	const isJoker = card.rank === 'JOKER'
	return (
		<View
			accessibilityLabel={isJoker ? 'ジョーカー' : `${card.rank}${card.suit}`}
			style={[styles.cell, { width }]}
		>
			<FlipIn style={[styles.face, isJoker && styles.jokerFace]}>
				{matchAnim ? (
					<MatchCrossfade image={cardImageSource(card.rank, card.suit as Suit)}>
						<Text style={styles.punishText} numberOfLines={3}>
							{card.punishment}
						</Text>
					</MatchCrossfade>
				) : (
					<>
						<Image
							source={isJoker ? JOKER_IMAGE : cardImageSource(card.rank, card.suit as Suit)}
							style={styles.image}
							contentFit="contain"
						/>
						{isJoker && (
							<View style={styles.jokerTint}>
								<Text style={styles.jokerLabel}>JOKER</Text>
							</View>
						)}
					</>
				)}
			</FlipIn>
		</View>
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
	return <Animated.View style={[styles.fill, style, anim]}>{children}</Animated.View>
}

// 成立演出: 絵柄がフェードアウトし、罰テキストがうっすら浮かび上がるクロスフェード
function MatchCrossfade({ image, children }: { image: number; children: ReactNode }) {
	const progress = useSharedValue(0)
	useEffect(() => {
		progress.value = withTiming(1, { duration: MATCH_ANIM_MS })
	}, [progress])
	const imageStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value * 0.85 }))
	const textStyle = useAnimatedStyle(() => ({ opacity: progress.value }))
	return (
		<View style={[styles.fill, styles.matchedFace]}>
			<Animated.View style={[styles.fill, imageStyle]}>
				<Image source={image} style={styles.image} contentFit="contain" />
			</Animated.View>
			<Animated.View style={[styles.fill, styles.punishOverlay, textStyle]}>
				{children}
			</Animated.View>
		</View>
	)
}

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
		justifyContent: 'center',
		alignContent: 'center',
		flex: 1,
	},
	cell: {
		aspectRatio: 0.7, // 素材（250×360）に合わせた縦長
		borderRadius: radii.sm,
		overflow: 'hidden',
	},
	fill: { ...StyleSheet.absoluteFillObject },
	back: { flex: 1, padding: 3 },
	backInner: {
		flex: 1,
		borderRadius: radii.sm - 2,
		backgroundColor: colors.background,
		alignItems: 'center',
		justifyContent: 'center',
	},
	backText: { fontSize: 12, fontWeight: '800', color: colors.accentFrom },
	face: { backgroundColor: NS.cardFace, borderRadius: radii.sm },
	image: { ...StyleSheet.absoluteFillObject },
	jokerFace: { borderWidth: 2, borderColor: NS.rose },
	jokerTint: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(80, 20, 90, 0.45)',
		justifyContent: 'flex-end',
		alignItems: 'center',
		paddingBottom: spacing.xs,
	},
	jokerLabel: { fontSize: 11, fontWeight: '800', color: NS.rose, letterSpacing: 2 },
	matchedFace: { backgroundColor: NS.matchedFace },
	punishOverlay: { alignItems: 'center', justifyContent: 'center', padding: spacing.xs },
	punishText: {
		fontSize: 11,
		fontWeight: '700',
		color: NS.punishInk,
		textAlign: 'center',
	},
	removed: { borderWidth: 1, borderColor: colors.surfaceBorder, opacity: 0.2 },
})
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/card-grid.test.tsx`
Expected: PASS（4 tests。秘匿テスト含む）

- [ ] **Step 5: Commit**

```bash
git add src/games/nomige-suijaku/card-grid.tsx src/games/nomige-suijaku/__tests__/card-grid.test.tsx
git commit -m "feat: 飲みゲー衰弱の盤面グリッド（フリップ・成立クロスフェード・罰秘匿）を追加 (#67)"
```

---

### Task 8: punish-reveal.tsx（罰発表オーバーレイ）

**Files:**
- Create: `src/games/nomige-suijaku/punish-reveal.tsx`
- Test: `src/games/nomige-suijaku/__tests__/punish-reveal.test.tsx`

**Interfaces:**
- Consumes: `type Punish`（Task 5）/ `LUCKY_PUNISHMENT_ID`（Task 2）/ `NS`（Task 6）
- Produces: `PunishReveal({ punish, playerName, playerIndex, onDone })`。Task 10 が使う
- 文言仕様: pair →「◯◯さん、誰にやらせる？」＋「実行した！」/ joker →「◯◯さんが実行！」＋特大罰バッジ / n40 →「ラッキー！全員から拍手！」（「誰にやらせる？」は出さない）

- [ ] **Step 1: 失敗するテストを書く**

`src/games/nomige-suijaku/__tests__/punish-reveal.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
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

it('ペア成立: 罰全文＋煽り＋実行した！で onDone', async () => {
	const onDone = jest.fn()
	const utils = await render(
		<PunishReveal
			punish={{ kind: 'pair', punishmentId: 'n07', text: '全員と乾杯して1杯', playerIndex: 0 }}
			playerName="あか"
			playerIndex={0}
			onDone={onDone}
		/>,
	)
	expect(utils.getByText('全員と乾杯して1杯')).toBeTruthy()
	expect(utils.getByText(/あかさん、誰にやらせる？/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(utils.getByText('実行した！'))
	})
	expect(onDone).toHaveBeenCalled()
})

it('ジョーカー: 特大罰表記＋本人実行の煽りになる', async () => {
	const utils = await render(
		<PunishReveal
			punish={{
				kind: 'joker',
				punishmentId: 's01',
				text: 'グラスの残りを飲み干す（無理は禁物！）',
				playerIndex: 1,
			}}
			playerName="あお"
			playerIndex={1}
			onDone={jest.fn()}
		/>,
	)
	expect(utils.getByText(/特大罰/)).toBeTruthy()
	expect(utils.getByText(/あおさんが実行！/)).toBeTruthy()
	expect(utils.queryByText(/誰にやらせる？/)).toBeNull()
})

it('n40 ラッキーカード: 拍手の煽りになり「誰にやらせる？」は出ない', async () => {
	const utils = await render(
		<PunishReveal
			punish={{
				kind: 'pair',
				punishmentId: 'n40',
				text: '何もなし！ラッキーカード（全員から拍手をもらう）',
				playerIndex: 2,
			}}
			playerName="みどり"
			playerIndex={2}
			onDone={jest.fn()}
		/>,
	)
	expect(utils.getByText(/ラッキー！全員から拍手！/)).toBeTruthy()
	expect(utils.queryByText(/誰にやらせる？/)).toBeNull()
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/punish-reveal.test.tsx`
Expected: FAIL（`Cannot find module '../punish-reveal'`）

- [ ] **Step 3: punish-reveal.tsx を実装する**

`src/games/nomige-suijaku/punish-reveal.tsx`:

```tsx
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { LUCKY_PUNISHMENT_ID } from './punishments'
import type { Punish } from './reducer'
import { NS } from './theme'

type Props = {
	punish: Punish
	playerName: string
	playerIndex: number
	onDone: () => void
}

// ペア成立/ジョーカー兼用の罰発表オーバーレイ（効果音＋バイブ）
export function PunishReveal({ punish, playerName, playerIndex, onDone }: Props) {
	const isJoker = punish.kind === 'joker'
	const isLucky = punish.punishmentId === LUCKY_PUNISHMENT_ID

	useEffect(() => {
		haptics.heavy()
		playSound(isJoker ? 'explosion' : 'reveal')
	}, [isJoker])

	const nameColor = playerColor(playerIndex).value

	return (
		<View style={[styles.backdrop, isJoker && styles.jokerBackdrop]}>
			<Text style={[styles.badge, isJoker && styles.jokerBadge]}>
				{isJoker ? '🃏 特大罰' : '罰ゲーム'}
			</Text>
			<View style={[styles.card, isJoker && styles.jokerCard]}>
				<Text style={styles.punishText}>{punish.text}</Text>
			</View>
			{isLucky ? (
				<Text style={styles.aori}>
					<Text style={{ color: nameColor }}>{playerName}さん</Text>、ラッキー！全員から拍手！
				</Text>
			) : isJoker ? (
				<Text style={styles.aori}>
					<Text style={{ color: nameColor }}>{playerName}さんが実行！</Text>
				</Text>
			) : (
				<Text style={styles.aori}>
					<Text style={{ color: nameColor }}>{playerName}さん</Text>、誰にやらせる？
				</Text>
			)}
			<GradientButton title="実行した！" onPress={onDone} />
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(10,8,24,0.94)',
		alignItems: 'stretch',
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.lg,
	},
	jokerBackdrop: { backgroundColor: 'rgba(26,6,32,0.96)' },
	badge: {
		...typography.caption,
		color: NS.rose,
		textAlign: 'center',
		fontWeight: '700',
		letterSpacing: 2,
	},
	jokerBadge: { color: NS.jokerPurple, fontSize: 16 },
	card: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: NS.rose,
		borderRadius: radii.lg,
		padding: spacing.lg,
	},
	jokerCard: { borderColor: NS.jokerPurple, borderWidth: 2 },
	punishText: { ...typography.title, textAlign: 'center', lineHeight: 32 },
	aori: { ...typography.title, textAlign: 'center' },
})
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/punish-reveal.test.tsx`
Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add src/games/nomige-suijaku/punish-reveal.tsx src/games/nomige-suijaku/__tests__/punish-reveal.test.tsx
git commit -m "feat: 飲みゲー衰弱の罰発表オーバーレイ（pair/joker/ラッキー分岐）を追加 (#67)"
```

---

### Task 9: result-screen.tsx（ランキングリザルト）

**Files:**
- Create: `src/games/nomige-suijaku/result-screen.tsx`
- Test: `src/games/nomige-suijaku/__tests__/result-screen.test.tsx`

**Interfaces:**
- Consumes: `playerColor`（既存 `@/theme/player-colors`）
- Produces: `buildRanking(names, scores): { index, name, score, rank }[]`（同数同順位）/ `ResultScreen({ names, scores, onRetry, onHome })`。Task 10 が使う

- [ ] **Step 1: 失敗するテストを書く**

`src/games/nomige-suijaku/__tests__/result-screen.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import { buildRanking, ResultScreen } from '../result-screen'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

it('buildRanking: スコア降順・同数は同順位', () => {
	const rows = buildRanking(['あ', 'い', 'う', 'え'], [1, 3, 1, 0])
	expect(rows.map((r) => r.name)).toEqual(['い', 'あ', 'う', 'え'])
	expect(rows.map((r) => r.rank)).toEqual([1, 2, 2, 4])
})

it('最下位（同数含む）がハイライトされ、ボタンが動く', async () => {
	const onRetry = jest.fn()
	const onHome = jest.fn()
	const utils = await render(
		<ResultScreen
			names={['あか', 'あお', 'みどり']}
			scores={[2, 0, 0]}
			onRetry={onRetry}
			onHome={onHome}
		/>,
	)
	// 最下位2人にバッジ
	expect(utils.getAllByText('最下位')).toHaveLength(2)
	expect(utils.getByText(/2ペア/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(utils.getByText('もう一回'))
	})
	expect(onRetry).toHaveBeenCalled()
	await act(async () => {
		fireEvent.press(utils.getByText('ホームへ'))
	})
	expect(onHome).toHaveBeenCalled()
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/result-screen.test.tsx`
Expected: FAIL（`Cannot find module '../result-screen'`）

- [ ] **Step 3: result-screen.tsx を実装する**

`src/games/nomige-suijaku/result-screen.tsx`:

```tsx
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { NS } from './theme'

export type RankingRow = {
	index: number
	name: string
	score: number
	rank: number
}

// スコア降順・同数同順位（1224 方式）
export function buildRanking(names: string[], scores: number[]): RankingRow[] {
	const rows = names.map((name, index) => ({ name, index, score: scores[index] ?? 0 }))
	rows.sort((a, b) => b.score - a.score)
	return rows.map((r) => ({ ...r, rank: 1 + rows.filter((o) => o.score > r.score).length }))
}

type Props = {
	names: string[]
	scores: number[]
	onRetry: () => void
	onHome: () => void
}

export function ResultScreen({ names, scores, onRetry, onHome }: Props) {
	const rows = buildRanking(names, scores)
	const minScore = Math.min(...scores)

	return (
		<View style={styles.container}>
			<Text style={styles.heading}>🏆 結果発表</Text>
			<ScrollView contentContainerStyle={styles.list}>
				{rows.map((row) => {
					const isLast = row.score === minScore
					return (
						<View key={row.index} style={[styles.row, isLast && styles.lastRow]}>
							<Text style={styles.rank}>{row.rank}位</Text>
							<View
								style={[styles.colorBar, { backgroundColor: playerColor(row.index).value }]}
							/>
							<Text style={styles.name} numberOfLines={1}>
								{row.name}
							</Text>
							{isLast && <Text style={styles.lastBadge}>最下位</Text>}
							<Text style={styles.score}>{row.score}ペア</Text>
						</View>
					)
				})}
			</ScrollView>
			<GradientButton title="もう一回" onPress={onRetry} />
			<Pressable
				accessibilityRole="button"
				onPress={() => {
					haptics.tap()
					onHome()
				}}
				style={styles.homeBtn}
			>
				<Text style={styles.homeText}>ホームへ</Text>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: spacing.md, gap: spacing.md },
	heading: { ...typography.title, textAlign: 'center', marginTop: spacing.md },
	list: { gap: spacing.sm },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		padding: spacing.md,
	},
	lastRow: { borderColor: NS.rose },
	rank: { ...typography.body, fontWeight: '800', width: 44 },
	colorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
	name: { ...typography.body, flex: 1 },
	lastBadge: {
		...typography.caption,
		color: NS.rose,
		fontWeight: '800',
		borderWidth: 1,
		borderColor: NS.rose,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.sm,
		paddingVertical: 2,
	},
	score: { ...typography.body, fontWeight: '700' },
	homeBtn: { alignItems: 'center', padding: spacing.sm },
	homeText: { ...typography.caption },
})
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/result-screen.test.tsx`
Expected: PASS（2 tests）

- [ ] **Step 5: Commit**

```bash
git add src/games/nomige-suijaku/result-screen.tsx src/games/nomige-suijaku/__tests__/result-screen.test.tsx
git commit -m "feat: 飲みゲー衰弱のランキングリザルトを追加 (#67)"
```

---

### Task 10: nomige-suijaku-game.tsx（本体・フェーズ結線）

**Files:**
- Create: `src/games/nomige-suijaku/nomige-suijaku-game.tsx`
- Test: `src/games/nomige-suijaku/__tests__/nomige-suijaku-game.test.tsx`

**Interfaces:**
- Consumes: Task 3〜9 の全エクスポート＋ `usePlayers` / `getDisplayNames`（既存）
- Produces: `NomigeSuijakuGame`（Task 11 の registry が使う）/ `MISMATCH_MS = 1500`

- [ ] **Step 1: 失敗するテストを書く**

`src/games/nomige-suijaku/__tests__/nomige-suijaku-game.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native'
import type { Card } from '../engine'
import { MATCH_ANIM_MS } from '../card-grid'
import { MISMATCH_MS, NomigeSuijakuGame } from '../nomige-suijaku-game'

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
jest.mock('expo-image', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { Image: View }
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
	}
})
jest.mock('@/lib/players-store', () => ({
	usePlayers: () => ({ count: 3, names: ['あか', 'あお', 'みどり'], history: [] }),
	getDisplayNames: () => ['あか', 'あお', 'みどり'],
}))

// 固定ミニデッキ: 2ペア＋ジョーカー1枚（カード1〜5 = p1-a, p1-b, p2-a, p2-b, joker-1）
function fixedDeck(): Card[] {
	const base = {
		punishmentId: 'n07',
		punishment: '全員と乾杯して1杯',
		state: 'hidden' as const,
	}
	const base2 = {
		punishmentId: 'n01',
		punishment: '1杯飲む',
		state: 'hidden' as const,
	}
	return [
		{ id: 'p1-a', pairId: 'p1', rank: '7', suit: '♥', ...base },
		{ id: 'p1-b', pairId: 'p1', rank: '7', suit: '♥', ...base },
		{ id: 'p2-a', pairId: 'p2', rank: 'Q', suit: '♦', ...base2 },
		{ id: 'p2-b', pairId: 'p2', rank: 'Q', suit: '♦', ...base2 },
		{
			id: 'joker-1',
			pairId: null,
			rank: 'JOKER',
			suit: null,
			punishmentId: 's01',
			punishment: 'グラスの残りを飲み干す（無理は禁物！）',
			state: 'hidden',
		},
	]
}

jest.mock('../engine', () => {
	const actual = jest.requireActual('../engine')
	return { ...actual, createDeck: jest.fn(() => fixedDeck()) }
})

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

async function startGame(utils: Awaited<ReturnType<typeof render>>) {
	await act(async () => {
		fireEvent.press(utils.getByText('スタート'))
	})
	expect(utils.getByText(/あかさんの番/)).toBeTruthy()
}

it('サイズ選択 → play: 秘匿された盤面が出る', async () => {
	const utils = await render(<NomigeSuijakuGame />)
	expect(utils.getByText('盤面サイズをえらぼう')).toBeTruthy()
	await startGame(utils)
	expect(utils.queryByText('全員と乾杯して1杯')).toBeNull() // 罰は秘匿
})

it('ペア成立: クロスフェード → 罰発表 → 実行した！で次の人へ', async () => {
	const utils = await render(<NomigeSuijakuGame />)
	await startGame(utils)
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード1'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード2'))
	})
	// matchAnim 中: カード上にうっすら罰テキスト（2枚分）
	expect(utils.getAllByText('全員と乾杯して1杯').length).toBeGreaterThanOrEqual(2)
	await act(async () => {
		jest.advanceTimersByTime(MATCH_ANIM_MS)
	})
	// punish オーバーレイ
	expect(utils.getByText(/あかさん、誰にやらせる？/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(utils.getByText('実行した！'))
	})
	expect(utils.getByText(/あおさんの番/)).toBeTruthy()
})

it('不成立: 約1.5秒後に裏へ戻り次の人へ', async () => {
	const utils = await render(<NomigeSuijakuGame />)
	await startGame(utils)
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード1'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード3'))
	})
	await act(async () => {
		jest.advanceTimersByTime(MISMATCH_MS)
	})
	expect(utils.getByText(/あおさんの番/)).toBeTruthy()
})

it('ジョーカー → 特大罰 → 全ペア消化で結果発表まで通る', async () => {
	const utils = await render(<NomigeSuijakuGame />)
	await startGame(utils)
	// あか: ジョーカー（本人実行・手番終了）
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード5'))
	})
	expect(utils.getByText(/特大罰/)).toBeTruthy()
	expect(utils.getByText(/あかさんが実行！/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(utils.getByText('実行した！'))
	})
	// あお: p1 を揃える
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード1'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード2'))
	})
	await act(async () => {
		jest.advanceTimersByTime(MATCH_ANIM_MS)
	})
	await act(async () => {
		fireEvent.press(utils.getByText('実行した！'))
	})
	// みどり: p2 を揃えて全ペア消化
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード3'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード4'))
	})
	await act(async () => {
		jest.advanceTimersByTime(MATCH_ANIM_MS)
	})
	await act(async () => {
		fireEvent.press(utils.getByText('実行した！'))
	})
	expect(utils.getByText('🏆 結果発表')).toBeTruthy()
	expect(utils.getAllByText(/最下位/).length).toBeGreaterThanOrEqual(1)
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/nomige-suijaku-game.test.tsx`
Expected: FAIL（`Cannot find module '../nomige-suijaku-game'`）

- [ ] **Step 3: nomige-suijaku-game.tsx を実装する**

`src/games/nomige-suijaku/nomige-suijaku-game.tsx`:

```tsx
import { router } from 'expo-router'
import { useEffect, useReducer } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { haptics } from '@/lib/haptics'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { playerColor } from '@/theme/player-colors'
import { spacing, typography } from '@/theme/tokens'
import { CardGrid, MATCH_ANIM_MS } from './card-grid'
import { BOARD_CONFIG, remainingPairs, type Rng } from './engine'
import { initialState, isMismatchShown, reduce } from './reducer'
import { PunishReveal } from './punish-reveal'
import { ResultScreen } from './result-screen'
import { SizeSelect } from './size-select'

export const MISMATCH_MS = 1500

const rng: Rng = () => Math.random()

export function NomigeSuijakuGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [state, dispatch] = useReducer(reduce, players.count, initialState)

	// 不成立の2枚は約1.5秒見せて自動で裏返す
	const mismatch = isMismatchShown(state)
	useEffect(() => {
		if (!mismatch) return
		const t = setTimeout(() => dispatch({ type: 'hideMismatch' }), MISMATCH_MS)
		return () => clearTimeout(t)
	}, [mismatch, state.flippedIds])

	// 成立クロスフェード（約1秒）→ punish オーバーレイ
	useEffect(() => {
		if (state.phase !== 'matchAnim') return
		haptics.success()
		const t = setTimeout(() => dispatch({ type: 'matchAnimDone' }), MATCH_ANIM_MS)
		return () => clearTimeout(t)
	}, [state.phase])

	if (state.phase === 'size') {
		return (
			<SizeSelect
				onStart={(size) => {
					haptics.tap()
					dispatch({ type: 'start', size, rng })
				}}
			/>
		)
	}

	if (state.phase === 'result') {
		return (
			<ResultScreen
				names={names}
				scores={state.scores}
				onRetry={() => dispatch({ type: 'retry', rng })}
				onHome={() => router.replace('/')}
			/>
		)
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View
					style={[styles.turnDot, { backgroundColor: playerColor(state.turnIndex).value }]}
				/>
				<Text style={styles.turn}>{names[state.turnIndex]}さんの番</Text>
				<Text style={styles.remain}>残り{remainingPairs(state.cards)}ペア</Text>
			</View>

			<CardGrid
				cards={state.cards}
				columns={BOARD_CONFIG[state.size].columns}
				matchAnimIds={state.phase === 'matchAnim' ? state.flippedIds : []}
				onFlip={(cardId) => dispatch({ type: 'flip', cardId })}
				disabled={state.phase !== 'play' || mismatch}
			/>

			{state.phase === 'punish' && state.punish && (
				<PunishReveal
					punish={state.punish}
					playerName={names[state.punish.playerIndex]}
					playerIndex={state.punish.playerIndex}
					onDone={() => dispatch({ type: 'punishDone' })}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: spacing.md, gap: spacing.md },
	header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
	turnDot: { width: 10, height: 10, borderRadius: 5 },
	turn: { ...typography.title, flex: 1 },
	remain: { ...typography.caption },
})
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `bun run test -- src/games/nomige-suijaku/__tests__/nomige-suijaku-game.test.tsx`
Expected: PASS（4 tests）

- [ ] **Step 5: ゲームディレクトリの全テストを回す**

Run: `bun run test -- src/games/nomige-suijaku`
Expected: 全 PASS

- [ ] **Step 6: Commit**

```bash
git add src/games/nomige-suijaku/nomige-suijaku-game.tsx src/games/nomige-suijaku/__tests__/nomige-suijaku-game.test.tsx
git commit -m "feat: 飲みゲー衰弱の本体コンポーネント（フェーズ結線）を追加 (#67)"
```

---

### Task 11: registry 結線（プレミアムゲート）

**Files:**
- Modify: `src/games/registry.ts`（import 追加＋ games 配列末尾に entry 追加）
- Modify: `src/games/__tests__/registry.test.ts:65`（`toHaveLength(10)` → `toHaveLength(11)`）

**Interfaces:**
- Consumes: `NomigeSuijakuGame`（Task 10）
- Produces: ホーム一覧に 👑 バッジ付きカードが出る（既存の `game-card.tsx` / `premium-lock-modal.tsx` が `premium: true` を見て自動で処理する。**このタスクで新規 UI は作らない**）

- [ ] **Step 1: registry テストを 11 ゲームに更新する（失敗確認）**

`src/games/__tests__/registry.test.ts` の 65 行目を修正:

```ts
		expect(games).toHaveLength(11)
```

Run: `bun run test -- src/games/__tests__/registry.test.ts`
Expected: FAIL（`Expected length: 11, Received length: 10`）

- [ ] **Step 2: registry.ts に entry を追加する**

`src/games/registry.ts` の import 群に追加（アルファベット順の位置に）:

```ts
import { NomigeSuijakuGame } from './nomige-suijaku/nomige-suijaku-game'
```

`games` 配列の末尾（daut-dice の後）に追加:

```ts
	{
		id: 'nomige-suijaku',
		title: '飲みゲー衰弱',
		tagline: 'ペアを揃えたら罰ゲーム発表！',
		emoji: '🍻',
		gradient: ['#FF6B81', '#B33939'],
		minPlayers: 2,
		maxPlayers: 12,
		requiresPlayers: true,
		premium: true,
		catchCopy: 'めくって揃えば罰ゲーム！\n誰にやらせるかは、あなた次第！',
		summary:
			'このゲームは、トランプの神経衰弱に罰ゲームを仕込んだ飲み会向けゲームです！ペアを揃えると隠されていた罰ゲームが発表され、揃えた人が実行者を指名。ジョーカーを引いたら特大罰を自分が実行！全ペア消化後、獲得ペア数のランキングを発表します！',
		howToPlay: [
			'① メンバーを登録（2〜12名）して、盤面サイズ（小/中/大）を選ぼう！',
			'② 順番にカードを2枚めくる神経衰弱！揃っても揃わなくても次の人へ',
			'③ ペアが揃うと罰ゲームがドン！と発表。揃えた人が「誰にやらせるか」を指名しよう！',
			'④ ジョーカーは引いた本人が特大罰！全ペア消化で獲得ペア数ランキングを発表！',
		],
		Component: NomigeSuijakuGame,
	},
```

- [ ] **Step 3: テストが通ることを確認する**

Run: `bun run test -- src/games/__tests__/registry.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/games/registry.ts src/games/__tests__/registry.test.ts
git commit -m "feat: 飲みゲー衰弱を registry に追加しプレミアムゲートを結線 (#67)"
```

---

### Task 12: 全体検証と受け入れ確認

**Files:** なし（検証のみ。修正が出た場合は該当ファイル）

- [ ] **Step 1: 静的チェックとテスト全件**

Run: `bun run typecheck && bun run lint && bun run format:check && bun run test`
Expected: すべてエラーなし・全テスト PASS（format:check で崩れがあれば `bun run format` して含める）

- [ ] **Step 2: 実機/シミュレータでのスモーク確認（可能な環境の場合のみ）**

`bun run ios`（または `bun run start`）でアプリを起動し、以下を確認する:

1. ホームに「🍻 飲みゲー衰弱」カードが 👑 バッジ付きで表示される（開発ビルドはプレミアム解放される）
2. イントロ → メンバー登録 → サイズ選択 → 盤面表示
3. カードをめくるとトランプ画像がフリップ表示され、罰テキストは見えない
4. ペア成立でクロスフェード → 罰発表（効果音＋バイブ）→「実行した！」で次の人へ
5. ジョーカーで禍々しい特大罰 → 本人実行 → 手番終了
6. 全ペア消化でランキング（最下位ハイライト）→「もう一回」で同サイズ再戦

シミュレータが使えない環境では、このステップはスキップして PR に「実機確認未実施」と明記する。

- [ ] **Step 3: Issue #67 受け入れ条件の照合**

Issue の受け入れ条件を1項目ずつ確認してチェックを付ける:

- 盤面サイズ選択（小/中/大） → Task 6
- カードフリップアニメ・トランプ素材表面 → Task 7（※スペック改訂で罰テキストは表面に載せず成立時のみ）
- 手番1人1ターン固定＋手番表示 → Task 5, 10
- ペア成立オーバーレイ（ズーム相当の発表演出＋効果音＋バイブ）→ Task 8
- ジョーカー特大罰・本人実行・除外・手番即終了 → Task 5
- リザルトランキング（最下位ハイライト）→ Task 9
- 罰プリセット40＋10・ID設計 → Task 2
- premium フラグ＋👑バッジ＋ロックモーダル → Task 11（既存基盤）
- 遊び方モーダル文言 → Task 11（howToPlay）
- engine/reducer ユニットテスト（await act 規約）→ Task 3, 5, 7〜10

- [ ] **Step 4: 最終 Commit（修正が出た場合）と push**

```bash
git push -u origin feature/67-nomige-suijaku
```

PR 作成は実行フェーズのオーナー（ユーザー）確認後に行う。PR 本文には Issue #67 への `Closes #67` と、実機確認の有無を記載する。
