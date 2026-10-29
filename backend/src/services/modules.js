/**
 * Modules activables (cahier des charges ADM-02). Lecture : toute personne connectée, pour que l'interface règle son
 * menu, son aide et son assistant. Activation et désactivation : administrateur seul, pour toute l'instance, inscrites
 * au journal d'audit. Un module du noyau ne s'éteint pas ; un module à venir (pas encore construit) ne se règle pas.
 * Le catalogue est fermé : ni création ni suppression de module.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { MODULES, cle, estActif } = require('../modules');

function fiche(m) {
  const row = getDb().prepare('SELECT updated_at, updated_by FROM app_settings WHERE key = ?').get(cle(m.code));
  return {
    code: m.code, libelle_fr: m.libelle_fr, libelle_nl: m.libelle_nl, description_fr: m.description_fr, description_nl: m.description_nl,
    ferme_fr: m.ferme_fr || null, ferme_nl: m.ferme_nl || null,
    noyau: !!m.noyau, disponible: !!m.disponible, etape: m.etape, actif: estActif(m.code), actif_defaut: !!m.actif_defaut,
    updated_at: row ? row.updated_at : null, updated_by: row ? row.updated_by : null,
  };
}

function trouver(code) {
  const m = MODULES.find((x) => x.code === code);
  if (!m) throw new AppError(404, 'NOT_FOUND');
  return m;
}

function list(user, { limit = 50, offset = 0, actif, disponible } = {}) {
  let rows = MODULES.map(fiche);
  if (actif !== undefined) rows = rows.filter((m) => m.actif === (actif === 1));
  if (disponible !== undefined) rows = rows.filter((m) => m.disponible === (disponible === 1));
  return { rows: rows.slice(offset, offset + limit), pagination: { total: rows.length, limit, offset } };
}

function get(user, code) {
  return fiche(trouver(code));
}

function update(user, code, actif, channel = 'api') {
  if (!user || user.role !== 'admin') throw new AppError(403, 'FORBIDDEN');
  const m = trouver(code);
  if (m.noyau) throw new AppError(409, 'MODULE_NOYAU');
  if (!m.disponible) throw new AppError(409, 'MODULE_A_VENIR');
  const avant = estActif(code);
  const apres = actif === 1;
  if (avant !== apres) {
    getDb().prepare(`INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
      .run(cle(code), apres ? '1' : '0', user.id);
    logAudit(user.id, apres ? 'module.activer' : 'module.desactiver', 'module', null, { module: code }, channel);
  }
  return fiche(m);
}

module.exports = { list, get, update };
