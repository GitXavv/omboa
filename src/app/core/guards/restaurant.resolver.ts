import { inject } from '@angular/core';
import { ResolveFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { catchError, of } from 'rxjs';
import { RestaurantService } from '../services/restaurant.service';
import { Restaurant } from '../models';

// Peuple RestaurantService.current avant toute route /:restaurantSlug/* - redirige
// vers la landing page si le slug ne correspond à aucun restaurant actif.
export const restaurantResolver: ResolveFn<Restaurant | null> = (route: ActivatedRouteSnapshot) => {
  const restaurantSvc = inject(RestaurantService);
  const router = inject(Router);
  const slug = route.paramMap.get('restaurantSlug')!;

  return restaurantSvc.getBySlug(slug).pipe(
    catchError(() => {
      router.navigate(['/']);
      return of(null);
    })
  );
};
