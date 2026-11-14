/**
 * Fusion de doublons (cahier des charges GES-06 ; version 0.16.0, étape 12, point 4).
 *   1. Le service technique (« demandes:traiter ») regroupe une demande ouverte de l'entité active dans une autre
 *      demande de l'entité, la demande principale : passage vers « Fusionnée » permis par la table des passages
 *      (via « fusionner », états À qualifier, Qualifiée, En attente, Rouverte), jamais par la route des transitions.
 *   2. Contrôles, dans l'ordre : demande (404, 403), permission (403), module, passage (409 TRANSITION_INTERDITE),
 *      principale différente (409 FUSION_ELLE_MEME), principale de l'entité (404, 403), ouverte et reçue par le
 *      service (ni fermée, ni « En validation » : 409 FUSION_PRINCIPALE_FERMEE). Commentaire facultatif, lu par le
 *      demandeur.
 *   3. Effet, dans une transaction : la demande passe « Fusionnée » et renvoie vers la principale (fusionnee_dans) ;
 *      ses abonnés passent à la principale (sauf qui y est déjà, ou en est le demandeur ou le bénéficiaire), avec leur
 *      façon de suivre et leur remarque ; son demandeur et son bénéficiaire suivent la principale (« Moi aussi », sans
 *      remarque) pour en garder le suivi dans « Mes demandes ». Historique de la demande regroupée ; journal sans
 *      texte libre (numéros, nombre de personnes reportées, commentaire donné ou non).
 *   4. Rien n'est supprimé : la demande regroupée garde ses pièces, son fil et son historique, en lecture.
 *   5. MCP : deux appels (prepare_fusionner_demande décrit l'effet, confirm_fusionner_demande l'exécute).
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { assertActif } = require('../modules');
const cycle = require('./cycle');

const versSql = (date) => date.toISOString().replace('T', ' ').slice(0, 19);

/** Règle 2 : contrôles sans écriture ; rend { d, t, m, commentaire }. */
function controler(user, id, { principale_id: maitresseId, commentaire }) {
  const d = cycle.demandeDeLEntite(user, id);
  if (!cycle.peut(user, 'demandes:traiter')) throw new AppError(403, 'FORBIDDEN');
  assertActif('demandes');
  const t = getDb().prepare(`SELECT id, vers_etat, commentaire, commentaire_public FROM demande_transitions
    WHERE de_etat = ? AND vers_etat = 'fusionnee' AND acteur = 'service' AND via = 'fusionner' AND is_active = 1`).get(d.etat);
  if (!t) throw new AppError(409, 'TRANSITION_INTERDITE', { de: d.etat, vers: 'fusionnee' });
  if (maitresseId === d.id) throw new AppError(409, 'FUSION_ELLE_MEME');
  const m = cycle.demandeDeLEntite(user, maitresseId);
  if (cycle.FERMES.includes(m.etat) || m.etat === 'en_validation' || m.etat === 'brouillon') throw new AppError(409, 'FUSION_PRINCIPALE_FERMEE');
  return { d, t, m, commentaire: commentaire || null };
}

/** Personnes reportées sur la principale (règle 3) : [{ user_id, remarque, source }]. */
function reportes(d, m) {
  const db = getDb();
  const deja = new Set(db.prepare('SELECT user_id FROM demande_suiveurs WHERE demande_id = ?').all(m.id).map((r) => r.user_id));
  for (const x of [m.demandeur_id, m.beneficiaire_id]) if (x) deja.add(x);
  const out = [];
  for (const s of db.prepare('SELECT user_id, remarque, source FROM demande_suiveurs WHERE demande_id = ? ORDER BY id').all(d.id)) {
    if (!deja.has(s.user_id)) { out.push(s); deja.add(s.user_id); }
  }
  for (const x of [d.demandeur_id, d.beneficiaire_id]) {
    if (x && !deja.has(x)) { out.push({ user_id: x, remarque: null, source: 'moi_aussi' }); deja.add(x); }
  }
  return out;
}

/** Effet décrit sans écrire : première étape par le MCP. */
function decrire(user, id, data) {
  const { d, m, commentaire } = controler(user, id, data);
  return {
    action: 'fusionner_demande', demande: { id: d.id, numero: d.numero }, principale: { id: m.id, numero: m.numero },
    personnes_reportees: reportes(d, m).length, commentaire: commentaire ? 1 : 0,
  };
}

function fusionner(user, id, data, channel = 'api') {
  const { d, t, m, commentaire } = controler(user, id, data);
  const db = getDb();
  const maintenant = versSql(new Date());
  const liste = reportes(d, m);
  db.transaction(() => {
    db.prepare(`UPDATE demandes SET etat = 'fusionnee', etat_depuis = ?, fusionnee_dans = ?, attente_suspend = 0, updated_by = ?, updated_at = ? WHERE id = ?`)
      .run(maintenant, m.id, user.id, maintenant, d.id);
    for (const s of liste) {
      db.prepare('INSERT INTO demande_suiveurs (demande_id, user_id, remarque, source) VALUES (?, ?, ?, ?)').run(m.id, s.user_id, s.remarque, s.source);
    }
    db.prepare('DELETE FROM demande_suiveurs WHERE demande_id = ?').run(d.id);
    cycle.ecrire(db, { demandeId: d.id, entiteId: d.entite_id, de: d.etat, vers: 'fusionnee', userId: user.id, commentaire,
      commentairePublic: commentaire ? t.commentaire_public : 0, channel, quand: maintenant });
    logAudit(user.id, 'demande.fusion', 'demande', d.id, {
      numero: d.numero, de: d.etat, principale_id: m.id, principale_numero: m.numero, personnes_reportees: liste.length, commentaire_donne: commentaire ? 1 : 0,
    }, channel, d.entite_id);
  })();
  return require('./demandes').get(user, d.id);
}

module.exports = { decrire, fusionner };
