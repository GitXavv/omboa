import { Component, OnInit, signal, computed } from '@angular/core';
import { MenuService } from '../../core/services/menu.service';
import { Category, Product } from '../../core/models';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [ProductCardComponent, LoaderComponent],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent implements OnInit {
  readonly categories  = signal<Category[]>([]);
  readonly activeId    = signal<string | null>(null);
  readonly loading     = signal(true);
  readonly searchQuery = signal('');

  readonly activeCategory = computed(() =>
    this.categories().find(c => c.id === this.activeId()) ?? this.categories()[0] ?? null
  );

  readonly filteredProducts = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const products = this.activeCategory()?.products ?? [];
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  });

  constructor(private menuSvc: MenuService) {}

  ngOnInit() {
    this.menuSvc.getCategories().subscribe({
      next: cats => {
        this.categories.set(cats);
        if (cats.length) this.activeId.set(cats[0].id);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  select(id: string) { this.activeId.set(id); this.searchQuery.set(''); }
  search(e: Event)   { this.searchQuery.set((e.target as HTMLInputElement).value); }
}
