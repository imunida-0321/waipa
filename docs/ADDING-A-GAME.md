# WaiPa 新しいゲームの追加方法

新しいミニゲームを WaiPa に追加する手順です。AI 利用の有無に関わらず同じ手順です（開発フロー全体は [DEVELOPMENT.md](DEVELOPMENT.md)、手動開発は [DEVELOPMENT-MANUAL.md](DEVELOPMENT-MANUAL.md) を参照）。

## 仕組みの前提

ゲームは **registry 駆動**です。各ゲームの `meta.ts` に `GameMeta` を書き、[src/games/registry.ts](../src/games/registry.ts) の `games` 配列に並べると、ホームのゲーム一覧グリッド・イントロ画面・ゲーム本体（`src/app/game/[id].tsx` の動的ルート）がすべて自動でつながります。**`src/app/` 側の変更は不要**です。全体の構造は Notion の基本設計書（リンクは [DESIGN.md](DESIGN.md)）を参照してください。ゲームを追加したら、Notion の画面設計書にもそのゲームのページを足します。

## アーキテクチャ — 純関数 engine + reducer + フェーズ分岐画面

全ゲームこの構成で統一しています（参照実装: [odeko-poker](../src/games/odeko-poker/)、[daut-dice](../src/games/daut-dice/)）:

```
src/games/<game-id>/
├── meta.ts               # GameMeta（タイトル・人数・遊び方・エントリのコンポーネント）
├── engine.ts             # 運要素・判定ロジックの純関数（UI 非依存）
├── reducer.ts            # フェーズ遷移・プレイヤー送り
├── <game-id>-game.tsx    # エントリ。フェーズに応じて画面を出し分け
├── xxx-screen.tsx        # フェーズごとの画面コンポーネント
├── theme.ts              # ゲーム固有カラー
└── __tests__/            # engine / reducer / 各画面のテスト
```

- **engine.ts** — 乱数・勝敗判定・スコア計算などのコアロジック。純関数にして UI 抜きで単体テストできる形にする
- **reducer.ts** — `deal → play×n → result` のようなフェーズ遷移だけを持つ。タイマーや長押しなどの演出は各画面コンポーネント内で完結させる
- **共通部品** — ドラムロール演出は `DrumrollReveal` + `useDrumroll`（`src/components/game/`）を流用できる

## 手順

### 1. Issue とブランチ

Issue を立てて `develop` から `feature/<issue番号>-<game-id>` ブランチを切る。大きめのゲームは [docs/superpowers/plans/](superpowers/plans/) に実装計画を書く（既存の計画がテンプレートになる）。

### 2. TDD で実装

engine → reducer → 画面の順に、それぞれ RED（失敗するテスト）→ GREEN（最小実装）で進める。テスト規約:

- タイマーを使うテストは `jest.useFakeTimers()` + `await act(async () => ...)`（React 19 では同期 act が失敗する。参照: [kimagure-ox のテスト](../src/games/kimagure-ox/__tests__/)）
- 乱数は注入可能にするか `jest.spyOn` でモックし、結果を決定的にする

### 3. meta.ts に GameMeta を書き、registry.ts に並べる

まず `src/games/<ゲームID>/meta.ts` に `GameMeta` を書きます。

```ts
// src/games/cross-derby/meta.ts
import type { GameMeta } from '../types'
import { CrossDerbyGame } from './cross-derby-game'

export const meta: GameMeta = {
	id: 'cross-derby', // ゲームID（ケバブケース。画像ディレクトリ名と一致させる）
	title: 'クロスダービー',
	tagline: '好きな馬を選んで競わせろ！', // ホームカードのキャッチコピー（1〜2行）
	emoji: '🏇', // 画像未設定時のサムネイル
	gradient: ['#E85BF7', '#7B5CFA'], // カードのグラデーション
	minPlayers: 2,
	maxPlayers: 8,
	requiresPlayers: true, // プレイヤー登録（名前・色）が必要なら true
	premium: true, // プレミアム限定ならtrue（ホームでマスク＋👑バッジ）
	catchCopy: 'イントロ画面のキャッチ\n（改行可。未指定なら tagline）',
	summary: 'イントロ画面の遊び方ダイジェスト（未指定なら howToPlay を連結）',
	thumbnail: require('@/assets/images/cross-derby/intro.jpg'),
	cardThumbnail: require('@/assets/images/cross-derby/card.jpg'),
	howToPlay: [
		'① 〜しよう！', // 既存ゲームに合わせて ①〜④ の番号付き・命令形
		'② 〜！',
		'③ 〜！',
		'④ 〜？',
	],
	Component: CrossDerbyGame,
}
```

次に `src/games/registry.ts` で import し、`games` 配列に並べます。配列の順がホームの表示順です。

```ts
// src/games/registry.ts
import { meta as crossDerbyMeta } from './cross-derby/meta'

export const games: readonly GameMeta[] = [
	// …既存のゲーム
	crossDerbyMeta,
]
```

### 4. 画像を用意する（任意）

| ファイル                             | 用途                         | 仕様                                                  |
| ------------------------------------ | ---------------------------- | ----------------------------------------------------- |
| `assets/images/<ゲームID>/intro.jpg` | イントロ画面サムネイル       | 1:1・512px 推奨（ゲーム内背景と兼用なら `bg.jpg` 可） |
| `assets/images/<ゲームID>/card.jpg`  | ホームカードのキービジュアル | 1.3:1・1040×800 推奨、タイトル文字入り前提            |

未指定の場合は絵文字＋グラデーションで表示されるので、画像なしでも動きます。

### 5. 確認してPR

- `npm test` / `npm run typecheck` / `npm run lint` / `npm run format:check` を全部通す
- `npm run ios` / `npm run android` で開発ビルドを起動し、「ホームにカードが出る → イントロ（遊び方）→ プレイ → リザルト」を一周して確認（広告 SDK などのネイティブモジュールを使っているため、Expo Go では動かない）
- `develop` 宛てに PR（registry のテスト `src/games/__tests__/registry.test.ts` が新ゲームで落ちていないことも確認）

## チェックリスト

- [ ] engine が純関数で、単体テストがある
- [ ] タイマー系テストは fake timers + `await act`
- [ ] `meta.ts` を作って registry に並べ、ホームのグリッドに表示される
- [ ] `howToPlay` が既存ゲームのトーン（①〜④・命令形・絵文字）に揃っている
- [ ] プレミアム限定なら `premium: true`（非プレミアムでロックモーダルが出ること）
- [ ] プレミアム限定なら、エントリのコンポーネントで `useTrialRoundConsumer(gameId, isRoundEnd)` を呼んでいる（呼ばないと、お試しプレイのラウンドが消費されない）
- [ ] `npm test` 全件グリーン・typecheck / lint / format 通過
- [ ] 実機で一周プレイして動作確認
