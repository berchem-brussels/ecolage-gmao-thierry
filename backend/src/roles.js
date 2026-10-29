/**
 * Catalogue des rôles livré dans config/roles.json pour l'application Droits (standard v3.2, section 8.5).
 * Les rôles de portée « entite » s'attribuent par entité (table user_roles) ; « admin » vaut pour l'instance (users.user_role).
 */
const fs = require('fs');
const path = require('path');

const CATALOGUE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'roles.json'), 'utf8'));
const ROLES = CATALOGUE.roles;
const ENTITE_ROLES = ROLES.filter((r) => r.portee === 'entite').map((r) => r.code);
const DEFAULT_ROLE = ROLES.find((r) => r.defaut).code;

/** Rôles de portée « entite » qui portent une permission du catalogue. */
const rolesWith = (permission) => ROLES.filter((r) => r.portee === 'entite' && r.permissions.includes(permission)).map((r) => r.code);

/** Rôles qui lisent la liste des personnes de leur entité. */
const MEMBRES_ROLES = rolesWith('entites:membres');

const publicRole = (r) => ({
  code: r.code, portee: r.portee, defaut: !!r.defaut,
  label_fr: r.label_fr, label_nl: r.label_nl, description_fr: r.description_fr, description_nl: r.description_nl,
  permissions: r.permissions,
});

module.exports = { ROLES, ENTITE_ROLES, DEFAULT_ROLE, MEMBRES_ROLES, rolesWith, publicRole };
