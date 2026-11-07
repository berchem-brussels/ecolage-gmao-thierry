/**
 * Refus d'un réglage (0.12.0, remarque R2 de la recette de la 0.11.0, DV-109).
 *
 * Un réglage refusé disait seulement « Données invalides ». Le refus nomme maintenant le réglage (son libellé dans la
 * langue de l'écran) et ce qui ne va pas dans la valeur, en FR et en NL. Le code reste VALIDATION et le détail garde sa
 * forme (« valeur: motif »), pour l'API, le MCP et les tests existants.
 */
const { AppError } = require('../envelope');

/** Lève le refus du réglage p avec le motif en français et en néerlandais. */
function refuser(p, fr, nl) {
  throw new AppError(400, 'VALIDATION', [`valeur: ${fr}`], {
    fr: `Valeur refusée pour « ${p.libelle_fr} » : ${fr}.`,
    nl: `Waarde geweigerd voor "${p.libelle_nl}": ${nl}.`,
  });
}

module.exports = { refuser };
