/* Référentiels de l'app — modifiez ici les libellés, couleurs et personnes. */

export const CATS = {
  bouffe:  { label: 'Bouffe',  v: '--c-food' },
  vues:    { label: 'Vues',    v: '--c-view' },
  culture: { label: 'Culture', v: '--c-culture' },
  parcs:   { label: 'Parcs',   v: '--c-park' },
  sorties: { label: 'Sorties', v: '--c-night' },
};
export const catColor = (c) => 'var(' + (CATS[c] ? CATS[c].v : '--muted') + ')';

export const SEASONS = { toute: "Toute l'année", ete: "Plutôt l'été", hiver: "Plutôt l'hiver" };

export const LINES = { verte: '#008E4F', orange: '#F08123', jaune: '#FFE300', bleue: '#0083CA' };

/* Prix indicatif */
export const PRICES = { 1: '$', 2: '$$', 3: '$$$' };

/* Étiquettes pratiques : ajoutez-en librement (la clé est stockée en base, le libellé peut changer) */
export const TAGS = {
  brunch: 'Brunch',
  cafe: 'Café',
  terrasse: 'Terrasse',
  vege: 'Végé',
  pluie: 'Par temps de pluie',
  gratuit: 'Gratuit',
  famille: 'En famille',
  soir: 'En soirée',
};

/* Clés stockées en base : 'deux', 'm', 'a' (voir supabase/schema.sql). */
export const WHO = { deux: 'À deux', m: 'Matthieu', a: 'Azéline' };

/* Centre et zoom de départ de la carte */
export const MAP_START = { lng: -73.578, lat: 45.513, zoom: 12.6 };

/* Icônes (traits 24 px) */
export const I = {
  bouffe: 'M6 3v6a2 2 0 0 0 4 0V3M8 11v10M17 21V3c-2.2 1.2-3 3.6-3 7 0 1.7.9 3 3 3',
  vues: 'M3 20 9.5 9l4 6 2.5-3.5L21 20Z',
  culture: 'M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  parcs: 'M12 22v-6M12 2 6.5 10H9l-4 6h14l-4-6h2.5Z',
  sorties: 'M12 3l2.5 5.3 5.8.7-4.3 4 1.1 5.8L12 16l-5.1 2.8L8 13 3.7 9l5.8-.7Z',
  list: 'M4 4h6v6H4zM4 14h6v6H4zM13 6h7M13 9h5M13 16h7M13 19h5',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
  locate: 'M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM12 2v3M12 19v3M2 12h3M19 12h3',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14ZM20 20l-4-4',
  close: 'M6 6l12 12M18 6 6 18', back: 'M15 5l-7 7 7 7',
  share: 'M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  route: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14',
  heart: 'M12 21s-7.5-4.6-9.5-9.2C1 8.2 3.4 4.5 7 4.5c2.1 0 3.6 1.1 5 2.9 1.4-1.8 2.9-2.9 5-2.9 3.6 0 6 3.7 4.5 7.3C19.5 16.4 12 21 12 21Z',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12ZM14.5 9a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 21a7.5 7.5 0 0 1 15 0',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4ZM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5h.01',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6',
  walk: 'M13 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM9 21l2.5-7.5L14 16v5M7 12l2-4.5 3.5 1L15 12h3M11.5 13.5 9.5 8.5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  sliders: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
};
