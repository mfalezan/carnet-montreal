import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

/* Session Supabase + statut d'éditeur (présence dans la table `editors`). */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [editor, setEditor] = useState(null); // null = inconnu, false = pas éditeur, { who } = éditeur

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session ? session.user.id : null;
  useEffect(() => {
    if (!uid) { setEditor(null); return; }
    let alive = true;
    supabase.from('editors').select('who').eq('user_id', uid).maybeSingle()
      .then(({ data }) => { if (alive) setEditor(data ? { who: data.who } : false); });
    return () => { alive = false; };
  }, [uid]);

  return {
    session,
    email: session ? session.user.email : null,
    anonymous: !!(session && session.user.is_anonymous),
    editor,
    isEditor: !!editor,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
    signOut: () => supabase.auth.signOut(),
  };
}
