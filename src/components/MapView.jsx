import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { catColor, I, MAP_START } from '../config.js';
import { esc, reduceMotion } from '../lib/utils.js';

/* Tuiles OpenFreeMap (gratuites, sans clé) recolorées en tons chauds */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const MAPC = {
  land: '#F4EBD3', landAlt: '#F0E4C8', park: '#D5E2B4', water: '#A9D5CE', building: '#E9DABB', casing: '#E2CFA4',
  motorway: '#E99659', primary: '#F2C660', secondary: '#FBF0D2', minor: '#FFFFFF', rail: '#CDBB97',
  label: '#5E4A36', waterLabel: '#3F7D78', halo: '#F7EFDB',
};

function applyTheme(map) {
  const layers = (map.getStyle() && map.getStyle().layers) || [];
  layers.forEach((l) => {
    const id = l.id.toLowerCase();
    const set = (p, v) => { try { map.setPaintProperty(l.id, p, v); } catch (e) { /* couche sans cette propriété */ } };
    if (l.type === 'background') set('background-color', MAPC.land);
    else if (l.type === 'fill') {
      if (/water|ocean|lake|river/.test(id)) set('fill-color', MAPC.water);
      else if (/park|wood|forest|grass|cemetery|landcover|pitch|golf|scrub/.test(id)) set('fill-color', MAPC.park);
      else if (/building/.test(id)) { set('fill-color', MAPC.building); set('fill-outline-color', MAPC.casing); }
      else set('fill-color', MAPC.landAlt);
    } else if (l.type === 'line') {
      if (/water|river|stream|canal/.test(id)) set('line-color', MAPC.water);
      else if (/boundary|admin/.test(id)) set('line-color', '#C9B48C');
      else if (/casing|outline/.test(id)) set('line-color', MAPC.casing);
      else if (/rail|transit/.test(id)) set('line-color', MAPC.rail);
      else if (/motorway/.test(id)) set('line-color', MAPC.motorway);
      else if (/trunk|primary|major/.test(id)) set('line-color', MAPC.primary);
      else if (/secondary|tertiary/.test(id)) set('line-color', MAPC.secondary);
      else if (/road|highway|street|minor|service|path|track|bridge|tunnel|link/.test(id)) set('line-color', MAPC.minor);
    } else if (l.type === 'symbol') {
      set('text-color', /water|ocean|river|lake|marine/.test(id) ? MAPC.waterLabel : MAPC.label);
      set('text-halo-color', MAPC.halo);
    } else if (l.type === 'fill-extrusion') set('fill-extrusion-color', MAPC.building);
  });
}

const svgIcon = (d, size) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

const pinHtml = (cat, cls, size, label) =>
  `<span class="pin ${cls}" style="--c:${catColor(cat)};width:${size}px;height:${size}px">${svgIcon(I[cat] || I.pin, Math.round(size * 0.5))}</span>` +
  (label ? `<span class="mk-label">${esc(label)}</span>` : '');

export default function MapView({ places, selId, onPin, picking, draft, onPlace, apiRef, onToast }) {
  const ref = useRef(null), mapRef = useRef(null), markers = useRef({}), draftMk = useRef(null);
  const [err, setErr] = useState('');
  const live = useRef({});
  live.current = { picking, onPlace, onPin, onToast };

  useEffect(() => {
    const map = new maplibregl.Map({
      container: ref.current, style: STYLE_URL, center: [MAP_START.lng, MAP_START.lat], zoom: MAP_START.zoom,
      attributionControl: { compact: true },
    });
    const geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false, showUserLocation: true });
    map.addControl(geo, 'top-right');
    geo.on('error', () => live.current.onToast('Position indisponible : autorisez la localisation'));
    map.on('style.load', () => applyTheme(map));
    map.on('load', () => setErr(''));
    map.on('error', (e) => {
      const m = String((e && e.error && e.error.message) || '');
      if (/fetch|network|load/i.test(m) && !map.loaded()) setErr("La carte n'a pas pu se charger. Vérifiez votre connexion internet puis rechargez la page.");
    });
    map.on('click', (e) => { if (live.current.picking) live.current.onPlace({ lat: e.lngLat.lat, lng: e.lngLat.lng }); });
    mapRef.current = map;
    apiRef.current = {
      flyTo: (lat, lng, z) => map.flyTo({ center: [lng, lat], zoom: z || Math.max(map.getZoom(), 14.3), offset: [0, -70], duration: reduceMotion() ? 0 : 800, essential: true }),
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      locate: () => {
        try { if (geo.trigger() === false) live.current.onToast('Localisation pas encore prête, réessayez'); }
        catch (e) { live.current.onToast('Localisation indisponible'); }
      },
    };
    return () => { map.remove(); mapRef.current = null; markers.current = {}; draftMk.current = null; };
  }, [apiRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const keep = new Set();
    places.forEach((p) => {
      keep.add(p.id);
      let m = markers.current[p.id];
      if (!m) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'mk';
        el.addEventListener('click', (ev) => { ev.stopPropagation(); if (!live.current.picking) live.current.onPin(p.id); });
        m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([p.lng, p.lat]).addTo(map);
        markers.current[p.id] = m;
      }
      const sel = p.id === selId, done = p.visits.length > 0, el = m.getElement();
      el.setAttribute('aria-label', p.name);
      el.innerHTML = pinHtml(p.cat, (done ? '' : 'todo') + (sel ? ' sel' : ''), sel ? 42 : 32, sel ? p.name : '');
      el.style.zIndex = sel ? '5' : '1';
      m.setLngLat([p.lng, p.lat]);
    });
    Object.keys(markers.current).forEach((id) => {
      if (!keep.has(id)) { markers.current[id].remove(); delete markers.current[id]; }
    });
  }, [places, selId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!draft) {
      if (draftMk.current) { draftMk.current.remove(); draftMk.current = null; }
      return;
    }
    if (!draftMk.current) {
      const el = document.createElement('div');
      el.className = 'mk';
      el.innerHTML = `<span class="pin draft" style="width:40px;height:40px">${svgIcon(I.plus, 20)}</span>`;
      draftMk.current = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([draft.lng, draft.lat]).addTo(map);
    } else {
      draftMk.current.setLngLat([draft.lng, draft.lat]);
    }
  }, [draft]);

  return (
    <div className={'map' + (picking ? ' placing' : '')}>
      <div ref={ref} className="map-canvas" aria-label="Carte de Montréal avec nos lieux" />
      {err && <div className="map-err">{err}</div>}
    </div>
  );
}
