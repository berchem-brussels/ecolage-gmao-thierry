/**
 * Avis des personnes concernées par une demande (version 0.17.0, étape 13, point 4 ; cahier des charges NOT-01, NOT-02,
 * NOT-04, NOT-06, DEM-04, DEM-07, DEM-12, DEM-15, LNG-05 ; DV-135). Chaque avis va dans la cloche (notifications.js) et
 * part par courriel (courriel.js, modèle de modeles-courriel.js), dans la transaction de l'action qui le cause.
 *   1. Dépôt : accusé de réception au demandeur (variante « validation » si la demande attend le chef de service) et au
 *      bénéficiaire (variante « beneficiaire ») ; « demande à valider » au chef de service et au suppléant en période ;
 *      « danger parti sans validation » à eux aussi quand une demande à valider signale un danger (DV-135).
 *   2. Décision du chef : « validée » ou « refusée » au demandeur et au bénéficiaire. Dès que la demande quitte l'attente de
 *      validation (décision, annulation), « demande à valider » est marquée lue chez le chef et le suppléant : plus rien
 *      à faire, la cloche ne la compte plus.
 *   3. Changement d'état (NOT-01 : prise en charge, intervention prévue, en attente, travaux terminés, clôturée ; et les
 *      fermetures que le demandeur doit connaître : refusée par le service, annulée, regroupée) : au demandeur, au
 *      bénéficiaire et aux personnes qui suivent la demande (« Moi aussi » ou abonnement, DEM-04). « En cours » et
 *      « Rouverte » ne font pas d'avis (étape intermédiaire ; réouverture faite par le demandeur).
 *   4. Personne n'est averti de sa propre action : la notification naît lue, aucun courriel ne part. Seule exception,
 *      l'accusé de réception par courriel de qui envoie sa propre demande (DEM-12 : « à l'écran et par courriel »). Un compte inactif
 *      ou sans rôle dans l'entité n'est pas averti. Un compte sans adresse ne reçoit que la cloche ; en envoi réel, une
 *      adresse d'un domaine réservé (.invalid, comptes de démonstration) n'est pas envoyée (en mode test, elle est retenue).
 *   6. Fil (point 5) : un message du demandeur ou du bénéficiaire avertit le service : la personne qui a qualifié la
 *      demande et celles du service qui ont déjà écrit dans le fil, sinon tout le service technique de l'entité ; un
 *      message du service avertit le demandeur et le bénéficiaire (jamais les personnes qui suivent : elles ne lisent pas
 *      le fil). Une note interne n'avertit que les collègues mentionnés. Lire le fil marque lues ces notifications.
 *   7. Tickets (point 5) : à la création, accusé à l'auteur (cloche née lue, courriel comme DEM-12) et avis aux
 *      personnes qui traitent la file du ticket ; une réponse publique de qui traite avertit l'auteur. Lien
 *      « /tickets?id= ». Sans entité (ticket informatique d'un compte sans rôle), seul le courriel part.
 *   8. Échéances (point 6 ; PRI-03, E-35) : une demande en cours dont l'échéance qui compte (prise en charge si elle est
 *      « À qualifier » ou « Rouverte », sinon fin des travaux) est à moins de deux jours ouvrés de l'entité (règle du
 *      tableau de bord) fait une alerte « échéance proche » ; dépassée, une alerte « en retard ». Une seule alerte par
 *      demande, type et échéance (table demande_alertes) : une échéance qui change en refait une. Une attente qui
 *      suspend le délai, une demande terminée ou fermée n'en font pas. Destinataire (décision de Thierry du 17/11/2026) :
 *      la personne qui a qualifié la demande si elle est active et lit encore les demandes de l'entité, sinon tout le
 *      service technique de l'entité. Contrôle dans l'API au démarrage et toutes les 15 minutes, sans tâche planifiée.
 *      Au passage en 0.17.0, les retards déjà là sont notés comme signalés sans avis (rattraper) : pas de rafale le jour
 *      de la mise à jour ; le tableau de bord les compte toujours.
 *   5. Contenu minimal (NOT-06) : numéro, lieu, état et délai dans la langue de la personne qui reçoit (LNG-05), lien vers
 *      son écran ; jamais la description, un commentaire, un motif ni un nom.
 */
const { rolesIn } = require('../auth');
const notifications = require('./notifications');
const courriel = require('./courriel');
const modeles = require('./modeles-courriel');
const echeances = require('./echeances');

