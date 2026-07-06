import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order, OrderItem, OrderStatus, Payment, PaymentMethod } from '../models';
import { environment } from '../../../environments/environment';

export interface CreateOrderPayload {
  table_id: string;
  customer_id?: string;
  items: { product_id: string; quantity: number; unit_price: number; notes?: string }[];
}

export interface CreatePaymentPayload {
  order_id: string;
  method: PaymentMethod;
  phone_number?: string;
  points_to_spend?: number;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly base = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  create(payload: CreateOrderPayload): Observable<Order> {
    return this.http.post<Order>(this.base, payload);
  }

  getById(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.base}/${id}`);
  }

  getByCode(code: string): Observable<Order> {
    return this.http.get<Order>(`${this.base}/by-code/${code}`);
  }

  getAll(status?: OrderStatus): Observable<Order[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<Order[]>(`${this.base}${params}`);
  }

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.base}/mine`);
  }

  updateStatus(id: string, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`${this.base}/${id}/status`, { status });
  }

  cancel(id: string): Observable<Order> {
    return this.updateStatus(id, 'cancelled');
  }

  pay(payload: CreatePaymentPayload): Observable<Payment> {
    return this.http.post<Payment>(`${environment.apiUrl}/payments`, payload);
  }
}
