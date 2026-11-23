/**
 * Prestataires externes du service technique (cahier des charges REF-07, EXT-03 ; version 0.19.0, étape 15, point 3).
 *   1. Un prestataire appartient à une entité : nom, numéro d'entreprise belge facultatif, langue de correspondance (FR ou
 *      NL, pour l'envoi d'une demande au prestataire, EXT-02, plus tard), personne de contact, téléphone, courriel, adresse,
 *      référence du marché ou du contrat de maintenance saisie librement (EXT-03 : aucun échange avec 3P Procura), corps
 *      de métier (valeurs actives de la liste « corps_metier » de l'entité ; une valeur déjà portée reste admise désactivée).
 *   2. Numéro d'entreprise : 10 chiffres commençant par 0 ou 1, points facultatifs, clé de contrôle modulo 97 ; rangé
 *      sous la forme 0123.456.789 ; unique dans l'entité (409 PRESTATAIRE_EXISTE). Un numéro faux : 409 NUMERO_ENTREPRISE_INVALIDE.
 *   3. Lecture : « prestataires:lire » (gestionnaire, responsable) ; écriture : « prestataires:gerer » (responsable).
 *      Cloison : l'entité active seule (SEC-01) ; un prestataire d'une autre entité rend 403.
 *   4. Aucune suppression : DELETE désactive avec un motif ; PUT is_active = 1 réactive.
 *   5. Journal : création (nom), champs changés (changements()), corps de métier changés (identifiants, nommés à la
 *      lecture), désactivation avec son motif. Les coordonnées du contact ne vont pas au journal à la création.
 */
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit, changements } = require('../audit');
const { rolesWith } = require('../roles');
const { avecTrace } = require('./trace');
const listes = require('./listes-valeurs');

const COLUMNS = `id, entite_id, nom, numero_entreprise, langue, contact_nom, telephone, courriel, adresse, code_postal, commune, reference_marche,
  is_active, motif_desactivation, is_demo, created_by, updated_by, created_at, updated_at`;
const LIST_COLUMNS = `p.id, p.entite_id, p.nom, p.numero_entreprise, p.langue, p.contact_nom, p.telephone, p.courriel, p.adresse, p.code_postal,
  p.commune, p.reference_marche, p.is_active, p.motif_desactivation, p.is_demo, p.created_by, p.updated_by, p.created_at, p.updated_at`;
const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}
function lecteur(user) {
  entiteActive(user);
  if (!peut(user, 'prestataires:lire') && !peut(user, 'prestataires:gerer')) throw new AppError(403, 'FORBIDDEN');
}
function gestion(user) {
  entiteActive(user);
  if (!peut(user, 'prestataires:gerer')) throw new AppError(403, 'FORBIDDEN');
}

/** Règle 2 : numéro d'entreprise belge normalisé (0123.456.789), ou erreur ; null reste null. */
function numeroEntreprise(v) {
  if (v === null || v === undefined || v === '') return null;
  const c = String(v).replace(/[.\s]/g, '');
  if (!/^[01]\d{9}$/.test(c) || 97 - (Number(c.slice(0, 8)) % 97) !== Number(c.slice(8))) throw new AppError(409, 'NUMERO_ENTREPRISE_INVALIDE');
  return `${c.slice(0, 4)}.${c.slice(4, 7)}.${c.slice(7)}`;
}

function load(user, id) {
  const p = getDb().prepare(`SELECT ${COLUMNS} FROM prestataires WHERE id = ?`).get(id);
  if (!p) throw new AppError(404, 'NOT_FOUND');
  if (p.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  return p;
}

const corpsDe = (id) => getDb().prepare(`SELECT v.id, v.code, v.libelle_fr, v.libelle_nl, v.is_active FROM prestataire_corps c
  JOIN listes_valeurs v ON v.id = c.valeur_id WHERE c.prestataire_id = ? ORDER BY v.ordre, v.libelle_fr`).all(id);
const fiche = (user, p) => ({ ...avecTrace(user, p), corps_metier: corpsDe(p.id) });

function numeroLibre(entiteId, numero, saufId = 0) {
  if (numero && getDb().prepare('SELECT 1 FROM prestataires WHERE entite_id = ? AND numero_entreprise = ? AND id <> ?').get(entiteId, numero, saufId)) {
    throw new AppError(409, 'PRESTATAIRE_EXISTE');
  }
}

function controlerCorps(entiteId, ids, actuels = []) {
  for (const v of ids) listes.assertUsable(entiteId, 'corps_metier', v, actuels.includes(v) ? v : undefined);
}

/** Remplace les corps de métier ; rend { avant, apres } (identifiants triés) ou null sans changement. */
function ecrireCorps(id, ids) {
  const db = getDb();
  const tri = (l) => [...new Set(l)].sort((a, b) => a - b);
  const avant = tri(db.prepare('SELECT valeur_id FROM prestataire_corps WHERE prestataire_id = ?').all(id).map((x) => x.valeur_id));
  const apres = tri(ids);
  if (JSON.stringify(avant) === JSON.stringify(apres)) return null;
  db.prepare('DELETE FROM prestataire_corps WHERE prestataire_id = ?').run(id);
  for (const v of apres) db.prepare('INSERT INTO prestataire_corps (prestataire_id, valeur_id) VALUES (?, ?)').run(id, v);
  return { avant, apres };
}

function list(user, { limit = 50, offset = 0, q, is_active: actif, corps_metier_id: corps } = {}) {
  lecteur(user);
  const where = ['p.entite_id = ?'];
  const params = [user.entiteId];
  if (actif !== undefined) { where.push('p.is_active = ?'); params.push(actif); }
  if (q) { where.push('(p.nom LIKE ? OR p.numero_entreprise LIKE ? OR p.reference_marche LIKE ? OR p.contact_nom LIKE ?)'); params.push(...Array(4).fill(`%${q}%`)); }
  if (corps) { where.push('EXISTS (SELECT 1 FROM prestataire_corps c WHERE c.prestataire_id = p.id AND c.valeur_id = ?)'); params.push(corps); }
  const clause = `WHERE ${where.join(' AND ')}`;
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM prestataires p ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${LIST_COLUMNS} FROM prestataires p ${clause}
    ORDER BY p.is_active DESC, p.nom LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows: rows.map((x) => fiche(user, x)), pagination: { total, limit, offset } };
}

