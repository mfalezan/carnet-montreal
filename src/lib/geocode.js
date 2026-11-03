/* Recherche d'adresses et de lieux (Photon, données OpenStreetMap), limitée au Grand Montréal.
   Service gratuit et sans clé : usage raisonnable, d'où le délai avant chaque recherche. */
const ENDPOINT = 'https://photon.komoot.io/api/';
const BBOX = '-74.05,45.35,-73.40,45.75'; // ouest, sud, est, nord
const BIAS = { lat: 45.513, lon: -73.578 };

const label = (p) => {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const area = p.district || p.locality || (p.city && p.city !== 'Montréal' ? p.city : '');
  return { street, area };
};

export async function searchPlaces(q, signal) {
  const url = ENDPOINT + '?' + new URLSearchParams({ q, lang: 'fr', limit: '6', bbox: BBOX, lat: BIAS.lat, lon: BIAS.lon });
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Recherche indisponible pour le moment.');
  const data = await res.json();
  const seen = new Set();
  return (data.features || []).map((f) => {
    const p = f.properties || {};
    const [lng, lat] = f.geometry.coordinates;
    const { street, area } = label(p);
    // un commerce, un parc ou un musée a un nom à reprendre ; une rue ou un simple bâtiment, non
    const isAddress = !p.name || ['place', 'highway', 'boundary'].includes(p.osm_key) || (p.osm_key === 'building' && p.osm_value === 'yes');
    const title = p.name || street || p.city || 'Lieu';
    const sub = [p.name ? street : '', area].filter(Boolean).join(' · ');
    return { id: p.osm_type + p.osm_id, lat, lng, title, sub, name: isAddress ? '' : (p.name || ''), address: street, quartier: area };
  }).filter((r) => { const k = r.title + r.sub; if (seen.has(k)) return false; seen.add(k); return true; });
}
