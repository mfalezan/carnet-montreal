import { CATS, catColor, I, WHO } from '../config.js';
import Ic from './Icon.jsx';
import { fmtDist } from '../lib/geo.js';

export default function ListSheet({ places, total, onPick, onClose, auth, onLogin }) {
  const tested = places.filter((p) => p.visits.length).length;
  const loves = places.filter((p) => p.visits.some((v) => v.love)).length;
  return (
    <div className="sheet left" role="dialog" aria-label="Tous nos lieux">
      <div className="sheet-bar">
        <h2>Nos lieux</h2>
        <button className="circle" type="button" aria-label="Fermer la liste" onClick={onClose}><Ic d={I.close} /></button>
      </div>
      <div className="content" style={{ gap: '8px' }}>
        <p className="muted" style={{ margin: 0 }}>
          {places.length}{places.length !== total ? ' sur ' + total : ''} lieux · {tested} testés · {loves} coups de cœur
        </p>
        {places.length ? (
          <ul className="list">
            {places.map((p) => (
              <li key={p.id}>
                <button type="button" className="lrow" onClick={() => onPick(p.id)}>
                  <span className="lthumb" style={{ '--c': catColor(p.cat) }}>
                    {p.cover ? <img src={p.cover.thumb} alt="" loading="lazy" /> : <Ic d={I[p.cat]} size={24} />}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="lname">{p.name}</span>
                    <span className="lmeta">{(CATS[p.cat] || {}).label} · {p.quartier}{p.dist != null ? ' · ' + fmtDist(p.dist) : ''}</span>
                  </span>
                  {p.visits.length ? (
                    <span className="card-status" style={{ marginTop: 0 }}>
                      {p.visits.some((v) => v.love) && <span className="heart"><Ic d={I.heart} size={15} fill /></span>}
                      {p.visits.length}×
                    </span>
                  ) : <span className="todo-tag">À faire</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Aucun lieu ne correspond à la recherche.</p>}

        <div className="list-foot">
          {auth.isEditor ? (
            <p className="muted">Connecté·e : <strong>{WHO[auth.editor.who]}</strong>
              {' · '}<button type="button" className="link-btn" onClick={() => auth.signOut()}>Se déconnecter</button></p>
          ) : (
            <p className="muted">Vous êtes Matthieu ou Azéline ? <button type="button" className="link-btn" onClick={onLogin}>Se connecter</button></p>
          )}
          <p className="muted small-print">Carte : OpenFreeMap, données © contributeurs OpenStreetMap.</p>
        </div>
      </div>
    </div>
  );
}
