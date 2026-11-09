-- =============================================================================
-- Migration 004 — région des lieux (activités hors de Montréal)
-- À exécuter une fois dans Supabase > SQL Editor (sans risque si relancée).
-- Les lieux existants sont rangés dans « Montréal ».
-- =============================================================================
alter table public.places
  add column if not exists region text not null default 'Montréal' check (length(trim(region)) > 0);

create index if not exists places_region_idx on public.places (region);