function get(user, id) {
  lecteur(user);
  return fiche(user, load(user, id));
}

const CHAMPS = ['nom', 'numero_entreprise', 'langue', 'contact_nom', 'telephone', 'courriel', 'adresse', 'code_postal', 'commune', 'reference_marche'];
/** Champs texte : espaces retirés aux bords, vide → null (nom obligatoire contrôlé par le schéma). */
function nettoyer(data) {
  const out = {};
  for (const k of CHAMPS) {
    if (data[k] === undefined) continue;
    const v = typeof data[k] === 'string' ? data[k].trim() : data[k];
    out[k] = v === '' ? null : v;
  }
  if (out.nom === null) throw new AppError(400, 'VALIDATION');
  if (out.numero_entreprise !== undefined) out.numero_entreprise = numeroEntreprise(out.numero_entreprise);
  return out;
}

function create(user, data, channel = 'api') {
  gestion(user);
  const entiteId = user.entiteId;
  const v = nettoyer(data);
  numeroLibre(entiteId, v.numero_entreprise);
  controlerCorps(entiteId, data.corps_metier || []);
  const db = getDb();
  const id = db.transaction(() => {
    const r = db.prepare(`INSERT INTO prestataires (entite_id, nom, numero_entreprise, langue, contact_nom, telephone, courriel, adresse, code_postal,
      commune, reference_marche, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(entiteId, v.nom, v.numero_entreprise ?? null, v.langue || 'fr', v.contact_nom ?? null, v.telephone ?? null, v.courriel ?? null,
        v.adresse ?? null, v.code_postal ?? null, v.commune ?? null, v.reference_marche ?? null, user.id, user.id);
    const nouveau = r.lastInsertRowid;
    ecrireCorps(nouveau, data.corps_metier || []);
    logAudit(user.id, 'prestataire.create', 'prestataire', nouveau, { nom: v.nom, numero_entreprise: v.numero_entreprise ?? null, corps_metier: data.corps_metier || [] }, channel, entiteId);
    return nouveau;
  })();
  return fiche(user, load(user, id));
}

function update(user, id, data, channel = 'api') {
  gestion(user);
  const p = load(user, id);
  const { corps_metier: corps, is_active: actif } = data;
  const v = nettoyer(data);
  if (actif === 1) v.is_active = 1;
  if (v.numero_entreprise) numeroLibre(p.entite_id, v.numero_entreprise, id);
  if (corps) controlerCorps(p.entite_id, corps, corpsDe(id).map((c) => c.id));
  const db = getDb();
  db.transaction(() => {
    const diff = changements('prestataires', id, v);
    const details = { ...(diff || {}) };
    if (diff) {
      const { sets, params } = safeBuildUpdate(diff.apres, ['id']);
      if (diff.apres.is_active === 1) sets.push('motif_desactivation = NULL');
      db.prepare(`UPDATE prestataires SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, id);
    }
    if (corps) {
      const c = ecrireCorps(id, corps);
      if (c) details.corps_metier = c;
    }
    if (Object.keys(details).length) {
      if (!diff) db.prepare("UPDATE prestataires SET updated_by = ?, updated_at = datetime('now') WHERE id = ?").run(user.id, id);
      logAudit(user.id, 'prestataire.update', 'prestataire', id, details, channel, p.entite_id);
    }
  })();
  return fiche(user, load(user, id));
}

function deactivate(user, id, motif, channel = 'api') {
  gestion(user);
  const p = load(user, id);
  if (!p.is_active) throw new AppError(409, 'CANCELLED');
  getDb().prepare("UPDATE prestataires SET is_active = 0, motif_desactivation = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(motif, user.id, id);
  logAudit(user.id, 'prestataire.deactivate', 'prestataire', id, { motif }, channel, p.entite_id);
  return fiche(user, load(user, id));
}

function resumeDesactivation(user, id, motif) {
  gestion(user);
  const p = load(user, id);
  if (!p.is_active) throw new AppError(409, 'CANCELLED');
  return { action: 'deactivate_prestataire', prestataire: { id: p.id, nom: p.nom, numero_entreprise: p.numero_entreprise }, motif };
}

module.exports = { list, get, create, update, deactivate, resumeDesactivation, numeroEntreprise };
