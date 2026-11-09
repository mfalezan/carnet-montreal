import { useEffect, useMemo, useRef, useState } from 'react';
import { CATS, catColor, I, PRICES, TAGS } from './config.js';
import Ic from './components/Icon.jsx';
import MapView from './components/MapView.jsx';
import DetailSheet from './components/DetailSheet.jsx';
import ListSheet from './components/ListSheet.jsx';
import LoginSheet from './components/LoginSheet.jsx';
import MenuSheet from './components/MenuSheet.jsx';
import ConverterSheet from './components/ConverterSheet.jsx';
import { useRate } from './hooks/useRate.js';
import { AddSheet, EditSheet } from './components/PlaceSheets.jsx';
import AddressSearch from './components/AddressSearch.jsx';
import FilterPanel, { emptyMore, countMore } from './components/FilterPanel.jsx';
import { RouteSheet, RouteEditSheet, routeStops } from './components/RouteSheets.jsx';
import { useRoutes } from './hooks/useRoutes.js';
import { useAuth } from './hooks/useAuth.js';
import { usePlaces } from './hooks/usePlaces.js';
import { usePosition } from './hooks/usePosition.js';
import { distance, fmtDist } from './lib/geo.js';
import * as api from './lib/api.js';
import { errMsg, norm, reduceMotion, where } from './lib/utils.js';

const DEFAULT_WHO = 'deux';

