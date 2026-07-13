# Supabase セットアップ

## マイグレーションの適用方法

[Supabase ダッシュボード](https://supabase.com/dashboard/project/ltkkzucuzngtavpreixq) → **SQL Editor** で、
`migrations/` 内の SQL を番号順にコピー＆ペーストして **Run** する。

1. `0001_create_topics.sql` — topics テーブル＋RLS ポリシー作成
2. `0002_seed_topics.sql` — 初期お題データ投入（125件）
3. `0003_seed_batsu_topics.sql` — リアクション神経衰弱の罰お題（30件）
4. `0004_create_word_pairs.sql` — word_pairs テーブル＋RLS ポリシー作成
5. `0005_seed_word_pairs.sql` — ワードウルフのお題ペア投入（80件）
6. `0006_seed_whisper_topics.sql` — ささやきリミットのセリフお題投入（30件・2026-07-13 適用済み）

適用後の確認（anon キーで無料お題だけ読めること）:

```bash
curl "https://ltkkzucuzngtavpreixq.supabase.co/rest/v1/topics?select=pack&limit=5" \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY"
```

```bash
curl "https://ltkkzucuzngtavpreixq.supabase.co/rest/v1/word_pairs?select=id,pack,word_a,word_b&is_premium=eq.false&limit=1" \
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
| `whisper`          | ささやきリミット（セリフお題）           | false      |
| `king_premium`     | 王様ゲーム限定パック（恋愛系）           | true       |
| `pointing_premium` | 指差し限定パック（恋愛系）               | true       |

- お題本文の `{B}` はアプリ側で「実行役以外のランダムな参加者番号」に置換する
- プレミアムパックは RLS で読み取り不可（解放経路は #収益2 で実装）
- お題の追加はダッシュボードから INSERT するだけでアプリに反映される（アプリはキャッシュ付きフェッチ）

## ワードウルフのお題ペア構成

| pack     | 用途       | 件数 | is_premium |
| -------- | ---------- | ---- | ---------- |
| `food`   | たべもの   | 20   | false      |
| `place`  | ばしょ     | 20   | false      |
| `aruaru` | あるある   | 20   | false      |
| `adult`  | おとなの夜 | 20   | false      |

- word_a / word_b のどちらが多数派かはテーブルでは固定せず、アプリ側で 50/50 スワップして決める
- 全て is_premium=false で配信（プレミアム限定パックは追加時に is_premium=true にする）

## お題のメンテナンス SQL（SQL Editor 用）

適用済みのお題を後から変更したいときは、ダッシュボードの SQL Editor で以下を実行する（例は `whisper` パック。他パックは pack 名を差し替え）。

```sql
-- 一覧確認（id は文言修正・削除で使う）
select id, text, is_premium from public.topics where pack = 'whisper' order by created_at;
```

```sql
-- 追加（何行でも OK。アプリは次回起動のフェッチで自動反映）
insert into public.topics (pack, text) values
('whisper', '新しいセリフ1'),
('whisper', '新しいセリフ2');
```

```sql
-- 文言修正（id は一覧確認で取得）
update public.topics set text = '修正後のセリフ' where id = '対象の id';
```

```sql
-- 1件削除
delete from public.topics where id = '対象の id';
```

```sql
-- パック全入れ替え（削除→ seed SQL の insert を再実行）
delete from public.topics where pack = 'whisper';
-- 続けて migrations/0006_seed_whisper_topics.sql の insert 文を貼り付けて Run
```

注意:

- **seed SQL（0002/0003/0006）を単独でもう一度 Run すると重複行になる**。再投入は必ず上の「全入れ替え」の手順で
- `whisper` の先頭20件は `src/games/sasayaki-limit/topics.ts` の `FALLBACK_WHISPER_TOPICS`（オフライン用フォールバック）と文言を揃えてある。配信側だけ変えても動作に支障はないが、大きく入れ替えるときはフォールバックも合わせて更新するとオフライン時の体験が一致する
- 反映タイミング: アプリはキャッシュ付きフェッチ（起動時 refresh）なので、変更は各端末の次回起動から反映される

## セキュリティ

- クライアントには anon (publishable) キーのみ埋め込む（`.env` / EAS Secrets）
- service_role キーは絶対にリポジトリ・アプリ・チャットに出さない
- 書き込み系ポリシーは定義しない（お題追加は管理者がダッシュボードから行う）
