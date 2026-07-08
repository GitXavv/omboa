import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { OrderService } from '../../core/services/order.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Order, OrderStatus, Payment } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

export const STATUS_LABELS: Record<string, string> = {
  pending:   'En attente',
  preparing: 'En préparation',
  ready:     'Prêt',
  paid:      'Payé',
  served:    'Servi',
  released:  'Libéré',
  cancelled: 'Annulé'
};

const METHOD_LABELS: Record<string, string> = {
  cash:         'Espèces',
  orange_money: 'Orange Money',
  mtn_momo:     'MTN MoMo'
};

function nextStatus(order: Order): OrderStatus | null {
  switch (order.status) {
    case 'pending':   return 'preparing';
    case 'preparing': return 'ready';
    // 'ready' et 'paid' : pas de bouton "suivant" simple
    default: return null;
  }
}

function nextLabel(order: Order): string {
  switch (order.status) {
    case 'pending':   return 'Accepter la commande';
    case 'preparing': return 'Marquer prêt';
    default:          return '';
  }
}

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [LoaderComponent],
  templateUrl: './kitchen.component.html',
  styleUrl: './kitchen.component.css'
})
export class KitchenComponent implements OnInit, OnDestroy {
  private readonly orderSvc = inject(OrderService);
  private readonly realtime = inject(RealtimeService);
  readonly auth             = inject(AuthService);
  private readonly toast    = inject(ToastService);

  readonly orders       = signal<Order[]>([]);
  readonly loading      = signal(true);
  readonly confirmingId = signal<string | null>(null);
  readonly confirmMode  = signal<'advance'>('advance');
  readonly mobileTab    = signal<OrderStatus>('pending');

  // Chronomètre (mis à jour chaque seconde)
  readonly now = signal(Date.now());

  // Dialog question / annulation
  readonly dialogOrderId    = signal<string | null>(null);
  readonly dialogMode       = signal<'question' | 'cancel' | null>(null);
  readonly dialogInput      = signal('');
  readonly dialogSubmitting = signal(false);
  readonly dialogError      = signal('');

  // Popup réponse client
  readonly clientReplyPopup = signal<{ reply: string; tableNumber: string; question: string } | null>(null);

  // Popup rappel serveur (paiement espèce)
  readonly serverReminderPopup = signal<{ tableNumber: string; orderId: string } | null>(null);

  // Popup rappel livraison (commande payée, personne n'est encore venue servir)
  readonly deliveryReminderPopup = signal<{ tableNumber: string; orderId: string } | null>(null);

  // Popup génération du code espèce (cuisine → code pour que le client le saisisse)
  readonly cashCodePopup = signal<{ code: string; orderId: string; countdown: number } | null>(null);
  private cashCodeInterval?: ReturnType<typeof setInterval>;

  // Popup saisie du code de service (cuisine entre le code dicté par le client)
  readonly serveCodePopup      = signal<{ orderId: string; tableNumber: string } | null>(null);
  readonly serveCodeInput      = signal('');
  readonly serveCodeError      = signal('');
  readonly serveCodeSubmitting = signal(false);

  readonly pendingOrders   = computed(() => this.orders().filter(o => o.status === 'pending'));
  readonly preparingOrders = computed(() => this.orders().filter(o => o.status === 'preparing'));
  readonly readyOrders     = computed(() => this.orders().filter(o => o.status === 'ready' || o.status === 'paid'));
  readonly mobileOrders    = computed(() => {
    const tab = this.mobileTab();
    if (tab === 'ready') return this.readyOrders();
    return this.orders().filter(o => o.status === tab);
  });
  readonly activeCount     = computed(() =>
    this.pendingOrders().length + this.preparingOrders().length + this.readyOrders().length
  );

  readonly labels       = STATUS_LABELS;
  readonly methodLabels = METHOD_LABELS;

  private sub?: Subscription;
  private clockInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.loadOrders();

    // Chronomètre global (1 tick/s)
    this.clockInterval = setInterval(() => this.now.set(Date.now()), 1000);

