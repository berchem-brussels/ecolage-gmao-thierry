/**
 * Couche d'accès aux données : sql.js derrière l'interface prepare().get/all/run de SAGA.
 * sql.js est admis pour le maquettage ; la production passe sur PostgreSQL 16 par le pont de PILOT
 * (pg-handle.js), avec la même interface (standard v3.2, sections 5 et 7.1).
 * Aucun ORM. Toute valeur passe par un paramètre ?.
 */
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { DB_PATH } = require('./config');

let rawDb = null;
let saveTimer = null;
let wrapped = null;

/** Écriture atomique : fichier temporaire puis renommage ; PRAGMA reposé après export() (piège SAGA 72-73). */
function saveNow() {
  if (!rawDb) return;
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, Buffer.from(rawDb.export()));
  fs.renameSync(tmp, DB_PATH);
  rawDb.run('PRAGMA foreign_keys = ON');
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 1000);
}

function createWrapper(raw) {
  const norm = (params) => params.map((p) => (p === undefined ? null : p));
  const rows = (sql, params, first) => {
    let stmt;
    try {
      stmt = raw.prepare(sql);
      if (params.length) stmt.bind(norm(params));
      const out = [];
      while (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        const row = {};
        cols.forEach((c, i) => { row[c] = vals[i]; });
        if (first) return row;
        out.push(row);
      }
      return first ? undefined : out;
    } finally {
      if (stmt) stmt.free();
    }
  };
  return {
    prepare(sql) {
      return {
        run(...params) {
          raw.run(sql, norm(params));
          scheduleSave();
          const r = raw.exec('SELECT last_insert_rowid() AS id, changes() AS c');
          return { lastInsertRowid: r.length ? r[0].values[0][0] : 0, changes: r.length ? r[0].values[0][1] : 0 };
        },
        get(...params) { return rows(sql, params, true); },
        all(...params) { return rows(sql, params, false); },
      };
    },
    exec(sql) { raw.run(sql); scheduleSave(); },
    transaction(fn) {
      return (...args) => {
        raw.run('BEGIN TRANSACTION');
        try {
          const r = fn(...args);
          raw.run('COMMIT');
          scheduleSave();
          return r;
        } catch (e) {
          raw.run('ROLLBACK');
          throw e;
        }
      };
    },
  };
}

async function initDb() {
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  rawDb = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();
  rawDb.run('PRAGMA foreign_keys = ON');
  wrapped = createWrapper(rawDb);
  migrate();
  // Valeurs livrées des listes et arbre livré des catégories, pour chaque entité active ; chargé ici (et non en tête) pour éviter un cycle de modules.
  require('./services/listes-valeurs').seedAll();
  require('./services/categories').seedAll();
  require('./services/questions-categorie').seedAll();
  require('./services/priorites').seedAll();
  require('./services/calendrier').seedAll();
  saveNow();
  return wrapped;
}

function getDb() {
  if (!wrapped) throw new Error('Base non initialisée');
  return wrapped;
}

/**
 * Migrations numérotées, rejouables, jamais destructrices (standard v3.2, section 7.2).
 * Une évolution du schéma = une entrée ajoutée en fin de liste. Aucun CREATE TABLE ailleurs.
 */
