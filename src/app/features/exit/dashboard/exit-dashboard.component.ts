import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';
import { TableService } from '../../../core/services/table.service';
import { ExitService } from '../../../core/services/exit.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { StaffAuthService } from '../../../core/services/staff-auth.service';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { TableStatus, RecentOrder } from '../../../core/models';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

const STATUS_FR: Partial<Record<string, string>> = {
  served: 'Servie', cancelled: 'Annulée'
};

@Component({
  selector: 'app-exit-dashboard',
  standalone: true,
  imports: [DecimalPipe, DatePipe, LoaderComponent],
  templateUrl: './exit-dashboard.component.html',
  styleUrl: './exit-dashboard.component.css'
})
export class ExitDashboardComponent implements OnInit, OnDestroy {
  private readonly tableSvc = inject(TableService);
  private readonly exitSvc = inject(ExitService);
  private readonly rt   = inject(RealtimeService);
  readonly auth         = inject(StaffAuthService);
  readonly restaurantSvc = inject(RestaurantService);
  private readonly router = inject(Router);

  readonly tables       = signal<TableStatus[]>([]);
  readonly recentOrders = signal<RecentOrder[]>([]);
  readonly loading      = signal(true);
  readonly statusFr     = STATUS_FR;

  readonly occupiedCount = computed(() => this.tables().filter(t => t.is_occupied).length);
  readonly freeCount     = computed(() => this.tables().filter(t => t.is_active && !t.is_occupied).length);
  readonly totalCount    = computed(() => this.tables().length);

  // Popup "Demander un code de commande"
  readonly codePopup      = signal(false);
  readonly codeInput      = signal('');
  readonly codeError      = signal('');
  readonly codeSubmitting = signal(false);

  private sub?: Subscription;

  ngOnInit() {
    this.load();

    this.sub = this.rt.events$.subscribe(ev => {
      if (ev.type === 'connected') {
        this.rt.invoke('JoinAdmin', this.auth.currentStaff()?.restaurantId).then(() => this.load()).catch(() => {});
      }
      if (ev.type === 'table:status' || ev.type === 'order:status') this.load();
    });

    // Vue admin (lecture seule, imbriquée dans AdminLayoutComponent) : la connexion
    // SignalR est déjà ouverte et maintenue par le layout (même groupe "admin") - on ne
    // doit pas ouvrir/fermer notre propre connexion, ça couperait celle du layout.
    if (this.auth.isOwner()) {
      this.rt.invoke('JoinAdmin', this.auth.currentStaff()?.restaurantId).catch(() => {});
    } else {
      this.rt.connect(this.auth.getToken() ?? undefined)
        .then(() => this.rt.invoke('JoinAdmin', this.auth.currentStaff()?.restaurantId))
        .catch(() => {});
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (!this.auth.isOwner()) this.rt.disconnect();
  }

  private load() {
    const restaurantId = this.auth.currentStaff()?.restaurantId ?? '';
    forkJoin({
      tables: this.tableSvc.getAll(restaurantId),
      recentOrders: this.exitSvc.getRecentOrders()
    }).subscribe({
      next: ({ tables, recentOrders }) => {
        this.tables.set(tables);
        this.recentOrders.set(recentOrders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openCodePopup() {
    this.codeInput.set('');
    this.codeError.set('');
    this.codeSubmitting.set(false);
    this.codePopup.set(true);
  }

  closeCodePopup() { this.codePopup.set(false); }

  submitCode() {
    const code = this.codeInput().trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      this.codeError.set('Le code doit contenir exactement 6 chiffres.');
      return;
    }

    this.codeSubmitting.set(true);
    this.codeError.set('');
    this.exitSvc.getByCode(code).subscribe({
      next: () => {
        this.codePopup.set(false);
        this.codeSubmitting.set(false);
        const slug = this.auth.currentStaff()?.restaurantSlug;
        this.router.navigate(['/', slug, 'exit', 'order', code]);
      },
      error: () => {
        this.codeError.set('Code introuvable. Vérifiez la saisie ou redemandez au client de relire son code.');
        this.codeSubmitting.set(false);
      }
    });
  }
}
