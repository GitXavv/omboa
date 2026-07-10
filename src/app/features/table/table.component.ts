import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Category, Order, OrderStatus, PaymentMethod, Product, TableStatus } from '../../core/models';
import { CartService } from '../../core/services/cart.service';
import { MenuService } from '../../core/services/menu.service';
import { TableService } from '../../core/services/table.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { estimatePrepMinutes } from '../../core/utils/prep-time';

type Step = 'menu' | 'cart' | 'tracking';

const TERMINAL_STATUSES = ['cancelled', 'released'];

const STATUS_LABELS: Partial<Record<string, string>> = {
  pending:   'En attente',
  confirmed: 'Acceptée par le restaurant',
  preparing: 'En préparation',
  ready:     'Prête — finalisez votre paiement',
  paid:      'Payée — en attente de service',
  served:    'Servie',
  released:  'Servie',
  cancelled: 'Annulée',
};

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [LoaderComponent, DecimalPipe, DatePipe, RouterLink],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css'
})
export class TableComponent implements OnInit, OnDestroy {
  readonly cart       = inject(CartService);
  readonly auth       = inject(AuthService);
  readonly authModal  = inject(AuthModalService);
  private readonly menuSvc  = inject(MenuService);
  private readonly tableSvc = inject(TableService);
  private readonly orderSvc = inject(OrderService);
  private readonly toast    = inject(ToastService);
  private readonly rt       = inject(RealtimeService);
  private readonly route    = inject(ActivatedRoute);
  private readonly restaurantSvc = inject(RestaurantService);

  readonly step             = signal<Step>('menu');
  readonly table            = signal<TableStatus | null>(null);
  readonly categories       = signal<Category[]>([]);
  readonly openIds          = signal<Set<string>>(new Set());
  readonly loading          = signal(true);
  readonly tableError       = signal<string | null>(null);
  readonly tableErrorType   = signal<'occupied' | 'other-table-active' | null>(null);
  readonly reportingTableIssue = signal(false);
  readonly tableIssueReported  = signal(false);
  readonly orderCodePopup      = signal(false);
  readonly submitting       = signal(false);
  readonly orderId          = signal<string | null>(null);
  readonly orderCode        = signal<string | null>(null);
  readonly codeCopied       = signal(false);
  readonly selectedProduct  = signal<Product | null>(null);
  readonly modalQuantity    = signal(1);
  readonly commandeTooltip  = signal(false);
  readonly showLoyaltyPromo = signal(false);
  readonly cartPulse        = signal(false);
  readonly orderNotes       = signal('');
  readonly confirmingSubmit = signal(false);
  private cartPulseTimer?: ReturnType<typeof setTimeout>;

  // Suivi de commande en cours
  readonly trackedOrder        = signal<Order | null>(null);
  readonly trackedStatusLabels = STATUS_LABELS;
  readonly cancelling          = signal(false);

  // Popup cuisine/réceptionniste → client : raison d'une annulation
  readonly cancelReasonPopup = signal<string | null>(null);

  // Paiement inline (affiché dans tracking quand status = ready)
  readonly payMethod      = signal<PaymentMethod>('cash');
  readonly payPhone       = signal('');
  readonly usePoints      = signal(false);
  readonly pointsToUse    = signal(0);
  readonly loyaltyBalance = signal(0);

  // Total calculé depuis les items (total_amount non encore défini avant paiement)
  readonly trackingTotal = computed(() => {
    const o = this.trackedOrder();
    if (!o) return 0;
    if (o.total_amount != null) return o.total_amount;
    return (o.order_items ?? []).reduce((s, i) => s + i.unit_price * i.quantity, 0);
  });

  // Durée de préparation estimée — panier pas encore validé
  readonly cartPrepMinutes = computed(() =>
    estimatePrepMinutes(this.cart.items().map(i => ({ duration: i.product.cook_duration, quantity: i.quantity })))
  );

  // Durée de préparation estimée — commande déjà validée
  readonly trackedPrepMinutes = computed(() => {
    const items = this.trackedOrder()?.order_items ?? [];
    return estimatePrepMinutes(items.map(i => ({ duration: i.product_cook_duration ?? 15, quantity: i.quantity })));
  });

  readonly receiptPopup = signal(false);

  // Popup paiement en espèce : en attente de confirmation du personnel, pas de code
  readonly cashPopupOpen     = signal(false);
  readonly cashCountdown     = signal(0);
  readonly cashChangeDisabled = signal(true);

  readonly cartQuantity = (productId: string) =>
    this.cart.items().find(i => i.product.id === productId)?.quantity ?? 0;

  private subs = new Subscription();
  private longPressTimer?: ReturnType<typeof setTimeout>;
  private tooltipHideTimer?: ReturnType<typeof setTimeout>;
  private cashCountdownInterval?: ReturnType<typeof setInterval>;
  private readonly PROMO_KEY   = 'omboa_loyalty_promo_dismissed';
  private readonly STORAGE_KEY = 'omboa_current_order';