    // ⚠️ Subscription AVANT connect() pour ne rater aucun événement
    this.sub = this.realtime.events$.subscribe(ev => {
      if (ev.type === 'connected') {
        // Reconnexion : re-rejoindre le groupe et recharger
        this.realtime.invoke('JoinKitchen')
          .then(() => this.loadOrders())
          .catch(() => {});
      }

      if (ev.type === 'order:new') {
        this.orderSvc.getById(ev.payload.orderId).subscribe(o =>
          this.orders.update(list => [o, ...list])
        );
        this.toast.info(`🔔 Nouvelle commande — Table ${ev.payload.tableNumber}`);
      }
      if (ev.type === 'order:status') {
        const { orderId, status } = ev.payload;
        this.orders.update(list => list.map(o => o.id === orderId
          ? { ...o, status: status as OrderStatus } : o
        ));
        if (['served', 'cancelled'].includes(status)) {
          setTimeout(() => this.orders.update(l => l.filter(o => o.id !== orderId)), 3000);
        }
      }
      if (ev.type === 'payment:method') {
        const { orderId, method } = ev.payload;
        this.orders.update(list => list.map(o => {
          if (o.id !== orderId) return o;
          const payment: Payment = {
            ...(o.payment ?? {} as Payment),
            method: method as Payment['method'],
            status: 'pending',
          };
          return { ...o, payment };
        }));
      }
      if (ev.type === 'payment:removed') {
        const { orderId } = ev.payload;
        this.orders.update(list => list.map(o =>
          o.id === orderId ? { ...o, payment: undefined } : o
        ));
      }
      if (ev.type === 'client:reply') {
        this.clientReplyPopup.set(ev.payload);
      }
      if (ev.type === 'server:reminder') {
        this.serverReminderPopup.set(ev.payload);
      }
      if (ev.type === 'delivery:reminder') {
        this.deliveryReminderPopup.set(ev.payload);
      }
    });

