import { useEffect, useState } from 'react';
import { I } from '../config.js';
import Ic from './Icon.jsx';
import { PlaceFields, VisitFields, PhotoPicker, newVisit } from './Forms.jsx';
import { emptyPlaceForm, placeToForm } from '../lib/api.js';
import { errMsg, fmtCoord } from '../lib/utils.js';

/* Complète les champs encore vides avec une adresse trouvée par la recherche */
function useFillFrom(prefill, setF, fields) {
  useEffect(() => {
    if (!prefill) return;
    setF((f) => {
      const n = { ...f };
      fields.forEach(([k, v]) => { if (!String(n[k] || '').trim() && prefill[v]) n[k] = prefill[v]; });
      if (prefill.region) n.region = prefill.region; // la région suit toujours l'adresse choisie
      return n;
    });
  }, [prefill]); // eslint-disable-line react-hooks/exhaustive-deps
}

function PositionRow({ pos, onMove }) {
  return (
    <div className="row-btns">
      <span className="muted">Position <span className="coords">{fmtCoord(pos.lat, pos.lng)}</span></span>
      <button type="button" className="chip" onClick={onMove}><Ic d={I.pin} size={16} /> Déplacer le point</button>
    </div>
  );
}

/* Nouveau lieu. Reste monté (caché) pendant qu'on déplace le point, pour garder la saisie. */
export function AddSheet({ pos, prefill, hidden, defaultWho, onClose, onMove, onSave }) {
  const [f, setF] = useState(emptyPlaceForm);
  const [tested, setTested] = useState(true);
  const [v, setV] = useState(() => newVisit(defaultWho));
  const [files, setFiles] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  useFillFrom(prefill, setF, [['name', 'name'], ['address', 'address'], ['quartier', 'quartier']]);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) { setErr("Donnez un nom au lieu pour l'enregistrer."); return; }
    setErr('');
    setBusy('Enregistrement…');
    try {
      await onSave({ form: f, pos, visit: tested ? v : null, files }, (n, total) => setBusy('Envoi des photos ' + n + '/' + total + '…'));
    } catch (er) {
      setErr(errMsg(er));
      setBusy('');
    }
  };

  return (
    <div className="sheet" role="dialog" aria-label="Nouveau lieu" hidden={hidden}>
      <div className="sheet-bar">
        <h2>Nouveau lieu</h2>
        <button className="circle" type="button" aria-label="Fermer" onClick={onClose}><Ic d={I.close} /></button>
      </div>
      <div className="content">
        <form onSubmit={submit}>
          <PositionRow pos={pos} onMove={onMove} />
          <PlaceFields f={f} set={(x) => { setF(x); setErr(''); }} />
          <PhotoPicker files={files} setFiles={setFiles} />
          <label className="check">
            <input type="checkbox" checked={tested} onChange={(e) => setTested(e.target.checked)} /> On l'a déjà testé
          </label>
          {tested && <div className="subbox"><VisitFields v={v} set={setV} /></div>}
          {err && <p className="err" role="alert">{err}</p>}
          <button className="pill" type="submit" disabled={!!busy}>{busy || 'Ajouter au carnet'}</button>
        </form>
      </div>
    </div>
  );
}

/* Modifier un lieu existant */
export function EditSheet({ place, pos, prefill, hidden, onClose, onMove, onSave }) {
  const [f, setF] = useState(() => placeToForm(place));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useFillFrom(prefill, setF, [['address', 'address'], ['quartier', 'quartier']]);
  const moved = pos.lat !== place.lat || pos.lng !== place.lng;

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) { setErr('Le lieu doit garder un nom.'); return; }
    setBusy(true);
    try { await onSave(f, moved ? pos : null); }
    catch (er) { setErr(errMsg(er)); setBusy(false); }
  };

  return (
    <div className="sheet" role="dialog" aria-label={'Modifier ' + place.name} hidden={hidden}>
      <div className="sheet-bar">
        <h2>Modifier</h2>
        <button className="circle" type="button" aria-label="Fermer" onClick={onClose}><Ic d={I.close} /></button>
      </div>
      <div className="content">
        <form onSubmit={submit}>
          <PositionRow pos={pos} onMove={onMove} />
          {moved && <p className="muted" style={{ margin: 0 }}>Nouvelle position, enregistrée à la validation.</p>}
          <PlaceFields f={f} set={(x) => { setF(x); setErr(''); }} />
          {err && <p className="err" role="alert">{err}</p>}
          <button className="pill" type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
          <button className="pill ghost" type="button" onClick={onClose}>Annuler</button>
        </form>
      </div>
    </div>
  );
}
