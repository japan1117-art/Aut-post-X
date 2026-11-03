create table if not exists public.market_os_metrics (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.market_os_posts(id),
 x_post_id text not null,
 likes integer not null default 0,
 reposts integer not null default 0,
 replies integer not null default 0,
 quotes integer not null default 0,
 impressions bigint,
 captured_at timestamptz not null default now()
);
create index if not exists market_os_metrics_post_captured_idx on public.market_os_metrics(post_id,captured_at desc);
alter table public.market_os_metrics enable row level security;
revoke all on public.market_os_metrics from anon,authenticated;
