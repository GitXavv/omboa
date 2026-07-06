import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Order } from '../../core/models';
import { OrderService } from '../../core/services/order.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

interface StoredOrder { id: string; code: string; }

const TERMINAL_STATUSES = ['cancelled', 'served', 'paid'];

const STATUS_LABELS: Partial<Record<string, string>> = {
  pending:   'En attente',
  preparing: 'En préparation',
  ready:     'Prête — elle arrive bientôt !',
  served:    'Servie',
  paid:      'Payée',
  cancelled: 'Annulée',
};

@Component({
  selector: 'app-ma-commande',
  standalone: true,
  imports: [DecimalPipe, DatePipe, RouterLink, LoaderComponent],
  templateUrl: './ma-commande.component.html',
  styleUrl: './ma-commande.component.css'
})
export class MaCommandeComponent implements OnInit, OnDestroy {
  private readonly orderSvc = inject(OrderService);
  private readonly rt       = inject(RealtimeService);

  readonly loading      = signal(true);
  readonly order        = signal<Order | null>(null);
  readonly codeInput    = signal('');
  readonly searchError  = signal<string | null>(null);
  readonly searching    = signal(false);
  readonly codeCopied   = signal(false);

  // Popup cuisine → client
  readonly kitchenPopup     = signal<{ type: 'question' | 'cancel'; message: string } | null>(null);
  readonly kitchenReply     = signal('');
  readonly kitchenReplySent = signal(false);

  readonly statusLabels = STATUS_LABELS;
  readonly terminalStatuses = TERMINAL_STATUSES;

  private readonly STORAGE_KEY = 'omboa_current_order';
  private rtSub?: Subscription;

  ngOnInit() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) { this.loading.set(false); return; }

    try {
      const stored: StoredOrder = JSON.parse(raw);
      this.orderSvc.getById(stored.id).subscribe({
        next: o => {
          if (TERMINAL_STATUSES.includes(o.status)) {
            localStorage.removeItem(this.STORAGE_KEY);
            this.order.set(null);
          } else {
            this.order.set(o);
            this.connectRealtime(stored.id);
          }
          this.loading.set(false);
        },
        error: () => {
          localStorage.removeItem(this.STORAGE_KEY);
          this.loading.set(false);
        }
      });
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.rtSub?.unsubscribe();
    this.rt.disconnect();
  }

  private connectRealtime(orderId: string) {
    this.rt.connect(undefined)
      .then(() => this.rt.invoke('JoinOrder', orderId))
      .then(() => {
        this.rtSub = this.rt.events$.subscribe(ev => {
          if (ev.type === 'order:status' && ev.payload.orderId === orderId) {
            const o = this.order();
            if (o) this.order.set({ ...o, status: ev.payload.status as Order['status'] });
            if (TERMINAL_STATUSES.includes(ev.payload.status)) {
              localStorage.removeItem(this.STORAGE_KEY);
            }
          }
          if (ev.type === 'kitchen:question') {
            this.kitchenPopup.set({ type: 'question', message: ev.payload.question });
            this.kitchenReply.set('');
            this.kitchenReplySent.set(false);
          }
          if (ev.type === 'kitchen:cancel') {
            this.kitchenPopup.set({ type: 'cancel', message: ev.payload.reason });
          }
        });
      })
      .catch(() => { /* connexion optionnelle */ });
  }

  searchByCode() {
    const code = this.codeInput().trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      this.searchError.set('Le code doit contenir exactement 6 chiffres.');
      return;
    }
    this.searchError.set(null);
    this.searching.set(true);

    this.orderSvc.getByCode(code).subscribe({
      next: o => {
        this.order.set(o);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ id: o.id, code: o.code }));
        this.connectRealtime(o.id);
        this.searching.set(false);
      },
      error: () => {
        this.searchError.set('Code introuvable ou commande terminée.');
        this.searching.set(false);
      }
    });
  }

  clearOrder() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.order.set(null);
    this.codeInput.set('');
    this.rtSub?.unsubscribe();
  }

  copyCode() {
    const code = this.order()?.code;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => this.codeCopied.set(true));
  }

  dismissKitchenPopup() {
    this.kitchenPopup.set(null);
    this.kitchenReply.set('');
    this.kitchenReplySent.set(false);
  }

  submitKitchenReply() {
    const reply = this.kitchenReply().trim();
    if (!reply || this.kitchenReplySent()) return;
    const tableNumber = String(this.order()?.table?.number ?? '');
    this.rt.invoke('ReplyToKitchen', this.order()!.id, reply, tableNumber)
      .then(() => this.kitchenReplySent.set(true));
  }

  isTerminal(status: string) { return TERMINAL_STATUSES.includes(status); }
}
