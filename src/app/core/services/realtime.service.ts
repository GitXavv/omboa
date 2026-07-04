import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export type RealtimeEvent =
  | { type: 'order:new';           payload: { orderId: string; tableNumber: string } }
  | { type: 'order:status';        payload: { orderId: string; status: string } }
  | { type: 'table:status';        payload: { tableId: string; isOccupied: boolean } }
  | { type: 'connected' }
  | { type: 'disconnected' };

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private connection: signalR.HubConnection | null = null;
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

    this.connection.onclose(() => this.events$.next({ type: 'disconnected' }));
    this.connection.onreconnected(() => this.events$.next({ type: 'connected' }));

    await this.connection.start();
    this.events$.next({ type: 'connected' });
  }

  async invoke(method: string, ...args: unknown[]) {
    await this.connection?.invoke(method, ...args);
  }

  async disconnect() {
    await this.connection?.stop();
    this.connection = null;
  }

  ngOnDestroy() { this.disconnect(); }
}
