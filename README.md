ng s# O'Mboa — Frontend

Application web Angular 21 pour le restaurant O'Mboa.
Permet aux clients de parcourir le menu, de passer commande via QR code, et aux staff de gérer les opérations.

## Stack

- **Angular 21** — standalone components, signals, lazy loading
- **@microsoft/signalr** — temps réel (statut commandes)
- **Capacitor** — build Android natif
- **Supabase Auth** — authentification via le backend

## Structure des pages

| Route | Rôle | Accès |
|---|---|---|
| `/` | Landing page restaurant | Public |
| `/menu` | Menu complet (lecture seule) | Public |
| `/table/:tableId` | Menu + commande (après scan QR) | Public |
| `/auth/login` | Connexion | Public |
| `/auth/register` | Inscription | Public |
| `/account` | Historique commandes + points fidélité | Client connecté |
| `/admin` | Tableau de bord | Owner |
| `/admin/orders` | Gestion commandes | Owner |
| `/admin/menu` | Gestion menu | Owner |
| `/admin/tables` | Gestion tables + QR codes | Owner |
| `/admin/logs` | Logs d'activité | Owner |
| `/kitchen` | Vue cuisine temps réel | Cook + Owner |

## Installation

```bash
npm install
```

## Lancer en développement

```bash
npm start
# → http://localhost:4200
```

L'API backend doit tourner sur `http://localhost:5000`.
Configurer dans `src/environments/environment.ts` si nécessaire.

## Build production

```bash
npm run build:prod
```

Le build est généré dans `dist/omboa/browser/`.
Déployer ce dossier sur **Vercel** (drag & drop ou CLI).

## Build Android (Capacitor)

1. Build le projet Angular : `npm run build:prod`
2. Synchroniser Capacitor : `npx cap sync android`
3. Ouvrir Android Studio : `npx cap open android`
4. Signer et exporter l'APK depuis Android Studio

> **Note :** Android Studio doit être installé.
> Commande rapide : `npm run cap:sync && npm run cap:open`

## Connexion au backend

Le frontend communique avec `omboa-api` via :
- **REST** pour toutes les opérations CRUD
- **SignalR** (`/hubs/orders`) pour les mises à jour en temps réel

Configurer l'URL de l'API dans `src/environments/environment.prod.ts` avant de builder.

## Design system

Palette : terracotta (`#C0602A`), vert forêt (`#1E3A1A`), or (`#E8B84B`), ivoire crème (`#FBF5EC`).
Polices : Playfair Display (titres) + DM Sans (corps).
Toutes les variables CSS sont dans `src/styles.css`.

### Spécifications images à fournir

| Zone | Dimensions | Ratio | Usage |
|---|---|---|---|
| `hero-bg` | 1920×900 px | 16:7.5 | Fond hero landing |
| `story-img` | 600×750 px | 4:5 | Section "Notre histoire" |
| `specialty-*` | 480×480 px | 1:1 | Spécialités landing |
| `category-img` | 800×420 px | ~16:8 | Images catégories menu |
| `product-thumb` | 320×320 px | 1:1 | Vignettes produits |
| `logo` | 200×200 px | 1:1 | SVG ou PNG transparent |
| `og-image` | 1200×630 px | 1.91:1 | Partage réseaux sociaux |
