import { useEffect, useState } from 'react';
import { I } from '../config.js';
import Ic from './Icon.jsx';

const TAX = 0.14975; // TPS 5 % + TVQ 9,975 %
const TIPS = [0, 15, 18, 20];
const QUICK = [1, 5, 10, 20, 50, 100];

const cad = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' });
const eur = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'EUR' });
const parse = (s) => { const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const show = (n) => (n == null ? '' : String(Math.round(n * 100) / 100).replace('.', ','));
const fmtDay = (d) => { if (!d) return ''; const [y, m, j] = d.split('-').map(Number); return new Date(y, m - 1, j).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' }); };

export default function ConverterSheet({ fx, onClose }) {
  const [manual, setManual] = useState('');
  const rate = fx.rate || parse(manual);
  const [cadTxt, setCadTxt] = useState('20');
  const [eurTxt, setEurTxt] = useState(() => (fx.rate ? show(20 * fx.rate) : ''));
  const [taxes, setTaxes] = useState(false);
  const [tip, setTip] = useState(0);

  /* Le taux arrive après l'ouverture (ou change) : on recalcule les euros depuis les dollars */
  useEffect(() => { const n = parse(cadTxt); setEurTxt(n != null && rate ? show(n * rate) : ''); }, [rate]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCad = (v) => { setCadTxt(v); const n = parse(v); setEurTxt(n != null && rate ? show(n * rate) : ''); };
  const onEur = (v) => { setEurTxt(v); const n = parse(v); setCadTxt(n != null && rate ? show(n / rate) : ''); };

  const price = parse(cadTxt);
  const tax = taxes && price != null ? price * TAX : 0;
  const tipAmt = price != null ? price * tip / 100 : 0; // pourboire calculé sur le prix avant taxes
  const total = price != null ? price + tax + tipAmt : null;
  const extras = taxes || tip > 0;

  return (
    <div className="sheet" role="dialog" aria-label="Convertisseur">
      <div className="sheet-bar">
        <h2>$ CA → €</h2>
        <button className="circle" type="button" aria-label="Fermer" onClick={onClose}><Ic d={I.close} /></button>
      </div>
      <div className="content">
        <div className="fx-rate">
          {fx.rate ? (
            <span><b>1 $ CA = {fx.rate.toFixed(4).replace('.', ',')} €</b><small>Taux BCE{fx.date ? ' du ' + fmtDay(fx.date) : ''}{fx.error ? ' · hors ligne, dernier taux connu' : ''}</small></span>
          ) : fx.loading ? <span className="muted">Récupération du taux…</span> : (
            <span className="fx-manual">
              <small className="err" style={{ fontWeight: 600 }}>Taux indisponible sans connexion. Saisissez-le :</small>
              <label className="fx-field small"><input type="text" inputMode="decimal" value={manual} placeholder="0,62" onChange={(e) => setManual(e.target.value)} aria-label="Taux $ CA vers euros" /><span>€ pour 1 $</span></label>
            </span>
          )}
          <button type="button" className="chip" onClick={() => fx.refresh(true)} disabled={fx.loading}>Actualiser</button>
        </div>

        <div className="fx-pair">
          <label className="fx-field"><span className="lbl">Dollars canadiens</span>
            <span className="fx-input"><input type="text" inputMode="decimal" value={cadTxt} onChange={(e) => onCad(e.target.value)} aria-label="Montant en dollars canadiens" /><b>$</b></span>
          </label>
          <span className="fx-eq" aria-hidden="true">=</span>
          <label className="fx-field"><span className="lbl">Euros</span>
            <span className="fx-input"><input type="text" inputMode="decimal" value={eurTxt} onChange={(e) => onEur(e.target.value)} aria-label="Montant en euros" disabled={!rate} /><b>€</b></span>
          </label>
        </div>

        <h3 className="h-sec">Au resto, en boutique</h3>
        <p className="desc muted" style={{ margin: 0 }}>Au Québec, les prix affichés sont presque toujours hors taxes, et le pourboire se laisse au restaurant, au bar et en taxi.</p>
        <label className="check"><input type="checkbox" checked={taxes} onChange={(e) => setTaxes(e.target.checked)} /> Ajouter les taxes (TPS + TVQ, 14,975 %)</label>
        <div className="field">
          <span className="lbl">Pourboire</span>
          <div className="opts">
            {TIPS.map((t) => <button key={t} type="button" className="chip" aria-pressed={tip === t} onClick={() => setTip(t)}>{t ? t + ' %' : 'Aucun'}</button>)}
          </div>
        </div>
        {extras && price != null && (
          <div className="box fx-total">
            <dl className="facts">
              <dt>Prix affiché</dt><dd>{cad.format(price)}</dd>
              {taxes && <><dt>Taxes</dt><dd>{cad.format(tax)}</dd></>}
              {tip > 0 && <><dt>Pourboire {tip} %</dt><dd>{cad.format(tipAmt)}</dd></>}
            </dl>
            <div className="big">{cad.format(total)}</div>
            {rate && <p className="small">soit environ <strong>{eur.format(total * rate)}</strong></p>}
          </div>
        )}

        {rate && (
          <>
            <h3 className="h-sec">Repères</h3>
            <ul className="fx-quick">
              {QUICK.map((n) => <li key={n}><span>{cad.format(n)}</span><b>{eur.format(n * rate)}</b></li>)}
            </ul>
          </>
        )}
        <p className="muted small-print">Taux de référence publié chaque jour ouvré par la Banque centrale européenne (via Frankfurter). Votre banque applique en général 1 à 3 % de frais en plus.</p>
      </div>
    </div>
  );
}
