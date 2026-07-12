import { Component, input, output } from '@angular/core';

// Palette de couleurs prédéfinies pour la marque d'un restaurant (primary/secondary) —
// jamais de saisie hexadécimale manuelle, uniquement des pastilles à choisir, comme
// le fait Djelica pour la création d'un restaurant.
export const RESTAURANT_COLOR_SWATCHES: string[] = [
  '#C87D60', '#A5603E', '#D1AD67', '#6B4030',
  '#B23A2E', '#E0663F', '#D98E04', '#7A9A3C',
  '#2F7D5A', '#1E7A6E', '#2D6A8F', '#3B5FA6',
  '#5B4FA6', '#8A3C8C', '#B0446B', '#4A4A4A',
  '#2B2B2B', '#8C6239', '#5C4033', '#1F1F1F',
];

@Component({
  selector: 'app-color-palette-picker',
  standalone: true,
  templateUrl: './color-palette-picker.component.html',
  styleUrl: './color-palette-picker.component.css'
})
export class ColorPalettePickerComponent {
  readonly value = input<string | null>(null);
  readonly valueChange = output<string>();

  readonly swatches = RESTAURANT_COLOR_SWATCHES;

  select(color: string) {
    this.valueChange.emit(color);
  }
}
