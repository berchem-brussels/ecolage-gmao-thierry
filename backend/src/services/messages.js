/**
 * Fil de messages d'une demande (version 0.15.0, étape 10, point 1 ; cahier des charges SUI-04, SEC-02, SUI-07).
 *   1. Lecture du fil : le demandeur, le bénéficiaire et le service technique de l'entité (« demandes:entite »). Qui
 *      suit seulement la demande (« Moi aussi ») ne lit pas le fil : il voit l'état et la ligne du temps (décision du
 *      09/11/2026, même règle que les pièces jointes). Autre entité : 403 ; demande inconnue : 404.
 *   2. Commentaire interne (interne = 1) : écrit et lu par le service technique seul ; jamais rendu au demandeur, au
 *      bénéficiaire ni à la GRC.
 *   3. Écriture : le demandeur et le bénéficiaire écrivent dans le fil public ; le service technique écrit dans le fil
 *      public et en interne (« demandes:traiter »). Seulement sur une demande ouverte (409 DEMANDE_FERMEE) : après la
 *      clôture, le demandeur rouvre la demande. Un message ne se modifie ni ne se supprime.
 *   4. Contenu : texte de 4 000 caractères au plus ; langue = celle du texte, donnée par l'écran (0.16.0, R2), à défaut
 *      celle de l'auteur ; facultatif si le message porte des
 *      pièces (409 MESSAGE_VIDE sinon). Pièces : celles que l'auteur a jointes en attente sur la demande
 *      (services/pieces.js, règle 8), rattachées à l'envoi.
 *   5. Auteur : « demandeur » ou « beneficiaire » pour la personne concernée, « service » sinon et pour tout commentaire
 *      interne. Le demandeur ne reçoit pas le nom des agents du service (SUI-07) ; le service lit tous les noms.
 *   6. Journal : jamais de texte (DV-116) : numéro, identifiant du message, interne, longueur et nombre de pièces.
 *   7. Ordre des contrôles (API-04) : entité active, demande (404, 403), droit de lire ou d'écrire (403), module, demande
 *      ouverte (409), contenu (409).
 *   8. Non lu (0.15.0, point 2) : pour chaque personne qui lit le fil, le dernier message lu de chaque demande. Est non lu
 *      un message qu'elle peut lire, écrit par quelqu'un d'autre, plus récent que ce repère. La lecture du fil ne change
 *      rien : l'écran dit « lu » par un appel à part, quand le fil est montré. Compteur du tableau de bord du service
 *      (« Messages à lire ») et filtre messages=non_lus de la liste : demandes de l'entité qui ont un message non lu.
 *      Le repère n'est pas journalisé (aucune donnée ne change) ; il disparaît avec le compte (ON DELETE CASCADE).
 *   9. Mentions (0.15.0, point 3 ; GES-08) : une note interne mentionne de 1 à 10 collègues du service technique de
 *      l'entité (rôle qui porte « demandes:entite », compte actif, pas l'auteur). Une mention dans un message public est
 *      refusée (409 MENTION_INTERNE), une personne hors du service aussi (409 MENTION_INVALIDE). La mention est « à
 *      voir » tant que la personne n'a pas lu le fil jusqu'à ce message (règle 8) : compteur « Mentions » du tableau
 *      de bord et filtre mentions=a_voir. Les noms ne sont rendus qu'au service ; le journal garde le nombre de mentions.
 *      La notification (cloche, courriel) viendra avec les notifications.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { assertActif } = require('../modules');
const { rolesWith } = require('../roles');
const { FERMES } = require('./cycle');

const CANAUX = { api: 'ecran', mcp: 'mcp', grc: 'grc' };
const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));
const concerne = (user, d) => d.demandeur_id === user.id || (!!d.beneficiaire_id && d.beneficiaire_id === user.id);

/** Demande de l'entité active : 404 inconnue, 403 autre entité. */
function demande(user, id) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  const d = getDb().prepare('SELECT id, entite_id, numero, etat, demandeur_id, beneficiaire_id FROM demandes WHERE id = ?').get(id);
  if (!d) throw new AppError(404, 'NOT_FOUND');
  if (d.entite_id !== user.entiteId) throw new AppError(403, 'FORBIDDEN');
  return d;
}

