import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { StaffAuthService } from '../services/staff-auth.service';
import { SuperAdminAuthService } from '../services/super-admin-auth.service';

// Les trois sessions (client, staff, super admin) sont mutuellement exclusives —
// au plus une seule a un token à un instant donné, donc l'ordre de priorité ici
// n'a d'effet que si plusieurs onglets ont laissé des tokens orphelins.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(SuperAdminAuthService).getToken()
    ?? inject(StaffAuthService).getToken()
    ?? inject(AuthService).getToken();

  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
