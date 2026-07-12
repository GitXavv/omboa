import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Hsv, hexToHsv, hexToRgb, hsvToHex, hsvToRgb } from '../../../core/utils/color';
import { ColorPickerRegistryService } from '../../../core/services/color-picker-registry.service';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
let nextId = 0;

// Color picker complet (carré saturation/valeur + curseur de teinte + pipette + champs
// RVB + hex modifiable) — le même principe que Djelica.
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

  private readonly id = nextId++;
  private readonly registry = inject(ColorPickerRegistryService);
  // Un seul picker ouvert à la fois, tous instances confondues (ex. primaire/secondaire
  // dans le même formulaire) — en ouvrir un ferme automatiquement les autres puisque
  // `open` n'est vrai que pour l'instance dont l'id correspond à celui du registre.
  readonly open = computed(() => this.registry.openId() === this.id);

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

  // Dernière valeur émise par NOUS-MÊME (pas un signal : ne doit jamais être une
  // dépendance réactive de l'effect ci-dessous, sinon on obtient une boucle où l'effect
  // se redéclenche à cause de son propre emit() et écrase la couleur qu'on vient de
  // choisir en la comparant à this.hex() — la sélection semble alors "ne pas prendre"
  // ou revenir en arrière juste après un drag dans le carré/la teinte).
  private lastEmitted: string | null = null;

  constructor() {
    // Se resynchronise si le parent change la valeur de l'extérieur (ex. ouverture de
    // la modale d'édition d'un autre restaurant) — jamais si ça vient de nous-même : on
    // compare à lastEmitted, jamais à this.hex() (qui, lui, dépend de hue/sat/val et
    // recréerait la boucle décrite ci-dessus).
    effect(() => {
      const incoming = this.value();
      if (incoming && incoming.toLowerCase() !== this.lastEmitted?.toLowerCase()) {
        this.setHsvFromHex(incoming);
      }
    });
  }

  toggle() { this.registry.openId.set(this.open() ? null : this.id); }
  close()  { if (this.open()) this.registry.openId.set(null); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!this.open()) return;
    if (!(e.target as HTMLElement).closest('.cpk')) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.close(); }

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

  // Saisie manuelle de l'hex — validée à la confirmation (blur/Entrée), jamais à chaque
  // frappe : le champ est en binding [value] à sens unique (pas ngModel), donc il ne se
  // fait pas reformater sous les doigts de l'utilisateur pendant qu'il tape.
  onHexCommit(raw: string) {
    if (!hexToRgb(raw)) return; // valeur invalide — le [value]="hex()" restaure l'affichage précédent
    this.setHsvFromHex(raw);
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

  private emit() {
    const h = this.hex();
    this.lastEmitted = h;
    this.valueChange.emit(h);
  }
}
