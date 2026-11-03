/**
 * Qualification d'une demande par le service technique, échéances et tableau de bord (version 0.9.0, étape 8 ;
 * cahier des charges GES-01, GES-04, PRI-01, PRI-03 ; décisions DV-88 à DV-93).
 *   1. Échéances enregistrées sur la fiche (DV-88) : « prise en charge avant » et « fin des travaux avant », calculées
 *      au dépôt depuis l'instant de réception, sur le calendrier de l'entité (services/echeances.js, 0.4.0), puis
 *      recalculées à chaque qualification depuis le même instant de réception. Une priorité sans délai de fin
 *      (P4 livrée) laisse la fin vide tant que le service n'a pas fixé de date convenue.
 *   2. Échéance qui compte (DV-89) : la prise en charge tant que la demande est « À qualifier », ensuite la fin.
 *      Une demande est en retard quand cette échéance est passée et qu'elle est encore en cours de traitement
 *      (ni fermée, ni « Travaux terminés »). La suspension pendant « En attente » viendra avec cet état (étape 9).
 *   3. Qualification (GES-04, DV-90) : catégorie, priorité, lieu précisé, durée estimée, consignes à l'ouvrier, photos
 *      du service visibles ou non par le demandeur, date convenue. Permission « demandes:qualifier » (gestionnaire et
 *      responsable). Une demande « À qualifier » passe « Qualifiée » ; une demande « Qualifiée » se qualifie à nouveau
 *      sans changer d'état. Les autres états attendent le cycle de vie (étape 9) : 409 DEMANDE_ETAT.
 *   4. Priorité (PRI-01, DV-91) : la priorité proposée est celle de la catégorie, ou P1 si un danger est signalé. Le
 *      service la confirme ou la change ; un changement exige un motif, gardé sur la fiche ; le journal note qu'il y en
 *      a un, sans le texte.
 *   5. Les consignes à l'ouvrier et le motif sont internes : jamais rendus au demandeur ni à qui suit la demande.
 *   6. Tableau de bord (GES-01, DV-92) : à qualifier, en retard, P1 et P2 ouvertes, échéance dans les deux jours
 *      ouvrés ; chaque compteur correspond à un filtre de la liste du gestionnaire.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { assertActif } = require('../modules');
const { rolesWith } = require('../roles');
const echeances = require('./echeances');
const calendrier = require('./calendrier');

const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));
const versSql = (date) => date.toISOString().replace('T', ' ').slice(0, 19);
const depuisSql = (s) => new Date(`${s.replace(' ', 'T')}Z`);

/** États fermés, et état « Travaux terminés » qui n'attend plus que la clôture. */
const ETATS_FERMES = ['cloturee', 'refusee', 'refusee_validation', 'fusionnee', 'annulee'];
const HORS_DELAI = [...ETATS_FERMES, 'terminee'];
const EN_COURS = `d.etat NOT IN (${HORS_DELAI.map((e) => `'${e}'`).join(', ')})`;
const OUVERTE = `d.etat NOT IN (${ETATS_FERMES.map((e) => `'${e}'`).join(', ')})`;
/** Échéance qui compte (règle 2), en SQL. */
const ECHEANCE = "CASE WHEN d.etat = 'a_qualifier' THEN d.prise_en_charge_le ELSE d.echeance_le END";
/** Nombre de jours ouvrés de « échéance proche » (GES-01). */
const JOURS_PROCHES = 2;
/** États où la qualification est permise en 0.9.0 (règle 3). */
const QUALIFIABLES = ['a_qualifier', 'qualifiee'];

/** Délai de fin propre à la catégorie (jours ouvrables), ou celui de son domaine. */
function delaiCategorie(db, categorieId) {
  const r = db.prepare(`SELECT COALESCE(c.delai_fin_jours, p.delai_fin_jours) AS delai FROM categories c
    LEFT JOIN categories p ON p.id = c.parent_id WHERE c.id = ?`).get(categorieId);
  return r ? r.delai : null;
}

/** Fin d'un jour convenu (AAAA-MM-JJ) : 23:59 à Bruxelles, en instant. */
function finDuJour(jour) {
  const [y, m, d] = jour.split('-').map(Number);
  return echeances.versInstant(Date.UTC(y, m - 1, d) / 86400000, 23 * 60 + 59);
}

/**
 * Échéances d'une demande (règle 1) : { prise_en_charge_le, echeance_le } en instants SQL, ou null. Une date convenue
 * fixe la fin quand la priorité n'en a pas. Un calendrier incalculable laisse les deux vides.
 */
function calculer(db, { entiteId, recuSql, priorite, categorieId, dateConvenue }) {
  const vide = { prise_en_charge_le: null, echeance_le: null };
  if (!priorite) return vide;
  const prio = db.prepare('SELECT code, unite, prise_en_charge, fin FROM priorites WHERE entite_id = ? AND code = ?').get(entiteId, priorite);
  if (!prio) return vide;
  try {
    const r = echeances.calculer(entiteId, depuisSql(recuSql), prio, delaiCategorie(db, categorieId));
    const fin = r.fin_le ? new Date(r.fin_le.utc) : dateConvenue ? finDuJour(dateConvenue) : null;
    return { prise_en_charge_le: versSql(new Date(r.prise_en_charge_le.utc)), echeance_le: fin ? versSql(fin) : null, date_convenue_possible: !r.fin_le };
  } catch (e) {
    if (e instanceof AppError) return vide;
    throw e;
  }
}

