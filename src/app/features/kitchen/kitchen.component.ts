import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { OrderService } from '../../core/services/order.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Order, OrderStatus } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

export const STATUS_LABELS: Record<string, string> = {
  pending:   'En attente',
  preparing: 'En préparation',
  ready:     'Prêt',
  paid:      'Payé',
  served:    'Servi',
  cancelled: 'Annulé'
};

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:   'preparing',
  preparing: 'ready',
  ready:     'paid',
  paid:      'served'
};

const NEXT_LABEL: Partial<Record<string, string>> = {
  pending:   'Accepter la commande',
  preparing: 'Marquer prêt',
  ready:     'Marquer payé',
  paid:      'Marquer servi'
};

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
  private readonly auth     = inject(AuthService);
  private readonly toast    = inject(ToastService);

  readonly orders       = signal<Order[]>([]);
  readonly loading      = signal(true);
  readonly connected    = signal(false);
  readonly confirmingId = signal<string | null>(null);
  readonly confirmMode  = signal<'advance' | 'cancel'>('advance');
  readonly mobileTab    = signal<OrderStatus>('pending');

  readonly pendingOrders   = computed(() => this.orders().filter(o => o.status === 'pending'));
  readonly preparingOrders = computed(() => this.orders().filter(o => o.status === 'preparing'));
  readonly readyOrders     = computed(() => this.orders().filter(o => o.status === 'ready'));
  readonly mobileOrders    = computed(() => this.orders().filter(o => o.status === this.mobileTab()));
  readonly activeCount     = computed(() =>
    this.pendingOrders().length + this.preparingOrders().length + this.readyOrders().length
  );

  readonly labels    = STATUS_LABELS;
  readonly nextLabel = NEXT_LABEL;
  readonly NEXT      = NEXT;

  private sub?: Subscription;

  ngOnInit() {
    this.loadOrders();
    this.connectRealtime();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.realtime.disconnect();
  }

  private loadOrders() {
    this.orderSvc.getAll().subscribe({
      next: all => {
        this.orders.set(all.filter(o => !['served', 'cancelled'].includes(o.status)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private connectRealtime() {
    this.realtime.connect(this.auth.getToken() ?? undefined)
      .then(() => this.realtime.invoke('JoinKitchen'))
      .then(() => {
        this.connected.set(true);
        this.sub = this.realtime.events$.subscribe(ev => {
          if (ev.type === 'order:new') {
            this.orderSvc.getById(ev.payload.orderId).subscribe(o =>
              this.orders.update(list => [o, ...list])
            );
            this.toast.info(`🔔 Nouvelle commande — Table ${ev.payload.tableNumber}`);
          }
          if (ev.type === 'order:status') {
            const { orderId, status } = ev.payload;
            this.orders.update(list => list.map(o => o.id === orderId
              ? { ...o, status: status as OrderStatus } : o
            ));
            if (['served', 'cancelled'].includes(status)) {
              setTimeout(() => this.orders.update(l => l.filter(o => o.id !== orderId)), 3000);
            }
          }
          if (ev.type === 'disconnected') this.connected.set(false);
          if (ev.type === 'connected')    this.connected.set(true);
        });
      })
      .catch(() => this.connected.set(false));
  }

  requestAdvance(id: string) { this.confirmMode.set('advance'); this.confirmingId.set(id); }
  requestCancel(id: string)  { this.confirmMode.set('cancel');  this.confirmingId.set(id); }
  dismissConfirm()           { this.confirmingId.set(null); }

  confirm(order: Order) {
    this.confirmingId.set(null);

    if (this.confirmMode() === 'cancel') {
      this.orderSvc.cancel(order.id).subscribe({
        next: u => { this.orders.update(l => l.map(o => o.id === u.id ? u : o)); this.toast.warning('Commande annulée.'); },
        error: () => this.toast.error('Impossible d\'annuler.')
      });
      return;
    }

    const next = NEXT[order.status as OrderStatus];
    if (!next) return;
    this.orderSvc.updateStatus(order.id, next).subscribe({
      next: u => { this.orders.update(l => l.map(o => o.id === u.id ? u : o)); this.toast.success(`Table ${order.table?.number ?? ''} → ${STATUS_LABELS[next]}`); },
      error: () => this.toast.error('Erreur lors du changement de statut.')
    });
  }

  hasNext(status: string) { return status in NEXT; }
  labelFor(s: string) { return STATUS_LABELS[s] ?? s; }

  timeSince(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1)   return 'À l\'instant';
    if (diff < 60)  return `Il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    return `Il y a ${h}h${diff % 60 > 0 ? ` ${diff % 60}min` : ''}`;
  }
}
