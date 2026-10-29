/**
 * Comptes de démonstration fictifs pour les ateliers (standard v3.2, section 7.2 : jeu « Démonstration »,
 * sur demande explicite, jamais en production). Lancé par une commande, jamais au démarrage du serveur.
 *
 *   node src/demo.js            crée ou réactive les comptes et leur donne un nouveau mot de passe commun, affiché une fois ;
 *                               crée les lieux de démonstration qui manquent (version 0.2.0)
 *   node src/demo.js --retirer  désactive tous les comptes et tous les lieux de démonstration
 *
 * Refusé sans DEMO_ALLOWED=1 dans l'environnement (variable du fichier .env d'une installation d'acceptance).
 * Avec sql.js, un seul processus écrit dans la base : le service api doit être arrêté pendant la commande.
 * Pour chaque entité active : un compte par rôle de portée « entite ». Un compte de plus a les rôles de gestionnaire
 * et de demandeur dans toutes les entités actives, pour montrer le changement d'entité.
 * Les comptes portent is_demo = 1, une adresse en .invalid (domaine réservé, RFC 2606) et des noms fictifs.
 *
 * Lieux (version 0.2.0) : pour chaque entité active, deux sites fictifs avec bâtiments, niveaux et locaux, marqués
 * is_demo = 1, codes préfixés du code de l'entité, adresse fictive. La première entité (ordre des codes) reçoit le
 * modèle « administration », la deuxième le modèle « action sociale », puis on alterne. Un lieu dont le code existe déjà
 * n'est jamais modifié : relancer la commande garde les photos déposées et les corrections faites à l'écran.
 * Aucune photo n'est livrée : les photos se déposent à l'écran, dans la base de l'installation seulement.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { initDb, getDb, saveNow } = require('./database');
const { logAudit } = require('./audit');
const { ROLES, ENTITE_ROLES, DEFAULT_ROLE } = require('./roles');
const { VERSION } = require('./config');

const DOMAIN = 'demo.invalid';

function fail(msg) {
  console.error(`[DEMO] ${msg}`);
  process.exit(1);
}

function upsertAccount(db, { email, first, last, entiteId, hash }) {
  const u = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (u) {
    db.prepare("UPDATE users SET password_hash = ?, is_active = 1, must_change_password = 0, updated_at = datetime('now') WHERE id = ?").run(hash, u.id);
    return u.id;
  }
  // Compte nouveau : la note de la version installée ne lui est pas montrée (version_vue = version installée).
  return db.prepare(`INSERT INTO users (email, first_name, last_name, user_role, entite_id, password_hash, is_demo, version_vue)
    VALUES (?, ?, ?, 'agent', ?, ?, 1, ?)`).run(email, first, last, entiteId, hash, VERSION).lastInsertRowid;
}

function ensureRole(db, userId, entiteId, role) {
  const has = db.prepare('SELECT 1 FROM user_roles WHERE user_id = ? AND entite_id = ? AND role = ? AND is_active = 1').get(userId, entiteId, role);
  if (!has) db.prepare('INSERT INTO user_roles (user_id, entite_id, role) VALUES (?, ?, ?)').run(userId, entiteId, role);
}

/**
 * Modèles d'arbre : [code relatif, nature, code relatif du parent, nom FR, nom NL, code du type].
 * Les codes s'écrivent ensuite « <ENTITE>-<code> ». Un local sans niveau ou rangé sous un site illustre les règles 1 et 2.
 */
