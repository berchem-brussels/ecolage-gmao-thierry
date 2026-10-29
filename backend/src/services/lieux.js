/**
 * Référentiel des lieux (cahier des charges REF-01, REF-02 ; règles validées le 21/10/2026).
 * Arbre par entité : site, bâtiment, niveau, local.
 *   1. Un bâtiment se range sous un site, un niveau sous un bâtiment ; un bâtiment peut exister sans niveau.
 *   2. Un local se range sous un niveau, un bâtiment ou directement un site (lieu extérieur : cour, parking, toiture).
 *   3. Le code court est unique dans l'entité : le même code peut exister dans une autre entité (REF-02).
 *   4. Un lieu qui a encore des lieux actifs en dessous ne se désactive pas.
 *   5. L'adresse se saisit sur le site ; un bâtiment créé sans adresse reprend celle de son site.
 *   6. Une photo par lieu ; la nouvelle efface réellement l'ancienne (standard v3.2, section 9.1).
 *   7. Le type vient de la liste « type_lieu » de l'entité ; il est exigé pour un local.
 * Lecture : toute personne qui a un rôle dans l'entité active. Écriture : rôles qui portent « lieux:gerer ».
 * Cloison (SEC-01) : un lieu d'une autre entité répond 403, par l'API comme par le MCP. Aucun objet partagé.
 * Un lieu ne se supprime pas : DELETE le désactive avec un motif. Seule la photo s'efface réellement.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit, changements } = require('../audit');
const { assertActif } = require('../modules');
const { rolesWith } = require('../roles');
const { PHOTOS_DIR } = require('../config');
const { cleanPhoto } = require('../images');
const valeurs = require('./listes-valeurs');

const COLUMNS = `l.id, l.entite_id, l.parent_id, l.nature, l.code, l.nom_fr, l.nom_nl, l.type_id,
  t.code AS type_code, t.libelle_fr AS type_libelle_fr, t.libelle_nl AS type_libelle_nl,
  l.adresse, l.code_postal, l.commune, l.surface_m2, l.statut,
  CASE WHEN l.photo_fichier IS NULL THEN 0 ELSE 1 END AS has_photo, l.photo_at, l.photo_octets,
  l.is_active, l.motif_desactivation, l.is_demo, l.created_at, l.updated_at`;
const FROM = 'FROM lieux l LEFT JOIN listes_valeurs t ON t.id = l.type_id';

/** Nature du parent admise pour chaque nature (règles 1 et 2). */
const PARENTS = { site: [], batiment: ['site'], niveau: ['batiment'], local: ['site', 'batiment', 'niveau'] };
const PHOTO_NAME = /^[a-f0-9]{32}\.(jpg|png)$/;
const ARBRE_MAX = 5000;

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}

/**
 * Droit de gérer les lieux : rôle d'abord, module ensuite (ordre API-04). Le module Patrimoine éteint ferme toutes les
 * écritures (création, modification, déplacement, désactivation, photo) ; la lecture reste ouverte (décision du 22/10/2026).
 */
function gestion(user) {
  entiteActive(user);
  if (!user.roles.some((r) => rolesWith('lieux:gerer').includes(r))) throw new AppError(403, 'FORBIDDEN');
  assertActif('patrimoine');
}

