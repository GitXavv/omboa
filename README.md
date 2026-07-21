# O'Mboa - Frontend

Application web Angular 21 multi-restaurant. Chaque restaurant est accessible sous
`/:restaurantSlug/...` ; un super admin gère la liste des restaurants depuis `/osuper`.
Permet aux clients de parcourir le menu et de passer commande via QR code, et au staff
(admin/cuisine/réception/sortie) de gérer les opérations de son restaurant.

## Stack

- **Angular 21** - standalone components, signals, lazy loading
- **@microsoft/signalr** - temps réel (statut commandes)
- **Capacitor** - build Android natif
- **Supabase Auth** - authentification client uniquement (voir plus bas pour le staff)

## Structure des pages

| Route | Rôle | Accès |
|---|---|---|
| `/` | Landing page globale (tous restaurants) | Public |
| `/:restaurantSlug/menu` | Menu complet (lecture seule) | Public |
| `/:restaurantSlug/table/:tableId` | Menu + commande (après scan QR) | Public |
| `/:restaurantSlug/ma-commande` | Suivi de commande par code | Public |
| `/:restaurantSlug/account` | Historique commandes + points fidélité | Client connecté |
| `/:restaurantSlug/ostaff` | Connexion staff (page cachée, clé secrète) | Public |
| `/:restaurantSlug/admin` | Tableau de bord | Owner |
| `/:restaurantSlug/admin/orders` | Gestion commandes | Owner |
| `/:restaurantSlug/admin/menu` | Gestion menu | Owner |
| `/:restaurantSlug/admin/tables` | Gestion tables + QR codes | Owner |
| `/:restaurantSlug/admin/logs` | Logs d'activité | Owner |
| `/:restaurantSlug/admin/stats` | Statistiques | Owner |
| `/:restaurantSlug/admin/settings` | Clés d'accès staff (rotation) | Owner |
| `/:restaurantSlug/kitchen` | Vue cuisine temps réel | Cook + Owner (lecture seule) |
| `/:restaurantSlug/reception` | Front-of-house (accepter/encaisser/servir) | Receptionist + Owner |
| `/:restaurantSlug/exit` | Recherche par code + libération de table | Exit + Owner |
| `/osuper` | Connexion super admin (page cachée, clé secrète) | Public |
| `/osuper/dashboard` | CRUD restaurants + stats globales | Super admin |
| `/osuper/logs` | Logs des actions du super admin uniquement | Super admin |

**Connexion/inscription client** : plus de route dédiée - c'est une modale ouverte depuis
le bouton "Connexion / Inscription" du header, disponible sur `/menu`, `/table/:id`,
`/ma-commande`, `/account`.

## Authentification - deux systèmes distincts

- **Clients** : Supabase Auth classique (téléphone + mot de passe), un compte par
  restaurant (le numéro de téléphone n'est pas unique globalement).
- **Staff + super admin** : pas de compte individuel. Chaque restaurant a une clé
  secrète par rôle (owner/cook/receptionist/exit), hachée en base (bcrypt), saisie sur
  la page cachée `/:restaurantSlug/ostaff`. Le super admin a sa propre clé, saisie sur
  `/osuper`. Ces clés n'apparaissent dans aucun lien visible de l'app - seule
  l'inscription à l'URL y donne accès.

## Installation

```bash
npm install
```

## Lancer en développement

```bash
npm start
# -> http://localhost:4200
```

L'API backend doit tourner sur `http://localhost:5272`.
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

## Comptes de test (Phase 2)

> ⚠️ Ce sont des clés de **test**, à changer avant toute mise en production réelle.
> Les clés staff se changent depuis `/:restaurantSlug/admin/settings` (owner uniquement).
> La clé super admin n'a pas d'UI de rotation pour l'instant - elle se change directement
> en base (`UPDATE superadmin_auth SET key_hash = crypt('nouvelle_cle', gen_salt('bf'))`).

**Restaurant de test : O'Mboa Test** (slug `o-mboa-test`) - accès staff sur
`/o-mboa-test/ostaff` :

| Rôle | Clé |
|------|-----|
| Admin (owner) | `@Dm,Mboa` |
| Cuisine (cook) | `cu1,Mboa` |
| Réceptionniste | `r3c,Mboa` |
| Sortie (exit) | `s0r,Mboa` |

**Super admin** - accès sur `/osuper` :

| Clé |
|-----|
| `5Npe9,Mboa` |

Les clés sont **sensibles à la casse**. Un seul champ à remplir sur chaque page de
connexion - pas de sélection de rôle : le backend détermine le rôle à partir de la clé
saisie.

Ces clés sont insérées par la migration `sql/migration_multi_restaurant.sql` côté
`omboa-api`, hachées via `pgcrypto`/bcrypt - jamais stockées en clair.

---

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
