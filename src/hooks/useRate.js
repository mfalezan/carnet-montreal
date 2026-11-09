import { useCallback, useEffect, useState } from 'react';

/* Taux $ CA -> € de la Banque centrale européenne, via Frankfurter (gratuit, sans clé).
   Mis en cache dans le navigateur : l'app garde le dernier taux connu hors connexion. */
const KEY = 'carnet-mtl-rate-v1';
const MAX_AGE = 6 * 60 * 60 * 1000; // on redemande au plus toutes les 6 h

const read = () => { try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* stockage bloqué */ } };

async function fetchRate() {
  try { // API v2
    const r = await fetch('https://api.frankfurter.dev/v2/rate/CAD/EUR');
    if (r.ok) {
      const j = await r.json();
      if (typeof j.rate === 'number') return { rate: j.rate, date: j.date || null };
    }
  } catch (e) { /* on essaie la v1 */ }
  const r = await fetch('https://api.frankfurter.dev/v1/latest?base=CAD&symbols=EUR');
  if (!r.ok) throw new Error('Taux indisponible');
  const j = await r.json();
  if (!j.rates || typeof j.rates.EUR !== 'number') throw new Error('Taux indisponible');
  return { rate: j.rates.EUR, date: j.date || null };
}

export function useRate() {
  const [state, setState] = useState(() => ({ ...(read() || {}), loading: false, error: false }));

  const refresh = useCallback(async (force) => {
    const cur = read();
    if (!force && cur && Date.now() - cur.fetchedAt < MAX_AGE) return;
    setState((s) => ({ ...s, loading: true, error: false }));
    try {
      const v = { ...(await fetchRate()), fetchedAt: Date.now() };
      write(v);
      setState({ ...v, loading: false, error: false });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, []);

  useEffect(() => { refresh(false); }, [refresh]);
  return { rate: state.rate || null, date: state.date || null, loading: state.loading, error: state.error, refresh };
}
