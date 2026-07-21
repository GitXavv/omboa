import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Page "En savoir plus" liée depuis la landing (section fidélité) - s'adresse au
// restaurateur, pas au client : explique la mécanique réelle du programme (voir
// LoyaltyService côté API) pour qu'il comprenne ce qu'il active pour son restaurant.
@Component({
  selector: 'app-fidelite',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './fidelite.component.html',
  styleUrl: './fidelite.component.css'
})
export class FideliteComponent {}
