import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrderService } from '../../../core/services/order.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Order, OrderStatus } from '../../../core/models';
import { DecimalPipe, DatePipe } from '@angular/common';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, DecimalPipe, DatePipe, LoaderComponent],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit, OnDestroy {
  private readonly orderSvc = inject(OrderService);
  private readonly rt       = inject(RealtimeService);
  private readonly auth     = inject(AuthService);
  private readonly toast    = inject(ToastService);

  readonly orders   = signal<Order[]>([]);
  readonly loading  = signal(true);
  readonly filter   = signal<OrderStatus | 'all'>('all');
  private subs = new Subscription();

  readonly filtered = () => {
    const f = this.filter();
    return f === 'all' ? this.orders() : this.orders().filter(o => o.status === f);
  };

  readonly statusLabel: Record<string, string> = {
    pending: 'En attente', preparing: 'En préparation',
    ready: 'Prête', served: 'Servie', paid: 'Payée', cancelled: 'Annulée'
  };

  ngOnInit() {
    this.load();
    this.rt.connect(this.auth.getToken() ?? undefined);
    this.subs.add(
      this.rt.events$.subscribe(ev => {
        if (ev.type === 'order:new') { this.load(); this.toast.info(`Nouvelle commande — ${ev.payload.tableNumber}`); }
        if (ev.type === 'order:status') this.load();
      })
    );
  }

  ngOnDestroy() { this.subs.unsubscribe(); this.rt.disconnect(); }

  private load() {
    this.orderSvc.getAll().subscribe({ next: o => { this.orders.set(o); this.loading.set(false); } });
  }

  updateStatus(id: string, status: OrderStatus) {
    this.orderSvc.updateStatus(id, status).subscribe({
      next: () => { this.toast.success('Statut mis à jour'); this.load(); },
      error: () => this.toast.error('Erreur lors de la mise à jour')
    });
  }

  readonly nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
    pending: 'preparing', preparing: 'ready', ready: 'served', served: 'paid'
  };
}
