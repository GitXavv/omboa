import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { ReceptionService } from '../../core/services/reception.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { StaffAuthService } from '../../core/services/staff-auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { Order, OrderStatus } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

type Tab = 'pending' | 'kitchen' | 'checkout' | 'paid';

const METHOD_LABELS: Record<string, string> = {
  cash:         'Espèces',
  orange_money: 'Orange Money',
  mtn_momo:     'MTN MoMo'
};

@Component({
  selector: 'app-reception-dashboard',
  standalone: true,
  imports: [LoaderComponent, DecimalPipe],
  templateUrl: './reception-dashboard.component.html',
  styleUrl: './reception-dashboard.component.css'
})
export class ReceptionDashboardComponent implements OnInit, OnDestroy {
  private readonly receptionSvc = inject(ReceptionService);
  private readonly rt   = inject(RealtimeService);
  readonly auth         = inject(StaffAuthService);
  private readonly toast = inject(ToastService);
  private readonly notif = inject(NotificationService);
  readonly restaurantSvc = inject(RestaurantService);

  readonly orders    = signal<Order[]>([]);
  readonly loading    = signal(true);
  readonly tab        = signal<Tab>('pending');
  readonly acceptingId = signal<string | null>(null);
  readonly methodLabels = METHOD_LABELS;

  // Même formule que LoyaltyService.CalculateDiscount côté API - seule la réception (et
  // l'admin, en lecture seule) voit ce détail, jamais la cuisine ni la sortie.
  discountPercent(points: number): number {
    return Math.min(points / 100 * 5, 30);
  }

  // Dialogue d'annulation avec raison
  readonly cancelOrderId   = signal<string | null>(null);
  readonly cancelReason    = signal('');
  readonly cancelError     = signal('');
  readonly cancelSubmitting = signal(false);

  readonly pendingOrders  = computed(() => this.orders().filter(o => o.status === 'pending'));
  readonly kitchenOrders  = computed(() => this.orders().filter(o => o.status === 'confirmed' || o.status === 'preparing'));
  readonly checkoutOrders = computed(() => this.orders().filter(o => o.status === 'ready'));
  readonly paidOrders     = computed(() => this.orders().filter(o => o.status === 'paid'));

  readonly tabOrders = computed(() => {
    switch (this.tab()) {
      case 'pending':  return this.pendingOrders();
      case 'kitchen':  return this.kitchenOrders();
      case 'checkout': return this.checkoutOrders();
      case 'paid':     return this.paidOrders();
    }
  });

  private sub?: Subscription;

  ngOnInit() {
    this.load();
    this.notif.requestPermission();

    this.sub = this.rt.events$.subscribe(ev => {
      if (ev.type === 'connected') {
        this.rt.invoke('JoinAdmin', this.auth.currentStaff()?.restaurantId).then(() => this.load()).catch(() => {});
      }

      if (ev.type === 'order:new') {
        this.load();
        this.toast.info(`🔔 Nouvelle commande - Table ${ev.payload.tableNumber}`);
        this.notif.playNewOrderSound();
        this.notif.showBrowserNotification('Nouvelle commande', `Table ${ev.payload.tableNumber}`);
      }
      if (ev.type === 'order:status') {
        const { orderId, status } = ev.payload;
        if (status === 'ready') this.notif.playReadySound();
        if (['served', 'cancelled', 'released'].includes(status)) {
          this.orders.update(l => l.filter(o => o.id !== orderId));
        } else {
          this.orders.update(list => list.map(o => o.id === orderId
            ? { ...o, status: status as OrderStatus } : o
          ));
        }
      }
      if (ev.type === 'payment:method') {
        const { orderId, method } = ev.payload;
        this.orders.update(list => list.map(o => o.id === orderId
          ? { ...o, payment: { ...(o.payment ?? {} as any), method: method as any, status: 'pending' } }
          : o
        ));
      }
      if (ev.type === 'payment:removed') {
        const { orderId } = ev.payload;
        this.orders.update(list => list.map(o => o.id === orderId ? { ...o, payment: undefined } : o));
      }
    });

    // Vue admin (lecture seule, imbriquée dans AdminLayoutComponent) : la connexion
    // SignalR est déjà ouverte et maintenue par le layout (même groupe "admin") - on ne
    // doit pas ouvrir/fermer notre propre connexion, ça couperait celle du layout.
    if (this.auth.isOwner()) {
      this.rt.invoke('JoinAdmin', this.auth.currentStaff()?.restaurantId).catch(() => {});
    } else {
      this.rt.connect(this.auth.getToken() ?? undefined)
        .then(() => this.rt.invoke('JoinAdmin', this.auth.currentStaff()?.restaurantId))
        .catch(() => {});
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (!this.auth.isOwner()) this.rt.disconnect();
  }

  private load() {
    this.receptionSvc.getAll().subscribe({
      next: all => {
        this.orders.set(all.filter(o => ['pending', 'confirmed', 'preparing', 'ready', 'paid'].includes(o.status)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  accept(order: Order) {
    if (this.acceptingId()) return;
    this.acceptingId.set(order.id);
    this.receptionSvc.accept(order.id).subscribe({
      next: u => {
        this.orders.update(l => l.map(o => o.id === u.id ? { ...u, payment: o.payment } : o));
        this.toast.success(`Table ${order.table?.number ?? ''} acceptée - envoyée en cuisine`);
        this.acceptingId.set(null);
      },
      error: () => {
        this.toast.error('Impossible d\'accepter cette commande.');
        this.acceptingId.set(null);
      }
    });
  }

  confirmCash(order: Order) {
    this.receptionSvc.confirmCashPayment(order.id).subscribe({
      next: () => this.toast.success(`Paiement espèces confirmé - Table ${order.table?.number ?? ''}`),
      error: err => this.toast.error(err?.error?.message ?? 'Impossible de confirmer le paiement.')
    });
  }

  markServed(order: Order) {
    this.receptionSvc.markServed(order.id).subscribe({
      next: () => this.toast.success(`Commande servie - Table ${order.table?.number ?? ''}`),
      error: err => this.toast.error(err?.error?.message ?? 'Impossible de marquer la commande servie.')
    });
  }

  // ── Annulation avec raison ────────────────────────────────────────────────
  openCancelDialog(orderId: string) {
    this.cancelOrderId.set(orderId);
    this.cancelReason.set('');
    this.cancelError.set('');
    this.cancelSubmitting.set(false);
  }

  closeCancelDialog() { this.cancelOrderId.set(null); }

  submitCancel() {
    const orderId = this.cancelOrderId();
    const reason  = this.cancelReason().trim();
    if (!orderId) return;
    if (!reason) { this.cancelError.set('Veuillez indiquer une raison.'); return; }

    this.cancelSubmitting.set(true);
    this.receptionSvc.cancelWithReason(orderId, reason).subscribe({
      next: () => {
        this.orders.update(l => l.filter(o => o.id !== orderId));
        this.toast.warning('Commande annulée.');
        this.closeCancelDialog();
      },
      error: () => {
        this.cancelError.set('Impossible d\'annuler la commande.');
        this.cancelSubmitting.set(false);
      }
    });
  }
}