/** États d'arrivée qui font un avis au demandeur, au bénéficiaire et aux personnes qui suivent (règle 3). */
const ETATS_AVIS = new Set(['qualifiee', 'planifiee', 'en_attente', 'externe', 'terminee', 'cloturee', 'refusee', 'annulee', 'fusionnee']);
const DELAI = {
  indicatif: { fr: 'au plus tard le {date}', nl: 'uiterlijk op {date}' },
  convenir: { fr: 'date à convenir avec le service technique', nl: 'datum af te spreken met de technische dienst' },
  danger: { fr: 'priorité absolue', nl: 'absolute voorrang' },
  validation: { fr: "après l'accord du chef de service", nl: 'na het akkoord van het diensthoofd' },
};

const lienDemandeur = (id) => `/demandes?demande=${id}`;
const lienValideur = (id) => `/a-valider?demande=${id}`;
const lienService = (id) => `/demandes-entite?demande=${id}`;
const { rolesWith, ROLES } = require('../roles');

function charger(db, id) {
  return db.prepare(`SELECT d.id, d.entite_id, d.numero, d.etat, d.lieu_id, d.danger, d.echeance_le, d.date_convenue, d.service_id,
    d.demandeur_id, d.beneficiaire_id, d.qualifiee_par, e.nom_fr AS entite_fr, e.nom_nl AS entite_nl
    FROM demandes d JOIN entites e ON e.id = d.entite_id WHERE d.id = ?`).get(id);
}

/** Règle 5 : valeurs du courriel dans une langue. */
function valeurs(db, d, lang) {
  const chemin = require('./demandes').chemin(d.lieu_id).map((l) => l[`nom_${lang}`] || l.code).join(' › ');
  const e = db.prepare('SELECT libelle_fr, libelle_nl FROM demande_etats WHERE entite_id = ? AND code = ?').get(d.entite_id, d.etat);
  const libelle = e ? { l: lang === 'nl' ? e.libelle_nl : e.libelle_fr } : null;
  let delai;
  if (d.etat === 'en_validation') delai = DELAI.validation[lang];
  else if (d.danger) delai = DELAI.danger[lang];
  else if (d.echeance_le && !d.date_convenue) {
    const local = echeances.texteLocal(new Date(`${d.echeance_le.replace(' ', 'T')}Z`)).slice(0, 10).split('-').reverse().join('/');
    delai = DELAI.indicatif[lang].replace('{date}', local);
  } else delai = DELAI.convenir[lang];
  return { numero: d.numero, lieu: chemin, etat: libelle ? libelle.l : d.etat, delai, entite: lang === 'nl' ? d.entite_nl : d.entite_fr };
}

/**
 * Règle 4 : cloche et courriel pour chaque destinataire. destinataires : [{ userId, lien, variante }] ; la variante
 * choisit le texte de la cloche et le modèle du courriel (« demande.recue.validation »).
 */
function avertir(db, { evenement, d, destinataires, auteurId, courrielAuteur = false, surcharge = null }) {
  const valides = destinataires.filter((x) => x && x.userId);
  notifications.notifier(db, { evenement, entiteId: d.entite_id, objet: 'demande', objetId: d.id, numero: d.numero, auteurId, destinataires: valides });
  const vus = new Set();
  const smtp = courriel.mode() === 'smtp';
  let n = 0;
  for (const x of valides) {
    if (vus.has(x.userId) || (x.userId === auteurId && !courrielAuteur)) continue;
    vus.add(x.userId);
    const u = db.prepare('SELECT id, email, preferred_lang, is_active FROM users WHERE id = ?').get(x.userId);
    if (!u || !u.is_active || !u.email || !rolesIn(u.id, d.entite_id).length) continue;
    if (smtp && /\.invalid$/i.test(u.email)) continue;
    const lang = u.preferred_lang === 'nl' ? 'nl' : 'fr';
    // Modèle de la variante s'il existe (« demande.recue.validation »), sinon celui de l'événement (composer).
    const modele = x.variante && x.variante !== 'defaut' ? `${evenement}.${x.variante}` : evenement;
    const c = modeles.composer(modele, lang, { ...valeurs(db, d, lang), ...(surcharge ? surcharge(lang) : {}), lien: x.lien });
    courriel.mettreEnFile(db, { destinataire: u.email, userId: u.id, entiteId: d.entite_id, langue: lang, evenement, objet: 'demande', objetId: d.id,
      numero: d.numero, sujet: c.sujet, corps: c.corps, auteurId });
    n += 1;
  }
  return n;
}

