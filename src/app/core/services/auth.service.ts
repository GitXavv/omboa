import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { Customer } from '../models';
import { environment } from '../../../environments/environment';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; phone: string };
  profile: Customer;
}

// Session client (Supabase Auth) — le staff n'utilise plus jamais ce service,
// voir StaffAuthService pour les rôles owner/cook/receptionist/exit.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'omboa_token';
  private readonly PROFILE_KEY = 'omboa_profile';

  readonly currentUser = signal<Customer | null>(this.loadProfile());
  readonly isLoggedIn  = computed(() => this.currentUser() !== null);

  constructor(private http: HttpClient, private router: Router) {}

  login(phone: string, password: string, restaurantSlug: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, {
      phone, password, restaurant_slug: restaurantSlug
    }).pipe(
      tap(res => this.storeSession(res)),
      catchError(err => throwError(() => err))
    );
  }

  register(phone: string, password: string, full_name: string, restaurantSlug: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, {
      phone, password, full_name, restaurant_slug: restaurantSlug
    }).pipe(
      tap(res => this.storeSession(res)),
      catchError(err => throwError(() => err))
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.PROFILE_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  refreshProfile() {
    return this.http.get<Customer>(`${environment.apiUrl}/auth/me`).pipe(
      tap(profile => {
        this.currentUser.set(profile);
        localStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
      })
    );
  }

  private storeSession(res: AuthResponse) {
    // Mutuellement exclusif avec une session staff éventuelle.
    localStorage.removeItem('omboa_staff_token');
    localStorage.removeItem('omboa_staff_session');
    localStorage.setItem(this.TOKEN_KEY, res.access_token);
    localStorage.setItem(this.PROFILE_KEY, JSON.stringify(res.profile));
    this.currentUser.set(res.profile);
  }

  private loadProfile(): Customer | null {
    const raw = localStorage.getItem(this.PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
