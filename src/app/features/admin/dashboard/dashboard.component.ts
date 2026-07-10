import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrderService } from '../../../core/services/order.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { StaffAuthService } from '../../../core/services/staff-auth.service';
import { TableService } from '../../../core/services/table.service';
import { ToastService } from '../../../core/services/toast.service';
import { Order } from '../../../core/models';
import { DecimalPipe, DatePipe } from '@angular/common';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

interface TableIssueNotification {
  id: string;
  tableId: string;
  tableNumber: string;
  timestamp: string;
}

const NOTIF_MAX = 20;

const STATUS_FR: Record<string, string> = {
  pending: 'En attente', confirmed: 'Acceptée', preparing: 'En préparation', ready: 'Prête',
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
  private readonly auth     = inject(StaffAuthService);
  private readonly tableSvc = inject(TableService);
  private readonly toast    = inject(ToastService);

  readonly slug = computed(() => this.auth.currentStaff()?.restaurantSlug ?? '');

  readonly orders  = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly statusFr = STATUS_FR;

  // Popup interruptif : signalement d'une table occupée à tort
  readonly tableIssuePopup     = signal<{ tableId: string; tableNumber: string } | null>(null);
  readonly confirmingDisable   = signal(false);
  readonly disablingTable      = signal(false);
  readonly notifHistoryOpen    = signal(false);
  readonly tableNotifications  = signal<TableIssueNotification[]>(this.loadNotifications());

  readonly pendingCount   = computed(() => this.orders().filter(o => o.status === 'pending' || o.status === 'confirmed').length);
  readonly preparingCount = computed(() => this.orders().filter(o => o.status === 'preparing').length);
  readonly activeCount    = computed(() => this.pendingCount() + this.preparingCount() + this.orders().filter(o => o.status === 'ready').length);
  readonly revenue        = computed(() => this.orders().filter(o => ['paid','served','released'].includes(o.status)).reduce((s, o) => s + (o.total_amount ?? 0), 0));
  readonly recentOrders   = computed(() => this.orders().slice(0, 8));

  private sub?: Subscription;

  ngOnInit() {
    this.load();
    const restaurantId = this.auth.currentStaff()?.restaurantId;
    this.rt.connect(this.auth.getToken() ?? undefined).then(() => this.rt.invoke('JoinAdmin', restaurantId));
    this.sub = this.rt.events$.subscribe(ev => {
      if (ev.type === 'order:new' || ev.type === 'order:confirmed' || ev.type === 'order:status') this.load();
      if (ev.type === 'admin:table-issue') {
        this.tableIssuePopup.set(ev.payload);
        this.recordNotification(ev.payload);
      }
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); this.rt.disconnect(); }

  private load() {
    this.orderSvc.getAll().subscribe({
      next: o => { this.orders.set(o); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // ── Signalement table occupée à tort ──────────────────────────────────────
  dismissTableIssuePopup() { this.tableIssuePopup.set(null); }

  requestDisableTable() { this.confirmingDisable.set(true); }
  cancelDisableTable()  { this.confirmingDisable.set(false); }

  confirmDisableTable() {
    const issue = this.tableIssuePopup();
    if (!issue) return;
    this.disablingTable.set(true);
    this.tableSvc.update(issue.tableId, { number: issue.tableNumber, is_active: false }).subscribe({
      next: () => {
        this.toast.success(`Table ${issue.tableNumber} désactivée.`);
        this.disablingTable.set(false);
        this.confirmingDisable.set(false);
        this.tableIssuePopup.set(null);
      },
      error: () => {
        this.toast.error('Impossible de désactiver la table.');
        this.disablingTable.set(false);
      }
    });
  }

  // ── Historique des signalements (mis en cache localStorage) ───────────────
  toggleNotifHistory() { this.notifHistoryOpen.update(v => !v); }

  reopenNotification(n: TableIssueNotification) {
    this.notifHistoryOpen.set(false);
    this.tableIssuePopup.set({ tableId: n.tableId, tableNumber: n.tableNumber });
  }

  private recordNotification(payload: { tableId: string; tableNumber: string }) {
    const entry: TableIssueNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tableId: payload.tableId,
      tableNumber: payload.tableNumber,
      timestamp: new Date().toISOString()
    };
    const next = [entry, ...this.tableNotifications()].slice(0, NOTIF_MAX);
    this.tableNotifications.set(next);
    localStorage.setItem(this.notifKey(), JSON.stringify(next));
  }

  private notifKey(): string {
    return `omboa_admin_table_notifications_${this.auth.currentStaff()?.restaurantId ?? 'unknown'}`;
  }

  private loadNotifications(): TableIssueNotification[] {
    try {
      const raw = localStorage.getItem(this.notifKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
