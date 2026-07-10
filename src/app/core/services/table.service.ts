import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TableRecord, TableStatus } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly base = `${environment.apiUrl}/tables`;

  constructor(private http: HttpClient) {}

  getAll(restaurantId: string): Observable<TableStatus[]> {
    return this.http.get<TableStatus[]>(`${this.base}?restaurantId=${restaurantId}`);
  }

  getById(id: string): Observable<TableStatus> {
    return this.http.get<TableStatus>(`${this.base}/${id}`);
  }

  create(number: string): Observable<TableRecord> {
    return this.http.post<TableRecord>(this.base, { number });
  }

  update(id: string, data: Partial<TableRecord>): Observable<TableRecord> {
    return this.http.put<TableRecord>(`${this.base}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
