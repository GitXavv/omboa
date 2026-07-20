import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrderService } from '../../../core/services/order.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { Order } from '../../../core/models';
import { DecimalPipe, DatePipe } from '@angular/common';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { RestaurantSettingsService } from '../../../core/services/restaurant-settings.service';
import { ToastService } from '../../../core/services/toast.service';

const STATUS_FR: Record<string, string> = {
  pending: 'En attente', confirmed: 'Acceptée', preparing: 'En préparation', ready: 'Prête',
  paid: 'Payée', served: 'Servie', released: 'Libérée', cancelled: 'Annulée'
};

// Le SignalR "JoinAdmin" et la logique de notification (signalement table) vivent
// désormais dans AdminLayoutComponent, qui enveloppe toutes les pages /admin/* — ici
// on ne fait que se rebrancher sur le flux d'événements déjà ouvert par le parent.
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
  private readonly restaurantSvc = inject(RestaurantService);
  private readonly restaurantSettingsSvc = inject(RestaurantSettingsService);
  private readonly toast    = inject(ToastService);

  readonly slug = computed(() => this.restaurantSvc.current()?.slug ?? '');

  // ── Avantages des points de fidélité (activé par défaut) ──────────────────
  readonly loyaltyEnabled = computed(() => this.restaurantSvc.current()?.loyalty_enabled ?? true);
  readonly loyaltyConfirmTarget = signal<boolean | null>(null); // valeur en attente de confirmation
  readonly loyaltySaving = signal(false);

  readonly orders  = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly statusFr = STATUS_FR;

  readonly pendingCount   = computed(() => this.orders().filter(o => o.status === 'pending' || o.status === 'confirmed').length);
  readonly preparingCount = computed(() => this.orders().filter(o => o.status === 'preparing').length);
  readonly activeCount    = computed(() => this.pendingCount() + this.preparingCount() + this.orders().filter(o => o.status === 'ready').length);
  readonly revenue        = computed(() => this.orders().filter(o => ['paid','served','released'].includes(o.status)).reduce((s, o) => s + (o.total_amount ?? 0), 0));
  readonly recentOrders   = computed(() => this.orders().slice(0, 8));

  private sub?: Subscription;

  ngOnInit() {
    this.load();
    this.sub = this.rt.events$.subscribe(ev => {
      if (ev.type === 'order:new' || ev.type === 'order:confirmed' || ev.type === 'order:status') this.load();
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  private load() {
    this.orderSvc.getAll().subscribe({
      next: o => { this.orders.set(o); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // ── Avantages des points de fidélité ───────────────────────────────────────
  requestToggleLoyalty() {
    this.loyaltyConfirmTarget.set(!this.loyaltyEnabled());
  }

  cancelLoyaltyToggle() { this.loyaltyConfirmTarget.set(null); }

  confirmLoyaltyToggle() {
    const target = this.loyaltyConfirmTarget();
    if (target === null) return;
    this.loyaltySaving.set(true);
    this.restaurantSettingsSvc.updateLoyaltyEnabled(target).subscribe({
      next: () => {
        this.restaurantSvc.patchCurrent({ loyalty_enabled: target });
        this.toast.success(`Avantages de points de fidélité ${target ? 'activés' : 'désactivés'}.`);
        this.loyaltySaving.set(false);
        this.loyaltyConfirmTarget.set(null);
      },
      error: () => {
        this.toast.error('Impossible de modifier ce réglage.');
        this.loyaltySaving.set(false);
      }
    });
  }
}
