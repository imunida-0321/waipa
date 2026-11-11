# WaiPa 基本設計書

基本設計書は Notion にあります。Notion のページが正で、このファイルはそこへのリンクだけを置いています。

| 文書                                                                          | 内容                                                                                           |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [WaiPa 基本設計書](https://app.notion.com/p/415cdad49fbb81e7a9ffe7be41768418) | 入口のページ                                                                                   |
| [全体構成](https://app.notion.com/p/415cdad49fbb818a8a70f484598bafdb)         | 画面のつながり、ディレクトリの責務、外部サービスとの接続、プレミアム判定の流れ、設計判断の記録 |
| [画面設計書](https://app.notion.com/p/415cdad49fbb8132b7c1fc56ed24b140)       | 画面ごとの表示項目、操作、状態、遷移。共通の画面11本とゲーム15本                               |

Notion のページは非公開です。開けるのは、ワークスペースに招待された人だけです。

## 更新の決まり

- ディレクトリ構成、ゲームの共通インターフェース、外部サービスとの接続を変える PR では、Notion の「全体構成」も直します。
- 画面の表示や操作を変える PR では、Notion の該当する「画面設計書」のページも直します。
- PR の説明には「## Notion」の節を入れ、直したページのリンク、または直さなかった理由を書きます。Notion の変更は PR の差分に出ないためです。

Claude Code で作業するときは、次の2つがこの決まりを支えます。

- スキル [notion-design-docs](../.claude/skills/notion-design-docs/SKILL.md): どの変更でどのページを直すか、文章とスクリーンショットの直し方、画像を Notion に送るスクリプト
- フック [require-notion-note.sh](../.claude/hooks/require-notion-note.sh): `gh pr create` の前に develop との差分を見て、画面・ゲーム・構成に関わるファイル（`src/app`・`src/components`・`src/games`・`src/lib`・`src/constants`・`src/theme`・`app.json`・`package.json`。テストは除く）が変わっているのに、PR の説明に「## Notion」の見出しが無ければ PR の作成を止めます

2026-11-12 までは、全体構成を `docs/ARCHITECTURE.md`、画面設計書を `docs/screens/` に md で置いていました（Issue #182 で Notion へ移行）。当時の内容は git の履歴から読めます。

## リポジトリに残しているドキュメント

開発の手順や運用は、コードと一緒に変わるのでリポジトリに置いています。

| 知りたいこと                          | 参照先                                      |
| ------------------------------------- | ------------------------------------------- |
| 開発の流れ・TDD・コマンド             | [DEVELOPMENT.md](DEVELOPMENT.md)            |
| ゲームを追加する手順                  | [ADDING-A-GAME.md](ADDING-A-GAME.md)        |
| 広告の配置と表示条件                  | [ADS.md](ADS.md)                            |
| Supabase のテーブル・お題パック・運用 | [supabase/README.md](../supabase/README.md) |
| 機能ごとの設計の経緯                  | [superpowers/specs/](superpowers/specs/)    |
