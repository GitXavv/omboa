import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { forkJoin, switchMap } from 'rxjs';
import { MenuService } from '../../core/services/menu.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { Product } from '../../core/models';

interface SelectionItem {
  product: Product;
  categoryName: string;
}

// La landing page est globale (pas de contexte restaurant dans l'URL). En attendant une
// vraie UX de découverte multi-restaurant, elle met en avant le seul restaurant existant.
const DEFAULT_RESTAURANT_SLUG = 'o-mboa-test';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  readonly restaurantSlug = DEFAULT_RESTAURANT_SLUG;

  readonly fallbackSelection = [
    { name: 'Ndolé aux crevettes', desc: 'Notre incontournable, mijoté lentement avec des crevettes fumées et de la poudre de noisettes.', price: 3500 },
    { name: 'Poulet DG', desc: 'Poulet braisé, banane plantain dorée, légumes sautés. Un classique de la cuisine camerounaise.', price: 4200 },
    { name: 'Poisson braisé', desc: `Poisson du jour mariné aux épices maison, grillé à la braise et servi avec de l'attiéké.`, price: 3800 },
  ];

  selection = signal<SelectionItem[] | null>(null);

  readonly steps = [
    { icon: '📱', title: 'Scannez le QR code', desc: 'Chaque table dispose de son QR code. Scannez-le pour accéder directement à notre carte du jour.' },
    { icon: '🍽', title: 'Composez votre repas', desc: 'Parcourez le menu, ajoutez vos plats au panier et ajustez les quantités à votre guise.' },
    { icon: '✅', title: 'Validez & savourez', desc: `Soumettez votre commande. Nos cuisiniers s'en occupent. Vous serez servi directement à votre table.` },
  ];

  constructor(private menuService: MenuService, private restaurantSvc: RestaurantService) {}

  ngOnInit() {
    this.restaurantSvc.getBySlug(DEFAULT_RESTAURANT_SLUG).pipe(
      switchMap(restaurant => forkJoin({
        categories: this.menuService.getCategories(restaurant.id),
        products: this.menuService.getProducts(restaurant.id)
      }))
    ).subscribe({
      next: ({ categories, products }) => {
        const byCategory = new Map<string, Product[]>();
        for (const p of products.filter(p => p.is_available)) {
          const list = byCategory.get(p.category_id) ?? [];
          list.push(p);
          byCategory.set(p.category_id, list);
        }

        const eligible = categories.filter(c => c.is_active && byCategory.has(c.id));
        const shuffled = eligible.sort(() => Math.random() - 0.5).slice(0, 3);

        const result: SelectionItem[] = shuffled.map(cat => {
          const prods = byCategory.get(cat.id)!;
          const product = prods[Math.floor(Math.random() * prods.length)];
          return { product, categoryName: cat.name };
        });

        if (result.length > 0) this.selection.set(result);
      },
      error: () => { /* fallback static data used */ }
    });
  }
}