const MIGRATIONS = [
  // Socle de la GMAO (version 0.1.0) : entités (AC, CPAS ou autres) en données, comptes, rôles par entité,
  // sessions avec entité active, journal d'audit, paramètres. Les rôles métier sont déclarés dans config/roles.json.
  ['001_noyau', `
    CREATE TABLE entites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE CHECK (length(code) BETWEEN 2 AND 10),
      nom_fr TEXT NOT NULL CHECK (length(nom_fr) BETWEEN 1 AND 200),
      nom_nl TEXT NOT NULL CHECK (length(nom_nl) BETWEEN 1 AND 200),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      motif_desactivation TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      password_hash TEXT,
      user_role TEXT NOT NULL DEFAULT 'agent' CHECK (user_role IN ('agent', 'admin')),
      entite_id INTEGER REFERENCES entites(id) ON DELETE RESTRICT,
      preferred_lang TEXT NOT NULL DEFAULT 'fr' CHECK (preferred_lang IN ('fr', 'nl')),
      ui_mode TEXT NOT NULL DEFAULT 'simple' CHECK (ui_mode IN ('simple', 'complet')),
      theme TEXT NOT NULL DEFAULT 'clair' CHECK (theme IN ('clair', 'sombre')),
      must_change_password INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
      created_by INTEGER,
      updated_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_users_entite ON users(entite_id);
    CREATE TABLE user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entite_id INTEGER NOT NULL REFERENCES entites(id) ON DELETE RESTRICT,
      role TEXT NOT NULL CHECK (role IN ('agent', 'valideur', 'ouvrier', 'chef_equipe', 'gestionnaire', 'responsable', 'gestionnaire_reservations', 'magasinier', 'gestionnaire_flotte', 'lecteur')),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      motif_retrait TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_user_roles_user ON user_roles(user_id);
    CREATE INDEX idx_user_roles_entite ON user_roles(entite_id);
    CREATE UNIQUE INDEX uq_user_roles_actif ON user_roles(user_id, entite_id, role) WHERE is_active = 1;
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entite_id INTEGER REFERENCES entites(id) ON DELETE SET NULL,
      csrf_token TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
    CREATE INDEX idx_sessions_user ON sessions(user_id);
    CREATE INDEX idx_sessions_entite ON sessions(entite_id);
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      channel TEXT NOT NULL DEFAULT 'api',
      details_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX idx_audit_user ON audit_log(user_id);
    CREATE TABLE app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `],
  // Référentiel des lieux (version 0.2.0) : listes de valeurs par entité (REF-08), arbre site, bâtiment, niveau, local
  // par entité (REF-01, REF-02), photo d'un lieu. La liste admise pour « liste » vient de config/listes-valeurs.json :
  // aucune contrainte CHECK, pour qu'une liste nouvelle n'oblige pas à reconstruire la table.
  ['002_lieux', `
    CREATE TABLE listes_valeurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entite_id INTEGER NOT NULL REFERENCES entites(id) ON DELETE RESTRICT,
      liste TEXT NOT NULL CHECK (length(liste) BETWEEN 2 AND 40),
      code TEXT NOT NULL CHECK (length(code) BETWEEN 2 AND 40),
      libelle_fr TEXT NOT NULL CHECK (length(libelle_fr) BETWEEN 1 AND 200),
      libelle_nl TEXT NOT NULL CHECK (length(libelle_nl) BETWEEN 1 AND 200),
      ordre INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      motif_desactivation TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (entite_id, liste, code)
    );
    CREATE INDEX idx_listes_valeurs_entite ON listes_valeurs(entite_id, liste);
    CREATE TABLE lieux (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entite_id INTEGER NOT NULL REFERENCES entites(id) ON DELETE RESTRICT,
      parent_id INTEGER REFERENCES lieux(id) ON DELETE RESTRICT,
      nature TEXT NOT NULL CHECK (nature IN ('site', 'batiment', 'niveau', 'local')),
      code TEXT NOT NULL CHECK (length(code) BETWEEN 1 AND 30),
      nom_fr TEXT NOT NULL CHECK (length(nom_fr) BETWEEN 1 AND 200),
      nom_nl TEXT NOT NULL CHECK (length(nom_nl) BETWEEN 1 AND 200),
      type_id INTEGER REFERENCES listes_valeurs(id) ON DELETE RESTRICT,
      adresse TEXT,
      code_postal TEXT,
      commune TEXT,
      surface_m2 REAL CHECK (surface_m2 IS NULL OR surface_m2 >= 0),
      statut TEXT NOT NULL DEFAULT 'en_service' CHECK (statut IN ('en_service', 'hors_service', 'cede')),
      photo_fichier TEXT,
      photo_type TEXT CHECK (photo_type IS NULL OR photo_type IN ('image/jpeg', 'image/png')),
      photo_octets INTEGER,
      photo_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      motif_desactivation TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (entite_id, code)
    );
    CREATE INDEX idx_lieux_entite ON lieux(entite_id);
    CREATE INDEX idx_lieux_parent ON lieux(parent_id);
    CREATE INDEX idx_lieux_type ON lieux(type_id)
  `],
  // Paramètres, modules et journal (version 0.3.0) : paramètres métier par entité (ADM-03), entité concernée par une
  // ligne du journal d'audit (filtre de l'écran du journal), dernière note de version lue par chaque compte (E-07).
  // Les paramètres de l'instance et l'état des modules vivent dans app_settings, déjà présente.
  // Les comptes existants ont tous connu la 0.2.0, dernière version sans cette migration : ils verront la note de la 0.3.0.
  ['003_parametres', `
    CREATE TABLE parametres_entite (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entite_id INTEGER NOT NULL REFERENCES entites(id) ON DELETE RESTRICT,
      cle TEXT NOT NULL CHECK (length(cle) BETWEEN 3 AND 60),
      valeur TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (entite_id, cle)
    );
    CREATE INDEX idx_parametres_entite ON parametres_entite(entite_id);
    ALTER TABLE audit_log ADD COLUMN entite_id INTEGER REFERENCES entites(id) ON DELETE SET NULL;
    CREATE INDEX idx_audit_entite ON audit_log(entite_id);
    CREATE INDEX idx_audit_date ON audit_log(created_at);
    ALTER TABLE users ADD COLUMN version_vue TEXT;
    UPDATE users SET version_vue = '0.2.0'
  `],
  // Référentiel des demandes (version 0.4.0) : catégories d'intervention en arbre domaine, nature par entité (REF-06) ;
  // priorités P1 à P4 et délais par entité, horaire par jour de la semaine, congés et fermetures (PRI-02). Les jours
  // fériés légaux se calculent chaque année : aucune table.
  // Les valeurs propres d'une nature (priorité, validation, délai) valent NULL quand elle reprend celles de son domaine.
  // Les icônes admises viennent de config/categories.json : aucune contrainte CHECK, pour qu'une icône nouvelle
  // n'oblige pas à reconstruire la table.
  ['004_referentiel_demandes', `
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entite_id INTEGER NOT NULL REFERENCES entites(id) ON DELETE RESTRICT,
      parent_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
      code TEXT NOT NULL CHECK (length(code) BETWEEN 2 AND 40),
      libelle_fr TEXT NOT NULL CHECK (length(libelle_fr) BETWEEN 1 AND 200),
      libelle_nl TEXT NOT NULL CHECK (length(libelle_nl) BETWEEN 1 AND 200),
      icone TEXT NOT NULL DEFAULT 'autre' CHECK (length(icone) BETWEEN 2 AND 40),
      priorite_defaut TEXT CHECK (priorite_defaut IS NULL OR priorite_defaut IN ('P1', 'P2', 'P3', 'P4')),
      validation INTEGER CHECK (validation IS NULL OR validation IN (0, 1)),
      delai_fin_jours INTEGER CHECK (delai_fin_jours IS NULL OR delai_fin_jours BETWEEN 1 AND 365),
      ordre INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      motif_desactivation TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (entite_id, code)
    );
    CREATE INDEX idx_categories_entite ON categories(entite_id);
    CREATE INDEX idx_categories_parent ON categories(parent_id);
    CREATE TABLE priorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entite_id INTEGER NOT NULL REFERENCES entites(id) ON DELETE RESTRICT,
      code TEXT NOT NULL CHECK (code IN ('P1', 'P2', 'P3', 'P4')),
      libelle_fr TEXT NOT NULL CHECK (length(libelle_fr) BETWEEN 1 AND 100),
      libelle_nl TEXT NOT NULL CHECK (length(libelle_nl) BETWEEN 1 AND 100),
      description_fr TEXT,
      description_nl TEXT,
      couleur TEXT NOT NULL DEFAULT 'default',
      unite TEXT NOT NULL CHECK (unite IN ('heures_calendaires', 'heures_ouvrables', 'jours_ouvrables')),
      prise_en_charge INTEGER NOT NULL CHECK (prise_en_charge >= 1),
      fin INTEGER CHECK (fin IS NULL OR fin >= prise_en_charge),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (entite_id, code)
    );
    CREATE INDEX idx_priorites_entite ON priorites(entite_id);
    CREATE TABLE horaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entite_id INTEGER NOT NULL REFERENCES entites(id) ON DELETE RESTRICT,
      jour INTEGER NOT NULL CHECK (jour BETWEEN 1 AND 7),
      debut TEXT CHECK (debut IS NULL OR length(debut) = 5),
      fin TEXT CHECK (fin IS NULL OR length(fin) = 5),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (entite_id, jour),
      CHECK ((debut IS NULL AND fin IS NULL) OR (debut IS NOT NULL AND fin IS NOT NULL AND debut < fin))
    );
    CREATE TABLE jours_non_ouvres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entite_id INTEGER NOT NULL REFERENCES entites(id) ON DELETE RESTRICT,
      nature TEXT NOT NULL CHECK (nature IN ('conge', 'fermeture')),
      mois_jour TEXT CHECK (mois_jour IS NULL OR length(mois_jour) = 5),
      date_debut TEXT CHECK (date_debut IS NULL OR length(date_debut) = 10),
      date_fin TEXT CHECK (date_fin IS NULL OR length(date_fin) = 10),
      libelle_fr TEXT NOT NULL CHECK (length(libelle_fr) BETWEEN 1 AND 200),
      libelle_nl TEXT NOT NULL CHECK (length(libelle_nl) BETWEEN 1 AND 200),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      motif_desactivation TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK ((nature = 'conge' AND mois_jour IS NOT NULL AND date_debut IS NULL AND date_fin IS NULL)
        OR (nature = 'fermeture' AND mois_jour IS NULL AND date_debut IS NOT NULL AND date_fin IS NOT NULL AND date_debut <= date_fin))
    );
    CREATE INDEX idx_jours_non_ouvres_entite ON jours_non_ouvres(entite_id)
  `],
  // Demandes d'intervention (version 0.5.0) : demandes de l'agent (DEM-01 à 03, SUI-01), numérotation par entité,
  // par type et par année (NUM-01 à 05), lieu de travail habituel de chaque compte (REF-04, DV-42).
  // sequences : un compteur par entité, type et année (annee = 0 pour le compteur continu), tenu à jour dans les deux
  // modes pour qu'un changement de mode ne redonne jamais un numéro déjà attribué. Le numéro est unique par contrainte.
  // Une demande n'est jamais supprimée (CYC-05) : la table n'a pas de colonne is_active, l'annulation viendra à l'étape 9.
  // États : liste complète du cahier des charges (section 8.1) ; les transitions arrivent à l'étape 9 (CYC-01).
  // Étape JavaScript (nettoyerBase) : espaces de début et de fin retirés des textes déjà enregistrés (DV-37, DV-47).
  ['005_demandes', `
    CREATE TABLE sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entite_id INTEGER NOT NULL REFERENCES entites(id) ON DELETE RESTRICT,
      type TEXT NOT NULL CHECK (type IN ('demande')),
      annee INTEGER NOT NULL CHECK (annee = 0 OR annee BETWEEN 2000 AND 2999),
      dernier INTEGER NOT NULL DEFAULT 0 CHECK (dernier >= 0),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (entite_id, type, annee)
    );
    CREATE TABLE demandes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entite_id INTEGER NOT NULL REFERENCES entites(id) ON DELETE RESTRICT,
      numero TEXT NOT NULL UNIQUE CHECK (length(numero) BETWEEN 5 AND 40),
      annee INTEGER NOT NULL CHECK (annee BETWEEN 2000 AND 2999),
      sequence INTEGER NOT NULL CHECK (sequence >= 1),
      lieu_id INTEGER NOT NULL REFERENCES lieux(id) ON DELETE RESTRICT,
      categorie_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      description TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 5000),
      langue TEXT NOT NULL DEFAULT 'fr' CHECK (langue IN ('fr', 'nl')),
      etat TEXT NOT NULL DEFAULT 'a_qualifier' CHECK (etat IN ('brouillon', 'en_validation', 'refusee_validation', 'a_qualifier', 'qualifiee', 'planifiee', 'en_cours', 'en_attente', 'externe', 'terminee', 'cloturee', 'rouverte', 'refusee', 'fusionnee', 'annulee')),
      priorite TEXT CHECK (priorite IS NULL OR priorite IN ('P1', 'P2', 'P3', 'P4')),
      canal TEXT NOT NULL DEFAULT 'ecran' CHECK (canal IN ('ecran', 'mcp', 'api', 'telephone', 'courriel', 'grc', 'preventif')),
      demandeur_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (entite_id, annee, sequence)
    );
    CREATE INDEX idx_demandes_entite ON demandes(entite_id, etat);
    CREATE INDEX idx_demandes_demandeur ON demandes(demandeur_id);
    CREATE INDEX idx_demandes_lieu ON demandes(lieu_id);
    CREATE INDEX idx_demandes_categorie ON demandes(categorie_id);
    ALTER TABLE users ADD COLUMN lieu_habituel_id INTEGER REFERENCES lieux(id) ON DELETE SET NULL
  `, (db) => require('./nettoyage-espaces').nettoyerBase(db)],
  // Version 0.7.0 (étape 7) : formulaire de demande complet. Point 1 (DEM-04) : personnes qui suivent une demande
  // ouverte au même bâtiment (« Moi aussi »), avec la remarque éventuelle, lisible du seul service technique.
  // Point 2 (DEM-06) : case « Danger pour les personnes ou les biens ».
  // Point 3 (DEM-07, DEM-08) : bénéficiaire (un collègue, ou un texte pour un service ou une personne sans compte),
  // date souhaitée et créneau.
  // Point 4 (DEM-11) : brouillon du formulaire, un par personne et par entité, lu par elle seule, gardé 30 jours.
  ['006_demandes_formulaire', `
    CREATE TABLE demande_suiveurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      demande_id INTEGER NOT NULL REFERENCES demandes(id) ON DELETE RESTRICT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      remarque TEXT CHECK (remarque IS NULL OR length(remarque) BETWEEN 1 AND 5000),
      canal TEXT NOT NULL DEFAULT 'ecran' CHECK (canal IN ('ecran', 'mcp', 'api')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (demande_id, user_id)
    );
    CREATE INDEX idx_demande_suiveurs_user ON demande_suiveurs(user_id);
    ALTER TABLE demandes ADD COLUMN danger INTEGER NOT NULL DEFAULT 0 CHECK (danger IN (0, 1));
    ALTER TABLE demandes ADD COLUMN beneficiaire_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE demandes ADD COLUMN beneficiaire_texte TEXT CHECK (beneficiaire_texte IS NULL OR length(beneficiaire_texte) BETWEEN 1 AND 200);
    ALTER TABLE demandes ADD COLUMN date_souhaitee TEXT CHECK (date_souhaitee IS NULL OR length(date_souhaitee) = 10);
    ALTER TABLE demandes ADD COLUMN creneau TEXT CHECK (creneau IS NULL OR length(creneau) BETWEEN 1 AND 200);
    CREATE INDEX idx_demandes_beneficiaire ON demandes(beneficiaire_id);
    CREATE TABLE brouillons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entite_id INTEGER NOT NULL REFERENCES entites(id) ON DELETE CASCADE,
      contenu TEXT NOT NULL CHECK (length(contenu) BETWEEN 2 AND 20000),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, entite_id)
    );
    CREATE TABLE questions_categorie (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entite_id INTEGER NOT NULL REFERENCES entites(id) ON DELETE RESTRICT,
      categorie_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      question_fr TEXT NOT NULL CHECK (length(question_fr) BETWEEN 1 AND 200),
      question_nl TEXT NOT NULL CHECK (length(question_nl) BETWEEN 1 AND 200),
      type TEXT NOT NULL CHECK (type IN ('oui_non', 'choix')),
      reponses_json TEXT CHECK (reponses_json IS NULL OR length(reponses_json) BETWEEN 2 AND 4000),
      obligatoire INTEGER NOT NULL DEFAULT 0 CHECK (obligatoire IN (0, 1)),
      ordre INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      motif_desactivation TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX idx_questions_categorie ON questions_categorie(categorie_id, is_active, ordre);
    CREATE TABLE demande_reponses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      demande_id INTEGER NOT NULL REFERENCES demandes(id) ON DELETE RESTRICT,
      question_id INTEGER NOT NULL REFERENCES questions_categorie(id) ON DELETE RESTRICT,
      question_fr TEXT NOT NULL,
      question_nl TEXT NOT NULL,
      valeur TEXT NOT NULL CHECK (valeur IN ('oui', 'non', '1', '2', '3', '4', '5', '6')),
      reponse_fr TEXT NOT NULL,
      reponse_nl TEXT NOT NULL,
      ordre INTEGER NOT NULL DEFAULT 0,
      UNIQUE (demande_id, question_id)
    )
  `],
];

function migrate() {
  const db = wrapped;
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))");
  const isApplied = (name) => !!db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(name);
  // Une migration peut porter une étape JavaScript (troisième élément), jouée dans la même transaction après son SQL.
  for (const [name, sql, etape] of MIGRATIONS) {
    if (isApplied(name)) continue;
    db.transaction(() => {
      for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) rawDb.run(stmt);
      if (etape) etape(db);
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
    })();
    console.log(`[DB] Migration ${name} appliquée`);
  }
  saveNow();
}

/**
 * Clause SET à partir d'un corps déjà validé par un schéma ajv à additionalProperties:false.
 * Le schéma est la liste blanche des colonnes ; cette fonction ne contrôle que la forme du nom.
 */
function safeBuildUpdate(body, excludeKeys = ['id']) {
  const SAFE_COL = /^[a-z_][a-z0-9_]{0,63}$/i;
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(body)) {
    if (excludeKeys.includes(k) || !SAFE_COL.test(k)) continue;
    sets.push(`${k} = ?`);
    params.push(v);
  }
  return { sets, params };
}

module.exports = { initDb, getDb, saveNow, safeBuildUpdate, MIGRATIONS };