/**
 * Échéances des demandes qui n'en ont pas : étape JavaScript de la migration 008, rejouée à chaque démarrage (une
 * demande déposée par une version antérieure après un retour arrière en reçoit aussi). Rend le nombre de demandes
 * complétées ; une échéance incalculable reste vide et la demande n'est plus reprise.
 */
function completerEcheances(db) {
  const rows = db.prepare('SELECT id, entite_id, created_at, priorite, categorie_id FROM demandes WHERE prise_en_charge_le IS NULL AND priorite IS NOT NULL').all();
  let n = 0;
  for (const d of rows) {
    const e = calculer(db, { entiteId: d.entite_id, recuSql: d.created_at, priorite: d.priorite, categorieId: d.categorie_id });
    if (!e.prise_en_charge_le) continue;
    db.prepare('UPDATE demandes SET prise_en_charge_le = ?, echeance_le = ?, priorite_proposee = COALESCE(priorite_proposee, priorite) WHERE id = ?').run(e.prise_en_charge_le, e.echeance_le, d.id);
    n += 1;
  }
  return n;
}

/** Limite de « échéance proche » : maintenant plus deux jours ouvrés de l'entité, en instant SQL. */
function limiteProche(entiteId, maintenant = new Date()) {
  try {
    const r = echeances.calculer(entiteId, maintenant, { code: 'X', unite: 'jours_ouvrables', prise_en_charge: JOURS_PROCHES, fin: JOURS_PROCHES });
    return versSql(new Date(r.fin_le.utc));
  } catch (e) {
    return versSql(new Date(maintenant.getTime() + JOURS_PROCHES * 86400000));
  }
}

/** Clause SQL et paramètres du filtre d'échéance de la liste (retard, proche, sans). */
function filtreEcheance(entiteId, valeur, maintenant = new Date()) {
  const now = versSql(maintenant);
  if (valeur === 'retard') return { sql: `${EN_COURS} AND ${ECHEANCE} IS NOT NULL AND ${ECHEANCE} < ?`, params: [now] };
  if (valeur === 'proche') return { sql: `${EN_COURS} AND ${ECHEANCE} IS NOT NULL AND ${ECHEANCE} >= ? AND ${ECHEANCE} <= ?`, params: [now, limiteProche(entiteId, maintenant)] };
  if (valeur === 'sans') return { sql: `${EN_COURS} AND ${ECHEANCE} IS NULL`, params: [] };
  return null;
}

/** Champs d'échéance ajoutés à une fiche : échéance qui compte, sa nature, retard. */
function etatEcheance(d, maintenant = new Date()) {
  const aQualifier = d.etat === 'a_qualifier';
  const courante = aQualifier ? d.prise_en_charge_le : d.echeance_le;
  const enCours = !HORS_DELAI.includes(d.etat);
  return {
    echeance_type: !enCours || !courante ? null : aQualifier ? 'prise_en_charge' : 'fin',
    echeance_courante: enCours ? courante || null : null,
    retard: enCours && courante && courante < versSql(maintenant) ? 1 : 0,
  };
}

/** Tableau de bord du service technique de l'entité active (règle 6). */
function tableauBord(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  if (!peut(user, 'demandes:entite')) throw new AppError(403, 'FORBIDDEN');
  const db = getDb();
  const entiteId = user.entiteId;
  const compter = (clause, params = []) => db.prepare(`SELECT COUNT(*) AS n FROM demandes d WHERE d.entite_id = ? AND ${clause}`).get(entiteId, ...params).n;
  const retard = filtreEcheance(entiteId, 'retard');
  const proche = filtreEcheance(entiteId, 'proche');
  return {
    a_qualifier: compter("d.etat = 'a_qualifier'"),
    en_retard: compter(retard.sql, retard.params),
    p1_p2: compter(`${OUVERTE} AND d.priorite IN ('P1', 'P2')`),
    echeance_proche: compter(proche.sql, proche.params),
    limite_proche: limiteProche(entiteId),
    jours_proches: JOURS_PROCHES,
  };
}

/** Jour à Bruxelles, AAAA-MM-JJ. */
const jourBruxelles = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: calendrier.CATALOGUE.fuseau }).format(date);

/**
 * Qualifie une demande (règles 3 à 5). data : categorie_id, lieu_id, priorite (obligatoires), motif_priorite,
 * duree_estimee_minutes, consignes, photos_visibles, date_convenue (facultatifs ; absents = inchangés).
 */
