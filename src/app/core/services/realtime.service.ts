import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export type RealtimeEvent =
  | { type: 'order:new';           payload: { orderId: string; tableNumber: string } }
  | { type: 'order:status';        payload: { orderId: string; status: string } }
  | { type: 'order:paid';          payload: { serviceCode: string } }
  | { type: 'table:status';        payload: { tableId: string; isOccupied: boolean } }
  | { type: 'kitchen:question';    payload: { question: string } }
  | { type: 'kitchen:cancel';      payload: { reason: string } }
  | { type: 'client:reply';        payload: { reply: string; tableNumber: string; orderId: string } }
  | { type: 'server:reminder';     payload: { tableNumber: string; orderId: string } }
  | { type: 'delivery:reminder';   payload: { tableNumber: string; orderId: string } }
  | { type: 'server:issue';        payload: { tableNumber: string; orderId: string } }
  | { type: 'payment:method';      payload: { orderId: string; method: string; cashCode: string | null } }
  | { type: 'payment:removed';     payload: { orderId: string } }
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

    this.connection.on('OrderStatus', (orderId: string, status: string) =>
      this.events$.next({ type: 'order:status', payload: { orderId, status } })
    );

    this.connection.on('TableStatus', (tableId: string, isOccupied: boolean) =>
      this.events$.next({ type: 'table:status', payload: { tableId, isOccupied } })
    );

    this.connection.on('KitchenQuestion', (question: string) =>
      this.events$.next({ type: 'kitchen:question', payload: { question } })
    );

    this.connection.on('KitchenCancel', (reason: string) =>
      this.events$.next({ type: 'kitchen:cancel', payload: { reason } })
    );

    this.connection.on('ClientReply', (reply: string, tableNumber: string, orderId: string) =>
      this.events$.next({ type: 'client:reply', payload: { reply, tableNumber, orderId } })
    );

    this.connection.on('ServerReminder', (tableNumber: string, orderId: string) =>
      this.events$.next({ type: 'server:reminder', payload: { tableNumber, orderId } })
    );

    this.connection.on('DeliveryReminder', (tableNumber: string, orderId: string) =>
      this.events$.next({ type: 'delivery:reminder', payload: { tableNumber, orderId } })
    );

    this.connection.on('ServerIssue', (tableNumber: string, orderId: string) =>
      this.events$.next({ type: 'server:issue', payload: { tableNumber, orderId } })
    );

    this.connection.on('PaymentMethod', (orderId: string, method: string, cashCode: string | null) =>
      this.events$.next({ type: 'payment:method', payload: { orderId, method, cashCode } })
    );

    this.connection.on('ServiceCode', (serviceCode: string) =>
      this.events$.next({ type: 'order:paid', payload: { serviceCode } })
    );

    this.connection.on('PaymentRemoved', (orderId: string) =>
      this.events$.next({ type: 'payment:removed', payload: { orderId } })
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
