/**
 * Équipes du service technique et profil des ouvriers (cahier des charges ROL-05 ; version 0.19.0, étape 15, point 2 ;
 * DV-28, DV-155).
 *   1. Une équipe appartient à une entité : code (unique dans l'entité), nom FR et NL, chef facultatif, ordre. Lecture :
 *      « equipes:lire » (gestionnaire, responsable, chef d'équipe) ; écriture : « equipes:gerer » (responsable). Cloison :
 *      l'entité active seule (SEC-01) ; une équipe d'une autre entité rend 403.
 *   2. Chef : un compte actif qui a, dans l'entité, un rôle portant « equipes:diriger » (chef d'équipe livré) ; sinon
 *      409 CHEF_SANS_ROLE. Membres : comptes actifs qui ont, dans l'entité, un rôle portant « interventions:realiser »
 *      (ouvrier, chef d'équipe) ; sinon 409 MEMBRE_SANS_ROLE avec l'identifiant fautif. Un ouvrier peut être membre de
 *      plusieurs équipes ; le chef n'est pas forcément membre.
 *   3. Horaire de l'équipe (DV-28 : balayeurs du week-end) : au plus un créneau par jour (1 = lundi … 7 = dimanche),
 *      « HH:MM » à Bruxelles, début avant la fin (409 HORAIRE_INVALIDE). Liste vide : l'équipe suit l'horaire de
 *      l'entité (calendrier des délais, DV-27). L'horaire envoyé remplace le précédent en entier ; de même les membres.
 *   4. Aucune suppression : DELETE désactive avec un motif ; PUT is_active = 1 réactive. Une équipe désactivée garde ses
 *      membres et son horaire.
 *   5. Profil d'un ouvrier, propre à l'entité active : corps de métier (liste « corps_metier ») et compétences (liste
 *      « competence ») ; valeurs actives de l'entité seulement (409 VALEUR_INVALIDE), une valeur déjà portée reste admise
 *      désactivée. Un compte qui n'a pas « interventions:realiser » dans l'entité n'est pas un ouvrier : 404.
 *   6. Journal : création, champs changés (changements()), membres ajoutés et retirés, horaire changé, désactivation
 *      avec son motif, profil d'ouvrier changé ; des identifiants seulement, nommés à la lecture du journal.
 */
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit, changements } = require('../audit');
const { rolesWith } = require('../roles');
const { avecTrace } = require('./trace');
const listes = require('./listes-valeurs');

const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}
function lecteur(user) {
  entiteActive(user);
  if (!peut(user, 'equipes:lire') && !peut(user, 'equipes:gerer')) throw new AppError(403, 'FORBIDDEN');
}
function gestion(user) {
  entiteActive(user);
  if (!peut(user, 'equipes:gerer')) throw new AppError(403, 'FORBIDDEN');
}

/** Comptes actifs qui ont, dans l'entité, un rôle actif portant la permission (ensemble d'identifiants). */
function porteurs(entiteId, permission) {
  const roles = rolesWith(permission);
  if (!roles.length) return new Set();
  const inQ = roles.map(() => '?').join(', ');
  return new Set(getDb().prepare(`SELECT DISTINCT r.user_id AS id FROM user_roles r JOIN users u ON u.id = r.user_id
    WHERE r.entite_id = ? AND r.is_active = 1 AND u.is_active = 1 AND r.role IN (${inQ})`).all(entiteId, ...roles).map((x) => x.id));
}

// ============================== Équipes ==============================

const COLUMNS = `q.id, q.entite_id, q.code, q.nom_fr, q.nom_nl, q.chef_id, q.ordre, q.is_active, q.motif_desactivation, q.is_demo,
  q.created_by, q.updated_by, q.created_at, q.updated_at, c.first_name AS chef_prenom, c.last_name AS chef_nom,
  (SELECT COUNT(*) FROM equipe_membres m JOIN users mu ON mu.id = m.user_id WHERE m.equipe_id = q.id AND mu.is_active = 1) AS nb_membres`;
const FROM = 'FROM equipes q LEFT JOIN users c ON c.id = q.chef_id';

