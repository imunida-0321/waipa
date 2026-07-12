-- ワードウルフのお題ペア。どちらが多数派かはアプリ側で 50/50 スワップして決める
-- （word_a 固定だと常連プレイヤーにバレるため、テーブルでは決めない）

create table if not exists public.word_pairs (
  id uuid primary key default gen_random_uuid(),
  pack text not null,              -- 'food' | 'place' | 'aruaru' | 'adult' ...
  word_a text not null,
  word_b text not null,
  is_premium boolean not null default false,
  locale text not null default 'ja',
  created_at timestamptz not null default now()
);

create index if not exists word_pairs_pack_locale_idx on public.word_pairs (pack, locale);

-- RLS: topics と同型。無料ペアのみ誰でも読める。書き込みは常に不可
-- ゲーム自体がプレミアムロックのため、当面の seed は全て is_premium=false で配信する
-- （#収益2 完了後の追加パックを is_premium=true にして経路を締める）
alter table public.word_pairs enable row level security;

drop policy if exists "anyone can read free word pairs" on public.word_pairs;
create policy "anyone can read free word pairs"
  on public.word_pairs
  for select
  to anon, authenticated
  using (is_premium = false);
