/* Distance à vol d'oiseau, en mètres */
export function distance(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function fmtDist(m) {
  if (m == null) return '';
  if (m < 1000) return Math.max(50, Math.round(m / 50) * 50) + ' m';
  if (m < 10000) return (m / 1000).toFixed(1).replace('.', ',') + ' km';
  return Math.round(m / 1000) + ' km';
}
