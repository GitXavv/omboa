import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Le footer est global (rendu sur toutes les pages, y compris hors contexte
// restaurant) — pointe vers l'unique restaurant existant en attendant une vraie UX
// de découverte multi-restaurant (même limitation que la landing page).
const DEFAULT_RESTAURANT_SLUG = 'o-mboa-test';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
  readonly restaurantSlug = DEFAULT_RESTAURANT_SLUG;
}
