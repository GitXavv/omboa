import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  readonly specialties = [
    { name: 'Ndolé aux crevettes', desc: 'Notre incontournable, mijoté lentement avec des crevettes fumées et de la poudre de noisettes.', price: 3500 },
    { name: 'Poulet DG', desc: 'Poulet braisé, banane plantain dorée, légumes sautés. Un classique de la cuisine camerounaise.', price: 4200 },
    { name: 'Poisson braisé', desc: `Poisson du jour mariné aux épices maison, grillé à la braise et servi avec de l'attiéké.`, price: 3800 },
  ];

  readonly steps = [
    { icon: '📱', title: 'Scannez le QR code', desc: 'Chaque table dispose de son QR code. Scannez-le pour accéder directement à notre carte du jour.' },
    { icon: '🍽', title: 'Composez votre repas', desc: 'Parcourez le menu, ajoutez vos plats au panier et ajustez les quantités à votre guise.' },
    { icon: '✅', title: 'Validez & savourez', desc: `Soumettez votre commande. Nos cuisiniers s'en occupent. Vous serez servi directement à votre table.` },
  ];
}
