import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { OrderService } from '../../../core/services/order.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { ToastService } from '../../../core/services/toast.service';
import { Order, OrderStatus } from '../../../core/models';
import { DecimalPipe, DatePipe } from '@angular/common';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

const STATUS_FR: Record<string, string> = {
  pending: 'En attente', preparing: 'En préparation', ready: 'Prête',
  paid: 'Payée', served: 'Servie', released: 'Libérée', cancelled: 'Annulée', all: 'Toutes'
};

const FILTERS: (OrderStatus | 'all')[] = ['all', 'pending', 'preparing', 'ready', 'paid', 'served', 'released', 'cancelled'];

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, LoaderComponent],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit, OnDestroy {
  private readonly orderSvc = inject(OrderService);
  private readonly rt       = inject(RealtimeService);
  private readonly toast    = inject(ToastService);

  readonly orders   = signal<Order[]>([]);
  readonly loading  = signal(true);
  readonly filter   = signal<OrderStatus | 'all'>('all');
  readonly search   = signal('');
  readonly expanded = signal<string | null>(null);
  readonly filters  = FILTERS;
  readonly statusFr = STATUS_FR;

  private sub?: Subscription;

  readonly filtered = computed(() => {
    const f = this.filter();
    const q = this.search().toLowerCase();
    return this.orders()
      .filter(o => f === 'all' || o.status === f)
      .filter(o => !q || (o.table?.number ?? '').toLowerCase().includes(q));
  });

  // La connexion SignalR au groupe admin est ouverte par AdminLayoutComponent (qui
  // enveloppe cette page) — ici on ne fait que se rebrancher sur le flux déjà actif.
  ngOnInit() {
    this.load();
    this.sub = this.rt.events$.subscribe(ev => {
      if (ev.type === 'order:new' || ev.type === 'order:status') {
        this.load();
        if (ev.type === 'order:new') this.toast.info(`Nouvelle commande — ${ev.payload.tableNumber}`);
      }
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  private load() {
    this.orderSvc.getAll().subscribe({
      next: o => { this.orders.set(o); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  toggleExpand(id: string) {
    this.expanded.update(cur => cur === id ? null : id);
  }
}
