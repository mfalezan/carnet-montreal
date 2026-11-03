import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import Supercluster from 'supercluster';
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

const pinHtml = (cat, cls, size, label, num) =>
  `<span class="pin ${cls}${num ? ' num' : ''}" style="--c:${catColor(cat)};width:${size}px;height:${size}px">${num ? '<b>' + num + '</b>' : svgIcon(I[cat] || I.pin, Math.round(size * 0.5))}</span>` +
  (label ? `<span class="mk-label">${esc(label)}</span>` : '');

/* Pastille d'un groupe de lieux : taille selon le nombre */
const clusterHtml = (n) => {
  const size = n < 5 ? 38 : n < 15 ? 44 : n < 40 ? 52 : 60;
  return `<span class="cluster" style="width:${size}px;height:${size}px">${n}</span>`;
};

/* Regroupement : rayon en pixels, plus de groupes au-delà de CLUSTER_MAX_ZOOM */
const CLUSTER_RADIUS = 56;
const CLUSTER_MAX_ZOOM = 15;

export default function MapView({ places, selId, onPin, picking, draft, onPlace, apiRef, onToast, onLocate, me, numbers }) {
  const ref = useRef(null), mapRef = useRef(null), markers = useRef({}), draftMk = useRef(null), meMk = useRef(null);
  const [err, setErr] = useState('');
  const [view, setView] = useState(0); // incrémenté à chaque déplacement de la carte
  const live = useRef({});
  live.current = { picking, onPlace, onPin, onToast, onLocate };

  useEffect(() => {
    const map = new maplibregl.Map({
      container: ref.current, style: STYLE_URL, center: [MAP_START.lng, MAP_START.lat], zoom: MAP_START.zoom,
      attributionControl: { compact: true },
    });
    const geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false, showUserLocation: true });
    map.addControl(geo, 'top-right');
    geo.on('geolocate', (e) => { if (live.current.onLocate && e && e.coords) live.current.onLocate({ lat: e.coords.latitude, lng: e.coords.longitude }); });
    geo.on('error', () => live.current.onToast('Position indisponible : autorisez la localisation'));
    map.on('style.load', () => applyTheme(map));
    map.on('load', () => { setErr(''); setView((v) => v + 1); });
    map.on('moveend', () => setView((v) => v + 1));
    map.on('error', (e) => {
      const m = String((e && e.error && e.error.message) || '');
      if (/fetch|network|load/i.test(m) && !map.loaded()) setErr("La carte n'a pas pu se charger. Vérifiez votre connexion internet puis rechargez la page.");
    });
    map.on('click', (e) => { if (live.current.picking) live.current.onPlace({ lat: e.lngLat.lat, lng: e.lngLat.lng }); });
    mapRef.current = map;
    apiRef.current = {
      flyTo: (lat, lng, z) => map.flyTo({ center: [lng, lat], zoom: z || Math.max(map.getZoom(), 14.3), offset: [0, -70], duration: reduceMotion() ? 0 : 800, essential: true }),
      fitTo: (pts) => {
        if (!pts.length) return;
        if (pts.length === 1) { map.flyTo({ center: [pts[0].lng, pts[0].lat], zoom: 15, duration: reduceMotion() ? 0 : 800 }); return; }
        const b = new maplibregl.LngLatBounds();
        pts.forEach((p) => b.extend([p.lng, p.lat]));
        map.fitBounds(b, { padding: { top: 150, bottom: 200, left: 50, right: 50 }, maxZoom: 15.5, duration: reduceMotion() ? 0 : 800 });
      },
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      locate: () => {
        try { if (geo.trigger() === false) live.current.onToast('Localisation pas encore prête, réessayez'); }
        catch (e) { live.current.onToast('Localisation indisponible'); }
      },
    };
    return () => { map.remove(); mapRef.current = null; markers.current = {}; draftMk.current = null; meMk.current = null; };
  }, [apiRef]);

  /* Index de regroupement (le lieu sélectionné reste toujours visible à part) */
  const index = useMemo(() => {
    const sc = new Supercluster({ radius: numbers ? 0 : CLUSTER_RADIUS, maxZoom: CLUSTER_MAX_ZOOM });
    sc.load(places.filter((p) => p.id !== selId).map((p) => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { id: p.id },
    })));
    return sc;
  }, [places, selId, numbers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const byId = {};
    places.forEach((p) => { byId[p.id] = p; });
    const b = map.getBounds(), padX = (b.getEast() - b.getWest()) * 0.25, padY = (b.getNorth() - b.getSouth()) * 0.25;
    const items = index.getClusters([b.getWest() - padX, b.getSouth() - padY, b.getEast() + padX, b.getNorth() + padY], Math.floor(map.getZoom()));
    const sel = selId && byId[selId];
    const wanted = [];
    items.forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      if (f.properties.cluster) wanted.push({ key: 'c' + f.properties.cluster_id, kind: 'cluster', lng, lat, n: f.properties.point_count, cid: f.properties.cluster_id });
      else if (byId[f.properties.id]) wanted.push({ key: 'p' + f.properties.id, kind: 'place', p: byId[f.properties.id] });
    });
    if (sel) wanted.push({ key: 'p' + sel.id, kind: 'place', p: sel });

    const keep = new Set();
    wanted.forEach((w) => {
      keep.add(w.key);
      let m = markers.current[w.key];
      if (!m) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'mk';
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const h = el._hit;
          if (!h || live.current.picking) return;
          if (h.kind === 'place') live.current.onPin(h.id);
          else {
            let z = CLUSTER_MAX_ZOOM + 1;
            try { z = Math.min(h.index.getClusterExpansionZoom(h.cid), 18); } catch (e) { /* index renouvelé entre-temps */ }
            map.easeTo({ center: [h.lng, h.lat], zoom: z, duration: reduceMotion() ? 0 : 500 });
          }
        });
        const at = w.kind === 'place' ? [w.p.lng, w.p.lat] : [w.lng, w.lat];
        m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(at).addTo(map);
        markers.current[w.key] = m;
      }
      const el = m.getElement();
      if (w.kind === 'place') {
        const p = w.p, isSel = p.id === selId, done = p.visits.length > 0;
        el._hit = { kind: 'place', id: p.id };
        el.setAttribute('aria-label', p.name);
        const num = numbers ? numbers[p.id] : null;
        const html = pinHtml(p.cat, (done ? '' : 'todo') + (isSel ? ' sel' : ''), isSel ? 42 : num ? 34 : 32, isSel ? p.name : '', num);
        if (el._html !== html) { el.innerHTML = html; el._html = html; }
        el.style.zIndex = isSel ? '5' : '1';
        m.setLngLat([p.lng, p.lat]);
      } else {
        el._hit = { kind: 'cluster', cid: w.cid, lng: w.lng, lat: w.lat, index };
        el.setAttribute('aria-label', w.n + ' lieux, zoomer');
        const html = clusterHtml(w.n);
        if (el._html !== html) { el.innerHTML = html; el._html = html; }
        el.style.zIndex = '2';
        m.setLngLat([w.lng, w.lat]);
      }
    });
    Object.keys(markers.current).forEach((k) => {
      if (!keep.has(k)) { markers.current[k].remove(); delete markers.current[k]; }
    });
  }, [index, places, selId, view, numbers]);

  /* Tracé d'un parcours : ligne pointillée entre les étapes, dans l'ordre */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const coords = numbers
      ? places.filter((p) => numbers[p.id]).sort((a, b) => numbers[a.id] - numbers[b.id]).map((p) => [p.lng, p.lat])
      : [];
    const data = { type: 'FeatureCollection', features: coords.length > 1 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }] : [] };
    const apply = () => {
      const src = map.getSource('route-line');
      if (src) { src.setData(data); return; }
      map.addSource('route-line', { type: 'geojson', data });
      map.addLayer({ id: 'route-line', type: 'line', source: 'route-line', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#E4572E', 'line-width': 3.5, 'line-opacity': 0.85, 'line-dasharray': [1.2, 1.6] } });
    };
    if (map.isStyleLoaded()) apply(); else map.once('load', apply);
    return () => map.off('load', apply);
  }, [places, numbers]);

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

  /* Point « vous êtes ici » pendant Autour de moi */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!me) { if (meMk.current) { meMk.current.remove(); meMk.current = null; } return; }
    if (!meMk.current) {
      const el = document.createElement('div');
      el.className = 'me-dot';
      el.setAttribute('aria-label', 'Votre position');
      meMk.current = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([me.lng, me.lat]).addTo(map);
    } else meMk.current.setLngLat([me.lng, me.lat]);
  }, [me]);

  return (
    <div className={'map' + (picking ? ' placing' : '')}>
      <div ref={ref} className="map-canvas" aria-label="Carte de Montréal avec nos lieux" />
      {err && <div className="map-err">{err}</div>}
    </div>
  );
}
