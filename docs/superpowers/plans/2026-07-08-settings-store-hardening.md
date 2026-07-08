# settings-store 強化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Issue #25 の後送り Minor 4項目（hydrate の JSON.parse ガード／楽観更新コメント／haptics 有効時テスト補完／`@types/jest` の `^29` 整合）を解消する。

**Architecture:** 挙動変更は「破損ストレージ時に落ちずデフォルトへフォールバック」のみ（メモリ上だけ・AsyncStorage の破損値は削除しない、ユーザー裁定済み）。他はコメント・テスト・依存バージョンの整合で、正常系の動作と公開 API は完全に不変。

**Tech Stack:** Expo SDK 57 / AsyncStorage / jest-expo / bun。**新規依存なし（バージョン整合のみ）。**

## Global Constraints

- フォーマット: タブインデント幅4・セミコロンなし・シングルクォート（`.prettierrc` が正）
- 各タスク完了時 `bun run test && bun run typecheck && bun run lint` がパス。最終タスクで `bunx prettier --check .` も通す
- コミットは適切なプレフィックス（`fix:`/`test:`/`chore:`）＋日本語、末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 公開 API・エクスポートの変更禁止（`settingsStore`/`useSettings`/`SettingsState` のシグネチャ不変）

---

### Task 1: `hydrate()` の JSON.parse ガード＋楽観更新コメント

**Files:**

- Modify: `src/lib/settings-store.ts`（`hydrate` の try/catch 化＋コメント1箇所。他は不変）
- Test: `src/lib/__tests__/settings-store.test.ts`（既存テストは不変。破損データの it を追加）

**Interfaces:**

- Consumes: 既存 `settingsStore`（`getState`/`subscribe`/`hydrate`/`setSoundEnabled`/`setHapticsEnabled`）、`DEFAULTS = { soundEnabled: true, hapticsEnabled: true }`
- Produces: 変更なし（`hydrate(): Promise<void>` のシグネチャ・正常系挙動は不変。破損データ時に throw しなくなるのみ）

- [ ] **Step 1: 失敗するテストを追加**

`src/lib/__tests__/settings-store.test.ts` の `describe('settingsStore', ...)` 内の末尾（`subscribe` の it の後）に追加:

```ts
it('破損した保存データでも throw せずデフォルトに戻る', async () => {
	await AsyncStorage.setItem('waipa.settings', '{broken json')
	await expect(settingsStore.hydrate()).resolves.toBeUndefined()
	expect(settingsStore.getState()).toEqual({ soundEnabled: true, hapticsEnabled: true })
})
```

- [ ] **Step 2: 落ちることを確認**

Run: `bun run test src/lib/__tests__/settings-store.test.ts`
Expected: FAIL（現行実装は `JSON.parse('{broken json')` が throw → `hydrate()` が reject し `resolves` アサーションが落ちる）

- [ ] **Step 3: `settings-store.ts` を修正**

`hydrate` を次に変更（try/catch 追加。`emit()` は成功・失敗どちらでも呼ぶため外に置く）:

変更前:

```ts
	async hydrate() {
		const raw = await AsyncStorage.getItem(STORAGE_KEY)
		state = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
		emit()
	},
```

変更後:

```ts
	async hydrate() {
		const raw = await AsyncStorage.getItem(STORAGE_KEY)
		try {
			state = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
		} catch {
			// 破損データはメモリ上だけデフォルトへ（次回の persist で正常値に上書きされる）
			state = { ...DEFAULTS }
		}
		emit()
	},
```

あわせて、楽観更新の意図を `persist` 定義の直前に1行コメントで明記（setter 2つには重複させない）:

変更前:

```ts
async function persist() {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
```

変更後:

```ts
// setter は emit（UI更新）を先に、persist（永続化）を後に行う楽観更新。保存失敗してもUIは進む
async function persist() {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
```

- [ ] **Step 4: PASS 確認**

