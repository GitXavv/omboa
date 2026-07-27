import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Restaurant, SuperAdminStats, Log } from '../models';
import { DemoRequest } from './demo-request.service';
import { environment } from '../../../environments/environment';

export interface CreateRestaurantPayload {
  name: string;
  slug: string;
  owner_key: string;
  logo_url?: string;
  color_primary?: string;
  color_secondary?: string;
  address?: string;
}

export interface CreateRestaurantResponse {
  restaurant: Restaurant;
  default_staff_keys: { cook: string; receptionist: string; exit: string };
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly base = `${environment.apiUrl}/superadmin`;

  constructor(private http: HttpClient) {}

  getRestaurants(): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(`${this.base}/restaurants`);
  }

  createRestaurant(payload: CreateRestaurantPayload): Observable<CreateRestaurantResponse> {
    return this.http.post<CreateRestaurantResponse>(`${this.base}/restaurants`, payload);
  }

  updateRestaurant(id: string, data: Partial<Pick<Restaurant, 'name' | 'logo_url' | 'color_primary' | 'color_secondary' | 'address' | 'is_active' | 'archived'>>): Observable<void> {
    return this.http.put<void>(`${this.base}/restaurants/${id}`, data);
  }

  uploadLogo(restaurantId: string, file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http
      .post<{ url: string }>(`${this.base}/restaurants/${restaurantId}/logo-upload`, form)
      .pipe(map(r => r.url));
  }

  // Avant création (le restaurant n'a pas encore d'id).
  uploadLogoForNewRestaurant(file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http
      .post<{ url: string }>(`${this.base}/logo-upload`, form)
      .pipe(map(r => r.url));
  }

  getStats(): Observable<SuperAdminStats> {
    return this.http.get<SuperAdminStats>(`${this.base}/stats`);
  }

  getLogs(page = 1, eventType = ''): Observable<{ data: Log[]; total: number; page: number; limit: number }> {
    const query = eventType ? `&event_type=${encodeURIComponent(eventType)}` : '';
    return this.http.get<{ data: Log[]; total: number; page: number; limit: number }>(`${this.base}/logs?page=${page}${query}`);
  }

  downloadLogs(): Observable<Blob> {
    return this.http.get(`${this.base}/logs/download`, { responseType: 'blob' });
  }

  getDemoRequests(archived = false): Observable<DemoRequest[]> {
    return this.http.get<DemoRequest[]>(`${this.base}/demo-requests?archived=${archived}`);
  }

  archiveDemoRequest(id: string): Observable<void> {
    return this.http.put<void>(`${this.base}/demo-requests/${id}/archive`, {});
  }
}
