# リアクション神経衰弱（G8 / #16）設計

2026-07-10 確定。ブレインストーミングでの決定事項と設計をまとめる。

## 決定事項

- **盤面は 4×4 = 16枚固定**: 7ペア（14枚）＋ジョーカー1枚＋ラッキーカード1枚。Issue 原案の「8ペア＋ジョーカー1枚」は枚数が合わないため本構成に調整
- **手番は1人1ターン固定**: 揃っても揃わなくても次の人へ（#67 飲みゲー衰弱と同方式）。参加 2〜12 人、`requiresPlayers: true`
- **ペア成立時は参加者全員からルーレットで罰対象者を1人抽選**（成立させた本人も含む）。同時に罰お題も発表。ペアは成立させた人のスコアに加算
- **ジョーカー1枚**: めくった瞬間ゲーム終了、めくった人が即負け → リザルトへ
- **ラッキーカード1枚**: めくった人に「罰免除パス」を1個付与して場から除外。めくり枚数にはカウントせず手番続行。以降その人がルーレットで当選したら自動でパス消費 → 本人を除いて再抽選
- **罰お題はアプリが表示**: topics-store の新パック `batsu`（Supabase 配信・全年齢向けの無難なお題）＋コード内フォールバック（王様のいない王様ゲームと同パターン）
- **カード表面は絵文字シンボル**（トランプではない）: #67 飲みゲー衰弱（トランプ風・罰テキスト印刷）との差別化
- **実装アプローチ**: 純粋エンジン＋reducer 方式（きまぐれ◯× / 王様のいない王様ゲーム 準拠）

## 画面フロー

```
play（盤面・手番回し）→ ペア成立 → roulette（全員ルーレット演出）
                                      → punish（対象者＋罰お題の発表オーバーレイ）→ play
        └→ ジョーカー → result（即負け）
        └→ 全7ペア消化 → result（ランキング）
```

- **play**: 4×4 グリッド＋ヘッダーに「◯◯さんの番」（プレイヤーカラー）。1人2枚（絵柄カード）めくる
    - めくり: カードフリップアニメ。アニメ完了まで次のタップは無視
    - 不成立: 2枚を約1.5秒見せて自動で裏返し、次の人へ
    - 成立: 2枚を `removed` にして roulette へ
    - ラッキー: 発動カットイン（パス付与）→ 場から除外 → そのまま手番続行（めくり枚数にカウントしない）
    - ジョーカー: 即 result へ（1枚目でも2枚目でも同じ）
- **roulette**: プレイヤーカラーのセグメントを高速ハイライト → 減速 → 停止する名前ルーレット演出（drumroll-loop Lottie / 共通 drumroll 部品を流用）。停止した人が罰対象
    - 対象がパス保持者なら「免除パス発動！」演出 → パス消費 → 本人を除いて再抽選
- **punish**: 「◯◯さんが罰！」＋罰お題をドン！と発表（効果音＋バイブ）→「実行した！」タップで play に戻り次の人へ。罰回数をカウント
- **result**:
    - 全ペア消化: 獲得ペア数ランキング（同数は同順位）＋各自の罰回数表示＋「もう一回」
    - ジョーカー終了: 「◯◯さん、ジョーカーで即負け！」ハイライト＋その時点のペアランキング

## カードデザイン

- 表面: ネオン調の絵文字シンボル7種（🎤🎲🌶️💃🎯⚡🍀 など、実装時に調整可）。ペア＝同一シンボル2枚。罰テキストはカードに載せない
- ジョーカー: 「JOKER」表記＋紫×赤の禍々しいデザイン
- ラッキー: ゴールドの星デザイン（★ LUCKY）
- 裏面: WaiPa ネオン柄（ダークネイビー地×ピンク紫グラデ）

## ファイル構成

```
src/games/reaction-pairs/
  engine.ts             // 純関数: デッキ生成（7ペア＋J＋L シャッフル）、マッチ判定、罰対象抽選
  reducer.ts            // State / Action / reducer
  topics.ts             // batsu フォールバックお題（20個目安）
  reaction-pairs-game.tsx // 本体。useReducer + フェーズ切替
  card-grid.tsx         // 盤面グリッド＋フリップアニメ
  player-roulette.tsx   // 全員ルーレット演出
  punish-reveal.tsx     // 罰発表オーバーレイ
  result-screen.tsx     // リザルト（ランキング / 即負け）
  theme.ts              // 配色（registry グラデ #26DE81→#20BF6B と統一）
  __tests__/
```

