import { useEffect, useRef, useState } from 'react';
import { I } from '../config.js';
import Ic from './Icon.jsx';
import { searchPlaces } from '../lib/geocode.js';

/* Champ « nom ou adresse » avec suggestions, utilisé pour placer un lieu */
export default function AddressSearch({ onPick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const ctrl = useRef(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) { setResults([]); setState('idle'); return undefined; }
    const t = setTimeout(async () => {
      if (ctrl.current) ctrl.current.abort();
      ctrl.current = new AbortController();
      setState('loading');
      try { setResults(await searchPlaces(term, ctrl.current.signal)); setState('done'); }
      catch (e) { if (e.name !== 'AbortError') setState('error'); }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => () => ctrl.current && ctrl.current.abort(), []);

  return (
    <div className="addr">
      {(results.length > 0 || state === 'error' || (state === 'done' && !results.length)) && (
        <ul className="addr-list" role="listbox" aria-label="Suggestions">
          {state === 'error' && <li className="addr-msg">Recherche indisponible, touchez plutôt la carte.</li>}
          {state === 'done' && !results.length && <li className="addr-msg">Aucun résultat à Montréal.</li>}
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" className="addr-item" onClick={() => { onPick(r); setQ(''); setResults([]); setState('idle'); }}>
                <Ic d={I.pin} size={18} />
                <span><strong>{r.title}</strong>{r.sub && <small>{r.sub}</small>}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="search addr-input"><Ic d={I.search} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom du lieu ou adresse"
          aria-label="Chercher un lieu ou une adresse" autoComplete="off" enterKeyHint="search" />
        {state === 'loading' && <span className="addr-spin" aria-hidden="true" />}
      </label>
    </div>
  );
}
