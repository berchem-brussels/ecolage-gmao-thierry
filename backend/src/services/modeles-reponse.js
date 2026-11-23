/**
 * Modèles de réponse au demandeur (cahier des charges GES-09 ; version 0.15.0, étape 10, point 4).
 *   1. Par entité, en FR et en NL : un titre (100 caractères) et un texte (4 000). Le texte peut porter les variables
 *      du catalogue (config/modeles-reponse.json) : {numero}, {lieu}, {etat}, {prenom} ; toute autre accolade nommée
 *      est refusée (409 MODELE_VARIABLE, avec la variable fautive). L'écran remplace les variables à l'insertion, dans
 *      la langue du demandeur ; le service relit et modifie le texte avant l'envoi.
 *   2. Lecture : le service technique de l'entité (« demandes:traiter ») et le responsable (« parametres:gerer »).
 *      Écriture : le responsable (« parametres:gerer »). Cloison : l'entité active seule (SEC-01).
 *   3. Aucune suppression : DELETE désactive avec un motif ; PUT is_active = 1 réactive. Journal : création, champs
 *      changés (changements()), désactivation avec son motif. Trace « Modifié le … par … » sur la fiche (0.4.1).
 *   4. Modèles livrés (D-11) : créés pour chaque entité active si leur code manque, jamais recréés ni réactivés.
 */
const fs = require('fs');
const path = require('path');
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit, changements } = require('../audit');
const { assertActif } = require('../modules');
const { rolesWith } = require('../roles');
const { avecTrace } = require('./trace');

const CATALOGUE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'modeles-reponse.json'), 'utf8'));
const VARIABLES = CATALOGUE.variables;
const COLUMNS = `id, entite_id, code, titre_fr, titre_nl, texte_fr, texte_nl, ordre, is_active, motif_desactivation,
  created_by, updated_by, created_at, updated_at`;

const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}
function lecteur(user) {
  entiteActive(user);
  if (!peut(user, 'demandes:traiter') && !peut(user, 'parametres:gerer')) throw new AppError(403, 'FORBIDDEN');
}
function gestion(user) {
  entiteActive(user);
  if (!peut(user, 'parametres:gerer')) throw new AppError(403, 'FORBIDDEN');
  assertActif('demandes');
}

/** Règle 1 : variables admises seulement ; rend la première variable inconnue d'un des textes, ou null. */
function variableInconnue(...textes) {
  for (const t of textes) {
    for (const m of String(t || '').matchAll(/\{([^{}\s]{1,40})\}/g)) if (!VARIABLES.includes(m[1])) return m[1];
  }
  return null;
}
function controlerTextes(data) {
  const v = variableInconnue(data.texte_fr, data.texte_nl, data.titre_fr, data.titre_nl);
  if (v) {
    const admises = VARIABLES.map((x) => `{${x}}`).join(', ');
    throw new AppError(409, 'MODELE_VARIABLE', [`{${v}}`], {
      fr: `Variable inconnue dans le modèle : {${v}}. Variables admises : ${admises}.`,
      nl: `Onbekende variabele in het model: {${v}}. Toegelaten variabelen: ${admises}.`,
    });
  }
}

/** Charge un modèle de l'entité active : 404 inconnu, 403 autre entité. */
function load(user, id) {
  const m = getDb().prepare(`SELECT ${COLUMNS} FROM modeles_reponse WHERE id = ?`).get(id);
  if (!m) throw new AppError(404, 'NOT_FOUND');
  if (m.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  return m;
}
const fiche = (user, m) => avecTrace(user, m);

function list(user, { limit = 50, offset = 0, q, is_active: actif } = {}) {
  lecteur(user);
  const where = ['entite_id = ?'];
  const params = [user.entiteId];
  if (actif !== undefined) { where.push('is_active = ?'); params.push(actif); }
  if (q) { where.push('(titre_fr LIKE ? OR titre_nl LIKE ? OR texte_fr LIKE ? OR texte_nl LIKE ?)'); params.push(...Array(4).fill(`%${q}%`)); }
  const clause = `WHERE ${where.join(' AND ')}`;
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM modeles_reponse ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} FROM modeles_reponse ${clause} ORDER BY is_active DESC, ordre, titre_fr LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows: rows.map((m) => fiche(user, m)), pagination: { total, limit, offset }, variables: VARIABLES };
}

