/**
 * Courriel (version 0.17.0, étape 13, point 2 ; cahier des charges NOT-02, NOT-04, NOT-06 ; standard section 7,
 * « Courriel » et « Règles communes »). Commun à la route REST et au MCP. Administrateur seulement.
 *   1. Réglages SMTP dans Administration › Paramètres › Courriel : serveur, port, sécurité (STARTTLS, TLS ou aucune),
 *      compte, mot de passe chiffré (AES-256-GCM, jamais renvoyé : seul « renseigné » l'est), expéditeur, adresse de
 *      l'application pour les liens. Journal `settings.courriel`, mot de passe masqué.
 *   2. Mode test (livré, réglage le plus protecteur) : rien ne part. Chaque courriel est retenu dans la table `courriels`
 *      (état « test »), lisible par l'administrateur ; l'écran le dit « simulé » (standard, section 7). Mode SMTP : le
 *      courriel entre dans la file (« en_attente ») et part après l'action qui l'a causé, jamais pendant.
 *   3. File d'envoi dans l'API, sans tâche planifiée externe : traitée juste après chaque mise en file et toutes les
 *      minutes ; trois essais (après 5 puis 15 minutes) ; le résultat de chaque courriel est gardé (« envoye » ou « echec »
 *      avec le code de l'erreur, jamais le message du serveur) : c'est le journal des envois.
 *   4. Envoi d'essai : en mode test, retenu comme les autres ; en mode SMTP, envoyé tout de suite et le résultat est rendu
 *      à l'écran (« envoyé » ou le code de l'erreur). Journal `courriel.essai`.
 *   5. Sécurité de `nodemailer` : aucun accès aux fichiers ni aux adresses web depuis un message (disableFileAccess,
 *      disableUrlAccess) ; certificat du serveur toujours vérifié ; expéditeur et destinataire passés en objets, jamais
 *      en texte assemblé ; texte brut seulement.
 *   6. Contenu minimal (NOT-06) : un courriel ne porte que ce que l'appelant compose depuis un modèle (points 3 et 4) :
 *      numéro, lieu, état et lien ; le détail se lit après connexion. Conservation : 90 jours, sauf un courriel en attente.
 */
const nodemailer = require('nodemailer');
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { getSetting, setSetting, isSet } = require('../settings');

const MAP = { mode: 'mail.mode', host: 'mail.host', port: 'mail.port', securite: 'mail.securite', user: 'mail.user', password: 'mail.password', from: 'mail.from', from_name: 'mail.from_name', public_url: 'mail.public_url' };
const ESSAIS_MAX = 3;
const DELAIS_MINUTES = [5, 15];
const JOURS_CONSERVATION = 90;
const LOT = 20;
const COLUMNS = 'id, entite_id, user_id, destinataire, langue, evenement, objet, objet_id, numero, sujet, mode, etat, essais, prochain_essai, erreur, envoye_le, created_by, created_at';

const admin = (user) => { if (!user || user.role !== 'admin') throw new AppError(403, 'FORBIDDEN'); };
const iso = (s) => (s ? `${String(s).replace(' ', 'T')}Z` : null);

function dernierEnregistrement() {
  const r = getDb().prepare(`SELECT a.created_at, u.first_name, u.last_name FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    WHERE a.action = 'settings.courriel' ORDER BY a.id DESC LIMIT 1`).get();
  if (!r) return null;
  const nom = `${r.first_name || ''} ${r.last_name || ''}`.trim();
  return { le: iso(r.created_at), par: nom || null };
}

const mode = () => (getSetting('mail.mode') === 'smtp' ? 'smtp' : 'test');

/** Adresse de l'application pour les liens des courriels : la sienne, sinon celle de la connexion Microsoft. */
function adresseApplication() {
  return (getSetting('mail.public_url') || getSetting('auth.public_url')).replace(/\/$/, '');
}

function lire(user) {
  admin(user);
  const db = getDb();
  const compte = (etat) => db.prepare('SELECT COUNT(*) AS n FROM courriels WHERE etat = ?').get(etat).n;
  return {
    mode: mode(), host: getSetting('mail.host'), port: Number(getSetting('mail.port')) || 587, securite: getSetting('mail.securite'),
    user: getSetting('mail.user'), password_set: isSet('mail.password'), from: getSetting('mail.from'), from_name: getSetting('mail.from_name'),
    public_url: getSetting('mail.public_url'), adresse_liens: adresseApplication() || null,
    file: { en_attente: compte('en_attente'), echec: compte('echec'), test: compte('test') },
    enregistre: dernierEnregistrement(),
  };
}

