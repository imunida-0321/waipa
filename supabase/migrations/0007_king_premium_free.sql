-- #134: king_premium はリワード広告視聴で「その場だけ」解放するパックで、課金限定ではない。
-- RLS が is_premium=false のみ許可しているため anon で取得できなかった。
update public.topics set is_premium = false where pack = 'king_premium';
