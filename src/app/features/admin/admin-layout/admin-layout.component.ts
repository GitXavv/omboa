import { Component, OnInit, OnDestroy, signal, computed, inject, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { DatePipe } from '@angular/common';
import { RealtimeService } from '../../../core/services/realtime.service';
import { StaffAuthService } from '../../../core/services/staff-auth.service';
import { TableService } from '../../../core/services/table.service';
import { ToastService } from '../../../core/services/toast.service';
import { RestaurantService } from '../../../core/services/restaurant.service';

interface TableIssueNotification {
  id: string;
  tableId: string;
  tableNumber: string;
  timestamp: string;
}

const NOTIF_MAX = 20;

// Enveloppe toutes les pages /:restaurantSlug/admin/* : sidebar façon Djelica (fixe en
// desktop, tiroir sur mobile), cloche de notification flottante persistante. La
// connexion SignalR au groupe admin vit ici (et non plus dans dashboard.component)
// puisqu'elle doit rester active en naviguant entre les sous-pages admin.
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, DatePipe],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  private readonly rt       = inject(RealtimeService);
  private readonly tableSvc = inject(TableService);
  private readonly toast    = inject(ToastService);
  private readonly router   = inject(Router);
  readonly auth = inject(StaffAuthService);
  readonly restaurantSvc = inject(RestaurantService);

  readonly slug           = computed(() => this.auth.currentStaff()?.restaurantSlug ?? '');
  readonly restaurantName = computed(() => this.auth.currentStaff()?.restaurantName ?? '');

  readonly mobileOpen = signal(false);

  // Popup interruptif : signalement d'une table occupée à tort
  readonly tableIssuePopup    = signal<{ tableId: string; tableNumber: string } | null>(null);
  readonly confirmingDisable  = signal(false);
  readonly disablingTable     = signal(false);
  readonly notifHistoryOpen   = signal(false);
  readonly tableNotifications = signal<TableIssueNotification[]>(this.loadNotifications());

  private sub?: Subscription;

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(() => this.mobileOpen.set(false));
  }

  ngOnInit() {
    const restaurantId = this.auth.currentStaff()?.restaurantId;
    this.rt.connect(this.auth.getToken() ?? undefined).then(() => this.rt.invoke('JoinAdmin', restaurantId));
    this.sub = this.rt.events$.subscribe(ev => {
      if (ev.type === 'admin:table-issue') {
        this.tableIssuePopup.set(ev.payload);
        this.recordNotification(ev.payload);
      }
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); this.rt.disconnect(); }

  @HostListener('document:keydown.escape')
  onEscape() { this.mobileOpen.set(false); }

  toggleMobile() { this.mobileOpen.update(v => !v); }
  closeMobile()  { this.mobileOpen.set(false); }

  logout() { this.auth.logout(); }

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
