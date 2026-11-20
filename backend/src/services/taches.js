/**
 * Tâches d'une demande d'intervention, ou ordres de travail (version 0.20.0, étape 16, point 1 ; cahier des charges
 * CYC-03, GES-04 ; décision DV-160).
 *   1. Une demande porte zéro, une ou plusieurs tâches, numérotées dans la demande (rang 1, 2, 3…, jamais réutilisé).
 *      Chaque tâche a un titre (3 à 200 caractères), des consignes à l'ouvrier (2 000 au plus), un corps de métier
 *      (liste « corps_metier » de l'entité ; proposé par celui de la demande), une durée estimée (15 minutes à 7 jours,
 *      comme à la qualification) et un état : à faire, en cours, terminée, annulée (motif obligatoire,
 *      TACHE_MOTIF_REQUIS). L'affectation à un ouvrier, à plusieurs ou à une équipe vient au point 2 ; les heures
 *      réalisées, avec le pointage (étape 18).
 *   2. Droits : lecture « demandes:entite » (service technique) ; écriture « demandes:traiter » (gestionnaire,
 *      responsable). Cloison : la demande doit être de l'entité active (404 inconnue, 403 autre entité, SEC-01). Le
 *      demandeur ne lit jamais les tâches (travail interne au service).
 *   3. États de la demande où les tâches se modifient : reçue par le service et pas encore « Travaux terminés » (à
 *      qualifier, rouverte, qualifiée, planifiée, en cours, en attente, confiée à une entreprise) ; sinon 409
 *      TACHES_FIGEES. Après « Travaux terminés », on repasse la demande « En cours » (passage avec commentaire) pour
 *      rouvrir ou ajouter une tâche.
 *   4. Passages d'une tâche : à faire → en cours, terminée, annulée ; en cours → à faire, terminée, annulée ; terminée ou
 *      annulée → à faire (rouvrir). Tout autre passage : 409 TACHE_PASSAGE_INTERDIT. Annuler exige un motif (500
 *      caractères), gardé sur la tâche et jamais au journal (DV-116).
 *   5. Effet sur la demande, par la table des passages seulement (services/cycle.js, passageAuto) : une tâche qui démarre
 *      fait passer la demande « En cours » si le passage existe depuis son état (qualifiée, en attente…) ; quand la
 *      dernière tâche ouverte se termine ou s'annule et qu'au moins une tâche est terminée, la demande passe « Travaux
 *      terminés » si le passage existe (qualifiée, en cours). Une demande sans tâche garde le passage manuel.
 *   6. « Travaux terminés » demandé à la main pendant qu'une tâche est à faire ou en cours : 409 TACHES_OUVERTES.
 *   7. Une demande qui se ferme (annulée, refusée, regroupée, refusée par le valideur) annule ses tâches encore
 *      ouvertes ; la tâche garde l'état de la demande qui l'a annulée (annulation_auto).
 *   8. Journal : création (titre en longueur seulement, corps de métier, durée), champs changés (changements(), sans
 *      les textes), passage d'une tâche (de, vers, motif donné 0 ou 1), annulations automatiques ; numéro de la demande
 *      et rang de la tâche à chaque ligne.
 *   9. Aucune suppression (CYC-05) : une tâche s'annule.
 *  10. Affectation (point 2 ; PLA-01, DV-161) : une tâche ouverte se confie à une équipe active de l'entité, ou à un à dix
 *      ouvriers (comptes actifs qui ont, dans l'entité, un rôle portant « interventions:realiser »), jamais aux deux à la
 *      fois (409 AFFECTATION_DOUBLE, OUVRIER_INVALIDE, EQUIPE_INVALIDE) ; date prévue et heure de début (heure de
 *      Bruxelles ; une heure demande une date, 409 HEURE_SANS_DATE) ; la durée estimée peut s'y préciser. Une date nouvelle
 *      n'est jamais dans le passé (409 DATE_PASSEE) ; une date déjà notée se garde. L'affectation envoyée remplace la
 *      précédente en entier ; tout vide la retire. Journal : champs changés, avec les identifiants (nommés à la lecture).
 *  11. Effet sur la demande (DV-161, qui remplace DV-118 pour « Planifiée ») : par la table des passages (via
 *      « affecter »), une demande « Qualifiée » dont une tâche ouverte a une date passe « Planifiée » ; une demande
 *      « Planifiée » dont plus aucune tâche ouverte n'a de date revient « Qualifiée ». Le demandeur lit la première date
 *      prévue des tâches ouvertes (intervention_prevue_le), jamais le nom des ouvriers.
 *  12. Suggestion d'affectation (point 3 ; PLA-02, DV-162) : pour une tâche et un jour (celui de la tâche, sinon
 *      aujourd'hui), les ouvriers de l'entité avec leur corps de métier, leurs compétences et leurs équipes ; disponible
 *      si le jour est travaillé pour eux : une équipe à horaire propre a un créneau ce jour-là (jours fériés et fermetures
 *      de l'entité sans effet, DV-28), ou l'ouvrier suit l'horaire de l'entité (sans équipe, ou une équipe qui le suit) et
 *      le jour est ouvré (horaire, jours fériés, congés, fermetures) ; charge planifiée : durées estimées des tâches
 *      ouvertes datées de ce jour qui lui sont confiées, directement ou par une de ses équipes (la tâche elle-même
 *      exclue). Ordre : même corps de métier que la tâche, disponible, charge croissante, nom. Filtre facultatif par
 *      compétence. Rien n'est écrit ; le gestionnaire choisit. Les absences s'ajoutent à l'étape 17 (PLA-04).
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { rolesWith } = require('../roles');
const { avecTrace } = require('./trace');
const listes = require('./listes-valeurs');
const { porteurs } = require('./equipes');

/** Jour à Bruxelles, « AAAA-MM-JJ ». */
const jourBruxelles = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(date);