export default function App() {
  const auth = useAuth();
  const { places, loading, error, reload } = usePlaces();
  const refresh = () => reload().catch(() => {});
  const rt = useRoutes();
  const fx = useRate();
  const me = usePosition();
  const [nearby, setNearby] = useState(false);
  const placesD = useMemo(() => (me.pos ? places.map((p) => ({ ...p, dist: distance(me.pos, p) })) : places), [places, me.pos]);

  /* ---------- Recherche et filtres ---------- */
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [flag, setFlag] = useState('all');
  const [more, setMore] = useState(emptyMore);   // filtres du panneau : saison…
  const [moreOpen, setMoreOpen] = useState(false);
  const nMore = countMore(more);
  /* Régions présentes dans le carnet, la plus fournie d'abord (Montréal en tête) */
  const regions = useMemo(() => {
    const c = {};
    places.forEach((p) => { c[p.region] = (c[p.region] || 0) + 1; });
    return Object.entries(c).sort((a, b) => (a[0] === 'Montréal' ? -1 : b[0] === 'Montréal' ? 1 : b[1] - a[1]));
  }, [places]);
  const nq = norm(q.trim());
  const filtered = placesD.filter((p) => (cat === 'all' || p.cat === cat)
    && (more.region === 'all' || p.region === more.region)
    && (more.season === 'all' || p.season === more.season || p.season === 'toute')
    && (!more.price.length || more.price.includes(p.price))
    && more.tags.every((t) => p.tags.includes(t))
    && (flag === 'all' || (flag === 'todo' ? !p.visits.length : p.visits.some((v) => v.love)))
    && (!nq || norm([p.name, p.quartier, p.region, p.desc, (CATS[p.cat] || {}).label, ...p.tags.map((t) => TAGS[t] || t), p.metro && p.metro.station, ...p.visits.map((v) => v.note)].join(' ')).includes(nq)));
  /* Parcours affiché sur la carte : ses étapes remplacent les filtres */
  const [routeId, setRouteId] = useState(null);
  const viewRoute = routeId ? rt.routes.find((r) => r.id === routeId) : null;
  const routePlaces = useMemo(() => (viewRoute ? routeStops(viewRoute, placesD) : null), [viewRoute, placesD]);
  const numbers = useMemo(() => {
    if (!routePlaces) return null;
    const m = {}; routePlaces.forEach((p) => { m[p.id] = p.n; }); return m;
  }, [routePlaces]);
  const visible = routePlaces || (nearby && me.pos ? filtered.slice().sort((a, b) => a.dist - b.dist) : filtered);
  const toggle = (cur, val, set) => set(cur === val ? 'all' : val);

  /* ---------- État de l'écran ---------- */
  const [selId, setSelId] = useState(null);
  const selRef = useRef(null); selRef.current = selId;
  const [sheet, setSheet] = useState(null);     // { t: 'list' | 'detail' | 'login' | 'route' | 'routeEdit', id? }
  const [listTab, setListTab] = useState('places');
  const [menuOpen, setMenuOpen] = useState(false);
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

  /* Choisir une région recadre la carte sur ses lieux */
  const lastRegion = useRef(more.region);
  useEffect(() => {
    if (lastRegion.current === more.region) return;
    lastRegion.current = more.region;
    const pts = more.region === 'all' ? placesRef.current.filter((p) => p.region === 'Montréal') : filtered;
    if (mapApi.current && pts.length) mapApi.current.fitTo(pts);
  }, [more.region]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Autour de moi ---------- */
  const toggleNearby = async () => {
    if (nearby) { setNearby(false); me.stop(); return; }
    try {
      const v = await me.start();
      setNearby(true);
      if (mapApi.current) mapApi.current.flyTo(v.lat, v.lng, 14.5);
      if (carRef.current) carRef.current.scrollTo({ left: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    } catch (e) {
      toast('Position indisponible : autorisez la localisation pour ce site');
    }
  };

  /* ---------- Liens partagés : /?lieu=<id> et /?parcours=<id> ---------- */
  const [initialLink] = useState(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('parcours')) return { kind: 'route', id: sp.get('parcours') };
    if (sp.get('lieu')) return { kind: 'place', id: sp.get('lieu') };
    return null;
  });
  const linkDone = useRef(false);
  useEffect(() => {
    if (linkDone.current || !initialLink) return;
    if (initialLink.kind === 'place') {
      if (!places.length) return;
      if (!places.some((p) => p.id === initialLink.id)) { if (!loading) linkDone.current = true; return; }
      linkDone.current = true;
      setTimeout(() => openDetail(initialLink.id), 250);
    } else {
      if (!places.length || !rt.routes.some((r) => r.id === initialLink.id)) { if (!loading && rt.routes.length) linkDone.current = true; return; }
      linkDone.current = true;
      setTimeout(() => setSheet({ t: 'route', id: initialLink.id }), 250);
    }
  }, [places, loading, rt.routes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialLink && !linkDone.current) return; // ne pas effacer le lien avant de l'avoir ouvert
    const url = new URL(window.location.href);
    url.searchParams.delete('lieu'); url.searchParams.delete('parcours');
    if (sheet && sheet.t === 'detail') url.searchParams.set('lieu', sheet.id);
    else if (sheet && sheet.t === 'route') url.searchParams.set('parcours', sheet.id);
    else if (routeId) url.searchParams.set('parcours', routeId);
    window.history.replaceState(null, '', url.pathname + url.search);
  }, [sheet, initialLink, routeId]);

  /* ---------- Parcours ---------- */
  const showRoute = (id) => {
    const r = rt.routes.find((x) => x.id === id);
    if (!r) return;
    const stops = routeStops(r, placesRef.current);
    setSheet(null); setMoreOpen(false); setSelId(null); setRouteId(id);
    setTimeout(() => {
      if (mapApi.current) mapApi.current.fitTo(stops);
      if (carRef.current) carRef.current.scrollTo({ left: 0 });
    }, 60);
  };
  const exitRoute = () => { setRouteId(null); setSelId(null); };
  const saveRoute = async (r) => {
    const id = await api.saveRoute(r);
    await rt.reload().catch(() => {});
    setSheet({ t: 'route', id });
    toast(r.id ? 'Parcours modifié' : 'Parcours créé');
  };
  const removeRoute = async (id) => {
    await api.deleteRoute(id);
    await rt.reload().catch(() => {});
    if (routeId === id) exitRoute();
    setListTab('routes');
    setSheet({ t: 'list' });
    toast('Parcours supprimé');
  };

  /* ---------- Ajout / modification d'un lieu ---------- */
  const startAdd = () => { setRouteId(null); setSheet(null); setSelId(null); setDraft(null); setFlow({ kind: 'add' }); setPicking(true); };
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
      deletePlace: async (p) => { await api.deletePlace(p); setSheet(null); setSelId(null); await again(); rt.reload().catch(() => {}); },
    };
  }, [reload]);

  /* Déconnexion pendant une saisie : on referme */
  useEffect(() => { if (!auth.isEditor && flow && auth.editor !== null) endFlow(); }, [auth.isEditor, auth.editor]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Échap */
  useEffect(() => {
    const fn = (e) => {
      if (e.key !== 'Escape') return;
      if (menuOpen) setMenuOpen(false);
      else if (flow) { if (picking) backFromPicking(); else cancelFlow(); }
      else if (sheet) setSheet(null);
      else if (routeId) exitRoute();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  });

  const detail = !flow && sheet && sheet.t === 'detail' ? placesD.find((p) => p.id === sheet.id) : null;
  const editPlace = flow && flow.kind === 'edit' ? places.find((p) => p.id === flow.id) : null;

  /* ---------- Menu ---------- */
  const openList = (tab) => { setListTab(tab); setSheet({ t: 'list' }); };
  const menuSections = [
    { title: 'Explorer', items: [
      { key: 'map', icon: I.map, label: 'La carte', sub: 'Nos adresses autour de vous', active: !sheet && !routeId, onClick: () => { setSheet(null); exitRoute(); } },
      { key: 'list', icon: I.list, label: 'Tous les lieux', sub: 'La liste complète, triée et filtrée', badge: places.length || null, onClick: () => openList('places') },
      ...(rt.available || auth.isEditor ? [{ key: 'routes', icon: I.walk, label: 'Parcours', sub: 'Des balades toutes prêtes à suivre', badge: rt.routes.length || null, active: !!routeId, onClick: () => openList('routes') }] : []),
    ] },
    { title: 'Outils', items: [
      { key: 'fx', icon: I.money, label: 'Convertisseur $ CA → €', sub: fx.rate ? '1 $ CA = ' + fx.rate.toFixed(2).replace('.', ',') + ' € · taxes et pourboire' : 'Avec taxes et pourboire', active: sheet && sheet.t === 'fx', onClick: () => setSheet({ t: 'fx' }) },
    ] },
    { title: 'Nous deux', items: auth.isEditor ? [
      { key: 'add', icon: I.plus, label: 'Ajouter un lieu', sub: 'À votre position ou par son adresse', lock: true, onClick: startAdd },
    ] : [] },
  ];
  const menuFooter = auth.isEditor
    ? <button type="button" className="menu-item" onClick={() => { setMenuOpen(false); setSheet({ t: 'login' }); }}><span className="menu-ic"><Ic d={I.user} size={22} /></span><span className="menu-txt"><b>Mon compte</b><small>{auth.email}</small></span></button>
    : <button type="button" className="menu-item" onClick={() => { setMenuOpen(false); setSheet({ t: 'login' }); }}><span className="menu-ic"><Ic d={I.lock} size={22} /></span><span className="menu-txt"><b>Connexion</b><small>Pour Matthieu et Azéline</small></span></button>;

  /* ---------- Rendu ---------- */
  let carouselBody;
  if (visible.length) {
    carouselBody = visible.map((p) => {
      const loved = p.visits.some((v) => v.love);
      return (
        <button type="button" key={p.id} data-id={p.id} className="card" aria-current={p.id === selId} onClick={() => openDetail(p.id)}>
          {p.n && <span className="stop-n" style={{ '--c': catColor(p.cat) }} aria-label={'Étape ' + p.n}>{p.n}</span>}
          <span className="thumb" style={{ '--c': catColor(p.cat) }}>
            {p.cover ? <img src={p.cover.thumb} alt="" loading="lazy" /> : <Ic d={I[p.cat]} size={40} sw={1.8} />}
          </span>
          <span className="card-body">
            <span className="card-name">{p.name}</span>
            <span className="card-meta">{(CATS[p.cat] || {}).label} · {where(p)}{p.price ? ' · ' + PRICES[p.price] : ''}</span>
            <span className="card-status">
              {p.visits.length
                ? <>{loved && <span className="heart"><Ic d={I.heart} size={16} fill /></span>}Testé {p.visits.length}×</>
                : <span className="todo-tag">À faire</span>}
              {p.dist != null && <span className="dist">{fmtDist(p.dist)}</span>}
            </span>
          </span>
        </button>
      );
    });
  } else if (routePlaces) {
    carouselBody = <div className="card empty">Ce parcours n'a pas encore d'étape.</div>;
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
        <button className="circle" type="button" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} disabled={!!flow}>
          <Ic d={I.menu} />
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
          onPlace={placeAt} apiRef={mapApi} onToast={toast} onLocate={me.update} me={nearby ? me.pos : null} numbers={numbers} />

        {!flow && viewRoute && (
          <div className="float-top">
            <div className="routebar">
              <span className="routebar-t"><b>{viewRoute.title}</b><small>Parcours · {routePlaces.length} étape{routePlaces.length > 1 ? 's' : ''}</small></span>
              <button type="button" className="chip" onClick={() => setSheet({ t: 'route', id: viewRoute.id })}>Détails</button>
              <button type="button" className="circle" aria-label="Quitter le parcours" onClick={exitRoute}><Ic d={I.close} /></button>
            </div>
          </div>
        )}

        {!flow && !viewRoute && (
          <div className="float-top">
            <div className="searchrow">
              <label className="search"><Ic d={I.search} />
                <input id="q" type="search" placeholder="Recherche" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un lieu" enterKeyHint="search" />
                {q && <button type="button" className="clear" aria-label="Effacer la recherche" onClick={() => setQ('')}><Ic d={I.close} size={18} /></button>}
              </label>
              <button type="button" className={'circle filt' + (nMore ? ' on' : '')} aria-label={'Plus de filtres' + (nMore ? ' (' + nMore + ' actif' + (nMore > 1 ? 's' : '') + ')' : '')}
                aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}>
                <Ic d={I.sliders} />{nMore > 0 && <span className="badge">{nMore}</span>}
              </button>
            </div>
            <div className="chips" role="toolbar" aria-label="Filtres">
              <button type="button" className="chip" aria-pressed={nearby} onClick={toggleNearby}><Ic d={I.locate} size={15} />Autour de moi</button>
              <button type="button" className="chip" aria-pressed={cat === 'all' && flag === 'all' && !nMore} onClick={() => { setCat('all'); setFlag('all'); setMore(emptyMore()); }}>Tout</button>
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
            {moreOpen && <FilterPanel more={more} setMore={setMore} count={visible.length} regions={regions} onClose={() => setMoreOpen(false)} />}
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

      {menuOpen && <MenuSheet sections={menuSections} footer={menuFooter} onClose={() => setMenuOpen(false)} />}
      {sheet && sheet.t === 'list' && (
        <ListSheet places={routePlaces ? filtered : visible} allPlaces={placesD} total={places.length} auth={auth} onClose={() => setSheet(null)}
          onLogin={() => setSheet({ t: 'login' })}
          tab={listTab} setTab={setListTab} routes={rt.routes} routesAvailable={rt.available}
          onPickRoute={(id) => setSheet({ t: 'route', id })} onNewRoute={() => setSheet({ t: 'routeEdit' })}
          onPick={(id) => { setSheet(null); setRouteId(null); focus(id); setTimeout(() => scrollToCard(id), 60); }} />
      )}
      {sheet && sheet.t === 'route' && rt.routes.find((r) => r.id === sheet.id) && (
        <RouteSheet key={sheet.id} route={rt.routes.find((r) => r.id === sheet.id)} places={placesD} isEditor={auth.isEditor} toast={toast}
          onClose={() => { if (routeId === sheet.id) setSheet(null); else { setListTab('routes'); setSheet({ t: 'list' }); } }}
          onShowMap={() => showRoute(sheet.id)}
          onPick={(id) => { const rid = sheet.id; if (routeId !== rid) setRouteId(rid); openDetail(id); }}
          onEdit={() => setSheet({ t: 'routeEdit', id: sheet.id })} />
      )}
      {sheet && sheet.t === 'routeEdit' && auth.isEditor && (
        <RouteEditSheet key={sheet.id || 'new'} route={sheet.id ? rt.routes.find((r) => r.id === sheet.id) : null} places={places}
          onClose={() => (sheet.id ? setSheet({ t: 'route', id: sheet.id }) : (setListTab('routes'), setSheet({ t: 'list' })))}
          onSave={saveRoute} onDelete={removeRoute} />
      )}
      {sheet && sheet.t === 'fx' && <ConverterSheet fx={fx} onClose={() => setSheet(null)} />}
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