/** Règle 1 : dépôt d'une demande. validation : null, 'demandee', 'danger', 'sans_valideur' ou 'auteur_valideur'. */
function depot(db, { demandeId, validation, auteurId }) {
  const d = charger(db, demandeId);
  avertir(db, { evenement: 'demande.recue', d, auteurId, courrielAuteur: true, destinataires: [
    { userId: d.demandeur_id, lien: lienDemandeur(d.id), variante: d.etat === 'en_validation' ? 'validation' : 'defaut' },
    { userId: d.beneficiaire_id, lien: lienDemandeur(d.id), variante: 'beneficiaire' },
  ] });
  if ((validation === 'demandee' || validation === 'danger') && d.service_id) {
    const chefs = require('./services').valideurs(d.service_id).map((userId) => ({ userId, lien: lienValideur(d.id) }));
    avertir(db, { evenement: validation === 'danger' ? 'demande.danger_sans_validation' : 'demande.validation_demandee', d, auteurId, destinataires: chefs });
  }
}

/** Personnes qui suivent la demande (« Moi aussi » ou abonnement). */
const suiveurs = (db, id) => db.prepare('SELECT user_id FROM demande_suiveurs WHERE demande_id = ?').all(id).map((r) => r.user_id);

/** Règles 2 et 3 : appelé par cycle.ecrire() à chaque changement d'état d'une demande existante. */
function changement(db, { demandeId, de, vers, auteurId }) {
  if (!de || de === vers) return;
  const d = charger(db, demandeId);
  if (de === 'en_validation') {
    db.prepare("UPDATE notifications SET lue_le = datetime('now') WHERE objet = 'demande' AND objet_id = ? AND evenement = 'demande.validation_demandee' AND lue_le IS NULL").run(d.id);
  }
  const concernes = [{ userId: d.demandeur_id, lien: lienDemandeur(d.id) }, { userId: d.beneficiaire_id, lien: lienDemandeur(d.id) }];
  if (de === 'en_validation' && vers === 'a_qualifier') avertir(db, { evenement: 'demande.validee', d, auteurId, destinataires: concernes });
  else if (de === 'en_validation' && vers === 'refusee_validation') avertir(db, { evenement: 'demande.refusee_validation', d, auteurId, destinataires: concernes });
  else if (ETATS_AVIS.has(vers)) {
    // La variante (état d'arrivée) choisit le texte de la cloche ; le courriel prend le modèle « demande.etat ».
    const tous = [...concernes, ...suiveurs(db, d.id).map((userId) => ({ userId, lien: lienDemandeur(d.id) }))].map((x) => ({ ...x, variante: vers }));
    avertir(db, { evenement: 'demande.etat', d, auteurId, destinataires: tous });
  }
}

/** Rôles de l'entité qui ont une permission (« demandes:entite »…). */
const aLaPermission = (userId, entiteId, permission) => rolesIn(userId, entiteId).some((r) => rolesWith(permission).includes(r));

/** Règle 6 : personnes du service à avertir d'un message du demandeur. */
function equipe(db, d) {
  const ids = new Set();
  if (d.qualifiee_par) ids.add(d.qualifiee_par);
  for (const r of db.prepare("SELECT DISTINCT user_id FROM demande_messages WHERE demande_id = ? AND auteur = 'service' AND user_id IS NOT NULL").all(d.id)) ids.add(r.user_id);
  let out = [...ids].filter((u) => aLaPermission(u, d.entite_id, 'demandes:entite'));
  if (!out.length) out = equipeService(db, d.entite_id);
  return out;
}

/** Règle 6 : nouveau message du fil (auteur : demandeur, beneficiaire ou service) et mentions d'une note interne. */
function message(db, { demandeId, auteur, interne, mentions = [], auteurId }) {
  const d = charger(db, demandeId);
  if (mentions.length) avertir(db, { evenement: 'demande.mention', d, auteurId, destinataires: mentions.map((userId) => ({ userId, lien: lienService(d.id) })) });
  if (interne) return;
  const destinataires = auteur === 'service'
    ? [{ userId: d.demandeur_id, lien: lienDemandeur(d.id) }, { userId: d.beneficiaire_id, lien: lienDemandeur(d.id) }]
    : equipe(db, d).map((userId) => ({ userId, lien: lienService(d.id) }));
  avertir(db, { evenement: 'demande.message', d, auteurId, destinataires });
}

