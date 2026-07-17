import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export type RealtimeEvent =
  | { type: 'order:new';           payload: { orderId: string; tableNumber: string } }
  | { type: 'order:confirmed';     payload: { orderId: string; tableNumber: string } }
  | { type: 'order:status';        payload: { orderId: string; status: string } }
  | { type: 'table:status';        payload: { tableId: string; isOccupied: boolean } }
  | { type: 'kitchen:cancel';      payload: { reason: string } }
  | { type: 'admin:table-issue';   payload: { tableId: string; tableNumber: string } }
  | { type: 'payment:method';      payload: { orderId: string; method: string } }
  | { type: 'payment:removed';     payload: { orderId: string } }
  | { type: 'product:availability'; payload: { productId: string; isAvailable: boolean } }
  | { type: 'connected' }
  | { type: 'disconnected' };

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private connection: signalR.HubConnection | null = null;
  private connectionReady?: Promise<void>;
  readonly events$ = new Subject<RealtimeEvent>();

  async connect(token?: string) {
    // Import dynamique pour ne pas casser SSR ou les builds sans @microsoft/signalr
    const signalR = await import('@microsoft/signalr');

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubUrl}/orders`, {
        accessTokenFactory: () => token ?? ''
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.on('OrderNew', (orderId: string, tableNumber: string) =>
      this.events$.next({ type: 'order:new', payload: { orderId, tableNumber } })
    );

    this.connection.on('OrderConfirmed', (orderId: string, tableNumber: string) =>
      this.events$.next({ type: 'order:confirmed', payload: { orderId, tableNumber } })
    );

    this.connection.on('OrderStatus', (orderId: string, status: string) =>
      this.events$.next({ type: 'order:status', payload: { orderId, status } })
    );

    this.connection.on('TableStatus', (tableId: string, isOccupied: boolean) =>
      this.events$.next({ type: 'table:status', payload: { tableId, isOccupied } })
    );

    this.connection.on('KitchenCancel', (reason: string) =>
      this.events$.next({ type: 'kitchen:cancel', payload: { reason } })
    );

    this.connection.on('TableIssue', (tableId: string, tableNumber: string) =>
      this.events$.next({ type: 'admin:table-issue', payload: { tableId, tableNumber } })
    );

    this.connection.on('PaymentMethod', (orderId: string, method: string) =>
      this.events$.next({ type: 'payment:method', payload: { orderId, method } })
    );

    this.connection.on('PaymentRemoved', (orderId: string) =>
      this.events$.next({ type: 'payment:removed', payload: { orderId } })
    );

    this.connection.on('ProductAvailability', (productId: string, isAvailable: boolean) =>
      this.events$.next({ type: 'product:availability', payload: { productId, isAvailable } })
    );

    this.connection.onclose(() => this.events$.next({ type: 'disconnected' }));
    // 'connected' = reconnexion uniquement (pas le premier démarrage)
    this.connection.onreconnected(() => this.events$.next({ type: 'connected' }));

    this.connectionReady = this.connection.start();
    await this.connectionReady;
  }

  async invoke(method: string, ...args: unknown[]) {
    // Attendre que la connexion soit établie avant d'invoquer
    if (this.connectionReady) await this.connectionReady;
    await this.connection?.invoke(method, ...args);
  }

  async disconnect() {
    await this.connection?.stop();
    this.connection = null;
  }

  ngOnDestroy() { this.disconnect(); }
}
