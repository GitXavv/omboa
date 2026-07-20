import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Réglages du propre restaurant de l'owner (distinct de SuperAdminService, qui gère les
// restaurants au niveau plateforme).
@Injectable({ providedIn: 'root' })
export class RestaurantSettingsService {
  private readonly base = `${environment.apiUrl}/admin/restaurant-settings`;
  constructor(private http: HttpClient) {}

  updateLoyaltyEnabled(enabled: boolean): Observable<void> {
    return this.http.put<void>(`${this.base}/loyalty`, { enabled });
  }
}
