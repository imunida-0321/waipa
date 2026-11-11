# WaiPa 画面設計書

画面ごとの表示項目、操作、状態、遷移をまとめたドキュメントです。アプリ全体の構造は [ARCHITECTURE.md](../ARCHITECTURE.md) を参照してください。

## 構成

- 共通の画面とモーダルは、1画面につき1本です。
- ゲームは、1ゲームにつき1本です。ゲーム内のフェーズごとの画面は、その1本の中にすべて書きます。
- 画像は `images/<画面ID>/` に置きます。

## 各設計書の章立て

| 章                 | 書くこと                                       |
| ------------------ | ---------------------------------------------- |
| 冒頭の表           | 画面ID、ルート、実装ファイル、種別             |
| 目的               | この画面でユーザーが何をするか                 |
| スクリーンショット | シミュレータで撮った画像                       |
| 表示項目           | 画面に出る要素と、表示される条件               |
| 操作               | タップなどの操作と、その結果                   |
| 状態               | 条件によって表示が変わる場合の、状態ごとの違い |
| 遷移               | この画面への入口と、ここから出る先             |
| テスト             | 対応するテストファイル                         |
| 補足               | 撮影できなかった状態など                       |

ゲームの設計書は、冒頭に概要（人数、プレミアム限定かどうか、使うお題パック）とフェーズの一覧を置き、フェーズごとに上の章を繰り返します。

## スクリーンショットの撮影条件

- 撮影日: 2026-11-10〜11
- 端末: iOS シミュレータ（iPhone 17 Pro / iOS 26.5）
- ビルド: 開発ビルド
- 開発ビルドは RevenueCat の API キーが未設定のため、常にプレミアム扱いになります。未購読のときの画面（ホームのロック表示とバナー広告、プレミアムロック、未購読のペイウォール）は、撮影のときだけ `src/lib/premium.ts` を一時的に未購読扱いにして撮りました（コミットしていません）。
- 撮影できなかった状態は、各設計書の「補足」に書いています。
- プレイヤー名（ひろ、たろ、はな、ゆき）は撮影用のサンプルです。

## 共通の画面とモーダル

| 画面ID            | 画面名               | 種別           | 設計書                                   |
| ----------------- | -------------------- | -------------- | ---------------------------------------- |
| `home`            | ホーム               | 画面           | [home.md](home.md)                       |
| `settings`        | 設定とアクティビティ | 画面           | [settings.md](settings.md)               |
| `paywall`         | ペイウォール         | モーダル画面   | [paywall.md](paywall.md)                 |
| `gallery`         | デザインギャラリー   | 画面（開発用） | [gallery.md](gallery.md)                 |
| `game-intro`      | ゲームのイントロ     | 画面           | [game-intro.md](game-intro.md)           |
| `how-to-play`     | 遊び方               | モーダル       | [how-to-play.md](how-to-play.md)         |
| `player-setup`    | 参加メンバー         | 画面           | [player-setup.md](player-setup.md)       |
| `game-play-frame` | ゲーム本体の枠       | 画面の枠       | [game-play-frame.md](game-play-frame.md) |
| `premium-lock`    | プレミアムロック     | モーダル       | [premium-lock.md](premium-lock.md)       |
| `trial-lock`      | お試しロック         | オーバーレイ   | [trial-lock.md](trial-lock.md)           |
| `splash`          | スプラッシュ         | オーバーレイ   | [splash.md](splash.md)                   |

## ゲーム

| 画面ID           | ゲーム                     | 種別           | 設計書                                 |
| ---------------- | -------------------------- | -------------- | -------------------------------------- |
| `who-will-pay`   | Who will pay               | 無料           | [who-will-pay.md](who-will-pay.md)     |
| `bomb-216`       | BOMB!! 2/16                | 無料           | [bomb-216.md](bomb-216.md)             |
| `five-sec-stop`  | 5秒STOP                    | 無料           | [five-sec-stop.md](five-sec-stop.md)   |
| `kimagure-ox`    | きまぐれ◯×                 | 無料           | [kimagure-ox.md](kimagure-ox.md)       |
| `no-king-game`   | 王様のいない王様ゲーム     | 無料           | [no-king-game.md](no-king-game.md)     |
| `chinchiro`      | チンチロ                   | 無料           | [chinchiro.md](chinchiro.md)           |
| `bomb-relay`     | カウントダウン爆弾リレー   | 無料           | [bomb-relay.md](bomb-relay.md)         |
| `reaction-pairs` | リアクション神経衰弱       | 無料           | [reaction-pairs.md](reaction-pairs.md) |
| `burst-chicken`  | バーストチキン             | プレミアム限定 | [burst-chicken.md](burst-chicken.md)   |
| `daut-dice`      | ダウトダイス               | プレミアム限定 | [daut-dice.md](daut-dice.md)           |
| `kanpai-wolf`    | 乾杯ウルフ                 | プレミアム限定 | [kanpai-wolf.md](kanpai-wolf.md)       |
| `inshu-suijaku`  | 飲酒衰弱                   | プレミアム限定 | [inshu-suijaku.md](inshu-suijaku.md)   |
| `bomb-swipe`     | 爆弾スワイプ               | プレミアム限定 | [bomb-swipe.md](bomb-swipe.md)         |
| `sasayaki-limit` | ささやきリミット           | プレミアム限定 | [sasayaki-limit.md](sasayaki-limit.md) |
| `odeko-poker`    | おでこインディアンポーカー | プレミアム限定 | [odeko-poker.md](odeko-poker.md)       |

並び順はホームの表示順（`src/games/registry.ts`）です。

## 撮影中に見つかった不具合の候補

| 画面                                      | 内容                                                                                                           | Issue |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----- |
| [飲酒衰弱](inshu-suijaku.md)              | カスタムお題のシートのヘッダーがステータスバーに重なり、「×」で閉じられない                                    | #166  |
| [爆弾スワイプ](bomb-swipe.md)             | 結果のスコアの一覧で、名前がつぶれて読めない                                                                   | #167  |
| [プレミアムロック](premium-lock.md)       | リワード広告を見終わったあと、画面がタップを受け付けなくなった（シミュレータ・テスト広告で発生、原因は未確認） | #168  |
| [王様のいない王様ゲーム](no-king-game.md) | 1人目が番号を見ると、2人目以降は番号を見なくても確認ボタンを押せる（意図した動作かは未確認）                   | #169  |