function qualifier(user, id, data, channel = 'api') {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  const entiteId = user.entiteId;
  const db = getDb();
  const d = db.prepare('SELECT * FROM demandes WHERE id = ?').get(id);
  if (!d) throw new AppError(404, 'NOT_FOUND');
  if (d.entite_id !== entiteId) throw new AppError(403, 'FORBIDDEN');
  if (!peut(user, 'demandes:qualifier')) throw new AppError(403, 'FORBIDDEN');
  assertActif('demandes');
  if (!QUALIFIABLES.includes(d.etat)) throw new AppError(409, 'DEMANDE_ETAT');
  const demandes = require('./demandes');
  demandes.lieuDeDemande(entiteId, data.lieu_id);
  const cat = demandes.categorieDeDemande(entiteId, data.categorie_id);
  const proposee = d.danger ? 'P1' : cat.priorite_effective || null;
  const motif = data.motif_priorite === undefined ? null : data.motif_priorite || null;
  // Un changement de la priorité proposée exige un motif ; une priorité confirmée n'en garde pas.
  if (proposee && data.priorite !== proposee && !motif) throw new AppError(409, 'MOTIF_PRIORITE_REQUIS');
  const motifGarde = proposee && data.priorite === proposee ? null : motif;
  const dateConvenue = data.date_convenue === undefined ? d.date_convenue : data.date_convenue || null;
  const e = calculer(db, { entiteId, recuSql: d.created_at, priorite: data.priorite, categorieId: data.categorie_id, dateConvenue });
  if (dateConvenue && e.date_convenue_possible === false) {
    // Une date convenue ne remplace pas le délai d'une priorité qui en a un ; elle est retirée sans erreur si elle
    // venait de la fiche (changement de priorité), refusée si elle est envoyée.
    if (data.date_convenue) throw new AppError(409, 'DATE_CONVENUE_INUTILE');
  }
  const dateGardee = e.date_convenue_possible ? dateConvenue : null;
  if (data.date_convenue) {
    const maintenant = new Date();
    const auj = jourBruxelles(maintenant);
    const max = jourBruxelles(new Date(maintenant.getTime() + 2 * 366 * 86400000));
    if (data.date_convenue < auj || data.date_convenue > max) throw new AppError(409, 'DATE_CONVENUE_INVALIDE');
  }
  const champs = {
    categorie_id: data.categorie_id,
    lieu_id: data.lieu_id,
    priorite: data.priorite,
    priorite_proposee: proposee,
    motif_priorite: motifGarde,
    duree_estimee_minutes: data.duree_estimee_minutes === undefined ? d.duree_estimee_minutes : data.duree_estimee_minutes,
    consignes: data.consignes === undefined ? d.consignes : data.consignes || null,
    photos_visibles: data.photos_visibles === undefined ? d.photos_visibles : data.photos_visibles,
    date_convenue: dateGardee,
    prise_en_charge_le: e.prise_en_charge_le,
    echeance_le: e.echeance_le,
    etat: 'qualifiee',
  };
  const maintenant = versSql(new Date());
  db.transaction(() => {
    db.prepare(`UPDATE demandes SET categorie_id = ?, lieu_id = ?, priorite = ?, priorite_proposee = ?, motif_priorite = ?,
      duree_estimee_minutes = ?, consignes = ?, photos_visibles = ?, date_convenue = ?, prise_en_charge_le = ?, echeance_le = ?,
      etat = ?, qualifiee_par = ?, qualifiee_le = ?, updated_by = ?, updated_at = ? WHERE id = ?`)
      .run(champs.categorie_id, champs.lieu_id, champs.priorite, champs.priorite_proposee, champs.motif_priorite,
        champs.duree_estimee_minutes, champs.consignes, champs.photos_visibles, champs.date_convenue, champs.prise_en_charge_le,
        champs.echeance_le, champs.etat, user.id, maintenant, user.id, maintenant, d.id);
    // Journal : champs changés seulement (DV-04) ; motif et consignes, textes libres, restent sur la fiche (« 1 » s'il
    // y en a un). La première qualification note toujours l'état et la priorité confirmée.
    const avant = {};
    const apres = {};
    const libre = new Set(['motif_priorite', 'consignes']);
    const calcules = new Set(['prise_en_charge_le', 'echeance_le', 'priorite_proposee']);
    for (const [k, v] of Object.entries(champs)) {
      if (calcules.has(k)) continue;
      const a = libre.has(k) ? (d[k] ? 1 : 0) : d[k] ?? null;
      const b = libre.has(k) ? (v ? 1 : 0) : v ?? null;
      if (a !== b) { avant[k] = a; apres[k] = b; }
    }
    const premiere = d.etat === 'a_qualifier';
    logAudit(user.id, 'demande.qualifier', 'demande', d.id,
      { numero: d.numero, premiere: premiere ? 1 : 0, priorite: champs.priorite, priorite_confirmee: champs.priorite === proposee ? 1 : 0,
        ...(Object.keys(apres).length ? { avant, apres } : {}) }, channel, entiteId);
  })();
  return demandes.get(user, d.id);
}

module.exports = { calculer, completerEcheances, tableauBord, qualifier, filtreEcheance, etatEcheance, limiteProche, ECHEANCE, EN_COURS, HORS_DELAI, JOURS_PROCHES };
