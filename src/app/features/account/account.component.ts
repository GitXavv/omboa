import { Component, OnInit, signal, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { LoyaltyService } from '../../core/services/loyalty.service';
import { Order, LoyaltyTransaction } from '../../core/models';
import { DecimalPipe, DatePipe } from '@angular/common';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [DecimalPipe, DatePipe, LoaderComponent],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss'
})
export class AccountComponent implements OnInit {
  readonly auth    = inject(AuthService);
  private readonly orderSvc   = inject(OrderService);
  private readonly loyaltySvc = inject(LoyaltyService);

  readonly activeTab    = signal<'orders' | 'loyalty'>('orders');
  readonly orders       = signal<Order[]>([]);
  readonly transactions = signal<LoyaltyTransaction[]>([]);
  readonly balance      = signal(0);
  readonly loading      = signal(true);

  ngOnInit() {
    this.orderSvc.getMyOrders().subscribe(o => { this.orders.set(o); this.loading.set(false); });
    this.loyaltySvc.getBalance().subscribe(r => this.balance.set(r.balance));
    this.loyaltySvc.getHistory().subscribe(t => this.transactions.set(t));
  }
}
