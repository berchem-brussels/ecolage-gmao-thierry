/**
 * Cycle de vie d'une demande d'intervention (version 0.14.0, étape 9 ; cahier des charges, section 8.1 ; CYC-01,
 * CYC-02, CYC-04, CYC-05, CLO-01 ; décision DV-118).
 *   1. Passages permis en données (CYC-01) : table demande_transitions, copiée de config/cycle-de-vie.json à
 *      l'installation et au démarrage pour les passages qui manquent ; un passage désactivé en base n'est jamais
 *      réactivé. Tout passage absent ou désactivé est refusé (409 TRANSITION_INTERDITE) avant toute écriture.
 *   2. Ordre des contrôles (API-04) : entité active, demande de l'entité (404, 403), permission du passage (403 ; une
 *      personne sans aucune permission du cycle reçoit 403 et jamais 409), module, passage, motif, commentaire,
 *      écriture, historique, journal.
 *   3. Motif : un passage qui nomme une liste (motifs d'attente, motifs de refus, causes de panne) exige une valeur
 *      active de cette liste dans l'entité ; un passage sans liste refuse un motif. Commentaire : interdit, facultatif
 *      ou obligatoire selon le passage ; public (lu par le demandeur) ou interne au service. Compte rendu des travaux :
 *      seulement à la clôture, interne. La clôture garde la cause de la panne sur la fiche (CLO-01).
 *   4. Historique (CYC-02) : chaque passage, le dépôt et la qualification s'inscrivent avec l'auteur, la date, l'état
 *      précédent, le motif et le canal (écran, API, MCP, GRC, système). Le demandeur lit l'historique de sa demande sans
 *      le nom des agents du service ni les commentaires internes (SEC-02, SUI-07).
 *   5. Libellés (CYC-04) : chaque entité règle, état par état, le libellé vu par le demandeur et celui envoyé à la GRC,
 *      en FR et en NL (permission « parametres:gerer », responsable) ; les libellés livrés viennent de la configuration.
 *   6. Journal : jamais de texte libre (DV-116) : le passage note l'état de départ, l'état d'arrivée, le motif (valeur
 *      de liste, nommée à la lecture) et 0 ou 1 pour le commentaire et le compte rendu.
 *   7. Aucune suppression (CYC-05) : une demande s'annule avec un motif.
 *   8. Suspension du délai (0.14.0, PRI-03, DV-119) : une mise « En attente » pour un motif coché dans le réglage de
 *      l'entité « demandes.attente_suspend » marque l'attente comme suspensive (le réglage du moment de l'entrée fait
 *      foi). À la sortie de l'attente vers un état ouvert, l'échéance de fin est repoussée du temps passé en attente
 *      (minutes ouvrables, ou calendaires pour une priorité en heures calendaires) et ce temps s'ajoute au cumul de la
 *      fiche ; le journal note l'échéance avant et après.
 *   9. Demandeur (0.14.0, point 5 ; SUI-05, E-21) : un passage d'acteur « demandeur » est permis au demandeur et au
 *      bénéficiaire de la demande (pas à qui la suit seulement) : annulation avec un motif tant que les travaux n'ont
 *      pas commencé (condition « jamais_en_cours » : aucun passage « En cours » à l'historique). Une personne qui est
 *      aussi du service technique passe par le passage du service quand il existe. Le demandeur et le bénéficiaire
 *      complètent la demande (texte) tant qu'elle n'est pas fermée ; chaque complément est daté et garde la langue.
 *  10. Avis et réouverture (0.14.0, point 6 ; SUI-06) : après la clôture, le demandeur ou le bénéficiaire donne un avis
 *      (cinq niveaux, commentaire facultatif), un seul par clôture. Il peut rouvrir la demande en disant ce qui ne va
 *      pas, dans le délai de réouverture de l'entité compté depuis la clôture (condition « delai_reouverture » ; 0 jour
 *      ferme la réouverture). À la réouverture, les délais repartent de ce moment : prise en charge et fin recalculées
 *      depuis l'instant de réouverture, temps suspendu remis à zéro ; la demande revient dans la file « À qualifier ».
 *  11. Valideur (0.16.0, étape 11 ; DEM-15, ROL-04) : un passage d'acteur « valideur » est permis au valideur du service
 *      de la demande ce jour-là (services/services.js : titulaire, ou suppléant pendant sa période, avec la permission
 *      « demandes:valider » dans l'entité). Valider fait passer « En validation » à « À qualifier » ; les délais
 *      (prise en charge, fin) repartent de la validation, comme si la demande arrivait au service technique à cet
 *      instant. Refuser exige un motif, lu par le demandeur. L'historique dit « valideur » pour ces passages.
 * Module « demandes » du noyau : toujours actif ; le contrôle est posé pour l'ordre API-04.
 */
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { assertActif } = require('../modules');
const { rolesWith } = require('../roles');
const { avecTrace } = require('./trace');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'cycle-de-vie.json'), 'utf8'));
const ETATS = Object.keys(CONFIG.etats);
const FERMES = ETATS.filter((e) => CONFIG.etats[e].ferme);
/** États qui ne comptent pas pour le retard (fermés et « Travaux terminés »). */
const HORS_DELAI = ETATS.filter((e) => !CONFIG.etats[e].compte_retard);
/** Canal de l'historique selon le canal de l'appel : l'écran appelle l'API par le cookie de session. */
const CANAUX = { api: 'ecran', mcp: 'mcp', grc: 'grc', systeme: 'systeme' };
/** Permissions des passages du service technique (le demandeur passe par la règle 9). */
const PERMISSIONS_SERVICE = [...new Set(CONFIG.transitions.filter((t) => (t.acteur || 'service') === 'service').map((t) => t.permission))];

