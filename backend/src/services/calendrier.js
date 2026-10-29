/**
 * Calendrier des jours ouvrables par entité (cahier des charges PRI-02 ; décisions de Thierry du 22/10/2026).
 * Trois sources, lues par le calcul des échéances (services/echeances.js) :
 *   1. Horaire par jour de la semaine (table horaires) : catalogue fermé de sept jours par entité, créé au démarrage
 *      selon config/calendrier.json (horaire des ouvriers : AC du lundi au jeudi 07:45-16:15, vendredi 07:45-12:00 ;
 *      CPAS du lundi au vendredi 08:00-16:30). Début et fin vides : jour non ouvré. DELETE rend l'horaire livré.
 *   2. Jours fériés légaux belges : calculés chaque année (Pâques par l'algorithme grégorien anonyme), jamais stockés.
 *   3. Jours non ouvrés propres à l'entité (table jours_non_ouvres) : congés répétés chaque année (mois_jour) et
 *      fermetures ponctuelles (date_debut à date_fin), libellés FR et NL ; DELETE désactive avec un motif.
 * Lecture : toute personne qui a un rôle dans l'entité active. Écriture : rôle qui porte « delais:gerer ».
 * Cloison (SEC-01) : un jour non ouvré d'une autre entité répond 403, par l'API comme par le MCP.
 */
const fs = require('fs');
const path = require('path');
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit, changements } = require('../audit');
const { avecTrace } = require('./trace');
const { rolesWith } = require('../roles');

const CATALOGUE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'calendrier.json'), 'utf8'));
const JOURS = [1, 2, 3, 4, 5, 6, 7];
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FERMETURE_MAX_JOURS = 366;

const COLUMNS = `id, entite_id, nature, mois_jour, date_debut, date_fin, libelle_fr, libelle_nl, is_active, motif_desactivation,
  created_at, updated_at, created_by, updated_by`;

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}

function gestion(user) {
  entiteActive(user);
  if (!user.roles.some((r) => rolesWith('delais:gerer').includes(r))) throw new AppError(403, 'FORBIDDEN');
}

const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/* ---------- Jours fériés légaux ---------- */

/** Dimanche de Pâques (algorithme grégorien anonyme, dit de Meeus-Jones-Butcher) : [mois, jour]. */
function paques(annee) {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return [mois, jour];
}

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Les dix jours fériés légaux d'une année, dans l'ordre des dates. */
function feries(annee) {
  const [pm, pj] = paques(annee);
  const base = Date.UTC(annee, pm - 1, pj);
  return CATALOGUE.feries
    .map((f) => ({
      date: f.paques !== undefined ? iso(base + f.paques * 86400000) : `${annee}-${f.date}`,
      code: f.code, libelle_fr: f.libelle_fr, libelle_nl: f.libelle_nl,
    }))
    .sort((x, y) => x.date.localeCompare(y.date));
}

function listFeries(user, { annee } = {}) {
  entiteActive(user);
  const rows = feries(annee || new Date().getUTCFullYear());
  return { rows, pagination: { total: rows.length, limit: rows.length, offset: 0 } };
}

/* ---------- Horaires ---------- */

function horaireLivre(entiteCode) {
  return CATALOGUE.horaires[entiteCode] || CATALOGUE.horaires.defaut;
}

/** Fiche d'un jour de l'horaire ; avec user, elle porte sa trace (0.4.1) pour la réponse. */
function ficheHoraire(entiteId, jour, user = null) {
  if (!JOURS.includes(jour)) throw new AppError(404, 'NOT_FOUND');
  const r = getDb().prepare('SELECT id, entite_id, jour, debut, fin, updated_by, updated_at FROM horaires WHERE entite_id = ? AND jour = ?').get(entiteId, jour);
  if (!r) throw new AppError(404, 'NOT_FOUND');
  const code = getDb().prepare('SELECT code FROM entites WHERE id = ?').get(entiteId).code;
  const d = horaireLivre(code).find((h) => h.jour === jour) || { debut: null, fin: null };
  const f = { ...r, ouvre: r.debut ? 1 : 0, defaut: { debut: d.debut, fin: d.fin }, est_defaut: r.debut === d.debut && r.fin === d.fin };
  return user ? avecTrace(user, f, { estDefaut: f.est_defaut }) : f;
}

function listHoraires(user) {
  const entiteId = entiteActive(user);
  const rows = JOURS.map((j) => ficheHoraire(entiteId, j, user));
  return { rows, pagination: { total: rows.length, limit: rows.length, offset: 0 } };
}

function getHoraire(user, jour) {
  return ficheHoraire(entiteActive(user), jour, user);
}

/** Début et fin tous deux vides (jour non ouvré) ou tous deux remplis, le début avant la fin. */
function controlerHoraire(debut, fin) {
  if (debut === null && fin === null) return;
  if (!debut || !fin || !HEURE.test(debut) || !HEURE.test(fin) || minutes(debut) >= minutes(fin)) throw new AppError(409, 'HORAIRE_INVALIDE');
}

