import { useEffect, useId, useMemo } from 'react';
import { CATS, catColor, SEASONS, LINES, WHO, I, PRICES, TAGS, REGIONS } from '../config.js';
import Ic from './Icon.jsx';
import { today } from '../lib/utils.js';

export const newVisit = (who = 'deux') => ({ d: today(), who, love: false, note: '' });

export function VisitFields({ v, set }) {
  const id = useId();
  return (
    <>
      <div className="field">
        <label htmlFor={id + 'd'}>Date</label>
        <input id={id + 'd'} type="date" value={v.d} max={today()} onChange={(e) => set({ ...v, d: e.target.value })} required />
      </div>
      <div className="field">
        <span className="lbl">Qui</span>
        <div className="opts">
          {Object.entries(WHO).map(([k, l]) => (
            <button type="button" key={k} className="chip" aria-pressed={v.who === k} onClick={() => set({ ...v, who: k })}>{l}</button>
          ))}
        </div>
      </div>
      <label className="check">
        <input type="checkbox" checked={v.love} onChange={(e) => set({ ...v, love: e.target.checked })} /> Coup de cœur
      </label>
      <div className="field">
        <label htmlFor={id + 'n'}>Notre avis</label>
        <textarea id={id + 'n'} rows="3" value={v.note} placeholder="Ce qu'on a pris, l'ambiance, le bon moment pour y aller"
          onChange={(e) => set({ ...v, note: e.target.value })} />
      </div>
    </>
  );
}

export function PlaceFields({ f, set }) {
  const id = useId();
  const toggleTag = (t) => set({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : f.tags.concat([t]) });
  const toggleLine = (l) => set({ ...f, metroLines: f.metroLines.includes(l) ? f.metroLines.filter((x) => x !== l) : f.metroLines.concat([l]) });
  return (
    <>
      <div className="field">
        <label htmlFor={id + 'name'}>Nom</label>
        <input id={id + 'name'} type="text" value={f.name} placeholder="Ex. Café Olimpico" autoComplete="off" onChange={(e) => set({ ...f, name: e.target.value })} />
      </div>
      <div className="field">
        <span className="lbl">Catégorie</span>
        <div className="opts">
          {Object.entries(CATS).map(([k, c]) => (
            <button type="button" key={k} className="chip" aria-pressed={f.cat === k} onClick={() => set({ ...f, cat: k })}>
              <span className="sw" style={{ '--c': catColor(k) }} />{c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="lbl">Prix</span>
        <div className="opts">
          {Object.entries(PRICES).map(([k, l]) => (
            <button type="button" key={k} className="chip" aria-pressed={f.price === Number(k)} onClick={() => set({ ...f, price: f.price === Number(k) ? null : Number(k) })}>{l}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="lbl">Étiquettes</span>
        <div className="opts">
          {Object.entries(TAGS).map(([k, l]) => (
            <button type="button" key={k} className="chip" aria-pressed={f.tags.includes(k)} onClick={() => toggleTag(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor={id + 'r'}>Région</label>
        <input id={id + 'r'} type="text" list={id + 'rl'} value={f.region} placeholder="Montréal" autoComplete="off"
          onChange={(e) => set({ ...f, region: e.target.value })} />
        <datalist id={id + 'rl'}>{REGIONS.map((r) => <option key={r} value={r} />)}</datalist>
        <div className="opts">
          {REGIONS.slice(0, 4).map((r) => (
            <button type="button" key={r} className="chip" aria-pressed={f.region === r} onClick={() => set({ ...f, region: r })}>{r}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor={id + 'q'}>{f.region && f.region !== 'Montréal' ? 'Ville ou village' : 'Quartier'}</label>
        <input id={id + 'q'} type="text" value={f.quartier} placeholder={f.region && f.region !== 'Montréal' ? 'Ex. Mont-Tremblant' : 'Ex. Mile End'} onChange={(e) => set({ ...f, quartier: e.target.value })} />
      </div>
      <div className="field">
        <span className="lbl">Saison</span>
        <div className="opts">
          {Object.entries(SEASONS).map(([k, l]) => (
            <button type="button" key={k} className="chip" aria-pressed={f.season === k} onClick={() => set({ ...f, season: k })}>{l}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor={id + 'm'}>Métro le plus proche</label>
        <input id={id + 'm'} type="text" value={f.metroStation} placeholder="Ex. Laurier" onChange={(e) => set({ ...f, metroStation: e.target.value })} />
        <div className="opts" aria-label="Lignes de métro">
          {Object.entries(LINES).map(([l, color]) => (
            <button type="button" key={l} className="chip" aria-pressed={f.metroLines.includes(l)} onClick={() => toggleLine(l)}>
              <span className="sw" style={{ '--c': color }} />Ligne {l}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor={id + 'd'}>Description</label>
        <textarea id={id + 'd'} rows="3" value={f.desc} placeholder="Ce que c'est, pourquoi on le conseille" onChange={(e) => set({ ...f, desc: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor={id + 'a'}>Adresse</label>
        <input id={id + 'a'} type="text" value={f.address} placeholder="Facultatif" autoComplete="off" onChange={(e) => set({ ...f, address: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor={id + 'l'}>Site ou réseau social</label>
        <input id={id + 'l'} type="text" inputMode="url" autoCapitalize="none" value={f.link} placeholder="Facultatif" autoComplete="off" onChange={(e) => set({ ...f, link: e.target.value })} />
      </div>
    </>
  );
}

/* Choix de photos avec aperçu avant envoi */
export function PhotoPicker({ files, setFiles }) {
  const id = useId();
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  return (
    <div className="field">
      <span className="lbl">Photos</span>
      {files.length > 0 && (
        <div className="picker">
          {previews.map((u, i) => (
            <div key={u} className="picker-item">
              <img src={u} alt={'Photo ' + (i + 1)} />
              <button type="button" className="picker-x" aria-label="Retirer cette photo" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                <Ic d={I.close} size={14} sw={2.6} />
              </button>
            </div>
          ))}
        </div>
      )}
      <label htmlFor={id} className="pill ghost file-btn">
        <Ic d={I.camera} /> {files.length ? 'Ajouter d’autres photos' : 'Prendre ou choisir des photos'}
      </label>
      <input id={id} type="file" accept="image/*" multiple className="sr-only"
        onChange={(e) => { const list = Array.from(e.target.files || []); if (list.length) setFiles(files.concat(list)); e.target.value = ''; }} />
    </div>
  );
}
