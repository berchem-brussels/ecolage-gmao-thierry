/**
 * Paramètres de l'instance (cahier des charges ADM-01 ; standard v3.2, sections 11.3, 11.4 et 17.3).
 * Le catalogue config/parametres-instance.json dit quelles clés se règlent, avec leur libellé, leur description FR et NL
 * et leur validation ; le défaut livré vient de config/instance.defaut.json ; la base (app_settings) porte la valeur
 * de l'instance, qui prime. Une valeur NULL en base veut dire « retour au défaut » : la ligne garde l'auteur et la date.
 * Lecture et écriture réservées à l'administrateur ; chaque changement s'inscrit au journal d'audit avec l'ancienne
 * et la nouvelle valeur (aucun secret dans ce catalogue). Les paramètres publics servent la page de connexion.
 */
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { refuser } = require('./refus-reglage');
const { logAudit } = require('../audit');
const { ROLES } = require('../roles');

const CONFIG = path.join(__dirname, '..', '..', 'config');
const DEFAULTS = JSON.parse(fs.readFileSync(path.join(CONFIG, 'instance.defaut.json'), 'utf8'));
const CATALOGUE = JSON.parse(fs.readFileSync(path.join(CONFIG, 'parametres-instance.json'), 'utf8'));
const PARAMETRES = CATALOGUE.parametres;
const CLES = PARAMETRES.map((p) => p.cle);

function defaut(cle) {
  const [groupe, nom] = cle.split('.');
  return DEFAULTS[groupe] ? DEFAULTS[groupe][nom] : undefined;
}

/** Valeur en vigueur d'une clé de l'instance : celle de la base si elle existe, sinon le défaut livré. */
function valeur(cle) {
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(cle);
  return row && row.value !== null ? row.value : defaut(cle);
}

/** Défauts livrés surchargés par la base, pour les groupes connus de instance.defaut.json (app, theme). */
function instanceSettings() {
  const out = JSON.parse(JSON.stringify(DEFAULTS));
  for (const row of getDb().prepare('SELECT key, value FROM app_settings WHERE value IS NOT NULL').all()) {
    const [groupe, nom] = row.key.split('.');
    if (out[groupe] && nom in out[groupe] && !String(row.key).includes('secret')) out[groupe][nom] = row.value;
  }
  return out;
}

/**
 * Paramètres servis sans session à la page de connexion : seulement ceux que le catalogue marque publics, et la palette.
 * Les autres groupes (tickets, depuis la 0.11.0) ne sont jamais servis sans session.
 */
function publicSettings() {
  const s = instanceSettings();
  const prives = PARAMETRES.filter((p) => !p.public && p.cle.startsWith('app.')).map((p) => p.cle.split('.')[1]);
  for (const nom of prives) delete s.app[nom];
  return { app: s.app, theme: s.theme };
}

const admin = (user) => { if (!user || user.role !== 'admin') throw new AppError(403, 'FORBIDDEN'); };

function fiche(p) {
  const row = getDb().prepare('SELECT value, updated_by, updated_at FROM app_settings WHERE key = ?').get(p.cle);
  const enBase = row && row.value !== null;
  return {
    cle: p.cle, groupe: p.groupe, type: p.type, requis: !!p.requis, max: p.max || null, choix: p.choix || null,
    libelle_fr: p.libelle_fr, libelle_nl: p.libelle_nl, description_fr: p.description_fr, description_nl: p.description_nl,
    valeur: enBase ? row.value : defaut(p.cle), defaut: defaut(p.cle), est_defaut: !enBase,
    updated_at: row ? row.updated_at : null, updated_by: row ? row.updated_by : null,
  };
}

function trouver(cle) {
  const p = PARAMETRES.find((x) => x.cle === cle);
  if (!p) throw new AppError(404, 'NOT_FOUND');
  return p;
}

function list(user, { limit = 50, offset = 0, groupe, q } = {}) {
  admin(user);
  let rows = PARAMETRES.filter((p) => !groupe || p.groupe === groupe);
  if (q) {
    const n = String(q).toLowerCase();
    rows = rows.filter((p) => [p.cle, p.libelle_fr, p.libelle_nl].some((s) => s.toLowerCase().includes(n)));
  }
  return { rows: rows.slice(offset, offset + limit).map(fiche), pagination: { total: rows.length, limit, offset } };
}

function get(user, cle) {
  admin(user);
  return fiche(trouver(cle));
}

/**
 * Formats des paramètres des tickets (0.11.0) : liste de codes de rôles connus, nombre entier de jours, délais P1 à P4.
 * Rend la valeur normalisée ou lève VALIDATION avec le motif.
 */