/** Règle 1 : la personne lit le fil (demandeur, bénéficiaire, service) ; rend la demande et le droit de lire l'interne. */
function lecteur(user, id) {
  const d = demande(user, id);
  const service = peut(user, 'demandes:entite');
  if (!service && !concerne(user, d)) throw new AppError(403, 'FORBIDDEN');
  return { d, service };
}

/**
 * Règle 3 : la personne peut écrire dans le fil de la demande (interne : le service seul). lecture : contrôle du droit
 * seulement, sans le module ni l'état (liste des pièces en attente). Rend la demande.
 */
function peutEcrire(user, id, { interne = false, lecture = false } = {}) {
  const d = demande(user, id);
  const service = peut(user, 'demandes:traiter');
  if (interne ? !service : !service && !concerne(user, d)) throw new AppError(403, 'FORBIDDEN');
  if (lecture) return d;
  assertActif('demandes');
  if (FERMES.includes(d.etat)) throw new AppError(409, 'DEMANDE_FERMEE');
  return d;
}

const COLUMNS = `m.id, m.demande_id, m.user_id, m.auteur, m.interne, m.texte, m.langue, m.canal, m.created_at,
  u.first_name AS auteur_prenom, u.last_name AS auteur_nom`;

/** Message rendu à la personne (règles 2, 5 et 8) ; pieces : pièces du message ; repere : dernier message lu. */
function fiche(m, user, service, pieces, repere = Infinity) {
  const deMoi = m.user_id === user.id;
  const out = { ...m, de_moi: deMoi ? 1 : 0, non_lu: !deMoi && m.id > repere ? 1 : 0, pieces, mentions: [] };
  if (!service) {
    delete out.user_id;
    delete out.canal;
    if (m.auteur === 'service') { out.auteur_prenom = null; out.auteur_nom = null; }
  }
  return out;
}

/** Fil de la demande lisible par la personne, du plus ancien au plus récent (règles 1, 2 et 5). */
function list(user, id) {
  const { d, service } = lecteur(user, id);
  const rows = getDb().prepare(`SELECT ${COLUMNS} FROM demande_messages m LEFT JOIN users u ON u.id = m.user_id
    WHERE m.demande_id = ? AND (m.interne = 0 OR ? = 1) ORDER BY m.created_at, m.id`).all(d.id, service ? 1 : 0);
  const pieces = require('./pieces').deMessages(rows.map((m) => m.id));
  const repere = dernierLu(d.id, user.id);
  const mentions = service ? mentionsDe(rows.filter((m) => m.interne).map((m) => m.id)) : new Map();
  return rows.map((m) => ({ ...fiche(m, user, service, pieces.get(m.id), repere), mentions: mentions.get(m.id) || [] }));
}

/** Règle 9 : personnes mentionnées dans les messages donnés (Map id → [{ user_id, prenom, nom }]). */
function mentionsDe(ids) {
  const out = new Map();
  if (!ids.length) return out;
  const inQ = ids.map(() => '?').join(', ');
  const rows = getDb().prepare(`SELECT x.message_id, x.user_id, u.first_name AS prenom, u.last_name AS nom FROM demande_mentions x
    JOIN users u ON u.id = x.user_id WHERE x.message_id IN (${inQ}) ORDER BY u.last_name, u.first_name`).all(...ids);
  for (const r of rows) {
    if (!out.has(r.message_id)) out.set(r.message_id, []);
    out.get(r.message_id).push({ user_id: r.user_id, prenom: r.prenom, nom: r.nom });
  }
  return out;
}

/** Règle 9 : collègues que la personne peut mentionner sur la demande (service de l'entité, comptes actifs, sauf elle). */
function mentionnables(user, id) {
  const d = peutEcrire(user, id, { interne: true, lecture: true });
  const roles = rolesWith('demandes:entite');
  const inQ = roles.map(() => '?').join(', ');
  return getDb().prepare(`SELECT DISTINCT u.id AS user_id, u.first_name AS prenom, u.last_name AS nom FROM users u
    JOIN user_roles ur ON ur.user_id = u.id AND ur.entite_id = ? AND ur.is_active = 1
    WHERE u.is_active = 1 AND u.id <> ? AND ur.role IN (${inQ}) ORDER BY u.last_name, u.first_name`)
    .all(d.entite_id, user.id, ...roles);
}

