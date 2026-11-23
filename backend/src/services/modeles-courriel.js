/**
 * Modèles de courriel (version 0.17.0, étape 13, point 3 ; cahier des charges NOT-04, NOT-06, LNG-05). Instance,
 * administrateur seulement ; commun à la route REST et au MCP.
 *   1. Un modèle par événement de config/notifications.json, ou par variante (« demande.recue.validation ») : sujet
 *      (150 caractères, une ligne) et texte (4 000), en FR et en NL. Livrés par config/modeles-courriel.json, créés
 *      s'ils manquent, jamais remplacés ; « Rétablir » rend le texte livré (journal).
 *   2. Variables admises, et seulement elles : {numero}, {lieu}, {etat}, {delai}, {lien}, {entite}, {application} ;
 *      toute autre accolade nommée est refusée (409 MODELE_VARIABLE). Chaque langue cite {numero} dans son sujet ou son
 *      texte (409 MODELE_SANS_NUMERO) : la personne retrouve la demande. Aucune variable ne porte un texte libre ni un
 *      nom (NOT-06) ; le détail se lit après connexion.
 *   3. Langue du destinataire (LNG-05) : composer() prend la langue de la personne qui reçoit, jamais celle de qui agit.
 *   4. Pied fixe ajouté à chaque courriel (« Courriel automatique de … : n'y répondez pas »). Sans adresse de
 *      l'application (Paramètres › Courriel), {lien} devient « ouvrez … et cherchez le numéro … ».
 *   5. Aperçu : le texte enregistré, ou celui en cours de saisie, rendu avec des valeurs d'exemple, sans rien envoyer.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { getSetting } = require('../settings');
const CAT = require('../../config/modeles-courriel.json');
const EVENEMENTS = require('../../config/notifications.json').evenements;

const VARIABLES = CAT.variables;
const PAR_CODE = new Map(CAT.modeles.map((m) => [m.code, m]));
const CHAMPS = ['sujet_fr', 'sujet_nl', 'corps_fr', 'corps_nl'];
const VARIANTES = { validation: { fr: 'demande à valider', nl: 'goed te keuren aanvraag' }, beneficiaire: { fr: 'bénéficiaire', nl: 'begunstigde' }, traiter: { fr: 'personnes qui traitent', nl: 'behandelaars' } };
const COLUMNS = 'code, sujet_fr, sujet_nl, corps_fr, corps_nl, retabli, updated_by, updated_at';

const admin = (user) => { if (!user || user.role !== 'admin') throw new AppError(403, 'FORBIDDEN'); };
const iso = (s) => (s ? `${String(s).replace(' ', 'T')}Z` : null);

/** Règle 1 : modèles livrés qui manquent, créés tels quels (une base neuve ou un modèle ajouté par une version). */
function assurer(db = getDb()) {
  const ins = db.prepare('INSERT OR IGNORE INTO modeles_courriel (code, sujet_fr, sujet_nl, corps_fr, corps_nl) VALUES (?, ?, ?, ?, ?)');
  for (const m of CAT.modeles) ins.run(m.code, m.sujet_fr, m.sujet_nl, m.corps_fr, m.corps_nl);
}

/** Événement du catalogue d'un code de modèle (« demande.recue.validation » → « demande.recue »). */
function evenementDe(code) {
  return EVENEMENTS.find((e) => e.code === code) || EVENEMENTS.find((e) => code.startsWith(`${e.code}.`)) || null;
}

function libelle(code, lang) {
  const e = evenementDe(code);
  const base = e ? e[`libelle_${lang}`] : code;
  const variante = e && code !== e.code ? VARIANTES[code.slice(e.code.length + 1)] : null;
  return variante ? `${base} (${variante[lang]})` : base;
}

function nomDe(id) {
  const u = id ? getDb().prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(id) : null;
  return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || null : null;
}

function sortie(r) {
  const livre = PAR_CODE.get(r.code);
  const estLivre = !!livre && CHAMPS.every((c) => r[c] === livre[c]);
  const trace = !r.updated_by ? { etat: 'livree', le: null, par: null }
    : { etat: r.retabli ? 'retablie' : 'modifiee', le: iso(r.updated_at), par: nomDe(r.updated_by) };
  const { updated_by: _u, retabli: _r, ...reste } = r;
  return {
    ...reste, evenement: evenementDe(r.code)?.code || null, libelle_fr: libelle(r.code, 'fr'), libelle_nl: libelle(r.code, 'nl'),
    ordre: livre ? livre.ordre : 999, texte_livre: estLivre ? 1 : 0, variables: VARIABLES, trace,
  };
}

function list(user) {
  admin(user);
  const db = getDb();
  assurer(db);
  return db.prepare(`SELECT ${COLUMNS} FROM modeles_courriel`).all().map(sortie).sort((a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code));
}

function charger(code) {
  const db = getDb();
  assurer(db);
  const r = db.prepare(`SELECT ${COLUMNS} FROM modeles_courriel WHERE code = ?`).get(code);
  if (!r) throw new AppError(404, 'NOT_FOUND');
  return r;
}

function get(user, code) {
  admin(user);
  return sortie(charger(code));
}