function row(id) {
  return getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE l.id = ?`).get(id);
}

/** Charge un lieu de l'entité active ; 404 s'il n'existe pas, 403 s'il appartient à une autre entité. */
function load(user, id) {
  const l = row(id);
  if (!l) throw new AppError(404, 'NOT_FOUND');
  if (l.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  return l;
}

/**
 * Texte de recherche (REF-03, LNG-09) : minuscules, sans accents ni ponctuation, espaces simples. « Église Saint-Agathe »
 * devient « eglise saint agathe » ; « Salle n°21 » devient « salle n 21 ».
 */
function normaliser(s) {
  return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Tous les lieux de l'entité (actifs ou non), pour les chemins et la recherche : id → { parent_id, texte, noms }. */
function indexEntite(entiteId) {
  const rows = getDb().prepare(`SELECT l.id, l.parent_id, l.code, l.nom_fr, l.nom_nl, l.adresse, l.code_postal, l.commune,
    t.libelle_fr AS type_fr, t.libelle_nl AS type_nl FROM lieux l LEFT JOIN listes_valeurs t ON t.id = l.type_id WHERE l.entite_id = ? LIMIT ?`)
    .all(entiteId, ARBRE_MAX);
  const index = new Map();
  for (const r of rows) {
    index.set(r.id, {
      parent_id: r.parent_id, code: r.code, nom_fr: r.nom_fr, nom_nl: r.nom_nl,
      propre: normaliser([r.code, r.nom_fr, r.nom_nl, r.adresse, r.code_postal, r.commune, r.type_fr, r.type_nl].join(' ')),
      noms: normaliser([r.code, r.nom_fr, r.nom_nl].join(' ')),
    });
  }
  return index;
}

/** Chemin d'un lieu, de la racine au lieu lui-même : [{ id, code, nom_fr, nom_nl }]. */
function cheminDe(index, id) {
  const out = [];
  for (let n = index.get(id), cur = id, i = 0; n && i < 6; i += 1, cur = n.parent_id, n = index.get(n.parent_id)) {
    out.unshift({ id: cur, code: n.code, nom_fr: n.nom_fr, nom_nl: n.nom_nl });
  }
  return out;
}

/**
 * Recherche d'un lieu (REF-03) : chaque mot cherché doit se trouver dans le code, le nom FR ou NL, l'adresse, la
 * commune ou le type du lieu, ou dans le code et le nom de ses lieux parents (« alcyons salle 21 » trouve la salle 21
 * du bâtiment Alcyons). Sans tenir compte des accents, des majuscules ni de la ponctuation. Ordre : code exact, puis
 * lieux trouvés par leurs propres mots, puis par ceux de leurs parents ; ensuite par chemin.
 */
function trouver(index, rows, q) {
  const mots = normaliser(q).split(' ').filter(Boolean);
  if (!mots.length) return rows;
  const cq = normaliser(q);
  const notes = [];
  for (const r of rows) {
    const n = index.get(r.id);
    if (!n) continue;
    const parents = cheminDe(index, r.id).slice(0, -1).map((p) => index.get(p.id).noms).join(' ');
    const tout = `${n.propre} ${parents}`;
    if (!mots.every((m) => tout.includes(m))) continue;
    const note = normaliser(r.code) === cq ? 0 : mots.every((m) => n.propre.includes(m)) ? 1 : 2;
    notes.push({ r, note, cle: `${parents} ${n.noms}` });
  }
  notes.sort((a, b) => a.note - b.note || a.cle.localeCompare(b.cle));
  return notes.map((x) => x.r);
}

function list(user, { limit = 50, offset = 0, q, nature, parent_id, type_id, statut, is_active } = {}) {
  const entiteId = entiteActive(user);
  const where = ['l.entite_id = ?'];
  const params = [entiteId];
  if (nature) { where.push('l.nature = ?'); params.push(nature); }
  if (parent_id) { where.push('l.parent_id = ?'); params.push(parent_id); }
  if (type_id) { where.push('l.type_id = ?'); params.push(type_id); }
  if (statut) { where.push('l.statut = ?'); params.push(statut); }
  if (is_active !== undefined) { where.push('l.is_active = ?'); params.push(is_active); }
  const clause = `WHERE ${where.join(' AND ')}`;
  const db = getDb();
  const index = indexEntite(entiteId);
  const avecChemin = (r) => ({ ...r, chemin: cheminDe(index, r.id) });
  if (q && normaliser(q)) {
    // La recherche se fait ici et non en SQL : SQLite ne sait pas ignorer les accents ; le volume d'une entité est borné.
    const tous = db.prepare(`SELECT ${COLUMNS} ${FROM} ${clause} ORDER BY l.code LIMIT ?`).all(...params, ARBRE_MAX);
    const trouves = trouver(index, tous, q);
    return { rows: trouves.slice(offset, offset + limit).map(avecChemin), pagination: { total: trouves.length, limit, offset } };
  }
  const total = db.prepare(`SELECT COUNT(*) AS n ${FROM} ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} ${FROM} ${clause} ORDER BY l.code LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows: rows.map(avecChemin), pagination: { total, limit, offset } };
}