function load(user, id) {
  const q = getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE q.id = ?`).get(id);
  if (!q) throw new AppError(404, 'NOT_FOUND');
  if (q.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  return q;
}

const horaireDe = (id) => getDb().prepare('SELECT jour, debut, fin FROM equipe_horaires WHERE equipe_id = ? ORDER BY jour').all(id);
const membresDe = (id) => getDb().prepare(`SELECT u.id, u.first_name AS prenom, u.last_name AS nom FROM equipe_membres m
  JOIN users u ON u.id = m.user_id WHERE m.equipe_id = ? AND u.is_active = 1 ORDER BY u.last_name, u.first_name`).all(id);

function fiche(user, q) {
  return { ...avecTrace(user, q), horaire: horaireDe(q.id), membres: membresDe(q.id) };
}

/** Règle 3 : un créneau par jour, heures valides, début avant la fin. */
function controlerHoraire(horaire) {
  const jours = new Set();
  for (const h of horaire) {
    if (jours.has(h.jour) || !(h.debut < h.fin) || h.fin > '24:00') throw new AppError(409, 'HORAIRE_INVALIDE', { jour: h.jour });
    jours.add(h.jour);
  }
}

/** Règle 2 : chef et membres admissibles dans l'entité. */
function controlerPersonnes(entiteId, { chef_id: chef, membres }) {
  if (chef && !porteurs(entiteId, 'equipes:diriger').has(chef)) throw new AppError(409, 'CHEF_SANS_ROLE', { chef_id: chef });
  if (membres) {
    const ok = porteurs(entiteId, 'interventions:realiser');
    const fautif = membres.find((m) => !ok.has(m));
    if (fautif) throw new AppError(409, 'MEMBRE_SANS_ROLE', { user_id: fautif });
  }
}

function codeLibre(entiteId, code, saufId = 0) {
  if (getDb().prepare('SELECT 1 FROM equipes WHERE entite_id = ? AND code = ? AND id <> ?').get(entiteId, code, saufId)) {
    throw new AppError(409, 'EQUIPE_CODE_EXISTE');
  }
}

function ecrireMembres(id, membres, userId) {
  const db = getDb();
  const avant = db.prepare('SELECT user_id FROM equipe_membres WHERE equipe_id = ?').all(id).map((x) => x.user_id);
  const voulus = [...new Set(membres)];
  const ajoutes = voulus.filter((m) => !avant.includes(m));
  const retires = avant.filter((m) => !voulus.includes(m));
  for (const m of retires) db.prepare('DELETE FROM equipe_membres WHERE equipe_id = ? AND user_id = ?').run(id, m);
  for (const m of ajoutes) db.prepare('INSERT INTO equipe_membres (equipe_id, user_id, created_by) VALUES (?, ?, ?)').run(id, m, userId);
  return ajoutes.length || retires.length ? { membres_ajoutes: ajoutes, membres_retires: retires } : null;
}

function ecrireHoraire(id, horaire) {
  const db = getDb();
  const avant = horaireDe(id);
  const apres = [...horaire].sort((a, b) => a.jour - b.jour).map(({ jour, debut, fin }) => ({ jour, debut, fin }));
  if (JSON.stringify(avant) === JSON.stringify(apres)) return null;
  db.prepare('DELETE FROM equipe_horaires WHERE equipe_id = ?').run(id);
  for (const h of apres) db.prepare('INSERT INTO equipe_horaires (equipe_id, jour, debut, fin) VALUES (?, ?, ?, ?)').run(id, h.jour, h.debut, h.fin);
  return { horaire: { avant, apres } };
}

function list(user, { limit = 50, offset = 0, q, is_active: actif } = {}) {
  lecteur(user);
  const where = ['q.entite_id = ?'];
  const params = [user.entiteId];
  if (actif !== undefined) { where.push('q.is_active = ?'); params.push(actif); }
  if (q) { where.push('(q.code LIKE ? OR q.nom_fr LIKE ? OR q.nom_nl LIKE ?)'); params.push(...Array(3).fill(`%${q}%`)); }
  const clause = `WHERE ${where.join(' AND ')}`;
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM equipes q ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} ${FROM} ${clause} ORDER BY q.is_active DESC, q.ordre, q.nom_fr LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { rows: rows.map((x) => fiche(user, x)), pagination: { total, limit, offset } };
}

function get(user, id) {
  lecteur(user);
  return fiche(user, load(user, id));
}

function create(user, data, channel = 'api') {
  gestion(user);
  const entiteId = user.entiteId;
  codeLibre(entiteId, data.code);
  controlerPersonnes(entiteId, data);
  controlerHoraire(data.horaire || []);
  const db = getDb();
  const id = db.transaction(() => {
    const ordre = data.ordre ?? db.prepare('SELECT COALESCE(MAX(ordre), 0) + 10 AS o FROM equipes WHERE entite_id = ?').get(entiteId).o;
    const r = db.prepare(`INSERT INTO equipes (entite_id, code, nom_fr, nom_nl, chef_id, ordre, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(entiteId, data.code, data.nom_fr, data.nom_nl, data.chef_id || null, ordre, user.id, user.id);
    const nouveau = r.lastInsertRowid;
    ecrireMembres(nouveau, data.membres || [], user.id);
    ecrireHoraire(nouveau, data.horaire || []);
    logAudit(user.id, 'equipe.create', 'equipe', nouveau, { code: data.code, nom_fr: data.nom_fr, chef_id: data.chef_id || null,
      membres: data.membres || [], horaire: horaireDe(nouveau) }, channel, entiteId);
    return nouveau;
  })();
  return fiche(user, load(user, id));
}

