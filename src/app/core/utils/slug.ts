// Convertit un nom de restaurant en tag/slug d'URL : minuscules, accents retirés, tout
// caractère non alphanumérique (espaces compris) réduit à un seul tiret, pas de tiret en
// bord de chaîne. Utilisé partout où un restaurant est nommé (création super admin,
// formulaire "Réserver une démo") pour que le tag soit toujours dérivé de façon identique.
export function slugify(name: string): string {
  const stripped = name.toLowerCase().trim().normalize('NFD')
    .split('').filter(ch => (ch.codePointAt(0) ?? 0) < 0x0300 || (ch.codePointAt(0) ?? 0) > 0x036f).join('');
  return stripped.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
