# Le Carnet — Montréal

Nos adresses testées à Montréal, sur une carte. Web app installable sur téléphone (PWA), en React + Vite, avec Supabase pour les données, les comptes et les photos.

- **Tout le monde** peut consulter le carnet, sans compte.
- **Matthieu et Azéline** se connectent pour ajouter, modifier et supprimer des lieux, des visites et des photos.

## Ce qu'il y a dedans

| | |
|---|---|
| Carte | MapLibre + tuiles OpenFreeMap (gratuites, sans clé), recolorées aux tons du carnet |
| Lieux | Carrousel synchronisé avec la carte, recherche, filtres (catégorie, coups de cœur, à faire), liste complète |
| Fiche | Verdict, itinéraire Google Maps, infos métro / saison / adresse / lien, photos, historique des visites, partage d'un lien direct (`/?lieu=…`) |
| Écriture | Ajout à sa position GPS ou en touchant la carte, modification (y compris déplacer le point), visites, photos multiples avec couverture, suppression |
| Parcours | Listes ordonnées de lieux (« Un dimanche sur le Plateau »), affichées sur la carte avec étapes numérotées et tracé, itinéraire à pied, lien direct (`/?parcours=…`) |
| Comptes | E-mail + mot de passe Supabase, écriture réservée aux comptes de la table `editors` |
| Photos | Redimensionnées dans le téléphone avant envoi (1600 px + miniature 480 px), stockées dans Supabase Storage |

```
src/
  App.jsx                 écran principal : carte, filtres, carrousel, enchaînement des fiches
  config.js               catégories, saisons, lignes de métro, personnes, icônes
  components/             MapView, DetailSheet, PlaceSheets (ajout/modif), Forms, ListSheet, LoginSheet
  hooks/                  useAuth (session + statut éditeur), usePlaces (chargement + cache local)
  lib/                    supabase.js, api.js (toutes les requêtes), image.js (redimensionnement), utils.js
supabase/
  schema.sql              tables, droits (RLS), bucket photos
  seed.sql                facultatif : les 16 lieux du POC, sans visites
```

## 1. Créer le projet Supabase (10 min)

1. Sur [supabase.com](https://supabase.com), crée un projet (région **Canada (Central)** de préférence). Garde le mot de passe de la base quelque part, il ne sert pas à l'app.
2. **SQL Editor > New query** : colle tout `supabase/schema.sql`, puis **Run**.
3. *(Facultatif)* Nouvelle requête avec `supabase/seed.sql` pour partir avec les lieux du POC.
4. **Authentication > Sign In / Providers** : laisse **Email** activé, active **« Allow anonymous sign-ins »** et laisse **« Allow new users to sign up »** activé. C'est ce qui permet aux visiteurs de choisir un prénom sans mot de passe (Supabase compte un visiteur anonyme comme une inscription). Ça reste sûr : seuls les comptes de la table `editors` peuvent modifier le carnet ; tout autre compte peut seulement aimer, cocher « fait / à faire » et commenter. Si tu ne veux pas de cette fonctionnalité, désactive les deux réglages : les fiches afficheront un message à la place.
5. **Authentication > Users > Add user > Create new user** : crée ton compte et celui d'Azéline (e-mail + mot de passe), en cochant **Auto Confirm User**.
6. Retour dans **SQL Editor**, exécute les deux lignes en bas de `schema.sql` avec vos vrais e-mails :

   ```sql
   insert into public.editors (user_id, who)
     select id, 'm' from auth.users where email = 'ton-email@exemple.com';
   insert into public.editors (user_id, who)
     select id, 'a' from auth.users where email = 'email-d-azeline@exemple.com';
   ```

7. **Project Settings > API Keys** (ou le bouton **Connect**) : note l'**URL du projet** et la clé publique (**publishable key** `sb_publishable_…`, ou l'ancienne **anon key**). Jamais la clé secrète.

> Pourquoi un mot de passe plutôt qu'un lien magique : sur iPhone, un lien reçu par e-mail s'ouvre dans Safari et non dans l'app installée, donc la connexion ne « tient » pas dans l'app. En plus, l'envoi d'e-mails intégré à Supabase est limité aux membres de l'équipe du projet. Le mot de passe évite ces deux soucis ; le gestionnaire de mots de passe du téléphone le retient.

### Prénoms des visiteurs (migrations 006 et 007)

