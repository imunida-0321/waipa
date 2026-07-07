# Who will pay ルーレット盤の細分割 設計ドキュメント

**日付:** 2026-07-07
**対象:** WaiPa「Who will pay?」のルーレット盤
**ブランチ:** feature/roulette-fine-segments（develop ベース）

## 目的

ルーレット盤の見た目を「人数ぶんの大きな色セクター」から、各プレイヤーの色を盤の周りに複数回くり返した「細かい多分割」に変える。本物のルーレット/ダーツ盤のように同じ色が飛び飛びで何度も現れる、にぎやかな見た目にする。

**当選挙動（誰が支払うか）は完全に不変。** 変えるのは盤の描画と、当選プレイヤーの色のどのセグメントで止めるかだけ。

## 非目標（YAGNI）

- ティック（目盛り線）の追加はしない（色セグメントの細分割で目的を満たす）
- 回転アニメの速度・イージング変更はしない
- 分割密度のユーザー設定 UI は作らない（人数から自動算出）

## 現状

`src/games/who-will-pay/roulette-wheel.tsx` は `playerColors.length` 個のセクターを描画。停止角は `src/games/who-will-pay/spin.ts` の `finalAngleForPlayer(playerIndex, playerCount)` が当選プレイヤーのセクター**中心**を真上へ運ぶ。当選プレイヤーは `use-digit-roulette.ts` 内の `pickPlayerIndex(playerCount)` が決定し、スロットへその `p` を割り当てる。

既存の重要な性質: `finalAngleForPlayer` は `center = (i + 0.5) * sector`（セクター中心）を狙うため、ポインタは常にセクターのド真ん中で止まり、**区切り線の真上には構造上止まらない**。この性質は本変更後も維持する。

## 設計

### 単一の真実: `wheelRepeats(playerCount)`

盤の描画と停止角の両方が同じ分割数を参照するよう、`spin.ts` に純粋関数を追加する。

```
WHEEL_TARGET_SEGMENTS = 18
wheelRepeats(playerCount) = max(2, round(WHEEL_TARGET_SEGMENTS / playerCount))
総セグメント数 = playerCount * wheelRepeats(playerCount)
```

人数別の総セグメント数（各色のくり返し回数）:

| 人数 | repeats | 総数 |
| ---- | ------- | ---- |
| 2    | 9       | 18   |
| 3    | 6       | 18   |
| 4    | 5       | 20   |
| 5    | 4       | 20   |
| 6    | 3       | 18   |
| 7    | 3       | 21   |
| 8    | 2       | 16   |

各色は最低2回くり返す。総数は概ね16〜21に収まる。

### 1. 盤の描画（`roulette-wheel.tsx`）

- `repeats = wheelRepeats(playerColors.length)`、`total = playerColors.length * repeats` を導出。
- `total` 個の細い扇形（`sectorPath`）を描画。セグメント `j` の色 = `playerColors[j % playerColors.length]`。
- リム・中央ハブ・上部固定ポインタ・区切りストロークは現状のまま。
- 表示専用コンポーネントのまま（`repeats` を `wheelRepeats` から内部導出するので Props は現状維持＝`playerColors` / `rotation` / `size`）。

### 2. 停止角（`use-digit-roulette.ts`）

- 当選プレイヤー決定は現状どおり `p = pickPlayerIndex(playerCount)`（挙動不変）。
- 変更点は停止セグメントの選択のみ:
    - `repeats = wheelRepeats(playerCount)`、`total = playerCount * repeats`
    - `p` が持つセグメント index は `p, p + playerCount, p + 2*playerCount, …`（計 `repeats` 個）
    - そのうち1つをランダムに選ぶ: `segment = p + playerCount * floor(random() * repeats)`
    - `rotation.value += finalAngleForPlayer(segment, total)`（＝選んだセグメント中心を真上へ）
- スロットへの担当割当は従来どおり `p`。盤の色と当選者は必ず一致する。

### 3. 整合性の担保

- 描画と停止角がともに `wheelRepeats(playerCount)` を参照するため、描かれた色と止まる位置がズレない（単一の真実）。
- `finalAngleForPlayer(segment, total)` はセグメント中心を狙うので、細分割後もポインタは境界線上に乗らない。

## テスト

`src/games/who-will-pay/__tests__/spin.test.ts` に追加:

- **分割数**: `wheelRepeats(count)` が全 `count ∈ [2..8]` で `>= 2` を返し、総数が概ね 16〜21 に収まること。
- **当選色の整合性**: 代表的な人数 `[2,3,4,5,6,8]` について、各プレイヤー `p` の各セグメント `w`（`w % count === p` を満たす `total` 個）に対し、
  `sectorForAngle(finalAngleForPlayer(w, total), total) % count === p`
  が成り立つこと（＝止まった色が必ず当選者の色）。

不変:

- `use-digit-roulette.test.ts` — 当選者は `pickPlayerIndex` のまま。スロット割当の挙動は不変なので既存テストがそのまま通る（変更不要）。
- `roulette-wheel.tsx` — 表示専用のため単体テストなし（既存方針踏襲）。

## 影響ファイル

- `src/games/who-will-pay/spin.ts` — `WHEEL_TARGET_SEGMENTS` 定数 + `wheelRepeats` 追加（既存 2 関数は不変）
- `src/games/who-will-pay/roulette-wheel.tsx` — 描画を総セグメント数ベースに
- `src/games/who-will-pay/use-digit-roulette.ts` — 停止角の計算をセグメント選択ベースに
- `src/games/who-will-pay/__tests__/spin.test.ts` — 上記テスト追加

新規依存なし。既存の色トークン（`playerColor` / `PLAYER_COLORS`）とゲーム専用色（`WWP`）はそのまま。

## グローバル制約（踏襲）

- フォーマット: タブ幅4・セミコロンなし・シングルクォート
- `bun run test && bun run typecheck && bun run lint` パス、`bunx prettier --check .` 通過
- コミット: `feat:` プレフィックス＋日本語、末尾 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
