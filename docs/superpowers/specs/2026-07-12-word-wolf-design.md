# ワードウルフ（G10 / #59・プレミアム目玉）設計

2026-07-12 確定。ブレインストーミングでの決定事項と設計をまとめる。

## 決定事項

- **プレミアム限定ゲーム（全体ロック）**: burst-chicken / daut-dice で確立済みの共通ゲート（`GameMeta.premium` ＋ `isPremiumUnlocked()` ＋ premium-lock-modal）をそのまま流用。新規実装なし
- **ウルフ本人にも正体を通知しない（定番ルール）**: 全員「自分のお題」だけを見る。自分が少数派かは議論で探る
- **逆転チャンスあり**: 吊られたのがウルフだった場合、ウルフが市民のお題を口頭で宣言 → 市民お題を公開 → 全員で「当てた！/外した」をタップ判定。当てたらウルフの逆転勝ち
- **同票は「再議論 → 再投票」で決着まで繰り返す**: 決選投票（候補＝最多同票者、投票者＝候補以外の全員）でも同票なら 1 分の再議論を挟んで再投票
- **お題ペアは新テーブル `word_pairs` で配信**: 既存 `topics`（単文お題）とは分離。当面は全パック `is_premium=false` で seed し anon 読み取り可（ゲーム自体がプレミアムロックのため実質プレミアム）。#収益2 完了後に追加パックを `is_premium=true` で配信し RLS 経路を締める
- **実装アプローチ**: 純粋エンジン＋reducer 方式（daut-dice / きまぐれ◯× 準拠）
- 参加 3〜12人・`requiresPlayers: true`（投票UIに名前とプレイヤーカラーが必要）
- ウルフは基本 1 人。**7 人以上のときだけ開始設定に「ウルフ 2 人」トグル**を表示

## ルール確定版

- 全員に同系統のお題が配られるが、ウルフ（少数派）だけ微妙に違うお題（例: 多数派「ラーメン」/ ウルフ「うどん」）
- 議論で多数派を探り、投票で最多票の人の正体を公開
    - 吊った人が**ウルフ → 市民の勝ち**（ただし逆転チャンスへ）
    - 吊った人が**市民 → ウルフの勝ち**
    - ウルフ 2 人設定でも **1 人吊れた時点で市民勝ち**（連続処刑はしない・シンプル優先）
- 議論タイマーは 1 / 3 / 5 分から開始設定で選択

## ゲームフロー（フェーズ）

```
setup（ウルフ数・議論時間・お題パック選択）
 → deal（1台回し・長押しで自分のお題確認。no-king-game deal-pass と同パターン）
 → discuss（タイマー。残り10秒でチクタク加速。全員合意で早期スキップ可）
 → vote（1台回しで各自1票。自分には投票不可。確定タップで即次の人へ＝秘匿）
 → tally（開票）
     ├ 最多票が1人 → reveal
     └ 同票 → runoff（決選投票: 候補＝同票トップ、投票者＝候補以外の全員）
         └ それでも同票 → runoff-discuss（1分の再議論）→ runoff を決着まで繰り返す
 → reveal（ドラムロール → 最多票者の正体ドン！ useDrumroll / DrumrollReveal の流儀）
     ├ 市民だった → result（ウルフの勝ち。ウルフの正体とお題ペアを公開）
     └ ウルフだった → reversal
 → reversal（逆転チャンス:「ウルフは市民のお題を口頭で宣言してから開けよう」
     → 市民お題を公開 → 全員相談で「当てた！/外した」をタップ）
     ├ 当てた → result（ウルフの逆転勝ち）
     └ 外した → result（市民の勝ち）
 → result（勝敗発表＋お題ペア公開＋「もう一回」（新お題・新ウルフ・同メンバー）／「ホームへ」）
```

- deal の並び順はプレイヤー登録順。ウルフ割当・お題スワップは deal 開始時に一括確定
- vote は「◯◯さんの番」ハンドオーバー画面 → プレイヤーカラーのリストから 1 人選択（自分は非活性）→ 確定で即ハンドオーバー画面に戻る（覗き見不可、daut-dice の秘匿パターン）
- runoff の投票者が 0 人になるケース（全員が同票＝候補が全員）は、通常投票と同じ「全員が自分以外に投票」へフォールバックして再投票

## データモデル（Supabase）

新テーブル `word_pairs`（マイグレーション追加）:

```sql
create table if not exists public.word_pairs (
  id uuid primary key default gen_random_uuid(),
  pack text not null,              -- 'food' | 'place' | 'aruaru' | 'adult' ...
  word_a text not null,
  word_b text not null,
  is_premium boolean not null default false,
  locale text not null default 'ja',
  created_at timestamptz not null default now()
);
```

- インデックス・RLS は `topics` と同型（`is_premium = false` のみ anon/authenticated select 可、書き込み不可）
- **どちらが多数派かはテーブルでは決めない**。割当時に 50/50 でスワップ（word_a 固定だと常連にバレるため）
- 初期パック（seed マイグレーション）: 「たべもの」「ばしょ」「あるある」「おとなの夜」各 20 ペア程度、全て `is_premium=false`
- クライアントは `src/lib/word-pairs-store.ts` を新設。`topics-store.ts` と同パターン（hydrate / refresh / pickPair、キャッシュキー `waipa.word_pairs.v1`、取得失敗時はキャッシュ温存）
- オフライン初回（キャッシュも空）用に engine 側へ `FALLBACK_PAIRS`（各パック数ペア）を同梱（no-king-game の FALLBACK_TOPICS と同パターン）。「もう一回」の連戦では使用済みペア ID を除外し、枯れたらリセット

## ファイル構成

