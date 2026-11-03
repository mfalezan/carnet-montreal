import { I } from '../config.js';
import Ic from './Icon.jsx';

export const emptyMore = () => ({ season: 'all' });
export const countMore = (m) => (m.season !== 'all' ? 1 : 0);

const SEASON_OPTS = [['all', 'Toutes'], ['ete', 'Été'], ['hiver', 'Hiver']];

/* Mois de novembre à mars : on suggère l'hiver */
export const currentSeason = () => { const m = new Date().getMonth(); return m >= 10 || m <= 2 ? 'hiver' : 'ete'; };

/* Panneau « Plus de filtres » sous la barre de recherche */
export default function FilterPanel({ more, setMore, count, onClose }) {
  const now = currentSeason();
  return (
    <div className="fpanel" role="dialog" aria-label="Plus de filtres">
      <div className="fpanel-head">
        <span className="lbl">Saison</span>
        <button type="button" className="clear" aria-label="Fermer les filtres" onClick={onClose}><Ic d={I.close} size={18} /></button>
      </div>
      <div className="opts">
        {SEASON_OPTS.map(([k, l]) => (
          <button type="button" key={k} className="chip" aria-pressed={more.season === k} onClick={() => setMore({ ...more, season: k })}>
            {l}{k === now ? ' · en ce moment' : ''}
          </button>
        ))}
      </div>
      <p className="muted fpanel-note">Les lieux « toute l'année » restent toujours affichés.</p>
      <div className="fpanel-foot">
        <button type="button" className="link-btn" onClick={() => setMore(emptyMore())}>Réinitialiser</button>
        <button type="button" className="pill fpanel-ok" onClick={onClose}>Voir {count} lieu{count > 1 ? 'x' : ''}</button>
      </div>
    </div>
  );
}
