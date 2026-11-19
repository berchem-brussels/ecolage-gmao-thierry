/**
 * Contrôles automatiques après installation, partie « serveur » (0.12.0, DV-110 ; 0.14.0 : migration 012_cycle_de_vie ; 0.15.0 : migration 013_messages ; 0.16.0 : migration
 * 014_validation, table des services et passages du valideur ; 0.17.0 : migration 015_notifications et ses quatre tables ; 0.18.0 : aucune migration, exports refusés sans session ; 0.19.0 : migration 016_equipes_prestataires, ses sept tables,
 * corps de métier livrés, équipes et prestataires refusés sans session), lancés par recette.sh dans le
 * conteneur de l'API : `docker exec -i <app>-api node src/recette-api.js <version> <adresse>`.
 *
 * Lecture seule pour les données métier : rien n'est créé, modifié ni supprimé. Seules la connexion du compte de
 * démonstration et ses changements d'entité laissent leurs lignes ordinaires au journal (login.success, session.entite),
 * ce que le contrôle 9 vérifie justement. La base est lue en mémoire (sql.js), jamais réécrite.
 * Le mot de passe arrive sur l'entrée standard, tapé en clair dans recette.sh puis effacé de l'écran (0.14.0, DV-117) ;
 * il n'est ni affiché ni écrit. Un refus de connexion se dit en clair (mot de passe refusé, compte bloqué), jamais par
 * un code HTTP seul.
 * Sortie : une ligne « OK » ou « ECHEC » par contrôle, puis le bilan ; code de sortie 1 au moindre échec.
 */
const fs = require('fs');
const initSqlJs = require('sql.js');
const { DB_PATH } = require('./config');

const BASE = `http://127.0.0.1:${process.env.PORT || 3001}`;
const [, , VERSION_ATTENDUE, ADRESSE = 'multi-entites@demo.invalid'] = process.argv;
const resultats = [];
const note = (ok, n, texte, detail = '') => {
  resultats.push(ok);
  console.log(`${ok ? 'OK    ' : 'ECHEC '} ${n}. ${texte}${detail ? ` : ${detail}` : ''}`);
};

