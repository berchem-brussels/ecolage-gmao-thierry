/**
 * Paramètres métier par entité (cahier des charges ADM-03 ; standard v3.2, sections 11.3 et 11.4).
 * Le catalogue config/parametres-entite.json dit quelles clés existent, avec leur libellé, leur description, leur type
 * et leur défaut livré ; la table parametres_entite porte la valeur de chaque entité, qui prime. Une valeur NULL veut
 * dire « retour au défaut » : la ligne garde l'auteur et la date.
 * Lecture : toute personne qui a un rôle dans l'entité active. Écriture : rôle qui porte « parametres:gerer »
 * (responsable du service technique). Cloison : seule l'entité active se lit et s'écrit (SEC-01).
 * Chaque changement s'inscrit au journal d'audit avec l'entité, l'ancienne et la nouvelle valeur.
 * 0.7.0 (RGPD-10) : groupe « rgpd », mentions d'information FR et NL et contact du DPO de l'entité ; type texte_long
 * (plusieurs lignes) dont seules les variables du catalogue sont permises ; protectionDonnees() rend les textes prêts à
 * afficher (valeur vide : texte livré ; {entite} et {dpo} remplacés).
 */
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { rolesWith } = require('../roles');

const CATALOGUE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'parametres-entite.json'), 'utf8'));
const PARAMETRES = CATALOGUE.parametres;
const GROUPES = CATALOGUE.groupes;
const TELEPHONE = /^\+?[0-9][0-9 ./()-]{5,29}$/;
const COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}

function gestion(user) {
  entiteActive(user);
  if (!user.roles.some((r) => rolesWith('parametres:gerer').includes(r))) throw new AppError(403, 'FORBIDDEN');
}

function trouver(cle) {
  const p = PARAMETRES.find((x) => x.cle === cle);
  if (!p) throw new AppError(404, 'NOT_FOUND');
  return p;
}

/** Valeur en vigueur d'une clé pour une entité : celle de l'entité si elle existe, sinon le défaut livré. */
function valeur(entiteId, cle) {
  const p = trouver(cle);
  const row = getDb().prepare('SELECT valeur FROM parametres_entite WHERE entite_id = ? AND cle = ?').get(entiteId, cle);
  return row && row.valeur !== null ? row.valeur : p.defaut;
}

function fiche(entiteId, p) {
  const row = getDb().prepare('SELECT valeur, updated_by, updated_at FROM parametres_entite WHERE entite_id = ? AND cle = ?').get(entiteId, p.cle);
  const enBase = row && row.valeur !== null;
  return {
    entite_id: entiteId, cle: p.cle, groupe: p.groupe, type: p.type, max: p.max ?? null, min: p.min ?? null,
    requis: !!p.requis, motif: p.motif ?? null, choix: p.choix ?? null, variables: p.variables ?? null,
    libelle_fr: p.libelle_fr, libelle_nl: p.libelle_nl, description_fr: p.description_fr, description_nl: p.description_nl,
    valeur: enBase ? row.valeur : p.defaut, defaut: p.defaut, est_defaut: !enBase,
    updated_at: row ? row.updated_at : null, updated_by: row ? row.updated_by : null,
  };
}

function list(user, { limit = 50, offset = 0, groupe } = {}) {
  const entiteId = entiteActive(user);
  const rows = PARAMETRES.filter((p) => !groupe || p.groupe === groupe);
  return { rows: rows.slice(offset, offset + limit).map((p) => fiche(entiteId, p)), pagination: { total: rows.length, limit, offset } };
}

function get(user, cle) {
  return fiche(entiteActive(user), trouver(cle));
}

