import { useCallback, useEffect, useState } from 'react';
import { fetchRoutes } from '../lib/api.js';

const CACHE_KEY = 'carnet-mtl-routes-v1';
const readCache = () => { try { const v = localStorage.getItem(CACHE_KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
const writeCache = (v) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch (e) { /* stockage plein ou bloqué */ } };

/* Parcours du carnet. available = false tant que la migration 003 n'est pas faite. */
export function useRoutes() {
  const [routes, setRoutes] = useState(() => readCache() || []);
  const [available, setAvailable] = useState(true);

  const reload = useCallback(async () => {
    const data = await fetchRoutes();
    if (data === null) { setAvailable(false); setRoutes([]); return []; }
    setAvailable(true);
    setRoutes(data);
    writeCache(data);
    return data;
  }, []);

  useEffect(() => { reload().catch(() => {}); }, [reload]);
  return { routes, available, reload };
}
