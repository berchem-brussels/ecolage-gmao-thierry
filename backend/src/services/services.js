/**
 * Services des entités et leur valideur (cahier des charges ROL-04, DEM-15 ; version 0.16.0, étape 11, point 1).
 *   1. Un service appartient à une entité : code (unique dans l'entité), nom FR et NL, ordre. L'administrateur les règle
 *      (« services:gerer ») pour toute l'instance, comme les comptes ; aucun rôle métier ne les lit (lecture par
 *      l'administrateur seul ; le valideur voit ses demandes, pas la table).
 *   2. Valideur (chef de service) : un compte actif qui a, dans l'entité du service, un rôle portant « demandes:valider »
 *      (rôle « Valideur » livré) ; sinon 409 VALIDEUR_SANS_ROLE. Le chef de service se lit dans cette table (ROL-04 :
 *      la lecture de l'attribut « manager » d'Entra ID ou de SAGA n'est pas faite, écart E-47).
 *   3. Suppléant : un autre compte qui remplit la même condition, pour une période (du … au …, dates de Bruxelles,
 *      incluses) ; les trois champs vont ensemble (409 SUPPLEANT_PERIODE). Pendant la période, le suppléant valide aussi ;
 *      le titulaire garde le droit (une absence plus courte que prévu ne bloque rien).
 *   4. Membres : chaque compte peut être rattaché à un service actif de son entité de rattachement (users.service_id ;
 *      409 SERVICE_AUTRE_ENTITE sinon). Le service du demandeur est noté sur la demande au dépôt.
 *   5. Aucune suppression : DELETE désactive avec un motif ; un service désactivé ne reçoit plus de membre et ne fait
 *      plus valider (ses demandes déjà « En validation » restent chez le valideur). PUT is_active = 1 réactive.
 *   6. Journal : création, champs changés (changements()), désactivation avec son motif ; trace sur la fiche.
 */
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit, changements } = require('../audit');
const { rolesWith } = require('../roles');
const { avecTrace } = require('./trace');

const COLUMNS = `s.id, s.entite_id, s.code, s.nom_fr, s.nom_nl, s.valideur_id, s.suppleant_id, s.suppleant_du, s.suppleant_au, s.ordre,
  s.is_active, s.motif_desactivation, s.is_demo, s.created_by, s.updated_by, s.created_at, s.updated_at,
  v.first_name AS valideur_prenom, v.last_name AS valideur_nom, p.first_name AS suppleant_prenom, p.last_name AS suppleant_nom,
  (SELECT COUNT(*) FROM users m WHERE m.service_id = s.id AND m.is_active = 1) AS nb_membres`;
const FROM = 'FROM services s LEFT JOIN users v ON v.id = s.valideur_id LEFT JOIN users p ON p.id = s.suppleant_id';

function admin(user) {
  if (!user || user.role !== 'admin') throw new AppError(403, 'FORBIDDEN');
}

/** Jour de Bruxelles (AAAA-MM-JJ) d'un instant. */
const jourBruxelles = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(date);

