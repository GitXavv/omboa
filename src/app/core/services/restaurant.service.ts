import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Restaurant } from '../models';
import { restaurantLogoUrl } from '../utils/logo';
import { environment } from '../../../environments/environment';

// Contexte du restaurant actuellement affiché (peuplé par restaurantResolver au
// chargement de toute route /:restaurantSlug/*).
@Injectable({ providedIn: 'root' })
export class RestaurantService {
  readonly current = signal<Restaurant | null>(null);

  // Logo du restaurant, ou l'image de repli si aucun n'est défini - jamais null, pour que
  // le header puisse toujours afficher une image.
  readonly logoUrl = computed(() => restaurantLogoUrl(this.current()));

  constructor(private http: HttpClient) {}

  getBySlug(slug: string): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${environment.apiUrl}/restaurants/by-slug/${slug}`).pipe(
      tap(r => this.current.set(r))
    );
  }

  // Appelé par App en quittant tout contexte /:restaurantSlug/* (landing, /osuper) -
  // sans ça, le dernier restaurant visité resterait actif (et son thème avec).
  clear() { this.current.set(null); }

  // Reflète localement un changement déjà confirmé côté serveur (ex. réglage owner) -
  // évite de refaire un GET complet juste pour un champ.
  patchCurrent(patch: Partial<Restaurant>) {
    const r = this.current();
    if (r) this.current.set({ ...r, ...patch });
  }
}
