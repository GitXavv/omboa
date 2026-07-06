import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Log } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LogService {
  private readonly base = `${environment.apiUrl}/logs`;

  constructor(private http: HttpClient) {}

  getAll(params?: { event_type?: string; from?: string; to?: string; page?: number }): Observable<{ data: Log[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.event_type) query.set('event_type', params.event_type);
    if (params?.from)       query.set('from', params.from);
    if (params?.to)         query.set('to', params.to);
    if (params?.page)       query.set('page', String(params.page));
    return this.http.get<{ data: Log[]; total: number }>(`${this.base}?${query}`).pipe(
      map(r => ({
        ...r,
        data: r.data.map(log => ({
          ...log,
          metadata: typeof log.metadata === 'string'
            ? (() => { try { return JSON.parse(log.metadata as string); } catch { return null; } })()
            : log.metadata
        }))
      }))
    );
  }

  download(): Observable<Blob> {
    return this.http.get(`${this.base}/download`, { responseType: 'blob' });
  }
}
