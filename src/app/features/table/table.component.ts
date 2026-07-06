import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Category, Order, OrderStatus, Product, TableStatus } from '../../core/models';
import { CartService } from '../../core/services/cart.service';
import { MenuService } from '../../core/services/menu.service';
import { TableService } from '../../core/services/table.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaymentMethod } from '../../core/models';

type Step = 'menu' | 'cart' | 'payment' | 'confirmation' | 'tracking';

const TERMINAL_STATUSES = ['cancelled', 'served'];

const STATUS_LABELS: Partial<Record<string, string>> = {
  pending:   'En attente',
  preparing: 'En préparation',
  ready:     'Prête — elle arrive bientôt !',
  paid:      'Payée — en attente de livraison',
  served:    'Servie',
  cancelled: 'Annulée',
};

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [LoaderComponent, DecimalPipe, RouterLink],
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

  readonly step             = signal<Step>('menu');
  readonly table            = signal<TableStatus | null>(null);
  readonly categories       = signal<Category[]>([]);
  readonly openIds          = signal<Set<string>>(new Set());
  readonly loading          = signal(true);
  readonly tableError       = signal<string | null>(null);
  readonly submitting       = signal(false);
  readonly orderId          = signal<string | null>(null);
  readonly orderCode        = signal<string | null>(null);
  readonly codeCopied       = signal(false);
  readonly selectedProduct  = signal<Product | null>(null);
  readonly commandeTooltip  = signal(false);
  readonly showLoyaltyPromo = signal(false);

  // Tracking d'une commande existante (table occupée + localStorage)
  readonly trackedOrder       = signal<Order | null>(null);
  readonly trackedStatusLabels = STATUS_LABELS;
  readonly cancelling         = signal(false);

  // Popup cuisine → client
  readonly kitchenPopup     = signal<{ type: 'question' | 'cancel'; message: string } | null>(null);
  readonly kitchenReply     = signal('');
  readonly kitchenReplySent = signal(false);

  // Paiement
  readonly payMethod     = signal<PaymentMethod>('cash');
  readonly payPhone      = signal('');
  readonly confirmedAmount = signal<number | null>(null);

  // Popup paiement en espèce
  readonly cashPopupStep     = signal<'info' | 'code' | null>(null);
  readonly cashCodeInput     = signal('');
  readonly cashCodeError     = signal('');
  readonly cashCodeSubmitting = signal(false);
  readonly cashCountdown     = signal(0);
  readonly cashRemindDisabled = signal(true);
  readonly cashChangeDisabled = signal(true);
  readonly cashReminderSent   = signal(false);

  // Points fidélité
  readonly usePoints      = signal(false);
  readonly pointsToUse    = signal(0);
  readonly loyaltyBalance = signal(0);

  readonly cartQuantity = (productId: string) =>
    this.cart.items().find(i => i.product.id === productId)?.quantity ?? 0;

  private subs = new Subscription();
  private longPressTimer?: ReturnType<typeof setTimeout>;
  private tooltipHideTimer?: ReturnType<typeof setTimeout>;
  private cashCountdownInterval?: ReturnType<typeof setInterval>;
  private readonly PROMO_KEY    = 'omboa_loyalty_promo_dismissed';
  private readonly STORAGE_KEY  = 'omboa_current_order';

  ngOnInit() {
    const tableId = this.route.snapshot.paramMap.get('tableId')!;
    this.cart.setTable(tableId);

    const dismissed = parseInt(localStorage.getItem(this.PROMO_KEY) ?? '0', 10);
    if (!this.auth.isLoggedIn() && dismissed < 2) {
      this.showLoyaltyPromo.set(true);
    }

    let storedOrder: { id: string; code: string } | null = null;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      storedOrder = raw ? JSON.parse(raw) : null;
    } catch { /* ignore */ }

    this.tableSvc.getById(tableId).subscribe({
      next: t => {
        if (!t.is_active) {
          this.tableError.set(`Cette table n'est pas disponible.`);
          this.loading.set(false);
          return;
        }

        if (t.is_occupied) {
          if (storedOrder) {
            this.orderSvc.getById(storedOrder.id).subscribe({
              next: order => {
                if (order.table_id === tableId && !TERMINAL_STATUSES.includes(order.status)) {
                  this.table.set(t);
                  this.orderId.set(order.id);
                  this.orderCode.set(order.code ?? null);
                  this.trackedOrder.set(order);
                  this.step.set('tracking');
                  this.rt.invoke('JoinOrder', order.id).catch(() => {});
                } else {
                  localStorage.removeItem(this.STORAGE_KEY);
                  this.tableError.set('Cette table est occupée. Retrouvez votre commande via « Ma commande ».');
                }
                this.loading.set(false);
              },
              error: () => {
                localStorage.removeItem(this.STORAGE_KEY);
                this.tableError.set('Cette table est occupée. Retrouvez votre commande via « Ma commande ».');
                this.loading.set(false);
              }
            });
          } else {
            this.tableError.set('Cette table est déjà occupée. Si vous avez déjà passé une commande, retrouvez-la via « Ma commande ».');
            this.loading.set(false);
          }
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

    this.rt.connect(this.auth.getToken() ?? undefined);
    this.subs.add(
      this.rt.events$.subscribe(ev => {
        if (ev.type === 'order:status' && ev.payload.orderId === this.orderId()) {
          const s = ev.payload.status;
          // Mise à jour du statut de la commande trackée
          this.trackedOrder.update(o => o ? { ...o, status: s as OrderStatus } : null);
          if (s === 'preparing') this.toast.info('Votre commande est en préparation 👨‍🍳');
          if (s === 'ready')     this.toast.success('Votre commande est prête ! Elle arrive bientôt. 🎉');
          if (TERMINAL_STATUSES.includes(s)) {
            localStorage.removeItem(this.STORAGE_KEY);
          }
        }
        if (ev.type === 'kitchen:question') {
          this.kitchenPopup.set({ type: 'question', message: ev.payload.question });
          this.kitchenReply.set('');
          this.kitchenReplySent.set(false);
        }
        if (ev.type === 'kitchen:cancel') {
          this.kitchenPopup.set({ type: 'cancel', message: ev.payload.reason });
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.rt.disconnect();
    clearTimeout(this.longPressTimer);
    clearTimeout(this.tooltipHideTimer);
    clearInterval(this.cashCountdownInterval);
  }

  private loadMenu() {
    this.menuSvc.getCategories().subscribe({
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

  openProduct(p: Product)  { this.selectedProduct.set(p); document.body.style.overflow = 'hidden'; }
  closeProduct()           { this.selectedProduct.set(null); document.body.style.overflow = ''; }

  addToCart(p: Product) {
    this.cart.add(p);
    this.toast.success(`${p.name} ajouté à ma commande`);
    if (this.selectedProduct()) this.closeProduct();
  }

  removeFromCart(p: Product) { this.cart.decrement(p.id); }

  goToCart()    { this.step.set('cart'); }
  goToMenu()    { this.step.set('menu'); }
  goToPayment() { this.step.set('payment'); }

  onCommandeTouchStart() {
    this.longPressTimer = setTimeout(() => this.commandeTooltip.set(true), 500);
  }

  onCommandeTouchEnd() {
    clearTimeout(this.longPressTimer);
    clearTimeout(this.tooltipHideTimer);
    this.tooltipHideTimer = setTimeout(() => this.commandeTooltip.set(false), 1500);
  }

  dismissLoyaltyPromo() {
    const prev = parseInt(localStorage.getItem(this.PROMO_KEY) ?? '0', 10);
    localStorage.setItem(this.PROMO_KEY, String(prev + 1));
    this.showLoyaltyPromo.set(false);
  }

  dismissKitchenPopup() {
    this.kitchenPopup.set(null);
    this.kitchenReply.set('');
    this.kitchenReplySent.set(false);
  }

  submitKitchenReply() {
    const reply = this.kitchenReply().trim();
    if (!reply || this.kitchenReplySent()) return;
    const tableNumber = String(this.table()?.number ?? '');
    this.rt.invoke('ReplyToKitchen', this.orderId()!, reply, tableNumber)
      .then(() => this.kitchenReplySent.set(true));
  }

  copyCode() {
    const code = this.orderCode();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => this.codeCopied.set(true));
  }

  // ── Tracking : annuler la commande ──────────────────────────────────────
  cancelTrackedOrder() {
    const id = this.orderId();
    if (!id || this.cancelling()) return;
    this.cancelling.set(true);
    this.orderSvc.cancel(id).subscribe({
      next: () => {
        localStorage.removeItem(this.STORAGE_KEY);
        this.cancelling.set(false);
        this.toast.info('Commande annulée.');
      },
      error: () => {
        this.toast.error('Impossible d\'annuler la commande.');
        this.cancelling.set(false);
      }
    });
  }

  startNewOrder() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.trackedOrder.set(null);
    this.orderId.set(null);
    this.orderCode.set(null);
    this.loading.set(true);
    this.step.set('menu');
    this.cart.clear();
    this.loadMenu();
  }

  // ── Paiement ─────────────────────────────────────────────────────────────
  submitOrder() {
    // Re-paiement pour une commande existante (changement de mode)
    if (this.orderId()) {
      this.repayExistingOrder();
      return;
    }

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
        this.orderId.set(order.id);
        this.orderCode.set(order.code ?? null);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ id: order.id, code: order.code }));
        this.rt.invoke('JoinOrder', order.id).catch(() => {});
        this.processPayment(order.id);
      },
      error: () => {
        this.toast.error('Impossible de créer la commande. Réessayez.');
        this.submitting.set(false);
      }
    });
  }

  private repayExistingOrder() {
    this.submitting.set(true);
    this.processPayment(this.orderId()!);
  }

  private processPayment(orderId: string) {
    this.orderSvc.pay({
      order_id:        orderId,
      method:          this.payMethod(),
      phone_number:    this.payPhone() || undefined,
      points_to_spend: this.usePoints() ? this.pointsToUse() : undefined
    }).subscribe({
      next: payment => {
        this.confirmedAmount.set(payment.amount);
        this.cart.clear();
        this.step.set('confirmation');
        this.submitting.set(false);

        if (payment.method === 'cash' && payment.status === 'pending') {
          this.cashPopupStep.set('info');
          this.cashReminderSent.set(false);
          this.startCashCountdown();
        }
      },
      error: () => {
        this.toast.error('Erreur lors du paiement. Réessayez.');
        this.submitting.set(false);
      }
    });
  }

  // ── Cash popup ───────────────────────────────────────────────────────────
  private startCashCountdown() {
    clearInterval(this.cashCountdownInterval);
    this.cashCountdown.set(30);
    this.cashRemindDisabled.set(true);
    this.cashChangeDisabled.set(true);
    this.cashCountdownInterval = setInterval(() => {
      const c = this.cashCountdown() - 1;
      this.cashCountdown.set(c);
      if (c <= 0) {
        clearInterval(this.cashCountdownInterval);
        this.cashRemindDisabled.set(false);
        this.cashChangeDisabled.set(false);
      }
    }, 1000);
  }

  sendServerReminder() {
    if (this.cashRemindDisabled()) return;
    const orderId      = this.orderId()!;
    const tableNumber  = String(this.table()?.number ?? '');
    this.cashRemindDisabled.set(true);
    this.rt.invoke('RemindServer', orderId, tableNumber)
      .then(() => {
        this.cashReminderSent.set(true);
        this.startCashCountdown();
      })
      .catch(() => this.cashRemindDisabled.set(false));
  }

  changeCashPayment() {
    if (this.cashChangeDisabled()) return;
    const orderId = this.orderId()!;
    this.cashChangeDisabled.set(true);
    this.orderSvc.cancelCashPayment(orderId).subscribe({
      next: () => {
        clearInterval(this.cashCountdownInterval);
        this.cashPopupStep.set(null);
        this.payPhone.set('');
        this.step.set('payment');
        this.cashReminderSent.set(false);
      },
      error: () => this.cashChangeDisabled.set(false)
    });
  }

  openCashCodeForm() {
    this.cashCodeInput.set('');
    this.cashCodeError.set('');
    this.cashPopupStep.set('code');
  }

  backToCashInfo() { this.cashPopupStep.set('info'); }

  submitCashCode() {
    const code    = this.cashCodeInput().trim();
    const orderId = this.orderId()!;
    if (code.length !== 5) { this.cashCodeError.set('Le code doit contenir exactement 5 caractères.'); return; }

    this.cashCodeSubmitting.set(true);
    this.cashCodeError.set('');
    this.orderSvc.confirmCash(orderId, code).subscribe({
      next: () => {
        this.cashPopupStep.set(null);
        this.cashCodeSubmitting.set(false);
        clearInterval(this.cashCountdownInterval);
        this.toast.success('Paiement confirmé !');
      },
      error: (err) => {
        this.cashCodeError.set(err?.error?.message ?? 'Code incorrect. Vérifiez la casse.');
        this.cashCodeSubmitting.set(false);
      }
    });
  }
}
