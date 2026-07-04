import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminStats } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly base = `${environment.apiUrl}/stats`;
  constructor(private http: HttpClient) {}

  get(): Observable<AdminStats> {
    return this.http.get<AdminStats>(this.base);
  }
}
