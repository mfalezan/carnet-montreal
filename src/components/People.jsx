import { useEffect, useMemo, useRef, useState } from 'react';
import { CATS, catColor, I } from '../config.js';
import Ic from './Icon.jsx';
import { errMsg, where } from '../lib/utils.js';

/* « Léa, Hugo et 2 autres » */
export const nameList = (list, max = 2) => {
  if (!list.length) return '';
  if (list.length <= max + 1) return list.length === 1 ? list[0] : list.slice(0, -1).join(', ') + ' et ' + list[list.length - 1];
  return list.slice(0, max).join(', ') + ' et ' + (list.length - max) + ' autres';
};

/* Demande du prénom, la première fois qu'on aime, coche ou commente un lieu */
export function NamePrompt({ onSubmit, onClose, onLogin }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  useEffect(() => { if (input.current) input.current.focus(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr('Écrivez votre prénom.'); return; }
    setBusy(true); setErr('');
    try { await onSubmit(name.trim().slice(0, 40)); }
    catch (er) { setErr(errMsg(er)); setBusy(false); }
  };

  return (
    <div className="prompt-wrap" role="dialog" aria-modal="true" aria-label="Votre prénom" onClick={onClose}>
      <form className="prompt" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <h2 className="prompt-t">Votre prénom ?</h2>
        <p className="muted" style={{ margin: 0 }}>Pour que chacun voie qui aime quoi. Pas de mot de passe : ce téléphone s'en souviendra.</p>
        <input ref={input} type="text" value={name} maxLength={40} autoComplete="given-name" placeholder="Ex. Léa" aria-label="Prénom"
          onChange={(e) => { setName(e.target.value); setErr(''); }} />
        {err && <p className="err" role="alert">{err}</p>}
        <button className="pill" type="submit" disabled={busy}>{busy ? 'Un instant…' : "C'est moi"}</button>
        <button className="pill ghost" type="button" onClick={onClose}>Plus tard</button>
        {onLogin && <p className="muted small-print" style={{ margin: 0, textAlign: 'center' }}>Vous êtes Matthieu ou Azéline ? <button type="button" className="link-btn" onClick={onLogin}>Connexion</button></p>}
      </form>
    </div>
  );
}

/* J'aime, À faire, Fait sur la fiche d'un lieu */
export function ReactionBar({ p, people, onReact }) {
  const mine = p.mine || {};
  const likers = p.reactions.filter((r) => r.liked).map((r) => people.names[r.user_id]).filter(Boolean);
  const doers = p.reactions.filter((r) => r.status === 'fait').map((r) => people.names[r.user_id]).filter(Boolean);
  const todo = p.reactions.filter((r) => r.status === 'a_faire').length;
  const lines = [
    likers.length ? 'Aimé par ' + nameList(likers) : '',
    doers.length ? 'Fait par ' + nameList(doers) : '',
    todo ? todo + ' personne' + (todo > 1 ? 's l’ont' : ' l’a') + ' sur sa liste' : '',
  ].filter(Boolean);

  return (
    <div className="react">
      <div className="react-btns" role="group" aria-label="Votre avis sur ce lieu">
        <button type="button" className={'react-btn like' + (mine.liked ? ' on' : '')} aria-pressed={!!mine.liked} onClick={() => onReact({ liked: !mine.liked })}>
          <Ic d={I.heart} size={19} fill={!!mine.liked} /> J'aime{likers.length ? <span className="react-n">{likers.length}</span> : null}
        </button>
        <button type="button" className={'react-btn' + (mine.status === 'a_faire' ? ' on' : '')} aria-pressed={mine.status === 'a_faire'}
          onClick={() => onReact({ status: mine.status === 'a_faire' ? null : 'a_faire' })}>
          <Ic d={I.bookmark} size={18} fill={mine.status === 'a_faire'} /> À faire
        </button>
        <button type="button" className={'react-btn' + (mine.status === 'fait' ? ' on' : '')} aria-pressed={mine.status === 'fait'}
          onClick={() => onReact({ status: mine.status === 'fait' ? null : 'fait' })}>
          <Ic d={I.check} size={18} sw={2.6} /> Fait
        </button>
      </div>
      {lines.length > 0 && <p className="react-who">{lines.join(' · ')}</p>}
    </div>
  );
}

/* « Ma liste » : prénom, et les lieux aimés, à faire, faits */
export function ProfileSheet({ people, places, auth, onClose, onPick, onIdentify, onLogin, toast }) {
  const me = people.me;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me ? me.name : '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr('Écrivez votre prénom.'); return; }
    setBusy(true); setErr('');
    try { await onIdentify(name.trim().slice(0, 40)); setEditing(false); toast(me ? 'Prénom modifié' : 'Bienvenue ' + name.trim() + ' !'); }
    catch (er) { setErr(errMsg(er)); }
    finally { setBusy(false); }
  };

  const mineOf = (f) => places.filter((p) => p.mine && f(p.mine));
  const groups = [
    ['À faire', mineOf((m) => m.status === 'a_faire')],
    ['Fait', mineOf((m) => m.status === 'fait')],
    ["J'aime", mineOf((m) => m.liked)],
  ];

  return (
    <div className="sheet" role="dialog" aria-label="Ma liste">
      <div className="sheet-bar">
        <h2>Ma liste</h2>
        <button className="circle" type="button" aria-label="Fermer" onClick={onClose}><Ic d={I.close} /></button>
      </div>
      <div className="content">
        {!people.available ? (
          <p className="err">Les avis par personne ne sont pas encore activés : exécutez supabase/migrations/006_personnes.sql dans Supabase.</p>
        ) : (!me || editing) ? (
          <form onSubmit={save}>
            {!me && <p className="desc">Choisissez votre prénom pour aimer des lieux, garder votre liste « à faire » et cocher ce que vous avez fait. Pas de mot de passe : ce téléphone s'en souviendra.</p>}
            <div className="field">
              <label htmlFor="me-name">Prénom</label>
              <input id="me-name" type="text" value={name} maxLength={40} autoComplete="given-name" placeholder="Ex. Léa" onChange={(e) => { setName(e.target.value); setErr(''); }} />
            </div>
            {err && <p className="err" role="alert">{err}</p>}
            <button className="pill" type="submit" disabled={busy}>{busy ? 'Un instant…' : me ? 'Enregistrer' : "C'est moi"}</button>
            {me && <button className="pill ghost" type="button" onClick={() => { setEditing(false); setName(me.name); }}>Annuler</button>}
          </form>
        ) : (
          <>
            <div className="me-card">
              <span className="me-avatar" aria-hidden="true">{me.name.slice(0, 1).toUpperCase()}</span>
              <span className="me-txt"><b>{me.name}</b><small>{auth.isEditor ? 'Éditeur du carnet' : 'Sur ce téléphone'}</small></span>
              {!auth.isEditor && <button type="button" className="chip" onClick={() => setEditing(true)}><Ic d={I.edit} size={15} /> Modifier</button>}
            </div>
            {groups.map(([title, list]) => (
              <section key={title}>
                <h3 className="h-sec">{title} <span className="h-n">{list.length}</span></h3>
                {list.length ? (
                  <ul className="list">
                    {list.map((p) => (
                      <li key={p.id}>
                        <button type="button" className="lrow" onClick={() => onPick(p.id)}>
                          <span className="lthumb" style={{ '--c': catColor(p.cat) }}>{p.cover ? <img src={p.cover.thumb} alt="" loading="lazy" /> : <Ic d={I[p.cat]} size={24} />}</span>
                          <span style={{ minWidth: 0 }}><span className="lname">{p.name}</span><span className="lmeta">{(CATS[p.cat] || {}).label} · {where(p)}</span></span>
                          <span className="go"><Ic d={I.back} size={18} /></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="muted" style={{ margin: 0 }}>{title === 'À faire' ? 'Touchez « À faire » sur une fiche pour la garder ici.' : title === 'Fait' ? 'Rien de coché pour l’instant.' : 'Aucun lieu aimé pour l’instant.'}</p>}
              </section>
            ))}
            {me.anonymous && (
              <div className="subbox" style={{ marginTop: 18 }}>
                <p className="muted" style={{ margin: 0 }}>Votre prénom et votre liste sont liés à ce navigateur. Si vous effacez ses données ou changez de téléphone, ils seront perdus.</p>
                {confirm ? (
                  <button className="pill danger" type="button" onClick={async () => { await people.forget(); toast('Prénom oublié sur ce téléphone'); onClose(); }}>Confirmer : oublier {me.name}</button>
                ) : <button className="pill ghost" type="button" onClick={() => setConfirm(true)}>Ce n'est pas moi / oublier ce prénom</button>}
              </div>
            )}
          </>
        )}
        {!auth.isEditor && <p className="muted small-print" style={{ marginTop: 16 }}>Vous êtes Matthieu ou Azéline ? <button type="button" className="link-btn" onClick={onLogin}>Connexion</button></p>}
      </div>
    </div>
  );
}

const ago = (iso) => {
  const d = new Date(iso), diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return 'il y a ' + Math.floor(diff / 60) + ' min';
  if (diff < 86400) return 'il y a ' + Math.floor(diff / 3600) + ' h';
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('fr-CA', opts);
};

/* Commentaires d'un lieu : chacun sous son prénom, avec une photo s'il veut */
export function Comments({ p, people, isEditor, onComment, onDelete, onZoom }) {
  const list = people.comments.filter((c) => c.placeId === p.id);
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim() && !file) { setErr('Écrivez quelque chose ou ajoutez une photo.'); return; }
    setBusy(true); setErr('');
    try { await onComment(body, file); setBody(''); setFile(null); }
    catch (er) { setErr(errMsg(er)); }
    finally { setBusy(false); }
  };

  return (
    <div className="comments">
      <form className="composer" onSubmit={submit}>
        <span className="me-avatar sm" aria-hidden="true">{people.me ? people.me.name.slice(0, 1).toUpperCase() : '?'}</span>
        <div className="composer-main">
          <textarea rows="2" value={body} maxLength={1000} aria-label="Votre commentaire"
            placeholder={people.me ? 'Un conseil, une anecdote, ' + people.me.name + ' ?' : 'Un conseil, une anecdote ?'}
            onChange={(e) => { setBody(e.target.value); setErr(''); }} />
          {preview && (
            <div className="picker-item composer-photo">
              <img src={preview} alt="Photo à publier" />
              <button type="button" className="picker-x" aria-label="Retirer la photo" onClick={() => setFile(null)}><Ic d={I.close} size={14} sw={2.6} /></button>
            </div>
          )}
          {err && <p className="err" role="alert">{err}</p>}
          <div className="composer-tools">
            <button type="button" className="chip" onClick={() => fileRef.current && fileRef.current.click()}><Ic d={I.camera} size={16} /> {file ? 'Changer la photo' : 'Photo'}</button>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true"
              onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) { setFile(f); setErr(''); } }} />
            <button type="submit" className="pill composer-send" disabled={busy || (!body.trim() && !file)}>{busy ? 'Envoi…' : 'Publier'}</button>
          </div>
        </div>
      </form>

      {list.length > 0 ? (
        <ul className="clist">
          {list.map((c) => {
            const name = people.names[c.userId] || 'Quelqu’un';
            const mine = people.me && people.me.id === c.userId;
            return (
              <li key={c.id} className="citem">
                <span className="me-avatar sm" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
                <div className="cbody">
                  <p className="chead"><b>{name}</b> <span>{ago(c.at)}</span></p>
                  {c.body && <p className="ctext">{c.body}</p>}
                  {c.photo && (
                    <button type="button" className="cphoto" onClick={() => onZoom(c.photo.url)} aria-label={'Agrandir la photo de ' + name}>
                      <img src={c.photo.thumb} alt="" loading="lazy" />
                    </button>
                  )}
                  {(mine || isEditor) && (confirm === c.id ? (
                    <span className="row-btns" style={{ gap: 12 }}>
                      <button type="button" className="link-btn" onClick={async () => { try { await onDelete(c); } catch (er) { setErr(errMsg(er)); } setConfirm(null); }}>Confirmer la suppression</button>
                      <button type="button" className="link-btn muted-link" onClick={() => setConfirm(null)}>Annuler</button>
                    </span>
                  ) : <button type="button" className="link-btn muted-link" onClick={() => setConfirm(c.id)}>Supprimer</button>)}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="muted" style={{ margin: 0 }}>Pas encore de commentaire. Soyez le premier !</p>}
    </div>
  );
}
