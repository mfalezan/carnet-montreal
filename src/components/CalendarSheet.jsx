import { useMemo, useState } from 'react';
import { I } from '../config.js';
import Ic from './Icon.jsx';
import { errMsg, today } from '../lib/utils.js';

/* Calendrier des visites : réservé à Matthieu et Azéline. */

const COLORS = ['var(--c-food)', 'var(--c-view)', 'var(--c-culture)', 'var(--c-park)', 'var(--c-night)'];
const colorOf = (id) => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const nights = (st) => Math.round((parse(st.end) - parse(st.start)) / 86400000);
const day = (s, withYear) => parse(s).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
export const fmtStay = (st) => {
  const y = parse(st.start).getFullYear() !== new Date().getFullYear();
  if (st.start === st.end) return 'le ' + day(st.start, y);
  return 'du ' + day(st.start, false) + ' au ' + day(st.end, y);
};
const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function StayForm({ stay, onCancel, onSave, onDelete }) {
  const [f, setF] = useState(stay);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(false);
  const set = (k, v) => { setErr(''); setF((x) => { const n = { ...x, [k]: v }; if (k === 'start' && n.end < v) n.end = v; return n; }); };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.guests.trim()) { setErr('Indiquez qui vient.'); return; }
    if (!f.start || !f.end) { setErr('Indiquez les dates.'); return; }
    if (f.end < f.start) { setErr('Le départ doit être après l’arrivée.'); return; }
    setBusy('save');
    try { await onSave(f); } catch (er) { setErr(errMsg(er)); setBusy(''); }
  };

  return (
    <form className="subbox" onSubmit={submit}>
      <p className="lbl" style={{ margin: 0 }}>{f.id ? 'Modifier la visite' : 'Nouvelle visite'}</p>
      <div className="field">
        <label htmlFor="st-g">Qui vient</label>
        <input id="st-g" type="text" value={f.guests} placeholder="Ex. Papa et Maman" onChange={(e) => set('guests', e.target.value)} autoComplete="off" />
      </div>
      <div className="st-dates">
        <div className="field"><label htmlFor="st-s">Arrivée</label><input id="st-s" type="date" value={f.start} onChange={(e) => set('start', e.target.value)} /></div>
        <div className="field"><label htmlFor="st-e">Départ</label><input id="st-e" type="date" value={f.end} min={f.start} onChange={(e) => set('end', e.target.value)} /></div>
      </div>
      <div className="field">
        <label htmlFor="st-n">Note</label>
        <textarea id="st-n" rows="2" value={f.note} placeholder="Vol, chambre d'amis, idées de sorties…" onChange={(e) => set('note', e.target.value)} />
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="pill" type="submit" disabled={!!busy}>{busy === 'save' ? 'Enregistrement…' : f.id ? 'Enregistrer' : 'Ajouter au calendrier'}</button>
      <button className="pill ghost" type="button" onClick={onCancel}>Annuler</button>
      {f.id && (confirm ? (
        <button className="pill danger" type="button" disabled={!!busy}
          onClick={async () => { setBusy('del'); try { await onDelete(f.id); } catch (er) { setErr(errMsg(er)); setBusy(''); } }}>
          {busy === 'del' ? 'Suppression…' : 'Confirmer la suppression'}
        </button>
      ) : <button className="pill ghost" type="button" onClick={() => setConfirm(true)}><Ic d={I.trash} /> Supprimer cette visite</button>)}
    </form>
  );
}

