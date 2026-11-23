/**
 * Notes de version pour les utilisateurs (standard v3.2, sections 13.1 et 17.8 ; écart E-07).
 * Le texte vient de config/notes-version.json, en FR et en NL, une ligne par nouveauté avec son public : tous,
 * administrateur, ou une permission du catalogue des rôles lue dans l'entité active. Chaque compte retient la dernière
 * version dont il a lu la note (users.version_vue). À la première connexion après une mise à jour, le profil rend les
 * notes non lues ; un compte nouveau part de la version installée et ne voit pas la note en cours (décision du 22/10/2026).
 */
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { rolesWith } = require('../roles');
const { VERSION } = require('../config');

const NOTES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'notes-version.json'), 'utf8')).notes;

/** Comparaison de deux numéros X.Y.Z : négatif si a < b, 0 si égaux, positif si a > b. */
function comparer(a, b) {
  const x = String(a).split('.').map(Number);
  const y = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
}

/** Une ligne est pour la personne si son public est « tous », « admin » pour l'administrateur, ou une permission qu'elle porte. */
function pourQui(user) {
  return (ligne) => ligne.public === 'tous'
    || (ligne.public === 'admin' && user.role === 'admin')
    || (ligne.public.includes(':') && (user.roles || []).some((r) => rolesWith(ligne.public).includes(r)));
}

/** Notes publiées (jusqu'à la version installée), lignes filtrées pour la personne, notes vides retirées. */
function publiees(user) {
  const garder = pourQui(user);
  return NOTES.filter((n) => comparer(n.version, VERSION) <= 0)
    .map((n) => ({ version: n.version, date: n.date, lignes: n.lignes.filter(garder).map(({ fr, nl }) => ({ fr, nl })) }))
    .filter((n) => n.lignes.length);
}

function list(user, { limit = 50, offset = 0 } = {}) {
  const rows = publiees(user);
  return { rows: rows.slice(offset, offset + limit), pagination: { total: rows.length, limit, offset } };
}

function get(user, version) {
  const n = publiees(user).find((x) => x.version === version);
  if (!n) throw new AppError(404, 'NOT_FOUND');
  return n;
}

/** Notes non lues : plus récentes que la dernière lue, jusqu'à la version installée. Aucune si rien n'est noté. */
function aLire(user) {
  const row = getDb().prepare('SELECT version_vue FROM users WHERE id = ?').get(user.id);
  if (!row || !row.version_vue || comparer(row.version_vue, VERSION) >= 0) return [];
  return publiees(user).filter((n) => comparer(n.version, row.version_vue) > 0);
}

/** La personne a lu les nouveautés : la version installée devient sa dernière version lue. */
function marquerLues(user, channel = 'api') {
  const row = getDb().prepare('SELECT version_vue FROM users WHERE id = ?').get(user.id);
  if (row && row.version_vue === VERSION) return;
  getDb().prepare("UPDATE users SET version_vue = ?, updated_at = datetime('now') WHERE id = ?").run(VERSION, user.id);
  logAudit(user.id, 'nouveautes.lues', 'user', user.id, { version: VERSION }, channel);
}

module.exports = { comparer, list, get, aLire, marquerLues };