/** Règle 6 : fil lu jusqu'au bout : ses avis de message et de mention sont lus. */
function filLu(db, { demandeId, userId }) {
  db.prepare(`UPDATE notifications SET lue_le = datetime('now') WHERE user_id = ? AND objet = 'demande' AND objet_id = ?
    AND evenement IN ('demande.message', 'demande.mention') AND lue_le IS NULL`).run(userId, demandeId);
}

const INSTANCE = new Set(ROLES.filter((r) => r.portee === 'instance').map((r) => r.code));

/** Règle 7 : personnes qui traitent la file d'un ticket (rôles de la file en paramètres). */
function traitants(db, t) {
  const roles = require('./parametres').valeur(t.queue === 'business' ? 'tickets.business_roles' : 'tickets.it_roles');
  const liste = String(roles || '').split(',').map((x) => x.trim()).filter(Boolean);
  const ids = new Set();
  const instance = liste.filter((r) => INSTANCE.has(r));
  if (instance.length) {
    const inQ = instance.map(() => '?').join(', ');
    for (const r of db.prepare(`SELECT id FROM users WHERE is_active = 1 AND user_role IN (${inQ})`).all(...instance)) ids.add(r.id);
  }
  const entite = liste.filter((r) => !INSTANCE.has(r));
  if (entite.length && t.entite_id) {
    const inQ = entite.map(() => '?').join(', ');
    for (const r of db.prepare(`SELECT DISTINCT ur.user_id AS id FROM user_roles ur JOIN users u ON u.id = ur.user_id WHERE ur.entite_id = ? AND ur.is_active = 1 AND u.is_active = 1
      AND ur.role IN (${inQ})`).all(t.entite_id, ...entite)) ids.add(r.id);
  }
  return [...ids];
}

/** Règle 7 : cloche (si le ticket a une entité) et courriel ; courrielAuteur : accusé de l'auteur. */
function avertirTicket(db, { evenement, t, destinataires, auteurId, courrielAuteur = false }) {
  const lien = `/tickets?id=${t.id}`;
  if (t.entite_id) {
    notifications.notifier(db, { evenement, entiteId: t.entite_id, objet: 'ticket', objetId: t.id, numero: t.reference, auteurId,
      destinataires: destinataires.map((x) => ({ userId: x.userId, variante: x.variante, lien })) });
  }
  const smtp = courriel.mode() === 'smtp';
  const entite = t.entite_id ? db.prepare('SELECT nom_fr, nom_nl FROM entites WHERE id = ?').get(t.entite_id) : null;
  const vus = new Set();
  for (const x of destinataires) {
    const userId = x.userId;
    if (!userId || vus.has(userId) || (userId === auteurId && !courrielAuteur)) continue;
    vus.add(userId);
    const u = db.prepare('SELECT id, email, preferred_lang, is_active FROM users WHERE id = ?').get(userId);
    if (!u || !u.is_active || !u.email || (smtp && /\.invalid$/i.test(u.email))) continue;
    const lang = u.preferred_lang === 'nl' ? 'nl' : 'fr';
    const c = modeles.composer(x.variante && x.variante !== 'defaut' ? `${evenement}.${x.variante}` : evenement, lang, { numero: t.reference, entite: entite ? entite[`nom_${lang}`] : '', lien });
    courriel.mettreEnFile(db, { destinataire: u.email, userId: u.id, entiteId: t.entite_id, langue: lang, evenement, objet: 'ticket', objetId: t.id,
      numero: t.reference, sujet: c.sujet, corps: c.corps, auteurId });
  }
}

function ticketCree(db, { ticketId, auteurId }) {
  const t = db.prepare('SELECT id, reference, queue, entite_id, requester_id FROM tickets WHERE id = ?').get(ticketId);
  avertirTicket(db, { evenement: 'ticket.cree', t, auteurId, courrielAuteur: true,
    destinataires: [{ userId: t.requester_id }, ...traitants(db, t).filter((u) => u !== t.requester_id).map((userId) => ({ userId, variante: 'traiter' }))] });
}

function ticketReponse(db, { ticketId, auteurId }) {
  const t = db.prepare('SELECT id, reference, queue, entite_id, requester_id FROM tickets WHERE id = ?').get(ticketId);
  if (t.requester_id === auteurId) return;
  avertirTicket(db, { evenement: 'ticket.reponse', t, auteurId, destinataires: [{ userId: t.requester_id }] });
}

