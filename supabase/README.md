# Supabase セットアップ

## マイグレーションの適用方法

[Supabase ダッシュボード](https://supabase.com/dashboard/project/ltkkzucuzngtavpreixq) → **SQL Editor** で、
`migrations/` 内の SQL を番号順にコピー＆ペーストして **Run** する。

1. `0001_create_topics.sql` — topics テーブル＋RLS ポリシー作成
2. `0002_seed_topics.sql` — 初期お題データ投入（125件）
3. `0003_seed_batsu_topics.sql` — リアクション神経衰弱の罰お題（30件）

適用後の確認（anon キーで無料お題だけ読めること）:

```bash
curl "https://ltkkzucuzngtavpreixq.supabase.co/rest/v1/topics?select=pack&limit=5" \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY"
```

## お題パック構成

| pack               | 用途                                     | is_premium |
| ------------------ | ---------------------------------------- | ---------- |
| `king`             | 王様のいない王様ゲーム                   | false      |
| `talk`             | カウントダウン爆弾リレー（カテゴリお題） | false      |
| `pointing`         | 指差しヒートアップ                       | false      |
| `batsu`            | リアクション神経衰弱（罰お題）           | false      |
| `king_premium`     | 王様ゲーム限定パック（恋愛系）           | true       |
| `pointing_premium` | 指差し限定パック（恋愛系）               | true       |

- お題本文の `{B}` はアプリ側で「実行役以外のランダムな参加者番号」に置換する
- プレミアムパックは RLS で読み取り不可（解放経路は #収益2 で実装）
- お題の追加はダッシュボードから INSERT するだけでアプリに反映される（アプリはキャッシュ付きフェッチ）

## セキュリティ

- クライアントには anon (publishable) キーのみ埋め込む（`.env` / EAS Secrets）
- service_role キーは絶対にリポジトリ・アプリ・チャットに出さない
- 書き込み系ポリシーは定義しない（お題追加は管理者がダッシュボードから行う）
