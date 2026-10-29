/**
 * Profil de la personne connectée et choix de l'entité active (cahier des charges ROL-03).
 * Le profil donne les entités où la personne a au moins un rôle actif, avec ses rôles dans chacune ;
 * les listes et les écrans ne montrent que les données de l'entité active.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { rolesIn, setActiveEntite } = require('../auth');
const notes = require('./notes-version');
const demandes = require('./demandes');
const parametresEntite = require('./parametres-entite');

const PROFILE = 'id, email, first_name, last_name, user_role, entite_id, preferred_lang, ui_mode, theme, must_change_password, lieu_habituel_id';

function entitesOf(userId) {
  const db = getDb();
  return db.prepare(`SELECT DISTINCT e.id, e.code, e.nom_fr, e.nom_nl FROM entites e JOIN user_roles ur ON ur.entite_id = e.id
    WHERE ur.user_id = ? AND ur.is_active = 1 AND e.is_active = 1 ORDER BY e.code`).all(userId)
    .map((e) => ({ ...e, roles: rolesIn(userId, e.id) }));
}

function profil(user) {
  const db = getDb();
  const p = db.prepare(`SELECT ${PROFILE} FROM users WHERE id = ?`).get(user.id);
  const s = db.prepare('SELECT entite_id FROM sessions WHERE id = ?').get(user.sid);
  const entites = entitesOf(user.id);
  const active = s && entites.some((e) => e.id === s.entite_id) ? s.entite_id : null;
  // Nouveautés non lues depuis la dernière mise à jour, filtrées selon le rôle d'instance et les rôles de l'entité active.
  const nouveautes = notes.aLire({ id: user.id, role: p.user_role, roles: active ? rolesIn(user.id, active) : [] });
  // Lieu proposé d'office dans le formulaire de demande, pour l'entité active (REF-04, DV-42).
  const lieu_propose = active ? demandes.lieuPropose({ id: user.id, entiteId: active }) : null;
  // Numéro à appeler en cas de danger (DEM-06, 0.7.0) : téléphone d'urgence de l'entité active, sinon celui du service.
  const telephone_urgence = active ? (parametresEntite.valeur(active, 'urgence.telephone') || parametresEntite.valeur(active, 'contact.telephone') || null) : null;
  // Mentions d'information et contact du DPO de l'entité active (RGPD-10, 0.7.0) : formulaire, aide et MCP.
  const protection_donnees = active ? parametresEntite.protectionDonnees(active) : null;
  return { ...p, entites, entite_active_id: active, nouveautes, lieu_propose, telephone_urgence, protection_donnees };
}

function choisirEntite(user, entiteId, channel = 'api') {
  if (!setActiveEntite(user, entiteId)) throw new AppError(403, 'FORBIDDEN');
  logAudit(user.id, 'session.entite', 'entite', entiteId, null, channel, entiteId);
  return profil(user);
}

/** Nouveautés lues : la version installée devient la dernière lue ; rend le profil, sans nouveautés à lire. */
function nouveautesLues(user, channel = 'api') {
  notes.marquerLues(user, channel);
  return profil(user);
}

/** Lieu de travail habituel choisi par la personne ; rend le profil. */
function lieuHabituel(user, lieuId, channel = 'api') {
  demandes.choisirLieuHabituel(user, lieuId, channel);
  return profil(user);
}

module.exports = { profil, choisirEntite, entitesOf, nouveautesLues, lieuHabituel };