Run: `bun run test src/lib/__tests__/settings-store.test.ts`
Expected: PASS（既存4テスト＋新規1テスト）

- [ ] **Step 5: typecheck / lint / commit**

Run: `bun run typecheck && bun run lint`
Expected: エラーなし

```bash
git add src/lib/settings-store.ts src/lib/__tests__/settings-store.test.ts
git commit -m "fix: settings の hydrate が破損データで落ちないようガードを追加 (#25)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: haptics 有効時テスト補完＋`@types/jest` を `^29` に整合

**Files:**

- Modify: `src/lib/__tests__/haptics.test.ts`（有効時の it を追加。既存テストは不変）
- Modify: `package.json`（`"@types/jest": "^30.0.0"` → `"^29"`）＋ `bun.lock`（`bun install` の結果）

**Interfaces:**

- Consumes: 既存 `haptics.tap/heavy/success`（すべて async、`settingsStore.getState().hapticsEnabled` が false なら no-op）、既存テストの expo-haptics モック（`ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' }` / `NotificationFeedbackType: { Success: 'success' }`）
- Produces: 変更なし（テストと devDependencies のみ）

- [ ] **Step 1: 失敗するテストを追加（heavy/success の有効時パス）**

`src/lib/__tests__/haptics.test.ts` の `describe('haptics', ...)` 内、既存「設定 ON のとき impactAsync を呼ぶ」の直後に追加:

```ts
it('設定 ON のとき heavy が Heavy スタイルで impactAsync を呼ぶ', async () => {
	await settingsStore.setHapticsEnabled(true)
	await haptics.heavy()
	expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith('heavy')
})

it('設定 ON のとき success が notificationAsync を呼ぶ', async () => {
	await settingsStore.setHapticsEnabled(true)
	await haptics.success()
	expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith('success')
})
```

- [ ] **Step 2: PASS することを確認（実装済み関数のテスト補完のため RED はない）**

Run: `bun run test src/lib/__tests__/haptics.test.ts`
Expected: PASS（既存2テスト＋新規2テスト。実装は既に正しいので追加テストは最初から通る — これはカバレッジ補完タスクであり TDD の RED は適用外。ただし追加アサーションが実際に実行されていることを、テスト数が 2→4 に増えたことで確認する）

- [ ] **Step 3: `@types/jest` を `^29` に変更して install**

`package.json` の devDependencies:

変更前:

```json
		"@types/jest": "^30.0.0",
```

変更後:

```json
		"@types/jest": "^29",
```

Run: `bun install`
Expected: `bun.lock` が更新され、`bun pm ls | grep @types/jest` が `@types/jest@29.x` を示す

- [ ] **Step 4: 全検証**

```bash
bun run test && bun run typecheck && bun run lint && bunx prettier --check .
```

Expected: すべてパス（型パッケージのダウングレードがあるため typecheck を必ず確認。jest 本体 `^29` と型が揃い、既存テストの型エラーが出ないこと）

- [ ] **Step 5: commit**

```bash
git add src/lib/__tests__/haptics.test.ts package.json bun.lock
git commit -m "test: haptics の有効時パスを補完し @types/jest を jest 本体に整合 (#25)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-Review 済みチェック

- スペック対応: JSON.parse ガード＋破損テスト=Task1 / 楽観更新コメント=Task1 / haptics 有効時テスト=Task2 / `@types/jest` 整合=Task2 — Issue #25 の4チェックボックスすべてカバー
- 型整合: 公開 API 変更なし。テストの期待値はモック定義（`'heavy'`/`'success'`）と一致
- Task 2 Step 2 は TDD の RED なし（既存実装のカバレッジ補完）と明示済み — レビュアーが「RED がない」ことを欠陥と誤認しないよう理由を本文に記載
- 破損値を AsyncStorage から削除しない判断はユーザー裁定済み（設計ドキュメント参照）
