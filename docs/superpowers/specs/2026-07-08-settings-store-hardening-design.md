# settings-store 強化 設計ドキュメント

**日付:** 2026-07-08
**対象:** Issue #25（デザインシステム PR 最終レビューの後送り Minor 4項目）
**ブランチ:** feature/25-settings-store-hardening（develop ベース）

## 目的

前回レビューで defer 裁定になった小粒の堅牢化・テスト補完・依存整合を1ブランチでまとめて解消する。挙動の変更は「破損ストレージ時に落ちない」ことのみで、正常系の動作は完全に不変。

## 4項目

### 1. `hydrate()` の JSON.parse ガード（`src/lib/settings-store.ts`）

```ts
async hydrate() {
	const raw = await AsyncStorage.getItem(STORAGE_KEY)
	try {
		state = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
	} catch {
		state = { ...DEFAULTS }
	}
	emit()
},
```

- 破損データはメモリ上だけデフォルトに戻す（ユーザー裁定済み）。AsyncStorage 側の破損値は削除しない — 次回 `setSoundEnabled`/`setHapticsEnabled` の `persist()` で正常値に上書きされるまで残るが、settings は起動毎に hydrate → 都度フォールバックするだけで実害なし。
- `emit()` は try/catch の外（成功・失敗どちらでも購読者に通知）。

### 2. 楽観更新コメント（同ファイル）

`setSoundEnabled` / `setHapticsEnabled` で `emit()` が `persist()` より先行するのは「UI を先に更新し、永続化は後から追いかける楽観更新」という意図的な順序であることを1行コメントで明記する。コメントは両 setter に重複させず、`emit`/`persist` 定義付近または最初の setter に1箇所。

### 3. haptics テスト補完（`src/lib/__tests__/haptics.test.ts`)

有効時パスのアサーションを `tap()` だけでなく `success()` / `heavy()` にも追加:

- `await haptics.heavy()` → `expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith('heavy')`
- `await haptics.success()` → `expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith('success')`

既存の OFF 時テスト・`tap()` テストは不変。

### 4. `@types/jest` を `^29` に（`package.json`）

`jest` 本体が jest-expo 互換のため `^29` に pin 済みなのに `@types/jest` だけ `^30.0.0` になっている不整合を解消。`"@types/jest": "^29"` に変更して `bun install`、lockfile 更新をコミットに含める。jest-expo が jest 30 対応した際に両方まとめて上げる（Issue 記載どおり）。

## テスト

- `src/lib/__tests__/settings-store.test.ts` に破損データテストを追加:
  `AsyncStorage.setItem('waipa.settings', '{broken json')` → `await settingsStore.hydrate()` が throw せず `getState()` が `DEFAULTS`（両方 true）に一致。
- 既存テストはすべて不変で通過。
- 検証: `bun run test && bun run typecheck && bun run lint && bunx prettier --check .`（依存変更があるため typecheck は特に重要）。

## 影響ファイル

- `src/lib/settings-store.ts` — try/catch ＋ コメント
- `src/lib/__tests__/settings-store.test.ts` — 破損データテスト追加
- `src/lib/__tests__/haptics.test.ts` — 有効時アサーション追加
- `package.json` / `bun.lock` — `@types/jest` を `^29` に

新規依存なし（バージョン整合のみ）。API・エクスポートの変更なし。

## グローバル制約（踏襲）

- フォーマット: タブ幅4・セミコロンなし・シングルクォート
- コミット: `fix:`/`test:`/`chore:` 等の適切なプレフィックス＋日本語、末尾 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- PR は develop 向け、`Closes #25`
