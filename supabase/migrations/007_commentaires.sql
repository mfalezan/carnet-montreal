-- =============================================================================
-- Migration 007 — commentaires (avec une photo facultative) sur les lieux
-- À exécuter une fois dans Supabase > SQL Editor, APRÈS la 006 (sans risque si relancée).
--
-- Chacun peut commenter sous son prénom et supprimer ses commentaires ;
-- Matthieu et Azéline peuvent supprimer n'importe quel commentaire.
-- Les photos des visiteurs vont dans le bucket « photos », dossier guests/<leur id>/.
-- =============================================================================
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references public.places(id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles(user_id) on delete cascade,
  body        text not null default '' check (length(body) <= 1000),
  photo_path  text,
  created_at  timestamptz not null default now(),
  check (length(trim(body)) > 0 or photo_path is not null)
);
create index if not exists comments_place_idx on public.comments(place_id, created_at desc);

alter table public.comments enable row level security;
grant select on public.comments to anon, authenticated;
grant insert, delete on public.comments to authenticated;

drop policy if exists "comments: lecture publique" on public.comments;
create policy "comments: lecture publique" on public.comments
  for select to anon, authenticated using (true);

drop policy if exists "comments: ajout de ses commentaires" on public.comments;
create policy "comments: ajout de ses commentaires" on public.comments
  for insert to authenticated with check (
    user_id = auth.uid()
    and (photo_path is null or photo_path like 'guests/' || auth.uid()::text || '/%' or public.is_editor())
  );

drop policy if exists "comments: suppr auteur ou éditeurs" on public.comments;
create policy "comments: suppr auteur ou éditeurs" on public.comments
  for delete to authenticated using (user_id = auth.uid() or public.is_editor());

-- Photos des visiteurs : chacun écrit et supprime seulement dans son dossier guests/<id>/
drop policy if exists "photos: visiteurs, lecture de leur dossier" on storage.objects;
create policy "photos: visiteurs, lecture de leur dossier" on storage.objects
  for select to authenticated using (
    bucket_id = 'photos' and (storage.foldername(name))[1] = 'guests' and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "photos: visiteurs, ajout dans leur dossier" on storage.objects;
create policy "photos: visiteurs, ajout dans leur dossier" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'photos' and (storage.foldername(name))[1] = 'guests' and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "photos: visiteurs, suppr dans leur dossier" on storage.objects;
create policy "photos: visiteurs, suppr dans leur dossier" on storage.objects
  for delete to authenticated using (
    bucket_id = 'photos' and (storage.foldername(name))[1] = 'guests' and (storage.foldername(name))[2] = auth.uid()::text);
