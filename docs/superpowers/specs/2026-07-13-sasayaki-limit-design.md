# ささやきリミット（G15 / #65・プレミアム）設計

2026-07-13 確定。ブレインストーミングでの決定事項と設計をまとめる。

## 決定事項

- **計測フロー**: タップでスタート → **3秒固定計測** → 自動終了。期間中のピーク音量（dBFS）が緑ゾーン内なら成功。押し忘れ事故がなく飲み会でテンポが良い
- **マイク層は expo-audio の recorder metering**（案A）: 既存依存 `expo-audio ~57.0.0` のみで完結。`useAudioRecorder` に `isMeteringEnabled: true`、`useAudioRecorderState(recorder, 50)` で dBFS（-160〜0）をポーリング。録音ファイルは一時生成されるが**保存せず停止後に削除**（遊び方モーダルにも「録音は保存されません」を明記）
- **お題（whisper パック）は非プレミアム行として配信**: 既存 `topics` テーブルに `pack='whisper'`・`is_premium=false` で seed。ゲーム自体が premium ゲートで守られるため二重ロック不要（word-wolf と同じ整理）。bomb-relay 方式のローカルフォールバック約20本を同梱
- **サドンデスは極狭ゾーン1発勝負**: 同率最下位者だけで、ラウンド3より狭いゾーンで1人1回発声。失敗者が複数なら決着まで反復、全員成功なら再戦
- **プレミアム限定ゲーム（全体ロック）**: 確立済みの共通ゲート（`GameMeta.premium` ＋ premium-lock-modal）をそのまま流用。新規実装なし
- **実装アプローチ**: 純粋エンジン＋reducer 方式（daut-dice / word-wolf 準拠）
- 参加 2〜12人・`requiresPlayers: true`（スコアボードに名前とプレイヤーカラーが必要）

## ルール確定版

- お題セリフ（例: 「乾杯ーー！」「今日は無礼講だ！」）と音量ゲージ（小さすぎ / 緑ゾーン / 大きすぎ）が表示される
- 順番にセリフを発声。タップでスタートし3秒間計測、ピーク音量が緑ゾーン内なら成功、外れたら失敗
- ラウンドごとに緑ゾーンが狭く・位置がランダムになる（R1→R2→R3）
- 3ラウンド合計の成功数が最少の人が負け。同率最下位が複数ならサドンデス

## ゲームフロー（フェーズ）

```
intro（遊び方・プレミアムゲートは registry 側）
 → permission（マイク権限リクエスト）
     ├ 拒否 → permission-denied 案内画面（Linking.openSettings ボタン、ゲーム続行不可）
     └ 許可 → calibration
 → calibration（3秒間の環境音計測 → ノイズフロア決定。再計測ボタンあり）
 → round r (1..3) × player p:
     speech-intro（お題セリフ＋ゾーン表示、「タップでスタート」）
      → measuring（3秒固定。リアルタイムゲージ＋ピークマーカー）
      → judge（✅緑ゾーン内 / 🔻小さすぎ / 🔺大きすぎ の演出）→ 次の人へ
     ラウンド終了 → round-result（中間スコア表示）
 → result（3ラウンド合計。最少成功数の人が負け）
     ├ 最下位が1人 → 敗者発表ドン！
     └ 同率複数 → sudden-death（極狭ゾーン・対象者のみ1人1回 → 失敗者複数なら反復、全員成功なら再戦）
```

## ゾーン計算・判定（純関数 engine.ts、境界値テスト付き）

- ノイズフロア = キャリブレーション3秒間のサンプル**中央値**（突発音に強い）
- 有効音域 `[floor, ceil]`（dBFS）: `floor = clamp(noiseFloor + 8, -45, -20)`、`ceil = -2`。ゲージ表示はこの範囲を 0〜1 に正規化
- ゾーン幅（有効音域比）: R1 = 40% → R2 = 30% → R3 = 22%、サドンデス = 15%。位置は有効音域内でランダム（範囲からはみ出さない配置）
- `judge(peak, zone)` → `'low' | 'ok' | 'high'`。判定対象は計測3秒間のピーク値のみ。ゾーン端ぴったりは **ok（閉区間）**
- `tallyLosers(scores)` → 最少成功数のプレイヤー ID 配列
- 乱数は注入可能（`rng: () => number`）にしてテスト可能に

## ファイル構成（src/games/sasayaki-limit/）

| ファイル                  | 役割                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `sasayaki-limit-game.tsx` | フェーズ分岐のルート（reducer 方式）。権限リクエスト・permission-denied 案内もここで分岐 |
| `engine.ts`               | ノイズフロア・ゾーン生成・判定・敗者集計の純関数                                         |
| `reducer.ts`              | フェーズ遷移（calibration → rounds → result → sudden-death）                             |
| `use-mic-level.ts`        | expo-audio ラッパー（権限・metering ポーリング・録音ファイル破棄）                       |
| `volume-gauge.tsx`        | 縦型リアルタイムゲージ（Reanimated。緑ゾーン内グロー、ピークマーカー残留）               |
| `calibration-screen.tsx`  | 環境音計測 UI（プログレス＋再計測）                                                      |
| `result-screen.tsx`       | 中間・最終結果、敗者発表                                                                 |
| `topics.ts`               | ローカルフォールバックお題（pack: 'whisper'、約20本）                                    |
| `theme.ts`                | ゲーム内カラートークン                                                                   |

- ゲージ配色: 小さすぎ＝青系 / 緑ゾーン＝グリーン（グロー演出）/ 大きすぎ＝赤系。全体は濃紺×ネオンの既存デザイントークン踏襲
- metering が取得できない環境（Web・一部シミュレータ）は「この端末ではマイクを利用できません」ガード表示

## お題配信・registry・その他

- Supabase: `topics` テーブルに `pack='whisper'`・`is_premium=false` の seed を追加（`supabase/` の既存 seed 手順に倣う）。取得・キャッシュ・`pickTopic`（使用済み ID 除外）は既存 `topics-store` を流用
- registry 追加: `id: 'sasayaki-limit'`、title「ささやきリミット」、絵文字 🤫、`premium: true`、2〜12人、`requiresPlayers: true`、遊び方4行
- CLAUDE.md の収録ゲーム候補に「ささやきリミット」を追記
- テスト: engine 境界値（ゾーン端ぴったり・floor/ceil クランプ・中央値）、reducer 遷移（サドンデス反復含む）、registry テスト更新。React 19 の await act 規約（kimagure-ox 参照実装）に準拠
- 実機マイクの機種差はキャリブレーションで吸収する設計だが、精度は実機テスト必須（#42 と合わせて検証）
