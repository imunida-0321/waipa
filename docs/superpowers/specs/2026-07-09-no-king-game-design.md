# 王様のいない王様ゲーム（Issue #13）設計

2026-07-09 確定。ブレインストーミングでの決定事項と設計をまとめる。

## 決定事項

- **匿名番号方式**: 人数（3〜12）だけ選んで開始。名前登録なし（`requiresPlayers` は付けない）
- **毎ラウンド番号再配布**: 本家準拠。ラウンドごとに端末回しで番号を配り直す
- **お題スキップは1ゲーム2回まで**（1ゲーム＝ゲーム画面を開いてから閉じるまで）
- **限定パック（king_premium）導線は UI スタブ**: 案内モーダルのみ。AdMob(#6)/RevenueCat(#7) 実装時に接続
- **実装アプローチ**: 純粋エンジン＋reducer 方式（きまぐれ◯× 準拠）

## 画面フロー

```
count（人数選択）→ deal（番号配布・端末回し）→ reveal（お題＆実行役発表）→ done（実行）
                        ↑__________________ 次のラウンド（番号配り直し）__________________|
```

- **count**: 人数ステッパー（3〜12）＋「🔒 限定お題パック」行（タップで案内モーダル）＋「番号を配る」
- **deal**: 「◯人目の人にスマホを渡してください」→ 長押し中のみ自分の番号を表示（離すと隠れる）→「確認した」で次の人へ。全員完了で reveal へ
- **reveal** 2段階:
    1. お題カード表示。スキップ可（残り回数バッジ、0で無効化）
    2. 「運命のボタン」→ `DrumrollReveal`（既存 `drumroll`/`reveal` 効果音）→「◯番！」発表。発表後はスキップ不可
- **done**: 「◯番の人は名乗り出てお題を実行！」→「次のラウンド（番号を配り直す）」で deal（round+1）。終了はヘッダー戻る

## ファイル構成

```
src/games/no-king-game/
  engine.ts            // 純関数: 番号順列生成、お題抽選＋{B}置換、スキップ判定
  reducer.ts           // State / Action / reducer
  no-king-game.tsx     // 本体。useReducer + フェーズ切替
  count-select.tsx     // 人数選択＋限定パック行
  deal-pass.tsx        // 端末回し番号確認
  topic-reveal.tsx     // お題表示→ドラムロール発表（done 表示も兼ねる）
  premium-pack-modal.tsx // 解放案内スタブ
  theme.ts             // 王冠ゴールド系配色（registry グラデと統一）
  __tests__/
```

registry.ts: `Component: NoKingGame` 差し替え＋ `catchCopy` / `summary` / `howToPlay` 更新。

## 状態設計

```ts
type Phase = 'count' | 'deal' | 'reveal' | 'done'
type State = {
	phase: Phase
	playerCount: number // 3..12
	numbers: number[] // 席順 index → 割当番号（1..N のシャッフル順列）
	dealIndex: number // 端末回しで何人目か（0起点）
	round: number // 1起点
	topicId: string | null
	topicText: string // {B} 置換済み
	executorNumber: number
	usedTopicIds: string[]
	skipsLeft: number // 初期 2
	revealed: boolean
}
```

- お題と実行役は deal 完了 → reveal 突入時に抽選（`pickTopic('king', usedTopicIds)`）
- `{B}` は実行役番号を除いた 1..N からランダム置換（minPlayers=3 のため候補は必ずある）
- スキップ時は現お題を `usedTopicIds` に積んで引き直し、`skipsLeft` 減算

## エッジケース

| ケース                        | 対応                                            |
| ----------------------------- | ----------------------------------------------- |
| お題プール枯渇                | `usedTopicIds` をリセットして再抽選（重複許容） |
| topics が空（初回オフライン） | 内蔵フォールバックお題10件で動作                |
| スキップ残0                   | ボタン無効化＋グレーアウト                      |
| 覗き見防止                    | 番号は長押し中のみ表示                          |
| 発表後のスキップ              | `revealed` 後はスキップ UI 非表示               |

## テスト方針

- engine: `dealNumbers(n)` が 1..n の順列 / `{B}` 置換が実行役以外 / 枯渇リセット / スキップ減算
- reducer: count→deal→reveal→done→deal(round+1) 遷移、発表後スキップ不可
- コンポーネント: 発表フローのスモークテスト（既存パターン踏襲）
