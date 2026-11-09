import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import * as api from '../lib/api.js';
import { WHO } from '../config.js';

/* Les personnes qui utilisent le carnet : prénoms, et leurs réactions sur les lieux.
   « me » = la personne sur cet appareil (visiteur anonyme ou éditeur), null si pas encore identifiée. */
export function usePeople(auth) {
  const [names, setNames] = useState({});
  const [reactions, setReactions] = useState([]);
  const [available, setAvailable] = useState(true);

  const reload = useCallback(async () => {
    const data = await api.fetchPeople();
    if (data === null) { setAvailable(false); return; }
    setAvailable(true);
    setNames(data.names);
    setReactions(data.reactions);
  }, []);
  useEffect(() => { reload().catch(() => {}); }, [reload]);

  const uid = auth.session ? auth.session.user.id : null;

  /* Un éditeur reçoit automatiquement son prénom (Matthieu / Azéline) */
  useEffect(() => {
    if (!available || !uid || !auth.editor || names[uid]) return;
    const name = WHO[auth.editor.who];
    api.saveProfile(uid, name).then(() => setNames((n) => ({ ...n, [uid]: name }))).catch(() => {});
  }, [available, uid, auth.editor, names]);

  const me = uid && names[uid] ? { id: uid, name: names[uid], anonymous: !!auth.session.user.is_anonymous } : null;

  /* S'identifier par un prénom (crée un compte anonyme si besoin), ou changer de prénom */
  const identify = async (name) => {
    let id = uid;
    if (!id) {
      const { data, error } = await supabase.auth.signInAnonymously({ options: { data: { name: name.trim() } } });
      if (error) throw error;
      id = data.user.id;
    }
    await api.saveProfile(id, name);
    setNames((n) => ({ ...n, [id]: name.trim() }));
    return id;
  };

  /* Réagir sur un lieu, avec mise à jour immédiate de l'écran (annulée en cas d'échec).
     userId permet d'agir juste après l'identification, avant que « me » soit à jour. */
  const latest = useRef(reactions);
  latest.current = reactions;
  const react = async (placeId, patch, userId) => {
    const who = userId || (me && me.id);
    if (!who) throw new Error('Identifiez-vous d\u2019abord.');
    const prev = latest.current;
    const cur = prev.find((r) => r.place_id === placeId && r.user_id === who) || { place_id: placeId, user_id: who, liked: false, status: null };
    const next = { ...cur, ...patch };
    const rest = prev.filter((r) => !(r.place_id === placeId && r.user_id === who));
    const updated = next.liked || next.status ? rest.concat([next]) : rest;
    latest.current = updated;
    setReactions(updated);
    try { await api.saveReaction(placeId, who, next); }
    catch (e) { latest.current = prev; setReactions(prev); throw e; }
  };

  const forget = async () => { await supabase.auth.signOut(); };

  return { available, names, reactions, me, identify, react, forget, reload };
}
