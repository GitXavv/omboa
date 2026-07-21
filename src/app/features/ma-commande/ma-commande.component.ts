import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Order, OrderStatus, PaymentMethod } from '../../core/models';
import { OrderService } from '../../core/services/order.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { AuthService } from '../../core/services/auth.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { estimatePrepMinutes } from '../../core/utils/prep-time';

interface StoredOrder { id: string; code: string; }

const TERMINAL_STATUSES = ['cancelled', 'released'];

const STATUS_LABELS: Partial<Record<string, string>> = {
  pending:   'En attente',
  confirmed: 'Acceptée par le restaurant',
  preparing: 'En préparation',
  ready:     'Prête - finalisez votre paiement',
  paid:      'Payée - en attente de service',
  served:    'Servie',
  released:  'Servie',
  cancelled: 'Annulée',
};

@Component({
  selector: 'app-ma-commande',
  standalone: true,
  imports: [DecimalPipe, DatePipe, RouterLink, LoaderComponent],
  templateUrl: './ma-commande.component.html',
  styleUrl: './ma-commande.component.css'
})
export class MaCommandeComponent implements OnInit, OnDestroy {
  private readonly orderSvc = inject(OrderService);
  private readonly rt       = inject(RealtimeService);
  readonly auth             = inject(AuthService);
  readonly restaurantSvc    = inject(RestaurantService);

  readonly loading      = signal(true);
  readonly order        = signal<Order | null>(null);
  readonly codeInput    = signal('');
  readonly searchError  = signal<string | null>(null);
  readonly searching    = signal(false);
  readonly codeCopied   = signal(false);
  readonly cancelling   = signal(false);

  // Popup réceptionniste -> client : raison d'une annulation
  readonly cancelReasonPopup = signal<string | null>(null);

  // Paiement inline (affiché quand status = ready et pas encore de paiement)
  readonly payMethod      = signal<PaymentMethod>('cash');
  readonly payPhone       = signal('');
  readonly submitting     = signal(false);
  readonly orderTotal = computed(() => {
    const o = this.order();
    if (!o) return 0;
    if (o.total_amount != null) return o.total_amount;
    return (o.order_items ?? []).reduce((s, i) => s + i.unit_price * i.quantity, 0);
  });

  // Sous-total avant réduction fidélité - toujours la somme des articles, indépendamment
  // de total_amount (qui inclut déjà la réduction dès la création de la commande).
  readonly orderItemsTotal = computed(() =>
    (this.order()?.order_items ?? []).reduce((s, i) => s + i.unit_price * i.quantity, 0)
  );
  readonly orderDiscount = computed(() => Math.max(0, this.orderItemsTotal() - this.orderTotal()));

  readonly orderPrepMinutes = computed(() => {
    const items = this.order()?.order_items ?? [];
    return estimatePrepMinutes(items.map(i => ({ duration: i.product_cook_duration ?? 15, quantity: i.quantity })));
  });

  readonly receiptPopup = signal(false);

  // Popup paiement en espèce : en attente de confirmation du personnel, pas de code
  readonly cashPopupOpen     = signal(false);
  readonly cashCountdown     = signal(0);
  readonly cashChangeDisabled = signal(true);

  readonly statusLabels     = STATUS_LABELS;
  readonly terminalStatuses = TERMINAL_STATUSES;

  private readonly STORAGE_KEY = 'omboa_current_order';
  private rtSub?: Subscription;
  private cashCountdownInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) { this.loading.set(false); return; }

    try {
      const stored: StoredOrder = JSON.parse(raw);
      this.orderSvc.getById(stored.id).subscribe({
        next: o => {
          if (TERMINAL_STATUSES.includes(o.status)) {
            localStorage.removeItem(this.STORAGE_KEY);
            this.order.set(null);
          } else {
            this.order.set(o);
            this.connectRealtime(stored.id);
            // Rouvrir le popup espèce si paiement en attente au retour
            if (o.payment?.method === 'cash' && o.payment.status === 'pending') {
              this.cashPopupOpen.set(true);
              this.startCashCountdown();
            }
          }
          this.loading.set(false);
        },
        error: () => {
          localStorage.removeItem(this.STORAGE_KEY);
          this.loading.set(false);
        }
      });
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.rtSub?.unsubscribe();
    this.rt.disconnect();
    clearInterval(this.cashCountdownInterval);
  }

  private connectRealtime(orderId: string) {
    this.rt.connect(undefined)
      .then(() => this.rt.invoke('JoinOrder', orderId))
      .then(() => {
        this.rtSub = this.rt.events$.subscribe(ev => {
          if (ev.type === 'order:status' && ev.payload.orderId === orderId) {
            const s = ev.payload.status as OrderStatus;
            this.order.update(o => o ? { ...o, status: s } : null);
            if (s === 'paid') {
              clearInterval(this.cashCountdownInterval);
              this.cashPopupOpen.set(false);
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
        });
      })
      .catch(() => { /* connexion optionnelle */ });
  }

  searchByCode() {
    const code = this.codeInput().trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      this.searchError.set('Le code doit contenir exactement 6 chiffres.');
      return;
    }
    this.searchError.set(null);
    this.searching.set(true);

    this.orderSvc.getByCode(code).subscribe({
      next: o => {
        this.order.set(o);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ id: o.id, code: o.code }));
        this.connectRealtime(o.id);
        this.searching.set(false);
      },
      error: () => {
        this.searchError.set('Code introuvable ou commande terminée.');
        this.searching.set(false);
      }
    });
  }

  clearOrder() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.order.set(null);
    this.codeInput.set('');
    this.rtSub?.unsubscribe();
  }

  copyCode() {
    const code = this.order()?.code;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => this.codeCopied.set(true));
  }

  dismissCancelReasonPopup() { this.cancelReasonPopup.set(null); }

  isTerminal(status: string) { return TERMINAL_STATUSES.includes(status); }

  cancelOrder() {
    const id = this.order()?.id;
    if (!id || this.cancelling()) return;
    this.cancelling.set(true);
    this.orderSvc.cancel(id).subscribe({
      next: () => this.cancelling.set(false),
      error: () => this.cancelling.set(false)
    });
  }

  // ── Paiement inline ────────────────────────────────────────────────────────
  submitPayment() {
    const orderId = this.order()?.id;
    if (!orderId) return;
    this.submitting.set(true);
    this.orderSvc.pay({
      order_id:        orderId,
      method:          this.payMethod(),
      phone_number:    this.payPhone() || undefined
    }).subscribe({
      next: payment => {
        this.order.update(o => o ? { ...o, payment } : null);
        this.submitting.set(false);
        if (payment.method === 'cash' && payment.status === 'pending') {
          this.cashPopupOpen.set(true);
          this.startCashCountdown();
        }
      },
      error: () => this.submitting.set(false)
    });
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
    const orderId = this.order()!.id;
    this.cashChangeDisabled.set(true);
    this.orderSvc.cancelCashPayment(orderId).subscribe({
      next: () => {
        clearInterval(this.cashCountdownInterval);
        this.cashPopupOpen.set(false);
        this.order.update(o => o ? { ...o, payment: undefined } : null);
        this.payPhone.set('');
      },
      error: () => this.cashChangeDisabled.set(false)
    });
  }

  // ── Reçu ─────────────────────────────────────────────────────────────────
  printReceipt() { window.print(); }
  closeReceiptPopup() {
    this.receiptPopup.set(false);
    this.clearOrder();
  }
}