/** Contrôle selon le type du catalogue ; rend la valeur nettoyée (texte) ou lève VALIDATION avec le motif. */
function controler(p, brute) {
  const v = String(brute ?? '').trim();
  const non = (motif) => { throw new AppError(400, 'VALIDATION', [`valeur: ${motif}`]); };
  if (p.type === 'entier') {
    if (!/^\d+$/.test(v)) non('nombre entier attendu');
    const n = Number(v);
    if ((p.min !== undefined && n < p.min) || (p.max !== undefined && n > p.max)) non(`entre ${p.min} et ${p.max}`);
    return String(n);
  }
  if (p.type === 'choix') {
    if (!p.choix.some((c) => c.valeur === v)) non(p.choix.map((c) => c.valeur).join(', '));
    return v;
  }
  if (p.requis && !v) non('valeur obligatoire');
  if (p.motif && v && !new RegExp(p.motif).test(v)) non(`format attendu ${p.motif}`);
  if (p.type === 'telephone' && v && !TELEPHONE.test(v)) non('numéro de téléphone attendu');
  if (p.type === 'courriel' && (v.length > 200 || (v && !COURRIEL.test(v)))) non('adresse électronique attendue');
  if (p.max && (p.type === 'texte' || p.type === 'texte_long') && v.length > p.max) non(`${p.max} caractères au plus`);
  if (p.type === 'texte_long') {
    // Seules les variables du catalogue ({entite}, {dpo}) : une faute de frappe se verrait telle quelle à l'écran.
    const inconnues = [...v.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]).filter((x) => !(p.variables || []).includes(x));
    if (inconnues.length) non(`variable inconnue {${inconnues[0]}} ; permises : ${(p.variables || []).map((x) => `{${x}}`).join(', ')}`);
  }
  return v;
}

function ecrire(user, entiteId, cle, v) {
  getDb().prepare(`INSERT INTO parametres_entite (entite_id, cle, valeur, created_by, updated_by) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(entite_id, cle) DO UPDATE SET valeur = excluded.valeur, updated_by = excluded.updated_by, updated_at = datetime('now')`)
    .run(entiteId, cle, v, user.id, user.id);
}

function update(user, cle, brute, channel = 'api') {
  gestion(user);
  const p = trouver(cle);
  const entiteId = user.entiteId;
  const v = controler(p, brute);
  // Un texte long vidé revient au texte livré (RGPD-10) : l'écran montre de nouveau le texte et la mention « Valeur livrée ».
  if (p.type === 'texte_long' && v === '') return reset(user, cle, channel);
  const avant = valeur(entiteId, cle);
  if (v === avant) return fiche(entiteId, p);
  ecrire(user, entiteId, cle, v);
  logAudit(user.id, 'parametre_entite.update', 'parametre_entite', null, { cle, avant, apres: v }, channel, entiteId);
  return fiche(entiteId, p);
}

/** DELETE = retour au défaut livré pour l'entité active. */
function reset(user, cle, channel = 'api') {
  gestion(user);
  const p = trouver(cle);
  const entiteId = user.entiteId;
  if (fiche(entiteId, p).est_defaut) return fiche(entiteId, p);
  const avant = valeur(entiteId, cle);
  ecrire(user, entiteId, cle, null);
  logAudit(user.id, 'parametre_entite.reset', 'parametre_entite', null, { cle, avant, apres: p.defaut }, channel, entiteId);
  return fiche(entiteId, p);
}

/** Contact du DPO absent : la phrase renvoie au responsable, jamais un trou (décision du 28/10/2026). */
const SANS_DPO = { fr: 'adressez-vous à votre responsable', nl: 'wend u tot uw verantwoordelijke' };

/**
 * Mentions d'information de l'entité (RGPD-10), prêtes à afficher : courte et complète en FR et en NL, contact du DPO
 * (null s'il n'est pas réglé). Une valeur vide reprend le texte livré.
 */
function protectionDonnees(entiteId) {
  const e = getDb().prepare('SELECT nom_fr, nom_nl FROM entites WHERE id = ?').get(entiteId) || {};
  const texte = (cle) => valeur(entiteId, cle) || trouver(cle).defaut;
  const dpo = valeur(entiteId, 'rgpd.dpo_contact') || '';
  const remplir = (s, lang) => s.replace(/\{entite\}/g, (lang === 'nl' ? e.nom_nl : e.nom_fr) || '').replace(/\{dpo\}/g, dpo || SANS_DPO[lang]);
  return {
    mention_courte_fr: remplir(texte('rgpd.mention_courte_fr'), 'fr'), mention_courte_nl: remplir(texte('rgpd.mention_courte_nl'), 'nl'),
    mention_fr: remplir(texte('rgpd.mention_fr'), 'fr'), mention_nl: remplir(texte('rgpd.mention_nl'), 'nl'),
    dpo_contact: dpo || null,
  };
}

module.exports = { PARAMETRES, GROUPES, valeur, gestion, list, get, update, reset, protectionDonnees };
