import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Category, Product, TableStatus } from '../../core/models';
import { CartService } from '../../core/services/cart.service';
import { MenuService } from '../../core/services/menu.service';
import { TableService } from '../../core/services/table.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaymentMethod } from '../../core/models';

type Step = 'menu' | 'cart' | 'payment' | 'confirmation';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [ProductCardComponent, LoaderComponent, DecimalPipe, RouterLink],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css'
})
export class TableComponent implements OnInit, OnDestroy {
  readonly cart       = inject(CartService);
  readonly auth       = inject(AuthService);
  private readonly menuSvc  = inject(MenuService);
  private readonly tableSvc = inject(TableService);
  private readonly orderSvc = inject(OrderService);
  private readonly toast    = inject(ToastService);
  private readonly rt       = inject(RealtimeService);
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);

  readonly step          = signal<Step>('menu');
  readonly table         = signal<TableStatus | null>(null);
  readonly categories    = signal<Category[]>([]);
  readonly activeId      = signal<string | null>(null);
  readonly loading       = signal(true);
  readonly tableError    = signal<string | null>(null);
  readonly submitting    = signal(false);
  readonly orderId       = signal<string | null>(null);

  // Paiement
  readonly payMethod     = signal<PaymentMethod>('cash');
  readonly payPhone      = signal('');

  // Points fidélité
  readonly usePoints     = signal(false);
  readonly pointsToUse   = signal(0);
  readonly loyaltyBalance = signal(0);

  readonly activeCategory = computed(() =>
    this.categories().find(c => c.id === this.activeId()) ?? this.categories()[0] ?? null
  );

  readonly cartQuantity = (productId: string) =>
    this.cart.items().find(i => i.product.id === productId)?.quantity ?? 0;

  private subs = new Subscription();

  ngOnInit() {
    const tableId = this.route.snapshot.paramMap.get('tableId')!;
    this.cart.setTable(tableId);

    this.tableSvc.getById(tableId).subscribe({
      next: t => {
        if (!t.is_active) {
          this.tableError.set(`Cette table n'est pas disponible.`);
          this.loading.set(false);
          return;
        }
        if (t.is_occupied) {
          this.tableError.set('Cette table est déjà occupée. Veuillez contacter le personnel.');
          this.loading.set(false);
          return;
        }
        this.table.set(t);
        this.loadMenu();
      },
      error: () => {
        this.tableError.set('Table introuvable. Vérifiez votre QR code.');
        this.loading.set(false);
      }
    });

    // Écoute temps réel (statut commande après soumission)
    this.rt.connect(this.auth.getToken() ?? undefined);
    this.subs.add(
      this.rt.events$.subscribe(ev => {
        if (ev.type === 'order:status' && ev.payload.orderId === this.orderId()) {
          if (ev.payload.status === 'preparing') {
            this.toast.info('Votre commande est en préparation 👨‍🍳');
          }
          if (ev.payload.status === 'ready') {
            this.toast.success('Votre commande est prête ! Elle arrive bientôt. 🎉');
          }
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.rt.disconnect();
  }

  private loadMenu() {
    this.menuSvc.getCategories().subscribe({
      next: cats => {
        this.categories.set(cats);
        if (cats.length) this.activeId.set(cats[0].id);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  selectCategory(id: string) { this.activeId.set(id); }
  addToCart(p: Product)    { this.cart.add(p); this.toast.success(`${p.name} ajouté au panier`); }
  removeFromCart(p: Product) { this.cart.decrement(p.id); }

  goToCart()    { this.step.set('cart'); }
  goToMenu()    { this.step.set('menu'); }
  goToPayment() { this.step.set('payment'); }

  submitOrder() {
    const tableId = this.table()?.id;
    if (!tableId || !this.cart.items().length) return;

    this.submitting.set(true);
    const payload = {
      table_id:    tableId,
      customer_id: this.auth.currentUser()?.id,
      items: this.cart.items().map(i => ({
        product_id: i.product.id,
        quantity:   i.quantity,
        unit_price: i.product.price,
        notes:      i.notes || undefined
      }))
    };

    this.orderSvc.create(payload).subscribe({
      next: order => {
        // Paiement fictif immédiat
        this.orderSvc.pay({
          order_id:        order.id,
          method:          this.payMethod(),
          phone_number:    this.payPhone() || undefined,
          points_to_spend: this.usePoints() ? this.pointsToUse() : undefined
        }).subscribe({
          next: () => {
            this.orderId.set(order.id);
            this.cart.clear();
            this.step.set('confirmation');
            this.submitting.set(false);
          },
          error: () => {
            this.toast.error('Erreur lors du paiement. Réessayez.');
            this.submitting.set(false);
          }
        });
      },
      error: () => {
        this.toast.error('Impossible de créer la commande. Réessayez.');
        this.submitting.set(false);
      }
    });
  }
}