export default function CalendarSheet({ cal, onSave, onDelete, onClose, toast }) {
  const now = today();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState(now);
  const [form, setForm] = useState(null);
  const [showPast, setShowPast] = useState(false);

  /* Semaines du mois affiché, du lundi au dimanche */
  const weeks = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first); start.setDate(1 - offset);
    const out = [];
    for (let w = 0; w < 6; w++) {
      const row = [];
      for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + w * 7 + i); row.push(d); }
      if (w > 3 && row[0].getMonth() !== month.getMonth()) break;
      out.push(row);
    }
    return out;
  }, [month]);

  const on = (s) => cal.stays.filter((st) => st.start <= s && st.end >= s);

  /* Chaque visite garde la même ligne d'un jour à l'autre (3 lignes au plus) */
  const lanes = useMemo(() => {
    const ends = [], m = {};
    cal.stays.slice().sort((a, b) => a.start.localeCompare(b.start)).forEach((st) => {
      let l = ends.findIndex((e) => e < st.start);
      if (l === -1) { l = ends.length; ends.push(st.end); } else ends[l] = st.end;
      m[st.id] = l;
    });
    return m;
  }, [cal.stays]);
  const upcoming = cal.stays.filter((st) => st.end >= now);
  const past = cal.stays.filter((st) => st.end < now).reverse();
  const selStays = on(sel);
  const shift = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  const save = async (st) => { await onSave(st); setForm(null); goTo(st.start); toast(st.id ? 'Visite modifiée' : 'Visite ajoutée'); };
  const del = async (id) => { await onDelete(id); setForm(null); toast('Visite supprimée'); };
  const goTo = (s) => { setSel(s); setMonth(new Date(parse(s).getFullYear(), parse(s).getMonth(), 1)); };
  const edit = (st) => { setForm({ ...st }); goTo(st.start); };

  const StayRow = ({ st }) => (
    <li>
      <button type="button" className="stay" onClick={() => edit(st)}>
        <span className="stay-bar" style={{ background: colorOf(st.id) }} />
        <span className="stay-body">
          <b>{st.guests}</b>
          <small>{fmtStay(st)}{nights(st) > 0 ? ' · ' + nights(st) + ' nuit' + (nights(st) > 1 ? 's' : '') : ''}{st.start <= now && st.end >= now ? ' · en ce moment' : ''}</small>
          {st.note && <span className="stay-note">{st.note}</span>}
        </span>
        <Ic d={I.edit} size={18} />
      </button>
    </li>
  );

  return (
    <div className="sheet" role="dialog" aria-label="Calendrier des visites">
      <div className="sheet-bar">
        <h2>Visites</h2>
        <button className="circle" type="button" aria-label="Fermer" onClick={onClose}><Ic d={I.close} /></button>
      </div>
      <div className="content">
        {!cal.available ? (
          <p className="err">Le calendrier n'est pas encore activé : exécutez supabase/migrations/005_calendrier.sql dans Supabase.</p>
        ) : (<>
          <p className="muted" style={{ margin: 0 }}><Ic d={I.lock} size={14} /> Visible seulement par Matthieu et Azéline.</p>

          <div className="cal">
            <div className="cal-head">
              <button type="button" className="mini" aria-label="Mois précédent" onClick={() => shift(-1)}><Ic d={I.back} size={18} /></button>
              <b>{month.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })}</b>
              <button type="button" className="mini flip" aria-label="Mois suivant" onClick={() => shift(1)}><Ic d={I.back} size={18} /></button>
            </div>
            <div className="cal-grid" role="grid">
              {WEEK.map((w, i) => <span key={i} className="cal-wd" aria-hidden="true">{w}</span>)}
              {weeks.flat().map((d) => {
                const s = iso(d), list = on(s);
                const out = d.getMonth() !== month.getMonth();
                return (
                  <button key={s} type="button" role="gridcell" aria-selected={s === sel}
                    className={'cal-day' + (out ? ' out' : '') + (s === now ? ' today' : '') + (s === sel ? ' sel' : '')}
                    aria-label={d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' }) + (list.length ? ' : ' + list.map((x) => x.guests).join(', ') : '')}
                    onClick={() => setSel(s)}>
                    <span className="cal-n">{d.getDate()}</span>
                    <span className="cal-bars">
                      {[0, 1, 2].map((l) => {
                        const st = list.find((x) => lanes[x.id] === l);
                        if (!st) return list.some((x) => lanes[x.id] > l) ? <span key={l} className="cal-bar" /> : null;
                        return <span key={l} className={'cal-bar' + (st.start === s ? ' first' : '') + (st.end === s ? ' last' : '')} style={{ background: colorOf(st.id) }} />;
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cal-sel">
            <p className="lbl" style={{ margin: 0 }}>{parse(sel).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            {selStays.length ? <ul className="stays">{selStays.map((st) => <StayRow key={st.id} st={st} />)}</ul>
              : <p className="muted" style={{ margin: 0 }}>Personne de prévu ce jour-là.</p>}
          </div>

          {form ? (
            <StayForm key={form.id || 'new'} stay={form} onCancel={() => setForm(null)} onSave={save} onDelete={del} />
          ) : (
            <button className="pill" type="button" onClick={() => setForm({ guests: '', start: sel < now ? now : sel, end: addDays(sel < now ? now : sel, 3), note: '' })}>
              <Ic d={I.plus} /> Ajouter une visite{sel >= now ? ' le ' + day(sel) : ''}
            </button>
          )}

          <h3 className="h-sec">À venir</h3>
          {cal.loading && !cal.stays.length ? <p className="muted">Chargement…</p>
            : upcoming.length ? <ul className="stays">{upcoming.map((st) => <StayRow key={st.id} st={st} />)}</ul>
            : <p className="muted">Aucune visite prévue pour l'instant.</p>}

          {past.length > 0 && (
            <>
              <button type="button" className="link-btn" onClick={() => setShowPast(!showPast)}>{showPast ? 'Masquer' : 'Voir'} les visites passées ({past.length})</button>
              {showPast && <ul className="stays past">{past.map((st) => <StayRow key={st.id} st={st} />)}</ul>}
            </>
          )}
        </>)}
      </div>
    </div>
  );
}
