# ゲーム開始前プレイヤー設定ゲート 設計ドキュメント

**日付:** 2026-07-08
**対象:** 共通ゲームフレーム（`GameScreen`）＋参加メンバー画面（`PlayerSetupSheet`）
**ブランチ:** feature/player-setup-gate（develop ベース）

## 目的

複数人でのプレイヤー設定が必要なゲーム（Who will pay など）で、ゲーム本体（金額入力等）が始まる前に「参加メンバー」画面を必須ステップとして挟む。名前が未入力のプレイヤーがいる状態で先へ進もうとした場合はバリデーションエラーを表示してブロックし、全員入力済みで初めて本体へ進める。

このゲートは共通フレーム（`GameScreen`）側の仕組みとして実装し、他のプレイヤー設定が必要なゲームも `registry.ts` でフラグを立てるだけで同じ挙動になるようにする。

## 非目標（YAGNI）

- 汎用 Toast コンポーネントの新設はしない（この画面専用の軽量バナーで足りる）
- ゲーム開始後にプレイヤー名を編集する導線は削除する（👥ボタン撤去）。開始後の編集は不自然という判断（ユーザー指示）
- プレイヤー数上限・下限のロジック変更はしない（既存の `MIN_PLAYERS`/`MAX_PLAYERS`/`minPlayers`/`maxPlayers` をそのまま使う）

## 現状

- `GameScreen`（`src/components/game/game-screen.tsx`）: ヘッダー（‹戻る／タイトル／👥／？）＋ `<meta.Component/>` を表示。マウント時に初回 howto を自動表示。`PlayerSetupSheet` は👥ボタンで開く任意モーダルで、いつでも開閉できる編集用。
- `PlayerSetupSheet`（`src/components/game/player-setup-sheet.tsx`）: 「つぎへ」は `saveToHistory()` して `onClose()` するだけ。バリデーションなし。モーダル（`<Modal visible=.../>`）として実装。
- `players-store.ts`: `count`/`names`/`history` を持つグローバルストア。名前検証関数は存在しない。
- `registry.ts`: `GameMeta` にプレイヤー必須フラグはない。`who-will-pay` の `Component` は実装済み（`WhoWillPayGame`）、他は `ComingSoonGame`。

## 設計

### 1. `registry.ts` — `requiresPlayers` フラグ

`GameMeta` に `requiresPlayers: boolean` を追加。`who-will-pay` のみ `true`（他ゲームは Component 実装時に各自 `true` にする）。

### 2. `players-store.ts` — 名前検証の純粋関数

```ts
export function allNamesFilled(s: PlayersState): boolean {
	return Array.from({ length: s.count }, (_, i) => s.names[i]?.trim()).every(Boolean)
}
```

### 3. `PlayerSetupSheet` — ゲート専用に単純化

- 既存の「編集モード」は廃止。常にゲートとして振る舞う。
- Props を `{ onProceed: () => void }` に変更（`visible`/`onClose` を廃止）。呼び出し元（`GameScreen`）がゲート未完了の間だけこのコンポーネントをレンダーするので `visible` 制御は不要になる。`Modal` ラッパーもやめて全画面 `View` にする（`GameScreen` がすでに1画面として差し替えるため、二重のモーダル演出は不要）。
- ヘッダー: 左 `×`（`router.back()` でホームへ）／中央「参加メンバー」／右は空。
- 「つぎへ」押下時:
    1. `allNamesFilled(players)` を判定。
    2. **NG**: 上部に軽量バナー「名前が入力されていないものがあります」を表示（数秒後に自動で消える）。名前が空のプレイヤーカードを `colors.danger` の枠線でハイライトする。`onProceed` は呼ばない。
    3. **OK**: バナー/ハイライトがあれば消し、`playersStore.saveToHistory()` を await してから `onProceed()` を呼ぶ。
- ハイライトは「つぎへ」失敗後にのみ表示される state（`highlightEmpty: boolean`、成功か再入力で解除する明示的な仕組みは不要 — 対象カードは `players.names[i]?.trim()` が truthy になった時点で自然に非該当になるため、`highlightEmpty` フラグ1つと現在の `names` を突き合わせるだけで足りる）。

