import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { OrderService } from '../../core/services/order.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { StaffAuthService } from '../../core/services/staff-auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { Order, OrderStatus, Payment } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

export const STATUS_LABELS: Record<string, string> = {
  pending:   'En attente',
  confirmed: 'Acceptée',
  preparing: 'En préparation',
  ready:     'Prêt',
  paid:      'Payé',
  served:    'Servi',
  released:  'Libéré',
  cancelled: 'Annulé'
};

const METHOD_LABELS: Record<string, string> = {
  cash:         'Espèces',
  orange_money: 'Orange Money',
  mtn_momo:     'MTN MoMo'
};

// La cuisine ne fait avancer que confirmed → preparing → ready. L'acceptation
// (pending→confirmed) revient au réceptionniste, la suite (paiement/service) aussi.
const KITCHEN_STATUSES: OrderStatus[] = ['confirmed', 'preparing', 'ready'];

function nextStatus(order: Order): OrderStatus | null {
  switch (order.status) {
    case 'confirmed': return 'preparing';
    case 'preparing': return 'ready';
    default: return null;
  }
}

function nextLabel(order: Order): string {
  switch (order.status) {
    case 'confirmed': return 'Commencer la préparation';
    case 'preparing': return 'Marquer prêt';
    default:          return '';
  }
}

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [LoaderComponent],
  templateUrl: './kitchen.component.html',
  styleUrl: './kitchen.component.css'
})
export class KitchenComponent implements OnInit, OnDestroy {
  private readonly orderSvc = inject(OrderService);
  private readonly realtime = inject(RealtimeService);
  readonly auth             = inject(StaffAuthService);
  private readonly toast    = inject(ToastService);
  private readonly notif    = inject(NotificationService);

  readonly orders       = signal<Order[]>([]);
  readonly loading      = signal(true);
  readonly confirmingId = signal<string | null>(null);
  readonly mobileTab    = signal<OrderStatus>('confirmed');

  // Chronomètre (mis à jour chaque seconde)
  readonly now = signal(Date.now());

  readonly confirmedOrders = computed(() => this.orders().filter(o => o.status === 'confirmed'));
  readonly preparingOrders = computed(() => this.orders().filter(o => o.status === 'preparing'));
  readonly readyOrders     = computed(() => this.orders().filter(o => o.status === 'ready'));
  readonly mobileOrders    = computed(() => this.orders().filter(o => o.status === this.mobileTab()));
  readonly activeCount     = computed(() => this.orders().length);

  readonly labels       = STATUS_LABELS;
  readonly methodLabels = METHOD_LABELS;

  private sub?: Subscription;
  private clockInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.loadOrders();
    this.notif.requestPermission();

    // Chronomètre global (1 tick/s)
    this.clockInterval = setInterval(() => this.now.set(Date.now()), 1000);

    // ⚠️ Subscription AVANT connect() pour ne rater aucun événement
    this.sub = this.realtime.events$.subscribe(ev => {
      if (ev.type === 'connected') {
        // Reconnexion : re-rejoindre le groupe et recharger
        this.realtime.invoke('JoinKitchen', this.auth.currentStaff()?.restaurantId)
          .then(() => this.loadOrders())
          .catch(() => {});
      }

      if (ev.type === 'order:confirmed') {
        this.orderSvc.getById(ev.payload.orderId).subscribe(o =>
          this.orders.update(list => [o, ...list])
        );
        this.toast.info(`🔔 Commande acceptée — Table ${ev.payload.tableNumber}`);
        this.notif.playNewOrderSound();
        this.notif.showBrowserNotification('Nouvelle commande en cuisine', `Table ${ev.payload.tableNumber}`);
      }
      if (ev.type === 'order:status') {
        const { orderId, status } = ev.payload;
        if (!KITCHEN_STATUSES.includes(status as OrderStatus)) {
          this.orders.update(l => l.filter(o => o.id !== orderId));
        } else {
          this.orders.update(list => list.map(o => o.id === orderId
            ? { ...o, status: status as OrderStatus } : o
          ));
        }
      }
      if (ev.type === 'payment:method') {
        const { orderId, method } = ev.payload;
        this.orders.update(list => list.map(o => {
          if (o.id !== orderId) return o;
          const payment: Payment = {
            ...(o.payment ?? {} as Payment),
            method: method as Payment['method'],
            status: 'pending',
          };
          return { ...o, payment };
        }));
      }
      if (ev.type === 'payment:removed') {
        const { orderId } = ev.payload;
        this.orders.update(list => list.map(o =>
          o.id === orderId ? { ...o, payment: undefined } : o
        ));
      }
    });

    this.realtime.connect(this.auth.getToken() ?? undefined)
      .then(() => this.realtime.invoke('JoinKitchen', this.auth.currentStaff()?.restaurantId))
      .catch(() => {});
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.realtime.disconnect();
    clearInterval(this.clockInterval);
  }

  private loadOrders() {
    this.orderSvc.getAll().subscribe({
      next: all => {
        this.orders.set(all.filter(o => KITCHEN_STATUSES.includes(o.status)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // ── Chronomètre ──────────────────────────────────────────────────────────
  elapsed(dateStr: string): string {
    const totalSec = Math.max(0, Math.floor((this.now() - new Date(dateStr).getTime()) / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}h${String(m % 60).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  elapsedUrgent(dateStr: string): boolean {
    return (Date.now() - new Date(dateStr).getTime()) > 15 * 60 * 1000; // > 15 min
  }

  // ── Avancement simple (confirmed → preparing → ready) ────────────────────
  requestAdvance(id: string) { this.confirmingId.set(id); }
  dismissConfirm()           { this.confirmingId.set(null); }

  confirm(order: Order) {
    this.confirmingId.set(null);
    const next = nextStatus(order);
    if (!next) return;
    this.orderSvc.updateStatus(order.id, next).subscribe({
      next: u => {
        this.orders.update(l => l.map(o => o.id === u.id ? { ...u, payment: o.payment } : o));
        this.toast.success(`Table ${order.table?.number || ''} → ${STATUS_LABELS[next]}`);
      },
      error: () => this.toast.error('Erreur lors du changement de statut.')
    });
  }

  hasNext(order: Order)       { return nextStatus(order) !== null; }
  nextLabelFor(order: Order)  { return nextLabel(order); }
  labelFor(s: string)         { return STATUS_LABELS[s] ?? s; }
  nextStatusFor(order: Order) { return nextStatus(order); }
}
