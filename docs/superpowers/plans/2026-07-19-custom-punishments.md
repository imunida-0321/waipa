# カスタムお題編集（#68）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 飲酒衰弱の罰お題をユーザーがセット単位で追加・編集・切替でき、デッキ生成時にカスタム優先で混ざるようにする。

**Architecture:** `players-store.ts` と同じ「モジュール state ＋ useSyncExternalStore ＋ AsyncStorage 永続化」パターンの新ストア `custom-punishments-store.ts` を作り、`createDeck()` に省略可能なカスタムプール引数を追加。UI は inshu-suijaku 配下に一覧シート（Modal）と編集フォームを追加し、`SizeSelect` に入口行を置く。

**Tech Stack:** React Native (Expo) / AsyncStorage / Jest + React Native Testing Library

**Spec:** `docs/superpowers/specs/2026-07-19-custom-punishments-design.md`

## Global Constraints

- タブインデント・セミコロンなし・シングルクォート（Prettier 設定準拠）
- テストファースト（RED ログ確認 → GREEN）。`.skip`/`.only` 残置禁止・テストで `any` 禁止・`Date.now()` 依存禁止
- React 19: タイマー系・非同期 state 更新は `await act(async () => ...)`（kimagure-ox のテスト参照）
- 文言は日本語。カラーは `@/theme/tokens` の `colors` を使う（ハードコード禁止）
- 上限: 通常罰 20 / 特大罰 5 / テキスト 40 文字 / セット 5 個・セット名 12 文字
- ストレージキー: `waipa.inshu-suijaku.custom-punishments`

---

### Task 1: custom-punishments-store

**Files:**
- Create: `src/lib/custom-punishments-store.ts`
- Test: `src/lib/__tests__/custom-punishments-store.test.ts`

**Interfaces (Produces):**

```ts
export type CustomPunishment = { id: string; text: string; type: 'normal' | 'special' }
export type CustomSet = { id: string; name: string; items: CustomPunishment[] }
export type CustomPunishmentsState = {
	enabled: boolean
	activeSetId: string
	sets: CustomSet[]
	nextId: number
}
export const MAX_NORMAL_ITEMS = 20
export const MAX_SPECIAL_ITEMS = 5
export const MAX_TEXT_LENGTH = 40
export const MAX_SETS = 5
export const MAX_SET_NAME_LENGTH = 12
export const customPunishmentsStore: {
	getState(): CustomPunishmentsState
	subscribe(fn: () => void): () => void
	hydrate(): Promise<void>
	setEnabled(on: boolean): Promise<void>
	selectSet(setId: string): Promise<void>
	addSet(name: string): Promise<void>
	removeSet(setId: string): Promise<void>
	addItem(type: 'normal' | 'special', text: string): Promise<void>
	updateItem(itemId: string, text: string): Promise<void>
	removeItem(itemId: string): Promise<void>
}
export function useCustomPunishments(): CustomPunishmentsState
export function getActiveSet(s: CustomPunishmentsState): CustomSet
// enabled かつアクティブセットに該当タイプあり、のときだけ中身が入る
export function getActivePool(s: CustomPunishmentsState): {
	normals: CustomPunishment[]
	specials: CustomPunishment[]
}
export function countByType(set: CustomSet, type: 'normal' | 'special'): number
```

**仕様詳細:**
- デフォルト state: `{ enabled: true, activeSetId: 'set1', sets: [{ id: 'set1', name: 'マイセット', items: [] }], nextId: 2 }`
- ID 採番: アイテムは `c${nextId}`、セットは `set${nextId}`。どちらも採番後に `nextId + 1`（`Date.now()` 不使用）
- `addItem`: `text.trim()` が空 → 何もしない。40 文字超は 40 文字に切詰め。タイプ別上限到達時は何もしない。追加先はアクティブセット
- `updateItem`: 全セット横断でなくアクティブセット内の item を対象。trim 空なら無視、40 文字切詰め
- `addSet`: `MAX_SETS` 到達時は何もしない。名前は trim ＋ 12 文字切詰め、空なら `セット${sets.length + 1}`。追加後そのセットをアクティブに
- `removeSet`: 最後の 1 セットは削除不可（何もしない）。アクティブセットを消したら先頭セットをアクティブに
- `selectSet`: 存在しない ID は無視
- `hydrate`: `players-store.ts` と同形。破損 JSON・読取失敗は catch してデフォルトへ。`{ ...DEFAULTS, ...JSON.parse(raw) }` マージ。復元後 `activeSetId` が `sets` に無い場合は先頭セットに補正、`sets` が空配列ならデフォルトセットを補う
- `getActivePool`: `enabled === false` なら `{ normals: [], specials: [] }`

