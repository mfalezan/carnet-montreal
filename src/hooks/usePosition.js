import { useEffect, useRef, useState } from 'react';
import { distance } from '../lib/geo.js';

/* Position de l'utilisateur, suivie tant que « Autour de moi » est actif.
   Les petits déplacements (< 30 m) sont ignorés pour ne pas réordonner la liste sans arrêt. */
export function usePosition() {
  const [pos, setPos] = useState(null);
  const watch = useRef(null);
  const last = useRef(null);

  const update = (v) => {
    if (last.current && distance(last.current, v) < 30) return;
    last.current = v;
    setPos(v);
  };

  const stop = () => {
    if (watch.current != null && navigator.geolocation) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
  };

  const start = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Localisation indisponible sur cet appareil')); return; }
    navigator.geolocation.getCurrentPosition((p) => {
      const v = { lat: p.coords.latitude, lng: p.coords.longitude };
      last.current = v;
      setPos(v);
      resolve(v);
      if (watch.current == null) {
        watch.current = navigator.geolocation.watchPosition(
          (q) => update({ lat: q.coords.latitude, lng: q.coords.longitude }),
          () => {}, { enableHighAccuracy: true, maximumAge: 15000 });
      }
    }, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  });

  useEffect(() => stop, []);
  return { pos, start, stop, update };
}
