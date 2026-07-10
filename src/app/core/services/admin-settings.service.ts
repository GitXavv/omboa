import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StaffRole } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminSettingsService {
  private readonly base = `${environment.apiUrl}/admin/staff-keys`;

  constructor(private http: HttpClient) {}

  getDefinedRoles(): Observable<{ roles_defined: StaffRole[] }> {
    return this.http.get<{ roles_defined: StaffRole[] }>(this.base);
  }

  updateKey(role: StaffRole, newKey: string): Observable<void> {
    return this.http.put<void>(this.base, { role, new_key: newKey });
  }
}
