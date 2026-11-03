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
    lat: r.lat,
    lng: r.lng,
    season: r.season,
    metro: r.metro_station || (r.metro_lines && r.metro_lines.length) ? { station: r.metro_station || '', lines: r.metro_lines || [] } : null,
    desc: r.description || '',
    address: r.address || '',
    link: r.link || '',
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
export const emptyPlaceForm = () => ({ name: '', cat: 'bouffe', quartier: '', season: 'toute', metroStation: '', metroLines: [], desc: '', address: '', link: '' });

export const placeToForm = (p) => ({
  name: p.name, cat: p.cat, quartier: p.quartier === 'Montréal' ? '' : p.quartier, season: p.season,
  metroStation: p.metro ? p.metro.station : '', metroLines: p.metro ? p.metro.lines.slice() : [],
  desc: p.desc, address: p.address, link: p.link,
});

const formToRow = (f) => ({
  name: f.name.trim(),
  cat: f.cat,
  quartier: f.quartier.trim() || 'Montréal',
  season: f.season,
  metro_station: f.metroStation.trim() || null,
  metro_lines: f.metroLines,
  description: f.desc.trim(),
  address: f.address.trim() || null,
  link: f.link.trim() || null,
});

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
