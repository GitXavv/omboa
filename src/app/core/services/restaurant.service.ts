import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Restaurant } from '../models';
import { environment } from '../../../environments/environment';

// Contexte du restaurant actuellement affiché (peuplé par restaurantResolver au
// chargement de toute route /:restaurantSlug/*).
@Injectable({ providedIn: 'root' })
export class RestaurantService {
  readonly current = signal<Restaurant | null>(null);

  constructor(private http: HttpClient) {}

  getBySlug(slug: string): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${environment.apiUrl}/restaurants/by-slug/${slug}`).pipe(
      tap(r => this.current.set(r))
    );
  }

  // Appelé par App en quittant tout contexte /:restaurantSlug/* (landing, /osuper) —
  // sans ça, le dernier restaurant visité resterait actif (et son thème avec).
  clear() { this.current.set(null); }
}
