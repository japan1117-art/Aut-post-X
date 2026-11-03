create table if not exists public.market_os_test_control (
 id boolean primary key default true,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 max_posts integer not null default 3,
 claimed_count integer not null default 0,
 enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.market_os_test_control enable row level security;
revoke all on public.market_os_test_control from anon,authenticated;
insert into public.market_os_test_control(id,starts_at,ends_at,max_posts,claimed_count,enabled)
values(true,'2026-11-04T15:00:00Z','2026-11-05T15:00:00Z',3,0,false)
on conflict(id) do nothing;
create or replace function public.market_os_claim_test_slot(p_post_id uuid)
returns boolean language plpgsql security invoker as $$
declare v_count integer;
begin
 update public.market_os_test_control set claimed_count=claimed_count+1,updated_at=now()
 where id=true and enabled=true and clock_timestamp()>=starts_at and clock_timestamp()<ends_at and claimed_count<max_posts
 returning claimed_count into v_count;
 if not found then return false; end if;
 update public.market_os_posts set publication_state='CLAIMED'
 where id=p_post_id and publication_state='DRAFT' and safety_status='PASS';
 if not found then
  update public.market_os_test_control set claimed_count=claimed_count-1,updated_at=now() where id=true;
  return false;
 end if;
 return true;
end $$;
revoke all on function public.market_os_claim_test_slot(uuid) from public,anon,authenticated;
grant execute on function public.market_os_claim_test_slot(uuid) to service_role;
