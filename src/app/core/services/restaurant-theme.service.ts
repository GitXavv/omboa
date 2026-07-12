import { Injectable, effect, inject } from '@angular/core';
import { RestaurantService } from './restaurant.service';
import { contrastForeground, hexToRgb, shade, toRgba } from '../utils/color';

const PRIMARY_VARS = [
  '--color-primary', '--color-primary-dark', '--color-primary-light',
  '--color-primary-faded', '--color-primary-rgb', '--color-on-primary',
  '--color-accent', '--color-accent-light', '--color-accent-rgb'
];
const SECONDARY_VARS = ['--color-secondary', '--color-secondary-light', '--color-on-secondary'];

// Applique les couleurs de marque du restaurant courant (choisies par le super admin,
// jamais par l'owner) par-dessus la palette omboa par défaut, dès qu'un restaurant est
// résolu (RestaurantService.current()) — couvre aussi bien les pages client que staff,
// puisque les deux vivent sous /:restaurantSlug/*. Reste sans effet sur la landing et
// le super admin (RestaurantService.current() y est explicitement remis à null par App),
// ni sur le footer (--color-footer-bg est un token à part, jamais réécrit ici — le footer
// est partagé avec la landing et doit rester visuellement stable).
//
// --color-accent suit désormais --color-primary (alias via var(), pas de recalcul) : sans
// ça, la personnalisation ne touchait que les boutons/prix alors que la plupart des textes
// mis en avant (titres de section, badges "prêt", quantités...) utilisent --color-accent,
// pas --color-primary — le changement de couleur semblait à peine appliqué.
@Injectable({ providedIn: 'root' })
export class RestaurantThemeService {
  private readonly restaurantSvc = inject(RestaurantService);

  constructor() {
    effect(() => {
      const restaurant = this.restaurantSvc.current();
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
        // Alias — tout ce qui utilisait le doré par défaut (--color-accent) devient la
        // couleur de marque du restaurant, exactement comme --color-primary.
        root.setProperty('--color-accent', 'var(--color-primary)');
        root.setProperty('--color-accent-light', 'var(--color-primary-light)');
        root.setProperty('--color-accent-rgb', 'var(--color-primary-rgb)');
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
}
