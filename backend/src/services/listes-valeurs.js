/**
 * Listes de valeurs par entité (cahier des charges REF-08, LNG-02 ; standard v3.2, section 11.3, niveau Métier).
 * Première liste : les types de lieux. Les listes admises, leurs valeurs livrées et la permission qui les écrit
 * viennent de config/listes-valeurs.json ; ajouter une liste ne demande ni migration ni nouvelle route.
 * Lecture : toute personne qui a un rôle dans l'entité active. Écriture : rôle qui porte la permission de la liste.
 * Une valeur ne se supprime pas : DELETE la désactive avec un motif, les lieux qui l'utilisent la gardent.
 * Cloison : une valeur n'est lue et écrite que dans l'entité active (SEC-01).
 */
const fs = require('fs');
const path = require('path');
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit, changements } = require('../audit');
const { rolesWith } = require('../roles');

const CATALOGUE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'listes-valeurs.json'), 'utf8')).listes;
const LISTES = Object.keys(CATALOGUE);

const COLUMNS = 'id, entite_id, liste, code, libelle_fr, libelle_nl, ordre, is_active, motif_desactivation, created_at, updated_at';

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}

function gestion(user, liste) {
  entiteActive(user);
  const roles = rolesWith(CATALOGUE[liste].gestion);
  if (!user.roles.some((r) => roles.includes(r))) throw new AppError(403, 'FORBIDDEN');
}

/** Charge une valeur et vérifie qu'elle appartient à l'entité active : sinon 403, même si elle existe ailleurs. */
function load(user, id) {
  const v = getDb().prepare(`SELECT ${COLUMNS} FROM listes_valeurs WHERE id = ?`).get(id);
  if (!v) throw new AppError(404, 'NOT_FOUND');
  if (v.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  return v;
}

function list(user, { limit = 50, offset = 0, q, liste, is_active } = {}) {
  const where = ['entite_id = ?'];
  const params = [entiteActive(user)];
  if (liste) { where.push('liste = ?'); params.push(liste); }
  if (is_active !== undefined) { where.push('is_active = ?'); params.push(is_active); }
  if (q) { where.push('(code LIKE ? OR libelle_fr LIKE ? OR libelle_nl LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const clause = `WHERE ${where.join(' AND ')}`;
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM listes_valeurs ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} FROM listes_valeurs ${clause} ORDER BY liste, ordre, libelle_fr LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows, pagination: { total, limit, offset } };
}

function get(user, id) {
  return load(user, id);
}

function create(user, data, channel = 'api') {
  gestion(user, data.liste);
  const db = getDb();
  const entiteId = user.entiteId;
  if (db.prepare('SELECT 1 FROM listes_valeurs WHERE entite_id = ? AND liste = ? AND code = ?').get(entiteId, data.liste, data.code)) {
    throw new AppError(409, 'VALEUR_DUPLICATE');
  }
  const ordre = data.ordre !== undefined ? data.ordre
    : (db.prepare('SELECT COALESCE(MAX(ordre), 0) + 10 AS o FROM listes_valeurs WHERE entite_id = ? AND liste = ?').get(entiteId, data.liste).o);
  const r = db.prepare(`INSERT INTO listes_valeurs (entite_id, liste, code, libelle_fr, libelle_nl, ordre, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(entiteId, data.liste, data.code, data.libelle_fr, data.libelle_nl, ordre, user.id, user.id);
  logAudit(user.id, 'valeur.create', 'liste_valeur', r.lastInsertRowid, { liste: data.liste, code: data.code }, channel, user.entiteId);
  return load(user, r.lastInsertRowid);
}

function update(user, id, data, channel = 'api') {
  const v = load(user, id);
  gestion(user, v.liste);
  // Journal (0.4.1) : seuls les champs changés, avec l'ancienne et la nouvelle valeur ; rien n'est écrit sans changement.
  const diff = changements('listes_valeurs', id, data);
  if (diff) {
    const { sets, params } = safeBuildUpdate(diff.apres, ['id']);
    if (diff.apres.is_active === 1) sets.push('motif_desactivation = NULL');
    getDb().prepare(`UPDATE listes_valeurs SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, id);
    logAudit(user.id, 'valeur.update', 'liste_valeur', id, { liste: v.liste, code: v.code, ...diff }, channel, user.entiteId);
  }
  return load(user, id);
}

/** DELETE = désactivation avec motif : la valeur ne se propose plus, les lieux qui la portent la gardent. */
function deactivate(user, id, motif, channel = 'api') {
  const v = load(user, id);
  gestion(user, v.liste);
  if (!v.is_active) throw new AppError(409, 'CANCELLED');
  getDb().prepare("UPDATE listes_valeurs SET is_active = 0, motif_desactivation = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(motif, user.id, id);
  logAudit(user.id, 'valeur.deactivate', 'liste_valeur', id, { motif }, channel, user.entiteId);
  return load(user, id);
}

/**
 * Valeur utilisable par un lieu de l'entité : de la bonne liste, de la même entité, active.
 * Une valeur déjà portée par l'objet reste admise même désactivée (la fiche se réenregistre sans être bloquée).
 */
function assertUsable(entiteId, liste, id, current) {
  const v = getDb().prepare('SELECT entite_id, liste, is_active FROM listes_valeurs WHERE id = ?').get(id);
  if (!v || v.entite_id !== entiteId || v.liste !== liste) throw new AppError(409, 'VALEUR_INVALIDE');
  if (!v.is_active && id !== current) throw new AppError(409, 'VALEUR_INVALIDE');
}

/** Valeurs livrées d'une entité : créées si leur code manque, jamais réactivées ni modifiées. */
function seedEntite(entiteId) {
  const db = getDb();
  for (const liste of LISTES) {
    CATALOGUE[liste].defauts.forEach((d, i) => {
      if (db.prepare('SELECT 1 FROM listes_valeurs WHERE entite_id = ? AND liste = ? AND code = ?').get(entiteId, liste, d.code)) return;
      db.prepare('INSERT INTO listes_valeurs (entite_id, liste, code, libelle_fr, libelle_nl, ordre) VALUES (?, ?, ?, ?, ?, ?)')
        .run(entiteId, liste, d.code, d.libelle_fr, d.libelle_nl, (i + 1) * 10);
    });
  }
}

function seedAll() {
  for (const e of getDb().prepare('SELECT id FROM entites WHERE is_active = 1').all()) seedEntite(e.id);
}

module.exports = { LISTES, gestion, list, get, create, update, deactivate, assertUsable, seedEntite, seedAll };