function row(id) {
  return getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE s.id = ?`).get(id);
}

function load(id) {
  const s = row(id);
  if (!s) throw new AppError(404, 'NOT_FOUND');
  return s;
}

/** Fiche rendue : trace de modification et suppléance en cours aujourd'hui. */
function fiche(user, s) {
  const jour = jourBruxelles();
  return { ...avecTrace(user, s), suppleance_en_cours: s.suppleant_id && s.suppleant_du <= jour && jour <= s.suppleant_au ? 1 : 0 };
}

/** Règle 2 : compte actif avec un rôle « demandes:valider » dans l'entité du service. */
function peutValiderDans(userId, entiteId) {
  const roles = rolesWith('demandes:valider');
  if (!roles.length) return false;
  const inQ = roles.map(() => '?').join(', ');
  return !!getDb().prepare(`SELECT 1 FROM user_roles r JOIN users u ON u.id = r.user_id
    WHERE r.user_id = ? AND r.entite_id = ? AND r.is_active = 1 AND u.is_active = 1 AND r.role IN (${inQ})`)
    .get(userId, entiteId, ...roles);
}

/** Règles 2 et 3 sur l'état final du service (après fusion avec les valeurs en base). */
function controler(entiteId, f) {
  for (const champ of ['valideur_id', 'suppleant_id']) {
    if (f[champ] && !peutValiderDans(f[champ], entiteId)) {
      throw new AppError(409, 'VALIDEUR_SANS_ROLE', { champ });
    }
  }
  const periode = [f.suppleant_id, f.suppleant_du, f.suppleant_au];
  if (periode.some((x) => x) && !periode.every((x) => x)) throw new AppError(409, 'SUPPLEANT_PERIODE');
  if (f.suppleant_du && f.suppleant_du > f.suppleant_au) throw new AppError(409, 'SUPPLEANT_PERIODE');
  if (f.suppleant_id && !f.valideur_id) throw new AppError(409, 'SUPPLEANT_SANS_VALIDEUR');
  if (f.suppleant_id && f.suppleant_id === f.valideur_id) throw new AppError(409, 'SUPPLEANT_EGAL_VALIDEUR');
}

function codeLibre(entiteId, code, saufId = 0) {
  if (getDb().prepare('SELECT 1 FROM services WHERE entite_id = ? AND code = ? AND id <> ?').get(entiteId, code, saufId)) {
    throw new AppError(409, 'SERVICE_CODE_EXISTE');
  }
}

function list(user, { limit = 50, offset = 0, entite_id: entiteId, is_active: actif, q } = {}) {
  admin(user);
  const where = [];
  const params = [];
  if (entiteId) { where.push('s.entite_id = ?'); params.push(entiteId); }
  if (actif !== undefined) { where.push('s.is_active = ?'); params.push(actif); }
  if (q) { where.push('(s.code LIKE ? OR s.nom_fr LIKE ? OR s.nom_nl LIKE ?)'); params.push(...Array(3).fill(`%${q}%`)); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM services s ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} ${FROM} ${clause} ORDER BY s.entite_id, s.is_active DESC, s.ordre, s.nom_fr LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { rows: rows.map((s) => fiche(user, s)), pagination: { total, limit, offset } };
}

function get(user, id) {
  admin(user);
  return fiche(user, load(id));
}

function create(user, data, channel = 'api') {
  admin(user);
  const e = getDb().prepare('SELECT is_active FROM entites WHERE id = ?').get(data.entite_id);
  if (!e) throw new AppError(400, 'ENTITE_REQUIRED');
  if (!e.is_active) throw new AppError(409, 'ENTITE_INACTIVE');
  codeLibre(data.entite_id, data.code);
  const f = { valideur_id: data.valideur_id || null, suppleant_id: data.suppleant_id || null, suppleant_du: data.suppleant_du || null, suppleant_au: data.suppleant_au || null };
  controler(data.entite_id, f);
  const db = getDb();
  const ordre = data.ordre ?? db.prepare('SELECT COALESCE(MAX(ordre), 0) + 10 AS o FROM services WHERE entite_id = ?').get(data.entite_id).o;
  const r = db.prepare(`INSERT INTO services (entite_id, code, nom_fr, nom_nl, valideur_id, suppleant_id, suppleant_du, suppleant_au, ordre, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(data.entite_id, data.code, data.nom_fr, data.nom_nl, f.valideur_id, f.suppleant_id, f.suppleant_du, f.suppleant_au, ordre, user.id, user.id);
  logAudit(user.id, 'service.create', 'service', r.lastInsertRowid,
    { code: data.code, nom_fr: data.nom_fr, valideur_id: f.valideur_id, suppleant_id: f.suppleant_id, suppleant_du: f.suppleant_du, suppleant_au: f.suppleant_au },
    channel, data.entite_id);
  return fiche(user, load(r.lastInsertRowid));
}

function update(user, id, data, channel = 'api') {
  admin(user);
  const s = load(id);
  if (data.code !== undefined) codeLibre(s.entite_id, data.code, id);
  const final = {};
  for (const k of ['valideur_id', 'suppleant_id', 'suppleant_du', 'suppleant_au']) final[k] = data[k] !== undefined ? data[k] : s[k];
  // Retirer le suppléant retire sa période.
  if (data.suppleant_id === null) { final.suppleant_du = null; final.suppleant_au = null; data = { ...data, suppleant_du: null, suppleant_au: null }; }
  controler(s.entite_id, final);
  const diff = changements('services', id, data);
  if (diff) {
    const { sets, params } = safeBuildUpdate(diff.apres, ['id']);
    if (diff.apres.is_active === 1) sets.push('motif_desactivation = NULL');
    getDb().prepare(`UPDATE services SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, id);
    logAudit(user.id, 'service.update', 'service', id, diff, channel, s.entite_id);
  }
  return fiche(user, load(id));
}

/** Règle 5 : désactivation avec motif ; les membres restent rattachés (le service ne fait plus valider). */
function deactivate(user, id, motif, channel = 'api') {
  admin(user);
  const s = load(id);
  if (!s.is_active) throw new AppError(409, 'CANCELLED');
  getDb().prepare("UPDATE services SET is_active = 0, motif_desactivation = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(motif, user.id, id);
  logAudit(user.id, 'service.deactivate', 'service', id, { code: s.code, motif }, channel, s.entite_id);
  return fiche(user, load(id));
}

function resumeDesactivation(user, id, motif) {
  admin(user);
  const s = load(id);
  if (!s.is_active) throw new AppError(409, 'CANCELLED');
  return { action: 'deactivate_service', service: { id: s.id, code: s.code, nom_fr: s.nom_fr, nom_nl: s.nom_nl, nb_membres: s.nb_membres }, motif };
}

/** Règle 4 : service donné à un compte, contrôlé (actif, de l'entité de rattachement du compte). */
function controlerMembre(entiteId, serviceId) {
  if (!serviceId) return;
  const s = getDb().prepare('SELECT entite_id, is_active FROM services WHERE id = ?').get(serviceId);
  if (!s) throw new AppError(409, 'SERVICE_INCONNU');
  if (s.entite_id !== entiteId) throw new AppError(409, 'SERVICE_AUTRE_ENTITE');
  if (!s.is_active) throw new AppError(409, 'SERVICE_INACTIF');
}

/**
 * Valideurs du service ce jour-là (règle 3) : le titulaire, et le suppléant pendant sa période ; chacun seulement s'il a
 * encore un rôle « demandes:valider » dans l'entité du service. Service inconnu ou désactivé : aucun.
 */
function valideurs(serviceId, date = new Date()) {
  if (!serviceId) return [];
  const s = getDb().prepare('SELECT entite_id, valideur_id, suppleant_id, suppleant_du, suppleant_au, is_active FROM services WHERE id = ?').get(serviceId);
  if (!s || !s.is_active) return [];
  const jour = jourBruxelles(date);
  const ids = [s.valideur_id];
  if (s.suppleant_id && s.suppleant_du <= jour && jour <= s.suppleant_au) ids.push(s.suppleant_id);
  return ids.filter((x) => x && peutValiderDans(x, s.entite_id));
}

/** Service d'un compte dans une entité : son service actif s'il est de cette entité, sinon null. */
function serviceDe(userId, entiteId) {
  const r = getDb().prepare(`SELECT s.id FROM users u JOIN services s ON s.id = u.service_id
    WHERE u.id = ? AND s.entite_id = ? AND s.is_active = 1`).get(userId, entiteId);
  return r ? r.id : null;
}

/** Services dont la personne valide aujourd'hui les demandes dans l'entité donnée (titulaire ou suppléant en période). */
function validesPar(userId, entiteId, date = new Date()) {
  const jour = jourBruxelles(date);
  const ids = getDb().prepare(`SELECT id FROM services WHERE entite_id = ? AND is_active = 1
    AND (valideur_id = ? OR (suppleant_id = ? AND suppleant_du <= ? AND ? <= suppleant_au))`).all(entiteId, userId, userId, jour, jour).map((r) => r.id);
  return peutValiderDans(userId, entiteId) ? ids : [];
}

module.exports = { list, get, create, update, deactivate, resumeDesactivation, controlerMembre, valideurs, serviceDe, validesPar, jourBruxelles };
