import { useState } from 'react';
import { I, WHO } from '../config.js';
import Ic from './Icon.jsx';
import { errMsg } from '../lib/utils.js';

export default function LoginSheet({ auth, onClose, toast }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !pw) { setErr('Renseignez votre e-mail et votre mot de passe.'); return; }
    setBusy(true); setErr('');
    try { await auth.signIn(email, pw); toast('Connecté·e'); }
    catch (er) { setErr(errMsg(er)); }
    finally { setBusy(false); }
  };

  return (
    <div className="sheet" role="dialog" aria-label="Connexion">
      <div className="sheet-bar">
        <h2>{auth.session ? 'Mon compte' : 'Connexion'}</h2>
        <button className="circle" type="button" aria-label="Fermer" onClick={onClose}><Ic d={I.close} /></button>
      </div>
      <div className="content">
        {auth.session ? (
          <>
            {auth.editor === null && <p className="muted">Vérification du compte…</p>}
            {auth.editor && (
              <div className="box" style={{ maxWidth: 'none' }}>
                <div className="big">{WHO[auth.editor.who]}</div>
                <p className="small">{auth.email}</p>
                <p className="quote">Vous pouvez ajouter et modifier des lieux, des visites et des photos.</p>
              </div>
            )}
            {auth.editor === false && (
              <p className="err">Ce compte ({auth.email}) n'est pas autorisé à modifier le carnet. Ajoutez-le à la table <code>editors</code> dans Supabase.</p>
            )}
            <button className="pill" type="button" onClick={onClose}>Retour à la carte</button>
            <button className="pill ghost" type="button" onClick={() => auth.signOut()}><Ic d={I.logout} /> Se déconnecter</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="desc">L'écriture dans le carnet est réservée à Matthieu et Azéline. Tout le monde peut consulter les lieux sans compte.</p>
            <div className="field">
              <label htmlFor="l-email">E-mail</label>
              <input id="l-email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="l-pw">Mot de passe</label>
              <input id="l-pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            {err && <p className="err" role="alert">{err}</p>}
            <button className="pill" type="submit" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
