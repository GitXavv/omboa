import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrderService } from '../../../core/services/order.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { AuthService } from '../../../core/services/auth.service';
import { Order } from '../../../core/models';
import { DecimalPipe, DatePipe } from '@angular/common';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

const STATUS_FR: Record<string, string> = {
  pending: 'En attente', preparing: 'En préparation', ready: 'Prête',
  paid: 'Payée', served: 'Servie', released: 'Libérée', cancelled: 'Annulée'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe, DatePipe, LoaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly orderSvc = inject(OrderService);
  private readonly rt       = inject(RealtimeService);
  private readonly auth     = inject(AuthService);

  readonly orders  = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly statusFr = STATUS_FR;

  // Popup interruptif : un serveur refuse de donner son code de confirmation espèce
  readonly serverIssuePopup = signal<{ tableNumber: string; orderId: string } | null>(null);

  readonly pendingCount   = computed(() => this.orders().filter(o => o.status === 'pending').length);
  readonly preparingCount = computed(() => this.orders().filter(o => o.status === 'preparing').length);
  readonly activeCount    = computed(() => this.pendingCount() + this.preparingCount() + this.orders().filter(o => o.status === 'ready').length);
  readonly revenue        = computed(() => this.orders().filter(o => ['paid','served','released'].includes(o.status)).reduce((s, o) => s + (o.total_amount ?? 0), 0));
  readonly recentOrders   = computed(() => this.orders().slice(0, 8));

  private sub?: Subscription;

  ngOnInit() {
    this.load();
    this.rt.connect(this.auth.getToken() ?? undefined).then(() => this.rt.invoke('JoinAdmin'));
    this.sub = this.rt.events$.subscribe(ev => {
      if (ev.type === 'order:new' || ev.type === 'order:status') this.load();
      if (ev.type === 'server:issue') this.serverIssuePopup.set(ev.payload);
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); this.rt.disconnect(); }

  dismissServerIssuePopup() { this.serverIssuePopup.set(null); }

  private load() {
    this.orderSvc.getAll().subscribe({
      next: o => { this.orders.set(o); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
