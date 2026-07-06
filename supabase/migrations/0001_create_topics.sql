-- お題テーブル: 王様ゲーム・爆弾リレー・指差しヒートアップ等で使用
-- アプリ更新なしでお題を追加できるよう Supabase から配信する

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  pack text not null,              -- 'king' | 'talk' | 'pointing' | 'king_premium' | 'pointing_premium' ...
  text text not null,              -- お題本文。{B} はアプリ側でランダムな参加者番号に置換
  is_premium boolean not null default false,
  locale text not null default 'ja',
  created_at timestamptz not null default now()
);

create index if not exists topics_pack_locale_idx on public.topics (pack, locale);

-- RLS: 無料お題は誰でも読める。プレミアムお題は現状どのクライアントからも読めない
-- （プレミアム解放は #収益2 で認証付き経路 or Edge Function を通す。書き込みは常に不可）
alter table public.topics enable row level security;

drop policy if exists "anyone can read free topics" on public.topics;
create policy "anyone can read free topics"
  on public.topics
  for select
  to anon, authenticated
  using (is_premium = false);