function update(user, id, data, channel = 'api') {
  gestion(user);
  const q = load(user, id);
  const { membres, horaire, ...champs } = data;
  if (champs.code !== undefined) codeLibre(q.entite_id, champs.code, id);
  controlerPersonnes(q.entite_id, { chef_id: champs.chef_id, membres });
  if (horaire) controlerHoraire(horaire);
  const db = getDb();
  db.transaction(() => {
    const diff = changements('equipes', id, champs);
    const details = { ...(diff || {}) };
    if (diff) {
      const { sets, params } = safeBuildUpdate(diff.apres, ['id']);
      if (diff.apres.is_active === 1) sets.push('motif_desactivation = NULL');
      db.prepare(`UPDATE equipes SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, id);
    }
    if (membres) Object.assign(details, ecrireMembres(id, membres, user.id) || {});
    if (horaire) Object.assign(details, ecrireHoraire(id, horaire) || {});
    if (Object.keys(details).length) {
      if (!diff) db.prepare("UPDATE equipes SET updated_by = ?, updated_at = datetime('now') WHERE id = ?").run(user.id, id);
      logAudit(user.id, 'equipe.update', 'equipe', id, details, channel, q.entite_id);
    }
  })();
  return fiche(user, load(user, id));
}

/** DELETE = désactivation avec motif : l'équipe garde ses membres et son horaire. */
function deactivate(user, id, motif, channel = 'api') {
  gestion(user);
  const q = load(user, id);
  if (!q.is_active) throw new AppError(409, 'CANCELLED');
  getDb().prepare("UPDATE equipes SET is_active = 0, motif_desactivation = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(motif, user.id, id);
  logAudit(user.id, 'equipe.deactivate', 'equipe', id, { motif }, channel, q.entite_id);
  return fiche(user, load(user, id));
}

/** Résumé avant la désactivation par le MCP (deux appels). */
function resumeDesactivation(user, id, motif) {
  gestion(user);
  const q = load(user, id);
  if (!q.is_active) throw new AppError(409, 'CANCELLED');
  return { action: 'deactivate_equipe', equipe: { id: q.id, code: q.code, nom_fr: q.nom_fr, nom_nl: q.nom_nl, nb_membres: q.nb_membres }, motif };
}

// ============================== Ouvriers ==============================

/** Ouvrier de l'entité : profil, compétences et équipes actives. */
function profil(entiteId, u) {
  const db = getDb();
  const corps = db.prepare(`SELECT v.id, v.code, v.libelle_fr, v.libelle_nl, v.is_active FROM ouvrier_profils p
    JOIN listes_valeurs v ON v.id = p.corps_metier_id WHERE p.user_id = ? AND p.entite_id = ?`).get(u.id, entiteId) || null;
  const competences = db.prepare(`SELECT v.id, v.code, v.libelle_fr, v.libelle_nl, v.is_active FROM ouvrier_competences c
    JOIN listes_valeurs v ON v.id = c.valeur_id WHERE c.user_id = ? AND c.entite_id = ? ORDER BY v.ordre, v.libelle_fr`).all(u.id, entiteId);
  const equipes = db.prepare(`SELECT q.id, q.code, q.nom_fr, q.nom_nl FROM equipe_membres m JOIN equipes q ON q.id = m.equipe_id
    WHERE m.user_id = ? AND q.entite_id = ? AND q.is_active = 1 ORDER BY q.ordre, q.nom_fr`).all(u.id, entiteId);
  const chefDe = db.prepare('SELECT id, code, nom_fr, nom_nl FROM equipes WHERE chef_id = ? AND entite_id = ? AND is_active = 1 ORDER BY ordre')
    .all(u.id, entiteId);
  return { id: u.id, prenom: u.first_name, nom: u.last_name, corps_metier: corps, competences, equipes, chef_de: chefDe,
    peut_diriger: porteurs(entiteId, 'equipes:diriger').has(u.id) ? 1 : 0 };
}

function listOuvriers(user, { limit = 50, offset = 0, q, equipe_id: equipe, corps_metier_id: corps, competence_id: comp } = {}) {
  lecteur(user);
  const entiteId = user.entiteId;
  const ids = [...porteurs(entiteId, 'interventions:realiser')];
  if (!ids.length) return { rows: [], pagination: { total: 0, limit, offset } };
  const where = [`u.id IN (${ids.map(() => '?').join(', ')})`];
  const params = [...ids];
  if (q) { where.push('(u.first_name LIKE ? OR u.last_name LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (equipe) { where.push('EXISTS (SELECT 1 FROM equipe_membres m JOIN equipes e ON e.id = m.equipe_id WHERE m.user_id = u.id AND e.id = ? AND e.entite_id = ?)'); params.push(equipe, entiteId); }
  if (corps) { where.push('EXISTS (SELECT 1 FROM ouvrier_profils p WHERE p.user_id = u.id AND p.entite_id = ? AND p.corps_metier_id = ?)'); params.push(entiteId, corps); }
  if (comp) { where.push('EXISTS (SELECT 1 FROM ouvrier_competences c WHERE c.user_id = u.id AND c.entite_id = ? AND c.valeur_id = ?)'); params.push(entiteId, comp); }
  const clause = `WHERE ${where.join(' AND ')}`;
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM users u ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT u.id, u.first_name, u.last_name FROM users u ${clause} ORDER BY u.last_name, u.first_name LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { rows: rows.map((u) => profil(entiteId, u)), pagination: { total, limit, offset } };
}

function loadOuvrier(user, id) {
  const entiteId = entiteActive(user);
  if (!porteurs(entiteId, 'interventions:realiser').has(id)) throw new AppError(404, 'NOT_FOUND');
  return getDb().prepare('SELECT id, first_name, last_name FROM users WHERE id = ?').get(id);
}

function getOuvrier(user, id) {
  lecteur(user);
  return profil(user.entiteId, loadOuvrier(user, id));
}

/** Règle 5 : corps de métier (null pour retirer) et compétences (liste complète) ; seuls les champs envoyés changent. */
function updateOuvrier(user, id, data, channel = 'api') {
  gestion(user);
  const u = loadOuvrier(user, id);
  const entiteId = user.entiteId;
  const avant = profil(entiteId, u);
  if (data.corps_metier_id) listes.assertUsable(entiteId, 'corps_metier', data.corps_metier_id, avant.corps_metier?.id);
  const voulues = data.competences ? [...new Set(data.competences)] : null;
  for (const c of voulues || []) listes.assertUsable(entiteId, 'competence', c, avant.competences.some((x) => x.id === c) ? c : undefined);
  const db = getDb();
  db.transaction(() => {
    if (data.corps_metier_id !== undefined) {
      db.prepare(`INSERT INTO ouvrier_profils (user_id, entite_id, corps_metier_id, updated_by) VALUES (?, ?, ?, ?)
        ON CONFLICT (user_id, entite_id) DO UPDATE SET corps_metier_id = excluded.corps_metier_id, updated_by = excluded.updated_by,
        updated_at = datetime('now')`).run(id, entiteId, data.corps_metier_id, user.id);
    }
    if (voulues) {
      db.prepare('DELETE FROM ouvrier_competences WHERE user_id = ? AND entite_id = ?').run(id, entiteId);
      for (const c of voulues) db.prepare('INSERT INTO ouvrier_competences (user_id, entite_id, valeur_id) VALUES (?, ?, ?)').run(id, entiteId, c);
    }
  })();
  const apres = profil(entiteId, u);
  // Journal : identifiants des valeurs, nommés à la lecture dans la langue de l'écran (journal.js, 0.19.0).
  const details = {};
  if ((avant.corps_metier?.id ?? null) !== (apres.corps_metier?.id ?? null)) {
    details.corps_metier = { avant: avant.corps_metier?.id ?? null, apres: apres.corps_metier?.id ?? null };
  }
  const ids = (p) => p.competences.map((c) => c.id).sort((a, b) => a - b);
  if (JSON.stringify(ids(avant)) !== JSON.stringify(ids(apres))) details.competences = { avant: ids(avant), apres: ids(apres) };
  if (Object.keys(details).length) logAudit(user.id, 'ouvrier.update', 'ouvrier', id, details, channel, entiteId);
  return apres;
}

module.exports = { list, get, create, update, deactivate, resumeDesactivation, listOuvriers, getOuvrier, updateOuvrier, porteurs };
