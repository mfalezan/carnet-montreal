-- =============================================================================
-- Carnet de Montréal — schéma Supabase
-- À coller tel quel dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé : il ne recrée pas ce qui existe déjà.
--
-- Principe : tout le monde peut LIRE le carnet (amis, famille, visiteurs),
-- seuls les comptes listés dans la table `editors` (vous deux) peuvent ÉCRIRE.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Éditeurs : les comptes autorisés à modifier le carnet
-- who = 'm' (Matthieu) ou 'a' (Azéline) — sert d'auteur par défaut des visites
-- -----------------------------------------------------------------------------
create table if not exists public.editors (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  who        text not null check (who in ('m', 'a')),
  created_at timestamptz not null default now()
);

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.editors where user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- Lieux
-- -----------------------------------------------------------------------------
create table if not exists public.places (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(trim(name)) > 0),
  cat           text not null check (cat in ('bouffe', 'vues', 'culture', 'parcs', 'sorties')),
  quartier      text not null default 'Montréal',     -- quartier, ou ville hors de Montréal
  region        text not null default 'Montréal' check (length(trim(region)) > 0),  -- migration 004
  lat           double precision not null check (lat between -90 and 90),
  lng           double precision not null check (lng between -180 and 180),
  season        text not null default 'toute' check (season in ('toute', 'ete', 'hiver')),
  metro_station text,
  metro_lines   text[] not null default '{}'
                check (metro_lines <@ array['verte', 'orange', 'jaune', 'bleue']),
  description   text not null default '',
  address       text,
  link          text,
  cover_path    text,                              -- photo de couverture (chemin dans le bucket)
  price         smallint check (price between 1 and 3),   -- 1 = $, 2 = $$, 3 = $$$   (migration 002)
  tags          text[] not null default '{}',             -- clés de TAGS dans src/config.js (migration 002)
  created_by    uuid default auth.uid() references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Visites : on peut revenir plusieurs fois au même lieu, chacun avec son avis
-- -----------------------------------------------------------------------------
-- Pour une base créée avant ces colonnes, voir supabase/migrations/002_etiquettes_prix.sql
create index if not exists places_tags_idx on public.places using gin (tags);
create index if not exists places_region_idx on public.places (region);

create table if not exists public.visits (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references public.places(id) on delete cascade,
  visited_on  date not null default current_date,
  who         text not null default 'deux' check (who in ('deux', 'm', 'a')),
  love        boolean not null default false,
  note        text not null default '',
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists visits_place_id_idx on public.visits(place_id);

-- -----------------------------------------------------------------------------
-- Photos : fichiers dans le bucket `photos`, une ligne par photo
-- path = '<place_id>/<uuid>.jpg' ; la miniature est '<place_id>/<uuid>_t.jpg'
-- -----------------------------------------------------------------------------
create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references public.places(id) on delete cascade,
  visit_id    uuid references public.visits(id) on delete set null,
  path        text not null unique,
  width       integer,
  height      integer,
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists photos_place_id_idx on public.photos(place_id);

-- updated_at automatique sur les lieux
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists places_touch on public.places;
create trigger places_touch before update on public.places
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Droits (Row Level Security)
-- -----------------------------------------------------------------------------
alter table public.editors enable row level security;
alter table public.places  enable row level security;
alter table public.visits  enable row level security;
alter table public.photos  enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.places, public.visits, public.photos to anon, authenticated;
grant insert, update, delete on public.places, public.visits, public.photos to authenticated;
grant select on public.editors to authenticated;
grant execute on function public.is_editor() to anon, authenticated;

-- editors : chacun voit seulement sa propre ligne (aucune écriture depuis l'app)
drop policy if exists "editors: lire sa ligne" on public.editors;
create policy "editors: lire sa ligne" on public.editors
  for select to authenticated using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['places', 'visits', 'photos'] loop
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

-- -----------------------------------------------------------------------------
-- Parcours (migration 003) : listes ordonnées de lieux à partager
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Calendrier des visites (migration 005) : réservé aux éditeurs
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Stockage des photos : bucket public en lecture, écriture réservée aux éditeurs
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos: lecture éditeurs" on storage.objects;
create policy "photos: lecture éditeurs" on storage.objects
  for select to authenticated using (bucket_id = 'photos' and public.is_editor());

drop policy if exists "photos: ajout éditeurs" on storage.objects;
create policy "photos: ajout éditeurs" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos' and public.is_editor());

drop policy if exists "photos: modif éditeurs" on storage.objects;
create policy "photos: modif éditeurs" on storage.objects
  for update to authenticated using (bucket_id = 'photos' and public.is_editor());

drop policy if exists "photos: suppr éditeurs" on storage.objects;
create policy "photos: suppr éditeurs" on storage.objects
  for delete to authenticated using (bucket_id = 'photos' and public.is_editor());

-- =============================================================================
-- DERNIÈRE ÉTAPE (à faire après avoir créé vos deux comptes dans
-- Authentication > Users) : déclarez-les comme éditeurs.
-- Remplacez les e-mails puis exécutez ces deux lignes seules.
-- =============================================================================
-- insert into public.editors (user_id, who)
--   select id, 'm' from auth.users where email = 'email-de-matthieu@exemple.com'
--   on conflict (user_id) do update set who = excluded.who;
-- insert into public.editors (user_id, who)
--   select id, 'a' from auth.users where email = 'email-d-azeline@exemple.com'
--   on conflict (user_id) do update set who = excluded.who;
