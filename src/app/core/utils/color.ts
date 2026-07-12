// Petits utilitaires couleur — servent à dériver, à partir des 2 couleurs de marque
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

// Luminance relative WCAG — sert à décider si un texte blanc ou foncé est lisible
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
// la couleur donnée — évite le texte blanc illisible si le restaurant choisit une
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
// vers le blanc ou le noir — sert à générer les variantes -light/-dark au survol.
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
