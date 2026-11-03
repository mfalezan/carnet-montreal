import { useMemo, useState } from 'react';
import { CATS, catColor, I } from '../config.js';
import Ic from './Icon.jsx';
import { errMsg, gmapsRouteUrl, norm, routeUrl } from '../lib/utils.js';

/* Étapes d'un parcours reliées à leurs lieux (les lieux supprimés disparaissent) */
export function routeStops(route, places) {
  const byId = {};
  places.forEach((p) => { byId[p.id] = p; });
  return route.stops.filter((s) => byId[s.placeId]).map((s, i) => ({ ...byId[s.placeId], n: i + 1, stopNote: s.note }));
}

const quartiers = (stops) => Array.from(new Set(stops.map((p) => p.quartier).filter(Boolean))).slice(0, 3).join(', ');

/* Fiche d'un parcours */
export function RouteSheet({ route, places, isEditor, onClose, onShowMap, onPick, onEdit, toast }) {
  const stops = routeStops(route, places);
  const walk = gmapsRouteUrl(stops);

  const share = async () => {
    const url = routeUrl(route);
    try {
      if (navigator.share) { await navigator.share({ title: route.title, text: route.title + ' — un parcours du Carnet de Montréal', url }); return; }
      await navigator.clipboard.writeText(route.title + ' — ' + url);
      toast('Lien copié');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast('Partage impossible depuis ce navigateur');
    }
  };

  return (
    <div className="sheet" role="dialog" aria-label={route.title}>
      <header className="hero route-hero">
        <div className="hero-btns">
          <button className="glass" type="button" aria-label="Fermer le parcours" onClick={onClose}><Ic d={I.back} /></button>
          <div className="row-btns" style={{ gap: '10px' }}>
            {isEditor && <button className="glass" type="button" aria-label="Modifier le parcours" onClick={onEdit}><Ic d={I.edit} /></button>}
            <button className="glass" type="button" aria-label="Partager le parcours" onClick={share}><Ic d={I.share} /></button>
          </div>
        </div>
        <span className="hero-mark"><Ic d={I.walk} size={200} sw={1.6} /></span>
        <p className="route-kicker">Parcours</p>
        <h2>{route.title}</h2>
        <p>{stops.length} étape{stops.length > 1 ? 's' : ''}{quartiers(stops) ? ' · ' + quartiers(stops) : ''}</p>
      </header>

      <div className="content">
        {route.desc && <p className="desc">{route.desc}</p>}
        <button className="pill" type="button" onClick={onShowMap} disabled={!stops.length}><Ic d={I.pin} /> Voir sur la carte</button>
        {walk && stops.length > 1 && (
          <a className="pill ghost" href={walk} target="_blank" rel="noopener noreferrer"><Ic d={I.walk} /> Itinéraire à pied{stops.length > 10 ? ' (10 premières étapes)' : ''}</a>
        )}

        <h3 className="h-sec">Les étapes</h3>
        {stops.length ? (
          <ol className="stops">
            {stops.map((p) => (
              <li key={p.id}>
                <button type="button" className="stop" onClick={() => onPick(p.id)}>
                  <span className="stop-n" style={{ '--c': catColor(p.cat) }}>{p.n}</span>
                  <span className="stop-body">
                    <span className="lname">{p.name}</span>
                    <span className="lmeta">{(CATS[p.cat] || {}).label} · {p.quartier}</span>
                    {p.stopNote && <span className="stop-note">{p.stopNote}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : <p className="muted">Ce parcours n'a pas encore d'étape.</p>}
      </div>
    </div>
  );
}

/* Créer ou modifier un parcours */
export function RouteEditSheet({ route, places, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(route ? route.title : '');
  const [desc, setDesc] = useState(route ? route.desc : '');
  const [stops, setStops] = useState(() => (route ? route.stops.filter((s) => places.some((p) => p.id === s.placeId)).map((s) => ({ ...s })) : []));
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(false);

  const byId = useMemo(() => { const m = {}; places.forEach((p) => { m[p.id] = p; }); return m; }, [places]);
  const inRoute = new Set(stops.map((s) => s.placeId));
  const nq = norm(q.trim());
  const candidates = places
    .filter((p) => !inRoute.has(p.id) && (!nq || norm(p.name + ' ' + p.quartier + ' ' + ((CATS[p.cat] || {}).label || '')).includes(nq)))
    .slice(0, 8);

  const move = (i, d) => setStops((s) => { const n = s.slice(); const j = i + d; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const setNote = (i, note) => setStops((s) => s.map((x, k) => (k === i ? { ...x, note } : x)));

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setErr('Donnez un titre au parcours.'); return; }
    if (!stops.length) { setErr('Ajoutez au moins une étape.'); return; }
    setBusy('save'); setErr('');
    try { await onSave({ id: route && route.id, title, desc, stops }); }
    catch (er) { setErr(errMsg(er)); setBusy(''); }
  };

  return (
    <div className="sheet" role="dialog" aria-label={route ? 'Modifier le parcours' : 'Nouveau parcours'}>
      <div className="sheet-bar">
        <h2>{route ? 'Modifier' : 'Nouveau parcours'}</h2>
        <button className="circle" type="button" aria-label="Fermer" onClick={onClose}><Ic d={I.close} /></button>
      </div>
      <div className="content">
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="r-title">Titre</label>
            <input id="r-title" type="text" value={title} placeholder="Ex. Un dimanche sur le Plateau" onChange={(e) => { setTitle(e.target.value); setErr(''); }} />
          </div>
          <div className="field">
            <label htmlFor="r-desc">Présentation</label>
            <textarea id="r-desc" rows="3" value={desc} placeholder="Pour qui, combien de temps, à quel moment" onChange={(e) => setDesc(e.target.value)} />
          </div>

          <div className="field">
            <span className="lbl">Étapes ({stops.length})</span>
            {stops.length ? (
              <ol className="stops edit">
                {stops.map((s, i) => {
                  const p = byId[s.placeId];
                  return (
                    <li key={s.placeId} className="stop-edit">
                      <div className="stop-row">
                        <span className="stop-n" style={{ '--c': catColor(p.cat) }}>{i + 1}</span>
                        <span className="stop-body"><span className="lname">{p.name}</span><span className="lmeta">{p.quartier}</span></span>
                        <span className="stop-tools">
                          <button type="button" className="mini" aria-label={'Monter ' + p.name} disabled={i === 0} onClick={() => move(i, -1)}><Ic d={I.up} size={18} /></button>
                          <button type="button" className="mini" aria-label={'Descendre ' + p.name} disabled={i === stops.length - 1} onClick={() => move(i, 1)}><Ic d={I.down} size={18} /></button>
                          <button type="button" className="mini" aria-label={'Retirer ' + p.name} onClick={() => setStops(stops.filter((_, k) => k !== i))}><Ic d={I.close} size={16} /></button>
                        </span>
                      </div>
                      <input type="text" className="stop-note-input" value={s.note} placeholder="Note pour cette étape (facultatif)"
                        aria-label={'Note pour ' + p.name} onChange={(e) => setNote(i, e.target.value)} />
                    </li>
                  );
                })}
              </ol>
            ) : <p className="muted" style={{ margin: 0 }}>Ajoutez des lieux ci-dessous, dans l'ordre de la balade.</p>}
          </div>

          <div className="subbox">
            <span className="lbl">Ajouter des lieux</span>
            <label className="search addr-input"><Ic d={I.search} />
              <input type="search" value={q} placeholder="Chercher dans le carnet" aria-label="Chercher un lieu à ajouter" onChange={(e) => setQ(e.target.value)} />
            </label>
            {candidates.length ? (
              <ul className="list">
                {candidates.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="lrow" onClick={() => { setStops(stops.concat([{ placeId: p.id, note: '' }])); setErr(''); }}>
                      <span className="lthumb" style={{ '--c': catColor(p.cat) }}><Ic d={I[p.cat]} size={22} /></span>
                      <span style={{ minWidth: 0 }}><span className="lname">{p.name}</span><span className="lmeta">{(CATS[p.cat] || {}).label} · {p.quartier}</span></span>
                      <Ic d={I.plus} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="muted" style={{ margin: 0 }}>{nq ? 'Aucun lieu ne correspond.' : 'Tous les lieux sont déjà dans le parcours.'}</p>}
          </div>

          {err && <p className="err" role="alert">{err}</p>}
          <button className="pill" type="submit" disabled={!!busy}>{busy === 'save' ? 'Enregistrement…' : route ? 'Enregistrer' : 'Créer le parcours'}</button>
          <button className="pill ghost" type="button" onClick={onClose}>Annuler</button>

          {route && (confirm ? (
            <div className="subbox">
              <p style={{ margin: 0 }}>Supprimer le parcours <strong>{route.title}</strong> ? Les lieux restent dans le carnet.</p>
              <button className="pill danger" type="button" disabled={!!busy}
                onClick={async () => { setBusy('delete'); try { await onDelete(route.id); } catch (er) { setErr(errMsg(er)); setBusy(''); } }}>
                {busy === 'delete' ? 'Suppression…' : 'Confirmer la suppression'}
              </button>
              <button className="pill ghost" type="button" onClick={() => setConfirm(false)}>Garder le parcours</button>
            </div>
          ) : (
            <button className="pill ghost" type="button" onClick={() => setConfirm(true)}><Ic d={I.trash} /> Supprimer ce parcours</button>
          ))}
        </form>
      </div>
    </div>
  );
}