/**
 * Règle 9 : condition SQL « la personne est mentionnée sur la demande d dans une note qu'elle n'a pas lue », faite de
 * constantes et de « ? ».
 */
const MENTION_A_VOIR = `EXISTS (SELECT 1 FROM demande_mentions x JOIN demande_messages m ON m.id = x.message_id
  WHERE m.demande_id = d.id AND x.user_id = ?
  AND m.id > COALESCE((SELECT l.dernier_id FROM demande_messages_lus l WHERE l.demande_id = d.id AND l.user_id = ?), 0))`;
function filtreMentions(user) {
  return { sql: MENTION_A_VOIR, params: [user.id, user.id] };
}

/** Règle 8 : dernier message lu par la personne sur la demande (0 si elle n'a jamais lu le fil). */
function dernierLu(demandeId, userId) {
  const r = getDb().prepare('SELECT dernier_id FROM demande_messages_lus WHERE demande_id = ? AND user_id = ?').get(demandeId, userId);
  return r ? r.dernier_id : 0;
}

/**
 * Règle 8 : le fil est lu jusqu'au dernier message que la personne peut lire, ou jusqu'à jusqu_a (jamais en arrière).
 * Rend le nombre de messages encore non lus.
 */
function marquerLus(user, id, { jusqu_a: jusqua } = {}) {
  const { d, service } = lecteur(user, id);
  const db = getDb();
  const max = db.prepare('SELECT MAX(id) AS m FROM demande_messages WHERE demande_id = ? AND (interne = 0 OR ? = 1)').get(d.id, service ? 1 : 0).m || 0;
  const cible = Math.min(jusqua || max, max);
  const avant = dernierLu(d.id, user.id);
  if (cible > avant) {
    db.prepare(`INSERT INTO demande_messages_lus (demande_id, user_id, dernier_id, lu_le) VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT (demande_id, user_id) DO UPDATE SET dernier_id = excluded.dernier_id, lu_le = excluded.lu_le`).run(d.id, user.id, cible);
  }
  return { demande_id: d.id, dernier_lu: Math.max(cible, avant), non_lus: nonLus(user, [d.id]).get(d.id) || 0 };
}

/**
 * Règle 8 : condition SQL « la demande d (alias d) a un message non lu par la personne », faite de constantes et de « ? ».
 * Le demandeur, le bénéficiaire et le service lisent le fil ; qui suit seulement n'a jamais de message non lu.
 */
const NON_LU = `EXISTS (SELECT 1 FROM demande_messages m WHERE m.demande_id = d.id
  AND (m.user_id IS NULL OR m.user_id <> ?) AND (m.interne = 0 OR ? = 1) AND (? = 1 OR d.demandeur_id = ? OR d.beneficiaire_id = ?)
  AND m.id > COALESCE((SELECT l.dernier_id FROM demande_messages_lus l WHERE l.demande_id = d.id AND l.user_id = ?), 0))`;
function filtreNonLus(user) {
  const service = peut(user, 'demandes:entite') ? 1 : 0;
  return { sql: NON_LU, params: [user.id, service, service, user.id, user.id, user.id] };
}

/** Règle 8 : nombre de messages non lus par la personne, pour les demandes données (Map id → nombre, absentes : 0). */
function nonLus(user, ids) {
  const out = new Map();
  if (!ids.length) return out;
  const service = peut(user, 'demandes:entite') ? 1 : 0;
  const inQ = ids.map(() => '?').join(', ');
  const rows = getDb().prepare(`SELECT m.demande_id AS id, COUNT(*) AS n FROM demande_messages m JOIN demandes d ON d.id = m.demande_id
    LEFT JOIN demande_messages_lus l ON l.demande_id = m.demande_id AND l.user_id = ?
    WHERE m.demande_id IN (${inQ}) AND (m.user_id IS NULL OR m.user_id <> ?) AND (m.interne = 0 OR ? = 1)
    AND (? = 1 OR d.demandeur_id = ? OR d.beneficiaire_id = ?) AND m.id > COALESCE(l.dernier_id, 0) GROUP BY m.demande_id`)
    .all(user.id, ...ids, user.id, service, service, user.id, user.id);
  for (const r of rows) out.set(r.id, r.n);
  return out;
}

