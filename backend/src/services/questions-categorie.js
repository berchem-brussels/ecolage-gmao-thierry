/**
 * Questions propres à la catégorie (cahier des charges DEM-05 ; version 0.7.0, point 5 ; conception validée le 28/10/2026).
 *   1. Le responsable du service technique (« categories:gerer ») règle les questions sur la fiche d'un domaine ou d'une
 *      nature de l'entité active. Une nature reprend aussi les questions de son domaine : domaine d'abord, puis nature,
 *      chacune dans son ordre.
 *   2. Deux types : « oui_non » (réponses Oui et Non, fixes) et « choix » (une réponse parmi 2 à 6, textes FR et NL).
 *      Question et réponses en FR et en NL. Dix questions actives au plus par catégorie : le formulaire reste court.
 *   3. Aucune question n'est obligatoire, sauf si le responsable coche « obligatoire » ; le dépôt d'une demande le
 *      contrôle (repondre(), appelé dans la transaction de dépôt de services/demandes.js).
 *   4. Les réponses d'une demande gardent le texte de la question et de la réponse au moment du dépôt (table
 *      demande_reponses) : une question modifiée ou désactivée plus tard ne change pas la fiche.
 *   5. Une question ne se supprime pas : DELETE la désactive avec un motif ; PUT is_active = 1 la réactive. Une question
 *      d'une catégorie désactivée ne se réactive pas.
 *   6. Lecture : rôle qui porte « categories:lire » dans l'entité active. Cloison (SEC-01) : une question ou une catégorie
 *      d'une autre entité répond 403, par l'API comme par le MCP.
 *   7. Valeurs livrées (D-11, config/categories.json, « questions ») : créées pour une catégorie active qui n'a encore
 *      aucune question, au démarrage pour chaque entité active et à la création d'une entité. Rien n'est modifié ni réactivé.
 */
const fs = require('fs');
const path = require('path');
const { getDb, safeBuildUpdate } = require('../database');
const { AppError } = require('../envelope');
const { logAudit, changements } = require('../audit');
const { avecTrace } = require('./trace');
const { rolesWith } = require('../roles');

const CATALOGUE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'categories.json'), 'utf8'));
const TYPES = ['oui_non', 'choix'];
const VALEURS = ['oui', 'non', '1', '2', '3', '4', '5', '6'];
const MAX_ACTIVES = 10;
const OUI_NON = { oui: { fr: 'Oui', nl: 'Ja' }, non: { fr: 'Non', nl: 'Nee' } };

const COLUMNS = `q.id, q.entite_id, q.categorie_id, c.code AS categorie_code, c.libelle_fr AS categorie_libelle_fr,
  c.libelle_nl AS categorie_libelle_nl, CASE WHEN c.parent_id IS NULL THEN 'domaine' ELSE 'nature' END AS categorie_niveau,
  q.question_fr, q.question_nl, q.type, q.reponses_json, q.obligatoire, q.ordre, q.is_active, q.motif_desactivation,
  q.created_at, q.updated_at, q.created_by, q.updated_by`;
const FROM = 'FROM questions_categorie q JOIN categories c ON c.id = q.categorie_id';

const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}

function lecture(user) {
  entiteActive(user);
  if (!peut(user, 'categories:lire')) throw new AppError(403, 'FORBIDDEN');
}

function gestion(user) {
  entiteActive(user);
  if (!peut(user, 'categories:gerer')) throw new AppError(403, 'FORBIDDEN');
}

/** Ligne SQL → fiche : réponses décodées ; pour « oui_non », les deux réponses fixes. */
function decode(l) {
  if (!l) return l;
  const { reponses_json: json, ...reste } = l;
  const reponses = l.type === 'oui_non'
    ? [{ valeur: 'oui', ...OUI_NON.oui }, { valeur: 'non', ...OUI_NON.non }]
    : (json ? JSON.parse(json) : []).map((r, i) => ({ valeur: String(i + 1), fr: r.fr, nl: r.nl }));
  return { ...reste, reponses };
}

