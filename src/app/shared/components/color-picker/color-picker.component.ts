import { Component, ElementRef, HostListener, ViewChild, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Hsv, hexToHsv, hsvToHex, hsvToRgb } from '../../../core/utils/color';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// Color picker complet (carré saturation/valeur + curseur de teinte + pipette + champs
// RVB) — le même principe que Djelica, PAS une saisie hexadécimale manuelle ni une simple
// palette de pastilles : l'utilisateur manipule visuellement teinte/saturation/valeur.
@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.css'
})
export class ColorPickerComponent {
  readonly value = input<string>('#C87D60');
  readonly valueChange = output<string>();

  readonly open = signal(false);

  protected readonly hue = signal(0);
  protected readonly sat = signal(1);
  protected readonly val = signal(1);

  readonly hex = computed(() => hsvToHex({ h: this.hue(), s: this.sat(), v: this.val() }));
  readonly rgb = computed(() => {
    const { r, g, b } = hsvToRgb({ h: this.hue(), s: this.sat(), v: this.val() });
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  });

  readonly eyedropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window;

  @ViewChild('svEl') private svEl!: ElementRef<HTMLDivElement>;
  @ViewChild('hueEl') private hueEl!: ElementRef<HTMLDivElement>;

  constructor() {
    // Se resynchronise si le parent change la valeur de l'extérieur (ex. ouverture de
    // la modale d'édition d'un autre restaurant) — jamais si ça vient de nous-même.
    effect(() => {
      const incoming = this.value();
      if (incoming && incoming.toLowerCase() !== this.hex().toLowerCase()) {
        this.setHsvFromHex(incoming);
      }
    });
  }

  toggle() { this.open.update(v => !v); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.cpk')) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.open.set(false); }

  onSvDown(e: PointerEvent) {
    this.svEl.nativeElement.setPointerCapture(e.pointerId);
    this.updateSv(e);
  }
  onSvMove(e: PointerEvent) {
    if (e.buttons !== 1) return;
    this.updateSv(e);
  }

  onHueDown(e: PointerEvent) {
    this.hueEl.nativeElement.setPointerCapture(e.pointerId);
    this.updateHue(e);
  }
  onHueMove(e: PointerEvent) {
    if (e.buttons !== 1) return;
    this.updateHue(e);
  }

  setChannel(channel: 'r' | 'g' | 'b', raw: number) {
    const n = clamp(Math.round(raw) || 0, 0, 255);
    const next = { ...this.rgb(), [channel]: n };
    const hex = `#${[next.r, next.g, next.b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
    this.setHsvFromHex(hex);
    this.emit();
  }

  async pickFromScreen() {
    const EyeDropperCtor = (window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!EyeDropperCtor) return;
    try {
      const result = await new EyeDropperCtor().open();
      this.setHsvFromHex(result.sRGBHex);
      this.emit();
    } catch {
      // Annulé par l'utilisateur (touche Échap pendant la capture) — rien à faire.
    }
  }

  private updateSv(e: PointerEvent) {
    const rect = this.svEl.nativeElement.getBoundingClientRect();
    this.sat.set(clamp((e.clientX - rect.left) / rect.width, 0, 1));
    this.val.set(1 - clamp((e.clientY - rect.top) / rect.height, 0, 1));
    this.emit();
  }

  private updateHue(e: PointerEvent) {
    const rect = this.hueEl.nativeElement.getBoundingClientRect();
    this.hue.set(clamp((e.clientX - rect.left) / rect.width, 0, 1) * 360);
    this.emit();
  }

  private setHsvFromHex(hex: string) {
    const { h, s, v } = hexToHsv(hex);
    this.hue.set(h);
    this.sat.set(s);
    this.val.set(v);
  }

  private emit() { this.valueChange.emit(this.hex()); }
}
