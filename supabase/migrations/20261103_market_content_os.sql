-- Isolated market content tables. No legacy posts/settings modifications.
create table if not exists public.market_os_topics (
 id uuid primary key default gen_random_uuid(),
 category text not null check (category in ('investment','fx','crypto')),
 title text not null,
 source_url text not null,
 source_publisher text not null,
 published_at timestamptz,
 score integer not null check (score between 0 and 100),
 review_status text not null default 'REVIEW_REQUIRED' check (review_status in ('REVIEW_REQUIRED','PASS','BLOCKED')),
 created_at timestamptz not null default now(),
 unique (category,source_url)
);
create table if not exists public.market_os_posts (
 id uuid primary key default gen_random_uuid(),
 topic_id uuid not null references public.market_os_topics(id),
 body text not null,
 safety_status text not null default 'REVIEW_REQUIRED' check (safety_status in ('REVIEW_REQUIRED','PASS','BLOCKED')),
 publication_state text not null default 'DRAFT' check (publication_state in ('DRAFT','CLAIMED','POSTED','FAILED_UNKNOWN')),
 x_post_id text unique,
 posted_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.market_os_topics enable row level security;
alter table public.market_os_posts enable row level security;
revoke all on public.market_os_topics from anon, authenticated;
revoke all on public.market_os_posts from anon, authenticated;
