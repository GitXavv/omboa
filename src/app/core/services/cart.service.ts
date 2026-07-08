import { Injectable, signal, computed } from '@angular/core';
import { CartItem, Product } from '../models';

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>([]);
  readonly tableId = signal<string | null>(null);

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