function updateHoraire(user, jour, data, channel = 'api') {
  gestion(user);
  const entiteId = user.entiteId;
  const avant = ficheHoraire(entiteId, jour);
  const debut = data.debut !== undefined ? data.debut : avant.debut;
  const fin = data.fin !== undefined ? data.fin : avant.fin;
  controlerHoraire(debut, fin);
  if (debut === avant.debut && fin === avant.fin) return ficheHoraire(entiteId, jour, user);
  getDb().prepare("UPDATE horaires SET debut = ?, fin = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?").run(debut, fin, user.id, avant.id);
  logAudit(user.id, 'horaire.update', 'horaire', avant.id, { jour, avant: { debut: avant.debut, fin: avant.fin }, apres: { debut, fin } }, channel, entiteId);
  return ficheHoraire(entiteId, jour, user);
}

/** DELETE = retour à l'horaire livré pour ce jour. */
function resetHoraire(user, jour, channel = 'api') {
  gestion(user);
  const entiteId = user.entiteId;
  const avant = ficheHoraire(entiteId, jour);
  if (avant.est_defaut) return ficheHoraire(entiteId, jour, user);
  getDb().prepare("UPDATE horaires SET debut = ?, fin = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(avant.defaut.debut, avant.defaut.fin, user.id, avant.id);
  logAudit(user.id, 'horaire.reset', 'horaire', avant.id, { jour, avant: { debut: avant.debut, fin: avant.fin } }, channel, entiteId);
  return ficheHoraire(entiteId, jour, user);
}

/* ---------- Jours non ouvrés propres à l'entité ---------- */

function rowJour(id) {
  return getDb().prepare(`SELECT ${COLUMNS} FROM jours_non_ouvres WHERE id = ?`).get(id);
}

function loadJour(user, id) {
  const j = rowJour(id);
  if (!j) throw new AppError(404, 'NOT_FOUND');
  if (j.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  return j;
}

function listJours(user, { limit = 50, offset = 0, q, nature, annee, is_active } = {}) {
  const where = ['entite_id = ?'];
  const params = [entiteActive(user)];
  if (nature) { where.push('nature = ?'); params.push(nature); }
  if (is_active !== undefined) { where.push('is_active = ?'); params.push(is_active); }
  // Année : les congés valent chaque année ; une fermeture compte si elle touche l'année.
  if (annee) { where.push("(nature = 'conge' OR (date_debut <= ? AND date_fin >= ?))"); params.push(`${annee}-12-31`, `${annee}-01-01`); }
  if (q) { where.push('(libelle_fr LIKE ? OR libelle_nl LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const clause = `WHERE ${where.join(' AND ')}`;
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM jours_non_ouvres ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} FROM jours_non_ouvres ${clause} ORDER BY nature, COALESCE(mois_jour, date_debut) LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { rows: rows.map((r) => avecTrace(user, r)), pagination: { total, limit, offset } };
}

function getJour(user, id) {
  return avecTrace(user, loadJour(user, id));
}

const dateValide = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(Date.parse(`${s}T00:00:00Z`)) === s;

/** Congé : un mois et un jour qui existent chaque année ; fermeture : une période d'un an au plus, dans l'ordre. */
function controlerJour(j) {
  const non = () => { throw new AppError(409, 'JOUR_NON_OUVRE_INVALIDE'); };
  if (j.nature === 'conge') {
    if (!j.mois_jour || j.date_debut || j.date_fin || !dateValide(`2025-${j.mois_jour}`)) non();
  } else {
    if (j.mois_jour || !j.date_debut || !j.date_fin || !dateValide(j.date_debut) || !dateValide(j.date_fin)) non();
    const jours = (Date.parse(j.date_fin) - Date.parse(j.date_debut)) / 86400000;
    if (jours < 0 || jours >= FERMETURE_MAX_JOURS) non();
  }
}

function assertCongeLibre(entiteId, moisJour, exceptId = 0) {
  if (getDb().prepare("SELECT 1 FROM jours_non_ouvres WHERE entite_id = ? AND nature = 'conge' AND mois_jour = ? AND is_active = 1 AND id <> ?")
    .get(entiteId, moisJour, exceptId)) throw new AppError(409, 'JOUR_NON_OUVRE_DUPLICATE');
}

function createJour(user, data, channel = 'api') {
  gestion(user);
  const entiteId = user.entiteId;
  const j = { nature: data.nature, mois_jour: data.mois_jour ?? null, date_debut: data.date_debut ?? null, date_fin: data.date_fin ?? null };
  controlerJour(j);
  if (j.nature === 'conge') assertCongeLibre(entiteId, j.mois_jour);
  const r = getDb().prepare(`INSERT INTO jours_non_ouvres (entite_id, nature, mois_jour, date_debut, date_fin, libelle_fr, libelle_nl, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(entiteId, j.nature, j.mois_jour, j.date_debut, j.date_fin, data.libelle_fr, data.libelle_nl, user.id, user.id);
  logAudit(user.id, 'jour_non_ouvre.create', 'jour_non_ouvre', r.lastInsertRowid, { nature: j.nature, mois_jour: j.mois_jour, date_debut: j.date_debut, date_fin: j.date_fin }, channel, entiteId);
  return avecTrace(user, loadJour(user, r.lastInsertRowid));
}

function updateJour(user, id, data, channel = 'api') {
  gestion(user);
  const avant = loadJour(user, id);
  if (!avant.is_active && data.is_active !== 1) throw new AppError(409, 'CANCELLED');
  const apres = { ...avant, ...data };
  controlerJour(apres);
  if (apres.nature === 'conge' && (data.mois_jour !== undefined || data.is_active === 1)) assertCongeLibre(avant.entite_id, apres.mois_jour, id);
  // Journal (0.4.1) : seuls les champs changés, avec l'ancienne et la nouvelle valeur ; rien n'est écrit sans changement.
  const diff = changements('jours_non_ouvres', id, data);
  if (diff) {
    const { sets, params } = safeBuildUpdate(diff.apres, ['id']);
    if (diff.apres.is_active === 1) sets.push('motif_desactivation = NULL');
    getDb().prepare(`UPDATE jours_non_ouvres SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, id);
    logAudit(user.id, diff.apres.is_active === 1 ? 'jour_non_ouvre.reactivate' : 'jour_non_ouvre.update', 'jour_non_ouvre', id,
      { nature: avant.nature, mois_jour: avant.mois_jour, date_debut: avant.date_debut, ...diff }, channel, avant.entite_id);
  }
  return avecTrace(user, loadJour(user, id));
}

/** DELETE = désactivation avec motif : le jour redevient ouvrable pour les calculs suivants. */
function deactivateJour(user, id, motif, channel = 'api') {
  gestion(user);
  const j = loadJour(user, id);
  if (!j.is_active) throw new AppError(409, 'CANCELLED');
  getDb().prepare("UPDATE jours_non_ouvres SET is_active = 0, motif_desactivation = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(motif, user.id, id);
  logAudit(user.id, 'jour_non_ouvre.deactivate', 'jour_non_ouvre', id, { motif }, channel, j.entite_id);
  return avecTrace(user, loadJour(user, id));
}

/* ---------- Lecture pour le calcul ---------- */

/** Calendrier d'une entité, tel que le calcul des échéances le lit : horaires en minutes, congés, fermetures. */
function charger(entiteId) {
  const db = getDb();
  const horaires = new Map();
  for (const h of db.prepare('SELECT jour, debut, fin FROM horaires WHERE entite_id = ?').all(entiteId)) {
    if (h.debut && h.fin) horaires.set(h.jour, { o: minutes(h.debut), c: minutes(h.fin) });
  }
  const jours = db.prepare('SELECT nature, mois_jour, date_debut, date_fin FROM jours_non_ouvres WHERE entite_id = ? AND is_active = 1').all(entiteId);
  return {
    horaires,
    conges: new Set(jours.filter((j) => j.nature === 'conge').map((j) => j.mois_jour)),
    fermetures: jours.filter((j) => j.nature === 'fermeture').map((j) => [j.date_debut, j.date_fin]),
    feries: new Map(),
  };
}

/* ---------- Valeurs livrées ---------- */

/** Horaire et congés livrés d'une entité : créés s'ils manquent ; rien n'est modifié ni réactivé. */
function seedEntite(entiteId) {
  const db = getDb();
  const e = db.prepare('SELECT code FROM entites WHERE id = ?').get(entiteId);
  const livre = horaireLivre(e.code);
  for (const jour of JOURS) {
    if (db.prepare('SELECT 1 FROM horaires WHERE entite_id = ? AND jour = ?').get(entiteId, jour)) continue;
    const h = livre.find((x) => x.jour === jour);
    db.prepare('INSERT INTO horaires (entite_id, jour, debut, fin) VALUES (?, ?, ?, ?)').run(entiteId, jour, h ? h.debut : null, h ? h.fin : null);
  }
  for (const c of CATALOGUE.conges) {
    if (db.prepare("SELECT 1 FROM jours_non_ouvres WHERE entite_id = ? AND nature = 'conge' AND mois_jour = ?").get(entiteId, c.mois_jour)) continue;
    db.prepare("INSERT INTO jours_non_ouvres (entite_id, nature, mois_jour, libelle_fr, libelle_nl) VALUES (?, 'conge', ?, ?, ?)")
      .run(entiteId, c.mois_jour, c.libelle_fr, c.libelle_nl);
  }
}

function seedAll() {
  for (const e of getDb().prepare('SELECT id FROM entites WHERE is_active = 1').all()) seedEntite(e.id);
}

module.exports = {
  CATALOGUE, JOURS, paques, feries, listFeries, listHoraires, getHoraire, updateHoraire, resetHoraire,
  listJours, getJour, createJour, updateJour, deactivateJour, charger, gestion, seedEntite, seedAll,
};
