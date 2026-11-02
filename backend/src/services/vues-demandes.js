/**
 * Vues enregistrées de la liste du service technique (version 0.9.0 ; cahier des charges GES-02 ; DV-93).
 *   1. Une vue appartient à une personne et à une entité : un nom (60 caractères) et les filtres de la liste, contrôlés
 *      par le même schéma que la liste (schemas.js, vueFiltres). Personne d'autre ne la lit.
 *   2. Réservées au service technique (« demandes:entite ») : la liste du gestionnaire est le seul écran qui s'en sert.
 *   3. Vingt vues au plus par personne et par entité ; deux vues de la même personne dans la même entité ne portent
 *      pas le même nom (409 VUE_NOM_PRIS).
 *   4. Une vue d'une autre entité répond 403 ; la vue d'une autre personne de la même entité, 404 (son existence n'est
 *      pas révélée). La suppression est réelle : une vue est une préférence d'affichage, pas une donnée métier.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { rolesWith } = require('../roles');

const MAX_VUES = 20;
const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));
const COLUMNS = 'id, user_id, entite_id, nom, filtres, created_at, updated_at';

function controle(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  if (!peut(user, 'demandes:entite')) throw new AppError(403, 'FORBIDDEN');
  return user.entiteId;
}

const sortie = (v) => ({ ...v, filtres: JSON.parse(v.filtres) });

function charger(user, id) {
  const entiteId = controle(user);
  const v = getDb().prepare(`SELECT ${COLUMNS} FROM vues_demandes WHERE id = ?`).get(id);
  if (!v) throw new AppError(404, 'NOT_FOUND');
  if (v.entite_id !== entiteId) throw new AppError(403, 'FORBIDDEN');
  if (v.user_id !== user.id) throw new AppError(404, 'NOT_FOUND');
  return v;
}

function list(user, { limit = 50, offset = 0, q } = {}) {
  const entiteId = controle(user);
  const where = ['user_id = ?', 'entite_id = ?'];
  const params = [user.id, entiteId];
  if (q) { where.push('nom LIKE ?'); params.push(`%${q}%`); }
  const db = getDb();
  const clause = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS n FROM vues_demandes ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} FROM vues_demandes ${clause} ORDER BY nom COLLATE NOCASE, id LIMIT ? OFFSET ?`).all(...params, limit, offset).map(sortie);
  return { rows, pagination: { total, limit, offset } };
}

const get = (user, id) => sortie(charger(user, id));

function nomLibre(user, entiteId, nom, saufId = 0) {
  // Comparaison sans la casse, accents compris (« À qualifier » et « à qualifier » sont le même nom).
  const cle = (x) => x.toLocaleLowerCase('fr');
  const noms = getDb().prepare('SELECT nom FROM vues_demandes WHERE user_id = ? AND entite_id = ? AND id <> ?').all(user.id, entiteId, saufId);
  if (noms.some((v) => cle(v.nom) === cle(nom))) throw new AppError(409, 'VUE_NOM_PRIS');
}

function create(user, { nom, filtres }, channel = 'api') {
  const entiteId = controle(user);
  const db = getDb();
  if (db.prepare('SELECT COUNT(*) AS n FROM vues_demandes WHERE user_id = ? AND entite_id = ?').get(user.id, entiteId).n >= MAX_VUES) {
    throw new AppError(409, 'VUES_MAX');
  }
  nomLibre(user, entiteId, nom);
  const id = db.transaction(() => {
    const r = db.prepare('INSERT INTO vues_demandes (user_id, entite_id, nom, filtres) VALUES (?, ?, ?, ?)').run(user.id, entiteId, nom, JSON.stringify(filtres));
    logAudit(user.id, 'vue_demande.create', 'vue_demande', r.lastInsertRowid, { nom, filtres: Object.keys(filtres).length }, channel, entiteId);
    return r.lastInsertRowid;
  })();
  return get(user, id);
}

function update(user, id, data, channel = 'api') {
  const v = charger(user, id);
  const db = getDb();
  const nom = data.nom === undefined ? v.nom : data.nom;
  const filtres = data.filtres === undefined ? v.filtres : JSON.stringify(data.filtres);
  if (nom !== v.nom) nomLibre(user, v.entite_id, nom, v.id);
  if (nom === v.nom && filtres === v.filtres) return sortie(v);
  db.transaction(() => {
    db.prepare("UPDATE vues_demandes SET nom = ?, filtres = ?, updated_at = datetime('now') WHERE id = ?").run(nom, filtres, v.id);
    const details = {};
    if (nom !== v.nom) { details.avant = { nom: v.nom }; details.apres = { nom }; }
    if (filtres !== v.filtres) details.filtres = Object.keys(JSON.parse(filtres)).length;
    logAudit(user.id, 'vue_demande.update', 'vue_demande', v.id, details, channel, v.entite_id);
  })();
  return get(user, v.id);
}

function remove(user, id, channel = 'api') {
  const v = charger(user, id);
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM vues_demandes WHERE id = ?').run(v.id);
    logAudit(user.id, 'vue_demande.delete', 'vue_demande', v.id, { nom: v.nom }, channel, v.entite_id);
  })();
  return { id: v.id, supprimee: 1 };
}

module.exports = { list, get, create, update, remove, MAX_VUES };
