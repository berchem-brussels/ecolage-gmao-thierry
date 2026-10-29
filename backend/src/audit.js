/**
 * Journal d'audit de toute écriture et de toute connexion (patron SAGA audit.js, canal ajouté).
 * entiteId (version 0.3.0) : entité concernée par l'action, pour le filtre de l'écran du journal ; null pour une
 * action d'instance (paramètres, modules, comptes, connexion).
 * changements() (version 0.4.1, DV-04) : seuls les champs modifiés, avec l'ancienne et la nouvelle valeur, comme pour
 * les priorités et l'horaire. Sert aux fiches de catégorie, de question de catégorie (0.7.0), de jour non ouvré, de lieu, de valeur de liste et
 * d'entité.
 */
const { getDb } = require('./database');

// Requêtes constantes, une par table prévue : aucun nom de table n'est interpolé (test statique de securite.test.js).
const LIGNE = {
  categories: 'SELECT * FROM categories WHERE id = ?',
  jours_non_ouvres: 'SELECT * FROM jours_non_ouvres WHERE id = ?',
  lieux: 'SELECT * FROM lieux WHERE id = ?',
  listes_valeurs: 'SELECT * FROM listes_valeurs WHERE id = ?',
  entites: 'SELECT * FROM entites WHERE id = ?',
  questions_categorie: 'SELECT * FROM questions_categorie WHERE id = ?',
};
const egal = (a, b) => (a ?? null) === (b ?? null);

/**
 * Compare les champs envoyés à la fiche en base (ligne brute de la table) : rend { avant, apres } pour les seuls champs
 * qui changent, ou null si rien ne change. Les clés qui ne sont pas des colonnes de la table sont ignorées.
 */
function changements(table, id, data) {
  if (!Object.prototype.hasOwnProperty.call(LIGNE, table)) throw new Error(`changements : table ${table} non prévue`);
  const ligne = getDb().prepare(LIGNE[table]).get(id);
  const avant = {};
  const apres = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id' || !ligne || !(k in ligne) || egal(ligne[k], v)) continue;
    avant[k] = ligne[k] ?? null;
    apres[k] = v ?? null;
  }
  return Object.keys(apres).length ? { avant, apres } : null;
}

function logAudit(userId, action, entityType, entityId, details, channel = 'api', entiteId = null) {
  try {
    getDb().prepare(`INSERT INTO audit_log (user_id, action, entity_type, entity_id, channel, details_json, entite_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(userId || null, action, entityType || null, entityId || null, channel,
      details ? JSON.stringify(details) : null, entiteId || null);
  } catch (e) {
    console.error('[AUDIT] Écriture impossible :', e.message);
  }
}

module.exports = { logAudit, changements };