function row(id) {
  return getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE q.id = ?`).get(id);
}

/** Catégorie de l'entité active : 404 inconnue, 403 d'une autre entité. */
function categorieDe(user, categorieId) {
  const c = getDb().prepare('SELECT id, entite_id, parent_id, code, is_active FROM categories WHERE id = ?').get(categorieId);
  if (!c) throw new AppError(404, 'NOT_FOUND');
  if (c.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  return c;
}

function load(user, id) {
  const q = row(id);
  if (!q) throw new AppError(404, 'NOT_FOUND');
  if (q.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  return q;
}

const fiche = (user, l) => avecTrace(user, decode(l));

/** Questions propres d'une catégorie, dans leur ordre ; inclure_inactives = 1 pour la fiche du responsable. */
function list(user, categorieId, { inclure_inactives: tous = 0 } = {}) {
  lecture(user);
  const c = categorieDe(user, categorieId);
  const rows = getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE q.categorie_id = ? AND (q.is_active = 1 OR ? = 1)
    ORDER BY q.is_active DESC, q.ordre, q.id LIMIT 200`).all(c.id, tous ? 1 : 0);
  return { categorie_id: c.id, rows: rows.map((l) => fiche(user, l)), max_actives: MAX_ACTIVES };
}

function get(user, id) {
  lecture(user);
  return fiche(user, load(user, id));
}

/** Contrôle du type et des réponses (règle 2) ; rend le JSON à enregistrer (null pour « oui_non »). */
function reponsesJson(type, reponses) {
  if (type === 'oui_non') {
    if (reponses && reponses.length) throw new AppError(409, 'QUESTION_REPONSES');
    return null;
  }
  if (!Array.isArray(reponses) || reponses.length < 2 || reponses.length > 6) throw new AppError(409, 'QUESTION_REPONSES');
  const vues = new Set();
  for (const r of reponses) {
    const cle = r.fr.toLowerCase();
    if (vues.has(cle)) throw new AppError(409, 'QUESTION_REPONSES');
    vues.add(cle);
  }
  return JSON.stringify(reponses.map((r) => ({ fr: r.fr, nl: r.nl })));
}

function actives(categorieId, exceptId = 0) {
  return getDb().prepare('SELECT COUNT(*) AS n FROM questions_categorie WHERE categorie_id = ? AND is_active = 1 AND id <> ?').get(categorieId, exceptId).n;
}

function nextOrdre(categorieId) {
  return getDb().prepare('SELECT COALESCE(MAX(ordre), 0) + 10 AS o FROM questions_categorie WHERE categorie_id = ?').get(categorieId).o;
}

