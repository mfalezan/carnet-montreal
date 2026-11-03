export default function SetupScreen() {
  return (
    <div className="setup">
      <div className="logo"><b>Le Carnet</b><small>Montréal · testé à deux</small></div>
      <div className="box" style={{ textAlign: 'left', maxWidth: '520px' }}>
        <p className="big" style={{ justifyContent: 'flex-start', fontSize: '22px' }}>Supabase n'est pas encore branché</p>
        <p>Créez un fichier <code>.env.local</code> à la racine du projet (modèle : <code>.env.example</code>) avec :</p>
        <pre>VITE_SUPABASE_URL=…{'\n'}VITE_SUPABASE_KEY=…</pre>
        <p className="small">Sur Vercel, ajoutez ces deux variables dans Settings &gt; Environment Variables, puis redéployez. Le détail est dans le README.</p>
      </div>
    </div>
  );
}
