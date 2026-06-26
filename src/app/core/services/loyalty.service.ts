import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoyaltyTransaction } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoyaltyService {
  private readonly base = `${environment.apiUrl}/loyalty`;

  constructor(private http: HttpClient) {}

  getBalance(): Observable<{ balance: number }> {
    return this.http.get<{ balance: number }>(`${this.base}/balance`);
  }

  getHistory(): Observable<LoyaltyTransaction[]> {
    return this.http.get<LoyaltyTransaction[]>(`${this.base}/history`);
  }

  // Calcule la réduction correspondant aux points à dépenser (côté serveur)
  previewDiscount(points: number, orderTotal: number): Observable<{ discount_amount: number; discount_percent: number }> {
    return this.http.post<{ discount_amount: number; discount_percent: number }>(
      `${this.base}/preview-discount`,
      { points, order_total: orderTotal }
    );
  }
}
