import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DemoRequestPayload {
  email: string;
  name: string;
  tag: string;
  logo_url?: string;
  address?: string;
  color_primary?: string;
  color_secondary?: string;
}

export interface DemoRequest extends DemoRequestPayload {
  id: string;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
}

// Endpoints publics — un prospect qui remplit "Réservez une démo" n'a encore aucun
// restaurant, donc aucun JWT staff. Distinct d'ImageUploadService (réservé aux owners
// connectés) : le logo est envoyé vers un bucket Supabase dédié (restau-logos).
@Injectable({ providedIn: 'root' })
export class DemoRequestService {
  private readonly http = inject(HttpClient);

  uploadLogo(file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http
      .post<{ url: string }>(`${environment.apiUrl}/demo-requests/logo-upload`, form)
      .pipe(map(r => r.url));
  }

  submit(payload: DemoRequestPayload): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${environment.apiUrl}/demo-requests`, payload);
  }
}