/** Arbre complet de l'entité active, sites en tête ; les lieux désactivés seulement sur demande. */
function arbre(user, { inclure_inactifs = 0 } = {}) {
  const entiteId = entiteActive(user);
  const rows = getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE l.entite_id = ? AND (l.is_active = 1 OR ? = 1) ORDER BY l.code LIMIT ?`)
    .all(entiteId, inclure_inactifs ? 1 : 0, ARBRE_MAX);
  const byId = new Map(rows.map((r) => [r.id, { ...r, enfants: [] }]));
  const racines = [];
  for (const n of byId.values()) {
    const p = n.parent_id ? byId.get(n.parent_id) : null;
    if (p) p.enfants.push(n);
    else if (!n.parent_id) racines.push(n);
  }
  return { racines, total: rows.length };
}

function get(user, id) {
  return load(user, id);
}

function assertCodeFree(entiteId, code, exceptId = 0) {
  if (getDb().prepare('SELECT 1 FROM lieux WHERE entite_id = ? AND code = ? AND id <> ?').get(entiteId, code, exceptId)) {
    throw new AppError(409, 'LIEU_CODE_DUPLICATE');
  }
}

/** Parent admis : même entité, actif, de la nature attendue (règles 1 et 2). */
function assertParent(entiteId, nature, parentId) {
  const admis = PARENTS[nature];
  if (!admis.length) {
    if (parentId) throw new AppError(409, 'LIEU_PARENT');
    return null;
  }
  if (!parentId) throw new AppError(409, 'LIEU_PARENT');
  const p = getDb().prepare('SELECT id, entite_id, nature, is_active, adresse, code_postal, commune FROM lieux WHERE id = ?').get(parentId);
  if (!p || p.entite_id !== entiteId || !admis.includes(p.nature)) throw new AppError(409, 'LIEU_PARENT');
  if (!p.is_active) throw new AppError(409, 'PARENT_INACTIF');
  return p;
}

function assertType(entiteId, nature, typeId, current = null) {
  if (typeId === undefined || typeId === null) {
    if (nature === 'local') throw new AppError(409, 'TYPE_REQUIS');
    return;
  }
  valeurs.assertUsable(entiteId, 'type_lieu', typeId, current);
}

function create(user, data, channel = 'api', { demo = false } = {}) {
  gestion(user);
  const entiteId = user.entiteId;
  const parent = assertParent(entiteId, data.nature, data.parent_id);
  assertType(entiteId, data.nature, data.type_id);
  assertCodeFree(entiteId, data.code);
  // Règle 5 : un bâtiment sans adresse reprend celle de son site.
  const sansAdresse = data.adresse === undefined && data.code_postal === undefined && data.commune === undefined;
  const adr = data.nature === 'batiment' && sansAdresse && parent
    ? { adresse: parent.adresse, code_postal: parent.code_postal, commune: parent.commune }
    : { adresse: data.adresse ?? null, code_postal: data.code_postal ?? null, commune: data.commune ?? null };
  const r = getDb().prepare(`INSERT INTO lieux (entite_id, parent_id, nature, code, nom_fr, nom_nl, type_id, adresse, code_postal, commune,
      surface_m2, statut, is_demo, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(entiteId, parent ? parent.id : null, data.nature, data.code, data.nom_fr, data.nom_nl, data.type_id ?? null,
      adr.adresse, adr.code_postal, adr.commune, data.surface_m2 ?? null, data.statut || 'en_service', demo ? 1 : 0, user.id, user.id);
  logAudit(user.id, 'lieu.create', 'lieu', r.lastInsertRowid, { code: data.code, nature: data.nature }, channel, user.entiteId);
  return load(user, r.lastInsertRowid);
}

function update(user, id, data, channel = 'api') {
  gestion(user);
  const l = load(user, id);
  if (!l.is_active && data.is_active !== 1) throw new AppError(409, 'CANCELLED');
  if (data.code !== undefined) assertCodeFree(l.entite_id, data.code, id);
  if (data.parent_id !== undefined) assertParent(l.entite_id, l.nature, data.parent_id);
  if (data.type_id !== undefined) assertType(l.entite_id, l.nature, data.type_id, l.type_id);
  if (data.is_active === 1 && !l.is_active && l.parent_id) {
    const p = getDb().prepare('SELECT is_active FROM lieux WHERE id = ?').get(l.parent_id);
    if (!p.is_active) throw new AppError(409, 'PARENT_INACTIF');
  }
  // Journal (0.4.1) : seuls les champs changés, avec l'ancienne et la nouvelle valeur ; rien n'est écrit sans changement.
  const diff = changements('lieux', id, data);
  if (diff) {
    const { sets, params } = safeBuildUpdate(diff.apres, ['id']);
    if (diff.apres.is_active === 1) sets.push('motif_desactivation = NULL');
    getDb().prepare(`UPDATE lieux SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, id);
    logAudit(user.id, diff.apres.is_active === 1 ? 'lieu.reactivate' : 'lieu.update', 'lieu', id,
      { code: l.code, ...diff }, channel, user.entiteId);
  }
  return load(user, id);
}

/** DELETE = désactivation avec motif ; refusée tant qu'un lieu actif dépend de celui-ci (règle 4). */
function deactivate(user, id, motif, channel = 'api') {
  gestion(user);
  const l = load(user, id);
  if (!l.is_active) throw new AppError(409, 'CANCELLED');
  const enfants = getDb().prepare('SELECT COUNT(*) AS n FROM lieux WHERE parent_id = ? AND is_active = 1').get(id).n;
  if (enfants) throw new AppError(409, 'LIEU_ENFANTS', [`${enfants}`]);
  getDb().prepare("UPDATE lieux SET is_active = 0, motif_desactivation = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(motif, user.id, id);
  logAudit(user.id, 'lieu.deactivate', 'lieu', id, { motif }, channel, user.entiteId);
  return load(user, id);
}

/* ---------- Photo (règle 6) ---------- */

function photoPath(name) {
  if (!PHOTO_NAME.test(name)) throw new AppError(500, 'INTERNAL');
  const p = path.resolve(PHOTOS_DIR, name);
  if (path.dirname(p) !== path.resolve(PHOTOS_DIR)) throw new AppError(500, 'INTERNAL');
  return p;
}

function eraseFile(name) {
  if (!name) return;
  try { fs.unlinkSync(photoPath(name)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}

/**
 * Dépose ou remplace la photo : contrôle du contenu (images.js), nom de fichier généré par le serveur,
 * écriture atomique, effacement réel de l'ancien fichier, ligne au journal sans contenu.
 */
function setPhoto(user, id, buf, announced, channel = 'api') {
  gestion(user);
  const l = load(user, id);
  if (!l.is_active) throw new AppError(409, 'CANCELLED');
  if (!Buffer.isBuffer(buf) || !buf.length) throw new AppError(400, 'FILE_TYPE');
  const clean = cleanPhoto(buf, announced);
  if (clean.error) throw new AppError(400, clean.error);
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  const name = `${crypto.randomBytes(16).toString('hex')}.${clean.type === 'image/png' ? 'png' : 'jpg'}`;
  const target = photoPath(name);
  fs.writeFileSync(`${target}.tmp`, clean.data);
  fs.renameSync(`${target}.tmp`, target);
  const old = getDb().prepare('SELECT photo_fichier FROM lieux WHERE id = ?').get(id).photo_fichier;
  getDb().prepare(`UPDATE lieux SET photo_fichier = ?, photo_type = ?, photo_octets = ?, photo_at = datetime('now'),
    updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(name, clean.type, clean.data.length, user.id, id);
  eraseFile(old);
  logAudit(user.id, old ? 'lieu.photo.replace' : 'lieu.photo.set', 'lieu', id,
    { type: clean.type, octets: clean.data.length, largeur: clean.width, hauteur: clean.height }, channel, user.entiteId);
  return load(user, id);
}

/** Fichier de la photo pour la route de lecture authentifiée ; 404 sans photo. */
function photoFile(user, id) {
  load(user, id);
  const p = getDb().prepare('SELECT photo_fichier, photo_type FROM lieux WHERE id = ?').get(id);
  if (!p.photo_fichier) throw new AppError(404, 'NO_PHOTO');
  const file = photoPath(p.photo_fichier);
  if (!fs.existsSync(file)) throw new AppError(404, 'NO_PHOTO');
  return { file, type: p.photo_type };
}

/** Suppression réelle : fichier effacé du disque, lien vidé, opération au journal d'audit. */
function deletePhoto(user, id, channel = 'api') {
  gestion(user);
  load(user, id);
  const p = getDb().prepare('SELECT photo_fichier FROM lieux WHERE id = ?').get(id);
  if (!p.photo_fichier) throw new AppError(404, 'NO_PHOTO');
  getDb().prepare(`UPDATE lieux SET photo_fichier = NULL, photo_type = NULL, photo_octets = NULL, photo_at = NULL,
    updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(user.id, id);
  eraseFile(p.photo_fichier);
  logAudit(user.id, 'lieu.photo.delete', 'lieu', id, null, channel, user.entiteId);
  return load(user, id);
}

module.exports = { normaliser, list, arbre, get, create, update, deactivate, setPhoto, photoFile, deletePhoto, gestion, PARENTS };