### 4. `GameScreen` — ゲート分岐＋👥撤去

- ヘッダーから 👥 ボタンを削除。ヘッダー右は `？`（howto）のみ。
- `setupDone` state を追加。初期値: `!meta.requiresPlayers`（プレイヤー不要なゲームは最初から `true` 扱い）。
- 初回 howto の自動表示は、`requiresPlayers` なゲームでは **ゲート通過後**（`setupDone` が `true` になった直後）に判定する。プレイヤー不要なゲームは従来どおりマウント時に判定する。
- レンダー分岐:
    - `!setupDone`: ヘッダーを出さず `<PlayerSetupSheet onProceed={() => setSetupDone(true)} />` を全画面表示（× で `router.back()` するのでヘッダーの ‹ は不要）。
    - `setupDone`: 従来どおりのヘッダー（‹／タイトル／？）＋ `<meta.Component/>`。
- 「もう一度」（リザルト画面からのリトライ）はゲームコンポーネント内の state 遷移であり `GameScreen` を再マウントしないため、自動的に再ゲートされない（要件どおり）。

### 5. 影響を受けないもの

- `who-will-pay-game.tsx` は無改修（`GameScreen` 経由でのみゲートがかかるため、ゲーム本体はプレイヤーが揃っている前提のまま）。
- 既存の `who-will-pay-game.test.tsx` は `<WhoWillPayGame/>` を直接 render しており `GameScreen` を経由しないため、無改修で通過する。

## データフロー

```
/game/[id] → GameScreen
  requiresPlayers && !setupDone
    → PlayerSetupSheet（全画面）
        「つぎへ」→ allNamesFilled?
          NG → バナー＋ハイライト（滞留）
          OK → saveToHistory() → onProceed() → setupDone=true
    → ヘッダー＋meta.Component（例: WhoWillPayGame の amount→roulette→result）
```

## テスト

- `players-store.test.ts` — `allNamesFilled`: 全員入力済み→true / 誰か未入力→false / 空白のみの名前→false（trim 済み判定）。
- `player-setup-sheet.test.tsx`（全面書き換え、ゲート仕様に対応）:
    - 名前未入力のまま「つぎへ」→ バナー文言が表示される・`onProceed` が呼ばれない。
    - 全員入力してから「つぎへ」→ `onProceed` が呼ばれる。
    - × を押す → `router.back()` が呼ばれる（`expo-router` モック）。
- `game-screen.test.tsx`（新規）:
    - `requiresPlayers: true` の `meta` → 初期状態でゲート（「参加メンバー」ヘッダー）が表示され、`meta.Component` は描画されない。👥ボタンが存在しない。
    - ゲート完了（`onProceed` 相当の操作）後、通常ヘッダー（？のみ、👥なし）＋ `meta.Component` が描画される。
    - `requiresPlayers: false`（未指定）の `meta` → 初期状態から直接 `meta.Component` が描画される。

## 影響ファイル

- `src/games/registry.ts` — `GameMeta.requiresPlayers` 追加、`who-will-pay` エントリに `requiresPlayers: true`
- `src/lib/players-store.ts` — `allNamesFilled` 追加
- `src/components/game/player-setup-sheet.tsx` — ゲート専用に書き換え（Props変更・Modal廃止・バリデーション・バナー・ハイライト）
- `src/components/game/game-screen.tsx` — 👥ボタン削除、`setupDone` 分岐、howto タイミング調整
- `src/lib/__tests__/players-store.test.ts` — `allNamesFilled` テスト追加
- `src/components/game/__tests__/player-setup-sheet.test.tsx` — ゲート仕様に全面書き換え
- `src/components/game/__tests__/game-screen.test.tsx` — 新規

新規依存なし。既存の色トークン（`colors.danger`）をエラー表現に使う。

## グローバル制約（踏襲）

- フォーマット: タブ幅4・セミコロンなし・シングルクォート
- RNTL v14: `render()` は async
- `bun run test && bun run typecheck && bun run lint` パス、`bunx prettier --check .` 通過
- コミット: `feat:` プレフィックス＋日本語、末尾 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