/** Règle 2 : variables admises seulement, et {numero} dans chaque langue. */
function controler(m) {
  for (const c of CHAMPS) {
    for (const v of String(m[c] || '').matchAll(/\{([^{}\s]{1,40})\}/g)) {
      if (!VARIABLES.includes(v[1])) {
        const admises = VARIABLES.map((x) => `{${x}}`).join(', ');
        throw new AppError(409, 'MODELE_VARIABLE', [`{${v[1]}}`], {
          fr: `Variable inconnue dans le modèle : {${v[1]}}. Variables admises : ${admises}.`,
          nl: `Onbekende variabele in het model: {${v[1]}}. Toegelaten variabelen: ${admises}.`,
        });
      }
    }
  }
  for (const lang of ['fr', 'nl']) {
    if (!`${m[`sujet_${lang}`]} ${m[`corps_${lang}`]}`.includes('{numero}')) throw new AppError(409, 'MODELE_SANS_NUMERO', [lang]);
  }
}

function update(user, code, data, channel = 'api') {
  admin(user);
  const avant = charger(code);
  const apres = { ...avant, ...data };
  controler(apres);
  const champs = CHAMPS.filter((c) => apres[c] !== avant[c]);
  if (!champs.length) return sortie(avant);
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE modeles_courriel SET sujet_fr = ?, sujet_nl = ?, corps_fr = ?, corps_nl = ?, retabli = 0, updated_by = ?, updated_at = datetime('now') WHERE code = ?")
      .run(apres.sujet_fr, apres.sujet_nl, apres.corps_fr, apres.corps_nl, user.id, code);
    // Le journal nomme les champs changés, jamais les textes (comme les modèles de réponse).
    logAudit(user.id, 'modele_courriel.update', 'modele_courriel', null, { code, champs }, channel);
  })();
  return get(user, code);
}

function retablir(user, code, channel = 'api') {
  admin(user);
  charger(code);
  const livre = PAR_CODE.get(code);
  if (!livre) throw new AppError(404, 'NOT_FOUND');
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE modeles_courriel SET sujet_fr = ?, sujet_nl = ?, corps_fr = ?, corps_nl = ?, retabli = 1, updated_by = ?, updated_at = datetime('now') WHERE code = ?")
      .run(livre.sujet_fr, livre.sujet_nl, livre.corps_fr, livre.corps_nl, user.id, code);
    logAudit(user.id, 'modele_courriel.retablir', 'modele_courriel', null, { code }, channel);
  })();
  return get(user, code);
}

/** Règle 4 : lien complet vers l'écran, ou la phrase de repli sans adresse. */
function lienComplet(chemin, lang, vals) {
  const base = require('./courriel').adresseApplication();
  if (base && chemin) return `${base}${chemin}`;
  return CAT.sans_lien[lang].replace('{application}', vals.application).replace('{numero}', vals.numero || '');
}

function remplir(texte, vals, uneLigne) {
  return String(texte).replace(/\{([a-z_]+)\}/g, (tout, v) => {
    if (!VARIABLES.includes(v)) return tout;
    const x = vals[v] === undefined || vals[v] === null || vals[v] === '' ? '—' : String(vals[v]);
    return uneLigne ? x.replace(/[\r\n]+/g, ' ') : x;
  });
}

/**
 * Règle 3 : courriel prêt à partir. code : modèle (repli sur l'événement sans variante) ; lang : langue du destinataire ;
 * v : { numero, lieu, etat, delai, lien (chemin de l'écran, « /demandes?demande=12 »), entite }. textes : sujet et texte
 * à rendre à la place du modèle enregistré (aperçu).
 */
function composer(code, lang, v = {}, textes = null) {
  const l = lang === 'nl' ? 'nl' : 'fr';
  let m = textes ? null : getDb().prepare(`SELECT ${COLUMNS} FROM modeles_courriel WHERE code = ?`).get(code);
  if (!textes && !m) {
    assurer();
    m = getDb().prepare(`SELECT ${COLUMNS} FROM modeles_courriel WHERE code = ?`).get(code)
      || getDb().prepare(`SELECT ${COLUMNS} FROM modeles_courriel WHERE code = ?`).get(evenementDe(code)?.code || '');
    if (!m) throw new Error(`Modèle de courriel inconnu : ${code}`);
  }
  const sujet = textes ? textes.sujet : m[`sujet_${l}`];
  const corps = textes ? textes.corps : m[`corps_${l}`];
  const application = getSetting(l === 'nl' ? 'app.name_nl' : 'app.name_fr') || 'GMAO';
  const vals = { ...v, application };
  vals.lien = lienComplet(v.lien, l, vals);
  const pied = remplir(CAT.pied[l], vals, false);
  return {
    sujet: remplir(sujet, vals, true).slice(0, 200),
    corps: `${remplir(corps, vals, false)}\n\n${pied}`.slice(0, 10000),
  };
}

/** Règle 5 : aperçu avec des valeurs d'exemple, sans rien envoyer. */
function apercu(user, code, { langue, sujet, corps }) {
  admin(user);
  const m = charger(code);
  const l = langue;
  const textes = { sujet: sujet ?? m[`sujet_${l}`], corps: corps ?? m[`corps_${l}`] };
  controler({ ...m, [`sujet_${l}`]: textes.sujet, [`corps_${l}`]: textes.corps });
  const ex = CAT.exemple;
  const entite = getDb().prepare('SELECT nom_fr, nom_nl FROM entites WHERE is_active = 1 ORDER BY code LIMIT 1').get();
  const v = { numero: ex.numero, lieu: ex.lieu[l], etat: ex.etat[l], delai: ex.delai[l], lien: ex.lien, entite: entite ? entite[`nom_${l}`] : '' };
  return { code, langue: l, ...composer(code, l, v, textes) };
}

module.exports = { list, get, update, retablir, apercu, composer, assurer, VARIABLES };
