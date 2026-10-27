-- Apply to Supabase SQL editor before enabling DAILY_STORY_LIVE_PUBLISH.
-- Immutable one-shot reservation: failed/unknown attempts are never retried automatically.
create table if not exists public.daily_story_publish_attempts (
  publish_key text primary key,
  story_date date not null,
  slot_index integer not null check (slot_index between 0 and 2),
  content_hash text not null,
  state text not null check (state in ('claimed','posted','failed_or_unknown','dry_run')),
  x_post_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists daily_story_publish_one_slot_per_day on public.daily_story_publish_attempts(story_date,slot_index);
alter table public.daily_story_publish_attempts enable row level security;
-- Only server service-role may access. No anon/authenticated policies.
