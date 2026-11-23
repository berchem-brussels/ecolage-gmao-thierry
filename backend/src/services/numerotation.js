/**
 * Numérotation des dossiers par entité, par type et par année (cahier des charges NUM-01 à NUM-05 ; DV-44).
 * Format : {code de l'entité}-{code du type}-{année}-{rang sur 5 chiffres}, par exemple AC-DI-2026-00001. Le même
 * numéro sert en français et en néerlandais. Le code du type et le mode (remise annuelle ou numérotation continue) se
 * règlent par entité (config/parametres-entite.json, groupe « numerotation ») ; le code de l'entité est celui de
 * l'écran Entités.
 * - attribuer() s'appelle dans la transaction qui enregistre le dossier (NUM-04) : si l'enregistrement échoue, le
 *   compteur revient en arrière avec lui, sans trou. Un brouillon (étape 7) n'appellera pas attribuer().
 * - Deux compteurs sont tenus à jour à chaque attribution, celui de l'année et le compteur continu (annee = 0), chacun
 *   au moins égal au plus grand rang attribué : passer d'un mode à l'autre ne redonne jamais un numéro (NUM-05).
 * - L'année est celle de Bruxelles au moment de l'enregistrement (31/12 à 23:30 UTC = 1er janvier à Bruxelles).
 * - Dernier garde-fou : le numéro est unique par contrainte en base (demandes.numero UNIQUE).
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const parametresEntite = require('./parametres-entite');
const calendrier = require('./calendrier');

const TYPES = {
  demande: { parametre: 'numerotation.demande_type', existe: 'SELECT 1 FROM demandes WHERE numero = ? OR (entite_id = ? AND annee = ? AND sequence = ?)' },
};

const anneeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: calendrier.CATALOGUE.fuseau, year: 'numeric' });

/** Année civile à Bruxelles d'un instant. */
function anneeLocale(date = new Date()) {
  return Number(anneeFmt.format(date));
}

function compteur(db, entiteId, type, annee) {
  const row = db.prepare('SELECT dernier FROM sequences WHERE entite_id = ? AND type = ? AND annee = ?').get(entiteId, type, annee);
  if (row) return row.dernier;
  // Compteur continu créé après des attributions annuelles : il part du plus grand rang déjà donné.
  const depart = annee === 0
    ? (db.prepare('SELECT MAX(dernier) AS m FROM sequences WHERE entite_id = ? AND type = ?').get(entiteId, type).m || 0)
    : 0;
  db.prepare('INSERT INTO sequences (entite_id, type, annee, dernier) VALUES (?, ?, ?, ?)').run(entiteId, type, annee, depart);
  return depart;
}

// Le plus grand des deux se calcule ici et non en SQL (MAX à deux arguments n'existe pas en PostgreSQL, étape 43).
function porter(db, entiteId, type, annee, dernier, rang) {
  if (rang <= dernier) return;
  db.prepare("UPDATE sequences SET dernier = ?, updated_at = datetime('now') WHERE entite_id = ? AND type = ? AND annee = ?")
    .run(rang, entiteId, type, annee);
}

function formater(codeEntite, codeType, annee, rang) {
  return `${codeEntite}-${codeType}-${annee}-${String(rang).padStart(5, '0')}`;
}

/**
 * Attribue le numéro suivant. À appeler dans la transaction d'enregistrement du dossier.
 * Rend { numero, annee, sequence }.
 */
function attribuer(entiteId, type = 'demande', date = new Date()) {
  const t = TYPES[type];
  if (!t) throw new Error(`numérotation : type ${type} inconnu`);
  const db = getDb();
  const entite = db.prepare('SELECT code FROM entites WHERE id = ?').get(entiteId);
  if (!entite) throw new AppError(403, 'NO_ENTITE');
  const codeType = parametresEntite.valeur(entiteId, t.parametre);
  const continue_ = parametresEntite.valeur(entiteId, 'numerotation.remise') === 'continue';
  const annee = anneeLocale(date);
  const dernierAnnee = compteur(db, entiteId, type, annee);
  const dernierContinu = compteur(db, entiteId, type, 0);
  let rang = (continue_ ? dernierContinu : dernierAnnee) + 1;
  // Garde-fou : un numéro ou un rang de l'année déjà présent (reprise, code du type changé) est sauté, jamais redonné.
  while (db.prepare(t.existe).get(formater(entite.code, codeType, annee, rang), entiteId, annee, rang)) rang += 1;
  porter(db, entiteId, type, annee, dernierAnnee, rang);
  porter(db, entiteId, type, 0, dernierContinu, rang);
  return { numero: formater(entite.code, codeType, annee, rang), annee, sequence: rang };
}

module.exports = { attribuer, anneeLocale, formater, TYPES };
