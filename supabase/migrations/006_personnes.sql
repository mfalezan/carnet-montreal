-- =============================================================================
-- Migration 006 — personnes : prénom, « j'aime » et « fait / à faire » par lieu
-- À exécuter une fois dans Supabase > SQL Editor (sans risque si relancée).
--
-- Les visiteurs s'identifient par un simple prénom : l'app crée pour eux un
-- compte anonyme Supabase, gardé par leur navigateur. Ils ne peuvent écrire
-- que leurs propres lignes ; seuls les éditeurs modifient le carnet.
-- Pré-requis dans Supabase > Authentication : « Allow anonymous sign-ins »
-- et « Allow new users to sign up » activés (voir README).
-- =============================================================================
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create table if not exists public.place_reactions (
  place_id   uuid not null references public.places(id) on delete cascade,
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  liked      boolean not null default false,
  status     text check (status in ('a_faire', 'fait')),
  updated_at timestamptz not null default now(),
  primary key (place_id, user_id)
);
create index if not exists place_reactions_user_idx on public.place_reactions(user_id);

drop trigger if exists place_reactions_touch on public.place_reactions;
create trigger place_reactions_touch before update on public.place_reactions
  for each row execute function public.touch_updated_at();

alter table public.profiles        enable row level security;
alter table public.place_reactions enable row level security;

grant select on public.profiles, public.place_reactions to anon, authenticated;
grant insert, update, delete on public.profiles, public.place_reactions to authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'place_reactions'] loop
    execute format('drop policy if exists "%1$s: lecture publique" on public.%1$s', t);
    execute format('create policy "%1$s: lecture publique" on public.%1$s for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "%1$s: ajout de ses lignes" on public.%1$s', t);
    execute format('create policy "%1$s: ajout de ses lignes" on public.%1$s for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('drop policy if exists "%1$s: modif de ses lignes" on public.%1$s', t);
    execute format('create policy "%1$s: modif de ses lignes" on public.%1$s for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('drop policy if exists "%1$s: suppr de ses lignes" on public.%1$s', t);
    execute format('create policy "%1$s: suppr de ses lignes" on public.%1$s for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;
