import { CATS, catColor, I, WHO, PRICES } from '../config.js';
import Ic from './Icon.jsx';
import { fmtDist } from '../lib/geo.js';
import { where } from '../lib/utils.js';
import { routeStops } from './RouteSheets.jsx';

export default function ListSheet({ places, allPlaces, total, onPick, onClose, auth, onLogin, tab = 'places', setTab, routes, routesAvailable, onPickRoute, onNewRoute }) {
  const tested = places.filter((p) => p.visits.length).length;
  const loves = places.filter((p) => p.visits.some((v) => v.love)).length;
  return (
    <div className="sheet left" role="dialog" aria-label="Tous nos lieux">
      <div className="sheet-bar">
        <h2>{tab === 'routes' ? 'Nos parcours' : 'Nos lieux'}</h2>
        <button className="circle" type="button" aria-label="Fermer la liste" onClick={onClose}><Ic d={I.close} /></button>
      </div>
      <div className="content" style={{ gap: '8px' }}>
        {(routesAvailable || auth.isEditor) && (
          <div className="tabs" role="tablist" aria-label="Afficher">
            <button type="button" role="tab" aria-selected={tab === 'places'} onClick={() => setTab('places')}>Lieux</button>
            <button type="button" role="tab" aria-selected={tab === 'routes'} onClick={() => setTab('routes')}>Parcours{routes.length ? ' (' + routes.length + ')' : ''}</button>
          </div>
        )}
        {tab === 'routes' ? (
          <RoutesTab routes={routes} available={routesAvailable} places={allPlaces} isEditor={auth.isEditor} onPick={onPickRoute} onNew={onNewRoute} />
        ) : (<>
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
                    <span className="lmeta">{(CATS[p.cat] || {}).label} · {where(p)}{p.price ? ' · ' + PRICES[p.price] : ''}{p.dist != null ? ' · ' + fmtDist(p.dist) : ''}</span>
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
        </>)}

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

function RoutesTab({ routes, available, places, isEditor, onPick, onNew }) {
  if (!available) {
    return <p className="err">Les parcours ne sont pas encore activés : exécutez supabase/migrations/003_parcours.sql dans Supabase.</p>;
  }
  return (
    <>
      {isEditor && <button className="pill ghost" type="button" onClick={onNew}><Ic d={I.plus} /> Nouveau parcours</button>}
      {routes.length ? (
        <ul className="list">
          {routes.map((r) => {
            const stops = routeStops(r, places);
            const first = stops[0];
            return (
              <li key={r.id}>
                <button type="button" className="lrow" onClick={() => onPick(r.id)}>
                  <span className="lthumb route-thumb">
                    {first && first.cover ? <img src={first.cover.thumb} alt="" loading="lazy" /> : <Ic d={I.walk} size={24} />}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="lname">{r.title}</span>
                    <span className="lmeta clip">{stops.length} étape{stops.length > 1 ? 's' : ''}{r.desc ? ' · ' + r.desc : ''}</span>
                  </span>
                  <span className="go"><Ic d={I.back} size={18} /></span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="muted">{isEditor ? 'Aucun parcours pour l\u2019instant : créez-en un pour le partager à vos visiteurs.' : 'Aucun parcours pour l\u2019instant.'}</p>}
    </>
  );
}