    this.realtime.connect(this.auth.getToken() ?? undefined)
      .then(() => this.realtime.invoke('JoinKitchen'))
      .catch(() => {});
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.realtime.disconnect();
    clearInterval(this.clockInterval);
    clearInterval(this.cashCodeInterval);
  }

  private loadOrders() {
    this.orderSvc.getAll().subscribe({
      next: all => {
        this.orders.set(all.filter(o => !['served', 'released', 'cancelled'].includes(o.status)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // ── Chronomètre ──────────────────────────────────────────────────────────
  elapsed(dateStr: string): string {
    const totalSec = Math.max(0, Math.floor((this.now() - new Date(dateStr).getTime()) / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}h${String(m % 60).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  elapsedUrgent(dateStr: string): boolean {
    return (Date.now() - new Date(dateStr).getTime()) > 15 * 60 * 1000; // > 15 min
  }

  // ── Avancement simple (pending → preparing → ready) ──────────────────────
  requestAdvance(id: string) { this.confirmMode.set('advance'); this.confirmingId.set(id); }
  dismissConfirm()           { this.confirmingId.set(null); }

  confirm(order: Order) {
    this.confirmingId.set(null);
    const next = nextStatus(order);
    if (!next) return;
    this.orderSvc.updateStatus(order.id, next).subscribe({
      next: u => {
        this.orders.update(l => l.map(o => o.id === u.id ? { ...u, payment: o.payment } : o));
        this.toast.success(`Table ${order.table?.number || ''} → ${STATUS_LABELS[next]}`);
      },
      error: () => this.toast.error('Erreur lors du changement de statut.')
    });
  }

  // ── Dialogue question / annulation ───────────────────────────────────────
  openDialog(orderId: string, mode: 'question' | 'cancel') {
    this.dialogOrderId.set(orderId);
    this.dialogMode.set(mode);
    this.dialogInput.set('');
    this.dialogError.set('');
    this.dialogSubmitting.set(false);
    this.confirmingId.set(null);
  }

  closeDialog() {
    this.dialogOrderId.set(null);
    this.dialogMode.set(null);
    this.dialogInput.set('');
    this.dialogError.set('');
  }

  submitDialog() {
    const msg     = this.dialogInput().trim();
    const orderId = this.dialogOrderId()!;
    const mode    = this.dialogMode()!;

    if (!msg) { this.dialogError.set('Veuillez saisir un message.'); return; }

    this.dialogSubmitting.set(true);

    if (mode === 'question') {
      this.realtime.invoke('AskClient', orderId, msg)
        .then(() => this.closeDialog())
        .catch(() => { this.dialogError.set('Envoi échoué.'); this.dialogSubmitting.set(false); });
    } else {
      this.orderSvc.cancel(orderId).subscribe({
        next: u => {
          this.orders.update(l => l.map(o => o.id === u.id ? { ...u, payment: o.payment } : o));
          this.toast.warning(`Commande annulée — Table ${u.table?.number || ''}`);
          this.realtime.invoke('NotifyCancelReason', orderId, msg)
            .finally(() => this.closeDialog());
        },
        error: () => {
          this.dialogError.set('Impossible d\'annuler la commande.');
          this.dialogSubmitting.set(false);
        }
      });
    }
  }

  // ── Popup code espèce (cuisine génère le code pour le client) ─────────────
  openGenerateCashCode(orderId: string) {
    clearInterval(this.cashCodeInterval);
    this.orderSvc.generateCashCode(orderId).subscribe({
      next: ({ code }) => {
        this.cashCodePopup.set({ code, orderId, countdown: 60 });
        this.cashCodeInterval = setInterval(() => {
          const c = this.cashCodePopup()!.countdown - 1;
          this.cashCodePopup.update(p => p ? { ...p, countdown: c } : null);
          if (c <= 0) clearInterval(this.cashCodeInterval);
        }, 1000);
      },
      error: () => this.toast.error('Impossible de générer le code.')
    });
  }

  regenerateCashCode() {
    const orderId = this.cashCodePopup()?.orderId;
    if (!orderId) return;
    clearInterval(this.cashCodeInterval);
    this.openGenerateCashCode(orderId);
  }

  closeCashCodePopup() {
    clearInterval(this.cashCodeInterval);
    this.cashCodePopup.set(null);
  }

  // ── Popup code de service (cuisine entre le code dicté par le client) ─────
  openServePopup(order: Order) {
    this.confirmingId.set(null);
    this.serveCodePopup.set({ orderId: order.id, tableNumber: order.table?.number || '—' });
    this.serveCodeInput.set('');
    this.serveCodeError.set('');
    this.serveCodeSubmitting.set(false);
  }

  closeServePopup() { this.serveCodePopup.set(null); }

  submitServeCode() {
    const code   = this.serveCodeInput().trim();
    const popup  = this.serveCodePopup()!;
    if (code.length !== 5) { this.serveCodeError.set('Le code doit contenir exactement 5 caractères.'); return; }

    this.serveCodeSubmitting.set(true);
    this.serveCodeError.set('');
    this.orderSvc.serve(popup.orderId, code).subscribe({
      next: () => {
        this.serveCodePopup.set(null);
        this.serveCodeSubmitting.set(false);
        this.toast.success('Commande servie !');
      },
      error: err => {
        this.serveCodeError.set(err?.error?.message ?? 'Code incorrect.');
        this.serveCodeSubmitting.set(false);
      }
    });
  }

  // ── Popups info ───────────────────────────────────────────────────────────
  dismissReplyPopup()    { this.clientReplyPopup.set(null); }
  dismissReminderPopup() { this.serverReminderPopup.set(null); }
  dismissDeliveryReminderPopup() { this.deliveryReminderPopup.set(null); }

  hasNext(order: Order)       { return nextStatus(order) !== null; }
  nextLabelFor(order: Order)  { return nextLabel(order); }
  labelFor(s: string)         { return STATUS_LABELS[s] ?? s; }
  nextStatusFor(order: Order) { return nextStatus(order); }
}
