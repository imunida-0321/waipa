# 演出アニメーションの Lottie 化 設計

2026-07-09 確定。既存の自作（reanimated）演出のうち2箇所を Lottie 素材に置き換える。

## 決定事項

- **対象**: ①ドラムロール発表（共通部品 `DrumrollReveal`）②きまぐれ◯×のイベントカットイン（`EventCutin`）
- **対象外**: Who will pay のルーレット回転（当選結果と着地角度が連動するため固定再生の Lottie は不適。現行実装を維持）、BOMB のシェイク・タイル開封、起動スプラッシュ
- **素材調達**: LottieFiles 無料素材（Lottie Simple License、商用可を確認）＋アプリのカラートークンへ色調整
- **既存実装の扱い**: フォールバックとして残す。素材未登録・読み込み失敗時は現行の reanimated 演出を表示。運用が安定したら削除を検討
- **ドラムロールの置換粒度**: タメ（rolling ループ）と発表瞬間（celebrate 1回再生）の両方。発表テキスト「◯番！」は動的なため React 側で前面に重ねる（現行の withSpring ポップを維持）

## 全体構成

```
src/components/game/
  lottie-effect.tsx    // 新設: 素材があれば再生、なければ fallback を表示する薄い共通部品
  lottie-assets.ts     // 新設: 素材レジストリ（未入手の素材は null）
  drumroll-reveal.tsx  // 変更: 内部で LottieEffect を使用（外部 API 不変）
src/games/kimagure-ox/
  event-cutin.tsx      // 変更: 同上
assets/lottie/
  drumroll-loop.json   // タメ（ループ）※素材入手後に追加
  celebrate.json       // 発表の紙吹雪等（1回再生）※同上
  cutin-flash.json     // カットイン背景（1回再生）※同上
```

素材が1つも無い状態でもマージ可能。レジストリが `null` の間は完全に現行挙動のままなので、コード先行 → 素材をあとから差し込む運用ができる。

## LottieEffect 仕様

```ts
type Props = {
	source: number | null // lottie-assets.ts のエントリ。null なら fallback
	loop?: boolean
	fallback?: ReactNode // 素材なし・読み込み失敗時に表示（省略時は何も出さない）
	style?: StyleProp<ViewStyle>
}
```

- `source === null` → `fallback` をそのまま描画
- `LottieView` の `onAnimationFailure` で実行時の読み込み失敗を検知し `fallback` に切替
- 素材レジストリは1行差し替え式:

```ts
// lottie-assets.ts — 素材を入手したら null を require に差し替える
export const lottieAssets = {
	drumrollLoop: null as number | null, // 例: require('@/assets/lottie/drumroll-loop.json')
	celebrate: null as number | null,
	cutinFlash: null as number | null,
}
```

## 各演出への組み込み

**DrumrollReveal**（props `{ phase, children }` 不変、利用側の変更ゼロ）

- `rolling`: `LottieEffect(drumrollLoop, loop)`。fallback = 現行の「？？？」パルス
- `revealed`: `LottieEffect(celebrate)` を背面レイヤーで1回再生し、前面に children（「◯番！」ポップ）を現行のまま重ねる。fallback = 紙吹雪なし（現行と同一の見た目）

**EventCutin**

- `cutinFlash` を背面に1回再生。「きまぐれ発動！」＋イベント名テキストは現行のスケールインのまま前面。fallback = 現行と同一

テキストは常に React 側のため、番号・イベント名の動的な内容と素材が干渉しない。

## 素材規約

| 項目       | 規約                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| ライセンス | Lottie Simple License（商用可）を確認。出典 URL を lottie-assets.ts のコメントに記録                   |
| 色         | LottieFiles エディタでカラートークン（#E85BF7→#7B5CFA、#F1C40F）に寄せる。微調整は `colorFilters`      |
| サイズ     | 1素材 100KB 目安。超える場合は .lottie 形式を検討                                                      |
| 差し替え   | 同名ファイル上書き＋レジストリ不変（bomb-216 の explosion.json と同じ運用）                            |
| Web        | lottie-react-native の web 実装が `@lottiefiles/dotlottie-react`（導入済み）を利用するため追加対応不要 |

## テスト方針

- `LottieEffect`: ①source=null で fallback 表示 ②source ありで LottieView 描画 ③onAnimationFailure で fallback 切替
- `DrumrollReveal`・`EventCutin`・王様ゲーム・きまぐれ◯×の既存テストが無変更で通ること（素材 null = fallback 経路が現行挙動と同一である保証）
- jest.mock は bomb-216 の既存パターン（`__tests__/bomb-game.test.tsx`）を流用

## 実装ステップ

1. **コード組み込み**: LottieEffect＋レジストリ（全 null）＋2箇所への組み込み。挙動は現状と同一のままマージ
2. **素材選定・登録**: LottieFiles で3素材を選定 → 色調整 → assets/lottie/ に配置 → レジストリの require を有効化
