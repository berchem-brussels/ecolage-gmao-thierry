/**
 * Notifications de la cloche (version 0.17.0, étape 13, point 1 ; cahier des charges NOT-01, NOT-02, NOT-06, DEM-12).
 *   1. Les événements notifiables sont déclarés dans config/notifications.json (NOT-01) : code, module, variantes du texte
 *      en FR et en NL. Seul un événement « disponible » s'émet ; un code inconnu ou à venir est une erreur de programmation.
 *   2. Une notification appartient à une personne et à une entité (celle de l'objet). Personne d'autre ne la lit : celle
 *      d'une autre entité répond 403, celle d'une autre personne de la même entité 404 (son existence n'est pas révélée).
 *      La liste et le compteur ne portent que sur l'entité active ; le compteur donne aussi les non lues des autres
 *      entités de la personne, sans rien en dire d'autre.
 *   3. Contenu minimal (NOT-06) : code de l'événement, variante, numéro de l'objet, adresse de l'écran. Aucun texte libre,
 *      aucun nom. Le texte se compose à la lecture, en FR et en NL, depuis le catalogue.
 *   4. Un événement d'un module éteint n'est ni émis ni rendu (piège SAGA 87, standard section 18) ; il réapparaît si le
 *      module est rallumé.
 *   5. Émission dans la transaction de l'action qui la cause (notifier) : destinataires dédoublonnés ; un compte inactif ou
 *      sans rôle dans l'entité est sauté. Une notification de sa propre action naît lue : elle reste dans l'historique de
 *      la cloche sans allumer le compteur (accusé de réception d'une demande que l'on vient d'envoyer à l'écran).
 *   6. Lire une notification ne s'inscrit pas au journal d'audit (comme la lecture du fil, 0.15.0) ; l'action qui l'a
 *      causée y est déjà. Rien ne se modifie qu'en « lue ».
 *   7. Conservation (à confirmer avec le DPO, D-09) : une notification lue s'efface après 90 jours, une non lue après
 *      365 jours, à chaque émission, sans tâche planifiée. Ce n'est qu'un avis : l'objet et son journal restent.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { estActif } = require('../modules');
const { rolesIn } = require('../auth');
const CATALOGUE = require('../../config/notifications.json').evenements;

const PAR_CODE = new Map(CATALOGUE.map((e) => [e.code, e]));
const JOURS_LUES = 90;
const JOURS_NON_LUES = 365;
const COLUMNS = 'id, entite_id, evenement, variante, objet, objet_id, numero, lien, lue_le, created_at';

/** Règle 4 : codes des événements dont le module est actif (null : application de base, toujours actif). */
function codesActifs() {
  return CATALOGUE.filter((e) => e.module === null || estActif(e.module)).map((e) => e.code);
}

/** Règle 3 : texte d'une notification dans une langue, depuis le catalogue. */
function texte(n, lang) {
  const e = PAR_CODE.get(n.evenement);
  if (!e) return n.numero;
  const v = e.variantes[n.variante] || e.variantes.defaut;
  return v[lang].replace(/\{numero\}/g, n.numero);
}

function sortie(n) {
  const e = PAR_CODE.get(n.evenement);
  return {
    ...n,
    lue: n.lue_le ? 1 : 0,
    module: e ? e.module : null,
    texte_fr: texte(n, 'fr'),
    texte_nl: texte(n, 'nl'),
    libelle_fr: e ? e.libelle_fr : n.evenement,
    libelle_nl: e ? e.libelle_nl : n.evenement,
  };
}

function controle(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}

/** Condition « événement d'un module actif » : constantes et « ? » seulement. */
function filtreActifs() {
  const codes = codesActifs();
  return { sql: `evenement IN (${codes.map(() => '?').join(', ') || "''"})`, params: codes };
}

function list(user, { limit = 20, offset = 0, non_lues: nonLues } = {}) {
  const entiteId = controle(user);
  const actifs = filtreActifs();
  const where = ['user_id = ?', 'entite_id = ?', actifs.sql];
  const params = [user.id, entiteId, ...actifs.params];
  if (nonLues === 1) where.push('lue_le IS NULL');
  const db = getDb();
  const clause = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS n FROM notifications ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} FROM notifications ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset).map(sortie);
  return { rows, pagination: { total, limit, offset } };
}

