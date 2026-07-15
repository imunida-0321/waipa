# WaiPa（ワイパ）

パーティーやグループでの時間をより楽しくする、無料のランダムミニゲームアプリ。
スマホ1台で、大勢でも2人でもワイワイ遊べる。

## MVP スコープ

1台回し系ミニゲーム 8 種（複数端末リアルタイム同期は第2弾）:

1. Who will pay（誰が払うかルーレット）
2. BOMB!! 2/16
3. 5秒STOP
4. きまぐれ◯×
5. 王様のいない王様ゲーム
6. 指差しヒートアップ
7. カウントダウン爆弾リレー
8. リアクション神経衰弱

## 技術スタック

- Expo (React Native) — iOS / Android
- Supabase — 認証・お題配信・課金検証
- AdMob — 広告（収益の主軸）
- RevenueCat — プレミアム課金（月額 ¥150 / 年額 ¥1,100）

## 開発フロー

- Issue ごとにブランチを切る
- `develop` ベースで作業 → PR → `develop` へマージ
- 詳細は [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)（人間向け開発ガイド）を参照
- AI エージェント向け規約: [CLAUDE.md](CLAUDE.md)（Claude Code）/ [AGENTS.md](AGENTS.md)（Codex CLI）
