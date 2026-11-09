/* Recherche d'adresses et de lieux (Photon, données OpenStreetMap), au Québec et en Ontario,
   en privilégiant les résultats proches de Montréal.
   Service gratuit et sans clé : usage raisonnable, d'où le délai avant chaque recherche. */
import { REGIONS } from '../config.js';
import { norm } from './utils.js';

const ENDPOINT = 'https://photon.komoot.io/api/';
const BBOX = '-83.5,41.6,-57.0,53.0';            // ouest, sud, est, nord
const MTL = [-74.05, 45.35, -73.40, 45.75];      // Grand Montréal
const BIAS = { lat: 45.513, lon: -73.578 };

const inMontreal = (lng, lat) => lng >= MTL[0] && lng <= MTL[2] && lat >= MTL[1] && lat <= MTL[3];

/* Région proposée : Montréal, une région connue (« Les Laurentides » -> Laurentides), sinon la ville */
function guessRegion(p, lng, lat) {
  if (inMontreal(lng, lat)) return 'Montréal';
  // la MRC (« Les Laurentides ») d'abord, puis la ville ; jamais la province, qui se confondrait avec la ville de Québec
  for (const c of [p.county, p.city].filter(Boolean).map(norm)) {
    const known = REGIONS.find((r) => r !== 'Montréal' && (c === norm(r) || c.endsWith(' ' + norm(r))));
    if (known) return known;
  }
  return p.city || p.county || p.state || '';
}

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
    const region = guessRegion(p, lng, lat);
    const town = region === 'Montréal' ? area : (p.city || p.locality || p.district || '');
    // un commerce, un parc ou un musée a un nom à reprendre ; une rue ou un simple bâtiment, non
    const isAddress = !p.name || ['place', 'highway', 'boundary'].includes(p.osm_key) || (p.osm_key === 'building' && p.osm_value === 'yes');
    const title = p.name || street || p.city || 'Lieu';
    const sub = [p.name ? street : '', region === 'Montréal' ? area : [town, region !== town ? region : ''].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
    return { id: p.osm_type + p.osm_id, lat, lng, title, sub, name: isAddress ? '' : (p.name || ''), address: street, quartier: town, region };
  }).filter((r) => { const k = r.title + r.sub; if (seen.has(k)) return false; seen.add(k); return true; });
}