const MODELES = [
  [
    ['S1', 'site', null, 'Site administratif (démo)', 'Administratieve site (demo)', null],
    ['B1', 'batiment', 'S1', 'Maison communale (démo)', 'Gemeentehuis (demo)', null],
    ['B1-R0', 'niveau', 'B1', 'Rez-de-chaussée', 'Gelijkvloers', null],
    ['B1-R1', 'niveau', 'B1', 'Premier étage', 'Eerste verdieping', null],
    ['B1-L01', 'local', 'B1-R0', 'Accueil', 'Onthaal', 'bureau'],
    ['B1-L02', 'local', 'B1-R0', 'Salle du conseil', 'Raadzaal', 'salle_reunion'],
    ['B1-L03', 'local', 'B1-R1', 'Bureau 1.01', 'Kantoor 1.01', 'bureau'],
    ['B1-L04', 'local', 'B1-R0', 'Sanitaires', 'Sanitair', 'sanitaires'],
    ['B2', 'batiment', 'S1', 'Annexe technique (démo)', 'Technisch bijgebouw (demo)', null],
    ['B2-L01', 'local', 'B2', 'Atelier', 'Werkplaats', 'atelier'],
    ['B2-L02', 'local', 'B2', 'Garage', 'Garage', 'garage'],
    ['S2', 'site', null, 'École (démo)', 'School (demo)', null],
    ['B3', 'batiment', 'S2', 'Bâtiment des classes (démo)', 'Klassengebouw (demo)', null],
    ['B3-R0', 'niveau', 'B3', 'Rez-de-chaussée', 'Gelijkvloers', null],
    ['B3-L01', 'local', 'B3-R0', 'Classe 1', 'Klas 1', 'classe'],
    ['B3-L02', 'local', 'B3-R0', 'Cuisine', 'Keuken', 'cuisine'],
    ['S2-X01', 'local', 'S2', 'Cour de récréation', 'Speelplaats', 'exterieur'],
  ],
  [
    ['S1', 'site', null, 'Siège (démo)', 'Hoofdzetel (demo)', null],
    ['B1', 'batiment', 'S1', 'Bâtiment principal (démo)', 'Hoofdgebouw (demo)', null],
    ['B1-R0', 'niveau', 'B1', 'Rez-de-chaussée', 'Gelijkvloers', null],
    ['B1-R1', 'niveau', 'B1', 'Premier étage', 'Eerste verdieping', null],
    ['B1-L01', 'local', 'B1-R0', 'Accueil social', 'Sociaal onthaal', 'bureau'],
    ['B1-L02', 'local', 'B1-R1', 'Bureau', 'Kantoor', 'bureau'],
    ['B1-L03', 'local', 'B1-R1', 'Salle de réunion', 'Vergaderzaal', 'salle_reunion'],
    ['S1-X01', 'local', 'S1', 'Parking', 'Parking', 'exterieur'],
    ['S2', 'site', null, 'Résidence (démo)', 'Residentie (demo)', null],
    ['B2', 'batiment', 'S2', 'Résidence pour aînés (démo)', 'Residentie voor senioren (demo)', null],
    ['B2-R0', 'niveau', 'B2', 'Rez-de-chaussée', 'Gelijkvloers', null],
    ['B2-R1', 'niveau', 'B2', 'Premier étage', 'Eerste verdieping', null],
    ['B2-L01', 'local', 'B2-R0', 'Cuisine', 'Keuken', 'cuisine'],
    ['B2-L02', 'local', 'B2-R1', 'Salle commune', 'Gemeenschappelijke zaal', 'salle_reunion'],
  ],
];
const ADRESSE = { adresse: 'Rue Fictive 1', code_postal: '9999', commune: 'Démoville / Demostad' };
const MOTIF_RETRAIT = 'Retrait des données de démonstration';

