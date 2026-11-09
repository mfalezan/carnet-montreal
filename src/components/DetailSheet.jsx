import { useRef, useState } from 'react';
import { CATS, catColor, SEASONS, LINES, WHO, I, PRICES, TAGS } from '../config.js';
import Ic from './Icon.jsx';
import { VisitFields, newVisit } from './Forms.jsx';
import { ReactionBar, Comments } from './People.jsx';
import { fmtDist } from '../lib/geo.js';
import { where } from '../lib/utils.js';
import { errMsg, fmtCoord, fmtDate, gmapsUrl, placeUrl, safeLink } from '../lib/utils.js';

/* Fiche d'un lieu. Les actions d'édition n'apparaissent que pour les éditeurs. */
export default function DetailSheet({ p, isEditor, defaultWho, onClose, onEdit, act, toast, people, onReact, onComment }) {
  const [visitForm, setVisitForm] = useState(null); // { id?, d, who, love, note }
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [viewer, setViewer] = useState(null); // index de la photo affichée
  const [confirmPhoto, setConfirmPhoto] = useState(false);
  const [zoom, setZoom] = useState(null); // photo d'un commentaire en grand
  const fileRef = useRef(null);

  const loved = p.visits.some((x) => x.love), n = p.visits.length;
  const last = (loved && p.visits.find((x) => x.love && x.note)) || p.visits.find((x) => x.note) || p.visits[0];
  const link = safeLink(p.link);

  const run = async (label, fn, okMsg) => {
    setBusy(label);
    try { await fn(); if (okMsg) toast(okMsg); return true; }
    catch (e) { toast(errMsg(e)); return false; }
    finally { setBusy(''); }
  };

  const share = async () => {
    const url = placeUrl(p);
    try {
      if (navigator.share) { await navigator.share({ title: p.name, text: p.name + ' — ' + where(p) + (p.region === 'Montréal' ? ', Montréal' : ''), url }); return; }
      await navigator.clipboard.writeText(p.name + ' — ' + url);
      toast('Lien copié');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast('Partage impossible depuis ce navigateur');
    }
  };

  const saveVisit = async (e) => {
    e.preventDefault();
    const v = visitForm;
    const ok = await run('visit', () => (v.id ? act.updateVisit(v.id, v) : act.addVisit(p.id, v)), v.id ? 'Visite modifiée' : 'Visite ajoutée');
    if (ok) setVisitForm(null);
  };

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    await run('photos', () => act.uploadPhotos(p.id, files, (k, t) => setBusy('Envoi ' + k + '/' + t + '…')),
      files.length > 1 ? 'Photos ajoutées' : 'Photo ajoutée');
  };

  const photo = viewer !== null ? p.photos[viewer] : null;
  const isCover = photo && p.cover && p.cover.path === photo.path;

  return (
    <div className="sheet" role="dialog" aria-label={p.name}>
      <header className={'hero' + (p.cover ? ' photo' : '')}
        style={p.cover
          ? { '--c': catColor(p.cat), backgroundImage: 'linear-gradient(180deg,rgb(0 0 0 / .1),rgb(0 0 0 / .55)),url("' + p.cover.url + '")' }
          : { '--c': catColor(p.cat) }}>
        <div className="hero-btns">
          <button className="glass" type="button" aria-label="Retour à la carte" onClick={onClose}><Ic d={I.back} /></button>
          <div className="row-btns" style={{ gap: '10px' }}>
            {isEditor && <button className="glass" type="button" aria-label="Modifier le lieu" onClick={onEdit}><Ic d={I.edit} /></button>}
            <button className="glass" type="button" aria-label="Partager" onClick={share}><Ic d={I.share} /></button>
          </div>
        </div>
        {!p.cover && <span className="hero-mark"><Ic d={I[p.cat]} size={200} sw={1.6} /></span>}
        <h2>{p.name}</h2>
        <p>{(CATS[p.cat] || {}).label} · {where(p)}{p.price ? ' · ' + PRICES[p.price] : ''}</p>
      </header>

      <div className="content">
        <h3 className="h-sec">Notre avis</h3>
        <div className="box">
          {n ? (
            <>
              <div className="big">
                {loved ? <><span className="heart"><Ic d={I.heart} size={30} fill /></span>Coup de cœur</> : 'Testé ' + n + ' fois'}
              </div>
              {last.note && <p className="quote">« {last.note} »</p>}
              <p className="small">{WHO[last.who]} · {fmtDate(last.d)}{loved && n > 1 ? ' · testé ' + n + ' fois' : ''}</p>
            </>
          ) : (
            <>
              <div className="big">À faire</div>
              <p className="quote">On ne l'a pas encore testé.</p>
              {isEditor && <p className="small">Ajoutez une visite quand c'est fait.</p>}
            </>
          )}
        </div>

        <a className="pill" href={gmapsUrl(p)} target="_blank" rel="noopener noreferrer"><Ic d={I.route} /> Itinéraire</a>

        {people && people.available && (
          <>
            <h3 className="h-sec">Et vous ?</h3>
            <ReactionBar p={p} people={people} onReact={onReact} />
            {people.commentsOn && (
              <Comments p={p} people={people} isEditor={isEditor} onComment={onComment} onZoom={setZoom}
                onDelete={async (c) => { await people.uncomment(c); toast('Commentaire supprimé'); }} />
            )}
          </>
        )}

        <h3 className="h-sec">Le lieu</h3>
        {p.desc && <p className="desc">{p.desc}</p>}
        {p.tags.length > 0 && (
          <ul className="tags" aria-label="Étiquettes">
            {p.tags.map((t) => <li key={t}>{TAGS[t] || t}</li>)}
          </ul>
        )}
        <dl className="facts">
          {p.address && <><dt>Adresse</dt><dd>{p.address}</dd></>}
          <dt>Métro</dt>
          <dd>
            {p.metro ? (
              <>
                {p.metro.lines.map((l) => (
                  <span key={l} className="line" style={{ background: LINES[l], color: l === 'jaune' ? '#1A1A1A' : '#FFFFFF' }}>{l}</span>
                ))}
                {' '}{p.metro.station}
              </>
            ) : '—'}
          </dd>
          <dt>Saison</dt><dd>{SEASONS[p.season]}</dd>
          {link && <><dt>Lien</dt><dd><a href={link} target="_blank" rel="noopener noreferrer" className="ext">{link.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></dd></>}
          {p.dist != null && <><dt>Distance</dt><dd>à {fmtDist(p.dist)} de vous</dd></>}
          <dt>Position</dt><dd className="coords">{fmtCoord(p.lat, p.lng)}</dd>
        </dl>

        {(p.photos.length > 0 || isEditor) && <h3 className="h-sec">Nos photos</h3>}
        {p.photos.length > 0 && (
          <div className="gallery">
            {p.photos.map((ph, i) => (
              <button type="button" key={ph.id} className="g-item" onClick={() => { setViewer(i); setConfirmPhoto(false); }} aria-label={'Agrandir la photo ' + (i + 1)}>
                <img src={ph.thumb} alt="" loading="lazy" />
                {p.cover && p.cover.path === ph.path && p.photos.length > 1 && <span className="g-tag">Couverture</span>}
              </button>
            ))}
          </div>
        )}
        {isEditor && (
          <>
            <button className="pill ghost" type="button" disabled={!!busy} onClick={() => fileRef.current && fileRef.current.click()}>
              <Ic d={I.camera} /> {busy === 'photos' ? 'Préparation…' : busy.startsWith('Envoi') ? busy : 'Ajouter des photos'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={onFiles} tabIndex={-1} aria-hidden="true" />
          </>
        )}

        <h3 className="h-sec">Nos visites</h3>
        {n ? (
          <ol className="visits">
            {p.visits.map((x) => (
              <li key={x.id} className="visit">
                <span className="when">{fmtDate(x.d)}</span>
                <div>
                  <span className="who">
                    {WHO[x.who]}
                    {x.love && <span className="heart" aria-label="coup de cœur"><Ic d={I.heart} size={15} fill /></span>}
                  </span>
                  {x.note && <p>{x.note}</p>}
                  {isEditor && !visitForm && (
                    <button type="button" className="link-btn" onClick={() => setVisitForm({ ...x })}>Modifier</button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : <p className="muted">Aucune visite pour l'instant.</p>}

        {isEditor && (visitForm ? (
          <form className="subbox" onSubmit={saveVisit}>
            <p className="lbl" style={{ margin: 0 }}>{visitForm.id ? 'Modifier la visite' : 'Nouvelle visite'}</p>
            <VisitFields v={visitForm} set={setVisitForm} />
            <button className="pill" type="submit" disabled={!!busy}>{busy === 'visit' ? 'Enregistrement…' : visitForm.id ? 'Enregistrer' : 'Ajouter la visite'}</button>
            <button className="pill ghost" type="button" onClick={() => setVisitForm(null)}>Annuler</button>
            {visitForm.id && (
              <button className="pill danger" type="button" disabled={!!busy}
                onClick={async () => { if (await run('visit', () => act.deleteVisit(visitForm.id), 'Visite supprimée')) setVisitForm(null); }}>
                Supprimer cette visite
              </button>
            )}
          </form>
        ) : (
          <button className="pill ghost" type="button" onClick={() => setVisitForm(newVisit(defaultWho))}><Ic d={I.plus} /> Ajouter une visite</button>
        ))}

        {isEditor && (
          <div style={{ marginTop: '18px' }}>
            {confirm ? (
              <div className="subbox">
                <p style={{ margin: 0 }}>Supprimer <strong>{p.name}</strong>, ses visites et ses photos ? C'est définitif.</p>
                <button className="pill danger" type="button" disabled={!!busy} onClick={() => run('delete', () => act.deletePlace(p), 'Lieu supprimé')}>
                  {busy === 'delete' ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
                <button className="pill ghost" type="button" onClick={() => setConfirm(false)}>Garder le lieu</button>
              </div>
            ) : (
              <button className="pill ghost" type="button" onClick={() => setConfirm(true)}><Ic d={I.trash} /> Supprimer ce lieu</button>
            )}
          </div>
        )}
      </div>

      {zoom && (
        <div className="lightbox" role="dialog" aria-label="Photo" onClick={() => setZoom(null)}>
          <img src={zoom} alt="" onClick={(e) => e.stopPropagation()} />
          <div className="lb-bar"><button className="glass" type="button" aria-label="Fermer la photo" onClick={() => setZoom(null)}><Ic d={I.close} /></button></div>
        </div>
      )}
      {photo && (
        <div className="lightbox" role="dialog" aria-label="Photo" onClick={() => setViewer(null)}>
          <img src={photo.url} alt={'Photo de ' + p.name} onClick={(e) => e.stopPropagation()} />
          <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
            <button className="glass" type="button" aria-label="Fermer la photo" onClick={() => setViewer(null)}><Ic d={I.close} /></button>
            {p.photos.length > 1 && <span className="lb-count">{viewer + 1} / {p.photos.length}</span>}
            {p.photos.length > 1 && (
              <div className="row-btns" style={{ gap: '10px' }}>
                <button className="glass" type="button" aria-label="Photo précédente" onClick={() => setViewer((viewer - 1 + p.photos.length) % p.photos.length)}><Ic d={I.back} /></button>
                <button className="glass flip" type="button" aria-label="Photo suivante" onClick={() => setViewer((viewer + 1) % p.photos.length)}><Ic d={I.back} /></button>
              </div>
            )}
          </div>
          {isEditor && (
            <div className="lb-actions" onClick={(e) => e.stopPropagation()}>
              {!isCover && (
                <button className="chip" type="button" disabled={!!busy} onClick={() => run('cover', () => act.setCover(p.id, photo.path), 'Photo de couverture changée')}>
                  <Ic d={I.image} size={16} /> Mettre en couverture
                </button>
              )}
              {confirmPhoto ? (
                <button className="chip danger" type="button" disabled={!!busy}
                  onClick={async () => { if (await run('photo', () => act.deletePhoto(p, photo), 'Photo supprimée')) { setViewer(null); setConfirmPhoto(false); } }}>
                  Confirmer la suppression
                </button>
              ) : (
                <button className="chip" type="button" onClick={() => setConfirmPhoto(true)}><Ic d={I.trash} size={16} /> Supprimer</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
