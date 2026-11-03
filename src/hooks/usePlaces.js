import { useCallback, useEffect, useState } from 'react';
import { fetchPlaces } from '../lib/api.js';

const CACHE_KEY = 'carnet-mtl-cache-v2'; // à changer quand la forme des lieux change
const readCache = () => { try { const v = localStorage.getItem(CACHE_KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
const writeCache = (v) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch (e) { /* stockage plein ou bloqué */ } };

/* Lieux du carnet : affiche la dernière version connue tout de suite, puis rafraîchit. */
export function usePlaces() {
  const [places, setPlaces] = useState(() => readCache() || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPlaces();
      setPlaces(data);
      setError(null);
      writeCache(data);
      return data;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {});
    const onFocus = () => { if (document.visibilityState === 'visible') reload().catch(() => {}); };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [reload]);

  return { places, loading, error, reload };
}
