/**
 * Trace d'une fiche du référentiel des demandes (version 0.4.1, DV-04) : qui l'a créée, modifiée ou rétablie, et quand.
 * Affichée sous la forme « Modifié le JJ/MM/AAAA à HH:MM par <nom> » sur les fiches de catégorie, de priorité, de jour
 * de l'horaire, de congé et de fermeture ; « Valeur livrée » si la fiche n'a jamais été touchée.
 *
 * États :
 *   livree    fiche créée par le serveur (valeurs livrées), jamais modifiée : ni date ni nom ;
 *   creee     fiche créée à l'écran ou par l'API, jamais modifiée depuis : date et auteur de la création ;
 *   modifiee  dernière modification : date et auteur ;
 *   retablie  priorité ou jour de l'horaire revenu aux valeurs livrées après une intervention : date et auteur.
 *
 * Le nom n'est rendu qu'à une personne qui a un rôle dans l'entité de la fiche (contrôle serveur, API et MCP compris) ;
 * sinon seule la date est rendue. Les dates sont en UTC (ISO 8601) ; l'écran les affiche à l'heure de Bruxelles.
 */
const { getDb } = require('../database');

const iso = (s) => (s ? `${String(s).replace(' ', 'T')}Z` : null);

function nomDe(id) {
  const u = getDb().prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(id);
  return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || null : null;
}

/** Une personne de l'entité de la fiche : son entité active est celle de la fiche et elle y a au moins un rôle. */
function voitLeNom(user, entiteId) {
  return !!user && !!user.entiteId && user.entiteId === entiteId && Array.isArray(user.roles) && user.roles.length > 0;
}

/**
 * Calcule la trace d'une ligne qui porte entite_id, updated_by, updated_at et, pour les fiches qu'on peut créer
 * (catégories, jours non ouvrés), created_by et created_at. estDefaut : la fiche porte les valeurs livrées
 * (priorités et horaire, qui ont un retour à la valeur livrée).
 */
function trace(user, l, { estDefaut = false } = {}) {
  const voit = voitLeNom(user, l.entite_id);
  const avec = (etat, par, le) => ({ etat, le: iso(le), par: voit && par ? nomDe(par) : null });
  if (l.created_by) {
    const jamaisModifiee = !l.updated_by || (l.updated_by === l.created_by && l.updated_at <= l.created_at);
    return jamaisModifiee ? avec('creee', l.created_by, l.created_at) : avec('modifiee', l.updated_by, l.updated_at);
  }
  if (!l.updated_by) return { etat: 'livree', le: null, par: null };
  return estDefaut ? avec('retablie', l.updated_by, l.updated_at) : avec('modifiee', l.updated_by, l.updated_at);
}

/** Ajoute la trace à une fiche, sans rendre les identifiants internes des auteurs. */
function avecTrace(user, l, opts) {
  if (!l) return l;
  const { created_by: _c, updated_by: _u, ...reste } = l;
  return { ...reste, trace: trace(user, l, opts) };
}

module.exports = { trace, avecTrace, voitLeNom };
