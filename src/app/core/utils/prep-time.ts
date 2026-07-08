export interface PrepTimeLine {
  duration: number;
  quantity: number;
}

// Estimation de la durée de préparation d'une commande complète. Ce n'est pas une
// simple somme : plusieurs cuisiniers travaillent en parallèle sur des plats différents,
// donc le total doit tendre vers la durée du plat le plus long, tout en étant tiré vers
// le haut par les autres plats (coordination, dressage, un seul four/plaque à partager…).
//
// Chaque ligne est d'abord pondérée par sa quantité avec un rendement décroissant
// (préparer 4 portions du même plat prend plus de temps qu'une seule, mais pas 4 fois plus) :
//   effectif = durée × √quantité
//
// Le total est ensuite la moyenne généralisée d'ordre p=4 des durées effectives — une
// moyenne qui se rapproche du maximum à mesure que p augmente, sans jamais l'atteindre
// tout à fait (contrairement au max pur, qui ignorerait complètement les autres plats).
const CONCURRENCY_EXPONENT = 4;

export function estimatePrepMinutes(lines: PrepTimeLine[]): number {
  const valid = lines.filter(l => l.duration > 0 && l.quantity > 0);
  if (!valid.length) return 0;

  const effective = valid.map(l => l.duration * Math.sqrt(l.quantity));
  const sumPow = effective.reduce((s, d) => s + d ** CONCURRENCY_EXPONENT, 0);
  const mean = Math.round((sumPow / effective.length) ** (1 / CONCURRENCY_EXPONENT));

  return mean;
}
