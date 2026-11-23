/**
 * Priorités P1 à P4 et délais par entité (cahier des charges section 8.2, PRI-01, PRI-02 ; décision D-11).
 * Catalogue fermé : les quatre codes sont livrés dans config/priorites.json ; chaque entité en a sa copie (table
 * priorites), créée au démarrage si elle manque et jamais écrasée. Le responsable règle libellés, description, couleur,
 * unité de décompte et délais ; DELETE rend les valeurs livrées (même logique que les paramètres, écart E-19).
 *   1. L'unité vaut pour les deux délais : heures calendaires (P1 livrée ainsi : nuit et week-end comptent), heures
 *      ouvrables ou jours ouvrables (calendrier de l'entité, point 3 de la 0.4.0).
 *   2. Délai de prise en charge obligatoire ; délai de fin facultatif (null : date convenue) et jamais plus court
 *      que celui de prise en charge ; bornes de config/priorites.json selon l'unité.
 *   3. Le délai propre d'une catégorie (delai_fin_jours) ne remplace que le délai de fin d'une priorité comptée en
 *      jours ouvrables ; il sera appliqué au calcul de l'échéance (étape 8).
 * Lecture : toute personne qui a un rôle dans l'entité active (le demandeur verra le délai annoncé). Écriture : rôle qui
 * porte « delais:gerer ». Cloison (SEC-01) : seules les priorités de l'entité active se lisent et s'écrivent.
 */
const fs = require('fs');
const path = require('path');
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { avecTrace } = require('./trace');
const { rolesWith } = require('../roles');

const CATALOGUE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'priorites.json'), 'utf8'));
const CODES = CATALOGUE.defauts.map((d) => d.code);
const UNITES = CATALOGUE.unites;
const COULEURS = CATALOGUE.couleurs;
const CHAMPS = ['libelle_fr', 'libelle_nl', 'description_fr', 'description_nl', 'couleur', 'unite', 'prise_en_charge', 'fin'];

const COLUMNS = `id, entite_id, code, libelle_fr, libelle_nl, description_fr, description_nl, couleur, unite, prise_en_charge, fin,
  updated_by, updated_at`;

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}

function gestion(user) {
  entiteActive(user);
  if (!user.roles.some((r) => rolesWith('delais:gerer').includes(r))) throw new AppError(403, 'FORBIDDEN');
}

const defaut = (code) => CATALOGUE.defauts.find((d) => d.code === code);

/** Fiche d'une priorité de l'entité, avec les valeurs livrées et l'indication « est_defaut ». */
function fiche(entiteId, code, user = null) {
  const d = defaut(code);
  if (!d) throw new AppError(404, 'NOT_FOUND');
  const r = getDb().prepare(`SELECT ${COLUMNS} FROM priorites WHERE entite_id = ? AND code = ?`).get(entiteId, code);
  if (!r) throw new AppError(404, 'NOT_FOUND');
  const { code: _c, ...livre } = d;
  const f = { ...r, defaut: livre, est_defaut: CHAMPS.every((k) => r[k] === (d[k] ?? null)) };
  // Trace (0.4.1) : rendue avec la fiche quand elle part en réponse (user fourni).
  return user ? avecTrace(user, f, { estDefaut: f.est_defaut }) : f;
}

function list(user) {
  const entiteId = entiteActive(user);
  const rows = CODES.map((c) => fiche(entiteId, c, user));
  return { rows, pagination: { total: rows.length, limit: rows.length, offset: 0 } };
}

function get(user, code) {
  return fiche(entiteActive(user), code, user);
}

/** Règle 2 : délais cohérents avec l'unité. */
function controler(p) {
  const max = CATALOGUE.bornes[p.unite];
  const non = (motif) => { throw new AppError(409, 'PRIORITE_DELAIS', [motif]); };
  if (!(p.prise_en_charge >= 1 && p.prise_en_charge <= max)) non(`prise_en_charge: 1 à ${max}`);
  if (p.fin !== null && !(p.fin >= p.prise_en_charge && p.fin <= max)) non(`fin: ${p.prise_en_charge} à ${max}, ou vide (date convenue)`);
}

function update(user, code, data, channel = 'api') {
  gestion(user);
  const entiteId = user.entiteId;
  const avant = fiche(entiteId, code);
  const apres = { ...avant, ...data };
  controler(apres);
  const changes = Object.fromEntries(Object.entries(data).filter(([k, v]) => avant[k] !== v));
  if (!Object.keys(changes).length) return fiche(entiteId, code, user);
  const { sets, params } = safeBuildUpdate(changes, ['id']);
  getDb().prepare(`UPDATE priorites SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, avant.id);
  logAudit(user.id, 'priorite.update', 'priorite', avant.id,
    { code, avant: Object.fromEntries(Object.keys(changes).map((k) => [k, avant[k]])), apres: changes }, channel, entiteId);
  return fiche(entiteId, code, user);
}

/** DELETE = retour aux valeurs livrées pour l'entité active. */
function reset(user, code, channel = 'api') {
  gestion(user);
  const entiteId = user.entiteId;
  const avant = fiche(entiteId, code);
  if (avant.est_defaut) return fiche(entiteId, code, user);
  const d = defaut(code);
  getDb().prepare(`UPDATE priorites SET libelle_fr = ?, libelle_nl = ?, description_fr = ?, description_nl = ?, couleur = ?, unite = ?,
      prise_en_charge = ?, fin = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(d.libelle_fr, d.libelle_nl, d.description_fr, d.description_nl, d.couleur, d.unite, d.prise_en_charge, d.fin, user.id, avant.id);
  logAudit(user.id, 'priorite.reset', 'priorite', avant.id,
    { code, avant: Object.fromEntries(CHAMPS.map((k) => [k, avant[k]])) }, channel, entiteId);
  return fiche(entiteId, code, user);
}

/** Priorités livrées d'une entité : créées si leur code manque, jamais modifiées. */
function seedEntite(entiteId) {
  const db = getDb();
  for (const d of CATALOGUE.defauts) {
    if (db.prepare('SELECT 1 FROM priorites WHERE entite_id = ? AND code = ?').get(entiteId, d.code)) continue;
    db.prepare(`INSERT INTO priorites (entite_id, code, libelle_fr, libelle_nl, description_fr, description_nl, couleur, unite, prise_en_charge, fin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(entiteId, d.code, d.libelle_fr, d.libelle_nl, d.description_fr, d.description_nl, d.couleur, d.unite, d.prise_en_charge, d.fin);
  }
}

function seedAll() {
  for (const e of getDb().prepare('SELECT id FROM entites WHERE is_active = 1').all()) seedEntite(e.id);
}

module.exports = { CODES, UNITES, COULEURS, CATALOGUE, list, get, update, reset, gestion, fiche, seedEntite, seedAll };