```
src/games/word-wolf/
  engine.ts           // 純関数: assignRoles / swapWords / tallyVotes / judgeResult / FALLBACK_PAIRS
  reducer.ts          // Phase 状態機械（setup〜result）
  setup-screen.tsx    // ウルフ数・議論時間・パック選択
  deal-pass.tsx       // 1台回し配布（長押し確認。no-king-game 流用パターン）
  discuss-screen.tsx  // 議論タイマー（円形カウントダウン・チクタク加速）
  vote-screen.tsx     // 投票（ハンドオーバー＋プレイヤーリスト）
  reveal-overlay.tsx  // ドラムロール → 正体発表
  reversal-screen.tsx // 逆転チャンス（市民お題公開 → 当てた/外した判定）
  result-screen.tsx   // 勝敗発表＋お題ペア公開＋もう一回
  theme.ts            // 配色（registry グラデと統一）
  __tests__/
src/lib/word-pairs-store.ts
supabase/migrations/0004_create_word_pairs.sql
supabase/migrations/0005_seed_word_pairs.sql
```

- registry.ts: `id: 'word-wolf'`, `title: 'ワードウルフ'`, 絵文字 🐺, `minPlayers: 3`, `maxPlayers: 12`, `requiresPlayers: true`, `premium: true` で新規追加。howToPlay 文言はルール確定版から
- CLAUDE.md の「収録ゲーム候補」にワードウルフを追記（Issue AC）

## 状態設計

```ts
type Phase =
	'setup' | 'deal' | 'discuss' | 'vote' | 'runoff-discuss' | 'reveal' | 'reversal' | 'result'
type State = {
	phase: Phase
	playerCount: number
	wolfCount: 1 | 2
	discussSeconds: 60 | 180 | 300
	pack: string
	pair: { majority: string; wolf: string } | null // スワップ済み
	wolfIndices: number[] // 誰にも表示しない内部状態
	dealIndex: number // 配布中の手番
	votes: (number | null)[] // voterIndex → 投票先（未投票は null）
	voteCandidates: number[] | null // 決選投票の候補（通常投票時は null）
	voterQueue: number[] // 今回の投票で投票する人の順
	eliminatedIndex: number | null // 最多票で吊られた人
	outcome: 'citizens' | 'wolf' | 'wolf-reversal' | null
	usedPairIds: string[] // 連戦の重複出題防止
}
```

- 乱数（ウルフ割当・スワップ・ペア抽選）は境界から注入。reducer は純関数
- フロー図の「tally」「runoff」は独立フェーズではない: 開票は最後の 1 票が入った時点で reducer 内で即時解決し、決選投票は `voteCandidates` をセットした `'vote'` フェーズとして表現する（`null` なら通常投票）
- `judgeResult`: eliminated が wolfIndices に含まれる → 市民勝ち（→ reversal へ）。含まれない → ウルフ勝ち

## エッジケース

| ケース                                | 対応                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| 3人プレイの決選投票（候補2・投票者1） | その1人の票で決着（仕様どおり）                                                   |
| 全員同票（候補＝全員）                | 再議論 → 全員参加の通常投票にフォールバック                                       |
| ウルフ2人が同票トップ                 | どちらを吊ってもウルフ → 通常の決選投票で1人に絞る                                |
| 6人以下でウルフ2人                    | setup にトグル自体を出さない（7人以上のみ）                                       |
| 議論の早期終了                        | 「投票へすすむ」ボタン（誤タップ防止に確認ダイアログ）                            |
| deal 前の覗き見                       | 長押し中のみ表示・離すと即隠す（no-king-game 準拠）                               |
| 投票画面の覗き見                      | 確定タップで即ハンドオーバー画面へ。戻る操作でも投票内容は再表示しない            |
| お題プールが空（オフライン初回）      | FALLBACK_PAIRS で開始（プレイは常に可能）                                         |
| 連戦でペアが枯れる                    | usedPairIds をリセットして再抽選                                                  |
| reversal の判定                       | 全員相談して代表が1タップ（アプリは正誤判定しない。表記ゆれを機械判定しないため） |
| 非プレミアムのタップ                  | premium-lock-modal 表示のみ。`__DEV__` は解放                                     |

## テスト方針

- engine: `assignRoles`（ウルフ数どおり・重複なし・全 index が候補になり得る）、`swapWords`（50/50・majority と wolf が入れ替わるだけ）、`tallyVotes`（最多票・同票検出・決選候補算出）、`judgeResult` 両分岐、FALLBACK_PAIRS のパック網羅
- reducer: setup→deal→discuss→vote→tally の遷移、同票→runoff ループ（再議論を挟む・全員同票フォールバック含む）、reveal→reversal 分岐、reversal 両分岐、もう一回（新お題・新ウルフ・usedPairIds 蓄積）
- word-pairs-store: topics-store のテストと同型（hydrate / refresh 失敗時キャッシュ温存 / pickPair の除外）
- コンポーネント: 長押し前にお題が漏れないこと（deal・vote 双方）、自分への投票が非活性、7人未満でウルフ2トグル非表示、タイマーのチクタク加速（fake timers）、premium ゲート（既存共通部品のテストパターン流用）
- React 19 規約: `await render` / `await act`（kimagure-ox 参照実装）

## 収録・リリース面

- **プレミアムの目玉コンテンツ**（月額 ¥150 の訴求軸）。お題パック配信により「アプリ更新なしで追加」を売りにする
- 「おとなの夜」パックの文言はレーティングに影響しない範囲（下品な直接表現は入れない）
- 「敗者が飲む」文言は使わず「負け！」主体（daut-dice と同方針）
- 議論タイマーのチクタク音は bomb-relay の音資産を共通化して流用（新規音源なし）
- サムネイル（intro/card）は他ゲーム同様、後日ユーザーの生成フローで追加（#75 と同枠）
