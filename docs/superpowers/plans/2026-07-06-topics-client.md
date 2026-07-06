# WaiPa お題クライアント Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase 上のお題（無料110件、DB・RLS は #23 で構築済み）をアプリから取得し、オフラインでも直近キャッシュで遊べるようにする（Issue #8 の残り）。

**Architecture:** supabase-js は導入せず、PostgREST を素の `fetch` で叩く（読み取り専用・anon キーのみの MVP に SDK は過剰。ポリフィル不要・テスト容易。SDK は #7 の認証導入時に再検討）。`topicsStore` は settings/players と同型の外部ストア: `hydrate()` が AsyncStorage キャッシュ→メモリ復元、`refresh()` がネットワーク取得→メモリ＋キャッシュ更新（失敗時はキャッシュ温存）。ゲームは同期 API（`pickTopic(pack)`）でメモリから引く。起動時に root layout で hydrate → refresh（fire-and-forget）。

**Tech Stack:** 既存依存のみ（fetch は RN 標準）。**新規依存の追加は禁止。**

## Global Constraints

- フォーマット: タブインデント幅4・セミコロンなし・シングルクォート（`.prettierrc` が正）
- 環境変数は `process.env.EXPO_PUBLIC_SUPABASE_URL` / `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY` を参照（実値は `.env`。**`.env` ファイルを読んではならない**）
- ストアは `src/lib/settings-store.ts` と同じ useSyncExternalStore パターンに揃える
- `bun run test && bun run typecheck && bun run lint` が各タスクでパス
- コミットは `feat:` プレフィックス＋日本語、末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: topics ストア（取得・キャッシュ・ピッカー）

**Files:**

- Create: `src/lib/topics-store.ts`
- Create: `src/lib/__tests__/topics-store.test.ts`

**Interfaces:**

- Produces: `type Topic = { id: string; pack: string; text: string }`、`topicsStore.getState(): { topics: Topic[]; fetchedAt: number | null }`、`topicsStore.subscribe`、`topicsStore.hydrate(): Promise<void>`、`topicsStore.refresh(): Promise<boolean>`（成功 true / 失敗 false・キャッシュ温存）、`getTopicsByPack(pack: string): Topic[]`、`pickTopic(pack: string, excludeIds?: string[]): Topic | undefined`、`useTopics()`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/__tests__/topics-store.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getTopicsByPack, pickTopic, topicsStore } from '../topics-store'

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

const sample = [
	{ id: 'a', pack: 'king', text: 'お題A' },
	{ id: 'b', pack: 'king', text: 'お題B' },
	{ id: 'c', pack: 'talk', text: 'お題C' },
]

function mockFetchOk(data: unknown) {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: async () => data,
	}) as unknown as typeof fetch
}

function mockFetchFail() {
	global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
}

beforeEach(async () => {
	await AsyncStorage.clear()
	topicsStore._resetForTest()
})

