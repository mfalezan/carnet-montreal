-- =============================================================================
-- Migration 002 — prix et étiquettes des lieux
-- À exécuter une fois dans Supabase > SQL Editor (sans risque si relancée).
-- =============================================================================
alter table public.places
  add column if not exists price smallint check (price between 1 and 3),   -- 1 = $, 2 = $$, 3 = $$$
  add column if not exists tags  text[] not null default '{}';             -- clés définies dans src/config.js (TAGS)

create index if not exists places_tags_idx on public.places using gin (tags);
