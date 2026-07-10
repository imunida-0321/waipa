# カウントダウン爆弾リレー（G7 / #15）設計

2026-07-10 確定。ブレインストーミングでの決定事項と設計をまとめる。

## 決定事項

- **操作なし＝物理手渡しのみ**: 「回した」ボタンは置かない。お題に答えたらスマホを次の人へ渡すだけ。アプリは保持者を追跡しない（爆発した瞬間に持っていた人が負け）
- **プレイヤー登録不要**: registry の `requiresPlayers` は付けない（敗者は物理的に持っている人なので名前が要らない）。`minPlayers: 3` / `maxPlayers: 12` は既存値維持
- **導火線は 10〜45 秒のランダム・非表示**: 長さ選択などの設定は置かない（YAGNI）
- **チクタク音は専用素材 `tick` を使う**: 素材（`assets/sounds/tick.m4a`）はユーザーが後日追加し、`_layout.tsx` に `registerSound('tick', ...)` を1行足して有効化する。**素材が入るまでは無音＋バイブで完全動作**（`playSound` は未登録キーを安全にスキップする実装を確認済み）
- **お題は `talk` パック**（Supabase シード済み40問）＋コード内フォールバック（王様のいない王様ゲーム / リアクション神経衰弱と同パターン）
- **実装アプローチ**: 純関数エンジン＋コンポーネント状態機械（5秒STOP 準拠）。盤面や複雑な遷移がないため reducer 方式は使わない。乱数・時間計算は `engine.ts` の純関数に切り出す

## 画面フロー

```
ready（お題表示＋スタート）→ ticking（🧨脈打ち＋加速チクタク）→ exploded（爆発演出＋敗者宣言）
                                                                      └→「もう一回」→ ready（新お題・新導火線）
```

- **ready**: お題をドン！と大きく表示（例「ラーメンの具といえば？」）＋「スタート」ボタン。全員がお題を確認してから開始する
- **ticking**: 🧨（脈打つアニメ）＋お題を常時表示。**残り時間は一切表示しない**
    - チクタク: `tick` 音＋`haptics.tap()` を加速する間隔で発火。序盤 700ms → 終盤 140ms、進行率の2乗で補間（単調減少・下限クランプ）
    - setInterval ではなく setTimeout チェーン（発火ごとに次の間隔を計算）
- **exploded**: explosion.json（Lottie）＋`explosion` 音＋強バイブ＋赤フラッシュ →「💥 今持ってる人の負け！」→「もう一回」（新お題・新導火線で ready へ）/「ホームへ」

## ファイル構成

```
src/games/bomb-relay/
  engine.ts             // 純関数: pickFuseMs(rng) 10000〜45000 / nextTickDelay(elapsedMs, fuseMs) 加速カーブ
  topics.ts             // talk フォールバックお題（20問目安）＋ pickTalkTopic(topics, usedIds, rng)
  bomb-relay-game.tsx   // ready/ticking/exploded 状態機械（setTimeout チェーン＋cleanup）
  explosion-overlay.tsx // 爆発演出（Lottie＋赤フラッシュ＋敗者宣言＋もう一回/ホームへ）
  theme.ts              // 紫系（registry グラデ #A55EEA→#8854D0 と統一）
  __tests__/
```

registry.ts: 既存エントリ `id: 'bomb-relay'` の `Component` を差し替え（ComingSoonGame → BombRelayGame）。catchCopy / summary / howToPlay をルール確定版に更新。`requiresPlayers` は付けない。

## エンジン仕様

```ts
export const FUSE_MIN_MS = 10000
export const FUSE_MAX_MS = 45000
export const TICK_START_MS = 700
export const TICK_END_MS = 140

pickFuseMs(rng): number        // FUSE_MIN_MS + rng() * (FUSE_MAX_MS - FUSE_MIN_MS)
nextTickDelay(elapsedMs, fuseMs): number
  // progress = clamp(elapsed / fuse, 0, 1)
  // TICK_START_MS + (TICK_END_MS - TICK_START_MS) * progress^2（単調減少、TICK_END_MS 下限）
```

## エッジケース

| ケース                    | 対応                                                                    |
| ------------------------- | ----------------------------------------------------------------------- |
| 爆発演出中の連打          | オーバーレイでブロック。「もう一回」は爆発演出の完了後に表示            |
| もう一回での同一お題      | `usedTopicIds` を引き継いで重複回避（プール枯渇時は全プールから再抽選） |
| 音 OFF 設定               | 既存 settings 経由（playSound / haptics が各自ガード）→ バイブのみ      |
| tick 素材未登録           | `playSound('tick')` が無音スキップ（バイブは鳴る）                      |
| unmount（戻る・ホームへ） | チクタク・導火線のタイマーを全て clear                                  |
| バックグラウンド遷移      | MVP では特別対応しない（タイマーは JS タイマーのまま進行/停止に任せる） |

## テスト方針

- engine: `pickFuseMs` の範囲（境界含む）、`nextTickDelay` の単調減少・始点/終点値・下限クランプ・fuse=0 等の異常入力
- topics: フォールバック20問（pack='talk'・id 重複なし）、`pickTalkTopic` のリモート優先・usedIds 除外・枯渇時フォールバック
- コンポーネント: fake timers で スタート → tick が加速発火（haptics.tap 呼び出し回数で検証）→ fuse 経過で爆発オーバーレイ → もう一回で新ラウンド（お題変化・タイマー再セット）。unmount cleanup。React 19 の await act 規約（kimagure-ox 参照実装）に従う

## 収録・リリース面

- 無料ゲーム（MVP 8ゲームの最後の1つ）。`talk` パックはシード済みのため Supabase 追加作業なし
- リリース前 TODO（ユーザー）: `assets/sounds/tick.m4a` を入手して追加 → `_layout.tsx` に `registerSound('tick', require('@/assets/sounds/tick.m4a'))` を追加（assets/sounds/README.md にも記載する）
- 本ゲーム完了で MVP 8ゲームが揃い、ホームレイアウト刷新（#44）の最終決定が解禁される
