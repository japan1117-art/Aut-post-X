create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  format text not null default 'knowledge',
  hook text not null,
  body text not null,
  image_title text not null,
  image_points jsonb not null default '[]'::jsonb,
  status text not null check (status in ('draft','queued','posting','posted','warning','failed')) default 'draft',
  scheduled_at timestamptz not null default now(),
  posted_at timestamptz,
  x_post_id text,
  media_id text,
  attempts integer not null default 0,
  compliance jsonb,
  error_log text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_due_idx on public.posts(status, scheduled_at);
create index if not exists posts_posted_idx on public.posts(posted_at desc);

create table if not exists public.settings (
  id boolean primary key default true check (id),
  posting_enabled boolean not null default true,
  circuit_open boolean not null default false,
  daily_limit integer not null default 3 check (daily_limit between 0 and 10),
  min_interval_minutes integer not null default 180 check (min_interval_minutes >= 30),
  consecutive_failures integer not null default 0,
  last_posted_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  action text not null,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;
alter table public.settings enable row level security;
alter table public.audit_logs enable row level security;
-- No public policies: only the server-side service role can access these tables.