const MOMENT = { fr: 'le {date} à {heure}', nl: 'op {date} om {heure}' };
/** Échéance lisible, heure de Bruxelles. */
function moment(sql, lang) {
  const t = echeances.texteLocal(new Date(`${sql.replace(' ', 'T')}Z`));
  return MOMENT[lang].replace('{date}', t.slice(0, 10).split('-').reverse().join('/')).replace('{heure}', t.slice(11, 16));
}

/** Règle 8 : un passage du contrôle ; rend le nombre d'alertes faites. */
function verifierEcheances(maintenant = new Date()) {
  const db = require('../database').getDb();
  if (!require('../modules').estActif('demandes')) return 0;
  const qualification = require('./qualification');
  let n = 0;
  for (const e of db.prepare('SELECT id FROM entites WHERE is_active = 1').all()) {
    for (const type of ['retard', 'proche']) {
      const f = qualification.filtreEcheance(e.id, type, maintenant);
      const sql = `SELECT d.id, ${qualification.ECHEANCE} AS ech FROM demandes d WHERE d.entite_id = ? AND ${f.sql}
        AND NOT EXISTS (SELECT 1 FROM demande_alertes a WHERE a.demande_id = d.id AND a.type = ? AND a.echeance_le = ${qualification.ECHEANCE})`;
      for (const r of db.prepare(sql).all(e.id, ...f.params, type)) {
        db.transaction(() => {
          db.prepare('INSERT INTO demande_alertes (demande_id, type, echeance_le) VALUES (?, ?, ?)').run(r.id, type, r.ech);
          const d = charger(db, r.id);
          const qualifie = d.qualifiee_par && aLaPermission(d.qualifiee_par, d.entite_id, 'demandes:entite')
            && db.prepare('SELECT is_active FROM users WHERE id = ?').get(d.qualifiee_par)?.is_active ? [d.qualifiee_par] : null;
          const qui = qualifie || equipeService(db, d.entite_id);
          avertir(db, { evenement: type === 'retard' ? 'demande.retard' : 'demande.echeance_proche', d, auteurId: null,
            destinataires: qui.map((userId) => ({ userId, lien: lienService(d.id) })), surcharge: (lang) => ({ delai: moment(r.ech, lang) }) });
        })();
        n += 1;
      }
    }
  }
  return n;
}

/** Tout le service technique d'une entité (« demandes:traiter »), comptes actifs. */
function equipeService(db, entiteId) {
  const roles = rolesWith('demandes:traiter');
  const inQ = roles.map(() => '?').join(', ') || "''";
  return db.prepare(`SELECT DISTINCT ur.user_id FROM user_roles ur JOIN users u ON u.id = ur.user_id
    WHERE ur.entite_id = ? AND ur.is_active = 1 AND u.is_active = 1 AND ur.role IN (${inQ})`).all(entiteId, ...roles).map((r) => r.user_id);
}

/** Règle 8 : retards déjà là, notés comme signalés sans avis (étape de la migration 015). */
function rattraper(db, maintenant = new Date()) {
  const qualification = require('./qualification');
  let n = 0;
  for (const e of db.prepare('SELECT id FROM entites').all()) {
    const f = qualification.filtreEcheance(e.id, 'retard', maintenant);
    const sql = `INSERT OR IGNORE INTO demande_alertes (demande_id, type, echeance_le)
      SELECT d.id, 'retard', ${qualification.ECHEANCE} FROM demandes d WHERE d.entite_id = ? AND ${f.sql}`;
    n += db.prepare(sql).run(e.id, ...f.params).changes;
  }
  return n;
}

let minuteur = null;
/** Règle 8 : au démarrage de l'API (index.js), puis toutes les 15 minutes ; une erreur n'arrête pas l'API. */
function demarrerAlertes() {
  if (minuteur) return;
  const passe = () => { try { const n = verifierEcheances(); if (n) console.log(`[ALERTES] ${n} alerte(s) d'échéance`); } catch (e) { console.error('[ALERTES]', e.message); } };
  minuteur = setInterval(passe, 15 * 60000);
  if (minuteur.unref) minuteur.unref();
  setTimeout(passe, 5000).unref?.();
}

module.exports = { depot, changement, message, filLu, ticketCree, ticketReponse, verifierEcheances, rattraper, demarrerAlertes, avertir, valeurs, ETATS_AVIS };
