# ダウトダイス（G9 / #58・プレミアム）設計

2026-07-11 確定。ブレインストーミングでの決定事項と設計をまとめる。

## 決定事項

- **プレミアム限定ゲーム（全体ロック）**: 課金ゲートは **#61 バーストチキンのスペック（`2026-07-11-burst-chicken-design.md`「プレミアムゲート」節・feature/61-burst-chicken ブランチで並行作業中）に完全準拠**した共通部品を使う。#61 側が先に develop へ入れば流用、本ブランチが先行する場合は同一仕様で実装し後発側が流用する
- **サイコロは 3D（チンチロ資産流用）**: `chinchiro/dice-3d-math.ts` の純関数（FACE_NORMALS / finalPose / tumbleProgress 等）と RoundedBox 描画手法を流用し、**2個用の `dice-roll-3d.tsx` を新設**。丼・ションベン等チンチロ固有要素は持ち込まない
- **宣言は強い順リストから選択**: 全21役を強い順に並べ、直前の宣言以下は非活性。ルール違反が構造上起きず、初見でも序列が覚えられる
- **ダウト解決後はライフを失った人から再開**（マイヤー標準）。宣言はリセットされ任意の役から
- **シェイク検出のため expo-sensors を新規追加**（Accelerometer）。`use-shake.ts` フックに隔離し、タップロールを常設フォールバックにする（Web / シミュレータ / センサー拒否でも完全動作）
- **実装アプローチ**: 純粋エンジン＋reducer 方式（きまぐれ◯× / リアクション神経衰弱 準拠）
- ライフ3・参加 3〜8人・`requiresPlayers: true`（ライフ表を名前＋プレイヤーカラーで表示）

## ルール（役の序列）

出目2つを「大きい方が十の位」の2桁で読む（3と5 → 53）。宣言可能な役は全21種、強い順に:

1. **21（ミエ）** — 最強。宣言されたら次の人は必ずダウト（それ以上の宣言が存在しない）
2. **ゾロ目**: 66 > 55 > 44 > 33 > 22 > 11（6役）
3. **通常目**: 65 > 64 > 63 > 62 > 61 > 54 > 53 > 52 > 51 > 43 > 42 > 41 > 32 > 31（14役）

宣言は直前の宣言より**厳密に強い**役のみ（ラウンド最初の宣言は任意）。実際の出目と違ってよい（ブラフ）。

## 1ターンの流れ（フェーズ）

```
roll（シェイク or タップ → 3D転がり・出目は伏せ表示）
 → peek（長押しで自分だけ出目確認・何度でも。no-king-game deal-pass と同パターン）
 → declare（強い順リストから選択・直前以下は非活性）
 → handover（「◯◯さんへ渡して」全画面）
 → respond（次の人:「ダウト！」or「信じて振る」。直前宣言が 21 なら「ダウト！」のみ表示）
     ├ 信じて振る → その人の roll へ
     └ ダウト → reveal（ドラムロール → 3Dダイスを表向きで公開 → 判定発表）
         宣言 > 実出目（嘘）→ 宣言者がライフ-1 ／ 宣言 ≤ 実出目（本当）→ ダウト側がライフ-1
         ├ ライフ0 の人が出た → result（その人が敗者＝飲む）
         └ 続行 → ライフを失った人から宣言リセットで新ラウンド（handover を挟む）
```

- 判定基準: 「宣言が本当」とは **実出目の役が宣言と同じか強い**こと（マイヤー準拠。宣言以上が出ていればセーフ）
- reveal 演出は共通 `useDrumroll` / `DrumrollReveal` の流儀（ドラムロール→ドン）に合わせる
- result: 敗者ハイライト＋ライフ残数一覧＋「もう一回」（ライフ全回復・敗者が先手）／「ホームへ」

## 課金ゲート（#61 バーストチキン設計に準拠・共通部品）

`2026-07-11-burst-chicken-design.md`（feature/61-burst-chicken）の「プレミアムゲート」節と同一仕様。要点の再掲:

1. `GameMeta.premium?: boolean`（registry.ts）
2. 解放判定スタブ `src/lib/premium.ts`: **`isPremiumUnlocked(): boolean`** → `__DEV__` を返す。RevenueCat（#収益2）結線はこの1関数に集約
3. ロック中カード表示（game-card.tsx）: `premium && !isPremiumUnlocked()` のときサムネイル全体に薄い黒マスク（rgba 黒 0.55 程度）＋中央に「👑 プレミアム」ピルバッジ。cardThumbnail 画像・グラデフォールバック両対応。解放後はマスクなしの通常表示
4. 共通ロックモーダル `src/components/home/premium-lock-modal.tsx`: 「👑 このゲームは WaiPa プレミアムで遊べます」＋「近日対応予定」バッジ＋とじる（no-king-game の PremiumPackModal と同パターン）。#収益2 でアップグレード導線をここに結線
5. タップ分岐はホームのカード onPress の1箇所のみ: ロック中はモーダル表示、解放時は従来どおりイントロへ遷移

動作: 開発ビルド＝素通りでプレイ可 / 本番ビルド＝#収益2 結線まで全ユーザーにロック表示。**プラン作成時に develop / #61 ブランチの実装状況を確認し、ゲート部品が既に存在すればゲートのタスクを丸ごと省略して流用する**

## ファイル構成