function get(user, id) {
  lecteur(user);
  return fiche(user, load(user, id));
}

function create(user, data, channel = 'api') {
  gestion(user);
  controlerTextes(data);
  const db = getDb();
  const entiteId = user.entiteId;
  const ordre = data.ordre ?? db.prepare('SELECT COALESCE(MAX(ordre), 0) + 10 AS o FROM modeles_reponse WHERE entite_id = ?').get(entiteId).o;
  const r = db.prepare(`INSERT INTO modeles_reponse (entite_id, titre_fr, titre_nl, texte_fr, texte_nl, ordre, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(entiteId, data.titre_fr, data.titre_nl, data.texte_fr, data.texte_nl, ordre, user.id, user.id);
  logAudit(user.id, 'modele_reponse.create', 'modele_reponse', r.lastInsertRowid, { titre_fr: data.titre_fr }, channel, entiteId);
  return fiche(user, load(user, r.lastInsertRowid));
}

function update(user, id, data, channel = 'api') {
  gestion(user);
  load(user, id);
  controlerTextes(data);
  // Journal (0.4.1) : seuls les champs changés, avec l'ancienne et la nouvelle valeur ; rien n'est écrit sans changement.
  const diff = changements('modeles_reponse', id, data);
  if (diff) {
    const { sets, params } = safeBuildUpdate(diff.apres, ['id']);
    if (diff.apres.is_active === 1) sets.push('motif_desactivation = NULL');
    getDb().prepare(`UPDATE modeles_reponse SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, id);
    logAudit(user.id, 'modele_reponse.update', 'modele_reponse', id, diff, channel, user.entiteId);
  }
  return fiche(user, load(user, id));
}

/** DELETE = désactivation avec motif : le modèle n'est plus proposé ; les messages déjà envoyés ne changent pas. */
function deactivate(user, id, motif, channel = 'api') {
  gestion(user);
  const m = load(user, id);
  if (!m.is_active) throw new AppError(409, 'CANCELLED');
  getDb().prepare("UPDATE modeles_reponse SET is_active = 0, motif_desactivation = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(motif, user.id, id);
  logAudit(user.id, 'modele_reponse.deactivate', 'modele_reponse', id, { motif }, channel, user.entiteId);
  return fiche(user, load(user, id));
}

/** Résumé avant la désactivation par le MCP (deux appels). */
function resumeDesactivation(user, id, motif) {
  gestion(user);
  const m = load(user, id);
  if (!m.is_active) throw new AppError(409, 'CANCELLED');
  return { action: 'deactivate_modele_reponse', modele: { id: m.id, titre_fr: m.titre_fr, titre_nl: m.titre_nl }, motif };
}

/** Règle 4 : modèles livrés d'une entité, créés si leur code manque. */
function seedEntite(entiteId) {
  const db = getDb();
  CATALOGUE.defauts.forEach((d, i) => {
    if (db.prepare('SELECT 1 FROM modeles_reponse WHERE entite_id = ? AND code = ?').get(entiteId, d.code)) return;
    db.prepare('INSERT INTO modeles_reponse (entite_id, code, titre_fr, titre_nl, texte_fr, texte_nl, ordre) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(entiteId, d.code, d.titre_fr, d.titre_nl, d.texte_fr, d.texte_nl, (i + 1) * 10);
  });
}

function seedAll() {
  for (const e of getDb().prepare('SELECT id FROM entites WHERE is_active = 1').all()) seedEntite(e.id);
}

module.exports = { VARIABLES, list, get, create, update, deactivate, resumeDesactivation, seedEntite, seedAll, variableInconnue };