function create(user, categorieId, data, channel = 'api') {
  gestion(user);
  const c = categorieDe(user, categorieId);
  if (!c.is_active) throw new AppError(409, 'DEMANDE_CATEGORIE_INACTIVE');
  if (actives(c.id) >= MAX_ACTIVES) throw new AppError(409, 'QUESTIONS_MAX', [`${MAX_ACTIVES}`]);
  const json = reponsesJson(data.type, data.reponses);
  const ordre = data.ordre !== undefined ? data.ordre : nextOrdre(c.id);
  const r = getDb().prepare(`INSERT INTO questions_categorie (entite_id, categorie_id, question_fr, question_nl, type, reponses_json,
      obligatoire, ordre, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(c.entite_id, c.id, data.question_fr, data.question_nl, data.type, json, data.obligatoire ? 1 : 0, ordre, user.id, user.id);
  logAudit(user.id, 'question_categorie.create', 'question_categorie', r.lastInsertRowid,
    { categorie: c.code, type: data.type, obligatoire: data.obligatoire ? 1 : 0 }, channel, c.entite_id);
  return fiche(user, load(user, r.lastInsertRowid));
}

function update(user, id, data, channel = 'api') {
  gestion(user);
  const q = load(user, id);
  if (!q.is_active && data.is_active !== 1) throw new AppError(409, 'CANCELLED');
  if (data.is_active === 1 && !q.is_active) {
    const c = getDb().prepare(`SELECT c.is_active, p.is_active AS parent_actif FROM categories c LEFT JOIN categories p ON p.id = c.parent_id
      WHERE c.id = ?`).get(q.categorie_id);
    if (!c.is_active || c.parent_actif === 0) throw new AppError(409, 'DEMANDE_CATEGORIE_INACTIVE');
    if (actives(q.categorie_id, id) >= MAX_ACTIVES) throw new AppError(409, 'QUESTIONS_MAX', [`${MAX_ACTIVES}`]);
  }
  const { reponses, ...champs } = data;
  const type = data.type || q.type;
  if (data.type !== undefined || reponses !== undefined) {
    // Le type et les réponses se contrôlent ensemble : un « choix » qui garde ses réponses, un « oui_non » sans réponses.
    const enVigueur = reponses !== undefined ? reponses : (type === q.type ? decode(q).reponses.map((r) => ({ fr: r.fr, nl: r.nl })) : null);
    champs.reponses_json = reponsesJson(type, type === 'oui_non' && reponses === undefined ? null : enVigueur);
  }
  // Journal (DV-04) : seuls les champs changés, avec l'ancienne et la nouvelle valeur ; rien n'est écrit sans changement.
  const diff = changements('questions_categorie', id, champs);
  if (diff) {
    const { sets, params } = safeBuildUpdate(diff.apres, ['id']);
    if (diff.apres.is_active === 1) sets.push('motif_desactivation = NULL');
    getDb().prepare(`UPDATE questions_categorie SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...params, user.id, id);
    logAudit(user.id, diff.apres.is_active === 1 ? 'question_categorie.reactivate' : 'question_categorie.update', 'question_categorie', id,
      { categorie: q.categorie_code, ...diff }, channel, q.entite_id);
  }
  return fiche(user, load(user, id));
}