```
src/games/daut-dice/
  engine.ts          // 純関数: rank / isStrongerThan / validDeclarations / rollDice / DECLARATIONS
  reducer.ts         // Phase / lives / turnIndex / prevDeclaration / actualRoll / reveal 結果
  use-shake.ts       // Accelerometer シェイク検出（閾値＋クールダウン）。センサー不可なら何もしない
  dice-roll-3d.tsx   // 2個用 3D 転がり（dice-3d-math 流用・伏せ/公開の切替可）
  daut-dice-game.tsx // 本体。useReducer + フェーズ切替
  declare-list.tsx   // 強い順リスト（非活性制御・スクロール）
  respond-screen.tsx // ダウト / 信じて振る（21 はダウトのみ）
  reveal-overlay.tsx // ドラムロール → 出目公開 → ライフ-1 発表
  lives-bar.tsx      // 全員のライフ表示（プレイヤーカラー・現在手番ハイライト）
  result-screen.tsx  // 敗者発表＋もう一回
  theme.ts           // 配色（registry グラデと統一）
  __tests__/
src/lib/premium.ts
src/components/home/premium-lock-modal.tsx（#61 と共通・存在すれば流用）
```

- registry.ts: `id: 'daut-dice'`, `title: 'ダウトダイス'`, `minPlayers: 3`, `maxPlayers: 8`, `requiresPlayers: true`, `premium: true` で**新規追加**（既存エントリの差し替えではない）。howToPlay 文言はルール確定版
- CLAUDE.md の「収録ゲーム候補」にダウトダイスを追記（Issue AC）

## 状態設計

```ts
type Phase = 'roll' | 'peek' | 'declare' | 'handover' | 'respond' | 'reveal' | 'result'
type State = {
	phase: Phase
	playerCount: number
	lives: number[] // player index → 残ライフ（初期3）
	turnIndex: number // いま宣言する（or ロールする）人
	prevDeclaration: number | null // 直前の宣言値（ラウンド開始時 null）
	prevDeclarerIndex: number | null // 直前に宣言した人（ダウト時のライフ判定対象）
	actualRoll: { d1: number; d2: number } | null // 直前宣言者の実出目（伏せ）
	reveal: { wasBluff: boolean; loserIndex: number } | null
	loserIndex: number | null // ライフ0 になった敗者（result 用）
}
```

- 乱数（`rollDice(rng)`）・センサーは境界から注入。reducer は純関数
- respond の主体は `turnIndex`（信じて振るを選んだ時点でその人がロールする）
- ゾロ目/21/通常目の `rank` は単一の全順序関数として実装（比較は数値比較のみで済ませる）

## エッジケース

| ケース                        | 対応                                                                     |
| ----------------------------- | ------------------------------------------------------------------------ |
| 直前宣言が 66（21のみ宣言可） | declare リストは 21 だけ活性。宣言後の respond はダウトのみ              |
| 直前宣言が 21                 | respond は「ダウト！」ボタンのみ表示（強制ダウト）                       |
| ラウンド最初の宣言            | prevDeclaration=null → 全21役が活性                                      |
| 「本当」の境界                | 実出目 ＝ 宣言ちょうど → セーフ（ダウト側が-1）。実出目 > 宣言 もセーフ  |
| シェイク多重検出              | クールダウン（roll 確定後はフック停止）。roll フェーズ以外では購読しない |
| センサー不可（Web 等）        | use-shake が何もしない → タップボタンで完全動作                          |
| peek の覗き見                 | 長押し中のみ表示（離すと即隠す）                                         |
| reveal 中の連打               | オーバーレイでブロック                                                   |
| もう一回                      | ライフ全回復・宣言リセット・敗者が先手。参加人数は据え置き               |
| 非プレミアムのタップ          | premium-lock-modal 表示のみ（ゲームへ遷移しない）。`__DEV__` は解放      |

## テスト方針

- engine: 序列の境界値（21 > 66、11 > 65、31 が最弱）、`validDeclarations`（null / 中間値 / 66 / 21）、`rollDice` の範囲と正規化（(3,5)→53）
- reducer: roll→peek→declare→handover→respond 遷移、信じる→次の人の roll、ダウト両分岐（嘘/本当・境界の「ちょうど」含む）、21 強制ダウト、ライフ0→result、敗者先手の再開、もう一回リセット
- コンポーネント: declare リストの非活性制御、respond の 21 分岐、reveal のドラムロール→発表（fake timers）、long-press peek、premium ゲート（ロック中カードのマスク＋👑ピル・非プレミアムでロックモーダル・`__DEV__` 解放。#61 側で実装済みならテストも流用）。use-shake はモック（実機センサーはテスト対象外）
- React 19 規約: `await render` / `await act`。3D（Canvas）はチンチロのテストと同じくモック方針を踏襲

## 収録・リリース面

- **プレミアム限定**（ポストMVP 有料枠の第1号）。露出はホームカードの 👑 のみで訴求材料を兼ねる
- 「飲む」文言はリザルトの敗者発表で使う場合、表現をマイルドに（「負け！」主体）し、レーティングへの影響を避ける（お酒の直接表現は入れない）
- expo-sensors の追加はネイティブ再ビルド不要（Expo Go / dev client で動作確認可能な managed 依存）
- サムネイル（intro/card）は他ゲーム同様ユーザーの生成フローで後日（#75 と同枠の扱い）