const FORMATS = {
  // R3 (0.12.0) : un code de rôle se reconnaît quelle que soit sa casse (« Admin » vaut « admin ») ; il est enregistré
  // tel que le catalogue des rôles l'écrit.
  roles: (v, p) => {
    const tapes = v.split(',').map((x) => x.trim()).filter(Boolean);
    const connu = (c) => ROLES.find((r) => r.code.toLowerCase() === c.toLowerCase());
    const inconnus = tapes.filter((c) => !connu(c));
    const liste = ROLES.map((r) => r.code).join(', ');
    if (!tapes.length) refuser(p, `aucun code de rôle ; codes connus : ${liste}`, `geen rolcode; gekende codes: ${liste}`);
    if (inconnus.length) {
      const plus = inconnus.length > 1;
      refuser(p, `${plus ? 'rôles inconnus' : 'rôle inconnu'} ${inconnus.map((c) => `« ${c} »`).join(', ')} ; codes connus : ${liste}`,
        `${plus ? 'onbekende rollen' : 'onbekende rol'} ${inconnus.map((c) => `"${c}"`).join(', ')}; gekende codes: ${liste}`);
    }
    return [...new Set(tapes.map((c) => connu(c).code))].join(',');
  },
  entier: (v, p) => {
    if (!/^\d{1,3}$/.test(v) || Number(v) < 1 || Number(v) > 365) refuser(p, `« ${v} » n'est pas un nombre de 1 à 365`, `"${v}" is geen getal van 1 tot 365`);
    return String(Number(v));
  },
  delais: (v, p) => {
    let o;
    try { o = JSON.parse(v); } catch (e) { refuser(p, 'texte illisible ; recopiez l\'exemple de l\'explication et changez seulement les nombres', 'onleesbare tekst; kopieer het voorbeeld uit de uitleg en wijzig alleen de getallen'); }
    const ok = o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).sort().join() === 'P1,P2,P3,P4'
      && Object.values(o).every((d) => Array.isArray(d) && d.length === 2 && d.every((h) => Number.isInteger(h) && h >= 1 && h <= 8760) && d[0] <= d[1]);
    if (!ok) refuser(p, 'P1 à P4 attendus, chacun [prise en charge, résolution] en heures entières de 1 à 8760, la prise en charge au plus égale à la résolution',
      'P1 tot P4 verwacht, elk [tenlasteneming, oplossing] in hele uren van 1 tot 8760, de tenlasteneming hoogstens gelijk aan de oplossing');
    return JSON.stringify({ P1: o.P1, P2: o.P2, P3: o.P3, P4: o.P4 });
  },
};

/** Contrôle de la valeur selon le catalogue ; rend la valeur nettoyée ou refuse en nommant le réglage et le motif (R2). */
function controler(p, brute) {
  const v = typeof brute === 'string' ? brute.trim() : brute;
  if (p.type === 'choix') {
    const permis = p.choix.map((c) => c.valeur).join(', ');
    if (!p.choix.some((c) => c.valeur === v)) refuser(p, `choix permis : ${permis}`, `toegelaten keuzes: ${permis}`);
    return v;
  }
  if (typeof v !== 'string') refuser(p, 'texte attendu', 'tekst verwacht');
  if (p.requis && !v) refuser(p, 'valeur obligatoire', 'waarde verplicht');
  if (p.max && v.length > p.max) refuser(p, `${p.max} caractères au plus (${v.length} tapés)`, `hoogstens ${p.max} tekens (${v.length} getypt)`);
  return p.format ? FORMATS[p.format](v, p) : v;
}

function ecrire(user, cle, v) {
  getDb().prepare(`INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`).run(cle, v, user.id);
}

function update(user, cle, brute, channel = 'api') {
  admin(user);
  const p = trouver(cle);
  const v = controler(p, brute);
  const avant = valeur(cle);
  if (v === avant) return fiche(p);
  ecrire(user, cle, v);
  logAudit(user.id, 'parametre.update', 'parametre', null, { cle, avant, apres: v }, channel);
  return fiche(p);
}

/** DELETE = retour au défaut livré : la valeur de l'instance est effacée, la ligne garde l'auteur et la date. */
function reset(user, cle, channel = 'api') {
  admin(user);
  const p = trouver(cle);
  if (fiche(p).est_defaut) return fiche(p);
  const avant = valeur(cle);
  ecrire(user, cle, null);
  logAudit(user.id, 'parametre.reset', 'parametre', null, { cle, avant, apres: defaut(cle) }, channel);
  return fiche(p);
}

module.exports = { CLES, GROUPES: CATALOGUE.groupes, PARAMETRES, valeur, defaut, instanceSettings, publicSettings, list, get, update, reset };
