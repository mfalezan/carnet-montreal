-- =============================================================================
-- Migration 003 — parcours (listes ordonnées de lieux à partager)
-- À exécuter une fois dans Supabase > SQL Editor (sans risque si relancée).
-- =============================================================================
create table if not exists public.routes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(trim(title)) > 0),
  description text not null default '',
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.route_stops (
  id        uuid primary key default gen_random_uuid(),
  route_id  uuid not null references public.routes(id) on delete cascade,
  place_id  uuid not null references public.places(id) on delete cascade,
  position  integer not null,
  note      text not null default '',
  unique (route_id, place_id)
);
create index if not exists route_stops_route_id_idx on public.route_stops(route_id);
create index if not exists route_stops_place_id_idx on public.route_stops(place_id);

drop trigger if exists routes_touch on public.routes;
create trigger routes_touch before update on public.routes
  for each row execute function public.touch_updated_at();

alter table public.routes      enable row level security;
alter table public.route_stops enable row level security;

grant select on public.routes, public.route_stops to anon, authenticated;
grant insert, update, delete on public.routes, public.route_stops to authenticated;

do $$
declare t text;
begin
  foreach t in array array['routes', 'route_stops'] loop
    execute format('drop policy if exists "%1$s: lecture publique" on public.%1$s', t);
    execute format('create policy "%1$s: lecture publique" on public.%1$s for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "%1$s: ajout éditeurs" on public.%1$s', t);
    execute format('create policy "%1$s: ajout éditeurs" on public.%1$s for insert to authenticated with check (public.is_editor())', t);
    execute format('drop policy if exists "%1$s: modif éditeurs" on public.%1$s', t);
    execute format('create policy "%1$s: modif éditeurs" on public.%1$s for update to authenticated using (public.is_editor()) with check (public.is_editor())', t);
    execute format('drop policy if exists "%1$s: suppr éditeurs" on public.%1$s', t);
    execute format('create policy "%1$s: suppr éditeurs" on public.%1$s for delete to authenticated using (public.is_editor())', t);
  end loop;
end $$;