Pour que les visiteurs puissent aimer, cocher et commenter, active dans **Authentication > Sign In / Providers** :
- **Allow anonymous sign-ins**
- **Allow new users to sign up** (requis par Supabase pour les comptes anonymes)

Supabase limite par défaut à 30 nouveaux visiteurs par heure et par adresse IP (réglable dans **Authentication > Rate Limits**). Si un jour tu reçois des commentaires indésirables, tu peux les supprimer depuis la fiche, ou ajouter un captcha (Turnstile) dans **Authentication > Attack Protection**.

### Mettre à jour une base existante

Quand une nouvelle version ajoute des colonnes ou des tables, un fichier apparaît dans `supabase/migrations/`. Exécute-le une fois dans **SQL Editor** (ils peuvent être relancés sans risque), **avant** de mettre la nouvelle version en ligne :

| Fichier | Ajoute |
|---|---|
| `002_etiquettes_prix.sql` | prix ($ à $$$) et étiquettes des lieux |
| `003_parcours.sql` | parcours à partager (tables `routes` et `route_stops`) |
| `004_regions.sql` | région des lieux (activités hors de Montréal) |
| `005_calendrier.sql` | calendrier des visites, visible par vous deux seulement |
| `006_personnes.sql` | prénoms, « j'aime » et « fait / à faire » par personne |
| `007_commentaires.sql` | commentaires avec photo (après la 006) |

Une base créée directement avec la dernière version de `schema.sql` est déjà à jour.

## 2. Lancer en local

```bash
npm install
cp .env.example .env.local     # puis remplis les deux valeurs
npm run dev                    # http://localhost:5173
```

Pour tester sur ton téléphone pendant le développement : `npm run dev -- --host`, puis ouvre l'adresse « Network » affichée, sur le même Wi-Fi. La géolocalisation ne marche qu'en HTTPS : pour la tester, passe par le déploiement Vercel.

## 3. Déployer sur Vercel

1. Pousse le projet sur un dépôt GitHub (privé ou public, le `.env.local` n'est pas envoyé).
2. Sur [vercel.com](https://vercel.com) : **Add New > Project**, importe le dépôt. Vercel reconnaît Vite tout seul.
3. **Environment Variables** : ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_KEY`, puis **Deploy**.
4. Chaque `git push` sur `main` redéploie automatiquement.

Si tu prends un nom de domaine plus tard, rien à changer côté Supabase (l'app n'utilise pas de redirection d'URL).

## 4. Installer l'app sur le téléphone

- **iPhone** : ouvre l'adresse Vercel dans **Safari** > bouton Partager > **Sur l'écran d'accueil**.
- **Android** : Chrome propose **Installer l'application** (ou menu ⋮ > Ajouter à l'écran d'accueil).

Puis dans l'app : icône 👤 en haut à droite > connexion. Une fois connecté, l'icône devient **+** pour ajouter un lieu.

Les mises à jour arrivent toutes seules : à la réouverture suivante, l'app charge la nouvelle version.

## 5. Éviter la mise en pause de Supabase (offre gratuite)

Un projet gratuit sans activité pendant 7 jours est mis en pause. Le fichier `.github/workflows/keepalive.yml` lit un lieu tous les 3 jours pour l'éviter. Dans GitHub > **Settings > Secrets and variables > Actions**, ajoute :

- `SUPABASE_URL` : l'URL du projet
- `SUPABASE_KEY` : la clé publique

Tu peux le lancer à la main une première fois depuis l'onglet **Actions** pour vérifier.

## Personnaliser

- **Catégories, saisons, prénoms, centre de la carte** : `src/config.js`. Si tu ajoutes une catégorie, ajoute-la aussi dans la contrainte `cat` de `schema.sql` (et sa couleur `--c-…` dans `styles.css`).
- **Couleurs et typo** : variables en haut de `src/styles.css` ; couleurs de la carte dans `MAPC`, `src/components/MapView.jsx`.

## Limites connues (pistes pour la suite)

- **Hors ligne** : l'app s'ouvre sans réseau avec la dernière version du carnet et les photos déjà vues, mais pas la carte ni l'ajout de lieux. Pour une vraie carte hors ligne : tuiles Protomaps de la région mises en cache.
- **Photos HEIC** : si un navigateur ne sait pas lire une photo, l'app affiche une erreur. Sur iPhone, Safari convertit normalement en JPEG à l'envoi.
- Les photos sont rattachées au lieu, pas à une visite précise (la colonne `photos.visit_id` est prête si tu veux l'ajouter).
