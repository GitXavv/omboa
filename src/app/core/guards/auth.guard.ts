import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Client connecté uniquement (compte customer) — le staff n'utilise jamais ce guard.
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const slug   = route.paramMap.get('restaurantSlug');

  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(slug ? [`/${slug}/menu`] : ['/']);
};