function regler(user, b, channel = 'api') {
  admin(user);
  const apres = { ...Object.fromEntries(Object.keys(MAP).map((k) => [k, k === 'password' ? null : getSetting(MAP[k])])), ...b };
  if (apres.mode === 'smtp' && (!apres.host || !apres.from)) throw new AppError(409, 'SMTP_INCOMPLET');
  for (const [k, v] of Object.entries(b)) if (v !== undefined) setSetting(MAP[k], k === 'port' ? String(v) : v ?? '');
  logAudit(user.id, 'settings.courriel', 'settings', null, { ...b, password: b.password ? '***' : b.password === '' ? '(effacé)' : undefined }, channel);
  if (mode() === 'smtp') planifier();
  return lire(user);
}

/** Règle 5 : transport créé à chaque lot, depuis les réglages du moment. */
function transport() {
  const securite = getSetting('mail.securite');
  const user = getSetting('mail.user');
  return nodemailer.createTransport({
    host: getSetting('mail.host'),
    port: Number(getSetting('mail.port')) || 587,
    secure: securite === 'tls',
    requireTLS: securite === 'starttls',
    ignoreTLS: securite === 'aucune',
    auth: user ? { user, pass: getSetting('mail.password') } : undefined,
    tls: { rejectUnauthorized: true },
    disableFileAccess: true,
    disableUrlAccess: true,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

const expediteur = () => ({ name: getSetting('mail.from_name') || getSetting('app.name_fr') || 'GMAO', address: getSetting('mail.from') });
const codeErreur = (e) => String((e && (e.code || e.responseCode)) || 'ECHEC').replace(/[^A-Za-z0-9_]/g, '').slice(0, 60) || 'ECHEC';

function purger(db) {
  db.prepare("DELETE FROM courriels WHERE etat <> 'en_attente' AND created_at < datetime('now', ?)").run(`-${JOURS_CONSERVATION} days`);
}

/**
 * Met un courriel en file (mode SMTP) ou le retient (mode test), dans la transaction de l'appelant. Rend son identifiant.
 * c : { destinataire, userId, entiteId, langue, evenement, objet, objetId, numero, sujet, corps, auteurId }.
 */
function mettreEnFile(db, c) {
  purger(db);
  const m = mode();
  const r = db.prepare(`INSERT INTO courriels (entite_id, user_id, destinataire, langue, evenement, objet, objet_id, numero, sujet, corps, mode, etat, prochain_essai, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'smtp' THEN datetime('now') END, ?)`)
    .run(c.entiteId || null, c.userId || null, c.destinataire, c.langue === 'nl' ? 'nl' : 'fr', c.evenement, c.objet || null, c.objetId || null, c.numero || null,
      c.sujet, c.corps, m, m === 'smtp' ? 'en_attente' : 'test', m, c.auteurId || null);
  if (m === 'smtp') planifier();
  return r.lastInsertRowid;
}

let enCours = false;
let planifie = false;

/** Règle 3 : traitement après la réponse en cours (setImmediate), jamais pendant la transaction de l'action. */
function planifier() {
  if (planifie) return;
  planifie = true;
  setImmediate(() => { planifie = false; traiter().catch((e) => console.error('[COURRIEL] File :', codeErreur(e))); });
}

async function envoyerUn(t, c) {
  await t.sendMail({ from: expediteur(), to: { name: '', address: c.destinataire }, subject: c.sujet, text: c.corps });
}

/** Un lot de la file : rend le nombre de courriels traités. */
async function traiter() {
  if (enCours || mode() !== 'smtp') return 0;
  enCours = true;
  try {
    const db = getDb();
    const lot = db.prepare(`SELECT id, destinataire, sujet, corps, essais FROM courriels WHERE etat = 'en_attente' AND prochain_essai IS NOT NULL AND prochain_essai <= datetime('now')
      ORDER BY id LIMIT ?`).all(LOT);
    if (!lot.length) return 0;
    const t = transport();
    for (const c of lot) {
      try {
        await envoyerUn(t, c);
        db.prepare("UPDATE courriels SET etat = 'envoye', essais = essais + 1, envoye_le = datetime('now'), erreur = NULL, prochain_essai = NULL WHERE id = ?").run(c.id);
      } catch (e) {
        const essais = c.essais + 1;
        if (essais >= ESSAIS_MAX) db.prepare("UPDATE courriels SET etat = 'echec', essais = ?, erreur = ?, prochain_essai = NULL WHERE id = ?").run(essais, codeErreur(e), c.id);
        else {
          db.prepare("UPDATE courriels SET essais = ?, erreur = ?, prochain_essai = datetime('now', ?) WHERE id = ?")
            .run(essais, codeErreur(e), `+${DELAIS_MINUTES[essais - 1]} minutes`, c.id);
        }
      }
    }
    if (typeof t.close === 'function') t.close();
    return lot.length;
  } finally {
    enCours = false;
  }
}

let minuteur = null;
/** Au démarrage de l'API (index.js) : file traitée toutes les minutes ; arrêtée avec le processus. */
function demarrer() {
  if (minuteur) return;
  // Un essai interrompu par un arrêt de l'API (en attente, sans prochain essai) ne repart jamais seul.
  getDb().prepare("UPDATE courriels SET etat = 'echec', erreur = 'INTERROMPU' WHERE etat = 'en_attente' AND prochain_essai IS NULL").run();
  minuteur = setInterval(() => { traiter().catch(() => undefined); }, 60000);
  if (minuteur.unref) minuteur.unref();
  planifier();
}

const TEXTE_ESSAI = {
  fr: { sujet: "Courriel d'essai de {app}", corps: "Bonjour,\n\nCe courriel confirme que {app} peut envoyer des courriels.\nAucune action n'est demandée.\n\n{app}" },
  nl: { sujet: 'Testmail van {app}', corps: 'Goedendag,\n\nDeze e-mail bevestigt dat {app} e-mails kan versturen.\nEr wordt geen actie gevraagd.\n\n{app}' },
};

/** Règle 4 : envoi d'essai, à l'adresse donnée ou à celle de l'administrateur. */
async function essai(user, { destinataire } = {}, channel = 'api') {
  admin(user);
  const db = getDb();
  const lang = user.lang === 'nl' ? 'nl' : 'fr';
  const a = db.prepare('SELECT email FROM users WHERE id = ?').get(user.id);
  const vers = destinataire || (a && a.email);
  if (!vers) throw new AppError(409, 'COURRIEL_SANS_DESTINATAIRE');
  const app = getSetting(lang === 'nl' ? 'app.name_nl' : 'app.name_fr') || 'GMAO';
  const sujet = TEXTE_ESSAI[lang].sujet.replace(/\{app\}/g, app);
  const corps = TEXTE_ESSAI[lang].corps.replace(/\{app\}/g, app);
  const m = mode();
  if (m === 'smtp' && (!getSetting('mail.host') || !getSetting('mail.from'))) throw new AppError(409, 'SMTP_INCOMPLET');
  const id = db.transaction(() => {
    purger(db);
    return db.prepare(`INSERT INTO courriels (user_id, destinataire, langue, evenement, sujet, corps, mode, etat, created_by)
      VALUES (?, ?, ?, 'essai', ?, ?, ?, ?, ?)`).run(destinataire ? null : user.id, vers, lang, sujet, corps, m, m === 'smtp' ? 'en_attente' : 'test', user.id).lastInsertRowid;
  })();
  let resultat = 'retenu';
  let erreur = null;
  if (m === 'smtp') {
    const t = transport();
    try {
      await envoyerUn(t, { destinataire: vers, sujet, corps });
      db.prepare("UPDATE courriels SET etat = 'envoye', essais = 1, envoye_le = datetime('now') WHERE id = ?").run(id);
      resultat = 'envoye';
    } catch (e) {
      erreur = codeErreur(e);
      // Un essai ne se retente pas : son résultat est la réponse attendue par l'administrateur.
      db.prepare("UPDATE courriels SET etat = 'echec', essais = 1, erreur = ? WHERE id = ?").run(erreur, id);
      resultat = 'echec';
    } finally {
      if (typeof t.close === 'function') t.close();
    }
  }
  logAudit(user.id, 'courriel.essai', 'courriel', id, { mode: m, resultat, erreur: erreur || undefined, destinataire_propre: destinataire ? 0 : 1 }, channel);
  return { id, mode: m, resultat, erreur, destinataire: vers };
}

function list(user, { limit = 50, offset = 0, etat, q } = {}) {
  admin(user);
  const where = [];
  const params = [];
  if (etat) { where.push('etat = ?'); params.push(etat); }
  if (q) { where.push('(destinataire LIKE ? OR numero LIKE ? OR sujet LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM courriels ${clause}`).get(...params).n;
  const rows = db.prepare(`SELECT ${COLUMNS} FROM courriels ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows, pagination: { total, limit, offset } };
}

function get(user, id) {
  admin(user);
  const c = getDb().prepare(`SELECT ${COLUMNS}, corps FROM courriels WHERE id = ?`).get(id);
  if (!c) throw new AppError(404, 'NOT_FOUND');
  return c;
}

module.exports = { lire, regler, essai, list, get, mettreEnFile, traiter, demarrer, adresseApplication, mode, ESSAIS_MAX, DELAIS_MINUTES, JOURS_CONSERVATION };
