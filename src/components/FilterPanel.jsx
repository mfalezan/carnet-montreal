import { I, PRICES, TAGS } from '../config.js';
import Ic from './Icon.jsx';

export const emptyMore = () => ({ region: 'all', season: 'all', price: [], tags: [] });
export const countMore = (m) => (m.region !== 'all' ? 1 : 0) + (m.season !== 'all' ? 1 : 0) + (m.price.length ? 1 : 0) + m.tags.length;
const flip = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : list.concat([v]));

const SEASON_OPTS = [['all', 'Toutes'], ['ete', 'Été'], ['hiver', 'Hiver']];

/* Mois de novembre à mars : on suggère l'hiver */
export const currentSeason = () => { const m = new Date().getMonth(); return m >= 10 || m <= 2 ? 'hiver' : 'ete'; };

/* Panneau « Plus de filtres » sous la barre de recherche */
export default function FilterPanel({ more, setMore, count, regions = [], onClose }) {
  const now = currentSeason();
  return (
    <div className="fpanel" role="dialog" aria-label="Plus de filtres">
      <div className="fpanel-head">
        <span className="lbl">{regions.length > 1 ? 'Région' : 'Saison'}</span>
        <button type="button" className="clear" aria-label="Fermer les filtres" onClick={onClose}><Ic d={I.close} size={18} /></button>
      </div>
      {regions.length > 1 && (
        <>
          <div className="opts">
            <button type="button" className="chip" aria-pressed={more.region === 'all'} onClick={() => setMore({ ...more, region: 'all' })}>Partout</button>
            {regions.map(([r, n]) => (
              <button type="button" key={r} className="chip" aria-pressed={more.region === r} onClick={() => setMore({ ...more, region: more.region === r ? 'all' : r })}>
                {r} <span className="chip-n">{n}</span>
              </button>
            ))}
          </div>
          <span className="lbl">Saison</span>
        </>
      )}
      <div className="opts">
        {SEASON_OPTS.map(([k, l]) => (
          <button type="button" key={k} className="chip" aria-pressed={more.season === k} onClick={() => setMore({ ...more, season: k })}>
            {l}{k === now ? ' · en ce moment' : ''}
          </button>
        ))}
      </div>
      <p className="muted fpanel-note">Les lieux « toute l'année » restent toujours affichés.</p>

      <span className="lbl">Prix</span>
      <div className="opts">
        {Object.entries(PRICES).map(([k, l]) => (
          <button type="button" key={k} className="chip" aria-pressed={more.price.includes(Number(k))} onClick={() => setMore({ ...more, price: flip(more.price, Number(k)) })}>{l}</button>
        ))}
      </div>

      <span className="lbl">Étiquettes</span>
      <div className="opts">
        {Object.entries(TAGS).map(([k, l]) => (
          <button type="button" key={k} className="chip" aria-pressed={more.tags.includes(k)} onClick={() => setMore({ ...more, tags: flip(more.tags, k) })}>{l}</button>
        ))}
      </div>
      {more.tags.length > 1 && <p className="muted fpanel-note">Lieux qui ont toutes ces étiquettes.</p>}
      <div className="fpanel-foot">
        <button type="button" className="link-btn" onClick={() => setMore(emptyMore())}>Réinitialiser</button>
        <button type="button" className="pill fpanel-ok" onClick={onClose}>Voir {count} lieu{count > 1 ? 'x' : ''}</button>
      </div>
    </div>
  );
}
