import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order, RecentOrder } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReceptionService {
  private readonly base = `${environment.apiUrl}/reception`;

  constructor(private http: HttpClient) {}

  getByCode(code: string): Observable<Order> {
    return this.http.get<Order>(`${this.base}/orders/by-code/${code}`);
  }

  release(orderId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/orders/${orderId}/release`, {});
  }

  getRecentOrders(): Observable<RecentOrder[]> {
    return this.http.get<RecentOrder[]>(`${this.base}/recent-orders`);
  }
}
