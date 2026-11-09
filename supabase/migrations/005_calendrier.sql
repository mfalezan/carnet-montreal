-- =============================================================================
-- Migration 005 — calendrier des visites (qui vient vous voir, et quand)
-- Réservé aux éditeurs : ni lisible ni modifiable par les visiteurs.
-- À exécuter une fois dans Supabase > SQL Editor (sans risque si relancée).
-- =============================================================================
create table if not exists public.stays (
  id          uuid primary key default gen_random_uuid(),
  guests      text not null check (length(trim(guests)) > 0),   -- « Papa et Maman », « Léa »…
  start_date  date not null,
  end_date    date not null,
  note        text not null default '',
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists stays_dates_idx on public.stays (start_date, end_date);

drop trigger if exists stays_touch on public.stays;
create trigger stays_touch before update on public.stays
  for each row execute function public.touch_updated_at();

alter table public.stays enable row level security;
revoke all on public.stays from anon;
grant select, insert, update, delete on public.stays to authenticated;

drop policy if exists "stays: éditeurs seulement" on public.stays;
create policy "stays: éditeurs seulement" on public.stays
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
