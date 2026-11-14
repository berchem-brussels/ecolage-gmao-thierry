/**
 * Découpage d'une demande en plusieurs (cahier des charges GES-06 ; version 0.16.0, étape 12, point 5).
 *   1. Le service technique (« demandes:traiter ») découpe une demande ouverte de l'entité active, reçue par le service
 *      (À qualifier, Qualifiée, En attente, En cours, Rouverte), qui signale plusieurs problèmes : de une à cinq
 *      demandes nouvelles, chacune avec sa description (10 caractères au moins), et au besoin sa catégorie et son lieu
 *      (sinon ceux de la demande d'origine), contrôlés comme au dépôt (de l'entité, actifs, catégorie précise).
 *   2. La demande d'origine reste telle quelle (elle garde son premier problème, ses pièces et son fil) ; chaque demande
 *      nouvelle reçoit son numéro, renvoie vers l'origine (issue_de), garde le demandeur, le bénéficiaire, le service,
 *      le canal et le danger de l'origine, arrive « À qualifier » (déjà reçue par le service : pas de nouvelle
 *      validation) avec la priorité de sa catégorie (P1 si danger) et des délais comptés depuis la réception de
 *      l'origine. Les personnes qui suivent l'origine suivent aussi chaque demande nouvelle.
 *   3. Commentaire facultatif, lu par le demandeur sur chaque demande nouvelle (première étape de l'historique).
 *   4. Contrôles avant toute écriture : demande (404, 403), permission (403), module, état (409 DECOUPAGE_ETAT),
 *      chaque partie (404, 403, 409 comme au dépôt). Tout ou rien, dans une transaction (numéros sans trou, NUM-04).
 *   5. Journal sans texte libre : « demande.decoupage » sur l'origine (numéros créés), « demande.create » sur chaque
 *      demande nouvelle (issue_de, lieu, catégorie, priorité). MCP en deux appels.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { assertActif } = require('../modules');
const cycle = require('./cycle');
const numerotation = require('./numerotation');
const qualification = require('./qualification');

const ETATS_DECOUPABLES = ['a_qualifier', 'qualifiee', 'en_attente', 'en_cours', 'rouverte'];
const versSql = (date) => date.toISOString().replace('T', ' ').slice(0, 19);

function controler(user, id, { parties, commentaire, langue }) {
  const d = cycle.demandeDeLEntite(user, id);
  if (!cycle.peut(user, 'demandes:traiter')) throw new AppError(403, 'FORBIDDEN');
  assertActif('demandes');
  if (!ETATS_DECOUPABLES.includes(d.etat)) throw new AppError(409, 'DECOUPAGE_ETAT');
  const db = getDb();
  const o = db.prepare(`SELECT id, entite_id, numero, lieu_id, categorie_id, demandeur_id, beneficiaire_id, beneficiaire_texte, service_id, canal, danger,
    langue, created_at, decompte_depuis FROM demandes WHERE id = ?`).get(d.id);
  const demandes = require('./demandes');
  const prets = parties.map((p) => {
    const lieuId = p.lieu_id || o.lieu_id;
    const categorieId = p.categorie_id || o.categorie_id;
    demandes.lieuDeDemande(o.entite_id, lieuId);
    const cat = demandes.categorieDeDemande(o.entite_id, categorieId);
    return { description: p.description, lieuId, categorieId, priorite: o.danger ? 'P1' : cat.priorite_effective || null };
  });
  return { o, prets, commentaire: commentaire || null, langue: langue || user.lang || o.langue || 'fr' };
}

function decrire(user, id, data) {
  const { o, prets, commentaire } = controler(user, id, data);
  return {
    action: 'decouper_demande', demande: { id: o.id, numero: o.numero }, nouvelles: prets.length,
    parties: prets.map((p) => ({ lieu_id: p.lieuId, categorie_id: p.categorieId, priorite: p.priorite, longueur: p.description.length })),
    commentaire: commentaire ? 1 : 0,
  };
}

function decouper(user, id, data, channel = 'api') {
  const { o, prets, commentaire, langue } = controler(user, id, data);
  const db = getDb();
  const maintenant = new Date();
  const recu = o.decompte_depuis || o.created_at;
  const suiveurs = db.prepare('SELECT user_id, remarque, source FROM demande_suiveurs WHERE demande_id = ?').all(o.id);
  const crees = db.transaction(() => {
    const out = [];
    for (const p of prets) {
      const n = numerotation.attribuer(o.entite_id, 'demande', maintenant);
      const ech = qualification.calculer(db, { entiteId: o.entite_id, recuSql: recu, priorite: p.priorite, categorieId: p.categorieId });
      const quand = versSql(maintenant);
      const r = db.prepare(`INSERT INTO demandes (entite_id, numero, annee, sequence, lieu_id, categorie_id, description, langue, etat, priorite, danger, canal,
        demandeur_id, beneficiaire_id, beneficiaire_texte, priorite_proposee, prise_en_charge_le, echeance_le, decompte_depuis, service_id, issue_de,
        created_by, updated_by, created_at, updated_at, etat_depuis)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'a_qualifier', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(o.entite_id, n.numero, n.annee, n.sequence, p.lieuId, p.categorieId, p.description, langue, p.priorite, o.danger, o.canal,
          o.demandeur_id, o.beneficiaire_id, o.beneficiaire_texte, p.priorite, ech.prise_en_charge_le, ech.echeance_le, recu, o.service_id, o.id,
          user.id, user.id, quand, quand, quand);
      const nid = r.lastInsertRowid;
      for (const s of suiveurs) {
        db.prepare('INSERT INTO demande_suiveurs (demande_id, user_id, remarque, source) VALUES (?, ?, ?, ?)').run(nid, s.user_id, s.remarque, s.source);
      }
      cycle.ecrire(db, { demandeId: nid, entiteId: o.entite_id, de: null, vers: 'a_qualifier', userId: user.id, commentaire,
        commentairePublic: commentaire ? 1 : 0, channel, quand });
      logAudit(user.id, 'demande.create', 'demande', nid,
        { numero: n.numero, issue_de: o.id, lieu_id: p.lieuId, categorie_id: p.categorieId, priorite: p.priorite }, channel, o.entite_id);
      out.push({ id: nid, numero: n.numero });
    }
    logAudit(user.id, 'demande.decoupage', 'demande', o.id,
      { numero: o.numero, nouvelles: out.map((x) => x.numero), commentaire_donne: commentaire ? 1 : 0 }, channel, o.entite_id);
    return out;
  })();
  const fiche = require('./demandes').get(user, o.id);
  return { ...fiche, nouvelles: crees };
}

module.exports = { ETATS_DECOUPABLES, decrire, decouper };
