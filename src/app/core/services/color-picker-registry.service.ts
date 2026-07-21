import { Injectable, signal } from '@angular/core';

// Coordonne l'ouverture des <app-color-picker> entre eux : un seul peut être ouvert à la
// fois, quel que soit le nombre d'instances sur la page (ex. couleur primaire/secondaire
// dans le même formulaire) - en ouvrir un ferme automatiquement celui qui l'était.
@Injectable({ providedIn: 'root' })
export class ColorPickerRegistryService {
  readonly openId = signal<number | null>(null);
}
