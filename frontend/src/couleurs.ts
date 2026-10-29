/**
 * Rouge des messages d'erreur (écart E-26, décision de Renaud du 28/10/2026 : l'accessibilité prime ; version 0.7.0).
 * Le rouge par défaut d'Ant Design n'atteignait qu'environ 3,3:1 sur fond blanc. Les rouges ci-dessous
 * atteignent au moins 4,5:1 (texte courant, WCAG 2.1 AA) sur tous les fonds de l'application, en clair et en sombre ;
 * test/couleurs.test.ts le contrôle à partir du thème réel (buildTheme).
 *   clair  : #cf1322 sur blanc, #f6f6f6 et #f0f0f0 ; texte blanc des boutons de danger pleins ;
 *   sombre : graine #ff8a8a ; l'algorithme sombre d'Ant Design en tire #dc7878 pour les messages sous les champs
 *            (5:1 au moins sur #1f1f1f, #141414 et #262626) et garde #ff8a8a pour le texte en danger ; texte foncé
 *            (#141414) des boutons de danger pleins, sur lesquels le blanc n'atteindrait pas 4,5:1.
 * Le contrôle porte sur les jetons calculés par Ant Design (theme.getDesignToken), pas sur la graine.
 */
export const ROUGE_ERREUR = { clair: '#cf1322', sombre: '#ff8a8a' };
export const TEXTE_BOUTON_DANGER = { clair: '#ffffff', sombre: '#141414' };

/** Fonds sur lesquels un message d'erreur peut paraître, par thème. */
export const FONDS = { clair: ['#ffffff', '#f6f6f6', '#f0f0f0'], sombre: ['#1f1f1f', '#141414', '#262626'] };

/** Luminance relative (WCAG 2.1) d'une couleur #rrggbb. */
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Rapport de contraste WCAG entre deux couleurs #rrggbb, de 1 à 21. */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
