import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ExitService } from '../../../core/services/exit.service';
import { ToastService } from '../../../core/services/toast.service';
import { StaffAuthService } from '../../../core/services/staff-auth.service';
import { Order } from '../../../core/models';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

const STATUS_LABELS: Partial<Record<string, string>> = {
  pending:   'En attente',
  confirmed: 'Acceptée',
  preparing: 'En préparation',
  ready:     'Prête',
  paid:      'Payée',
  served:    'Servie',
  released:  'Libérée',
  cancelled: 'Annulée'
};

const METHOD_LABELS: Partial<Record<string, string>> = {
  cash:         'Espèces',
  orange_money: 'Orange Money',
  mtn_momo:     'MTN MoMo'
};

@Component({
  selector: 'app-exit-order-detail',
  standalone: true,
  imports: [DecimalPipe, DatePipe, RouterLink, LoaderComponent],
  templateUrl: './exit-order-detail.component.html',
  styleUrl: './exit-order-detail.component.css'
})
export class ExitOrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly exitSvc = inject(ExitService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(StaffAuthService);

  readonly loading    = signal(true);
  readonly order      = signal<Order | null>(null);
  readonly notFound   = signal(false);
  readonly confirming = signal(false);
  readonly releasing  = signal(false);

  readonly labels       = STATUS_LABELS;
  readonly methodLabels = METHOD_LABELS;

  readonly orderTotal = () => {
    const o = this.order();
    if (!o) return 0;
    if (o.total_amount != null) return o.total_amount;
    return (o.order_items ?? []).reduce((s, i) => s + i.unit_price * i.quantity, 0);
  };

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code')!;
    this.exitSvc.getByCode(code).subscribe({
      next: o => { this.order.set(o); this.loading.set(false); },
      error: () => { this.notFound.set(true); this.loading.set(false); }
    });
  }

  canRelease() { return this.order()?.status === 'served'; }

  requestRelease() { if (this.canRelease()) this.confirming.set(true); }
  cancelRelease()  { this.confirming.set(false); }

  confirmRelease() {
    const order = this.order();
    if (!order) return;
    this.releasing.set(true);
    this.exitSvc.release(order.id).subscribe({
      next: () => {
        this.toast.success(`Table ${order.table?.number ?? ''} libérée.`);
        this.router.navigate(['/', this.auth.currentStaff()?.restaurantSlug, 'exit']);
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Impossible de libérer la table.');
        this.releasing.set(false);
        this.confirming.set(false);
      }
    });
  }
}