  ngOnInit() {
    const tableId = this.route.snapshot.paramMap.get('tableId')!;
    this.cart.setTable(tableId);

    const dismissed = parseInt(localStorage.getItem(this.PROMO_KEY) ?? '0', 10);
    if (!this.auth.isLoggedIn() && dismissed < 2) this.showLoyaltyPromo.set(true);

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

        if (storedOrder) {
          this.orderSvc.getById(storedOrder.id).subscribe({
            next: order => this.resolveWithStoredOrder(t, tableId, order),
            error: () => {
              localStorage.removeItem(this.STORAGE_KEY);
              this.continueToTable(t, tableId);
            }
          });
        } else {
          this.continueToTable(t, tableId);
        }
      },
      error: err => {
        this.tableError.set(err?.error?.message ?? 'Table introuvable. Vérifiez votre QR code.');
        this.loading.set(false);
      }
    });

    this.rt.connect(this.auth.getToken() ?? undefined);
    this.subs.add(
      this.rt.events$.subscribe(ev => {
        if (ev.type === 'order:status' && ev.payload.orderId === this.orderId()) {
          const s = ev.payload.status as OrderStatus;
          this.trackedOrder.update(o => o ? { ...o, status: s } : null);
          if (s === 'confirmed')  this.toast.info('Votre commande a été acceptée par le restaurant 👍');
          if (s === 'preparing')  this.toast.info('Votre commande est en préparation 👨‍🍳');
          if (s === 'ready')      this.toast.success('Votre commande est prête ! Choisissez votre mode de paiement ci-dessous. 💳');
          if (s === 'paid') {
            clearInterval(this.cashCountdownInterval);
            this.cashPopupOpen.set(false);
            this.toast.success('Paiement confirmé !');
          }
          if (s === 'served') {
            localStorage.removeItem(this.STORAGE_KEY);
            this.receiptPopup.set(true);
          }
          if (TERMINAL_STATUSES.includes(s)) localStorage.removeItem(this.STORAGE_KEY);
        }
        if (ev.type === 'kitchen:cancel') {
          this.cancelReasonPopup.set(ev.payload.reason);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.rt.disconnect();
    clearTimeout(this.longPressTimer);
    clearTimeout(this.tooltipHideTimer);
    clearTimeout(this.cartPulseTimer);
    clearInterval(this.cashCountdownInterval);
  }

  // Une commande active (peu importe la table) prime sur tout : on ne laisse jamais un
  // client démarrer/poursuivre une commande sur une table pendant qu'une autre est en cours
  // ailleurs sur son appareil (sinon rien n'empêche de commander à deux tables à la fois).
  private resolveWithStoredOrder(t: TableStatus, tableId: string, order: Order) {
    const stillActive = !TERMINAL_STATUSES.includes(order.status);

    if (stillActive && order.table_id !== tableId) {
      this.table.set(t);
      this.tableError.set(
        `Vous avez déjà une commande en cours à la table ${order.table?.number ?? '—'}. ` +
        `Terminez-la avant d'en commencer une nouvelle.`
      );
      this.tableErrorType.set('other-table-active');
      this.loading.set(false);
      return;
    }

    if (stillActive && order.table_id === tableId) {
      this.table.set(t);
      this.orderId.set(order.id);
      this.orderCode.set(order.code ?? null);
      this.trackedOrder.set(order);
      this.step.set('tracking');
      this.rt.invoke('JoinOrder', order.id).catch(() => {});
      if (order.payment?.method === 'cash' && order.payment.status === 'pending') {
        this.cashPopupOpen.set(true);
        this.startCashCountdown();
      }
      this.loading.set(false);
      return;
    }

    // Commande terminale (servie/libérée/annulée) : obsolète, on nettoie et on continue.
    localStorage.removeItem(this.STORAGE_KEY);
    this.continueToTable(t, tableId);
  }

  private continueToTable(t: TableStatus, tableId: string) {
    if (t.is_occupied) {
      this.table.set(t);
      this.tableError.set('Cette table est déjà occupée. Si vous avez déjà passé une commande, retrouvez-la via « Ma commande ».');
      this.tableErrorType.set('occupied');
      this.loading.set(false);
      return;
    }

    this.table.set(t);
    this.loadMenu();
  }

  private loadMenu() {
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

  openProduct(p: Product)  { this.selectedProduct.set(p); this.modalQuantity.set(1); document.body.style.overflow = 'hidden'; }
  closeProduct()           { this.selectedProduct.set(null); document.body.style.overflow = ''; }

  incrementModalQty() { this.modalQuantity.update(q => q + 1); }
  decrementModalQty() { this.modalQuantity.update(q => Math.max(1, q - 1)); }

  addToCart(p: Product) {
    this.cart.add(p, '', this.modalQuantity());
    this.toast.success(`${p.name} ajouté à ma commande`);
    this.triggerCartPulse();
    if (this.selectedProduct()) this.closeProduct();
  }

  removeFromCart(p: Product) { this.cart.decrement(p.id); }

  private triggerCartPulse() {
    clearTimeout(this.cartPulseTimer);
    this.cartPulse.set(false);
    // Un tick pour permettre à Angular de retirer puis remettre la classe (redéclenche l'animation CSS)
    requestAnimationFrame(() => {
      this.cartPulse.set(true);
      this.cartPulseTimer = setTimeout(() => this.cartPulse.set(false), 700);
    });
  }

  goToCart() { this.step.set('cart'); this.scrollToTop(); }
  goToMenu() { this.step.set('menu'); this.scrollToTop(); }

  private scrollToTop() { window.scrollTo({ top: 0 }); }

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

  dismissCancelReasonPopup() { this.cancelReasonPopup.set(null); }

  // ── Signalement "table occupée à tort" ────────────────────────────────────
  requestReportTableIssue() { this.reportingTableIssue.set(true); }
  cancelReportTableIssue()  { this.reportingTableIssue.set(false); }

  confirmReportTableIssue() {
    this.reportingTableIssue.set(false);
    const tableId = this.route.snapshot.paramMap.get('tableId');
    const restaurantId = this.restaurantSvc.current()?.id;
    if (!tableId || !restaurantId) return;
    const tableNumber = this.table()?.number ?? '—';
    this.rt.invoke('ReportTableIssue', restaurantId, tableId, tableNumber)
      .then(() => { this.tableIssueReported.set(true); this.toast.success('Les responsables ont été alertés.'); })
      .catch(() => this.toast.error('Impossible d\'envoyer le signalement. Réessayez.'));
  }

  dismissOrderCodePopup() { this.orderCodePopup.set(false); }

  copyCode() {
    const code = this.orderCode();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => this.codeCopied.set(true));
  }

  // ── Soumission de commande → tracking immédiat, paiement différé ─────────
  requestSubmitOrder() {
    const tableId = this.table()?.id;
    if (!tableId || !this.cart.items().length) return;
    this.confirmingSubmit.set(true);
  }

  cancelSubmitOrder() { this.confirmingSubmit.set(false); }

  confirmSubmitOrder() {
    this.confirmingSubmit.set(false);
    const tableId = this.table()?.id;
    if (!tableId || !this.cart.items().length) return;

    this.submitting.set(true);
    const payload = {
      table_id:    tableId,
      customer_id: this.auth.currentUser()?.id,
      notes:       this.orderNotes().trim() || undefined,
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
        this.trackedOrder.set(order);
        this.rt.invoke('JoinOrder', order.id).catch(() => {});
        this.cart.clear();
        this.orderNotes.set('');
        this.submitting.set(false);
        this.step.set('tracking');
        this.scrollToTop();
        this.toast.success('Commande transmise à la réception !');
        if (order.code) this.orderCodePopup.set(true);
      },
      error: () => {
        this.toast.error('Impossible de créer la commande. Réessayez.');
        this.submitting.set(false);
      }
    });
  }

  // ── Paiement (déclenché depuis le tracking quand status = ready) ──────────
  submitPayment() {
    const orderId = this.orderId();
    if (!orderId) return;
    this.submitting.set(true);
    this.orderSvc.pay({
      order_id:        orderId,
      method:          this.payMethod(),
      phone_number:    this.payPhone() || undefined,
      points_to_spend: this.usePoints() ? this.pointsToUse() : undefined
    }).subscribe({
      next: payment => {
        this.trackedOrder.update(o => o ? { ...o, payment } : null);
        this.submitting.set(false);
        if (payment.method === 'cash' && payment.status === 'pending') {
          this.cashPopupOpen.set(true);
          this.startCashCountdown();
        } else {
          this.toast.success('Paiement enregistré ! Votre commande arrive bientôt. 🎉');
        }
      },
      error: () => {
        this.toast.error('Erreur lors du paiement. Réessayez.');
        this.submitting.set(false);
      }
    });
  }

  // ── Tracking : annuler ───────────────────────────────────────────────────
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

  // ── Cash popup : en attente de confirmation du personnel ──────────────────
  private startCashCountdown() {
    clearInterval(this.cashCountdownInterval);
    this.cashCountdown.set(30);
    this.cashChangeDisabled.set(true);
    this.cashCountdownInterval = setInterval(() => {
      const c = this.cashCountdown() - 1;
      this.cashCountdown.set(c);
      if (c <= 0) {
        clearInterval(this.cashCountdownInterval);
        this.cashChangeDisabled.set(false);
      }
    }, 1000);
  }

  changeCashPayment() {
    if (this.cashChangeDisabled()) return;
    const orderId = this.orderId()!;
    this.cashChangeDisabled.set(true);
    this.orderSvc.cancelCashPayment(orderId).subscribe({
      next: () => {
        clearInterval(this.cashCountdownInterval);
        this.cashPopupOpen.set(false);
        // Retire le paiement du trackedOrder → le formulaire de paiement réapparaît
        this.trackedOrder.update(o => o ? { ...o, payment: undefined } : null);
        this.payPhone.set('');
      },
      error: () => this.cashChangeDisabled.set(false)
    });
  }

  // ── Reçu ─────────────────────────────────────────────────────────────────
  printReceipt() { window.print(); }
  closeReceiptPopup() {
    this.receiptPopup.set(false);
    this.startNewOrder();
  }
}