describe('topicsStore', () => {
	it('refresh 成功でメモリとキャッシュが更新される', async () => {
		mockFetchOk(sample)
		const ok = await topicsStore.refresh()
		expect(ok).toBe(true)
		expect(topicsStore.getState().topics).toHaveLength(3)
		expect(await AsyncStorage.getItem('waipa.topics.v1')).toContain('お題A')
	})

	it('refresh は anon キー付きで正しい URL を叩く', async () => {
		mockFetchOk([])
		await topicsStore.refresh()
		const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
		expect(url).toContain('/rest/v1/topics')
		expect(url).toContain('is_premium=eq.false')
		expect((init.headers as Record<string, string>).apikey).toBeTruthy()
	})

	it('refresh 失敗時は false を返しキャッシュを温存する', async () => {
		mockFetchOk(sample)
		await topicsStore.refresh()
		mockFetchFail()
		const ok = await topicsStore.refresh()
		expect(ok).toBe(false)
		expect(topicsStore.getState().topics).toHaveLength(3)
	})

	it('hydrate がキャッシュから復元する', async () => {
		await AsyncStorage.setItem(
			'waipa.topics.v1',
			JSON.stringify({ fetchedAt: 123, topics: sample }),
		)
		await topicsStore.hydrate()
		expect(topicsStore.getState().topics).toHaveLength(3)
		expect(topicsStore.getState().fetchedAt).toBe(123)
	})

	it('getTopicsByPack がパックで絞り込む', async () => {
		mockFetchOk(sample)
		await topicsStore.refresh()
		expect(getTopicsByPack('king')).toHaveLength(2)
		expect(getTopicsByPack('none')).toHaveLength(0)
	})

	it('pickTopic は excludeIds を除いてランダムに1件返す', async () => {
		mockFetchOk(sample)
		await topicsStore.refresh()
		const picked = pickTopic('king', ['a'])
		expect(picked?.id).toBe('b')
		expect(pickTopic('king', ['a', 'b'])).toBeUndefined()
	})
})
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test src/lib/__tests__/topics-store.test.ts`
Expected: FAIL（`../topics-store` が存在しない）

- [ ] **Step 3: topics-store.ts を実装**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

const CACHE_KEY = 'waipa.topics.v1'
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

export type Topic = {
	id: string
	pack: string
	text: string
}

type TopicsState = {
	topics: Topic[]
	fetchedAt: number | null
}

let state: TopicsState = { topics: [], fetchedAt: null }
const listeners = new Set<() => void>()

function emit() {
	listeners.forEach((fn) => fn())
}

export const topicsStore = {
	getState(): TopicsState {
		return state
	},
	subscribe(fn: () => void): () => void {
		listeners.add(fn)
		return () => listeners.delete(fn)
	},
	// キャッシュ→メモリ復元（起動直後・オフライン時の土台）
	async hydrate() {
		try {
			const raw = await AsyncStorage.getItem(CACHE_KEY)
			if (raw) {
				const cached = JSON.parse(raw) as TopicsState
				state = { topics: cached.topics ?? [], fetchedAt: cached.fetchedAt ?? null }
				emit()
			}
		} catch {
			// 壊れたキャッシュは無視（次の refresh で上書きされる）
		}
	},
	// ネットワーク取得。失敗しても throw せず false（キャッシュ温存）
	async refresh(): Promise<boolean> {
		try {
			const res = await fetch(
				`${SUPABASE_URL}/rest/v1/topics?select=id,pack,text&is_premium=eq.false&limit=1000`,
				{
					headers: {
						apikey: ANON_KEY,
						Authorization: `Bearer ${ANON_KEY}`,
					},
				},
			)
			if (!res.ok) return false
			const topics = (await res.json()) as Topic[]
			state = { topics, fetchedAt: Date.now() }
			emit()
			await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(state))
			return true
		} catch {
			return false
		}
	},
	// テスト用: モジュール状態を初期化
	_resetForTest() {
		state = { topics: [], fetchedAt: null }
	},
}

export function useTopics(): TopicsState {
	return useSyncExternalStore(topicsStore.subscribe, topicsStore.getState, topicsStore.getState)
}

export function getTopicsByPack(pack: string): Topic[] {
	return state.topics.filter((t) => t.pack === pack)
}

// ゲームから使うランダムピッカー。使用済み ID を除外して重複出題を防ぐ
export function pickTopic(pack: string, excludeIds: string[] = []): Topic | undefined {
	const pool = getTopicsByPack(pack).filter((t) => !excludeIds.includes(t.id))
	if (pool.length === 0) return undefined
	return pool[Math.floor(Math.random() * pool.length)]
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `bun run test src/lib`
Expected: PASS（topics 6 件を含む全件）

- [ ] **Step 5: typecheck / lint / commit**

```bash
bun run typecheck && bun run lint
git add -A && git commit -m "feat: お題ストア（フェッチ・キャッシュ・ピッカー）を追加 (#8)"
```

---

### Task 2: 起動時ワイヤリング＋ギャラリー確認導線

**Files:**

- Modify: `src/app/_layout.tsx`（起動時 hydrate → refresh）
- Modify: `src/app/gallery.tsx`（お題データの読み込み状況を表示）

**Interfaces:**

- Consumes: `topicsStore` / `useTopics`（Task 1）

- [ ] **Step 1: \_layout.tsx の useEffect に追記**

既存の `settingsStore.hydrate()` / `playersStore.hydrate()` の並びに追加:

```tsx
import { topicsStore } from '@/lib/topics-store'

// useEffect 内:
topicsStore.hydrate().then(() => {
	topicsStore.refresh()
})
```

- [ ] **Step 2: gallery.tsx に確認セクションを追加**

既存の「ゲームフレーム」セクションの後に:

```tsx
<SectionHeader title="お題データ" />
<Card>
	<ThemedText>
		読み込み済み: {topics.topics.length}件
		{topics.fetchedAt ? `（${new Date(topics.fetchedAt).toLocaleTimeString()} 取得）` : '（キャッシュなし）'}
	</ThemedText>
</Card>
```

（コンポーネント冒頭で `const topics = useTopics()`、import を追加）

- [ ] **Step 3: 全検証**

```bash
bun run test && bun run typecheck && bun run lint && bunx prettier --check .
bunx expo export --platform web && rm -rf dist
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: 起動時のお題取得とギャラリー確認導線を追加 (#8)"
```

---

## Self-Review 済みチェック

- Issue #8 受け入れ条件との対応: 匿名アクセスで無料パック取得=Task 1（RLS は #23 で検証済み）/ 起動時フェッチ＋ローカルキャッシュ（オフラインでも直近データ）=Task 1+2 / 初期データ・RLS・.env.example は #23 で完了済み
- `_resetForTest` はテスト分離のための最小限のエスケープハッチ（jest.resetModules より軽量で確実）
- fetch はグローバル（RN 標準）。jest では各テストで明示モック
