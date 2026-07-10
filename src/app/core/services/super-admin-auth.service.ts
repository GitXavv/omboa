import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SuperAdminAuthService {
  private readonly TOKEN_KEY = 'omboa_superadmin_token';

  readonly isLoggedIn = signal(!!localStorage.getItem(this.TOKEN_KEY));

  constructor(private http: HttpClient, private router: Router) {}

  loginWithKey(key: string) {
    return this.http.post<{ access_token: string }>(`${environment.apiUrl}/superadmin/auth/login`, { key }).pipe(
      tap(res => {
        // Mutuellement exclusif avec une session client/staff éventuelle.
        localStorage.removeItem('omboa_token');
        localStorage.removeItem('omboa_profile');
        localStorage.removeItem('omboa_staff_token');
        localStorage.removeItem('omboa_staff_session');
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        this.isLoggedIn.set(true);
      })
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.isLoggedIn.set(false);
    this.router.navigate(['/osuper']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
}
