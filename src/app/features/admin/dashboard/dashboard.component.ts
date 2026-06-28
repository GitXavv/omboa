import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../core/models';
import { DecimalPipe, DatePipe } from '@angular/common';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe, DatePipe, LoaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly orderSvc = inject(OrderService);

  readonly orders    = signal<Order[]>([]);
  readonly loading   = signal(true);

  readonly stats = {
    total:     signal(0),
    pending:   signal(0),
    preparing: signal(0),
    revenue:   signal(0)
  };

  ngOnInit() {
    this.orderSvc.getAll().subscribe({
      next: orders => {
        this.orders.set(orders);
        this.stats.total.set(orders.length);
        this.stats.pending.set(orders.filter(o => o.status === 'pending').length);
        this.stats.preparing.set(orders.filter(o => o.status === 'preparing').length);
        this.stats.revenue.set(orders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.total_amount ?? 0), 0));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
