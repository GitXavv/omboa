import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuService } from '../../core/services/menu.service';
import { CartService } from '../../core/services/cart.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { Category, Product } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [LoaderComponent, DecimalPipe],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent implements OnInit {
  private readonly menuSvc = inject(MenuService);
  private readonly cart    = inject(CartService);
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly restaurantSvc = inject(RestaurantService);

  readonly categories      = signal<Category[]>([]);
  readonly openIds         = signal<Set<string>>(new Set());
  readonly loading         = signal(true);
  readonly searchQuery     = signal('');
  readonly selectedProduct = signal<Product | null>(null);

  readonly allProducts = computed<Product[]>(() => {
    const result: Product[] = [];
    for (const cat of this.categories()) {
      result.push(...(cat.products ?? []));
      for (const sub of (cat.subcategories ?? [])) {
        result.push(...(sub.products ?? []));
      }
    }
    return result;
  });

  readonly searchResults = computed<Product[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return [];
    return this.allProducts().filter(p => p.name.toLowerCase().includes(q));
  });

  // Volet "Notre sélection" — plats marqués `trend` par l'owner, toutes catégories confondues.
  // Pas de temps réel : recalculé uniquement au chargement de la page.
  readonly trendProducts = computed<Product[]>(() =>
    this.allProducts().filter(p => p.trend && p.is_available)
  );

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.searchQuery.set(params.get('q') ?? '');
    });

    const restaurantId = this.restaurantSvc.current()?.id ?? '';
    this.menuSvc.getCategories(restaurantId).subscribe({
      next: cats => {
        this.categories.set(cats);
        if (cats.length) this.openIds.set(new Set([cats[0].id]));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  toggle(id: string) {
    this.openIds.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  isOpen(id: string) { return this.openIds().has(id); }

  clearSearch() { this.router.navigate([], { queryParams: {}, replaceUrl: true }); }

  openProduct(p: Product)  { this.selectedProduct.set(p); document.body.style.overflow = 'hidden'; }
  closeProduct()           { this.selectedProduct.set(null); document.body.style.overflow = ''; }

  addToCart(p: Product) {
    this.cart.add(p);
    this.closeProduct();
  }
}
