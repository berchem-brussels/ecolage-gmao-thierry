/**
 * Catégories d'intervention en arbre (cahier des charges REF-06, DEM-02, DEM-15, PRI-01 ; décision D-11).
 * Arbre à deux niveaux par entité : un domaine (parent_id NULL), puis ses natures.
 *   1. Un domaine n'a pas de parent ; une nature se range sous un domaine actif de la même entité. Une nature peut
 *      changer de domaine ; un domaine ne devient pas une nature, ni l'inverse.
 *   2. Le code est unique dans l'entité, domaines et natures confondus ; le même code existe dans l'autre entité (REF-02).
 *   3. Un domaine porte toujours sa priorité par défaut (P1 à P4) et sa règle de validation (0 direct, 1 chef de
 *      service). Une nature les reprend de son domaine quand elle n'en a pas en propre (valeur NULL) : la réponse donne
 *      la valeur propre et la valeur en vigueur (priorite_effective, validation_effective, delai_fin_jours_effectif).
 *   4. Le délai propre (delai_fin_jours, jours ouvrables) est facultatif ; sans lui, le délai de la priorité s'applique.
 *   5. L'icône vient du catalogue fermé de config/categories.json.
 *   6. Un domaine qui a encore des natures actives ne se désactive pas ; une nature ne se réactive pas sous un
 *      domaine désactivé.
 * Lecture : toute personne qui a un rôle dans l'entité active (les demandeurs verront les tuiles). Écriture : rôle qui
 * porte « categories:gerer » (responsable du service technique). Module : « demandes », du noyau, toujours actif.
 * Cloison (SEC-01) : une catégorie d'une autre entité répond 403, par l'API comme par le MCP.
 * Une catégorie ne se supprime pas : DELETE la désactive avec un motif ; les demandes qui la portent la garderont.
 */
const fs = require('fs');
const path = require('path');
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit, changements } = require('../audit');
const { avecTrace } = require('./trace');
const { rolesWith } = require('../roles');

const CATALOGUE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'categories.json'), 'utf8'));
const ICONES = CATALOGUE.icones.map((i) => i.code);
const PRIORITES = ['P1', 'P2', 'P3', 'P4'];
const ARBRE_MAX = 2000;

const COLUMNS = `c.id, c.entite_id, c.parent_id, CASE WHEN c.parent_id IS NULL THEN 'domaine' ELSE 'nature' END AS niveau,
  c.code, c.libelle_fr, c.libelle_nl, c.icone, c.priorite_defaut, c.validation, c.delai_fin_jours, c.ordre,
  COALESCE(c.priorite_defaut, p.priorite_defaut) AS priorite_effective,
  COALESCE(c.validation, p.validation) AS validation_effective,
  COALESCE(c.delai_fin_jours, p.delai_fin_jours) AS delai_fin_jours_effectif,
  p.code AS parent_code, p.libelle_fr AS parent_libelle_fr, p.libelle_nl AS parent_libelle_nl,
  c.is_active, c.motif_desactivation, c.created_at, c.updated_at, c.created_by, c.updated_by`;
const FROM = 'FROM categories c LEFT JOIN categories p ON p.id = c.parent_id';
// Ordre de lecture (écrit en clair dans chaque requête) : domaines dans leur ordre, chacun suivi de ses natures dans le leur.

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}

/** Droit de régler les catégories : rôle qui porte « categories:gerer » dans l'entité active. */
function gestion(user) {
  entiteActive(user);
  if (!user.roles.some((r) => rolesWith('categories:gerer').includes(r))) throw new AppError(403, 'FORBIDDEN');
}

