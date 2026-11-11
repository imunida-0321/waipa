---
name: notion-design-docs
description: WaiPa の基本設計書（Notion の「全体構成」と「画面設計書」）を、コードの変更に合わせて直すためのスキル。画面の表示・文言・操作・状態・遷移、ゲームのルールやフェーズ、ディレクトリ構成、ストアや AsyncStorage のキー、外部サービス（Supabase・RevenueCat・AdMob）との接続、ゲームの追加や削除を変えたときは、PR を作る前に必ずこのスキルを使って Notion を直すかどうかを判断する。「設計書を直して」「Notion も更新して」「スクショを撮り直して」と言われたときや、PR 作成のフックに Notion の記載を求められたときにも使う。
---

# Notion の基本設計書を直す

WaiPa の基本設計書は Notion が正で、リポジトリには `docs/DESIGN.md` のリンクしかない。Notion の変更は PR の差分に出ず、レビューでも見えないので、コードを直した本人がこのスキルで直す。

## 全体の流れ

1. 差分から、直す候補のページを決める（下の「どの変更でどのページを直すか」）
2. 候補のページを `notion-fetch` で読み、今のコードと食い違う箇所を探す
3. 食い違いがあれば直す。文章は小さく直し、見た目が変わった画面はスクリーンショットも撮り直す
4. PR の説明に `## Notion` の節を書く（直したページのリンク、または直さなかった理由）

直すかどうか迷ったら、ページを読んで確かめる。読まずに「不要」と判断しない。

## Notion につなぐ

Notion のツールは、claude.ai のコネクタ（Notion）が提供する。名前は `notion-fetch`、`notion-update-page` などで、ツール一覧に出ていなければ ToolSearch で `notion` を探して読み込む。

つながっていないときは、ユーザーにコネクタの接続を頼む。直せなかった場合も黙って進めず、PR の説明に「Notion: 未更新（接続できなかった）」と書いてユーザーに伝える。

## ページの場所

| ページ | ID |
| --- | --- |
| WaiPa 基本設計書（入口） | `415cdad49fbb81e7a9ffe7be41768418` |
| 全体構成 | `415cdad49fbb818a8a70f484598bafdb` |
| 画面設計書（索引） | `415cdad49fbb8132b7c1fc56ed24b140` |

画面ごとのページの ID は `references/pages.md` にある。見つからないときは、索引のページを `notion-fetch` で読めば子ページの一覧が出る。

## どの変更でどのページを直すか

画面設計書は「表示項目」「操作」「状態」「遷移」と、画面に出る文言を書いている。これらが変わったら直す。色や余白の微調整、内部のリファクタリング、テストだけの変更なら、ふつうは直さなくてよい。

| 変えたもの | 直す候補 |
| --- | --- |
| `src/games/<id>/` | そのゲームの画面設計書。フェーズの増減、ルール、文言、結果の出し方 |
| `src/games/<id>/meta.ts` | そのゲームのページの冒頭の表（人数、プレミアム限定か）。タイトルを変えたら索引の表も |
| `src/games/registry.ts`（ゲームの追加・削除・並べ替え） | 索引の表と子ページの並び。追加なら新しいページを作る |
| `src/app/index.tsx`、`src/components/home/` | ホーム。ロックのモーダルならプレミアムロック |
| `src/app/settings.tsx`、`src/components/settings/` | 設定とアクティビティ |
| `src/app/paywall.tsx` | ペイウォール |
| `src/components/game/game-screen.tsx` | ゲーム本体の枠、ゲームのイントロ |
| `src/components/game/game-intro-screen.tsx` | ゲームのイントロ |
| `src/components/game/how-to-play-modal.tsx` | 遊び方 |
| `src/components/game/player-setup-sheet.tsx`、`src/lib/players-store.ts` | 参加メンバー |
| `src/components/game/trial-lock-overlay.tsx`、`src/lib/trial-store.ts`、`src/constants/trial.ts` | お試しロック、プレミアムロック、全体構成の 7 章 |
| `src/components/splash-overlay.tsx` | スプラッシュ |
| `src/components/ui/`、`src/components/game/` の共通の演出 | 見た目が変わる画面すべて。文言や操作が変わらなければ直さない |
| `src/app/` のルートの追加・削除 | 全体構成の 2 章と、新しい画面のページ |
| `src/lib/` のストアの追加・削除、AsyncStorage のキー | 全体構成の 5 章 |
| `src/lib/premium.ts`、`ads.ts`、`gma.ts`、`supabase-rest.ts` | 全体構成の 6 章・7 章 |
| ディレクトリの追加・移動、依存の向き | 全体構成の 3 章 |
| `package.json` の Expo や React Native のメジャー更新 | 全体構成の 1 章の表 |
| 設計上の判断（やる・やらないを決めた） | 全体構成の 8 章「設計判断の記録」に1行足す |

## 文章を直す

- まず `notion-fetch` でページを読む。直す前に読んでいないと、`update-page` は失敗することがある
- 部分修正は `notion-update-page` の `update_content`（`old_str` → `new_str`）を使う。ページ全体の置き換え（`replace_content`）は、新しいページを作るときか、大きく作り直すときだけにする
- 文体は既存のページに合わせる。です・ます調、一文を短く、表は「No / 項目 / 内容」の形
- ページ同士のリンクは `<mention url="https://app.notion.com/p/<ID>">ページ名</mention>` で書く
- 書き方の細かい決まりと癖は `references/notion-format.md` にある。新しいページを作るとき、画像を並べるとき、うまく保存されないときに読む

## スクリーンショットを撮り直す

画面の見た目が変わったら、該当の画像を撮り直して差し替える。手順は `references/screenshots.md` にある（シミュレータで撮る、画像を Notion に送る、ページの画像を差し替える）。

撮れなかった状態があれば、ページの「補足」に書く。古い画像を残したまま文章だけ直すと、画像と説明が食い違うので、撮れないときは画像の下にその旨を書く。

## 新しいゲームを足したとき

1. 画面設計書の索引の子ページとして、空のページを作る（`notion-create-pages`、親は索引のページ）
2. 既存のゲームのページ（たとえば爆弾スワイプ）を読んで、同じ章立てで本文を書く。冒頭の表、概要、フェーズの表、フェーズごとの表示項目と操作、遷移、テスト、補足
3. スクリーンショットを撮って載せる
4. 索引の「ゲーム」の表に行を足し、子ページの並びをホームの表示順に合わせる
5. `references/pages.md` に ID を足す（リポジトリの変更なので、同じ PR に入れる）

## PR の説明に書くこと

PR の説明には、必ず `## Notion` の節を入れる。PR 作成のフックは、画面や構成に関わるファイルが変わっているのに説明に「Notion」の文字が無いと、PR の作成を止める。

直したとき:

```markdown
## Notion

- [爆弾スワイプ](https://app.notion.com/p/<ID>): 結果の一覧の表示項目を更新。スクリーンショットを撮り直した
```

直さなかったとき:

```markdown
## Notion

更新不要。内部のリファクタリングで、表示・操作・構成は変わらない。
```

「更新不要」と書くのは、ページを読んで食い違いが無いと確かめたときだけにする。
