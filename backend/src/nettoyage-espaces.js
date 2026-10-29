/**
 * Nettoyage unique des textes déjà en base (migration 005, DV-37 et DV-47) : espaces de début et de fin
 * retirés des codes, libellés, noms, adresses et valeurs de paramètres enregistrés avant la 0.5.0. Les mots de passe
 * (empreintes) ne sont jamais lus. Depuis la 0.5.0, toute saisie est nettoyée à l'entrée (validation.js, nettoyer()).
 * - Une colonne à la fois, par une requête constante : aucun nom de table ni de colonne n'est interpolé.
 * - Une valeur qui deviendrait vide ou qui heurterait une contrainte d'unicité (« bureau » et « bureau » suivi d'une
 *   espace dans la même entité) n'est pas touchée : la migration continue et le cas est écrit dans le journal du
 *   conteneur ([DB] ...), à corriger à l'écran.
 * - Chaque fiche corrigée s'inscrit au journal d'audit (action systeme.espaces, canal cli, sans auteur) avec les seuls
 *   champs changés. La mention « Modifié le … par … » de la fiche n'est pas touchée : ce n'est pas une modification
 *   faite par une personne.
 * Rejouable : une seconde passe ne trouve plus rien.
 */
const { logAudit } = require('./audit');

// Colonnes facultatives : une valeur faite seulement d'espaces y devient vide. Ailleurs, elle est laissée et signalée.
const FACULTATIVES = new Set(['adresse', 'code_postal', 'commune', 'description_fr', 'description_nl', 'valeur', 'value']);

const CIBLES = [
  { table: 'entites', lire: 'SELECT id, id AS entite_id, code, nom_fr, nom_nl FROM entites', colonnes: {
    code: 'UPDATE entites SET code = ? WHERE id = ?',
    nom_fr: 'UPDATE entites SET nom_fr = ? WHERE id = ?',
    nom_nl: 'UPDATE entites SET nom_nl = ? WHERE id = ?' } },
  { table: 'users', lire: 'SELECT id, entite_id, email, first_name, last_name FROM users', colonnes: {
    email: 'UPDATE users SET email = ? WHERE id = ?',
    first_name: 'UPDATE users SET first_name = ? WHERE id = ?',
    last_name: 'UPDATE users SET last_name = ? WHERE id = ?' } },
  { table: 'listes_valeurs', lire: 'SELECT id, entite_id, code, libelle_fr, libelle_nl FROM listes_valeurs', colonnes: {
    code: 'UPDATE listes_valeurs SET code = ? WHERE id = ?',
    libelle_fr: 'UPDATE listes_valeurs SET libelle_fr = ? WHERE id = ?',
    libelle_nl: 'UPDATE listes_valeurs SET libelle_nl = ? WHERE id = ?' } },
  { table: 'lieux', lire: 'SELECT id, entite_id, code, nom_fr, nom_nl, adresse, code_postal, commune FROM lieux', colonnes: {
    code: 'UPDATE lieux SET code = ? WHERE id = ?',
    nom_fr: 'UPDATE lieux SET nom_fr = ? WHERE id = ?',
    nom_nl: 'UPDATE lieux SET nom_nl = ? WHERE id = ?',
    adresse: 'UPDATE lieux SET adresse = ? WHERE id = ?',
    code_postal: 'UPDATE lieux SET code_postal = ? WHERE id = ?',
    commune: 'UPDATE lieux SET commune = ? WHERE id = ?' } },
  { table: 'categories', lire: 'SELECT id, entite_id, code, libelle_fr, libelle_nl FROM categories', colonnes: {
    code: 'UPDATE categories SET code = ? WHERE id = ?',
    libelle_fr: 'UPDATE categories SET libelle_fr = ? WHERE id = ?',
    libelle_nl: 'UPDATE categories SET libelle_nl = ? WHERE id = ?' } },
  { table: 'priorites', lire: 'SELECT id, entite_id, libelle_fr, libelle_nl, description_fr, description_nl FROM priorites', colonnes: {
    libelle_fr: 'UPDATE priorites SET libelle_fr = ? WHERE id = ?',
    libelle_nl: 'UPDATE priorites SET libelle_nl = ? WHERE id = ?',
    description_fr: 'UPDATE priorites SET description_fr = ? WHERE id = ?',
    description_nl: 'UPDATE priorites SET description_nl = ? WHERE id = ?' } },
  { table: 'jours_non_ouvres', lire: 'SELECT id, entite_id, libelle_fr, libelle_nl FROM jours_non_ouvres', colonnes: {
    libelle_fr: 'UPDATE jours_non_ouvres SET libelle_fr = ? WHERE id = ?',
    libelle_nl: 'UPDATE jours_non_ouvres SET libelle_nl = ? WHERE id = ?' } },
  { table: 'parametres_entite', lire: 'SELECT id, entite_id, valeur FROM parametres_entite', colonnes: {
    valeur: 'UPDATE parametres_entite SET valeur = ? WHERE id = ?' } },
  // Paramètres de l'instance (identité, affichage) : clés « app.* » seulement ; l'état des modules n'est pas du texte saisi.
  { table: 'app_settings', lire: "SELECT key AS id, NULL AS entite_id, value FROM app_settings WHERE key LIKE 'app.%'", colonnes: {
    value: 'UPDATE app_settings SET value = ? WHERE key = ?' } },
];

/** Rend { corriges, bloques } : nombre de fiches corrigées et liste des valeurs laissées telles quelles. */
function nettoyerBase(db) {
  let corriges = 0;
  const bloques = [];
  for (const c of CIBLES) {
    for (const ligne of db.prepare(c.lire).all()) {
      const avant = {};
      const apres = {};
      for (const [col, maj] of Object.entries(c.colonnes)) {
        const v = ligne[col];
        if (typeof v !== 'string' || v === v.trim()) continue;
        const propre = v.trim();
        if (!propre && !FACULTATIVES.has(col)) {
          bloques.push({ table: c.table, id: ligne.id, colonne: col, raison: 'vide' });
          continue;
        }
        try {
          db.prepare(maj).run(propre, ligne.id);
          avant[col] = v;
          apres[col] = propre;
        } catch (e) {
          bloques.push({ table: c.table, id: ligne.id, colonne: col, raison: e.message });
        }
      }
      if (Object.keys(apres).length) {
        corriges += 1;
        const id = typeof ligne.id === 'number' ? ligne.id : null;
        const details = { avant, apres, ...(id === null && { cle: ligne.id }) };
        logAudit(null, 'systeme.espaces', c.table, id, details, 'cli', ligne.entite_id);
      }
    }
  }
  for (const b of bloques) {
    console.warn(`[DB] Espaces non retirés : ${b.table} ${b.id}, ${b.colonne} (${b.raison}) ; à corriger à l'écran`);
  }
  if (corriges) console.log(`[DB] Espaces retirés sur ${corriges} fiche(s), voir le journal d'audit (systeme.espaces)`);
  return { corriges, bloques };
}

module.exports = { nettoyerBase, CIBLES };
