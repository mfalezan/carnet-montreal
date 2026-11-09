import { useCallback, useEffect, useState } from 'react';
import { fetchStays } from '../lib/api.js';

/* Visites prévues. Chargées seulement pour un éditeur (la base refuse les autres de toute façon).
   Pas de cache local : ces infos privées ne restent pas dans le navigateur. */
export function useStays(enabled) {
  const [stays, setStays] = useState([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStays();
      if (data === null) { setAvailable(false); setStays([]); return; }
      setAvailable(true);
      setStays(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (enabled) reload().catch(() => {});
    else setStays([]);
  }, [enabled, reload]);

  return { stays, available, loading, reload };
}