const ETATS = ['a_faire', 'en_cours', 'terminee', 'annulee'];
const OUVERTS = ['a_faire', 'en_cours'];
/** Règle 3 : états de la demande où ses tâches se modifient. */
const DEMANDE_MODIFIABLE = ['a_qualifier', 'rouverte', 'qualifiee', 'planifiee', 'en_cours', 'en_attente', 'externe'];
/** Règle 4 : passages permis d'une tâche. */
const PASSAGES = {
  a_faire: ['en_cours', 'terminee', 'annulee'],
  en_cours: ['a_faire', 'terminee', 'annulee'],
  terminee: ['a_faire'],
  annulee: ['a_faire'],
};

const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));
const versSql = (date) => date.toISOString().replace('T', ' ').slice(0, 19);

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}
function lecteur(user) {
  entiteActive(user);
  if (!peut(user, 'demandes:entite')) throw new AppError(403, 'FORBIDDEN');
}
function gestion(user) {
  entiteActive(user);
  if (!peut(user, 'demandes:traiter')) throw new AppError(403, 'FORBIDDEN');
}

/** Demande de l'entité active (404, 403). */
function demandeDe(user, demandeId) {
  const d = getDb().prepare('SELECT id, entite_id, numero, etat, corps_metier_id FROM demandes WHERE id = ?').get(demandeId);
  if (!d) throw new AppError(404, 'NOT_FOUND');
  if (d.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  return d;
}
function modifiable(d) {
  if (!DEMANDE_MODIFIABLE.includes(d.etat)) throw new AppError(409, 'TACHES_FIGEES', { etat: d.etat });
}

const COLUMNS = `t.id, t.demande_id, t.entite_id, t.rang, t.titre, t.consignes, t.corps_metier_id, t.duree_estimee_min, t.etat,
  t.motif_annulation, t.annulation_auto, t.etat_depuis, t.created_by, t.updated_by, t.created_at, t.updated_at,
  v.code AS corps_metier_code, v.libelle_fr AS corps_metier_libelle_fr, v.libelle_nl AS corps_metier_libelle_nl,
  t.equipe_id, t.date_prevue, t.heure_debut, q.code AS equipe_code, q.nom_fr AS equipe_nom_fr, q.nom_nl AS equipe_nom_nl`;
const FROM = 'FROM demande_taches t LEFT JOIN listes_valeurs v ON v.id = t.corps_metier_id LEFT JOIN equipes q ON q.id = t.equipe_id';

/** Ouvriers d'une tâche (règle 10), par nom. */
const ouvriersDe = (tacheId) => getDb().prepare(`SELECT u.id, u.first_name AS prenom, u.last_name AS nom FROM tache_ouvriers o
  JOIN users u ON u.id = o.user_id WHERE o.tache_id = ? ORDER BY u.last_name, u.first_name`).all(tacheId);

function fiche(user, t) {
  return { ...avecTrace(user, t), passages: PASSAGES[t.etat], ouvriers: ouvriersDe(t.id) };
}

function load(user, id) {
  const t = getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE t.id = ?`).get(id);
  if (!t) throw new AppError(404, 'NOT_FOUND');
  if (t.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  return t;
}

/** Tâches d'une demande, par rang (lecture brute, sans contrôle : appelée par une fonction qui a contrôlé). */
const deDemande = (demandeId) => getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE t.demande_id = ? ORDER BY t.rang`).all(demandeId);

/** Résumé pour la fiche de la demande : nombre de tâches et nombre de tâches ouvertes. */
function compte(demandeId) {
  const r = getDb().prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN etat IN ('a_faire', 'en_cours') THEN 1 ELSE 0 END) AS ouvertes
    FROM demande_taches WHERE demande_id = ?`).get(demandeId);
  return { total: r.total, ouvertes: r.ouvertes || 0 };
}

function list(user, demandeId) {
  lecteur(user);
  demandeDe(user, demandeId);
  return deDemande(demandeId).map((t) => fiche(user, t));
}

function get(user, id) {
  lecteur(user);
  return fiche(user, load(user, id));
}

/** Corps de métier : valeur active de la liste de l'entité ; une valeur déjà portée reste admise désactivée. */
function controlerCorps(entiteId, id, actuel) {
  if (id === null || id === undefined) return;
  listes.assertUsable(entiteId, 'corps_metier', id, actuel);
}

function create(user, demandeId, data, channel = 'api') {
  gestion(user);
  const d = demandeDe(user, demandeId);
  modifiable(d);
  // Règle 1 : le corps de métier de la demande est proposé ; une valeur explicite (même null) l'emporte.
  const corps = data.corps_metier_id !== undefined ? data.corps_metier_id : d.corps_metier_id;
  controlerCorps(d.entite_id, corps);
  const db = getDb();
  const id = db.transaction(() => {
    const rang = (db.prepare('SELECT MAX(rang) AS m FROM demande_taches WHERE demande_id = ?').get(d.id).m || 0) + 1;
    const r = db.prepare(`INSERT INTO demande_taches (demande_id, entite_id, rang, titre, consignes, corps_metier_id, duree_estimee_min, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(d.id, d.entite_id, rang, data.titre, data.consignes || null, corps ?? null, data.duree_estimee_min ?? null, user.id, user.id);
    logAudit(user.id, 'tache.create', 'tache', r.lastInsertRowid, {
      numero: d.numero, rang, titre_longueur: data.titre.length, consignes_donnees: data.consignes ? 1 : 0,
      corps_metier_id: corps ?? null, duree_estimee_min: data.duree_estimee_min ?? null,
    }, channel, d.entite_id);
    return r.lastInsertRowid;
  })();
  return get(user, id);
}