function row(id) {
  return getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE c.id = ?`).get(id);
}

/** Charge une catégorie de l'entité active ; 404 si elle n'existe pas, 403 si elle appartient à une autre entité. */
function load(user, id) {
  const c = row(id);
  if (!c) throw new AppError(404, 'NOT_FOUND');
  if (c.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  return c;
}

function list(user, { limit = 50, offset = 0, q, niveau, parent_id, priorite, is_active } = {}) {
  const where = ['c.entite_id = ?'];
  const params = [entiteActive(user)];
  if (niveau === 'domaine') where.push('c.parent_id IS NULL');
  if (niveau === 'nature') where.push('c.parent_id IS NOT NULL');
  if (parent_id) { where.push('c.parent_id = ?'); params.push(parent_id); }
  if (priorite) { where.push('COALESCE(c.priorite_defaut, p.priorite_defaut) = ?'); params.push(priorite); }
  if (is_active !== undefined) { where.push('c.is_active = ?'); params.push(is_active); }
  if (q) { where.push('(c.code LIKE ? OR c.libelle_fr LIKE ? OR c.libelle_nl LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const clause = `WHERE ${where.join(' AND ')}`;
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n ${FROM} ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} ${FROM} ${clause} ORDER BY COALESCE(p.ordre, c.ordre), COALESCE(p.id, c.id), c.parent_id IS NOT NULL, c.ordre, c.libelle_fr LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows: rows.map((r) => avecTrace(user, r)), pagination: { total, limit, offset } };
}

/**
 * Arbre de l'entité active : domaines dans leur ordre, natures dans le leur. Sans inclure_inactifs, une catégorie
 * désactivée n'y figure pas, ni les natures d'un domaine désactivé : c'est ce que verront les tuiles du demandeur.
 * Chaque catégorie porte ses questions actives pour le formulaire (« questions », DEM-05) : domaine puis nature.
 */
function arbre(user, { inclure_inactifs = 0 } = {}) {
  const entiteId = entiteActive(user);
  const tous = inclure_inactifs ? 1 : 0;
  const rows = getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE c.entite_id = ? AND (c.is_active = 1 OR ? = 1) ORDER BY COALESCE(p.ordre, c.ordre), COALESCE(p.id, c.id), c.parent_id IS NOT NULL, c.ordre, c.libelle_fr LIMIT ?`)
    .all(entiteId, tous, ARBRE_MAX).map((r) => avecTrace(user, r));
  // Questions posées dans le formulaire pour chaque catégorie (DEM-05, 0.7.0) : celles du domaine, puis les siennes.
  const questionsDe = require('./questions-categorie').effectivesParCategorie(entiteId);
  for (const r of rows) r.questions = questionsDe(r);
  const domaines = new Map();
  for (const r of rows) if (r.niveau === 'domaine') domaines.set(r.id, { ...r, natures: [] });
  let total = domaines.size;
  for (const r of rows) {
    if (r.niveau !== 'nature') continue;
    const d = domaines.get(r.parent_id);
    if (!d) continue;
    d.natures.push(r);
    total += 1;
  }
  return { domaines: [...domaines.values()], total };
}

function get(user, id) {
  return avecTrace(user, load(user, id));
}

function assertCodeFree(entiteId, code, exceptId = 0) {
  if (getDb().prepare('SELECT 1 FROM categories WHERE entite_id = ? AND code = ? AND id <> ?').get(entiteId, code, exceptId)) {
    throw new AppError(409, 'CATEGORIE_CODE_DUPLICATE');
  }
}

/** Domaine admis comme parent d'une nature : même entité, domaine (sans parent), actif (règle 1). */
function assertDomaine(entiteId, parentId) {
  const p = getDb().prepare('SELECT id, entite_id, parent_id, is_active FROM categories WHERE id = ?').get(parentId);
  if (!p || p.entite_id !== entiteId || p.parent_id !== null) throw new AppError(409, 'CATEGORIE_PARENT');
  if (!p.is_active) throw new AppError(409, 'CATEGORIE_PARENT_INACTIF');
  return p;
}

function nextOrdre(entiteId, parentId) {
  const db = getDb();
  if (parentId) return db.prepare('SELECT COALESCE(MAX(ordre), 0) + 10 AS o FROM categories WHERE entite_id = ? AND parent_id = ?').get(entiteId, parentId).o;
  return db.prepare('SELECT COALESCE(MAX(ordre), 0) + 10 AS o FROM categories WHERE entite_id = ? AND parent_id IS NULL').get(entiteId).o;
}

