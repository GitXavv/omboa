import { Injectable, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { RestaurantService } from './restaurant.service';
import { contrastForeground, hexToRgb, retint, shade, toRgba } from '../utils/color';

const PRIMARY_VARS = [
  '--color-primary', '--color-primary-dark', '--color-primary-light',
  '--color-primary-faded', '--color-primary-rgb', '--color-on-primary',
  '--color-accent', '--color-accent-light', '--color-accent-rgb',
  '--color-text-muted', '--color-text-light', '--color-border',
  '--color-bg', '--color-bg-card', '--color-bg-subtle', '--color-surface'
];
const SECONDARY_VARS = ['--color-secondary', '--color-secondary-light', '--color-on-secondary'];

// Saturation/valeur (HSV, fractions 0-1) d'origine de chaque ton neutre - mesurées sur
// la palette Omboa par défaut, pour que le "poids" visuel (contraste, lisibilité) ne
// change jamais, seule la teinte suit la couleur du restaurant.
const NEUTRAL_SV: Record<string, [number, number]> = {
  '--color-text-muted': [0.40, 0.72],
  '--color-text-light': [0.53, 0.48],
  '--color-border':     [0.72, 0.24],
  '--color-bg':         [0.71, 0.09],
  '--color-bg-card':    [0.74, 0.14],
  '--color-bg-subtle':  [0.72, 0.17],
  '--color-surface':    [0.62, 0.17]
};

// Applique les couleurs de marque du restaurant courant (choisies par le super admin,
// jamais par l'owner) par-dessus la palette omboa par défaut - UNIQUEMENT sur les routes
// /:restaurantSlug/*. La landing page et /osuper ne doivent JAMAIS être teintées : ce
// service vérifie donc lui-même la route courante (inRestaurantContext, dérivé des
// événements Router ici, pas d'une valeur poussée par un autre composant) en plus de
// RestaurantService.current() - même si ce dernier reste par erreur non-nul en quittant
// un restaurant (App.clear() a aussi son propre filet de sécurité), la vérification de
// route ci-dessous suffit à elle seule à empêcher toute fuite de couleur vers la landing
// ou le super admin.
//
// --color-accent suit désormais --color-primary (alias via var(), pas de recalcul) : sans
// ça, la personnalisation ne touchait que les boutons/prix alors que la plupart des textes
// mis en avant (titres de section, badges "prêt", quantités...) utilisent --color-accent,
// pas --color-primary - le changement de couleur semblait à peine appliqué.
@Injectable({ providedIn: 'root' })
export class RestaurantThemeService {
  private readonly restaurantSvc = inject(RestaurantService);
  private readonly router = inject(Router);

  // Défaut à false tant qu'aucun NavigationEnd n'a encore été observé - évite tout flash
  // de couleur personnalisée avant que la première navigation n'ait confirmé la route.
  private readonly inRestaurantContext = signal(this.isRestaurantRoute(this.router.url));

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => this.inRestaurantContext.set(this.isRestaurantRoute(e.urlAfterRedirects)));

    effect(() => {
      const restaurant = this.inRestaurantContext() ? this.restaurantSvc.current() : null;
      const root = document.documentElement.style;

      if (restaurant?.color_primary) {
        const p = restaurant.color_primary;
        const rgb = hexToRgb(p);
        root.setProperty('--color-primary', p);
        root.setProperty('--color-primary-dark', shade(p, -0.22));
        root.setProperty('--color-primary-light', shade(p, 0.22));
        root.setProperty('--color-primary-faded', toRgba(p, 0.12));
        if (rgb) root.setProperty('--color-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        // Texte lisible sur un bouton/badge de cette couleur, même si le restaurant
        // a choisi une teinte très claire (pas de blanc sur blanc).
        root.setProperty('--color-on-primary', contrastForeground(p));
        // Alias - tout ce qui utilisait le doré par défaut (--color-accent) devient la
        // couleur de marque du restaurant, exactement comme --color-primary.
        root.setProperty('--color-accent', 'var(--color-primary)');
        root.setProperty('--color-accent-light', 'var(--color-primary-light)');
        root.setProperty('--color-accent-rgb', 'var(--color-primary-rgb)');
        // Tons neutres (texte discret, bordures, fonds de carte) - reteintés dans la
        // même teinte que la couleur de marque, sans changer leur contraste/lisibilité.
        // Sans ça, la plupart des libellés, bordures et fonds de section restaient
        // visuellement "marron" malgré un bouton/prix bien coloré.
        for (const [varName, [s, v]] of Object.entries(NEUTRAL_SV)) {
          root.setProperty(varName, retint(p, s, v));
        }
      } else {
        PRIMARY_VARS.forEach(v => root.removeProperty(v));
      }

      if (restaurant?.color_secondary) {
        const s = restaurant.color_secondary;
        root.setProperty('--color-secondary', s);
        root.setProperty('--color-secondary-light', shade(s, 0.18));
        root.setProperty('--color-on-secondary', contrastForeground(s));
      } else {
        SECONDARY_VARS.forEach(v => root.removeProperty(v));
      }
    });
  }

  // Vrai uniquement pour /:restaurantSlug/* - jamais pour '/' (landing) ni '/osuper*'.
  private isRestaurantRoute(url: string): boolean {
    const path = url.split('?')[0];
    const segments = path.split('/').filter(Boolean);
    return segments.length > 0 && segments[0] !== 'osuper';
  }
}
