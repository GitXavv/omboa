import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { StaffRole, StaffSession } from '../models';
import { environment } from '../../../environments/environment';

interface StaffLoginResponse {
  access_token: string;
  role: StaffRole;
  restaurant_id: string;
  restaurant_slug: string;
  restaurant_name: string;
}

// Session staff par clé secrète partagée (owner/cook/receptionist/exit) — aucune
// identité individuelle, juste un rôle rattaché à un restaurant. Mutuellement
// exclusive avec la session client (AuthService) : se connecter à l'un efface l'autre.
@Injectable({ providedIn: 'root' })
export class StaffAuthService {
  private readonly TOKEN_KEY   = 'omboa_staff_token';
  private readonly SESSION_KEY = 'omboa_staff_session';

  readonly currentStaff = signal<StaffSession | null>(this.loadSession());
  readonly isLoggedIn      = computed(() => this.currentStaff() !== null);
  readonly isOwner         = computed(() => this.currentStaff()?.role === 'owner');
  readonly isCook          = computed(() => this.currentStaff()?.role === 'cook');
  readonly isReceptionist  = computed(() => this.currentStaff()?.role === 'receptionist');
  readonly isExit          = computed(() => this.currentStaff()?.role === 'exit');

  constructor(private http: HttpClient, private router: Router) {}

  loginWithKey(restaurantSlug: string, key: string) {
    return this.http.post<StaffLoginResponse>(`${environment.apiUrl}/staff/login`, {
      restaurant_slug: restaurantSlug, key
    }).pipe(tap(res => this.storeSession(res)));
  }

  // Re-authentification avant de révéler le champ de changement d'une clé staff — ne
  // modifie pas la session, juste une vérification de la clé owner courante.
  verifyOwnerKey(key: string) {
    return this.http.post<void>(`${environment.apiUrl}/staff/verify-owner-key`, { key });
  }

  logout() {
    const slug = this.currentStaff()?.restaurantSlug;
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.SESSION_KEY);
    this.currentStaff.set(null);
    this.router.navigate([slug ? `/${slug}` : '/']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  redirectPathForRole(role: StaffRole, slug: string): string {
    switch (role) {
      case 'owner':        return `/${slug}/admin`;
      case 'cook':          return `/${slug}/kitchen`;
      case 'receptionist':  return `/${slug}/reception`;
      case 'exit':          return `/${slug}/exit`;
    }
  }

  private storeSession(res: StaffLoginResponse) {
    // Une session staff efface toute session client/super admin (mutuellement
    // exclusives — évite d'attacher deux jeux de headers différents en même temps).
    localStorage.removeItem('omboa_token');
    localStorage.removeItem('omboa_profile');
    localStorage.removeItem('omboa_superadmin_token');

    const session: StaffSession = {
      role: res.role,
      restaurantId: res.restaurant_id,
      restaurantSlug: res.restaurant_slug,
      restaurantName: res.restaurant_name
    };
    localStorage.setItem(this.TOKEN_KEY, res.access_token);
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    this.currentStaff.set(session);
  }

  private loadSession(): StaffSession | null {
    const raw = localStorage.getItem(this.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
