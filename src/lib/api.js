/* Accès aux données Supabase : lieux, visites, photos. */
import { supabase } from './supabase.js';
import { preparePhoto } from './image.js';

const BUCKET = 'photos';

export const photoUrl = (path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
export const thumbPath = (path) => path.replace(/\.jpg$/, '_t.jpg');

/* Ligne Supabase -> objet utilisé par l'interface */
function toPlace(r) {
  const photos = (r.photos || [])
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((ph) => ({ id: ph.id, path: ph.path, url: photoUrl(ph.path), thumb: photoUrl(thumbPath(ph.path)) }));
  const cover = (r.cover_path && photos.find((ph) => ph.path === r.cover_path)) || photos[0] || null;
  const visits = (r.visits || [])
    .map((v) => ({ id: v.id, d: v.visited_on, who: v.who, love: v.love, note: v.note || '', at: v.created_at }))
    .sort((a, b) => b.d.localeCompare(a.d) || b.at.localeCompare(a.at));
  return {
    id: r.id,
    name: r.name,
    cat: r.cat,
    quartier: r.quartier,
    region: r.region || 'Montréal',
    lat: r.lat,
    lng: r.lng,
    season: r.season,
    metro: r.metro_station || (r.metro_lines && r.metro_lines.length) ? { station: r.metro_station || '', lines: r.metro_lines || [] } : null,
    desc: r.description || '',
    address: r.address || '',
    link: r.link || '',
    price: r.price || null,
    tags: r.tags || [],
    coverPath: r.cover_path,
    cover,
    photos,
    visits,
  };
}

export async function fetchPlaces() {
  const { data, error } = await supabase
    .from('places')
    .select('*, visits(*), photos(*)')
    .order('name', { ascending: true });
  if (error) throw error;
  return data.map(toPlace);
}

/* Formulaire -> colonnes */
export const emptyPlaceForm = () => ({ name: '', cat: 'bouffe', region: 'Montréal', quartier: '', season: 'toute', metroStation: '', metroLines: [], desc: '', address: '', link: '', price: null, tags: [] });

export const placeToForm = (p) => ({
  name: p.name, cat: p.cat, region: p.region, quartier: p.quartier === 'Montréal' || p.quartier === p.region ? '' : p.quartier, season: p.season,
  metroStation: p.metro ? p.metro.station : '', metroLines: p.metro ? p.metro.lines.slice() : [],
  desc: p.desc, address: p.address, link: p.link, price: p.price, tags: p.tags.slice(),
});

const formToRow = (f) => {
  const region = (f.region || '').trim() || 'Montréal';
  return {
  name: f.name.trim(),
  cat: f.cat,
  region,
  quartier: f.quartier.trim() || region,
  season: f.season,
  metro_station: f.metroStation.trim() || null,
  metro_lines: f.metroLines,
  description: f.desc.trim(),
  address: f.address.trim() || null,
  link: f.link.trim() || null,
  price: f.price || null,
  tags: f.tags,
  };
};

export async function createPlace(form, pos) {
  const { data, error } = await supabase.from('places').insert({ ...formToRow(form), lat: pos.lat, lng: pos.lng }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function updatePlace(id, form, pos) {
  const row = formToRow(form);
  if (pos) { row.lat = pos.lat; row.lng = pos.lng; }
  const { error } = await supabase.from('places').update(row).eq('id', id);
  if (error) throw error;
}

export async function deletePlace(place) {
  const files = place.photos.flatMap((ph) => [ph.path, thumbPath(ph.path)]);
  if (files.length) {
    const { error: e1 } = await supabase.storage.from(BUCKET).remove(files);
    if (e1) throw e1;
  }
  const { error } = await supabase.from('places').delete().eq('id', place.id);
  if (error) throw error;
}

const visitRow = (v) => ({ visited_on: v.d, who: v.who, love: !!v.love, note: (v.note || '').trim() });

export async function addVisit(placeId, v) {
  const { error } = await supabase.from('visits').insert({ ...visitRow(v), place_id: placeId });
  if (error) throw error;
}

export async function updateVisit(id, v) {
  const { error } = await supabase.from('visits').update(visitRow(v)).eq('id', id);
  if (error) throw error;
}

export async function deleteVisit(id) {
  const { error } = await supabase.from('visits').delete().eq('id', id);
  if (error) throw error;
}

/* Envoie les photos une par une ; renvoie le nombre de photos envoyées */
export async function uploadPhotos(placeId, files, onProgress) {
  let done = 0;
  for (const file of files) {
    const { full, thumb } = await preparePhoto(file);
    const path = placeId + '/' + crypto.randomUUID() + '.jpg';
    const opts = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false };
    const { error: e1 } = await supabase.storage.from(BUCKET).upload(path, full.blob, opts);
    if (e1) throw e1;
    const { error: e2 } = await supabase.storage.from(BUCKET).upload(thumbPath(path), thumb.blob, opts);
    if (e2) throw e2;
    const { error: e3 } = await supabase.from('photos').insert({ place_id: placeId, path, width: full.width, height: full.height });
    if (e3) throw e3;
    done += 1;
    if (onProgress) onProgress(done, files.length);
  }
  return done;
}

export async function deletePhoto(place, photo) {
  const { error: e1 } = await supabase.storage.from(BUCKET).remove([photo.path, thumbPath(photo.path)]);
  if (e1) throw e1;
  const { error } = await supabase.from('photos').delete().eq('id', photo.id);
  if (error) throw error;
  if (place.coverPath === photo.path) await supabase.from('places').update({ cover_path: null }).eq('id', place.id);
}

export async function setCover(placeId, path) {
  const { error } = await supabase.from('places').update({ cover_path: path }).eq('id', placeId);
  if (error) throw error;
}

/* ---------- Parcours ---------- */
const missingTable = (e) => /relation .* does not exist|PGRST205|42P01|could not find the table/i.test(String((e && (e.message || e.code)) || ''));

const toRoute = (r) => ({
  id: r.id,
  title: r.title,
  desc: r.description || '',
  stops: (r.route_stops || []).slice().sort((a, b) => a.position - b.position).map((s) => ({ placeId: s.place_id, note: s.note || '' })),
});

/* Renvoie null si la migration 003 n'a pas encore été exécutée */
export async function fetchRoutes() {
  const { data, error } = await supabase.from('routes').select('*, route_stops(*)').order('created_at', { ascending: false });
  if (error) { if (missingTable(error)) return null; throw error; }
  return data.map(toRoute);
}

export async function saveRoute(r) {
  const row = { title: r.title.trim(), description: (r.desc || '').trim() };
  let id = r.id;
  if (id) {
    const { error } = await supabase.from('routes').update(row).eq('id', id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('routes').insert(row).select('id').single();
    if (error) throw error;
    id = data.id;
  }
  const { error: e1 } = await supabase.from('route_stops').delete().eq('route_id', id);
  if (e1) throw e1;
  if (r.stops.length) {
    const { error: e2 } = await supabase.from('route_stops')
      .insert(r.stops.map((s, i) => ({ route_id: id, place_id: s.placeId, position: i, note: (s.note || '').trim() })));
    if (e2) throw e2;
  }
  return id;
}

export async function deleteRoute(id) {
  const { error } = await supabase.from('routes').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- Calendrier des visites (éditeurs seulement) ---------- */
const toStay = (r) => ({ id: r.id, guests: r.guests, start: r.start_date, end: r.end_date, note: r.note || '' });

/* Renvoie null si la migration 005 n'a pas encore été exécutée */
export async function fetchStays() {
  const { data, error } = await supabase.from('stays').select('*').order('start_date', { ascending: true });
  if (error) { if (missingTable(error)) return null; throw error; }
  return data.map(toStay);
}

export async function saveStay(st) {
  const row = { guests: st.guests.trim(), start_date: st.start, end_date: st.end, note: (st.note || '').trim() };
  const q = st.id ? supabase.from('stays').update(row).eq('id', st.id) : supabase.from('stays').insert(row);
  const { error } = await q;
  if (error) throw error;
}

export async function deleteStay(id) {
  const { error } = await supabase.from('stays').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- Personnes : prénoms et réactions (j'aime, fait / à faire) ---------- */

/* Renvoie null si la migration 006 n'a pas encore été exécutée */
export async function fetchPeople() {
  const [pr, re] = await Promise.all([
    supabase.from('profiles').select('user_id, name'),
    supabase.from('place_reactions').select('place_id, user_id, liked, status'),
  ]);
  const err = pr.error || re.error;
  if (err) { if (missingTable(err)) return null; throw err; }
  const names = {};
  pr.data.forEach((x) => { names[x.user_id] = x.name; });
  return { names, reactions: re.data };
}

export async function saveProfile(userId, name) {
  const { error } = await supabase.from('profiles').upsert({ user_id: userId, name: name.trim() }, { onConflict: 'user_id' });
  if (error) throw error;
}

/* Réaction d'une personne sur un lieu ; une réaction vide est supprimée */
export async function saveReaction(placeId, userId, r) {
  if (!r.liked && !r.status) {
    const { error } = await supabase.from('place_reactions').delete().eq('place_id', placeId).eq('user_id', userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('place_reactions')
    .upsert({ place_id: placeId, user_id: userId, liked: !!r.liked, status: r.status || null }, { onConflict: 'place_id,user_id' });
  if (error) throw error;
}