/** DELETE = désactivation avec motif (règle 5). */
function deactivate(user, id, motif, channel = 'api') {
  gestion(user);
  const q = load(user, id);
  if (!q.is_active) throw new AppError(409, 'CANCELLED');
  getDb().prepare("UPDATE questions_categorie SET is_active = 0, motif_desactivation = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(motif, user.id, id);
  logAudit(user.id, 'question_categorie.deactivate', 'question_categorie', id, { categorie: q.categorie_code, motif }, channel, q.entite_id);
  return fiche(user, load(user, id));
}

/**
 * Questions posées pour une catégorie dans le formulaire : actives, celles du domaine d'abord puis celles de la
 * catégorie, chacune dans son ordre. origine : « domaine » ou « nature ».
 */
function effectives(categorie) {
  const db = getDb();
  const ids = categorie.parent_id ? [categorie.parent_id, categorie.id] : [categorie.id];
  const out = [];
  for (const cid of ids) {
    // Un domaine choisi seul (sans nature) pose ses propres questions : origine « domaine ».
    const origine = cid === categorie.id && categorie.parent_id ? 'nature' : 'domaine';
    for (const l of db.prepare(`SELECT ${COLUMNS} ${FROM} WHERE q.categorie_id = ? AND q.is_active = 1 ORDER BY q.ordre, q.id`).all(cid)) {
      const d = decode(l);
      out.push({
        id: d.id, categorie_id: d.categorie_id, origine, question_fr: d.question_fr, question_nl: d.question_nl,
        type: d.type, reponses: d.reponses, obligatoire: d.obligatoire,
      });
    }
  }
  return out;
}

/** Questions effectives de toutes les catégories d'une entité, par identifiant de catégorie (arbre des tuiles). */
function effectivesParCategorie(entiteId) {
  const db = getDb();
  const propres = new Map();
  for (const l of db.prepare(`SELECT ${COLUMNS} ${FROM} WHERE q.entite_id = ? AND q.is_active = 1 ORDER BY q.ordre, q.id LIMIT 5000`).all(entiteId)) {
    if (!propres.has(l.categorie_id)) propres.set(l.categorie_id, []);
    propres.get(l.categorie_id).push(decode(l));
  }
  const court = (q, origine) => ({
    id: q.id, categorie_id: q.categorie_id, origine, question_fr: q.question_fr, question_nl: q.question_nl,
    type: q.type, reponses: q.reponses, obligatoire: q.obligatoire,
  });
  return (c) => [
    ...(c.parent_id ? (propres.get(c.parent_id) || []).map((q) => court(q, 'domaine')) : []),
    ...(propres.get(c.id) || []).map((q) => court(q, c.parent_id ? 'nature' : 'domaine')),
  ];
}

/**
 * Contrôle des réponses au dépôt d'une demande (règle 3) et enregistrement dans la transaction de dépôt.
 * reponses : [{ question_id, valeur }]. Refus : question hors de la catégorie choisie et de son domaine, ou inactive
 * (QUESTION_INVALIDE) ; question en double (QUESTION_INVALIDE) ; valeur non permise (REPONSE_INVALIDE) ; question
 * obligatoire sans réponse (REPONSE_OBLIGATOIRE, avec les identifiants manquants).
 */
function controler(categorie, reponses = []) {
  const posees = effectives(categorie);
  const parId = new Map(posees.map((q) => [q.id, q]));
  const vues = new Set();
  const lignes = [];
  for (const r of reponses) {
    const q = parId.get(r.question_id);
    if (!q || vues.has(r.question_id)) throw new AppError(409, 'QUESTION_INVALIDE', [`${r.question_id}`]);
    vues.add(r.question_id);
    const rep = q.reponses.find((x) => x.valeur === r.valeur);
    if (!rep) throw new AppError(409, 'REPONSE_INVALIDE', [`${r.question_id}`]);
    lignes.push({ question: q, reponse: rep, ordre: posees.indexOf(q) });
  }
  const manquantes = posees.filter((q) => q.obligatoire && !vues.has(q.id)).map((q) => `${q.id}`);
  if (manquantes.length) throw new AppError(409, 'REPONSE_OBLIGATOIRE', manquantes);
  return lignes.sort((a, b) => a.ordre - b.ordre);
}

function enregistrer(demandeId, lignes) {
  const ins = getDb().prepare(`INSERT INTO demande_reponses (demande_id, question_id, question_fr, question_nl, valeur, reponse_fr, reponse_nl, ordre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  lignes.forEach((l, i) => ins.run(demandeId, l.question.id, l.question.question_fr, l.question.question_nl, l.reponse.valeur, l.reponse.fr, l.reponse.nl, i));
}

/** Réponses d'une demande, telles qu'au dépôt. */
function deDemande(demandeId) {
  return getDb().prepare(`SELECT question_id, question_fr, question_nl, valeur, reponse_fr, reponse_nl FROM demande_reponses
    WHERE demande_id = ? ORDER BY ordre, id`).all(demandeId);
}

/** Questions livrées d'une entité (règle 7). */
function seedEntite(entiteId) {
  const db = getDb();
  const cat = (code) => db.prepare('SELECT id, is_active FROM categories WHERE entite_id = ? AND code = ?').get(entiteId, code);
  const semer = (code, questions) => {
    if (!questions || !questions.length) return;
    const c = cat(code);
    if (!c || !c.is_active) return;
    if (db.prepare('SELECT 1 FROM questions_categorie WHERE categorie_id = ?').get(c.id)) return;
    questions.forEach((q, i) => {
      db.prepare(`INSERT INTO questions_categorie (entite_id, categorie_id, question_fr, question_nl, type, reponses_json, obligatoire, ordre)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(entiteId, c.id, q.question_fr, q.question_nl, q.type,
        q.type === 'choix' ? JSON.stringify(q.reponses.map((r) => ({ fr: r.fr, nl: r.nl }))) : null, q.obligatoire ? 1 : 0, (i + 1) * 10);
    });
  };
  for (const d of CATALOGUE.defauts) {
    semer(d.code, d.questions);
    for (const n of d.natures) semer(n.code, n.questions);
  }
}

function seedAll() {
  for (const e of getDb().prepare('SELECT id FROM entites WHERE is_active = 1').all()) seedEntite(e.id);
}

module.exports = {
  TYPES, VALEURS, MAX_ACTIVES, list, get, create, update, deactivate, gestion, effectives, effectivesParCategorie,
  controler, enregistrer, deDemande, seedEntite, seedAll,
};
