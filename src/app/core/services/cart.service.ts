import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { CartItem, Product } from '../models';

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>([]);
  readonly tableId = signal<string | null>(null);

  // Pont entre le header partagé (bouton "Ma commande") et TableComponent, qui gère lui-même
  // son affichage panier/suivi en interne (pas une route séparée) - un Subject plutôt qu'un
  // signal pour ne jamais rejouer une demande passée quand un nouvel onglet table se monte.
  private readonly viewCartRequest$ = new Subject<void>();
  readonly viewCartRequested$ = this.viewCartRequest$.asObservable();
  requestViewCart() { this.viewCartRequest$.next(); }

  // Même pont, pour le bouton "Menu" du header - revient à l'étape menu de TableComponent
  // au lieu de naviguer vers la page menu visiteur.
  private readonly viewMenuRequest$ = new Subject<void>();
  readonly viewMenuRequested$ = this.viewMenuRequest$.asObservable();
  requestViewMenu() { this.viewMenuRequest$.next(); }

  // Même pont, pour l'animation de pulsation du bouton "Ma commande" quand un plat vient
  // d'être ajouté (déclenché par TableComponent, joué par NavbarComponent).
  private readonly pulseRequest$ = new Subject<void>();
  readonly pulseRequested$ = this.pulseRequest$.asObservable();
  requestPulse() { this.pulseRequest$.next(); }

  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  );

  readonly count = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  setTable(id: string) { this.tableId.set(id); }

  add(product: Product, notes = '', quantity = 1) {
    const existing = this.items().find(i => i.product.id === product.id && i.notes === notes);
    if (existing) {
      this.items.update(items =>
        items.map(i => i === existing ? { ...i, quantity: i.quantity + quantity } : i)
      );
    } else {
      this.items.update(items => [...items, { product, quantity, notes }]);
    }
  }

  remove(productId: string) {
    this.items.update(items => items.filter(i => i.product.id !== productId));
  }

  increment(productId: string) {
    this.items.update(items =>
      items.map(i => i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i)
    );
  }

  decrement(productId: string) {
    this.items.update(items =>
      items
        .map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0)
    );
  }

  updateNotes(productId: string, notes: string) {
    this.items.update(items =>
      items.map(i => i.product.id === productId ? { ...i, notes } : i)
    );
  }

  clear() { this.items.set([]); }
}
