# バーストチキン（G11 / #61）設計

2026-07-11 確定。ブレインストーミングでの決定事項と設計をまとめる。

## 決定事項

- **プレミアム限定（全体ロック）**: 2026-07-11 の方針決定によりポストMVP ゲームは全て有料枠。本ゲームが**有料枠の第1号**として、`GameMeta.premium` フラグ・ロック中カード表示・共通ロックモーダル・解放判定スタブを初導入する（#58〜#67 が再利用）
- **プレイヤー登録あり**（`requiresPlayers: true`、2〜12人）: 貢献ポイントの精算・敗者発表に名前とプレイヤーカラーを使う。手番順＝登録順
- **タイ精算はタイ全員負け**: ストップ精算で貢献ポイント最少が複数人タイなら、タイ全員が負け（＝全員飲む）。宣言者がタイを含む最少なら宣言者の単独負け
- **合計 = L ちょうどはセーフ**: バーストは「積んだ瞬間に合計が L を超えた」場合のみ
- **実装アプローチ**: 純関数 reducer エンジン（State + Action → State）＋薄いコンポーネント。#67 飲酒衰弱の設計と同方式。境界値を全てユニットテストで押さえる

## ルール確定版

- 開始時に秘密の上限 **L を 21〜30 の整数**から一様ランダムで決定。画面には「上限は 21〜30 のどこか…」とだけ表示
- 手番で `+1 / +2 / +3` から選んで合計に積む。**合計は常時公開**、各自の累計貢献ポイントは精算まで非公開
- 積んだ瞬間に合計が L を超えたらその人が**バースト負け**で即終了
- 合計 **15 以上でストップ解禁**。手番の人は積む代わりにストップ宣言できる
- ストップ精算: 全員の貢献ポイントを公開し、**最少が負け**。宣言者がタイを含む最少→宣言者の単独負け、宣言者以外のタイ→タイ全員負け
- リザルトで L の答え合わせ＋全員の貢献ポイントを公開
- もう一回: 新しい L・貢献リセット・開始プレイヤーを1つローテーション
- 定数（`LIMIT_MIN=21` / `LIMIT_MAX=30` / `STOP_UNLOCK=15`）は engine.ts に集約し、プレイテストで調整可能にする

## 画面フロー

```
イントロ（既存 game-intro-screen）→ playing（手番表示＋合計＋ +1/+2/+3 ／ストップ）
   ├─ バースト → exploded（explosion.json＋強バイブ＋赤フラッシュ→敗者ドン）─┐
   └─ ストップ → settled（ドラムロール→全員の貢献公開→敗者ドン）─────────┤
                                                                              ↓
                 リザルト（両ルート共通: L 答え合わせ＋貢献ランキング）→「もう一回」/「ホームへ」
```

- **playing**: 合計を画面中央に大きく表示。手番プレイヤーをプレイヤーカラー付きで表示。合計 15 以上で「ストップ宣言」ボタンが出現
- **緊張演出**: 合計が上限帯（21〜30）に近づくほど画面の赤みが増し、積むたびのチクタク音＋バイブ強度が上がる（bomb-relay の加速カーブと同型の考え方を「時間」でなく「合計値」に適用。`tension.ts` の純関数で算出）
- **exploded**: explosion.json（Lottie）＋ `explosion` 音＋強バイブ＋赤フラッシュ → 敗者宣言
- **settled**: drumroll-reveal で貢献ポイント公開 → 敗者ドン
- 演出資産は既存流用: explosion.json / drumroll-reveal / result-overlay / haptics・playSound ヘルパー

## プレミアムゲート（初導入・共通部品）

