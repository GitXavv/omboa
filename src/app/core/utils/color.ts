// Petits utilitaires couleur - servent à dériver, à partir des 2 couleurs de marque
// choisies par un restaurant (primary/secondary), toutes les variantes dont le design
// system a besoin (survol, estompé) et un texte de contraste sûr (pas de blanc sur
// une couleur trop claire). Aucune dépendance externe, tout en JS pur sur du RGB.

export interface Rgb { r: number; g: number; b: number; }

export function hexToRgb(hex: string): Rgb | null {
  const clean = hex.trim().replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Luminance relative WCAG - sert à décider si un texte blanc ou foncé est lisible
// par-dessus une couleur donnée.
function relativeLuminance({ r, g, b }: Rgb): number {
  const srgb = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(l1: number, l2: number): number {
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

// Choisit blanc ou un texte sombre selon celui qui offre le meilleur contraste sur
// la couleur donnée - évite le texte blanc illisible si le restaurant choisit une
// couleur de marque trop claire.
export function contrastForeground(hex: string, darkText = '#1a1008'): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  const bgLum = relativeLuminance(rgb);
  const whiteContrast = contrastRatio(bgLum, 1);
  const darkContrast = contrastRatio(bgLum, relativeLuminance(hexToRgb(darkText)!));
  return whiteContrast >= darkContrast ? '#ffffff' : darkText;
}

// Éclaircit (amount > 0) ou assombrit (amount < 0) une couleur en l'interpolant
// vers le blanc ou le noir - sert à générer les variantes -light/-dark au survol.
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = amount >= 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const t = Math.min(1, Math.abs(amount));
  return rgbToHex({
    r: rgb.r + (target.r - rgb.r) * t,
    g: rgb.g + (target.g - rgb.g) * t,
    b: rgb.b + (target.b - rgb.b) * t
  });
}

export function toRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export interface Hsv { h: number; s: number; v: number; }

// Conversions HSV <-> RGB - servent au color picker complet (carré saturation/valeur +
// curseur de teinte), où l'utilisateur manipule teinte/saturation/valeur plutôt que
// des composantes RVB directement.
export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60)       [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else              [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function hexToHsv(hex: string): Hsv {
  return rgbToHsv(hexToRgb(hex) ?? { r: 0, g: 0, b: 0 });
}

export function hsvToHex(hsv: Hsv): string {
  return rgbToHex(hsvToRgb(hsv));
}

// Reprend uniquement la TEINTE de `hex` en lui imposant une saturation/valeur fixes -
// sert à décliner les tons neutres du thème (texte discret, bordures, fonds de carte…)
// dans la teinte du restaurant tout en gardant leur "poids" visuel d'origine (même
// luminosité/contraste qu'avec la palette par défaut, jamais plus clair/saturé).
export function retint(hex: string, s: number, v: number): string {
  const { h } = hexToHsv(hex);
  return hsvToHex({ h, s, v });
}
