# WaiPa（ワイパ）

パーティーやグループでの時間をより楽しくする、無料のランダムミニゲームアプリ。
スマホ1台で、大勢でも2人でもワイワイ遊べる。

## 収録ゲーム

収録ミニゲーム 15 種（無料8種・プレミアム限定7種。複数端末リアルタイム同期は第2弾）:

1. Who will pay
2. BOMB!! 2/16
3. 5秒STOP
4. きまぐれ◯×
5. 王様のいない王様ゲーム
6. チンチロ
7. カウントダウン爆弾リレー
8. リアクション神経衰弱
9. バーストチキン（プレミアム限定）
10. ダウトダイス（プレミアム限定）
11. 乾杯ウルフ（プレミアム限定）
12. 飲酒衰弱（プレミアム限定）
13. 爆弾スワイプ（プレミアム限定）
14. ささやきリミット（プレミアム限定）
15. おでこインディアンポーカー（プレミアム限定）

## 技術スタック

- Expo (React Native) — iOS / Android
- Supabase — 認証・お題配信・課金検証
- AdMob — 広告（収益の主軸）
- RevenueCat — プレミアム課金（月額 ¥150 / 年額 ¥1,100）

## セットアップ

必要なもの: Node.js 24 系 / npm

```bash
git clone https://github.com/imunida-0321/waipa.git
cd waipa
npm install
cp .env.example .env   # Supabase の URL / anon キーを設定（実値はチーム内の安全な経路で受け取る）
npm start              # Expo 開発サーバー起動（iOS: npm run ios / Android: npm run android）
```

AI 協働体制（Claude × Codex）で開発する場合は追加で:

```bash
brew install codex   # Codex CLI（コーダー役）
codex login          # ChatGPT アカウントでログイン
```

オーケストレーター役の [Claude Code](https://claude.com/claude-code) も別途インストールしてください。

## 開発フロー

- Issue ごとにブランチを切る
- `develop` ベースで作業 → PR → `develop` へマージ
- 詳細は [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)（開発ガイド）を参照
- AI を使わず手で開発する場合は [docs/DEVELOPMENT-MANUAL.md](docs/DEVELOPMENT-MANUAL.md)
- AI エージェント向け規約: [CLAUDE.md](CLAUDE.md)（Claude Code）/ [AGENTS.md](AGENTS.md)（Codex CLI）
