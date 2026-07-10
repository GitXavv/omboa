import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order, OrderStatus } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReceptionService {
  private readonly base = `${environment.apiUrl}/reception`;

  constructor(private http: HttpClient) {}

  getAll(status?: OrderStatus): Observable<Order[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<Order[]>(`${this.base}/orders${params}`);
  }

  accept(orderId: string): Observable<Order> {
    return this.http.post<Order>(`${this.base}/orders/${orderId}/accept`, {});
  }

  confirmCashPayment(orderId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/orders/${orderId}/confirm-cash`, {});
  }

  markServed(orderId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/orders/${orderId}/serve`, {});
  }

  cancelWithReason(orderId: string, reason: string): Observable<Order> {
    return this.http.post<Order>(`${this.base}/orders/${orderId}/cancel`, { reason });
  }
}