1. **`GameMeta.premium?: boolean`**（registry.ts）: プレミアム限定ゲーム（全体ロック）の宣言
2. **解放判定スタブ `src/lib/premium.ts`**: `isPremiumUnlocked(): boolean` → `__DEV__` を返す。RevenueCat (#7) 結線はこの1関数に集約
3. **ロック中カード表示**（game-card.tsx）: `premium && !isPremiumUnlocked()` のとき、サムネイル全体に薄い黒マスク（`rgba` 黒 0.55 程度）＋中央に「👑 プレミアム」ピルバッジ。cardThumbnail 画像・グラデフォールバック両対応。解放後はマスクなしの通常表示
4. **共通ロックモーダル `src/components/home/premium-lock-modal.tsx`**: 「👑 このゲームは WaiPa プレミアムで遊べます」＋「近日対応予定」バッジ＋とじる（no-king-game の PremiumPackModal と同パターン）。#7 でアップグレード導線をここに結線
5. **タップ分岐**（ホームのカード onPress）: ロック中はモーダル表示、解放時は従来どおりイントロへ遷移。ゲート判定はホーム入口の1箇所のみ（現行ルート構成に直接遷移経路がないため。YAGNI）

動作まとめ: 開発ビルド＝素通りでプレイ可 / 本番ビルド＝#7 結線まで全ユーザーにロック表示（アプリ未リリースのため実害なし）。

## ファイル構成

```
src/games/burst-chicken/
  engine.ts               // 純関数 reducer: createInitialState(players, rng) / reduce(state, action)
  burst-chicken-game.tsx  // 表示と演出のみ。useReducer で engine を駆動
  tension.ts              // 緊張演出の純関数: 合計値 → 赤み強度・チクタク音程/バイブ強度
  theme.ts                // オレンジ〜赤系（registry グラデと統一）
  __tests__/
src/lib/premium.ts                          // isPremiumUnlocked() スタブ
src/components/home/premium-lock-modal.tsx  // 共通ロックモーダル
```

registry.ts: 新規エントリ `id: 'burst-chicken'` を追加（`premium: true` / `requiresPlayers: true` / `minPlayers: 2` / `maxPlayers: 12` / 絵文字 🐔 / オレンジ〜赤系グラデ）。catchCopy / summary / howToPlay もここで確定する。

## エンジン仕様（骨子）

```ts
export const LIMIT_MIN = 21
export const LIMIT_MAX = 30
export const STOP_UNLOCK = 15

type Phase = 'playing' | 'exploded' | 'settled'
type Action =
	| { type: 'add'; amount: 1 | 2 | 3 }
	| { type: 'stop' }
	| { type: 'restart'; rng: Rng }

type State = {
	phase: Phase
	limit: number            // 秘密の上限 L（UI には出さない）
	total: number
	turnIndex: number        // players 配列への index
	startIndex: number       // このラウンドの開始プレイヤー（restart でローテーション）
	contributions: number[]  // players と同順の累計貢献ポイント
	losers: number[]         // 敗者の index（バースト1人 or 精算の1人以上）
}
```

- `reduce` が手番送り・バースト判定・ストップ精算・`restart`（新 L＋`startIndex` を +1 ローテーション）まで全て担当
- 不正 action（解禁前の `stop`、終了後の `add` 等）は state をそのまま返す（UI 側でもボタン非表示にする二重ガード）
- 乱数は `Rng`（`() => number`）注入でテスト可能にする（bomb-relay と同パターン）

## エッジケース

| ケース                         | 対応                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| 合計 = L ちょうど              | セーフ（超過のみバースト）                                           |
| 解禁前のストップ宣言           | reducer が無視＋UI はボタン非表示（二重ガード）                      |
| 精算タイ（宣言者含む）         | 宣言者の単独負け                                                     |
| 精算タイ（宣言者以外）         | タイ全員負け                                                         |
| 誰もストップしない             | 合計は必ず L（≤30）超過に到達するため自然終了（無限ループなし）      |
| 爆発/精算演出中の連打          | オーバーレイでブロック                                               |
| 音 OFF 設定                    | 既存 settings 経由（playSound / haptics が各自ガード）               |
| unmount（戻る・ホームへ）      | 演出タイマーを全て clear                                             |
| 開発ビルドのプレミアム判定     | `isPremiumUnlocked()` が true → ロックなしでプレイ可                 |

## テスト方針

- **engine**: L の範囲（21〜30 の整数・境界含む）、合計=L セーフ／L+1 バースト、ストップ解禁境界（14 不可・15 可）、精算全パターン（単独最少・宣言者タイ・他者タイ全員負け）、restart のローテーション・リセット、不正 action の無視
- **tension**: 赤み強度が合計に対して単調増加・0〜1 クランプ
- **コンポーネント**: +1/+2/+3 タップ→合計更新と手番送り、バースト→爆発オーバーレイ→敗者表示、ストップ→精算→敗者表示、もう一回→新ラウンド。React 19 の await act 規約（kimagure-ox 参照実装）準拠
- **premium**: game-card のロック中マスク＋バッジ表示／解放時の通常表示、ロック中タップでモーダル・解放時は遷移

## 収録・リリース面

- プレミアム限定ゲーム第1号（ポストMVP）。Supabase のお題配信は不要（お題なしゲーム）
- サムネイル画像（intro / card）は後日ユーザー支給。それまでは絵文字＋グラデフォールバック
- CLAUDE.md の収録ゲーム候補にバーストチキンを追記する
- 数値バランス（L 範囲・ストップ解禁値）はプレイテストで調整可（engine.ts の定数を変更するだけ）
