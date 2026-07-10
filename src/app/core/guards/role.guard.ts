import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { StaffAuthService } from '../services/staff-auth.service';

// Garde les routes staff (/:restaurantSlug/admin|kitchen|reception|exit) : vérifie le
// rôle ET que la session staff correspond bien au restaurant de l'URL — empêche un
// réceptionniste connecté au resto A d'atteindre /{resto-B}/reception en éditant l'URL.
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const staffAuth = inject(StaffAuthService);
  const router     = inject(Router);
  const allowed: string[] = route.data['roles'] ?? [];
  const session = staffAuth.currentStaff();
  const slug = route.parent?.paramMap.get('restaurantSlug') ?? route.paramMap.get('restaurantSlug');

  if (session && allowed.includes(session.role) && session.restaurantSlug === slug) return true;
  return router.createUrlTree([slug ? `/${slug}/ostaff` : '/']);
};
