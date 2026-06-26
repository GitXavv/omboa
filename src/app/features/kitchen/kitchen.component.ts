import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { OrderService } from '../../core/services/order.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Order } from '../../core/models';
import { DatePipe } from '@angular/common';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [DatePipe, LoaderComponent],
  templateUrl: './kitchen.component.html',
  styleUrl: './kitchen.component.scss'
})
export class KitchenComponent implements OnInit, OnDestroy {
  private readonly orderSvc = inject(OrderService);
  private readonly rt       = inject(RealtimeService);
  private readonly auth     = inject(AuthService);
  private readonly toast    = inject(ToastService);

  readonly pending   = signal<Order[]>([]);
  readonly preparing = signal<Order[]>([]);
  readonly ready     = signal<Order[]>([]);
  readonly loading   = signal(true);

  private subs = new Subscription();

  ngOnInit() {
    this.load();
    this.rt.connect(this.auth.getToken() ?? undefined);
    this.subs.add(
      this.rt.events$.subscribe(ev => {
        if (ev.type === 'order:new') {
          this.load();
          this.toast.info(`Nouvelle commande — ${ev.payload.tableNumber} 🔔`);
        }
        if (ev.type === 'order:status') this.load();
      })
    );
  }

  ngOnDestroy() { this.subs.unsubscribe(); this.rt.disconnect(); }

  private load() {
    this.loading.set(true);
    this.orderSvc.getAll().subscribe({
      next: orders => {
        this.pending.set(orders.filter(o => o.status === 'pending'));
        this.preparing.set(orders.filter(o => o.status === 'preparing'));
        this.ready.set(orders.filter(o => o.status === 'ready'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  startPreparing(id: string) {
    this.orderSvc.updateStatus(id, 'preparing').subscribe({ next: () => this.load() });
  }

  markReady(id: string) {
    this.orderSvc.updateStatus(id, 'ready').subscribe({ next: () => this.load() });
  }
}
