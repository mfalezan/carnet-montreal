/* « Mile End », ou « Mont-Tremblant, Laurentides » hors de Montréal */
export const where = (p) => {
  if (!p.region || p.region === 'Montréal') return p.quartier;
  return p.quartier && p.quartier !== p.region && p.quartier !== 'Montréal' ? p.quartier + ', ' + p.region : p.region;
};

export const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

export const fmtDate = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  const opts = { day: 'numeric', month: 'short' };
  if (y !== new Date().getFullYear()) opts.year = 'numeric';
  return new Date(y, m - 1, d).toLocaleDateString('fr-CA', opts);
};

export const fmtCoord = (lat, lng) => lat.toFixed(4) + ', ' + lng.toFixed(4).replace('-', '−');

export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const gmapsUrl = (p) => 'https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng;

export const placeUrl = (p) => window.location.origin + '/?lieu=' + encodeURIComponent(p.id);
export const routeUrl = (r) => window.location.origin + '/?parcours=' + encodeURIComponent(r.id);

/* Itinéraire à pied Google Maps qui passe par les étapes (10 au plus) */
export const gmapsRouteUrl = (stops) => {
  const pts = stops.slice(0, 10).map((p) => p.lat + ',' + p.lng);
  if (!pts.length) return null;
  const q = { api: '1', destination: pts[pts.length - 1], travelmode: 'walking' };
  if (pts.length > 1) { q.origin = pts[0]; if (pts.length > 2) q.waypoints = pts.slice(1, -1).join('|'); }
  return 'https://www.google.com/maps/dir/?' + new URLSearchParams(q).toString();
};

export const safeLink = (u) => {
  if (!u) return null;
  const s = u.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w-]+(\.[\w-]+)+/.test(s)) return 'https://' + s;
  return null;
};

/* Message d'erreur lisible pour les erreurs Supabase / réseau */
export function errMsg(e) {
  const m = String((e && (e.message || e.error_description || e.error)) || e || '');
  if (/column .*(does not exist|in the schema cache)|PGRST204|42703/i.test(m)) return "La base n'est pas à jour : exécutez la dernière migration de supabase/migrations dans Supabase.";
  if (/relation .* does not exist|PGRST205|42P01/i.test(m)) return "La base n'est pas à jour : exécutez la dernière migration de supabase/migrations dans Supabase.";
  if (/failed to fetch|network|load failed/i.test(m)) return 'Pas de connexion internet, réessayez.';
  if (/row-level security|permission denied|42501|unauthorized|403/i.test(m)) return 'Action réservée à Matthieu et Azéline.';
  if (/invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.';
  if (/email not confirmed/i.test(m)) return "Ce compte n'est pas encore confirmé dans Supabase.";
  if (/payload too large|exceeded the maximum/i.test(m)) return 'Photo trop lourde.';
  return m || 'Une erreur est survenue.';
}
