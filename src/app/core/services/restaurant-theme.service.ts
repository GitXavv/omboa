import { Injectable, effect, inject } from '@angular/core';
import { RestaurantService } from './restaurant.service';
import { contrastForeground, shade, toRgba } from '../utils/color';

const PRIMARY_VARS = [
  '--color-primary', '--color-primary-dark', '--color-primary-light',
  '--color-primary-faded', '--color-on-primary'
];
const SECONDARY_VARS = ['--color-secondary', '--color-secondary-light', '--color-on-secondary'];

// Applique les couleurs de marque du restaurant courant (choisies par le super admin,
// jamais par l'owner) par-dessus la palette omboa par défaut, dès qu'un restaurant est
// résolu (RestaurantService.current()) — couvre aussi bien les pages client que staff,
// puisque les deux vivent sous /:restaurantSlug/*. Reste sans effet sur la landing et
// le super admin (RestaurantService.current() y est explicitement remis à null par App).
// L'accent (--color-accent) n'est volontairement PAS personnalisable — seuls
// primary/secondary le sont, comme demandé.
@Injectable({ providedIn: 'root' })
export class RestaurantThemeService {
  private readonly restaurantSvc = inject(RestaurantService);

  constructor() {
    effect(() => {
      const restaurant = this.restaurantSvc.current();
      const root = document.documentElement.style;

      if (restaurant?.color_primary) {
        const p = restaurant.color_primary;
        root.setProperty('--color-primary', p);
        root.setProperty('--color-primary-dark', shade(p, -0.22));
        root.setProperty('--color-primary-light', shade(p, 0.22));
        root.setProperty('--color-primary-faded', toRgba(p, 0.12));
        // Texte lisible sur un bouton/badge de cette couleur, même si le restaurant
        // a choisi une teinte très claire (pas de blanc sur blanc).
        root.setProperty('--color-on-primary', contrastForeground(p));
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