- [ ] **Step 1: 失敗するテストを書く**

`players-store.test.ts` と同じ mock 定形を使う。テストケース（全て実コードで書く）:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
	countByType,
	customPunishmentsStore,
	getActivePool,
	getActiveSet,
	MAX_NORMAL_ITEMS,
	MAX_SETS,
	MAX_SPECIAL_ITEMS,
} from '../custom-punishments-store'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

describe('customPunishmentsStore', () => {
	beforeEach(async () => {
		await AsyncStorage.clear()
		await customPunishmentsStore.hydrate()
	})

	it('初期値はデフォルトセット1つ・enabled・空アイテム', () => {
		const s = customPunishmentsStore.getState()
		expect(s.enabled).toBe(true)
		expect(s.sets).toHaveLength(1)
		expect(getActiveSet(s).name).toBe('マイセット')
		expect(getActiveSet(s).items).toEqual([])
	})

	it('addItem でアクティブセットに追加され、永続化される', async () => {
		await customPunishmentsStore.addItem('normal', '幹事のモノマネをして1杯')
		const set = getActiveSet(customPunishmentsStore.getState())
		expect(set.items).toEqual([
			{ id: 'c2', text: '幹事のモノマネをして1杯', type: 'normal' },
		])
		expect(
			await AsyncStorage.getItem('waipa.inshu-suijaku.custom-punishments'),
		).toContain('幹事のモノマネ')
	})

	it('addItem は空白のみを無視し、41文字以上を40文字に切り詰める', async () => {
		await customPunishmentsStore.addItem('normal', '   ')
		expect(getActiveSet(customPunishmentsStore.getState()).items).toHaveLength(0)
		await customPunishmentsStore.addItem('normal', 'あ'.repeat(41))
		expect(getActiveSet(customPunishmentsStore.getState()).items[0].text).toBe(
			'あ'.repeat(40),
		)
	})

	it('addItem はタイプ別上限（通常20・特大5）で頭打ちになる', async () => {
		for (let i = 0; i < MAX_NORMAL_ITEMS + 1; i++) {
			await customPunishmentsStore.addItem('normal', `通常${i}`)
		}
		for (let i = 0; i < MAX_SPECIAL_ITEMS + 1; i++) {
			await customPunishmentsStore.addItem('special', `特大${i}`)
		}
		const set = getActiveSet(customPunishmentsStore.getState())
		expect(countByType(set, 'normal')).toBe(MAX_NORMAL_ITEMS)
		expect(countByType(set, 'special')).toBe(MAX_SPECIAL_ITEMS)
	})

	it('updateItem / removeItem がアクティブセットの該当アイテムに効く', async () => {
		await customPunishmentsStore.addItem('normal', '元のお題')
		const id = getActiveSet(customPunishmentsStore.getState()).items[0].id
		await customPunishmentsStore.updateItem(id, '直したお題')
		expect(getActiveSet(customPunishmentsStore.getState()).items[0].text).toBe('直したお題')
		await customPunishmentsStore.removeItem(id)
		expect(getActiveSet(customPunishmentsStore.getState()).items).toHaveLength(0)
	})

	it('addSet で新セットがアクティブになり、上限5個で頭打ちになる', async () => {
		await customPunishmentsStore.addSet('会社飲み用')
		const s = customPunishmentsStore.getState()
		expect(s.sets).toHaveLength(2)
		expect(getActiveSet(s).name).toBe('会社飲み用')
		for (let i = 0; i < MAX_SETS; i++) {
			await customPunishmentsStore.addSet(`extra${i}`)
		}
		expect(customPunishmentsStore.getState().sets).toHaveLength(MAX_SETS)
	})

	it('addSet は空名を「セットn」で補い、13文字以上を12文字に切り詰める', async () => {
		await customPunishmentsStore.addSet('  ')
		expect(getActiveSet(customPunishmentsStore.getState()).name).toBe('セット2')
		await customPunishmentsStore.addSet('あ'.repeat(13))
		expect(getActiveSet(customPunishmentsStore.getState()).name).toBe('あ'.repeat(12))
	})

	it('removeSet は最後の1セットを消せず、アクティブ削除時は先頭へ移る', async () => {
		const first = customPunishmentsStore.getState().sets[0].id
		await customPunishmentsStore.removeSet(first)
		expect(customPunishmentsStore.getState().sets).toHaveLength(1)
		await customPunishmentsStore.addSet('2つ目')
		const secondId = getActiveSet(customPunishmentsStore.getState()).id
		await customPunishmentsStore.removeSet(secondId)
		const s = customPunishmentsStore.getState()
		expect(s.sets).toHaveLength(1)
		expect(s.activeSetId).toBe(first)
	})

	it('セットごとにアイテムが独立している', async () => {
		await customPunishmentsStore.addItem('normal', 'セット1のお題')
		await customPunishmentsStore.addSet('セカンド')
		expect(getActiveSet(customPunishmentsStore.getState()).items).toHaveLength(0)
		await customPunishmentsStore.addItem('normal', 'セット2のお題')
		await customPunishmentsStore.selectSet(customPunishmentsStore.getState().sets[0].id)
		expect(getActiveSet(customPunishmentsStore.getState()).items[0].text).toBe(
			'セット1のお題',
		)
	})

	it('getActivePool は enabled=false で空を返す', async () => {
		await customPunishmentsStore.addItem('normal', 'お題')
		await customPunishmentsStore.addItem('special', '特大お題')
		let pool = getActivePool(customPunishmentsStore.getState())
		expect(pool.normals).toHaveLength(1)
		expect(pool.specials).toHaveLength(1)
		await customPunishmentsStore.setEnabled(false)
		pool = getActivePool(customPunishmentsStore.getState())
		expect(pool).toEqual({ normals: [], specials: [] })
	})

	it('hydrate が保存済み状態を復元し、不整合な activeSetId を先頭に補正する', async () => {
		await AsyncStorage.setItem(
			'waipa.inshu-suijaku.custom-punishments',
			JSON.stringify({
				enabled: false,
				activeSetId: 'ghost',
				sets: [{ id: 'set9', name: '復元セット', items: [] }],
				nextId: 10,
			}),
		)
		await customPunishmentsStore.hydrate()
		const s = customPunishmentsStore.getState()
		expect(s.enabled).toBe(false)
		expect(s.activeSetId).toBe('set9')
	})

	it('破損した保存データでも throw せずデフォルトに戻る', async () => {
		await AsyncStorage.setItem('waipa.inshu-suijaku.custom-punishments', '{broken')
		await expect(customPunishmentsStore.hydrate()).resolves.toBeUndefined()
		expect(customPunishmentsStore.getState().sets).toHaveLength(1)
	})
})
```

- [ ] **Step 2: RED 確認** — `npx jest src/lib/__tests__/custom-punishments-store.test.ts` → モジュール未作成で FAIL するログを確認
- [ ] **Step 3: `custom-punishments-store.ts` を実装**（`players-store.ts` のパターンを踏襲。emit → persist の順も同じ）
- [ ] **Step 4: GREEN 確認** — 同コマンドで全ケース PASS
- [ ] **Step 5: Commit** — `feat(#68): カスタムお題ストア（セット対応・AsyncStorage 永続化）`

---

### Task 2: engine のカスタムプール対応

**Files:**
- Modify: `src/games/inshu-suijaku/engine.ts`（`createDeck`）
- Test: `src/games/inshu-suijaku/__tests__/engine.test.ts`（既存に describe 追加）

**Interfaces:**
- Consumes: Task 1 の `CustomPunishment`（構造は `Punishment` と互換なので `punishments.ts` の `Punishment[]` として受ける）
- Produces: `createDeck(size: BoardSize, rng: Rng, custom?: { normals: readonly Punishment[]; specials: readonly Punishment[] }): Card[]`

**仕様詳細:** カスタム優先方式。`normals = [...shuffle(custom.normals, rng), ...shuffle(NORMAL_PUNISHMENTS, rng)].slice(0, pairs)`、specials も同様に `JOKER_COUNT` 件。`custom` 省略時は完全に従来挙動（既存テストが回帰ガード）。

- [ ] **Step 1: 失敗するテストを追加**

```ts
describe('createDeck カスタムお題', () => {
	const fixedRng = () => 0.5
	const custom = {
		normals: [
			{ id: 'c1', text: 'カスタム通常1', type: 'normal' as const },
			{ id: 'c2', text: 'カスタム通常2', type: 'normal' as const },
		],
		specials: [{ id: 'c3', text: 'カスタム特大', type: 'special' as const }],
	}

	it('カスタム通常罰が優先して盤面に入る', () => {
		const cards = createDeck('small', fixedRng, custom)
		const ids = new Set(cards.map((c) => c.punishmentId))
		expect(ids.has('c1')).toBe(true)
		expect(ids.has('c2')).toBe(true)
	})

	it('カスタム特大罰がジョーカーに優先して割り当たる', () => {
		const cards = createDeck('small', fixedRng, custom)
		const jokers = cards.filter((c) => c.rank === 'JOKER')
		expect(jokers.some((c) => c.punishmentId === 'c3')).toBe(true)
		expect(jokers).toHaveLength(JOKER_COUNT)
	})

	it('カスタムがペア数を超えてもペア数・カード枚数は変わらない', () => {
		const many = {
			normals: Array.from({ length: 30 }, (_, i) => ({
				id: `cn${i}`,
				text: `多め${i}`,
				type: 'normal' as const,
			})),
			specials: [],
		}
		const cards = createDeck('small', fixedRng, many)
		expect(cards).toHaveLength(BOARD_CONFIG.small.pairs * 2 + JOKER_COUNT)
	})

	it('custom 省略時は従来どおりプリセットのみ', () => {
		const cards = createDeck('small', fixedRng)
		expect(cards.every((c) => !c.punishmentId.startsWith('c'))).toBe(true)
	})
})
```

- [ ] **Step 2: RED 確認** — `npx jest src/games/inshu-suijaku/__tests__/engine.test.ts`
- [ ] **Step 3: `createDeck` に第3引数を実装**（reducer 側の `start` アクションから渡せるよう、`reducer.ts` の `start`/`retry` アクションに `custom?` を追加して素通しする）
- [ ] **Step 4: GREEN 確認** — engine.test.ts と reducer.test.ts が PASS
- [ ] **Step 5: Commit** — `feat(#68): createDeck にカスタムお題プール（カスタム優先）を追加`

---

### Task 3: 一覧シート＋編集フォーム UI

**Files:**
- Create: `src/games/inshu-suijaku/custom-punishments-sheet.tsx`
- Test: `src/games/inshu-suijaku/__tests__/custom-punishments-sheet.test.tsx`

**Interfaces:**
- Consumes: Task 1 の store 全 API
- Produces: `export function CustomPunishmentsSheet(props: { visible: boolean; onClose: () => void })`

**仕様詳細（モック準拠）:**
- RN `Modal`（`animationType="slide"`、`transparent` なしのフルスクリーン。`player-setup-sheet.tsx` の構成を参照）
- ヘッダー: 左 ×（`accessibilityLabel="閉じる"`・`onClose`）/ 中央「カスタムお題」
- セット行: セット名チップを横並び（アクティブはアクセント枠）。タップで `selectSet`。「＋セット」チップで `addSet('')`（名前はフォールバック採番。リネーム UI は今回なし）。長押しで削除（`Alert.alert` で確認、`removeSet`）
- トグル行「デッキに混ぜる」: RN `Switch`（`onValueChange` → `setEnabled`）
- タブ: 「通常罰 n/20」「特大罰 n/5」の 2 ボタン。選択中タイプのアイテムだけをリスト表示
- アイテム行: テキスト＋編集（タップで編集モード）＋削除（`accessibilityLabel="削除"` → `removeItem`）
- 「⊕ 追加」破線ボタン: 追加フォームを開く（上限到達時は disabled 表示）
- 追加・編集フォーム（シート内切替表示）: 種類セグメント / `TextInput`（`maxLength={MAX_TEXT_LENGTH}`・`placeholder="お題を入力..."`）/ 文字数カウンタ `n/40` / `GradientButton`「保存する」（trim 空なら disabled）/ 注記「この端末にのみ保存されます」
- 下部「完了」ボタン（白背景・`onClose`）
- 色は `colors` トークンのみ。`colors.premiumGold` は入口側（Task 4）で使用

- [ ] **Step 1: 失敗するテストを書く**（store は実物＋AsyncStorage mock。`fireEvent`＋`await act`）

テスト観点（それぞれ実コードで書く）:
1. `visible=true` でタイトル「カスタムお題」とデフォルトセット名「マイセット」が表示される
2. 追加フォームでテキスト入力→「保存する」で store にアイテムが増え、リストに表示される
3. 空文字のとき「保存する」が disabled（`accessibilityState.disabled`）
4. タブ切替で special のみ表示される（normal のお題が消える）
5. 削除ボタンで store から消える
6. 「デッキに混ぜる」トグルで `enabled` が切り替わる
7. 「＋セット」でセットが増えアクティブが移る
8. ×ボタンで `onClose` が呼ばれる

- [ ] **Step 2: RED 確認** — `npx jest src/games/inshu-suijaku/__tests__/custom-punishments-sheet.test.tsx`
- [ ] **Step 3: コンポーネント実装**
- [ ] **Step 4: GREEN 確認**
- [ ] **Step 5: Commit** — `feat(#68): カスタムお題の一覧シートと編集フォーム`

---

### Task 4: SizeSelect 入口＋ゲーム結線

**Files:**
- Modify: `src/games/inshu-suijaku/size-select.tsx`
- Modify: `src/games/inshu-suijaku/inshu-suijaku-game.tsx`（`start`/`retry` dispatch に `getActivePool` の結果を渡す・マウント時 `hydrate`）
- Test: `src/games/inshu-suijaku/__tests__/size-select.test.tsx`（既存に追加）/ `__tests__/inshu-suijaku-game.test.tsx`（結線 1 ケース追加）

**Interfaces:**
- Consumes: Task 1 `useCustomPunishments`/`getActivePool`/`countByType`、Task 2 の `custom?` 引数、Task 3 `CustomPunishmentsSheet`

**仕様詳細:**
- SizeSelect に「カスタムお題」行を追加: 👑（`colors.premiumGold` の枠・アイコンは既存ゲームカードの王冠表現に合わせる）＋「カスタムお題」＋サブテキスト「自分たちの罰ゲームを追加」＋有効件数（例「3件 有効」。`enabled=false` なら「オフ」）。タップで `CustomPunishmentsSheet` を開く（`visible` state は SizeSelect 内）
- `InshuSuijakuGame`: `useEffect` で `customPunishmentsStore.hydrate()`。`onStart` と result の `retry` で `dispatch({ type: 'start'|'retry', size, rng, custom: getActivePool(customState) })`
- ジョーカー発動時のカードめくり演出・punish-reveal は既存のまま（カスタムでも text を出すだけ）

- [ ] **Step 1: 失敗するテストを追加**（入口行の表示・タップでシートが開く・件数表示、game 側は start に custom が渡ることを reducer 初期化結果で検証）
- [ ] **Step 2: RED 確認**
- [ ] **Step 3: 実装**
- [ ] **Step 4: GREEN 確認** — `npx jest src/games/inshu-suijaku`
- [ ] **Step 5: Commit** — `feat(#68): 盤面サイズ選択にカスタムお題入口を追加しデッキ生成へ結線`

---

### Task 5: 仕上げ

- [ ] **Step 1:** `npx jest` 全体 PASS 確認
- [ ] **Step 2:** `npx prettier --check .` / `npx eslint .` クリーン確認（差分ファイルの整形漏れに注意）
- [ ] **Step 3:** `npx tsc --noEmit` クリーン確認
- [ ] **Step 4:** Commit（残差分があれば）→ PR 作成（base: develop、タイトル `feat: 飲酒衰弱カスタムお題編集（#68）`、本文に Closes #68・spec/plan へのリンク・テスト結果）
