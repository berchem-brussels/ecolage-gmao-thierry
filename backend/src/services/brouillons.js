/**
 * Brouillon du formulaire de demande (cahier des charges DEM-11 ; version 0.7.0, point 4).
 *   1. Un seul brouillon par personne et par entité active ; il n'est lu, remplacé ou effacé que par elle, par l'API
 *      comme par le MCP. Il ne prend aucun numéro et n'est pas une demande : le service technique ne le voit pas.
 *   2. Le contenu est ce que l'écran affiche (danger, lieu, catégorie, réponses aux questions, description, « Pour »,
 *      date, créneau), contrôlé par le schéma brouillonSave. À la reprise, un lieu, une catégorie, une réponse ou un
 *      collègue qui ne vaut plus est retiré.
 *   3. Il est effacé à l'envoi d'une demande (services/demandes.js), par « Recommencer à zéro », ou au bout de 30 jours.
 *      Ses pièces jointes (0.8.0) passent à la demande envoyée, ou s'effacent avec lui.
 *   4. Pas de ligne au journal d'audit : un brouillon n'est pas encore une demande (écart E-27, à soumettre).
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { rolesWith } = require('../roles');
const { rolesIn } = require('../auth');

const JOURS = 30;
const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  if (!peut(user, 'demandes:creer')) throw new AppError(403, 'FORBIDDEN');
  return user.entiteId;
}

/** Efface les brouillons de plus de 30 jours, de toutes les personnes. */
function purger() {
  getDb().prepare("DELETE FROM brouillons WHERE updated_at < datetime('now', ?)").run(`-${JOURS} days`);
  // Pièces jointes de plus de 30 jours restées sans brouillon (0.8.0, DV-85).
  require('./pieces').purger();
}

/** Retire du contenu ce qui ne vaut plus dans l'entité : lieu inactif ou d'une autre entité, catégorie inactive, collègue parti. */
function valider(entiteId, userId, c) {
  const db = getDb();
  const out = { ...c };
  if (out.lieu && !db.prepare('SELECT 1 FROM lieux WHERE id = ? AND entite_id = ? AND is_active = 1').get(out.lieu.id, entiteId)) out.lieu = null;
  if (out.categorie && !db.prepare(`SELECT 1 FROM categories c LEFT JOIN categories p ON p.id = c.parent_id
    WHERE c.id = ? AND c.entite_id = ? AND c.is_active = 1 AND (p.id IS NULL OR p.is_active = 1)`).get(out.categorie.id, entiteId)) out.categorie = null;
  if (out.collegue) {
    const u = db.prepare('SELECT is_active FROM users WHERE id = ?').get(out.collegue.id);
    if (!u || !u.is_active || out.collegue.id === userId || !rolesIn(out.collegue.id, entiteId).length) out.collegue = null;
  }
  // Réponses aux questions (DEM-05) : seules restent celles d'une question encore posée pour la catégorie gardée.
  if (Array.isArray(out.reponses)) {
    if (!out.categorie) out.reponses = [];
    else {
      const c = db.prepare('SELECT id, parent_id FROM categories WHERE id = ?').get(out.categorie.id);
      const posees = new Map(require('./questions-categorie').effectives(c).map((q) => [q.id, q]));
      out.reponses = out.reponses.filter((r) => posees.has(r.question_id) && posees.get(r.question_id).reponses.some((x) => x.valeur === r.valeur));
    }
  }
  return out;
}

/** Brouillon de la personne dans l'entité active, ou null. */
function get(user) {
  const entiteId = entiteActive(user);
  purger();
  const b = getDb().prepare('SELECT contenu, updated_at FROM brouillons WHERE user_id = ? AND entite_id = ?').get(user.id, entiteId);
  if (!b) return null;
  return { entite_id: entiteId, contenu: valider(entiteId, user.id, JSON.parse(b.contenu)), updated_at: b.updated_at };
}

/** Enregistre (remplace) le brouillon de la personne dans l'entité active. */
function save(user, { contenu }) {
  const entiteId = entiteActive(user);
  purger();
  const texte = JSON.stringify(contenu || {});
  if (texte.length > 20000) throw new AppError(400, 'VALIDATION', ['contenu: trop long']);
  getDb().prepare(`INSERT INTO brouillons (user_id, entite_id, contenu, updated_at) VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT (user_id, entite_id) DO UPDATE SET contenu = excluded.contenu, updated_at = excluded.updated_at`).run(user.id, entiteId, texte);
  return get(user);
}

/** Efface le brouillon de la personne dans l'entité active (« Recommencer à zéro ») ; rien s'il n'y en a pas. */
function remove(user, channel = 'api') {
  const entiteId = entiteActive(user);
  const r = getDb().prepare('DELETE FROM brouillons WHERE user_id = ? AND entite_id = ?').run(user.id, entiteId);
  // Les pièces jointes du brouillon s'effacent avec lui, fichiers compris (DV-85, RGPD-02).
  const pieces = require('./pieces').effacerBrouillon(user, channel);
  return { efface: r.changes || pieces ? 1 : 0, pieces };
}

/** Effacement après l'envoi d'une demande, dans la transaction de dépôt. */
function effacerApresEnvoi(userId, entiteId) {
  getDb().prepare('DELETE FROM brouillons WHERE user_id = ? AND entite_id = ?').run(userId, entiteId);
}

module.exports = { get, save, remove, effacerApresEnvoi, JOURS };
