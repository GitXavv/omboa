import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { Profile } from '../models';
import { environment } from '../../../environments/environment';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; phone: string };
  profile: Profile;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'omboa_token';
  private readonly PROFILE_KEY = 'omboa_profile';

  readonly currentUser = signal<Profile | null>(this.loadProfile());
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isOwner   = computed(() => this.currentUser()?.role === 'owner');
  readonly isCook    = computed(() => this.currentUser()?.role === 'cook');
  readonly isReceptionist = computed(() => this.currentUser()?.role === 'receptionist');

  constructor(private http: HttpClient, private router: Router) {}

  login(phone: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { phone, password }).pipe(
      tap(res => this.storeSession(res)),
      catchError(err => throwError(() => err))
    );
  }

  register(phone: string, password: string, full_name: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, { phone, password, full_name }).pipe(
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
    return this.http.get<Profile>(`${environment.apiUrl}/auth/me`).pipe(
      tap(profile => {
        this.currentUser.set(profile);
        localStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
      })
    );
  }

  private storeSession(res: AuthResponse) {
    localStorage.setItem(this.TOKEN_KEY, res.access_token);
    localStorage.setItem(this.PROFILE_KEY, JSON.stringify(res.profile));
    this.currentUser.set(res.profile);
  }

  private loadProfile(): Profile | null {
    const raw = localStorage.getItem(this.PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