/** Crée les lieux du modèle qui manquent dans l'entité ; rend le nombre de lieux créés. */
function seedLieux(db, entite, modele) {
  let n = 0;
  const idOf = (rel) => {
    const r = db.prepare('SELECT id FROM lieux WHERE entite_id = ? AND code = ?').get(entite.id, `${entite.code}-${rel}`);
    return r ? r.id : null;
  };
  for (const [rel, nature, parentRel, nomFr, nomNl, typeCode] of modele) {
    if (idOf(rel)) continue;
    const type = typeCode ? db.prepare("SELECT id FROM listes_valeurs WHERE entite_id = ? AND liste = 'type_lieu' AND code = ?").get(entite.id, typeCode) : null;
    const adr = nature === 'site' || nature === 'batiment' ? ADRESSE : { adresse: null, code_postal: null, commune: null };
    db.prepare(`INSERT INTO lieux (entite_id, parent_id, nature, code, nom_fr, nom_nl, type_id, adresse, code_postal, commune, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
      .run(entite.id, parentRel ? idOf(parentRel) : null, nature, `${entite.code}-${rel}`, nomFr, nomNl, type ? type.id : null,
        adr.adresse, adr.code_postal, adr.commune);
    n += 1;
  }
  return n;
}

async function main() {
  if (process.env.DEMO_ALLOWED !== '1') fail('Refusé : DEMO_ALLOWED=1 absent. Les comptes de démonstration sont réservés à une installation d\'acceptance.');
  await initDb();
  const db = getDb();

  if (process.argv.includes('--retirer')) {
    const r = db.prepare("UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE is_demo = 1 AND is_active = 1").run();
    db.prepare('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE is_demo = 1)').run();
    const l = db.prepare("UPDATE lieux SET is_active = 0, motif_desactivation = ?, updated_at = datetime('now') WHERE is_demo = 1 AND is_active = 1")
      .run(MOTIF_RETRAIT);
    logAudit(null, 'demo.retrait', 'user', null, { comptes: r.changes, lieux: l.changes }, 'cli');
    saveNow();
    console.log(`[DEMO] ${r.changes} compte(s) et ${l.changes} lieu(x) de démonstration désactivé(s).`);
    return;
  }

  if (!db.prepare('SELECT COUNT(*) AS n FROM users').get().n) fail("Refusé : l'installation n'est pas faite. Créez d'abord l'administrateur dans le navigateur.");
  const entites = db.prepare('SELECT id, code FROM entites WHERE is_active = 1 ORDER BY code').all();
  if (!entites.length) fail('Refusé : aucune entité active.');

  const password = crypto.randomBytes(12).toString('base64url');
  const hash = bcrypt.hashSync(password, 10);
  const label = (code) => ROLES.find((r) => r.code === code).label_fr;
  const created = [];
  let lieux = 0;

  db.transaction(() => {
    for (const e of entites) {
      for (const role of ENTITE_ROLES) {
        const email = `${role.replace(/_/g, '-')}.${e.code.toLowerCase()}@${DOMAIN}`;
        const id = upsertAccount(db, { email, first: 'Démo', last: `${label(role)} ${e.code}`, entiteId: e.id, hash });
        ensureRole(db, id, e.id, DEFAULT_ROLE);
        ensureRole(db, id, e.id, role);
        created.push(email);
      }
    }
    const multi = `multi-entites@${DOMAIN}`;
    const id = upsertAccount(db, { email: multi, first: 'Démo', last: 'Plusieurs entités', entiteId: entites[0].id, hash });
    for (const e of entites) {
      ensureRole(db, id, e.id, DEFAULT_ROLE);
      ensureRole(db, id, e.id, 'gestionnaire');
    }
    created.push(multi);
    // Lieux retirés par --retirer : réactivés ; un lieu désactivé à l'écran pour un autre motif reste désactivé.
    db.prepare("UPDATE lieux SET is_active = 1, motif_desactivation = NULL, updated_at = datetime('now') WHERE is_demo = 1 AND is_active = 0 AND motif_desactivation = ?")
      .run(MOTIF_RETRAIT);
    entites.forEach((e, i) => { lieux += seedLieux(db, e, MODELES[i % MODELES.length]); });
    logAudit(null, 'demo.chargement', 'user', null, { comptes: created.length, lieux }, 'cli');
  })();
  saveNow();

  console.log(`[DEMO] ${created.length} comptes de démonstration prêts.`);
  for (const email of created) console.log(`  ${email}`);
  console.log(`[DEMO] ${lieux} lieu(x) de démonstration créé(s) ; les lieux déjà présents sont gardés tels quels.`);
  console.log(`[DEMO] Mot de passe commun, affiché une seule fois : ${password}`);
  console.log('[DEMO] Relancer la commande donne un nouveau mot de passe ; --retirer désactive ces comptes et ces lieux.');
}

main().catch((e) => { console.error('[DEMO] Échec :', e.message); process.exit(1); });