/** Règle 2 : non lues de l'entité active, et des autres entités où la personne a encore un rôle. */
function compteur(user) {
  const entiteId = controle(user);
  const { sql, params } = filtreActifs();
  const lignes = getDb().prepare(`SELECT entite_id, COUNT(*) AS n FROM notifications WHERE user_id = ? AND lue_le IS NULL AND ${sql} GROUP BY entite_id`)
    .all(user.id, ...params);
  let ici = 0;
  let ailleurs = 0;
  for (const l of lignes) {
    if (l.entite_id === entiteId) ici = l.n;
    else if (rolesIn(user.id, l.entite_id).length) ailleurs += l.n;
  }
  return { non_lues: ici, autres_entites: ailleurs };
}

function charger(user, id) {
  const entiteId = controle(user);
  const n = getDb().prepare(`SELECT ${COLUMNS}, user_id FROM notifications WHERE id = ?`).get(id);
  if (!n) throw new AppError(404, 'NOT_FOUND');
  if (n.entite_id !== entiteId) throw new AppError(403, 'FORBIDDEN');
  if (n.user_id !== user.id) throw new AppError(404, 'NOT_FOUND');
  if (!codesActifs().includes(n.evenement)) throw new AppError(403, 'MODULE_DISABLED');
  const { user_id: _u, ...reste } = n;
  return reste;
}

const get = (user, id) => sortie(charger(user, id));

function marquerLue(user, id) {
  const n = charger(user, id);
  if (!n.lue_le) getDb().prepare("UPDATE notifications SET lue_le = datetime('now') WHERE id = ? AND lue_le IS NULL").run(n.id);
  return get(user, n.id);
}

/** Toutes les non lues de l'entité active (modules actifs seulement). */
function marquerToutes(user) {
  const entiteId = controle(user);
  const { sql, params } = filtreActifs();
  const r = getDb().prepare(`UPDATE notifications SET lue_le = datetime('now') WHERE user_id = ? AND entite_id = ? AND lue_le IS NULL AND ${sql}`)
    .run(user.id, entiteId, ...params);
  return { marquees: r.changes, ...compteur(user) };
}

/** Règle 1 : catalogue des événements (NOT-01), avec l'état du module dont chacun dépend. */
function evenements(user) {
  controle(user);
  return CATALOGUE.map((e) => ({
    code: e.code, module: e.module, disponible: e.disponible ? 1 : 0, module_actif: e.module === null || estActif(e.module) ? 1 : 0,
    etape: e.etape ?? null, point: e.point ?? null, libelle_fr: e.libelle_fr, libelle_nl: e.libelle_nl,
    destinataires_fr: e.destinataires_fr, destinataires_nl: e.destinataires_nl,
    variantes: Object.entries(e.variantes).map(([code, v]) => ({ code, fr: v.fr, nl: v.nl })),
  }));
}

/** Règle 7 : effacement des notifications anciennes, à chaque émission. */
function purger(db) {
  db.prepare(`DELETE FROM notifications WHERE (lue_le IS NOT NULL AND lue_le < datetime('now', ?))
    OR created_at < datetime('now', ?)`).run(`-${JOURS_LUES} days`, `-${JOURS_NON_LUES} days`);
}

/**
 * Règle 5 : émet un événement, dans la transaction de l'appelant.
 *   evenement : code du catalogue (disponible) ; entiteId : entité de l'objet ; objet, objetId, numero ;
 *   destinataires : [{ userId, lien, variante? }] ; auteurId : la personne qui agit (sa notification naît lue).
 * Rend le nombre de notifications créées.
 */
function notifier(db, { evenement, entiteId, objet, objetId, numero, destinataires, auteurId = null }) {
  const e = PAR_CODE.get(evenement);
  if (!e || !e.disponible) throw new Error(`Événement de notification inconnu ou à venir : ${evenement}`);
  if (e.module !== null && !estActif(e.module)) return 0;
  purger(db);
  const vus = new Set();
  let n = 0;
  for (const d of destinataires) {
    if (!d || !d.userId || vus.has(d.userId)) continue;
    vus.add(d.userId);
    const variante = d.variante && e.variantes[d.variante] ? d.variante : 'defaut';
    const u = db.prepare('SELECT is_active FROM users WHERE id = ?').get(d.userId);
    if (!u || !u.is_active || !rolesIn(d.userId, entiteId).length) continue;
    db.prepare(`INSERT INTO notifications (user_id, entite_id, evenement, variante, objet, objet_id, numero, lien, lue_le)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN datetime('now') END)`)
      .run(d.userId, entiteId, evenement, variante, objet, objetId, numero, d.lien, d.userId === auteurId ? 1 : 0);
    n += 1;
  }
  return n;
}

module.exports = { list, get, compteur, marquerLue, marquerToutes, evenements, notifier, texte, CATALOGUE, JOURS_LUES, JOURS_NON_LUES };