/** Client minimal : cookie de session et jeton anti-CSRF, comme le navigateur. */
function client() {
  let cookie = '';
  let csrf = '';
  return async (method, url, body) => {
    const h = { 'Content-Type': 'application/json' };
    if (cookie) h.Cookie = cookie;
    if (csrf) h['X-CSRF-Token'] = csrf;
    const r = await fetch(BASE + url, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = r.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const json = await r.json().catch(() => null);
    if (json && json.data && json.data.csrf_token) csrf = json.data.csrf_token;
    return { status: r.status, body: json };
  };
}

/** Explication lisible d'un échec de connexion du contrôle 7 (DV-117). */
function motifConnexion(status, longueur) {
  if (status === 200) return '';
  if (longueur === 0) return 'aucun mot de passe reçu, relancez le script et tapez-le avant Entrée';
  if (status === 401) return `mot de passe refusé, vérifiez la saisie (${longueur} caractère(s) reçu(s))`;
  if (status === 429) return 'trop d’essais, compte bloqué un moment : attendez quelques minutes avant de relancer';
  if (status === 403) return 'connexion par mot de passe fermée pour ce compte (mode Microsoft seul)';
  if (status === 400) return 'adresse ou mot de passe mal formé, vérifiez la saisie';
  return `connexion impossible (HTTP ${status})`;
}

async function lireBase() {
  const SQL = await initSqlJs();
  return new SQL.Database(fs.readFileSync(DB_PATH));
}

async function main() {
  const motDePasse = fs.readFileSync(0, 'utf8').split(/\r?\n/)[0];
  const anonyme = client();

  // 4. Version servie par l'API.
  const v = await anonyme('GET', '/api/version');
  note(v.body?.data?.version === VERSION_ATTENDUE, 4, `version de l'API ${VERSION_ATTENDUE}`, v.body?.data?.version);

  // 5. Migration de la version appliquée (lecture de schema_migrations et des tables nouvelles) ; 0.19.0 : migration
  // 016_equipes_prestataires, ses sept tables, corps de métier livrés dans chaque entité active, passages du valideur
  // toujours là (0.16.0).
  const db = await lireBase();
  const migr = db.exec("SELECT name FROM schema_migrations ORDER BY id DESC LIMIT 1")[0]?.values?.[0]?.[0];
  const tables = db.exec("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN ('equipes', 'equipe_membres', 'equipe_horaires', 'ouvrier_profils', 'ouvrier_competences', 'prestataires', 'prestataire_corps')")[0]?.values?.[0]?.[0];
  const sansCorps = db.exec("SELECT COUNT(*) FROM entites e WHERE e.is_active = 1 AND NOT EXISTS (SELECT 1 FROM listes_valeurs v WHERE v.entite_id = e.id AND v.liste = 'corps_metier')")[0]?.values?.[0]?.[0];
  const passages = db.exec("SELECT COUNT(*) FROM demande_transitions WHERE acteur = 'valideur'")[0]?.values?.[0]?.[0] || 0;
  note(migr === '016_equipes_prestataires' && tables === 7 && sansCorps === 0 && passages === 2, 5, 'migration 016_equipes_prestataires appliquée, tables des équipes et des prestataires présentes, corps de métier livrés, passages du valideur gardés',
    `${migr}, ${tables ?? 0} table(s) sur 7, ${sansCorps ?? '?'} entité(s) sans corps de métier, ${passages} passage(s) du valideur sur 2`);

  // 6. Refus sans session ; 0.18.0 : les trois exports Excel et CSV aussi ; 0.19.0 : équipes, ouvriers, prestataires.
  const sans = await Promise.all(['/api/demandes', '/api/faq', '/api/tickets', '/api/audit',
    '/api/demandes/export?format=csv', '/api/demandes/a-valider/export?format=csv', '/api/tickets/export?format=csv',
    '/api/equipes', '/api/ouvriers', '/api/prestataires'].map((u) => anonyme('GET', u)));
  const pub = await anonyme('GET', '/api/settings/public');
  note(sans.every((r) => r.status === 401) && !/business_roles|tickets\./.test(JSON.stringify(pub.body)), 6,
    'sans session : demandes, FAQ, tickets, journal, exports, équipes, ouvriers et prestataires refusés (401), réglages des tickets jamais servis', sans.map((r) => r.status).join(' '));

  // 7. Connexion du compte de démonstration et entités.
  const c = client();
  const login = await c('POST', '/api/auth/login', { email: ADRESSE, password: motDePasse });
  const me = (await c('GET', '/api/auth/me')).body?.data;
  const entites = me?.entites || [];
  note(login.status === 200 && entites.length >= 2, 7, `connexion de ${ADRESSE}, rôles dans deux entités`, login.status === 200 ? entites.map((e) => e.code).join(', ') : motifConnexion(login.status, motDePasse.length));
  if (login.status !== 200 || entites.length < 2) return;
  const [a, b] = entites;
  const depart = me.entite_active_id;

  // 8. Cloison : un lieu et une demande de B ne se lisent pas depuis A ; la FAQ ne mélange pas les entités.
  await c('PUT', '/api/auth/entite', { entite_id: b.id });
  const lieuB = (await c('GET', '/api/lieux?limit=1')).body?.data?.[0];
  const demB = (await c('GET', '/api/demandes?perimetre=entite&limit=1')).body?.data?.[0];
  await c('PUT', '/api/auth/entite', { entite_id: a.id });
  const refus = [];
  if (lieuB) refus.push((await c('GET', `/api/lieux/${lieuB.id}`)).status);
  if (demB) refus.push((await c('GET', `/api/demandes/${demB.id}`)).status);
  const faqA = (await c('GET', '/api/faq?limit=200')).body?.data || [];
  const faqPropre = faqA.every((f) => f.entite_id === null || f.entite_id === a.id);
  note(refus.length > 0 && refus.every((s) => s === 403) && faqPropre, 8,
    `cloison ${a.code} / ${b.code} : objets de ${b.code} refusés depuis ${a.code} (403), FAQ sans l'autre entité`, `${refus.join(' ')}${faqPropre ? '' : ', FAQ mélangée'}`);

  // Remise dans l'état de départ : entité active d'origine, puis déconnexion.
  if (depart && depart !== a.id) await c('PUT', '/api/auth/entite', { entite_id: depart });
  await c('POST', '/api/auth/logout', {});

  // 9. Journal : la connexion du contrôle 7 y est, avec l'heure. Le serveur écrit la base une seconde après la
  // dernière écriture (sql.js) : on attend un peu avant de la relire.
  await new Promise((r) => setTimeout(r, 2500));
  const db2 = await lireBase();
  const req = db2.prepare(`SELECT a.created_at FROM audit_log a JOIN users u ON u.id = a.user_id
    WHERE a.action = 'login.success' AND u.email = ? AND a.created_at > datetime('now', '-5 minutes') ORDER BY a.id DESC LIMIT 1`);
  req.bind([ADRESSE]);
  const ligne = req.step() ? req.get()[0] : null;
  req.free();
  note(!!ligne, 9, 'journal d’audit : connexion du contrôle 7 inscrite', ligne ? `${ligne} UTC` : 'absente');

}

if (require.main !== module) {
  module.exports = { motifConnexion };
} else main()
  .catch((e) => { note(false, 0, 'erreur du script', e.message); })
  .finally(() => {
    const ko = resultats.filter((x) => !x).length;
    console.log(`SERVEUR ${resultats.length - ko}/${resultats.length}`);
    process.exit(ko ? 1 : 0);
  });
