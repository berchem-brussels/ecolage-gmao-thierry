/**
 * Routes libres, sans session, en liste écrite et courte (standard v3.2, section 7.3) :
 * santé, version, paramètres publics de l'instance, assistant d'installation tant qu'aucun compte n'existe.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { validate } = require('../validation');
const { ok, fail, handle } = require('../envelope');
const { openSession } = require('../auth');
const { logAudit } = require('../audit');
const { VERSION } = require('../config');
const S = require('../schemas');
const { DEFAULT_ROLE } = require('../roles');
const { seedEntite } = require('../services/listes-valeurs');
const categories = require('../services/categories');
const priorites = require('../services/priorites');
const calendrier = require('../services/calendrier');
const parametres = require('../services/parametres');
const { MODULES, cle: cleModule } = require('../modules');

const router = express.Router();

const installed = () => getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n > 0;

router.get('/health', (req, res) => ok(res, { status: 'ok', version: VERSION }, { version: VERSION }));
router.get('/version', (req, res) => ok(res, { version: VERSION }, { version: VERSION }));

router.get('/settings/public', handle((req, res) => {
  const s = parametres.publicSettings();
  const estInstalle = installed();
  // Tant que l'installation n'est pas faite, l'assistant reçoit les modules qu'il peut proposer (disponibles, hors noyau).
  const extra = estInstalle ? {} : {
    modules_installables: MODULES.filter((m) => m.disponible && !m.noyau).map((m) => ({
      code: m.code, libelle_fr: m.libelle_fr, libelle_nl: m.libelle_nl, description_fr: m.description_fr, description_nl: m.description_nl, actif_defaut: !!m.actif_defaut,
    })),
  };
  ok(res, { ...s, auth: { mode: 'local' }, installed: estInstalle, version: VERSION, ...extra }, { resource: 'settings' });
}));

/**
 * Assistant d'installation, possible une seule fois tant que la base ne contient aucun compte :
 * nom du pouvoir local, première entité (les suivantes se créent dans l'écran Entités) et premier administrateur,
 * qui reçoit le rôle de demandeur dans cette entité comme tout compte (cahier des charges ROL-01).
 */
router.post('/install', validate(S.installation), handle((req, res) => {
  if (installed()) return fail(res, req, 409, 'INSTALL_CLOSED');
  const db = getDb();
  const b = req.body;
  const hash = bcrypt.hashSync(b.password, 10);
  const userId = db.transaction(() => {
    const e = db.prepare('INSERT INTO entites (code, nom_fr, nom_nl) VALUES (?, ?, ?)').run(b.entite_code, b.entite_nom_fr, b.entite_nom_nl);
    // La note de version en cours n'est pas montrée à un compte nouveau : version_vue part de la version installée.
    const lang = b.default_lang || parametres.defaut('app.default_lang');
    const r = db.prepare(`INSERT INTO users (email, first_name, last_name, user_role, entite_id, password_hash, version_vue, preferred_lang)
      VALUES (?, ?, ?, 'admin', ?, ?, ?, ?)`).run(b.email.trim(), b.first_name, b.last_name, e.lastInsertRowid, hash, VERSION, lang);
    db.prepare('UPDATE entites SET created_by = ?, updated_by = ? WHERE id = ?').run(r.lastInsertRowid, r.lastInsertRowid, e.lastInsertRowid);
    db.prepare('INSERT INTO user_roles (user_id, entite_id, role, created_by, updated_by) VALUES (?, ?, ?, ?, ?)')
      .run(r.lastInsertRowid, e.lastInsertRowid, DEFAULT_ROLE, r.lastInsertRowid, r.lastInsertRowid);
    const reglages = [['app.organisation_fr', b.organisation_fr], ['app.organisation_nl', b.organisation_nl]];
    if (b.default_lang) reglages.push(['app.default_lang', b.default_lang]);
    // Modules : chaque module disponible hors noyau reçoit l'état choisi ; sans choix, l'état livré s'applique.
    if (Array.isArray(b.modules)) {
      for (const m of MODULES.filter((x) => x.disponible && !x.noyau)) reglages.push([cleModule(m.code), b.modules.includes(m.code) ? '1' : '0']);
    }
    for (const [key, value] of reglages) {
      db.prepare('INSERT INTO app_settings (key, value, updated_by) VALUES (?, ?, ?)').run(key, value, r.lastInsertRowid);
    }
    seedEntite(e.lastInsertRowid);
    categories.seedEntite(e.lastInsertRowid);
    require('../services/questions-categorie').seedEntite(e.lastInsertRowid); // questions livrées (DEM-05)
    priorites.seedEntite(e.lastInsertRowid);
    calendrier.seedEntite(e.lastInsertRowid);
    logAudit(r.lastInsertRowid, 'install.first_admin', 'user', r.lastInsertRowid, { email: b.email, entite: b.entite_code, langue: lang, modules: b.modules ?? null }, 'api', e.lastInsertRowid);
    return r.lastInsertRowid;
  })();
  const { csrf } = openSession(req, res, { id: userId });
  ok(res, { installed: true, csrf_token: csrf }, { resource: 'install' }, null, 201);
}));

router.PUBLIC_ROUTES = ['GET /api/health', 'GET /api/version', 'GET /api/settings/public', 'POST /api/install', 'POST /api/auth/login'];

module.exports = router;
