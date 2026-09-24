# essence, c'est cher

Trouver la station-service la moins chère autour de chez soi, à partir des prix officiels
publiés par l'État ([prix-carburants.gouv.fr](https://www.prix-carburants.gouv.fr/rubrique/opendata/)).

## Fonctionnement

- **Job du matin** — `GET /api/cron/ingest`, déclenché chaque jour par Vercel Cron (`vercel.json`,
  `0 4 * * *` UTC ≈ 6 h en été / 5 h en hiver). Il télécharge le flux officiel (zip XML ISO-8859-1),
  le normalise et l'enregistre (Vercel Blob en production, `data/latest.json` en local).
  Si aucune donnée n'existe encore (premier déploiement), la première requête l'initialise.
- **API** — `GET /api/stations?lat=…&lon=…&radius=…` renvoie les stations du rayon, triées par distance.
  Le front charge 50 km d'un coup : changer le rayon, le carburant ou le tri est instantané.
- **Règles métier**
  - Carburant non choisi → tous les prix affichés à égalité, classement sur le **Gazole** (signalé à l'écran).
  - Un prix de **plus de 7 jours** ou en rupture est exclu du classement (mais visible, grisé, dans la fiche).
  - Rayon par défaut **10 km** (1 à 50 km).
  - « Mon véhicule » : coût réel du plein = prix × litres + carburant consommé pour le trajet
    (distance à vol d'oiseau × 1,3, aller-retour optionnel).
- **Mode « Sur un trajet »** — itinéraire calculé par l'API de la Géoplateforme IGN (gratuite, sans clé),
  simplifié côté client puis envoyé à `POST /api/route-stations`, qui renvoie les stations à moins de
  **3 km de la route par défaut** (1 à 10 km), avec leur position sur le trajet.
  - Essence nécessaire = distance (× 2 en aller-retour) × consommation (6,5 L/100 par défaut, modifiable).
  - **Station recommandée** = celle qui minimise prix × litres du trajet + carburant brûlé pour le détour
    (2 × distance à la route × 1,3). Tris : recommandé, prix, ordre du trajet.
  - « Mon trajet via cette station » ouvre Google Maps avec la station en étape.
- **Géocodage** — Géoplateforme IGN / Base Adresse Nationale (gratuit, sans clé), appelée depuis le navigateur.
- **Carte** — MapLibre + tuiles OpenFreeMap (gratuit, sans clé).

Constantes métier : `src/lib/fuels.ts`, `src/lib/geo.ts`, `src/lib/ranking.ts`, `src/lib/trip.ts`.

## En local

```bash
npm install
npm run ingest   # facultatif : récupère le flux du jour dans data/latest.json
npm run dev      # http://localhost:3000
```

## Déploiement gratuit (Vercel Hobby)

1. Pousser le repo sur GitHub et l'importer dans Vercel.
2. Dans le projet Vercel → **Storage** → créer un store **Blob** et le connecter
   (ajoute `BLOB_READ_WRITE_TOKEN`).
3. **Settings → Environment Variables** : ajouter `CRON_SECRET` (chaîne aléatoire), et si besoin
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_EDITOR_NAME`, `NEXT_PUBLIC_CONTACT_EMAIL` (voir `.env.example`).
4. Déployer. Le cron apparaît dans **Settings → Cron Jobs** ; on peut le lancer à la main pour initialiser.
5. En local, avec le `BLOB_READ_WRITE_TOKEN` de production dans `.env.local` : `npm run brands`
   pour remplir toutes les enseignes d'un coup.

Sur l'offre Hobby, un cron quotidien est autorisé mais son heure exacte peut varier dans l'heure prévue.

## Enseignes et logos

Le flux open data ne contient ni nom ni enseigne. On les lit sur la fiche publique de chaque station
(`prix-carburants.gouv.fr/map/recuperer_infos_pdv/{id}`) et on les garde dans `brands.json` (Blob ou `data/`) :

- le job du matin y consacre jusqu'à ~200 s (fonction limitée à 300 s en Fluid compute), assez pour tout remplir
  en un passage ; ensuite il ne lit que les nouvelles stations et les fiches de plus de 30 jours ;
- `npm run brands` fait le rattrapage complet (~1 min 30 pour ~9 800 stations) — à lancer une fois après le
  premier déploiement, avec `BLOB_READ_WRITE_TOKEN` dans `.env.local` pour écrire dans le Blob de production.

Les logos des principales enseignes sont dans `public/brands/` (récupérés via `npm run logos`, référentiel dans
`src/lib/brands.ts`). Les enseignes sans logo net (Intermarché…) ont une pastille à leurs couleurs.

## SEO

- **Pages de contenu** (rendues côté serveur, ISR 1 h) :
  - `/prix-carburant` — France : moyennes nationales, régions, grandes villes ;
  - `/prix-carburant/[region]` — ex. `/prix-carburant/bretagne` ;
  - `/prix-carburant/[region]/[ville-departement]` — ex. `/prix-carburant/auvergne-rhone-alpes/lyon-69`
    (une page par commune d'au moins 2 stations, soit ~2 000 pages).
- **Texte propre à chaque page** généré depuis les chiffres (écart à la moyenne nationale, station la moins chère,
  évolution 7/30 jours, ville voisine moins chère) : pas de contenu dupliqué.
- **Historique** : le cron ajoute chaque jour les moyennes (France, régions, villes) à `history.json` (35 jours).
- **Données structurées** : BreadcrumbList, ItemList de GasStation, Dataset ; WebSite sur l'accueil.
- **Maillage** : accueil → grandes villes et régions ; ville → région, France, 9 villes proches ; région → villes, autres régions.
- `sitemap.xml` dynamique (lastmod = date du relevé), `robots.txt`, image Open Graph par ville.
- Search Console : fichier de validation dans `public/`, ou balise via `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.

## Conformité

- **Aucun cookie**, aucune mesure d'audience ni publicité : pas de bandeau de consentement nécessaire.
  Seules des préférences choisies par l'utilisateur sont mémorisées en `localStorage` (exemptées de consentement
  par la CNIL), avec un bouton d'effacement sur `/confidentialite`.
- `/mentions-legales` : éditeur (non professionnel, anonyme par défaut), hébergeur, sources et licences
  (Licence Ouverte 2.0, ODbL), avertissement sur les prix, marques.
- `/confidentialite` : données traitées, services tiers, droits.
- En-têtes de sécurité (CSP en production, HSTS, Permissions-Policy limitant la géolocalisation au site).
- SEO : `robots.txt`, `sitemap.xml`, image Open Graph, manifest, icônes.

## Limites connues

- Les fiches publiques ne sont pas une API officielle : si leur HTML change, les nouvelles stations
  s'affichent simplement sans enseigne (adresse en titre) jusqu'à correction du parseur (`src/lib/enrich.ts`).
- Les prix sont déclarés par les stations ; l'âge de chaque prix est affiché partout.
