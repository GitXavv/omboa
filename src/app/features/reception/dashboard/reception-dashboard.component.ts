import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';
import { TableService } from '../../../core/services/table.service';
import { ReceptionService } from '../../../core/services/reception.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { AuthService } from '../../../core/services/auth.service';
import { TableStatus, RecentOrder } from '../../../core/models';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

const STATUS_FR: Partial<Record<string, string>> = {
  served: 'Servie', cancelled: 'Annulée'
};

@Component({
  selector: 'app-reception-dashboard',
  standalone: true,
  imports: [DecimalPipe, DatePipe, LoaderComponent],
  templateUrl: './reception-dashboard.component.html',
  styleUrl: './reception-dashboard.component.css'
})
export class ReceptionDashboardComponent implements OnInit, OnDestroy {
  private readonly tableSvc = inject(TableService);
  private readonly receptionSvc = inject(ReceptionService);
  private readonly rt   = inject(RealtimeService);
  readonly auth         = inject(AuthService);
  private readonly router = inject(Router);

  readonly tables       = signal<TableStatus[]>([]);
  readonly recentOrders = signal<RecentOrder[]>([]);
  readonly loading      = signal(true);
  readonly connected    = signal(false);
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
        this.connected.set(true);
        this.rt.invoke('JoinAdmin').then(() => this.load()).catch(() => {});
      }
      if (ev.type === 'disconnected') this.connected.set(false);
      if (ev.type === 'table:status' || ev.type === 'order:status') this.load();
    });

    this.rt.connect(this.auth.getToken() ?? undefined)
      .then(() => this.rt.invoke('JoinAdmin'))
      .then(() => this.connected.set(true))
      .catch(() => this.connected.set(false));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.rt.disconnect();
  }

  private load() {
    forkJoin({
      tables: this.tableSvc.getAll(),
      recentOrders: this.receptionSvc.getRecentOrders()
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
    this.receptionSvc.getByCode(code).subscribe({
      next: () => {
        this.codePopup.set(false);
        this.codeSubmitting.set(false);
        this.router.navigate(['/reception/order', code]);
      },
      error: () => {
        this.codeError.set('Code introuvable. Vérifiez la saisie ou redemandez au client de relire son code.');
        this.codeSubmitting.set(false);
      }
    });
  }
}
