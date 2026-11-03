import { useEffect, useMemo, useRef, useState } from 'react';
import { CATS, catColor, I } from './config.js';
import Ic from './components/Icon.jsx';
import MapView from './components/MapView.jsx';
import DetailSheet from './components/DetailSheet.jsx';
import ListSheet from './components/ListSheet.jsx';
import LoginSheet from './components/LoginSheet.jsx';
import { AddSheet, EditSheet } from './components/PlaceSheets.jsx';
import AddressSearch from './components/AddressSearch.jsx';
import { useAuth } from './hooks/useAuth.js';
import { usePlaces } from './hooks/usePlaces.js';
import * as api from './lib/api.js';
import { errMsg, norm, reduceMotion } from './lib/utils.js';

const DEFAULT_WHO = 'deux';

export default function App() {
  const auth = useAuth();
  const { places, loading, error, reload } = usePlaces();
  const refresh = () => reload().catch(() => {});

  /* ---------- Recherche et filtres ---------- */
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [flag, setFlag] = useState('all');
  const nq = norm(q.trim());
  const visible = places.filter((p) => (cat === 'all' || p.cat === cat)
    && (flag === 'all' || (flag === 'todo' ? !p.visits.length : p.visits.some((v) => v.love)))
    && (!nq || norm([p.name, p.quartier, p.desc, (CATS[p.cat] || {}).label, p.metro && p.metro.station, ...p.visits.map((v) => v.note)].join(' ')).includes(nq)));
  const toggle = (cur, val, set) => set(cur === val ? 'all' : val);

  /* ---------- État de l'écran ---------- */
  const [selId, setSelId] = useState(null);
  const selRef = useRef(null); selRef.current = selId;
  const [sheet, setSheet] = useState(null);     // { t: 'list' | 'detail' | 'login', id? }
  const [flow, setFlow] = useState(null);       // { kind: 'add' } | { kind: 'edit', id }
  const [draft, setDraft] = useState(null);     // position en cours de saisie
  const [picking, setPicking] = useState(false); // la carte attend un toucher
  const [prefill, setPrefill] = useState(null);  // infos d'une adresse trouvée par la recherche
  const [toastMsg, setToastMsg] = useState('');
  const toastT = useRef(0);
  const toast = (m) => { setToastMsg(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(''), 2800); };

  const mapApi = useRef(null), carRef = useRef(null), prog = useRef(0), scrollT = useRef(0);
  const placesRef = useRef(places); placesRef.current = places;

  /* ---------- Carte <-> carrousel ---------- */
  const scrollToCard = (id) => {
    const el = carRef.current && carRef.current.querySelector('[data-id="' + id + '"]');
    if (!el) return;
    prog.current = Date.now();
    el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  };
  const focus = (id, opts = {}) => {
    const p = placesRef.current.find((x) => x.id === id);
    if (!p) return;
    setSelId(id);
    if (opts.fly !== false && mapApi.current) mapApi.current.flyTo(p.lat, p.lng);
    if (opts.scroll !== false) scrollToCard(id);
  };
  const onCarScroll = () => {
    clearTimeout(scrollT.current);
    scrollT.current = setTimeout(() => {
      if (Date.now() - prog.current < 800) return;
      const el = carRef.current;
      if (!el) return;
      const box = el.getBoundingClientRect(), mid = box.left + box.width / 2;
      let best = null, bd = 1e9;
      el.querySelectorAll('[data-id]').forEach((c) => {
        const r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bd) { bd = d; best = c.getAttribute('data-id'); }
      });
      if (best && best !== selRef.current) focus(best, { scroll: false });
    }, 140);
  };
  const openDetail = (id) => { focus(id, { scroll: false }); setSheet({ t: 'detail', id }); };
  const closeDetail = (id) => { setSheet(null); setTimeout(() => scrollToCard(id), 60); };

  /* ---------- Lien partagé : /?lieu=<id> ---------- */
  const [initialLink] = useState(() => new URLSearchParams(window.location.search).get('lieu'));
  const linkDone = useRef(false);
  useEffect(() => {
    if (linkDone.current || !initialLink || !places.length) return;
    if (!places.some((p) => p.id === initialLink)) { if (!loading) linkDone.current = true; return; }
    linkDone.current = true;
    setTimeout(() => openDetail(initialLink), 250);
  }, [places, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialLink && !linkDone.current) return; // ne pas effacer le lien avant de l'avoir ouvert
    const id = sheet && sheet.t === 'detail' ? sheet.id : null;
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('lieu', id); else url.searchParams.delete('lieu');
    window.history.replaceState(null, '', url.pathname + url.search);
  }, [sheet, initialLink]);

  /* ---------- Ajout / modification d'un lieu ---------- */
  const startAdd = () => { setSheet(null); setSelId(null); setDraft(null); setFlow({ kind: 'add' }); setPicking(true); };
  const openEdit = (id) => {
    const p = placesRef.current.find((x) => x.id === id);
    if (!p) return;
    setSheet(null); setFlow({ kind: 'edit', id }); setDraft({ lat: p.lat, lng: p.lng }); setPicking(false);
  };
  const endFlow = () => { setFlow(null); setDraft(null); setPicking(false); setPrefill(null); };
  const cancelFlow = () => {
    const f = flow;
    endFlow();
    if (f && f.kind === 'edit') setSheet({ t: 'detail', id: f.id });
  };
  const placeAt = (pos) => { setDraft(pos); setPicking(false); };
  const pickAddress = (r) => {
    if (mapApi.current) mapApi.current.flyTo(r.lat, r.lng, 16);
    setPrefill({ ...r, at: Date.now() });
    placeAt({ lat: r.lat, lng: r.lng });
  };
  const backFromPicking = () => { if (draft) setPicking(false); else cancelFlow(); };
  const useMyPosition = () => {
    if (!navigator.geolocation) { toast('Localisation indisponible : touchez la carte'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (mapApi.current) mapApi.current.flyTo(p.lat, p.lng, 16);
        placeAt(p);
      },
      () => toast('Position indisponible : autorisez la localisation ou touchez la carte'),
      { enableHighAccuracy: true, timeout: 10000 });
  };

  const saveNewPlace = async ({ form, pos, visit, files }, onProgress) => {
    const id = await api.createPlace(form, pos); // si ça échoue, le formulaire affiche l'erreur
    let warn = '';
    if (visit) { try { await api.addVisit(id, visit); } catch (e) { warn = "Lieu enregistré, mais pas la visite : " + errMsg(e); } }
    if (files.length) { try { await api.uploadPhotos(id, files, onProgress); } catch (e) { warn = 'Lieu enregistré, mais pas les photos : ' + errMsg(e); } }
    await refresh();
    endFlow();
    setSelId(id);
    setSheet({ t: 'detail', id });
    toast(warn || 'Lieu ajouté au carnet');
  };

  const saveEdit = async (form, pos) => {
    const id = flow.id;
    await api.updatePlace(id, form, pos);
    await refresh();
    endFlow();
    setSelId(id);
    setSheet({ t: 'detail', id });
    toast('Lieu modifié');
  };

  /* Actions de la fiche : écrivent dans Supabase puis rechargent le carnet */
  const act = useMemo(() => {
    const again = () => reload().catch(() => {});
    return {
      addVisit: async (id, v) => { await api.addVisit(id, v); await again(); },
      updateVisit: async (id, v) => { await api.updateVisit(id, v); await again(); },
      deleteVisit: async (id) => { await api.deleteVisit(id); await again(); },
      uploadPhotos: async (id, files, onProgress) => { try { await api.uploadPhotos(id, files, onProgress); } finally { await again(); } },
      deletePhoto: async (p, ph) => { await api.deletePhoto(p, ph); await again(); },
      setCover: async (id, path) => { await api.setCover(id, path); await again(); },
      deletePlace: async (p) => { await api.deletePlace(p); setSheet(null); setSelId(null); await again(); },
    };
  }, [reload]);

  /* Déconnexion pendant une saisie : on referme */
  useEffect(() => { if (!auth.isEditor && flow && auth.editor !== null) endFlow(); }, [auth.isEditor, auth.editor]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Échap */
  useEffect(() => {
    const fn = (e) => {
      if (e.key !== 'Escape') return;
      if (flow) { if (picking) backFromPicking(); else cancelFlow(); }
      else if (sheet) setSheet(null);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  });

  const detail = !flow && sheet && sheet.t === 'detail' ? places.find((p) => p.id === sheet.id) : null;
  const editPlace = flow && flow.kind === 'edit' ? places.find((p) => p.id === flow.id) : null;

  /* ---------- Rendu ---------- */
  let carouselBody;
  if (visible.length) {
    carouselBody = visible.map((p) => {
      const loved = p.visits.some((v) => v.love);
      return (
        <button type="button" key={p.id} data-id={p.id} className="card" aria-current={p.id === selId} onClick={() => openDetail(p.id)}>
          <span className="thumb" style={{ '--c': catColor(p.cat) }}>
            {p.cover ? <img src={p.cover.thumb} alt="" loading="lazy" /> : <Ic d={I[p.cat]} size={40} sw={1.8} />}
          </span>
          <span className="card-body">
            <span className="card-name">{p.name}</span>
            <span className="card-meta">{(CATS[p.cat] || {}).label} · {p.quartier}</span>
            <span className="card-status">
              {p.visits.length
                ? <>{loved && <span className="heart"><Ic d={I.heart} size={16} fill /></span>}Testé {p.visits.length}×</>
                : <span className="todo-tag">À faire</span>}
            </span>
          </span>
        </button>
      );
    });
  } else if (!places.length && loading) {
    carouselBody = <div className="card empty">Chargement du carnet…</div>;
  } else if (!places.length && error) {
    carouselBody = (
      <div className="card empty col">
        <span>Le carnet n'a pas pu se charger. {errMsg(error)}</span>
        <button type="button" className="link-btn" onClick={refresh}>Réessayer</button>
      </div>
    );
  } else if (!places.length) {
    carouselBody = <div className="card empty">Le carnet est vide pour l'instant.{auth.isEditor ? ' Touchez + pour ajouter un premier lieu.' : ''}</div>;
  } else {
    carouselBody = <div className="card empty">Aucun lieu pour cette recherche.</div>;
  }

  return (
    <div className="app">
      <header className="top">
        <button className="circle" type="button" aria-label="Voir la liste des lieux" onClick={() => setSheet({ t: 'list' })} disabled={!!flow}>
          <Ic d={I.list} />
        </button>
        <div className="logo" aria-label="Le Carnet, Montréal"><b>Le Carnet</b><small>Montréal · testé à deux</small></div>
        {flow
          ? <button className="circle" type="button" aria-label="Annuler" onClick={cancelFlow}><Ic d={I.close} /></button>
          : auth.isEditor
            ? <button className="circle accent" type="button" aria-label="Ajouter un lieu" onClick={startAdd}><Ic d={I.plus} /></button>
            : <button className="circle" type="button" aria-label="Connexion" onClick={() => setSheet({ t: 'login' })}><Ic d={I.user} /></button>}
      </header>

      <div className={'stage' + (picking ? ' picking' : '')}>
        <MapView places={flow ? [] : visible} selId={selId} onPin={(id) => focus(id)} picking={picking} draft={draft}
          onPlace={placeAt} apiRef={mapApi} onToast={toast} />

        {!flow && (
          <div className="float-top">
            <div className="searchrow">
              <label className="search"><Ic d={I.search} />
                <input id="q" type="search" placeholder="Recherche" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un lieu" enterKeyHint="search" />
                {q && <button type="button" className="clear" aria-label="Effacer la recherche" onClick={() => setQ('')}><Ic d={I.close} size={18} /></button>}
              </label>
            </div>
            <div className="chips" role="toolbar" aria-label="Filtres">
              <button type="button" className="chip" aria-pressed={cat === 'all' && flag === 'all'} onClick={() => { setCat('all'); setFlag('all'); }}>Tout</button>
              {Object.entries(CATS).map(([k, c]) => (
                <button type="button" key={k} className="chip" aria-pressed={cat === k} onClick={() => toggle(cat, k, setCat)}>
                  <span className="sw" style={{ '--c': catColor(k) }} />{c.label}
                </button>
              ))}
              <button type="button" className="chip" aria-pressed={flag === 'love'} onClick={() => toggle(flag, 'love', setFlag)}>
                <Ic d={I.heart} size={14} fill={flag !== 'love'} sw={2} />Coups de cœur
              </button>
              <button type="button" className="chip" aria-pressed={flag === 'todo'} onClick={() => toggle(flag, 'todo', setFlag)}>À faire</button>
            </div>
          </div>
        )}

        {picking && <div className="hint">Cherchez le lieu ou touchez la carte</div>}

        <div className="ctrls">
          <button className="circle" type="button" aria-label="Zoomer" onClick={() => mapApi.current && mapApi.current.zoomIn()}><Ic d={I.plus} /></button>
          <button className="circle" type="button" aria-label="Dézoomer" onClick={() => mapApi.current && mapApi.current.zoomOut()}><Ic d={I.minus} /></button>
          <button className="circle" type="button" aria-label="Ma position" onClick={() => mapApi.current && mapApi.current.locate()}><Ic d={I.locate} /></button>
        </div>

        {!flow && <div className="carousel" ref={carRef} onScroll={onCarScroll}>{carouselBody}</div>}

        {picking && (
          <div className="placebar">
            <p><strong>{flow && flow.kind === 'edit' ? 'Nouvelle position ?' : 'Où se trouve le lieu ?'}</strong> Cherchez-le, touchez la carte, ou utilisez votre position si vous y êtes.</p>
            <AddressSearch onPick={pickAddress} />
            <button className="pill" type="button" onClick={useMyPosition}><Ic d={I.locate} /> Utiliser ma position</button>
            <button className="pill ghost" type="button" onClick={backFromPicking}>{draft ? 'Revenir au formulaire' : 'Annuler'}</button>
          </div>
        )}
      </div>

      {sheet && sheet.t === 'list' && (
        <ListSheet places={visible} total={places.length} auth={auth} onClose={() => setSheet(null)}
          onLogin={() => setSheet({ t: 'login' })}
          onPick={(id) => { setSheet(null); focus(id); setTimeout(() => scrollToCard(id), 60); }} />
      )}
      {sheet && sheet.t === 'login' && <LoginSheet auth={auth} toast={toast} onClose={() => setSheet(null)} />}
      {detail && (
        <DetailSheet key={detail.id} p={detail} isEditor={auth.isEditor} defaultWho={DEFAULT_WHO} toast={toast} act={act}
          onClose={() => closeDetail(detail.id)} onEdit={() => openEdit(detail.id)} />
      )}
      {flow && flow.kind === 'add' && draft && (
        <AddSheet pos={draft} prefill={prefill} hidden={picking} defaultWho={DEFAULT_WHO} onClose={cancelFlow} onMove={() => setPicking(true)} onSave={saveNewPlace} />
      )}
      {editPlace && draft && (
        <EditSheet key={editPlace.id} place={editPlace} pos={draft} prefill={prefill} hidden={picking} onClose={cancelFlow} onMove={() => setPicking(true)} onSave={saveEdit} />
      )}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  );
}
