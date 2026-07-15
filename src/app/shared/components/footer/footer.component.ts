import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Footer global (landing + pages "En savoir plus" uniquement, voir app.ts) — sur le
// modèle du footer DSCweb (C:\Users\Xavv\Documents\GitHub\DSCweb) : logo + rangée de
// réseaux sociaux, rien d'autre. Le logo n'est volontairement PAS recoloré en CSS
// (contrairement à DSCweb qui applique un filter sur le sien) — on affiche nos vraies
// couleurs de logo.
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