function update(user, id, data, channel = 'api') {
  gestion(user);
  const t = load(user, id);
  const d = demandeDe(user, t.demande_id);
  modifiable(d);
  if (!OUVERTS.includes(t.etat)) throw new AppError(409, 'TACHE_FERMEE', { etat: t.etat });
  if (data.corps_metier_id !== undefined) controlerCorps(d.entite_id, data.corps_metier_id, t.corps_metier_id);
  const champs = {};
  for (const k of ['titre', 'consignes', 'corps_metier_id', 'duree_estimee_min']) {
    if (data[k] === undefined) continue;
    const v = data[k] === '' ? null : data[k];
    if (v !== t[k]) champs[k] = v;
  }
  if (!Object.keys(champs).length) return fiche(user, t);
  const db = getDb();
  db.transaction(() => {
    const sets = Object.keys(champs).map((k) => `${k} = ?`);
    db.prepare(`UPDATE demande_taches SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(champs), user.id, t.id);
    // Textes jamais au journal (DV-116) : on note qu'ils ont changé ; corps de métier et durée avec leurs valeurs.
    const details = { numero: d.numero, rang: t.rang };
    for (const k of Object.keys(champs)) {
      if (k === 'titre' || k === 'consignes') details[`${k}_modifie`] = 1;
      else { details.avant = { ...(details.avant || {}), [k]: t[k] }; details.apres = { ...(details.apres || {}), [k]: champs[k] }; }
    }
    logAudit(user.id, 'tache.update', 'tache', t.id, details, channel, d.entite_id);
  })();
  return get(user, id);
}

/** Contrôles d'un passage de tâche (règles 2 à 4), sans rien écrire. */
function controlerPassage(user, id, { etat, motif }) {
  gestion(user);
  const t = load(user, id);
  const d = demandeDe(user, t.demande_id);
  modifiable(d);
  if (!(PASSAGES[t.etat] || []).includes(etat)) throw new AppError(409, 'TACHE_PASSAGE_INTERDIT', { de: t.etat, vers: etat });
  const m = (motif || '').trim();
  if (etat === 'annulee' && !m) throw new AppError(409, 'TACHE_MOTIF_REQUIS');
  if (etat !== 'annulee' && m) throw new AppError(409, 'TACHE_MOTIF_INUTILE');
  return { t, d, motif: m || null };
}

/** Effet d'un passage, sans l'écrire : première étape de l'annulation par le MCP (API-06). */
function decrirePassage(user, id, data) {
  const { t, d } = controlerPassage(user, id, data);
  const restantes = deDemande(d.id).filter((x) => x.id !== t.id && OUVERTS.includes(x.etat)).length;
  return { action: 'change_etat_tache', demande: { id: d.id, numero: d.numero }, tache: { id: t.id, rang: t.rang }, de: t.etat, vers: data.etat,
    motif: data.motif ? 1 : 0, taches_encore_ouvertes: OUVERTS.includes(data.etat) ? restantes + 1 : restantes };
}

/**
 * Passage d'une tâche (règle 4) et son effet sur la demande (règle 5), dans une seule transaction. Rend la tâche à jour
 * et l'état de la demande après le passage.
 */
function passer(user, id, data, channel = 'api') {
  const { t, d, motif } = controlerPassage(user, id, data);
  const db = getDb();
  const maintenant = versSql(new Date());
  let demandeVers = null;
  db.transaction(() => {
    db.prepare(`UPDATE demande_taches SET etat = ?, etat_depuis = ?, motif_annulation = ?, annulation_auto = NULL, updated_by = ?, updated_at = ? WHERE id = ?`)
      .run(data.etat, maintenant, data.etat === 'annulee' ? motif : null, user.id, maintenant, t.id);
    logAudit(user.id, 'tache.etat', 'tache', t.id, { numero: d.numero, rang: t.rang, de: t.etat, vers: data.etat, motif_donne: motif ? 1 : 0 }, channel, d.entite_id);
    const cycle = require('./cycle');
    if (data.etat === 'en_cours') demandeVers = cycle.passageAuto(db, user, d.id, 'en_cours', channel);
    else if (!OUVERTS.includes(data.etat)) {
      const toutes = db.prepare('SELECT etat FROM demande_taches WHERE demande_id = ?').all(d.id).map((x) => x.etat);
      if (!toutes.some((e) => OUVERTS.includes(e)) && toutes.includes('terminee')) demandeVers = cycle.passageAuto(db, user, d.id, 'terminee', channel);
    }
    // Règle 11 : une tâche fermée ou rouverte change les dates des tâches ouvertes.
    if (!demandeVers) demandeVers = replanifier(db, user, d.id, channel);
  })();
  const etat = getDb().prepare('SELECT etat FROM demandes WHERE id = ?').get(d.id).etat;
  return { ...get(user, id), demande_etat: etat, demande_passage_auto: demandeVers };
}

/**
 * Règle 11 : « Planifiée » si une tâche ouverte a une date, retour à « Qualifiée » sinon, par la table des passages ;
 * dans la transaction de l'appelant. Rend l'état d'arrivée ou null.
 */
function replanifier(db, user, demandeId, channel) {
  const datee = db.prepare(`SELECT 1 FROM demande_taches WHERE demande_id = ? AND etat IN ('a_faire', 'en_cours') AND date_prevue IS NOT NULL`).get(demandeId);
  const cycle = require('./cycle');
  return datee ? cycle.passageAuto(db, user, demandeId, 'planifiee', channel) : cycle.passageAuto(db, user, demandeId, 'qualifiee', channel, { seulementDepuis: 'planifiee' });
}

/** Première date prévue des tâches ouvertes (lue par le demandeur, règle 11), ou null. */
const interventionPrevue = (demandeId) => getDb().prepare(`SELECT MIN(date_prevue) AS d FROM demande_taches WHERE demande_id = ?
  AND etat IN ('a_faire', 'en_cours') AND date_prevue IS NOT NULL`).get(demandeId).d || null;

/** Affectation d'une tâche (règles 10 et 11). data : ouvriers, equipe_id, date_prevue, heure_debut, duree_estimee_min. */
function affecter(user, id, data, channel = 'api') {
  gestion(user);
  const t = load(user, id);
  const d = demandeDe(user, t.demande_id);
  modifiable(d);
  if (!OUVERTS.includes(t.etat)) throw new AppError(409, 'TACHE_FERMEE', { etat: t.etat });
  const ouvriers = [...new Set(data.ouvriers || [])];
  const equipe = data.equipe_id ?? null;
  if (ouvriers.length && equipe) throw new AppError(409, 'AFFECTATION_DOUBLE');
  const admis = porteurs(d.entite_id, 'interventions:realiser');
  const fautif = ouvriers.find((o) => !admis.has(o));
  if (fautif) throw new AppError(409, 'OUVRIER_INVALIDE', { user_id: fautif });
  if (equipe && !getDb().prepare('SELECT 1 FROM equipes WHERE id = ? AND entite_id = ? AND is_active = 1').get(equipe, d.entite_id)) {
    throw new AppError(409, 'EQUIPE_INVALIDE', { equipe_id: equipe });
  }
  const date = data.date_prevue ?? null;
  const heure = data.heure_debut ?? null;
  if (heure && !date) throw new AppError(409, 'HEURE_SANS_DATE');
  if (date && date !== t.date_prevue && date < jourBruxelles()) throw new AppError(409, 'DATE_PASSEE', { date_prevue: date });
  const duree = data.duree_estimee_min === undefined ? t.duree_estimee_min : data.duree_estimee_min;
  const avantOuvriers = getDb().prepare('SELECT user_id FROM tache_ouvriers WHERE tache_id = ? ORDER BY user_id').all(t.id).map((x) => x.user_id);
  const apresOuvriers = [...ouvriers].sort((a, b) => a - b);
  const avant = { ouvriers: avantOuvriers, equipe_id: t.equipe_id, date_prevue: t.date_prevue, heure_debut: t.heure_debut, duree_estimee_min: t.duree_estimee_min };
  const apres = { ouvriers: apresOuvriers, equipe_id: equipe, date_prevue: date, heure_debut: heure, duree_estimee_min: duree ?? null };
  const changes = Object.keys(avant).filter((k) => JSON.stringify(avant[k]) !== JSON.stringify(apres[k]));
  if (!changes.length) return { ...fiche(user, t), demande_etat: d.etat, demande_passage_auto: null };
  const db = getDb();
  let demandeVers = null;
  db.transaction(() => {
    db.prepare(`UPDATE demande_taches SET equipe_id = ?, date_prevue = ?, heure_debut = ?, duree_estimee_min = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(equipe, date, heure, duree ?? null, user.id, t.id);
    db.prepare('DELETE FROM tache_ouvriers WHERE tache_id = ?').run(t.id);
    for (const o of apresOuvriers) db.prepare('INSERT INTO tache_ouvriers (tache_id, user_id, created_by) VALUES (?, ?, ?)').run(t.id, o, user.id);
    logAudit(user.id, 'tache.affecter', 'tache', t.id, {
      numero: d.numero, rang: t.rang,
      avant: Object.fromEntries(changes.map((k) => [k, avant[k]])), apres: Object.fromEntries(changes.map((k) => [k, apres[k]])),
    }, channel, d.entite_id);
    demandeVers = replanifier(db, user, d.id, channel);
  })();
  const etat = getDb().prepare('SELECT etat FROM demandes WHERE id = ?').get(d.id).etat;
  return { ...get(user, id), demande_etat: etat, demande_passage_auto: demandeVers };
}

/** Règle 12 : suggestion d'affectation pour une tâche (lecture seule). */
function suggestions(user, id, { date, competence_id: competence } = {}) {
  gestion(user);
  const t = load(user, id);
  demandeDe(user, t.demande_id);
  const jour = date || t.date_prevue || jourBruxelles();
  const entiteId = t.entite_id;
  const db = getDb();
  const ids = [...porteurs(entiteId, 'interventions:realiser')];
  const jourSemaine = ((new Date(`${jour}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const entiteOuvre = require('./echeances').jourOuvre(entiteId, jour);
  const affectes = new Set(db.prepare('SELECT user_id FROM tache_ouvriers WHERE tache_id = ?').all(t.id).map((x) => x.user_id));
  const lignes = ids.map((uid) => {
    const u = db.prepare('SELECT id, first_name, last_name FROM users WHERE id = ?').get(uid);
    const corps = db.prepare(`SELECT v.id, v.code, v.libelle_fr, v.libelle_nl FROM ouvrier_profils p JOIN listes_valeurs v ON v.id = p.corps_metier_id
      WHERE p.user_id = ? AND p.entite_id = ?`).get(uid, entiteId) || null;
    const competences = db.prepare(`SELECT v.id, v.code, v.libelle_fr, v.libelle_nl FROM ouvrier_competences c JOIN listes_valeurs v ON v.id = c.valeur_id
      WHERE c.user_id = ? AND c.entite_id = ? ORDER BY v.ordre, v.libelle_fr`).all(uid, entiteId);
    const equipes = db.prepare(`SELECT q.id, q.code, q.nom_fr, q.nom_nl,
        (SELECT COUNT(*) FROM equipe_horaires h WHERE h.equipe_id = q.id) AS creneaux,
        (SELECT COUNT(*) FROM equipe_horaires h WHERE h.equipe_id = q.id AND h.jour = ?) AS creneau_du_jour
      FROM equipe_membres m JOIN equipes q ON q.id = m.equipe_id WHERE m.user_id = ? AND q.entite_id = ? AND q.is_active = 1 ORDER BY q.ordre, q.nom_fr`)
      .all(jourSemaine, uid, entiteId);
    const suitEntite = !equipes.length || equipes.some((q) => !q.creneaux);
    const disponible = equipes.some((q) => q.creneaux && q.creneau_du_jour) || (suitEntite && entiteOuvre);
    const charge = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(t.duree_estimee_min), 0) AS minutes FROM demande_taches t
      WHERE t.entite_id = ? AND t.date_prevue = ? AND t.etat IN ('a_faire', 'en_cours') AND t.id <> ?
        AND (EXISTS (SELECT 1 FROM tache_ouvriers o WHERE o.tache_id = t.id AND o.user_id = ?)
          OR t.equipe_id IN (SELECT m.equipe_id FROM equipe_membres m WHERE m.user_id = ?))`).get(entiteId, jour, t.id, uid, uid);
    return {
      id: u.id, prenom: u.first_name, nom: u.last_name, corps_metier: corps, competences,
      equipes: equipes.map(({ id: qid, code, nom_fr: nf, nom_nl: nn }) => ({ id: qid, code, nom_fr: nf, nom_nl: nn })),
      meme_corps: t.corps_metier_id && corps && corps.id === t.corps_metier_id ? 1 : 0,
      disponible: disponible ? 1 : 0, charge_min: charge.minutes, nb_taches: charge.n, deja_affecte: affectes.has(uid) ? 1 : 0,
    };
  }).filter((x) => !competence || x.competences.some((c) => c.id === competence));
  lignes.sort((a, b) => b.meme_corps - a.meme_corps || b.disponible - a.disponible || a.charge_min - b.charge_min
    || a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'));
  return { tache: { id: t.id, rang: t.rang, corps_metier_id: t.corps_metier_id, duree_estimee_min: t.duree_estimee_min }, date: jour, jour_ouvre_entite: entiteOuvre ? 1 : 0, ouvriers: lignes };
}

/** Règle 6 : appelée par le passage manuel « Travaux terminés » (services/cycle.js). */
function assertToutesFinies(demandeId) {
  const { ouvertes } = compte(demandeId);
  if (ouvertes) throw new AppError(409, 'TACHES_OUVERTES', { ouvertes });
}

/** Règle 7 : appelée par cycle.ecrire() quand la demande se ferme, dans sa transaction. */
function annulerOuvertes(db, { demandeId, entiteId, userId, vers, channel = 'api' }) {
  const ouvertes = db.prepare(`SELECT id, rang, etat FROM demande_taches WHERE demande_id = ? AND etat IN ('a_faire', 'en_cours')`).all(demandeId);
  if (!ouvertes.length) return;
  const maintenant = versSql(new Date());
  const numero = db.prepare('SELECT numero FROM demandes WHERE id = ?').get(demandeId)?.numero;
  for (const t of ouvertes) {
    db.prepare(`UPDATE demande_taches SET etat = 'annulee', etat_depuis = ?, annulation_auto = ?, motif_annulation = NULL, updated_by = ?, updated_at = ? WHERE id = ?`)
      .run(maintenant, vers, userId || null, maintenant, t.id);
    logAudit(userId || null, 'tache.etat', 'tache', t.id, { numero, rang: t.rang, de: t.etat, vers: 'annulee', auto: vers }, channel, entiteId);
  }
}

module.exports = {
  ETATS, OUVERTS, PASSAGES, DEMANDE_MODIFIABLE, list, get, create, update, decrirePassage, passer, affecter, suggestions, interventionPrevue, deDemande, compte,
  assertToutesFinies, annulerOuvertes,
};
