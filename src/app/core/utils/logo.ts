import { Restaurant } from '../models';

// Affiché à la place du logo d'un restaurant qui n'en a pas encore défini (super admin) —
// jamais écrit en base : logo_url reste NULL tant qu'aucun logo réel n'est choisi.
export const DEFAULT_RESTAURANT_LOGO_URL =
  'https://tjavmgeyoubtqedspgeb.supabase.co/storage/v1/object/public/restau-logos/no-logo.png';

export function restaurantLogoUrl(r: Pick<Restaurant, 'logo_url'> | null | undefined): string {
  return r?.logo_url || DEFAULT_RESTAURANT_LOGO_URL;
}