/** Ce que la personne peut faire du fil d'une demande, pour l'écran : lire, écrire, écrire en interne (règles 1 à 3). */
function droits(user, d) {
  const service = peut(user, 'demandes:entite');
  const traite = peut(user, 'demandes:traiter');
  const lit = service || concerne(user, d);
  const ouverte = !FERMES.includes(d.etat);
  return { lecture: lit ? 1 : 0, ecriture: lit && ouverte && (traite || concerne(user, d)) ? 1 : 0, interne: service && traite && ouverte ? 1 : 0 };
}

/** Un message de la demande, lu par la personne (même règles que le fil). */
function get(user, demandeId, messageId) {
  const { d, service } = lecteur(user, demandeId);
  const m = getDb().prepare(`SELECT ${COLUMNS} FROM demande_messages m LEFT JOIN users u ON u.id = m.user_id WHERE m.id = ? AND m.demande_id = ?`)
    .get(messageId, d.id);
  if (!m || (m.interne && !service)) throw new AppError(404, 'NOT_FOUND');
  const f = fiche(m, user, service, require('./pieces').deMessages([m.id]).get(m.id));
  if (service && m.interne) f.mentions = mentionsDe([m.id]).get(m.id) || [];
  return f;
}

/**
 * Envoie un message dans le fil (règles 3 à 6). data : texte (facultatif avec des pièces), interne (service), langue.
 * Rend le message envoyé, avec ses pièces.
 */
function create(user, id, { texte, interne = false, langue, mentions = [] }, channel = 'api') {
  const d = peutEcrire(user, id, { interne });
  // Règle 9 : mentions dans une note interne, de collègues du service de l'entité.
  if (mentions.length && !interne) throw new AppError(409, 'MENTION_INTERNE');
  if (mentions.length) {
    const admis = new Set(mentionnables(user, d.id).map((p) => p.user_id));
    if (mentions.some((x) => !admis.has(x))) throw new AppError(409, 'MENTION_INVALIDE');
  }
  const db = getDb();
  const enAttente = db.prepare('SELECT COUNT(*) AS n FROM pieces_jointes WHERE demande_id = ? AND auteur_id = ? AND attente_message = 1').get(d.id, user.id).n;
  const contenu = texte ? String(texte) : null;
  if (!contenu && !enAttente) throw new AppError(409, 'MESSAGE_VIDE');
  const auteur = interne || !concerne(user, d) ? 'service' : d.demandeur_id === user.id ? 'demandeur' : 'beneficiaire';
  let messageId;
  db.transaction(() => {
    messageId = db.prepare('INSERT INTO demande_messages (demande_id, entite_id, user_id, auteur, interne, texte, langue, canal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(d.id, d.entite_id, user.id, auteur, interne ? 1 : 0, contenu, langue || user.lang || 'fr', CANAUX[channel] || 'api').lastInsertRowid;
    const n = require('./pieces').attacher(user.id, d.id, messageId);
    for (const x of mentions) db.prepare('INSERT INTO demande_mentions (message_id, user_id) VALUES (?, ?)').run(messageId, x);
    logAudit(user.id, 'demande.message', 'demande', d.id, {
      numero: d.numero, message_id: messageId, interne: interne ? 1 : 0, longueur: contenu ? contenu.length : 0, pieces: n,
      ...(mentions.length ? { mentions: mentions.length } : {}),
    }, channel, d.entite_id);
  })();
  return get(user, d.id, messageId);
}

module.exports = { list, get, create, peutEcrire, marquerLus, filtreNonLus, nonLus, droits, dernierLu, mentionnables, filtreMentions };