registry.ts: 既存エントリ `id: 'reaction-pairs'` の `Component` を差し替え（ComingSoonGame → ReactionPairsGame）。`minPlayers: 2` / `maxPlayers: 12` は既存値を維持し、`requiresPlayers: true` を追加。howToPlay 文言はルール確定版に更新。

## 状態設計

```ts
type Card = {
	id: string // 'p3-a' | 'p3-b' | 'joker' | 'lucky'
	kind: 'pair' | 'joker' | 'lucky'
	pairId: string | null // pair 以外は null
	symbol: string // 絵文字。joker / lucky は専用表示
	state: 'hidden' | 'revealed' | 'removed'
}
type Phase = 'play' | 'roulette' | 'punish' | 'result'
type State = {
	phase: Phase
	cards: Card[]
	turnIndex: number // 参加プレイヤー index（周回）
	flippedIds: string[] // 今ターンめくった絵柄カード（0..2枚。lucky はカウントしない）
	scores: number[] // player index → 獲得ペア数
	punishCounts: number[] // player index → 罰を受けた回数
	passHolder: number | null // 罰免除パス保持者（ラッキーは1枚なので単一）
	roulette: { firstIndex: number; finalIndex: number; passConsumed: boolean } | null
	punish: { playerIndex: number; topicText: string } | null
	loserIndex: number | null // ジョーカー即負けの人（通常終了は null）
	usedTopicIds: string[] // 同一プレイ中のお題重複回避
}
```

- 抽選は engine の純関数 `pickPunishTarget(playerCount, passHolder, rng)` → `{ firstIndex, finalIndex, passConsumed }`。パス保持者が当選したときのみ `finalIndex` が本人を除いた再抽選結果になる
- 罰お題は `pickTopic('batsu', usedTopicIds)`（topics-store 既存 API）。パック未取得時は `topics.ts` のフォールバックから抽選

## エッジケース

| ケース                               | 対応                                                            |
| ------------------------------------ | --------------------------------------------------------------- |
| 同ターンに同じカードを再タップ       | 無効（`flippedIds` 済み・`revealed`/`removed` はタップ不可）    |
| ジョーカーが1枚目 / 2枚目            | どちらも即 result。1枚目で表になっていた絵柄カードはそのまま    |
| ラッキーが1枚目 / 2枚目              | どちらも即発動・除外・手番続行。絵柄めくりは常に最大2枚         |
| roulette / punish 表示中の盤面タップ | オーバーレイでブロック                                          |
| パス保持者がルーレット当選           | 自動でパス消費 → 本人除外で再抽選（2人プレイならもう1人に確定） |
| パス保持者本人がペア成立させた場合   | 通常どおり全員抽選 → 本人当選ならパス消費・再抽選               |
| お題プール枯渇（罰7回 > プール数）   | フォールバック20個 ≥ 最大7回なので枯渇しない設計を維持          |
| アニメ中の連打                       | フリップ完了まで次のタップを無視                                |

## テスト方針

- engine: デッキ生成（16枚・7ペア・J1・L1・シンボル重複なし・シャッフル）、マッチ判定、`pickPunishTarget`（全員対象 / パス保持者除外の再抽選 / 2人プレイ境界）
- reducer: play→roulette→punish→play 遷移、ジョーカー即 result、ラッキー付与と手番続行、パス自動消費、手番周回、scores / punishCounts 加算、全消化→result
- コンポーネント: フリップ→ルーレット→罰発表のスモークテスト。React 19 の await act 規約に従う（kimagure-ox が参照実装）

## 収益・リリース面

- 無料ゲーム（MVP 8ゲームの1つ）。お題は全年齢向けの無難な内容にし、レーティングへの影響なし
- `batsu` パックは Supabase topics テーブルにシード（`is_premium: false`）。プレミアム向け過激お題パックは将来の別 Issue