const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));
const versSql = (date) => date.toISOString().replace('T', ' ').slice(0, 19);
const canalDe = (channel) => CANAUX[channel] || 'api';

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}

/** Passages livrés qui manquent en base (règle 1). db : la base enveloppée, à l'installation comme au démarrage. */
function seedTransitions(db = getDb(), { initiaux = false } = {}) {
  CONFIG.transitions.forEach((t, i) => {
    if (initiaux && t.depuis) return;
    const acteur = t.acteur || 'service';
    if (db.prepare('SELECT 1 FROM demande_transitions WHERE de_etat = ? AND vers_etat = ? AND acteur = ?').get(t.de, t.vers, acteur)) return;
    db.prepare(`INSERT INTO demande_transitions (de_etat, vers_etat, permission, acteur, condition, via, motif_liste, commentaire, commentaire_public, compte_rendu, ordre)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(t.de, t.vers, t.permission, acteur, t.condition || null, t.via || null, t.motif_liste || null, t.commentaire || 'interdit',
        t.commentaire_public ? 1 : 0, t.compte_rendu ? 1 : 0, (i + 1) * 10);
  });
}

/** Libellés livrés des états d'une entité : créés s'ils manquent, jamais modifiés (règle 5). */
function seedEntite(entiteId) {
  const db = getDb();
  for (const code of ETATS) {
    if (db.prepare('SELECT 1 FROM demande_etats WHERE entite_id = ? AND code = ?').get(entiteId, code)) continue;
    const e = CONFIG.etats[code];
    db.prepare('INSERT INTO demande_etats (entite_id, code, libelle_fr, libelle_nl, grc_fr, grc_nl) VALUES (?, ?, ?, ?, ?, ?)')
      .run(entiteId, code, e.fr, e.nl, e.fr, e.nl);
  }
}

function seedAll() {
  for (const e of getDb().prepare('SELECT id FROM entites WHERE is_active = 1').all()) seedEntite(e.id);
}

function lecteur(user) {
  const entiteId = entiteActive(user);
  if (!user.roles || !user.roles.length) throw new AppError(403, 'FORBIDDEN');
  return entiteId;
}

const COLONNES_ETAT = 'id, entite_id, code, libelle_fr, libelle_nl, grc_fr, grc_nl, updated_by, updated_at';

/** Fiche d'un état : libellés de l'entité, propriétés du cycle, libellés livrés et trace de modification. */
function ficheEtat(user, r) {
  const e = CONFIG.etats[r.code];
  const livre = r.libelle_fr === e.fr && r.libelle_nl === e.nl && r.grc_fr === e.fr && r.grc_nl === e.nl;
  return {
    ...avecTrace(user, r, { estDefaut: livre }),
    ferme: e.ferme, compte_retard: e.compte_retard, suspend: e.suspend, livre_fr: e.fr, livre_nl: e.nl,
  };
}

/** États d'une demande avec leurs libellés dans l'entité active, dans l'ordre du cycle (règle 5). */
function listEtats(user) {
  const entiteId = lecteur(user);
  const rows = getDb().prepare(`SELECT ${COLONNES_ETAT} FROM demande_etats WHERE entite_id = ?`).all(entiteId);
  return ETATS.map((code) => rows.find((r) => r.code === code)).filter(Boolean).map((r) => ficheEtat(user, r));
}

/** Change les libellés d'un état dans l'entité active (responsable). data : libelle_fr, libelle_nl, grc_fr, grc_nl. */
function updateEtat(user, code, data, channel = 'api') {
  const entiteId = entiteActive(user);
  if (!peut(user, 'parametres:gerer')) throw new AppError(403, 'FORBIDDEN');
  assertActif('demandes');
  if (!ETATS.includes(code)) throw new AppError(404, 'NOT_FOUND');
  const db = getDb();
  const r = db.prepare(`SELECT ${COLONNES_ETAT} FROM demande_etats WHERE entite_id = ? AND code = ?`).get(entiteId, code);
  if (!r) throw new AppError(404, 'NOT_FOUND');
  const avant = {};
  const apres = {};
  for (const k of ['libelle_fr', 'libelle_nl', 'grc_fr', 'grc_nl']) {
    if (data[k] !== undefined && data[k] !== r[k]) { avant[k] = r[k]; apres[k] = data[k]; }
  }
  if (Object.keys(apres).length) {
    const sets = Object.keys(apres).map((k) => `${k} = ?`);
    db.transaction(() => {
      db.prepare(`UPDATE demande_etats SET ${sets.join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(...Object.values(apres), user.id, r.id);
      logAudit(user.id, 'etat_demande.update', 'etat_demande', r.id, { code, avant, apres }, channel, entiteId);
    })();
  }
  return ficheEtat(user, db.prepare(`SELECT ${COLONNES_ETAT} FROM demande_etats WHERE id = ?`).get(r.id));
}

const COLONNES_TRANSITION = 'id, de_etat, vers_etat, permission, acteur, condition, via, motif_liste, commentaire, commentaire_public, compte_rendu, ordre, is_active';

/** Table des passages, pour toute l'instance (lecture : toute personne qui a un rôle dans l'entité active). */
function listTransitions(user) {
  lecteur(user);
  return getDb().prepare(`SELECT ${COLONNES_TRANSITION} FROM demande_transitions ORDER BY ordre, id`).all();
}

/** Le demandeur ou le bénéficiaire de la demande (règle 9). */
const concerne = (user, d) => d.demandeur_id === user.id || (!!d.beneficiaire_id && d.beneficiaire_id === user.id);
/** Aucun passage « En cours » à l'historique (condition « jamais_en_cours », règle 9). */
const jamaisEnCours = (demandeId) => !getDb().prepare("SELECT 1 FROM demande_historique WHERE demande_id = ? AND vers_etat = 'en_cours'").get(demandeId);
/** Règle 10 : fin du délai de réouverture (clôture + N jours de l'entité), ou null si la réouverture est fermée. */
function limiteReouverture(d) {
  if (d.etat !== 'cloturee' || !d.etat_depuis) return null;
  const jours = Number(require('./parametres-entite').valeur(d.entite_id, 'demandes.delai_reouverture_jours')) || 0;
  if (!jours) return null;
  return new Date(new Date(`${d.etat_depuis.replace(' ', 'T')}Z`).getTime() + jours * 86400000);
}
/** Condition d'un passage remplie (règles 9 et 10). */
const conditionRemplie = (t, d) => (t.condition === 'jamais_en_cours' ? jamaisEnCours(d.id)
  : t.condition === 'delai_reouverture' ? (limiteReouverture(d) || 0) > new Date() : true);

/** Règle 11 : la personne valide aujourd'hui les demandes du service de la demande. */
const valideurDe = (user, d) => !!d.service_id && peut(user, 'demandes:valider') && require('./services').valideurs(d.service_id).includes(user.id);

/**
 * Passage qui s'applique à la personne : celui du service s'il le peut, sinon celui du valideur s'il valide la demande,
 * sinon celui du demandeur s'il est concerné.
 */
function choisir(user, d, rows) {
  return rows.find((t) => t.acteur === 'service' && peut(user, t.permission))
    || rows.find((t) => t.acteur === 'valideur' && peut(user, t.permission) && valideurDe(user, d))
    || rows.find((t) => t.acteur === 'demandeur' && concerne(user, d) && peut(user, t.permission)) || null;
}

/**
 * Passages actifs qui partent de l'état de la demande et que la personne peut faire. acteur : « service » pour la fiche
 * du service technique, « demandeur » pour celle du demandeur (conditions vérifiées).
 */
function permises(user, d, acteur = 'service') {
  return getDb().prepare(`SELECT ${COLONNES_TRANSITION} FROM demande_transitions WHERE de_etat = ? AND acteur = ? AND is_active = 1 ORDER BY ordre, id`)
    .all(d.etat, acteur).filter((t) => peut(user, t.permission)
      && (acteur === 'service' || (acteur === 'valideur' ? valideurDe(user, d) : concerne(user, d)))
      && conditionRemplie(t, d))
    .map(({ vers_etat: vers, via, motif_liste: motifListe, commentaire, commentaire_public: pub, compte_rendu: cr }) => (
      { vers, via, motif_liste: motifListe, commentaire, commentaire_public: pub, compte_rendu: cr }));
}

/** Inscrit un passage dans l'historique de la fiche (règle 4). */
function ecrire(db, { demandeId, entiteId, de, vers, userId, motifId = null, commentaire = null, commentairePublic = 0, channel = 'api', quand }) {
  db.prepare(`INSERT INTO demande_historique (demande_id, entite_id, de_etat, vers_etat, user_id, motif_id, commentaire, commentaire_public, canal, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(demandeId, entiteId, de, vers, userId || null, motifId, commentaire, commentairePublic ? 1 : 0, canalDe(channel), quand);
}

/** Demande de l'entité active, pour un passage : 404 inconnue, 403 autre entité. */
function demandeDeLEntite(user, id) {
  const entiteId = entiteActive(user);
  const d = getDb().prepare(`SELECT id, entite_id, numero, etat, demandeur_id, beneficiaire_id, priorite, categorie_id, prise_en_charge_le,
    echeance_le, date_convenue, etat_depuis, attente_suspend, service_id FROM demandes WHERE id = ?`).get(id);
  if (!d) throw new AppError(404, 'NOT_FOUND');
  if (d.entite_id !== entiteId) throw new AppError(403, 'FORBIDDEN');
  return d;
}

/** Passage demandé, contrôlé (règles 1 à 3) : rend { d, t, motifId, commentaire, compteRendu } sans rien écrire. */
function controler(user, id, data) {
  const d = demandeDeLEntite(user, id);
  // Règles 2, 9 et 11 : le service technique, le valideur de la demande, le demandeur ou le bénéficiaire peuvent demander
  // un passage ; personne d'autre.
  const service = PERMISSIONS_SERVICE.some((p) => peut(user, p));
  const valideur = valideurDe(user, d);
  if (!service && !valideur && !concerne(user, d)) throw new AppError(403, 'FORBIDDEN');
  const rows = getDb().prepare(`SELECT ${COLONNES_TRANSITION} FROM demande_transitions WHERE de_etat = ? AND vers_etat = ? AND is_active = 1 ORDER BY acteur DESC`).all(d.etat, data.etat);
  const t = choisir(user, d, rows);
  // Un état que le demandeur (ou le valideur) ne peut jamais viser (« En cours », « Clôturée »…) : 403, jamais 409 (règle 2).
  const visable = (acteur) => CONFIG.transitions.some((x) => x.acteur === acteur && x.vers === data.etat);
  if (!t && !service && !visable('demandeur') && !(valideur && visable('valideur'))) throw new AppError(403, 'FORBIDDEN');
  assertActif('demandes');
  if (!t) throw new AppError(409, 'TRANSITION_INTERDITE', { de: d.etat, vers: data.etat });
  if (t.via === 'qualifier') throw new AppError(409, 'TRANSITION_PAR_QUALIFICATION');
  // 0.16.0 : fusion et découpage passent par leur route (services/fusion.js).
  if (t.via) throw new AppError(409, 'TRANSITION_PAR_ROUTE', { via: t.via });
  if (t.condition === 'jamais_en_cours' && !jamaisEnCours(d.id)) throw new AppError(409, 'TRAVAUX_COMMENCES');
  if (t.condition === 'delai_reouverture' && !conditionRemplie(t, d)) throw new AppError(409, 'DELAI_REOUVERTURE');
  const motifId = data.motif_id ?? null;
  if (t.motif_liste) {
    if (!motifId) throw new AppError(409, 'MOTIF_REQUIS', { liste: t.motif_liste });
    require('./listes-valeurs').assertUsable(d.entite_id, t.motif_liste, motifId);
  } else if (motifId) throw new AppError(409, 'MOTIF_INUTILE');
  const commentaire = data.commentaire || null;
  if (t.commentaire === 'obligatoire' && !commentaire) throw new AppError(409, 'COMMENTAIRE_REQUIS');
  if (t.commentaire === 'interdit' && commentaire) throw new AppError(409, 'COMMENTAIRE_INUTILE');
  const compteRendu = data.compte_rendu === undefined ? undefined : data.compte_rendu || null;
  if (!t.compte_rendu && compteRendu) throw new AppError(409, 'COMPTE_RENDU_INUTILE');
  return { d, t, motifId, commentaire, compteRendu };
}

/** Effet d'un passage, sans l'écrire : première étape d'un passage par le MCP (API-06). */
function decrire(user, id, data) {
  const { d, t, motifId, commentaire, compteRendu } = controler(user, id, data);
  const motif = motifId ? getDb().prepare('SELECT code, libelle_fr, libelle_nl FROM listes_valeurs WHERE id = ?').get(motifId) : null;
  return {
    action: 'change_etat_demande', demande: { id: d.id, numero: d.numero }, de: d.etat, vers: t.vers_etat, motif,
    commentaire: commentaire ? 1 : 0, commentaire_lu_par_le_demandeur: commentaire ? t.commentaire_public : 0, compte_rendu: compteRendu ? 1 : 0,
  };
}

/**
 * Règle 8 : effet d'un passage sur le délai. Rend l'indicateur d'attente suspensive après le passage, l'échéance de fin
 * après le passage et le temps suspendu à ajouter au cumul (minutes ouvrables et calendaires).
 */
function suspension(db, d, t, motifId, instant) {
  const out = { attenteSuspend: 0, echeance: d.echeance_le, ouvrables: 0, calendaires: 0 };
  if (t.vers_etat === 'en_attente') {
    const code = motifId ? db.prepare('SELECT code FROM listes_valeurs WHERE id = ?').get(motifId)?.code : null;
    out.attenteSuspend = code && require('./parametres-entite').codes(d.entite_id, 'demandes.attente_suspend').includes(code) ? 1 : 0;
    return out;
  }
  if (d.etat !== 'en_attente' || d.attente_suspend !== 1 || FERMES.includes(t.vers_etat) || !d.etat_depuis) return out;
  const echeances = require('./echeances');
  const debut = new Date(`${d.etat_depuis.replace(' ', 'T')}Z`);
  out.calendaires = Math.max(0, Math.round((instant.getTime() - debut.getTime()) / 60000));
  try { out.ouvrables = echeances.minutesOuvrables(d.entite_id, debut, instant); } catch (e) { out.ouvrables = 0; }
  if (d.echeance_le && d.priorite) {
    const prio = db.prepare('SELECT unite, fin FROM priorites WHERE entite_id = ? AND code = ?').get(d.entite_id, d.priorite);
    // Une date convenue (priorité sans délai de fin) ne bouge pas ; un calendrier vide laisse l'échéance telle quelle.
    if (prio && prio.fin !== null) {
      try {
        out.echeance = versSql(echeances.repousser(d.entite_id, new Date(`${d.echeance_le.replace(' ', 'T')}Z`), prio.unite, out));
      } catch (e) { out.echeance = d.echeance_le; }
    }
  }
  return out;
}

/**
 * Fait passer une demande dans un autre état (règles 1 à 6, 8). data : etat (état d'arrivée), motif_id, commentaire,
 * compte_rendu (clôture). Rend la fiche à jour.
 */
function appliquer(user, id, data, channel = 'api') {
  const { d, t, motifId, commentaire, compteRendu } = controler(user, id, data);
  const db = getDb();
  const instant = new Date();
  const maintenant = versSql(instant);
  const cloture = t.compte_rendu === 1;
  const s = suspension(db, d, t, motifId, instant);
  // Règle 10 : réouverture, délais recalculés depuis maintenant ; temps suspendu remis à zéro. Règle 11 : de même à la
  // validation, la demande arrive au service technique à cet instant.
  const reouverture = t.vers_etat === 'rouverte' || (d.etat === 'en_validation' && t.vers_etat === 'a_qualifier');
  let prise = d.prise_en_charge_le;
  if (reouverture) {
    const e = require('./qualification').calculer(db, { entiteId: d.entite_id, recuSql: maintenant, priorite: d.priorite, categorieId: d.categorie_id, dateConvenue: d.date_convenue });
    prise = e.prise_en_charge_le;
    s.echeance = e.echeance_le;
  }
  db.transaction(() => {
    if (reouverture) {
      db.prepare('UPDATE demandes SET decompte_depuis = ?, prise_en_charge_le = ?, suspendu_ouvrable_min = 0, suspendu_calendaire_min = 0 WHERE id = ?')
        .run(maintenant, prise, d.id);
    }
    db.prepare(`UPDATE demandes SET etat = ?, etat_depuis = ?, attente_suspend = ?, echeance_le = ?,
      suspendu_ouvrable_min = suspendu_ouvrable_min + ?, suspendu_calendaire_min = suspendu_calendaire_min + ?,
      cause_id = CASE WHEN ? = 1 THEN ? ELSE cause_id END,
      compte_rendu = CASE WHEN ? = 1 THEN ? ELSE compte_rendu END,
      updated_by = ?, updated_at = ? WHERE id = ?`)
      .run(t.vers_etat, maintenant, s.attenteSuspend, s.echeance, s.ouvrables, s.calendaires, cloture ? 1 : 0, motifId, cloture && compteRendu !== undefined ? 1 : 0, compteRendu ?? null,
        user.id, maintenant, d.id);
    ecrire(db, { demandeId: d.id, entiteId: d.entite_id, de: d.etat, vers: t.vers_etat, userId: user.id, motifId, commentaire,
      commentairePublic: commentaire ? t.commentaire_public : 0, channel, quand: maintenant });
    logAudit(user.id, 'demande.transition', 'demande', d.id, {
      numero: d.numero, de: d.etat, vers: t.vers_etat, ...(motifId ? { motif_id: motifId } : {}),
      commentaire_donne: commentaire ? 1 : 0, ...(cloture ? { compte_rendu_donne: compteRendu ? 1 : 0 } : {}),
      ...(t.vers_etat === 'en_attente' ? { suspendu: s.attenteSuspend } : {}),
      ...(s.echeance !== d.echeance_le ? { avant: { echeance_le: d.echeance_le }, apres: { echeance_le: s.echeance } } : {}),
    }, channel, d.entite_id);
  })();
  return require('./demandes').get(user, d.id);
}

/**
 * Avis du demandeur ou du bénéficiaire sur une demande clôturée (règle 10) : note de 1 à 5, commentaire facultatif ;
 * un seul avis depuis la dernière clôture. Le journal garde la note, jamais le commentaire (DV-116).
 */
function donnerAvis(user, id, { note, commentaire }, channel = 'api') {
  const d = demandeDeLEntite(user, id);
  if (!concerne(user, d)) throw new AppError(403, 'FORBIDDEN');
  assertActif('demandes');
  if (d.etat !== 'cloturee') throw new AppError(409, 'AVIS_PAS_CLOTUREE');
  const db = getDb();
  if (db.prepare('SELECT 1 FROM demande_avis WHERE demande_id = ? AND created_at >= ?').get(d.id, d.etat_depuis)) throw new AppError(409, 'AVIS_DEJA_DONNE');
  db.transaction(() => {
    db.prepare('INSERT INTO demande_avis (demande_id, entite_id, user_id, note, commentaire, canal) VALUES (?, ?, ?, ?, ?, ?)')
      .run(d.id, d.entite_id, user.id, note, commentaire || null, canalDe(channel) === 'systeme' ? 'api' : canalDe(channel));
    logAudit(user.id, 'demande.avis', 'demande', d.id, { numero: d.numero, note, commentaire_donne: commentaire ? 1 : 0 }, channel, d.entite_id);
  })();
  return require('./demandes').get(user, d.id);
}

/** Avis de la demande (règle 10), du plus récent au plus ancien ; l'auteur est « demandeur » ou « beneficiaire ». */
function avisDe(demandeId) {
  return getDb().prepare(`SELECT a.id, a.note, a.commentaire, a.created_at,
      CASE WHEN a.user_id = d.demandeur_id THEN 'demandeur' ELSE 'beneficiaire' END AS auteur
    FROM demande_avis a JOIN demandes d ON d.id = a.demande_id WHERE a.demande_id = ? ORDER BY a.created_at DESC, a.id DESC`).all(demandeId);
}

/** Avis encore possible : demande clôturée, personne concernée, aucun avis depuis la clôture. */
function avisPossible(user, d) {
  if (d.etat !== 'cloturee' || !concerne(user, d)) return false;
  return !getDb().prepare('SELECT 1 FROM demande_avis WHERE demande_id = ? AND created_at >= ?').get(d.id, d.etat_depuis);
}

/** Annulation d'une demande par son demandeur ou son bénéficiaire, avec un motif (règle 9 ; DELETE /api/demandes/:id). */
function annuler(user, id, motif, channel = 'api') {
  return appliquer(user, id, { etat: 'annulee', commentaire: motif }, channel);
}

/** Effet d'une annulation, sans l'écrire : première étape par le MCP (API-06). */
function decrireAnnulation(user, id, motif) {
  return { ...decrire(user, id, { etat: 'annulee', commentaire: motif }), action: 'cancel_demande' };
}

/**
 * Historique d'une demande lisible par la personne (règle 4). Le service technique lit tout ; le demandeur, le
 * bénéficiaire et qui suit la demande lisent les étapes avec le libellé de l'entité, sans nom d'agent du service ni
 * commentaire interne : l'auteur devient « demandeur » ou « service ».
 */
function historique(user, id) {
  const demandes = require('./demandes');
  const d = demandes.load(user, id);
  const service = peut(user, 'demandes:entite');
  const rows = getDb().prepare(`SELECT h.id, h.de_etat, h.vers_etat, h.user_id, u.first_name AS auteur_prenom, u.last_name AS auteur_nom,
      h.motif_id, v.code AS motif_code, v.libelle_fr AS motif_libelle_fr, v.libelle_nl AS motif_libelle_nl,
      h.commentaire, h.commentaire_public, h.canal, h.created_at, e.libelle_fr AS etat_libelle_fr, e.libelle_nl AS etat_libelle_nl
    FROM demande_historique h LEFT JOIN users u ON u.id = h.user_id LEFT JOIN listes_valeurs v ON v.id = h.motif_id
    LEFT JOIN demande_etats e ON e.entite_id = h.entite_id AND e.code = h.vers_etat
    WHERE h.demande_id = ? ORDER BY h.created_at, h.id`).all(d.id);
  return rows.map((h) => {
    const auteur = h.user_id && h.user_id === d.demandeur_id ? 'demandeur' : h.canal === 'systeme' ? 'systeme'
      : h.de_etat === 'en_validation' && h.vers_etat !== 'annulee' ? 'valideur' : 'service';
    if (service) return { ...h, auteur };
    const { user_id: _u, auteur_prenom: _p, auteur_nom: _n, canal: _c, ...reste } = h;
    return { ...reste, auteur, commentaire: h.commentaire_public ? h.commentaire : null };
  });
}

module.exports = {
  CONFIG, ETATS, FERMES, HORS_DELAI, seedTransitions, seedEntite, seedAll, listEtats, updateEtat, listTransitions, permises,
  ecrire, decrire, appliquer, demandeDeLEntite, peut, annuler, decrireAnnulation, historique, donnerAvis, avisDe, avisPossible, limiteReouverture,
};