function create(user, data, channel = 'api') {
  gestion(user);
  const entiteId = user.entiteId;
  const parentId = data.parent_id ?? null;
  if (parentId) assertDomaine(entiteId, parentId);
  assertCodeFree(entiteId, data.code);
  // Règle 3 : un domaine porte toujours sa priorité et sa règle de validation.
  if (!parentId && (data.priorite_defaut === null || data.validation === null)) throw new AppError(409, 'CATEGORIE_DOMAINE');
  const priorite = data.priorite_defaut !== undefined ? data.priorite_defaut : (parentId ? null : 'P3');
  const validation = data.validation !== undefined ? data.validation : (parentId ? null : 0);
  const ordre = data.ordre !== undefined ? data.ordre : nextOrdre(entiteId, parentId);
  const r = getDb().prepare(`INSERT INTO categories (entite_id, parent_id, code, libelle_fr, libelle_nl, icone, priorite_defaut, validation,
      delai_fin_jours, ordre, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(entiteId, parentId, data.code, data.libelle_fr, data.libelle_nl, data.icone || 'autre', priorite, validation,
      data.delai_fin_jours ?? null, ordre, user.id, user.id);
  logAudit(user.id, 'categorie.create', 'categorie', r.lastInsertRowid,
    { code: data.code, niveau: parentId ? 'nature' : 'domaine' }, channel, entiteId);
  return avecTrace(user, load(user, r.lastInsertRowid));
}

function update(user, id, data, channel = 'api') {
  gestion(user);
  const c = load(user, id);
  if (!c.is_active && data.is_active !== 1) throw new AppError(409, 'CANCELLED');
  if (data.code !== undefined) assertCodeFree(c.entite_id, data.code, id);
  if (data.parent_id !== undefined) {
    // Règle 1 : un domaine reste un domaine ; une nature change de domaine, jamais de niveau.
    if (c.niveau === 'domaine' || data.parent_id === id) throw new AppError(409, 'CATEGORIE_PARENT');
    assertDomaine(c.entite_id, data.parent_id);
  }
  if (c.niveau === 'domaine' && (data.priorite_defaut === null || data.validation === null)) throw new AppError(409, 'CATEGORIE_DOMAINE');
  if (data.is_active === 1 && !c.is_active && c.parent_id) {
    const p = getDb().prepare('SELECT is_active FROM categories WHERE id = ?').get(data.parent_id || c.parent_id);
    if (!p.is_active) throw new AppError(409, 'CATEGORIE_PARENT_INACTIF');
  }
  // Journal (0.4.1) : seuls les champs changés, avec l'ancienne et la nouvelle valeur ; rien n'est écrit sans changement.
  const diff = changements('categories', id, data);
  if (diff) {
    const { sets, params } = safeBuildUpdate(diff.apres, ['id']);
    if (diff.apres.is_active === 1) sets.push('motif_desactivation = NULL');
    getDb().prepare(`UPDATE categories SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, id);
    logAudit(user.id, diff.apres.is_active === 1 ? 'categorie.reactivate' : 'categorie.update', 'categorie', id,
      { code: c.code, ...diff }, channel, c.entite_id);
  }
  return avecTrace(user, load(user, id));
}

/** DELETE = désactivation avec motif ; refusée pour un domaine qui a encore des natures actives (règle 6). */
function deactivate(user, id, motif, channel = 'api') {
  gestion(user);
  const c = load(user, id);
  if (!c.is_active) throw new AppError(409, 'CANCELLED');
  const natures = getDb().prepare('SELECT COUNT(*) AS n FROM categories WHERE parent_id = ? AND is_active = 1').get(id).n;
  if (natures) throw new AppError(409, 'CATEGORIE_ENFANTS', [`${natures}`]);
  getDb().prepare("UPDATE categories SET is_active = 0, motif_desactivation = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(motif, user.id, id);
  logAudit(user.id, 'categorie.deactivate', 'categorie', id, { motif }, channel, c.entite_id);
  return avecTrace(user, load(user, id));
}

/**
 * Arbre livré d'une entité : un domaine ou une nature est créé si son code manque ; rien n'est modifié ni réactivé.
 * Les natures d'un domaine désactivé par le responsable ne sont pas recréées.
 */
function seedEntite(entiteId) {
  const db = getDb();
  const find = (code) => db.prepare('SELECT id, is_active FROM categories WHERE entite_id = ? AND code = ?').get(entiteId, code);
  CATALOGUE.defauts.forEach((d, i) => {
    let dom = find(d.code);
    if (!dom) {
      const r = db.prepare(`INSERT INTO categories (entite_id, parent_id, code, libelle_fr, libelle_nl, icone, priorite_defaut, validation, ordre)
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)`).run(entiteId, d.code, d.libelle_fr, d.libelle_nl, d.icone, d.priorite_defaut, d.validation, (i + 1) * 10);
      dom = { id: r.lastInsertRowid, is_active: 1 };
    }
    if (!dom.is_active) return;
    d.natures.forEach((n, j) => {
      if (find(n.code)) return;
      db.prepare(`INSERT INTO categories (entite_id, parent_id, code, libelle_fr, libelle_nl, icone, priorite_defaut, validation, ordre)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`).run(entiteId, dom.id, n.code, n.libelle_fr, n.libelle_nl, n.icone, n.priorite_defaut || null, (j + 1) * 10);
    });
  });
}

function seedAll() {
  for (const e of getDb().prepare('SELECT id FROM entites WHERE is_active = 1').all()) seedEntite(e.id);
}

module.exports = { ICONES, PRIORITES, list, arbre, get, create, update, deactivate, gestion, seedEntite, seedAll };
