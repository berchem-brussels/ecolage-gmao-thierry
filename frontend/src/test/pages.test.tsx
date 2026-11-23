/**
 * Chaque écran s'affiche et passe l'audit axe-core, en FR et en NL (patron SAGA a11y.test.tsx).
 * La règle color-contrast est désactivée : jsdom ne calcule pas les couleurs rendues ; le contraste se vérifie à l'écran.
 */
import React from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/nl';
import 'dayjs/locale/fr';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup as cleanupAll, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { I18nProvider } from '../contexts/I18nContext';
import { SettingsProvider, FALLBACK_SETTINGS } from '../contexts/SettingsContext';
import { ApiError } from '../api';
import { translations } from '../i18n';

const entites = [
  { id: 1, code: 'AA', nom_fr: 'Administration fictive', nom_nl: 'Fictief bestuur', is_active: 1, motif_desactivation: null, created_at: '2026-10-15 10:00:00', updated_at: '2026-10-15 10:00:00' },
  { id: 2, code: 'BB', nom_fr: 'Centre fictif', nom_nl: 'Fictief centrum', is_active: 1, motif_desactivation: null, created_at: '2026-10-15 10:00:00', updated_at: '2026-10-15 10:00:00' },
];
const user: Record<string, unknown> & { nouveautes?: unknown[] } = {
  id: 1, email: 'a@exemple.test', first_name: 'Ada', last_name: 'Admin', user_role: 'admin', entite_id: 1, preferred_lang: 'fr', ui_mode: 'simple', theme: 'clair', must_change_password: 0,
  entites: [{ ...entites[0], roles: ['agent', 'gestionnaire'] }, { ...entites[1], roles: ['responsable'] }], entite_active_id: 1,
  protection_donnees: { mention_courte_fr: 'Vos données servent à traiter votre demande.', mention_courte_nl: 'Uw gegevens dienen voor uw aanvraag.',
    mention_fr: 'Administration fictive traite les données de cette demande.', mention_nl: 'Fictief bestuur verwerkt de gegevens van deze aanvraag.', dpo_contact: null },
  // 0.12.0 (R6) : files de tickets traitées dans l'entité active ; un test la vide pour un agent qui n'en traite aucune.
  files_tickets: ['business'],
};
const roles = [
  { code: 'agent', portee: 'entite', defaut: true, label_fr: 'Demandeur', label_nl: 'Aanvrager', description_fr: 'd', description_nl: 'd', permissions: ['lieux:lire', 'listes:lire'] },
  { code: 'gestionnaire', portee: 'entite', defaut: false, label_fr: 'Gestionnaire technique', label_nl: 'Technisch beheerder', description_fr: 'd', description_nl: 'd', permissions: ['entites:membres', 'lieux:lire', 'lieux:gerer', 'listes:lire', 'equipes:lire', 'indisponibilites:gerer', 'prestataires:lire'] },
  { code: 'responsable', portee: 'entite', defaut: false, label_fr: 'Responsable du service technique', label_nl: 'Verantwoordelijke technische dienst', description_fr: 'd', description_nl: 'd', permissions: ['entites:membres', 'lieux:lire', 'lieux:gerer', 'listes:lire', 'listes:gerer', 'equipes:lire', 'indisponibilites:gerer', 'equipes:gerer', 'prestataires:lire', 'prestataires:gerer'] },
  { code: 'valideur', portee: 'entite', defaut: false, label_fr: 'Valideur', label_nl: 'Goedkeurder', description_fr: 'd', description_nl: 'd', permissions: ['demandes:creer', 'demandes:valider'] },
  { code: 'admin', portee: 'instance', defaut: false, label_fr: 'Administrateur', label_nl: 'Beheerder', description_fr: 'd', description_nl: 'd', permissions: [] },
];
// 0.19.0 (étape 15) : équipes et ouvriers de l'entité AA.
const equipesListe = [
  { id: 4, code: 'BAT', nom_fr: 'Bâtiment', nom_nl: 'Gebouwen', chef_id: 21, chef_prenom: 'Charles', chef_nom: 'Chef', ordre: 10, is_active: 1, motif_desactivation: null, is_demo: 0,
    nb_membres: 2, membres: [{ id: 22, prenom: 'Oscar', nom: 'Ouvrier' }, { id: 23, prenom: 'Olga', nom: 'Ouvrière' }], horaire: [], trace: null },
  { id: 5, code: 'PROP-WE', nom_fr: 'Propreté du week-end', nom_nl: 'Netheid in het weekend', chef_id: null, chef_prenom: null, chef_nom: null, ordre: 20, is_active: 1,
    motif_desactivation: null, is_demo: 1, nb_membres: 1, membres: [{ id: 24, prenom: 'Paul', nom: 'Propre' }],
    horaire: [{ jour: 6, debut: '07:00', fin: '13:00' }, { jour: 7, debut: '07:00', fin: '13:00' }], trace: null },
];
// 0.21.0 (point 3, PLA-03) : planning d'une semaine (lundi 07/12/2026) : Oscar (équipe BAT) en congé le mardi, Olga ; une
// tâche de l'équipe le lundi, une tâche d'Olga le mercredi, une tâche sans affectation le jeudi.
const jourP = (travaille: 0 | 1, extra: Record<string, unknown> = {}) => ({ travaille, indisponible: null, charge_min: 0, nb_taches: 0, ...extra });
const semaineP = ['2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10', '2026-12-11', '2026-12-12', '2026-12-13'];
const planningData = {
  du: semaineP[0], au: semaineP[6], aujourdhui: '2026-12-08',
  jours: semaineP.map((date, i) => ({ date, jour_semaine: i + 1, ouvre_entite: i < 5 ? 1 : 0 })),
  ouvriers: [
    { id: 22, prenom: 'Oscar', nom: 'Ouvrier', equipes: [4], jours: Object.fromEntries(semaineP.map((d, i) => [d, i === 1 ? jourP(0, { indisponible: 'journee', nb_taches: 1, conflits: ['absent'] })
      : jourP(i < 5 ? 1 : 0, i === 0 ? { charge_min: 600, nb_taches: 2, capacite_min: 510, conflits: ['trop_charge'] } : {})])) },
    { id: 23, prenom: 'Olga', nom: 'Ouvrière', equipes: [4], jours: Object.fromEntries(semaineP.map((d, i) => [d, jourP(i < 5 ? 1 : 0, i === 0 ? { charge_min: 90, nb_taches: 1 } : i === 2 ? { charge_min: 60, nb_taches: 1 } : {})])) },
  ],
  equipes: [{ id: 4, code: 'BAT', nom_fr: 'Bâtiment', nom_nl: 'Gebouwen', membres: [22, 23], horaire_propre: 0, jours: Object.fromEntries(semaineP.map((d, i) => [d, jourP(i < 5 ? 1 : 0)])) }],
  taches: [
    { id: 51, demande_id: 7, numero: 'AA-DI-2026-00007', rang: 1, titre: 'Changer les luminaires', etat: 'a_faire', date_prevue: semaineP[0], heure_debut: '08:00', duree_estimee_min: 90, equipe_id: 4, ouvriers: [], lieu_code: 'MC-A-12', lieu_nom_fr: 'Bureau 12', lieu_nom_nl: 'Kantoor 12' },
    { id: 52, demande_id: 7, numero: 'AA-DI-2026-00007', rang: 2, titre: 'Contrôler le tableau', etat: 'a_faire', date_prevue: semaineP[2], heure_debut: null, duree_estimee_min: 60, equipe_id: null, ouvriers: [23], lieu_code: 'MC-A-12', lieu_nom_fr: 'Bureau 12', lieu_nom_nl: 'Kantoor 12' },
    { id: 53, demande_id: 8, numero: 'AA-DI-2026-00008', rang: 1, titre: 'Reboucher le trou', etat: 'a_faire', date_prevue: semaineP[3], heure_debut: null, duree_estimee_min: null, equipe_id: null, ouvriers: [], lieu_code: null, lieu_nom_fr: null, lieu_nom_nl: null },
  ],
  // 0.21.0 (point 4, PLA-05) : une tâche ouverte sans date, déjà confiée à Oscar.
  non_planifiees: [
    { id: 54, demande_id: 9, numero: 'AA-DI-2026-00009', rang: 1, titre: 'Repeindre la porte', etat: 'a_faire', date_prevue: null, heure_debut: null, duree_estimee_min: 120, equipe_id: null, ouvriers: [22], lieu_code: 'MC-A', lieu_nom_fr: 'Aile A', lieu_nom_nl: 'Vleugel A', priorite: 'P2' },
  ],
};
// Conflits rendus par la maquette de l'affectation (0.21.0, point 4).
let conflitsReponse: Record<string, unknown>[] = [];
// 0.21.0 (point 2, PLA-04) : une indisponibilité d'Oscar (motif rendu au gestionnaire).
const indisposListe: Record<string, unknown>[] = [{ id: 91, user_id: 22, du: '2026-12-21', au: '2026-12-24', periode: 'journee', motif: 'conge' }];
const prestatairesListe = [
  { id: 8, nom: 'Chauffagiste fictif', numero_entreprise: '0123.456.749', langue: 'fr', contact_nom: 'Claire Fictive', telephone: '02 000 00 00', courriel: 'c@fictif.invalid',
    adresse: null, code_postal: null, commune: null, reference_marche: 'Contrat d’entretien des chaudières', is_active: 1, motif_desactivation: null, is_demo: 0,
    corps_metier: [{ id: 62, code: 'chauffage', libelle_fr: 'Chauffage et ventilation', libelle_nl: 'Verwarming en ventilatie', is_active: 1 }], trace: null },
];
const ouvriersListe = [
  { id: 21, prenom: 'Charles', nom: 'Chef', corps_metier: { id: 61, code: 'polyvalent', libelle_fr: 'Polyvalent', libelle_nl: 'Polyvalent', is_active: 1 },
    competences: [{ id: 72, code: 'vca', libelle_fr: 'VCA (sécurité sur chantier)', libelle_nl: 'VCA (veiligheid op de werf)', is_active: 1 }],
    equipes: [], chef_de: [{ id: 4, code: 'BAT', nom_fr: 'Bâtiment', nom_nl: 'Gebouwen' }], peut_diriger: 1 },
  { id: 22, prenom: 'Oscar', nom: 'Ouvrier', corps_metier: { id: 60, code: 'electricite', libelle_fr: 'Électricité', libelle_nl: 'Elektriciteit', is_active: 1 },
    competences: [{ id: 71, code: 'ba4', libelle_fr: 'BA4 : personne avertie (électricité)', libelle_nl: 'BA4: gewaarschuwd persoon (elektriciteit)', is_active: 1 }],
    equipes: [{ id: 4, code: 'BAT', nom_fr: 'Bâtiment', nom_nl: 'Gebouwen' }], chef_de: [], peut_diriger: 0 },
  { id: 24, prenom: 'Paul', nom: 'Propre', corps_metier: null, competences: [], equipes: [{ id: 5, code: 'PROP-WE', nom_fr: 'Propreté du week-end', nom_nl: 'Netheid in het weekend' }],
    chef_de: [], peut_diriger: 0 },
];
// 0.16.0 : services de l'entité AA et chef de service (rôle « Valideur » dans AA).
const servicesListe = [
  { id: 3, entite_id: 1, code: 'SEC', nom_fr: 'Secrétariat', nom_nl: 'Secretariaat', ordre: 10, is_active: 1, motif_desactivation: null, is_demo: 0,
    valideur_id: 5, valideur_prenom: 'Valérie', valideur_nom: 'Chef', suppleant_id: null, suppleant_prenom: null, suppleant_nom: null, suppleant_du: null, suppleant_au: null,
    suppleance_en_cours: 0, nb_membres: 1, created_at: '', updated_at: '' },
  { id: 4, entite_id: 1, code: 'RH', nom_fr: 'Personnel', nom_nl: 'Personeel', ordre: 20, is_active: 0, motif_desactivation: 'Fusionné', is_demo: 0,
    valideur_id: null, valideur_prenom: null, valideur_nom: null, suppleant_id: null, suppleant_prenom: null, suppleant_nom: null, suppleant_du: null, suppleant_au: null,
    suppleance_en_cours: 0, nb_membres: 0, created_at: '', updated_at: '' },
];
const chefs = [
  { id: 5, email: 'chef@exemple.test', first_name: 'Valérie', last_name: 'Chef', user_role: 'agent', entite_id: 1, service_id: 3, is_active: 1, is_demo: 0, is_admin_local: 0, microsoft: 0,
    roles: [{ id: 9, entite_id: 1, role: 'agent', entite_code: 'AA' }, { id: 10, entite_id: 1, role: 'valideur', entite_code: 'AA' }] },
  { id: 6, email: 'sup@exemple.test', first_name: 'Sam', last_name: 'Suppléant', user_role: 'agent', entite_id: 1, service_id: null, is_active: 1, is_demo: 0, is_admin_local: 0, microsoft: 0,
    roles: [{ id: 11, entite_id: 1, role: 'valideur', entite_code: 'AA' }] },
  { id: 8, email: 'autre@exemple.test', first_name: 'Odile', last_name: 'AutreEntite', user_role: 'agent', entite_id: 2, service_id: null, is_active: 1, is_demo: 0, is_admin_local: 0, microsoft: 0,
    roles: [{ id: 12, entite_id: 2, role: 'valideur', entite_code: 'BB' }] },
];
const users = [{ ...user, is_active: 1, is_demo: 1, is_admin_local: 1, microsoft: 1, roles: [{ id: 1, entite_id: 1, role: 'agent', entite_code: 'AA' }, { id: 2, entite_id: 2, role: 'responsable', entite_code: 'BB' }] }];
const valeurs = [
  { id: 1, entite_id: 1, liste: 'type_lieu', code: 'bureau', libelle_fr: 'Bureau', libelle_nl: 'Kantoor', ordre: 10, is_active: 1, motif_desactivation: null, created_at: '2026-10-21 10:00:00', updated_at: '2026-10-21 10:00:00' },
  { id: 2, entite_id: 1, liste: 'type_lieu', code: 'exterieur', libelle_fr: 'Extérieur', libelle_nl: 'Buitenruimte', ordre: 20, is_active: 0, motif_desactivation: 'x', created_at: '2026-10-21 10:00:00', updated_at: '2026-10-21 10:00:00' },
];
const base = { type_id: null, type_code: null, type_libelle_fr: null, type_libelle_nl: null, adresse: null, code_postal: null, commune: null, surface_m2: null, statut: 'en_service', has_photo: 0, photo_at: null, photo_octets: null, is_active: 1, motif_desactivation: null, is_demo: 1, created_at: '2026-10-21 10:00:00', updated_at: '2026-10-21 10:00:00', entite_id: 1 };
const local = { ...base, id: 4, parent_id: 3, nature: 'local', code: 'AA-B1-L02', nom_fr: 'Salle du conseil', nom_nl: 'Raadzaal', type_id: 1, type_code: 'bureau', type_libelle_fr: 'Bureau', type_libelle_nl: 'Kantoor', has_photo: 1, photo_at: '2026-10-21 10:00:00', enfants: [] };
const niveau = { ...base, id: 3, parent_id: 2, nature: 'niveau', code: 'AA-B1-R0', nom_fr: 'Rez-de-chaussée', nom_nl: 'Gelijkvloers', enfants: [local] };
const batiment = { ...base, id: 2, parent_id: 1, nature: 'batiment', code: 'AA-B1', nom_fr: 'Maison fictive', nom_nl: 'Fictief huis', adresse: 'Rue Fictive 1', code_postal: '9999', commune: 'Démoville', statut: 'hors_service', enfants: [niveau] };
const arbre = { racines: [{ ...base, id: 1, parent_id: null, nature: 'site', code: 'AA-S1', nom_fr: 'Site fictif', nom_nl: 'Fictieve site', adresse: 'Rue Fictive 1', enfants: [batiment] }], total: 4 };
const parametres = [
  { cle: 'app.organisation_fr', groupe: 'identite', type: 'texte', requis: true, max: 200, choix: null, libelle_fr: 'Nom du pouvoir local en français', libelle_nl: 'Naam van het lokaal bestuur in het Frans', description_fr: 'Nom officiel.', description_nl: 'Officiële naam.', valeur: 'Commune fictive', defaut: 'Pouvoir local', est_defaut: false, updated_at: '2026-10-22 10:00:00' },
  { cle: 'app.default_lang', groupe: 'affichage', type: 'choix', requis: true, max: null, choix: [{ valeur: 'fr', libelle_fr: 'Français', libelle_nl: 'Frans' }, { valeur: 'nl', libelle_fr: 'Néerlandais', libelle_nl: 'Nederlands' }], libelle_fr: 'Langue par défaut', libelle_nl: 'Standaardtaal', description_fr: 'Langue de connexion.', description_nl: 'Aanmeldtaal.', valeur: 'fr', defaut: 'fr', est_defaut: true, updated_at: null },
];
const pe = (cle: string, groupe: string, type: string, valeur: string, extra: Record<string, unknown> = {}) => ({ entite_id: 1, cle, groupe, type, max: null, min: null, libelle_fr: cle, libelle_nl: cle, description_fr: 'd', description_nl: 'd', valeur, defaut: '', est_defaut: valeur === '', updated_at: null, ...extra });
// 0.14.0 : motifs d'attente de l'entité (une valeur désactivée, non proposée).
const motifsAttente = [
  { id: 41, entite_id: 1, liste: 'motif_attente', code: 'piece', libelle_fr: 'Pièce à commander', libelle_nl: 'Onderdeel te bestellen', ordre: 10, is_active: 1, motif_desactivation: null, created_at: '', updated_at: '' },
  { id: 42, entite_id: 1, liste: 'motif_attente', code: 'acces', libelle_fr: 'Accès impossible', libelle_nl: 'Toegang onmogelijk', ordre: 20, is_active: 1, motif_desactivation: null, created_at: '', updated_at: '' },
  { id: 43, entite_id: 1, liste: 'motif_attente', code: 'demandeur', libelle_fr: 'Réponse du demandeur attendue', libelle_nl: 'Antwoord van de aanvrager verwacht', ordre: 30, is_active: 1, motif_desactivation: null, created_at: '', updated_at: '' },
  { id: 44, entite_id: 1, liste: 'motif_attente', code: 'budget', libelle_fr: 'Budget à obtenir', libelle_nl: 'Budget te verkrijgen', ordre: 40, is_active: 0, motif_desactivation: 'x', created_at: '', updated_at: '' },
];
// 0.14.0 (CYC-04) : libellés des états d'une demande dans l'entité (la GRC reprend le texte du demandeur).
const etat = (code: string, fr: string, nl: string, extra: Record<string, unknown> = {}) => ({ id: code.length, entite_id: 1, code, libelle_fr: fr, libelle_nl: nl, grc_fr: fr, grc_nl: nl,
  updated_at: '2026-11-08 10:00:00', livre_fr: fr, livre_nl: nl, ferme: 0, compte_retard: 1, suspend: 'non', trace: { etat: 'livree', le: null, par: null }, ...extra });
// 0.15.0 (point 4, GES-09) : modèles de réponse de l'entité ; un livré, un désactivé.
const modelesData = [
  { id: 1, entite_id: 1, code: 'precision', titre_fr: 'Précision demandée', titre_nl: 'Verduidelijking gevraagd', texte_fr: 'Bonjour {prenom}, pouvez-vous préciser ?', texte_nl: 'Goedendag {prenom}, kunt u verduidelijken?', ordre: 10, is_active: 1, motif_desactivation: null, created_at: '', updated_at: '2026-11-09 10:00:00', trace: { etat: 'livree', le: null, par: null } },
  { id: 2, entite_id: 1, code: null, titre_fr: 'Ancien modèle', titre_nl: 'Oud model', texte_fr: 'Texte', texte_nl: 'Tekst', ordre: 20, is_active: 0, motif_desactivation: 'Remplacé', created_at: '', updated_at: '2026-11-09 10:00:00', trace: { etat: 'modifiee', le: '2026-11-09T10:00:00Z', par: 'Rita Responsable' } },
];
const etatsDemande = [etat('brouillon', 'Brouillon', 'Ontwerp'), etat('a_qualifier', 'Reçue par le service technique', 'Ontvangen door de technische dienst'),
  etat('en_attente', 'En attente d’un élément', 'In wacht', { livre_fr: 'En attente', suspend: 'selon_motif', trace: { etat: 'modifiee', le: '2026-11-08T09:00:00Z', par: 'Rita Responsable' } })];
const parametresEntite = [
  pe('contact.nom_fr', 'contact', 'texte', 'Service technique fictif', { libelle_fr: 'Nom du service en français' }),
  pe('contact.nom_nl', 'contact', 'texte', 'Fictieve technische dienst'),
  pe('contact.telephone', 'contact', 'telephone', '02 000 00 00', { libelle_fr: 'Téléphone du service' }),
  pe('contact.courriel', 'contact', 'courriel', ''),
  pe('urgence.telephone', 'urgence', 'telephone', ''),
  // 0.7.0 (RGPD-10) : contact du DPO et mention complète en texte long, avec ses variables.
  pe('rgpd.dpo_contact', 'rgpd', 'texte', 'dpo@exemple.test', { max: 300, libelle_fr: 'Contact du DPO' }),
  pe('rgpd.mention_fr', 'rgpd', 'texte_long', '{entite} traite vos données. {dpo}', { max: 3000, variables: ['entite', 'dpo'], est_defaut: true, libelle_fr: 'Mention complète, en français' }),
  pe('demandes.delai_reouverture_jours', 'demandes', 'entier', '7', { min: 0, max: 90, defaut: '7', est_defaut: true, libelle_fr: 'Délai de réouverture après clôture (jours)' }),
  // 0.14.0 (DV-119) : motifs d'attente qui suspendent le délai, cases à cocher d'une liste de l'entité.
  pe('demandes.attente_suspend', 'demandes', 'codes_liste', 'acces,demandeur', { liste: 'motif_attente', defaut: 'acces,demandeur', est_defaut: true, libelle_fr: "Motifs d'attente qui suspendent le délai" }),
];
const journal = [
  { id: 2, created_at: '2026-10-22 08:30:00', action: 'lieu.update', entity_type: 'lieu', entity_id: 4, channel: 'mcp', details: { nom_fr: 'Salle du conseil' }, entite_id: 1, entite_code: 'AA', user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin' },
  { id: 4, created_at: '2026-10-22 09:30:00', action: 'demande.create', entity_type: 'demande', entity_id: 7, channel: 'api', details: { numero: 'AA-DI-2026-00007', lieu_id: 12, categorie_id: 9, priorite: 'P3', danger: 0, beneficiaire_id: null, beneficiaire_texte: 1, date_souhaitee: null, reponses: 0 }, entite_id: 1, entite_code: 'AA', user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin',
    noms: { lieu_id: { type: 'lieu', id: 12, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Kantoor 12', entite_code: 'AA' }, categorie_id: { type: 'categorie', id: 9, code: 'eclairage', nom_fr: 'Éclairage', nom_nl: 'Verlichting', entite_code: 'AA' } } },
  { id: 3, created_at: '2026-10-22 09:00:00', action: 'lieu.update', entity_type: 'lieu', entity_id: 5, channel: 'api', details: { code: 'MC-A', avant: { parent_id: 2 }, apres: { parent_id: 404 } }, entite_id: 2, entite_code: 'BB', user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin',
    noms: { 'avant.parent_id': { type: 'lieu', id: 2, code: 'MC', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis', entite_code: 'AA' }, 'apres.parent_id': { type: 'lieu', id: 404, introuvable: 1 } } },
  { id: 5, created_at: '2026-10-22 10:00:00', action: 'demande.qualifier', entity_type: 'demande', entity_id: 7, channel: 'api', details: { numero: 'AA-DI-2026-00007', premiere: 1, priorite: 'P2', priorite_confirmee: 0, avant: { etat: 'a_qualifier', priorite: 'P3' }, apres: { etat: 'qualifiee', priorite: 'P2' } }, entite_id: 1, entite_code: 'AA', user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin' },
  { id: 6, created_at: '2026-10-22 10:30:00', action: 'demande.qualifier', entity_type: 'demande', entity_id: 8, channel: 'mcp', details: { numero: 'AA-DI-2026-00008', avant: { etat: 'etat_futur' }, apres: { etat: 'qualifiee' } }, entite_id: 1, entite_code: 'AA', user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin' },
  { id: 1, created_at: '2026-10-22 08:00:00', action: 'action.nouvelle', entity_type: null, entity_id: null, channel: 'cli', details: null, entite_id: null, entite_code: null, user_id: null, user_email: null, user_first_name: null, user_last_name: null },
];
const mod = (code: string, extra: Record<string, unknown>) => ({ code, libelle_fr: code, libelle_nl: code, description_fr: 'd', description_nl: 'd', ferme_fr: null, ferme_nl: null, noyau: false, disponible: false, etape: 22, actif: true, updated_at: null, ...extra });
const modulesActifs = [
  mod('demandes', { libelle_fr: "Demandes d'intervention", noyau: true, etape: 5 }),
  mod('patrimoine', { libelle_fr: 'Patrimoine', libelle_nl: 'Patrimonium', disponible: true, etape: 2, ferme_fr: 'Ferme la gestion des lieux.', ferme_nl: 'Sluit het beheer.' }),
  mod('vehicules', { libelle_fr: 'Véhicules', libelle_nl: 'Voertuigen', etape: 35 }),
];
let modules = modulesActifs;
const cat = (id: number, parent: number | null, code: string, fr: string, nl: string, icone: string, prio: string, extra: Record<string, unknown> = {}) => ({
  id, entite_id: 1, parent_id: parent, niveau: parent ? 'nature' : 'domaine', code, libelle_fr: fr, libelle_nl: nl, icone,
  priorite_defaut: parent ? null : prio, validation: parent ? null : 0, delai_fin_jours: null, ordre: 10,
  priorite_effective: prio, validation_effective: 0, delai_fin_jours_effectif: null,
  parent_code: parent ? 'plomberie' : null, parent_libelle_fr: parent ? 'Plomberie et sanitaires' : null, parent_libelle_nl: parent ? 'Sanitair en loodgieterij' : null,
  is_active: 1, motif_desactivation: null, created_at: '2026-10-22 10:00:00', updated_at: '2026-10-22 10:00:00',
  trace: { etat: 'livree', le: null, par: null }, ...extra,
});
// Questions de la catégorie (0.7.0, DEM-05) : une question « oui ou non » du domaine Plomberie, reprise par sa nature.
const qEau = { id: 501, categorie_id: 10, question_fr: "Y a-t-il de l'eau au sol ?", question_nl: 'Ligt er water op de vloer?', type: 'oui_non', obligatoire: 0,
  reponses: [{ valeur: 'oui', fr: 'Oui', nl: 'Ja' }, { valeur: 'non', fr: 'Non', nl: 'Nee' }] };
const questionsPlomberie = [{ ...qEau, entite_id: 1, categorie_code: 'plomberie', categorie_niveau: 'domaine', ordre: 10, is_active: 1, motif_desactivation: null, trace: { etat: 'livree', le: null, par: null } },
  { ...qEau, id: 502, question_fr: 'Ancienne question', question_nl: 'Oude vraag', entite_id: 1, categorie_code: 'plomberie', categorie_niveau: 'domaine', ordre: 20, is_active: 0, motif_desactivation: 'x', trace: { etat: 'livree', le: null, par: null } }];
const arbreCategories = { total: 4, domaines: [
  { ...cat(10, null, 'plomberie', 'Plomberie et sanitaires', 'Sanitair en loodgieterij', 'outil', 'P3', { trace: { etat: 'modifiee', le: '2026-10-23T08:15:00Z', par: 'Ada Admin' }, questions: [{ ...qEau, origine: 'domaine' }] }),
    natures: [cat(11, 10, 'fuite_eau', "Fuite d'eau", 'Waterlek', 'alerte', 'P2', { priorite_defaut: 'P2', questions: [{ ...qEau, origine: 'domaine' }] })] },
  { ...cat(20, null, 'amenagement', 'Aménagement, déménagement, achat', 'Inrichting, verhuis, aankoop', 'amenagement', 'P4', { validation: 1, validation_effective: 1 }), natures: [cat(21, 20, 'demenagement', 'Déménagement de bureau', 'Verhuis van een kantoor', 'deplacement', 'P4', { validation_effective: 1 })] },
] };
const prio = (code: string, fr: string, nl: string, couleur: string, unite: string, prise: number, fin: number | null) => {
  const d = { libelle_fr: fr, libelle_nl: nl, description_fr: 'd', description_nl: 'd', couleur, unite, prise_en_charge: prise, fin };
  return { id: Number(code[1]), entite_id: 1, code, ...d, updated_at: '2026-10-22 10:00:00', defaut: d, est_defaut: true,
    trace: code === 'P2' ? { etat: 'retablie', le: '2026-12-01T23:05:00Z', par: 'Ada Admin' } : { etat: 'livree', le: null, par: null } };
};
const priorites = [prio('P1', 'Sécurité', 'Veiligheid', 'red', 'heures_calendaires', 1, 4), prio('P2', 'Urgente', 'Dringend', 'orange', 'jours_ouvrables', 1, 2),
  prio('P3', 'Normale', 'Normaal', 'blue', 'jours_ouvrables', 2, 10), prio('P4', 'Planifiable', 'Planbaar', 'green', 'jours_ouvrables', 5, null)];
const horaires = [1, 2, 3, 4, 5, 6, 7].map((jour) => {
  const h = jour < 5 ? ['07:45', '16:15'] : jour === 5 ? ['07:45', '12:00'] : [null, null];
  return { id: jour, entite_id: 1, jour, debut: h[0], fin: h[1], ouvre: h[0] ? 1 : 0, defaut: { debut: h[0], fin: h[1] }, est_defaut: true,
    trace: jour === 1 ? { etat: 'modifiee', le: '2026-10-23T08:15:00Z', par: 'Ada Admin' } : { etat: 'livree', le: null, par: null } };
});
const joursNonOuvres = [
  { id: 1, entite_id: 1, nature: 'conge', mois_jour: '11-15', date_debut: null, date_fin: null, libelle_fr: 'Fête du Roi', libelle_nl: 'Koningsdag', is_active: 1, motif_desactivation: null, created_at: '2026-10-22 10:00:00', updated_at: '2026-10-22 10:00:00', trace: { etat: 'modifiee', le: '2026-10-22T10:00:00Z', par: null } },
  { id: 2, entite_id: 1, nature: 'fermeture', mois_jour: null, date_debut: '2026-12-28', date_fin: '2026-12-31', libelle_fr: 'Fin d’année', libelle_nl: 'Eindejaar', is_active: 0, motif_desactivation: 'x', created_at: '2026-10-22 10:00:00', updated_at: '2026-10-22 10:00:00', trace: { etat: 'creee', le: '2026-10-22T10:00:00Z', par: 'Ada Admin' } },
];
const feries = [{ date: '2026-11-11', code: 'armistice', libelle_fr: 'Armistice', libelle_nl: 'Wapenstilstand' }];
const echeance = {
  priorite: 'P3', unite: 'jours_ouvrables', recu_le: { utc: '2026-10-23T11:00:00.000Z', local: '2026-10-23 13:00' },
  debut_decompte: { utc: '2026-10-26T06:45:00.000Z', local: '2026-10-26 07:45' }, delai_prise_en_charge: 2,
  prise_en_charge_le: { utc: '2026-10-28T06:45:00.000Z', local: '2026-10-28 07:45' }, delai_fin: 10, delai_fin_source: 'priorite',
  fin_le: { utc: '2026-11-10T06:45:00.000Z', local: '2026-11-10 07:45' }, date_convenue: false, categorie: null,
};
const membres = [{ id: 1, first_name: 'Ada', last_name: 'Admin', email: 'a@exemple.test', roles: ['agent', 'gestionnaire'] }];

const setEntite = vi.fn(async () => {});
const login = vi.fn(async (_e: string, _p: string) => {});
const nouveautesLues = vi.fn(async () => {});
const savePreferences = vi.fn(async (_p: Record<string, unknown>) => {});
const notesVersion = [
  { version: '0.3.0', date: '2026-10-22', lignes: [{ fr: 'Nouveauté fictive A', nl: 'Fictieve nieuwigheid A' }] },
  { version: '0.2.0', date: '2026-10-21', lignes: [{ fr: 'Nouveauté fictive B', nl: 'Fictieve nieuwigheid B' }] },
];
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user, loading: false, isAdmin: true, login, logout: async () => {}, refresh: async () => {}, savePreferences,
    setEntite, nouveautesLues, entite: (user.entites as { roles: string[] }[])[0], roles: (user.entites as { roles: string[] }[])[0].roles,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const page = (data: unknown[]) => ({ data, meta: { envelope: 1 }, pagination: { total: data.length, limit: 200, offset: 0 } });
// Tickets (0.11.0) : une question métier de l'entité AA, à traiter par la personne connectée.
const ticketsListe = [{ id: 7, reference: 'TCK-2026-00007', type: 'question', title: 'Comment changer la catégorie ?', priority: 'P3', status: 'new', queue: 'business', overdue: 0, updated_at: '2026-11-05 10:00:00', requester_name: 'Prénom Nom', entite_id: 1 }];
const ticketBase = {
  id: 7, reference: 'TCK-2026-00007', type: 'question', title: 'Comment changer la catégorie ?', description: 'Je qualifiais une demande', expected: null, actual: null,
  queue: 'business', priority: 'P3', status: 'new', screen: '/demandes-entite', context: { path: '/demandes-entite', version: '0.11.0' }, entite_id: 1,
  has_screenshot: false, messages: [{ id: 1, kind: 'event', body: 'created', is_internal: 0, created_at: '2026-11-05 10:00:00', author_name: 'Prénom Nom' }],
  can_handle: true, can_reopen: false, requester_id: 99, resolution: null, created_at: '2026-11-05 10:00:00',
};
let ticketDetail: Record<string, unknown> = { ...ticketBase };
// FAQ locale (0.12.0) : une question commune générale et une question de l'entité AA rattachée à l'écran Tickets.
const faqLocale = [
  { id: 1, entite_id: null, entite_code: null, topic_id: null, question_fr: 'Qui contacter le week-end ?', question_nl: 'Wie contacteren in het weekend?', answer_fr: 'Le numéro d’urgence de votre entité.', answer_nl: 'Het noodnummer van uw entiteit.', is_active: 1, motif_desactivation: null, can_manage: true, source_ticket_reference: null },
  { id: 2, entite_id: 1, entite_code: 'AA', topic_id: 'tickets', question_fr: 'Où voir la réponse à ma question ?', question_nl: 'Waar zie ik het antwoord op mijn vraag?', answer_fr: 'Dans le fil du ticket.', answer_nl: 'In de berichten van het ticket.', is_active: 1, motif_desactivation: null, can_manage: true, source_ticket_reference: 'TCK-2026-00001' },
];
// Notifications de la cloche (0.17.0, étape 13) : deux non lues dans l'entité active, une lue ; une non lue ailleurs.
const notif = (id: number, numero: string, lue: 0 | 1, extra: Record<string, unknown> = {}) => ({ id, entite_id: 1, evenement: 'demande.recue', variante: 'defaut', objet: 'demande', objet_id: id,
  numero, lien: `/demandes?demande=${id}`, lue, lue_le: lue ? '2026-11-16 10:00:00' : null, created_at: '2026-11-16 09:00:00', libelle_fr: 'Accusé de réception d’une demande', libelle_nl: 'Ontvangstbevestiging van een aanvraag',
  texte_fr: `Votre demande ${numero} est bien reçue par le service technique.`, texte_nl: `Uw aanvraag ${numero} is goed ontvangen door de technische dienst.`, ...extra });
const notifsData = [notif(12, 'AA-DI-2026-00012', 0), notif(11, 'AA-DI-2026-00011', 0, { variante: 'beneficiaire', texte_fr: 'Une demande faite pour vous est enregistrée : AA-DI-2026-00011.', texte_nl: 'Een aanvraag voor u is geregistreerd: AA-DI-2026-00011.' }), notif(10, 'AA-DI-2026-00010', 1)];
let compteurNotifs = { non_lues: 2, autres_entites: 1 };
// Courriel (0.17.0, point 2) : réglages en mode test, un courriel retenu, un essai qui répond selon essaiReponse.
const courrielBase = { mode: 'test', host: '', port: 587, securite: 'starttls', user: '', password_set: false, from: '', from_name: '', public_url: '', adresse_liens: null, file: { en_attente: 0, echec: 0, test: 1 }, enregistre: null };
let courrielSettings: Record<string, unknown> = { ...courrielBase };
const courrielRetenu = { id: 4, destinataire: 'agent@exemple.test', langue: 'fr', evenement: 'essai', numero: null, sujet: 'Courriel d’essai de GMAO', mode: 'test', etat: 'test', essais: 0, erreur: null, envoye_le: null, created_at: '2026-11-16 10:00:00' };
// Modèles de courriel (0.17.0, point 3) : un livré, un modifié ; PUT répond selon modeleReponse.
const modeleC = (code: string, fr: string, livre: 0 | 1) => ({ code, libelle_fr: fr, libelle_nl: `${fr} (nl)`, sujet_fr: 'Demande {numero} reçue', sujet_nl: 'Aanvraag {numero} ontvangen',
  corps_fr: 'Votre demande {numero} est reçue.\n{lien}', corps_nl: 'Uw aanvraag {numero} is ontvangen.\n{lien}', texte_livre: livre,
  variables: ['numero', 'lieu', 'etat', 'delai', 'lien', 'entite', 'application'], trace: livre ? { etat: 'livree', le: null, par: null } : { etat: 'modifiee', le: '2026-11-16T10:00:00Z', par: 'Ada Admin' } });
const modelesC = [modeleC('demande.recue', 'Accusé de réception d’une demande', 1), modeleC('demande.retard', 'Demande en retard', 0)];
let modeleReponse: { status: number; json: Record<string, unknown> } | null = null;
let essaiReponse: Record<string, unknown> = { id: 5, mode: 'test', resultat: 'retenu', erreur: null, destinataire: 'a@exemple.test' };
const dernierDialogue = () => { const d = screen.getAllByRole('dialog'); return d[d.length - 1]; };
// Connexion Microsoft (0.10.0) : mode local par défaut ; les tests de la section 8.6 le changent.
let authConfig: Record<string, unknown> = { mode: 'local', microsoft: false, installed: true };
const authSettings = { mode: 'sso_optional', tenant: 'locataire-fictif', client_id: 'application-fictive', public_url: 'https://gmao.exemple.test', domains: 'exemple.test', secret_set: true, redirect_uri: 'https://gmao.exemple.test/api/auth/callback', enregistre: { le: '2026-11-05T11:24:00Z', par: 'Ada Admin' } };
beforeEach(() => {
  modules = modulesActifs;
  compteurNotifs = { non_lues: 2, autres_entites: 1 };
  courrielSettings = { ...courrielBase };
  modeleReponse = null;
  essaiReponse = { id: 5, mode: 'test', resultat: 'retenu', erreur: null, destinataire: 'a@exemple.test' };
  authConfig = { mode: 'local', microsoft: false, installed: true };
  ticketDetail = { ...ticketBase };
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => (modeleReponse && url.startsWith('/api/modeles-courriel/') && init?.method === 'PUT'
    ? { ok: modeleReponse.status < 300, status: modeleReponse.status, statusText: 'X', json: async () => modeleReponse!.json } : {
    ok: true, status: 200, statusText: 'OK',
    json: async () => (url.includes('/membres') ? { data: membres, meta: { envelope: 1 } }
      // Tickets (0.11.0) : compteurs, fiche, liste ; un transfert (PUT) vers une file non traitée rend la confirmation seule.
      : /^\/api\/modeles-courriel\/[a-z.]+\/apercu$/.test(url) ? { data: { langue: JSON.parse(String(init?.body)).langue, sujet: 'Aanvraag AC-DI-2026-00042 ontvangen', corps: 'Uw aanvraag AC-DI-2026-00042 is ontvangen.\n\n—\nAutomatische e-mail van GMAO: antwoord er niet op.' }, meta: { envelope: 1 } }
      : /^\/api\/modeles-courriel\/[a-z.]+\/retablir$/.test(url) ? { data: { ...modelesC[1], texte_livre: 1, trace: { etat: 'retablie', le: '2026-11-16T11:00:00Z', par: 'Ada Admin' } }, meta: { envelope: 1 } }
      : /^\/api\/modeles-courriel\/[a-z.]+$/.test(url) ? { data: { ...modelesC[0], ...(init?.body ? JSON.parse(String(init.body)) : {}), texte_livre: 0 }, meta: { envelope: 1 } }
      : url.startsWith('/api/modeles-courriel') ? { data: modelesC, meta: { envelope: 1, variables: modelesC[0].variables } }
      : url === '/api/settings/courriel/essai' ? { data: essaiReponse, meta: { envelope: 1 } }
      : url.startsWith('/api/settings/courriel') ? { data: init?.method === 'PUT' ? { ...courrielSettings, ...JSON.parse(String(init.body)) } : courrielSettings, meta: { envelope: 1 } }
      : /^\/api\/courriels\/\d+$/.test(url) ? { data: { ...courrielRetenu, corps: 'Bonjour,\n\nCe courriel confirme que GMAO peut envoyer des courriels.' }, meta: { envelope: 1 } }
      : url.startsWith('/api/courriels') ? { ...page([courrielRetenu]), meta: { envelope: 1, mode: 'test' } }
      : url.startsWith('/api/notifications/compteur') ? { data: compteurNotifs, meta: { envelope: 1 } }
      : url === '/api/notifications/lues' ? { data: { marquees: 2, non_lues: 0, autres_entites: compteurNotifs.autres_entites }, meta: { envelope: 1 } }
      : /^\/api\/notifications\/\d+\/lue$/.test(url) ? { data: { ...notifsData[0], lue: 1 }, meta: { envelope: 1 } }
      : url.startsWith('/api/notifications') ? { ...page(url.includes('non_lues=1') ? notifsData.filter((n) => !n.lue) : notifsData), meta: { envelope: 1, ...compteurNotifs } }
      : url.startsWith('/api/tickets/stats') ? { data: { open: 2, overdue: 1, unassigned: 1, resolved_30d: 3, by_priority: [], by_type: [], by_screen: [] }, meta: { envelope: 1 } }
      : /^\/api\/tickets\/\d+$/.test(url) && init?.method === 'PUT' ? { data: { id: 7, reference: 'TCK-2026-00007', queue: 'it', transferred: true }, meta: { envelope: 1 } }
      : /^\/api\/tickets\/\d+$/.test(url) ? { data: ticketDetail, meta: { envelope: 1 } }
      : /^\/api\/tickets\/\d+\/faq$/.test(url) ? { data: { ...faqLocale[1], id: 3 }, meta: { envelope: 1 } }
      : url.startsWith('/api/faq') && init?.method && init.method !== 'GET' ? { data: faqLocale[0], meta: { envelope: 1 } }
      : url.startsWith('/api/faq') ? page(url.includes('topic_id=tickets') ? [faqLocale[1]] : faqLocale)
      : url.startsWith('/api/tickets') && init?.method === 'POST' ? { data: { id: 8, reference: 'TCK-2026-00008' }, meta: { envelope: 1 } }
      : url.startsWith('/api/tickets') ? page(ticketsListe)
      : url.startsWith('/api/lieux/arbre') ? { data: arbre, meta: { envelope: 1 } }
      : url.startsWith('/api/listes-valeurs') ? page([...valeurs, ...motifsAttente].filter((v) => (url.includes('liste=') ? url.includes(`liste=${v.liste}`) : v.liste === 'type_lieu')))
      : url.startsWith('/api/categories/arbre') ? { data: arbreCategories, meta: { envelope: 1 } }
      : /^\/api\/categories\/10\/questions/.test(url) ? { data: questionsPlomberie, meta: { envelope: 1, max_actives: 10 } }
      : /^\/api\/categories\/\d+\/questions/.test(url) ? { data: [], meta: { envelope: 1, max_actives: 10 } }
      : url.startsWith('/api/modeles-reponse') ? { data: init?.method === 'POST' ? modelesData[0] : modelesData, meta: { envelope: 1, variables: ['numero', 'lieu', 'etat', 'prenom'] }, pagination: { total: modelesData.length, limit: 200, offset: 0 } }
      : url.startsWith('/api/etats-demande') ? { data: init?.method === 'PUT' ? etatsDemande[1] : etatsDemande, meta: { envelope: 1 } }
      : url.startsWith('/api/priorites') ? page(priorites)
      : url.startsWith('/api/horaires') ? page(horaires)
      : url.startsWith('/api/jours-non-ouvres') ? page(joursNonOuvres)
      : url.startsWith('/api/jours-feries') ? page(feries)
      : url.startsWith('/api/demandes') ? page([])
      : url.startsWith('/api/echeances') ? { data: echeance, meta: { envelope: 1 } }
      : url.startsWith('/api/auth/config') ? { data: authConfig, meta: { envelope: 1 } }
      : url.startsWith('/api/settings/auth') ? { data: authSettings, meta: { envelope: 1 } }
      : url.startsWith('/api/parametres-entite') ? page(parametresEntite)
      : url.startsWith('/api/parametres') ? page(parametres)
      : url.startsWith('/api/modules') ? page(modules)
      : url.startsWith('/api/notes-version') ? page(notesVersion)
      : url.startsWith('/api/audit') ? { ...page(journal), meta: { envelope: 1, actions: ['action.nouvelle', 'lieu.update'] } }
      : url.startsWith('/api/entites') ? page(entites)
      : url.startsWith('/api/services') ? page(servicesListe)
      : url.startsWith('/api/equipes') && init?.method && init.method !== 'GET' ? { data: equipesListe[0], meta: { envelope: 1 } }
      : url.startsWith('/api/equipes') ? page(equipesListe)
      // 0.21.0 (point 3, PLA-03) : planning et déplacement d'une tâche.
      : url.startsWith('/api/planning') ? { data: planningData, meta: { envelope: 1 } }
      : url.match(/^\/api\/taches\/\d+\/affectation/) ? { data: { id: 1, demande_passage_auto: null, conflits: conflitsReponse }, meta: { envelope: 1 } }
      // 0.21.0 (point 2, PLA-04) : indisponibilités d'un ouvrier.
      : url.startsWith('/api/indisponibilites') && init?.method === 'POST' ? { data: { id: 92, ...JSON.parse(String(init.body)) }, meta: { envelope: 1 } }
      : url.startsWith('/api/indisponibilites') && init?.method === 'DELETE' ? { data: { id: 91, supprimee: 1 }, meta: { envelope: 1 } }
      : url.startsWith('/api/indisponibilites') ? page(indisposListe)
      : url.startsWith('/api/ouvriers') && init?.method === 'PUT' ? { data: ouvriersListe[2], meta: { envelope: 1 } }
      : url.startsWith('/api/ouvriers') ? page(ouvriersListe)
      : url.startsWith('/api/prestataires') && init?.method && init.method !== 'GET' ? { data: prestatairesListe[0], meta: { envelope: 1 } }
      : url.startsWith('/api/prestataires') ? page(prestatairesListe)
      : url.startsWith('/api/users') ? page(users)
      : url.startsWith('/api/roles') ? page(roles)
      : { data: {}, meta: { envelope: 1 } }),
  })));
});

import HomePage from '../pages/HomePage';
import EntitesPage from '../pages/EntitesPage';
import UsersPage from '../pages/UsersPage';
import HelpPage from '../pages/HelpPage';
import AccessibilityPage from '../pages/AccessibilityPage';
import LoginPage, { autoSsoAllowed, ssoStartUrl } from '../pages/LoginPage';
import { redirection, safeNext } from '../connexion';
import { AfterLogin, ToLogin } from '../App';
import PatrimoinePage from '../pages/PatrimoinePage';
import ListesValeursPage from '../pages/ListesValeursPage';
import AppLayout from '../components/AppLayout';
import ParametresPage from '../pages/ParametresPage';
import ReglagesEntitePage from '../pages/ReglagesEntitePage';
import JournalPage from '../pages/JournalPage';
import ReferentielPage from '../pages/ReferentielPage';
import TicketsPage from '../pages/TicketsPage';
import ServicesPage from '../pages/ServicesPage';
import EquipesPage from '../pages/EquipesPage';
import PlanningPage from '../pages/PlanningPage';
import { reloadModules } from '../moduleMap';
import { sansDoublons } from '../components/RechercheGlobale';
import { adresseExport } from '../components/BoutonExport';
import { accesEcran, answer } from '../components/Chatbot';

const PAGES: [string, React.ComponentType][] = [
  ['Home', HomePage], ['Entites', EntitesPage], ['Users', UsersPage], ['Help', HelpPage], ['Accessibility', AccessibilityPage], ['Login', LoginPage],
  ['Patrimoine', PatrimoinePage], ['ListesValeurs', ListesValeursPage], ['Parametres', ParametresPage], ['ReglagesEntite', ReglagesEntitePage], ['Journal', JournalPage], ['Referentiel', ReferentielPage],
  ['Tickets', TicketsPage], ['Services', ServicesPage], ['Equipes', EquipesPage],
];

function wrap(C: React.ComponentType, lang: 'fr' | 'nl', settings = FALLBACK_SETTINGS, entries: string[] = ['/']) {
  return (
    <SettingsProvider value={{ settings, reload: async () => {} }}>
      <I18nProvider defaultLang={lang}><MemoryRouter initialEntries={entries}><C /></MemoryRouter></I18nProvider>
    </SettingsProvider>
  );
}

describe('écrans', () => {
  for (const lang of ['fr', 'nl'] as const) {
    for (const [name, C] of PAGES) {
      it(`${name} (${lang}) s'affiche sans violation axe-core`, async () => {
        const { container } = render(wrap(C, lang));
        await waitFor(() => expect(container.querySelector('h1')).toBeTruthy());
        const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
        expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.map((n) => n.html.slice(0, 200)).join(" | ")}`)).toEqual([]);
      });
    }
  }

  it('Services : choix de l\u2019entité vide pendant le chargement, sans violation axe-core (CI de la 0.17.0)', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = ((u: RequestInfo | URL, i?: RequestInit) => (String(u).startsWith('/api/entites') ? new Promise<Response>(() => {}) : orig(u, i))) as typeof fetch;
    try {
      const { container } = render(wrap(ServicesPage, 'fr'));
      await waitFor(() => expect(container.querySelector('h1')).toBeTruthy());
      expect(container.querySelector('.ant-radio-group')?.children.length).toBe(0);
      const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('l’accueil montre l’entité active, les rôles et les personnes de l’entité', async () => {
    render(wrap(HomePage, 'fr'));
    expect(await screen.findByText('Administration fictive')).toBeInTheDocument();
    expect(await screen.findAllByText('Gestionnaire technique')).not.toHaveLength(0);
    expect(await screen.findByText('a@exemple.test')).toBeInTheDocument();
  });

  it('en néerlandais, l’accueil nomme l’entité et les rôles en néerlandais', async () => {
    render(wrap(HomePage, 'nl'));
    expect(await screen.findByText('Fictief bestuur')).toBeInTheDocument();
    expect(await screen.findAllByText('Technisch beheerder')).not.toHaveLength(0);
  });

  it('la liste des entités affiche les entités reçues de l’API', async () => {
    render(wrap(EntitesPage, 'fr'));
    expect(await screen.findByText('Centre fictif')).toBeInTheDocument();
  });

  it('la liste des comptes montre les rôles par entité et le marqueur de démonstration', async () => {
    render(wrap(UsersPage, 'fr'));
    expect(await screen.findByText('BB · Responsable du service technique')).toBeInTheDocument();
    expect(screen.getByText('Démonstration')).toBeInTheDocument();
  });

  it('le patrimoine montre l’arbre de l’entité et les actions du gestionnaire', async () => {
    render(wrap(PatrimoinePage, 'fr'));
    expect(await screen.findByText('Site fictif', { exact: false })).toBeInTheDocument();
    expect(await screen.findByText('Maison fictive', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Hors service')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Créer un site/ })).toBeInTheDocument();
  });

  it('la fiche d’un lieu choisi dans l’adresse montre sa photo, son type et son chemin, en néerlandais', async () => {
    const { container } = render(wrap(PatrimoinePage, 'nl', FALLBACK_SETTINGS, ['/patrimoine?lieu=4']));
    expect(await screen.findByAltText('Foto van de plaats AA-B1-L02')).toHaveAttribute('src', expect.stringMatching(/^\/api\/lieux\/4\/photo\?v=/));
    expect(screen.getByText('Kantoor', { selector: '.ant-tag' })).toBeInTheDocument();
    expect(screen.getByText('AA-B1-R0', { selector: 'a' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /De foto vervangen/ })).toBeInTheDocument();
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.map((n) => n.html.slice(0, 200)).join(" | ")}`)).toEqual([]);
  });

  it('les listes de valeurs montrent les libellés et le statut', async () => {
    render(wrap(ListesValeursPage, 'fr'));
    expect(await screen.findByText('Bureau')).toBeInTheDocument();
    expect(screen.getByText('Extérieur')).toBeInTheDocument();
    expect(screen.getByText('Désactivée')).toBeInTheDocument();
  });

  it('0.14.0 et 0.19.0 : six listes au choix, en boutons (dont corps de métier et compétences)', async () => {
    render(wrap(ListesValeursPage, 'fr'));
    await screen.findByText('Bureau');
    for (const l of ['Types de lieux', "Motifs d'attente", 'Motifs de refus', 'Causes de panne', 'Corps de métier', 'Compétences']) expect(screen.getByRole('radio', { name: l })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Types de lieux' })).toBeChecked();
  });

  it('le menu propose le patrimoine au gestionnaire, mais pas les listes de valeurs réservées au responsable', async () => {
    render(wrap(AppLayout, 'fr'));
    // jsdom n'a pas de largeur d'écran : la mise en page est celle du téléphone, le menu s'ouvre par son bouton.
    fireEvent.click(await screen.findByRole('button', { name: 'Ouvrir ou fermer le menu' }));
    expect(await screen.findByText('Patrimoine')).toBeInTheDocument();
    expect(screen.queryByText('Listes de valeurs')).toBeNull();
    expect(screen.queryByText('Catégories et délais')).toBeNull();
  });

  it('0.14.0 (CYC-04) : onglet « États des demandes », états en usage seulement, texte modifié signalé, enregistrement', async () => {
    render(wrap(ReferentielPage, 'fr', FALLBACK_SETTINGS, ['/referentiel?onglet=etats']));
    expect(await screen.findByRole('tab', { name: 'États des demandes' })).toHaveAttribute('aria-selected', 'true');
    expect((await screen.findAllByDisplayValue('En attente d’un élément')).length).toBe(2);
    expect(screen.queryByText('Brouillon')).toBeNull();
    expect(screen.getByText(/le délai peut être suspendu selon le motif/)).toBeInTheDocument();
    expect(screen.getByText(/Rita Responsable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revenir aux libellés livrés' })).toBeInTheDocument();
    const champ = screen.getAllByLabelText('Texte du demandeur en français')[0] as HTMLInputElement;
    expect(champ).toHaveValue('Reçue par le service technique');
    fireEvent.change(champ, { target: { value: 'Bien reçue' } });
    fireEvent.click(within(champ.closest('.ant-card') as HTMLElement).getByRole('button', { name: 'Enregistrer' }));
    const appels = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
    await waitFor(() => expect(appels.some(([u, i]) => u === '/api/etats-demande/a_qualifier' && i?.method === 'PUT')).toBe(true));
    const [, init] = appels.find(([u, i]) => u === '/api/etats-demande/a_qualifier' && i?.method === 'PUT')!;
    expect(JSON.parse(String(init!.body))).toMatchObject({ libelle_fr: 'Bien reçue', libelle_nl: 'Ontvangen door de technische dienst' });
  });

  it('0.15.0 (GES-09) : onglet « Modèles de réponse » en lecture pour le gestionnaire ; variables rappelées', async () => {
    render(wrap(ReferentielPage, 'fr', FALLBACK_SETTINGS, ['/referentiel?onglet=modeles']));
    expect(await screen.findByRole('tab', { name: 'Modèles de réponse' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Précision demandée')).toBeInTheDocument();
    expect(screen.getByText('Désactivée')).toBeInTheDocument();
    expect(screen.getAllByText('{prenom}').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Nouveau modèle/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Précision demandée' }));
    const champ = await screen.findByLabelText('Texte en néerlandais');
    expect(champ).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Désactiver ce modèle' })).toBeNull();
  });

  for (const lang of ['fr', 'nl'] as const) {
    it(`0.15.0 (GES-09) : onglet et fiche d’un modèle (${lang}) sans violation axe-core`, async () => {
      const { container } = render(wrap(ReferentielPage, lang, FALLBACK_SETTINGS, ['/referentiel?onglet=modeles']));
      const titre = await screen.findByRole('button', { name: lang === 'nl' ? 'Verduidelijking gevraagd' : 'Précision demandée' });
      const regles = { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } };
      expect((await axe.run(container, regles)).violations.map((v) => v.id)).toEqual([]);
      fireEvent.click(titre);
      const fiche = await screen.findByRole('dialog');
      await within(fiche).findByLabelText(translations['modeles.texte_nl'][lang]);
      expect((await axe.run(fiche, regles)).violations.map((v) => `${v.id} ${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')}`)).toEqual([]);
    }, 30000);
  }

  it('0.15.0 (GES-09) : le responsable ajoute un modèle en FR et en NL', async () => {
    const avant = user.entites;
    (roles[2].permissions as string[]).push('parametres:gerer');
    user.entites = [{ ...entites[0], roles: ['agent', 'responsable'] }];
    try {
      render(wrap(ReferentielPage, 'fr', FALLBACK_SETTINGS, ['/referentiel?onglet=modeles']));
      fireEvent.click(await screen.findByRole('button', { name: /Nouveau modèle/ }));
      const d = await screen.findByRole('dialog');
      fireEvent.change(within(d).getByLabelText('Titre en français'), { target: { value: 'Pièce commandée' } });
      fireEvent.change(within(d).getByLabelText('Titre en néerlandais'), { target: { value: 'Onderdeel besteld' } });
      fireEvent.change(within(d).getByLabelText('Texte en français'), { target: { value: 'La pièce pour {numero} est commandée.' } });
      fireEvent.change(within(d).getByLabelText('Texte en néerlandais'), { target: { value: 'Het onderdeel voor {numero} is besteld.' } });
      fireEvent.click(within(d).getByRole('button', { name: 'Enregistrer' }));
      const appels = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
      await waitFor(() => expect(appels.some(([u, i]) => u === '/api/modeles-reponse' && i?.method === 'POST')).toBe(true));
      const [, init] = appels.find(([u, i]) => u === '/api/modeles-reponse' && i?.method === 'POST')!;
      expect(JSON.parse(String(init!.body))).toMatchObject({ titre_fr: 'Pièce commandée', texte_nl: 'Het onderdeel voor {numero} is besteld.' });
    } finally {
      user.entites = avant;
      (roles[2].permissions as string[]).pop();
    }
  });

  it('catégories : arbre avec la priorité en vigueur et aperçu des tuiles du demandeur, domaine puis natures', async () => {
    render(wrap(ReferentielPage, 'fr'));
    expect(await screen.findByRole('tab', { name: 'Catégories' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Aperçu des tuiles du demandeur')).toBeInTheDocument();
    const tuile = await screen.findByRole('button', { name: 'Plomberie et sanitaires : voir les natures' });
    expect(screen.getAllByText('P3 · Normale').length).toBeGreaterThan(0);
    fireEvent.click(tuile);
    expect(await screen.findByRole('button', { name: "Fuite d'eau" })).toBeInTheDocument();
  });

  it('catégories : la fiche d’une nature propose « Comme le domaine » et les pictogrammes en boutons', async () => {
    render(wrap(ReferentielPage, 'fr'));
    await screen.findByRole('button', { name: 'Plomberie et sanitaires : voir les natures' });
    fireEvent.click(screen.getAllByText('Plomberie et sanitaires').find((el) => el.closest('td')) as HTMLElement);
    expect(await screen.findByDisplayValue('Plomberie et sanitaires')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'P3' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Comme le domaine' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Outil' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /Nouvelle nature/ }));
    expect(await screen.findAllByRole('radio', { name: 'Comme le domaine' })).toHaveLength(2);
  }, 30000);

  it('catégories (0.7.0) : questions du formulaire sur la fiche, ajout d’une question à choix, aperçu des questions, FR et NL', async () => {
    for (const lang of ['fr', 'nl'] as const) {
      const { container, unmount } = render(wrap(ReferentielPage, lang));
      const fr = lang === 'fr';
      await screen.findByRole('button', { name: fr ? 'Plomberie et sanitaires : voir les natures' : 'Sanitair en loodgieterij : de soorten bekijken' });
      fireEvent.click(screen.getAllByText(fr ? 'Plomberie et sanitaires' : 'Sanitair en loodgieterij').find((el) => el.closest('td')) as HTMLElement);
      expect(await screen.findByText(fr ? 'Questions du formulaire' : 'Vragen in het formulier')).toBeInTheDocument();
      expect(await screen.findByText(fr ? "Y a-t-il de l'eau au sol ?" : 'Ligt er water op de vloer?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: fr ? 'Réactiver' : 'Heractiveren' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `${fr ? 'Monter' : 'Omhoog'} : ${fr ? "Y a-t-il de l'eau au sol ?" : 'Ligt er water op de vloer?'}` })).toBeDisabled();
      const drawer = document.querySelector('.ant-drawer') as HTMLElement;
      const r1 = await axe.run(drawer, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      expect(r1.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')}`)).toEqual([]);
      fireEvent.click(screen.getByRole('button', { name: fr ? /Ajouter une question/ : /Een vraag toevoegen/ }));
      expect(await screen.findByRole('radio', { name: fr ? 'Oui ou non' : 'Ja of nee' })).toBeChecked();
      fireEvent.click(screen.getByRole('radio', { name: fr ? 'Un choix parmi 2 à 6 réponses' : 'Eén keuze uit 2 tot 6 antwoorden' }));
      expect(await screen.findByRole('textbox', { name: fr ? 'Réponse en français 1' : 'Antwoord in het Frans 1' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: fr ? 'Réponse en néerlandais 2' : 'Antwoord in het Nederlands 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: fr ? 'Retirer la réponse 1' : 'Het antwoord verwijderen 1' })).toBeDisabled();
      // 0.12.0 : la case a un libellé de champ (« Exigence ») et son « ? » ; son nom accessible garde le texte visible.
      expect(screen.getByRole('checkbox', { name: fr ? /Obligatoire/ : /Verplicht/ })).not.toBeChecked();
      const modal = document.querySelector('.ant-modal') as HTMLElement;
      const r2 = await axe.run(modal, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      expect(r2.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')}`)).toEqual([]);
      unmount();
      void container;
    }
    // Aperçu : la tuile d'une nature montre les questions telles que le demandeur les verra.
    render(wrap(ReferentielPage, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: 'Plomberie et sanitaires : voir les natures' }));
    fireEvent.click(await screen.findByRole('button', { name: "Fuite d'eau" }));
    const oui = await screen.findByRole('button', { name: 'Oui' });
    fireEvent.click(oui);
    expect(oui).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(oui);
    expect(oui).toHaveAttribute('aria-pressed', 'false');
  }, 60000);

  it('priorités : délais livrés, décompte en boutons et date convenue pour P4, en néerlandais', async () => {
    const { container } = render(wrap(ReferentielPage, 'nl', FALLBACK_SETTINGS, ['/referentiel?onglet=priorites']));
    expect(await screen.findByDisplayValue('Veiligheid')).toBeInTheDocument();
    expect(screen.getAllByRole('radio', { name: 'kalenderuren' })[0]).toBeChecked();
    expect(screen.getAllByRole('checkbox', { name: 'Afgesproken datum' })[3]).toBeChecked();
    expect(screen.getByText(/Geleverde waarden : Tenlasteneming 1 kalenderuur · Einde van de werken 4 kalenderuren/)).toBeInTheDocument();
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')}`)).toEqual([]);
  }, 30000);

  it('calendrier : horaire des sept jours, jours fériés, congés et fermetures', async () => {
    const { container } = render(wrap(ReferentielPage, 'fr', FALLBACK_SETTINGS, ['/referentiel?onglet=calendrier']));
    expect(await screen.findByText('Vendredi')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Samedi : Ouvré' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Lundi : Ouvré' })).toBeChecked();
    expect(await screen.findByText('Armistice')).toBeInTheDocument();
    expect(await screen.findByText('Fête du Roi')).toBeInTheDocument();
    expect(screen.getByText('15 novembre · chaque année')).toBeInTheDocument();
    expect(screen.getByText('Désactivée')).toBeInTheDocument();
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')}`)).toEqual([]);
  });

  it('simulateur : envoie la priorité et l’instant, affiche la prise en charge et la fin', async () => {
    const { container } = render(wrap(ReferentielPage, 'fr', FALLBACK_SETTINGS, ['/referentiel?onglet=simulateur']));
    fireEvent.click(await screen.findByRole('button', { name: 'Calculer' }));
    expect(await screen.findByText('mercredi 28 octobre 2026, 07:45')).toBeInTheDocument();
    expect(screen.getByText('mardi 10 novembre 2026, 07:45')).toBeInTheDocument();
    expect(screen.getByText('lundi 26 octobre 2026, 07:45')).toBeInTheDocument();
    const calls = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls.map((c) => c[0]).filter((u) => u.startsWith('/api/echeances'));
    expect(calls.some((u) => u.includes('priorite=P3') && u.includes('recu_le='))).toBe(true);
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')}`)).toEqual([]);
  });

  it('simulateur (0.4.1) : l’heure et le délai sur deux lignes ; libellés au-dessus sur téléphone, à gauche sur grand écran', async () => {
    // Le simulacre de matchMedia ne répond à aucune requête : Ant Design voit un écran de moins de 576 px (téléphone).
    const { container, unmount } = render(wrap(ReferentielPage, 'fr', FALLBACK_SETTINGS, ['/referentiel?onglet=simulateur']));
    fireEvent.click(await screen.findByRole('button', { name: 'Calculer' }));
    await screen.findByText('mercredi 28 octobre 2026, 07:45');
    const blocs = [...container.querySelectorAll('.sim-echeance')];
    expect(blocs.map((b) => [...b.children].map((e) => `${e.tagName}:${e.textContent}`))).toEqual([
      ['STRONG:mercredi 28 octobre 2026, 07:45', 'SPAN:2 jours ouvrables'],
      ['STRONG:mardi 10 novembre 2026, 07:45', 'SPAN:10 jours ouvrables'],
    ]);
    expect(container.querySelectorAll('.sim-resultat th.ant-descriptions-item').length).toBeGreaterThan(0);
    unmount();
    // Grand écran : toutes les requêtes min-width répondent oui ; les libellés restent à gauche des valeurs.
    const avant = window.matchMedia;
    window.matchMedia = ((query: string) => ({ ...avant(query), matches: true })) as typeof window.matchMedia;
    try {
      const grand = render(wrap(ReferentielPage, 'nl', FALLBACK_SETTINGS, ['/referentiel?onglet=simulateur']));
      fireEvent.click(await screen.findByRole('button', { name: 'Berekenen' }));
      await waitFor(() => expect(grand.container.querySelectorAll('.sim-echeance')).toHaveLength(2));
      expect(grand.container.querySelector('.sim-echeance span')?.textContent).toBe('2 werkdagen');
      expect(grand.container.querySelectorAll('.sim-resultat th.ant-descriptions-item')).toHaveLength(0);
    } finally { window.matchMedia = avant; }
  }, 30000);

  it('mention « Modifié le … par … » (0.4.1) : horaire, congé, fermeture, catégorie, en français, heure de Bruxelles', async () => {
    const cal = render(wrap(ReferentielPage, 'fr', FALLBACK_SETTINGS, ['/referentiel?onglet=calendrier']));
    expect(await screen.findByText('Modifié le 23/10/2026 à 10:15 par Ada Admin')).toBeInTheDocument();
    expect(screen.getAllByText('Valeur livrée')).toHaveLength(6);
    fireEvent.click(await screen.findByText('Fête du Roi'));
    expect(await screen.findByText('Modifié le 22/10/2026 à 12:00')).toBeInTheDocument();
    cal.unmount();
    const cal2 = render(wrap(ReferentielPage, 'fr', FALLBACK_SETTINGS, ['/referentiel?onglet=calendrier']));
    fireEvent.click(await screen.findByText('Fin d’année'));
    expect(await screen.findByText('Créé le 22/10/2026 à 12:00 par Ada Admin')).toBeInTheDocument();
    cal2.unmount();
    render(wrap(ReferentielPage, 'fr'));
    await screen.findByRole('button', { name: 'Plomberie et sanitaires : voir les natures' });
    fireEvent.click(screen.getAllByText('Plomberie et sanitaires').find((el) => el.closest('td')) as HTMLElement);
    expect(await screen.findByText('Modifié le 23/10/2026 à 10:15 par Ada Admin')).toBeInTheDocument();
  }, 30000);

  it('mention de la priorité (0.4.1) : « Geleverde waarde » et « hersteld » en néerlandais, minuit passé à Bruxelles', async () => {
    render(wrap(ReferentielPage, 'nl', FALLBACK_SETTINGS, ['/referentiel?onglet=priorites']));
    expect(await screen.findByText('Geleverde waarde, hersteld op 02/12/2026 om 00:05 door Ada Admin')).toBeInTheDocument();
    expect(screen.getAllByText('Geleverde waarde')).toHaveLength(3);
  }, 30000);

  it('les paramètres montrent la valeur, la valeur livrée et le choix exclusif en boutons', async () => {
    render(wrap(ParametresPage, 'fr'));
    expect(await screen.findByDisplayValue('Commune fictive')).toBeInTheDocument();
    expect(screen.getByText('Valeur livrée : Pouvoir local')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revenir à la valeur livrée/ })).toBeInTheDocument();
    expect(screen.getByText('Langue par défaut')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Français' })).toBeChecked();
  });

  it('en néerlandais, les paramètres prennent les libellés néerlandais du catalogue', async () => {
    render(wrap(ParametresPage, 'nl'));
    expect(await screen.findByText('Naam van het lokaal bestuur in het Frans')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Nederlands' })).toBeInTheDocument();
  });

  it('l’onglet Modules montre le noyau, le module disponible et le module à venir', async () => {
    const { container } = render(wrap(ParametresPage, 'fr', FALLBACK_SETTINGS, ['/parametres?onglet=modules']));
    const sw = await screen.findByRole('switch', { name: 'Patrimoine : Actif' });
    expect(sw).not.toBeDisabled();
    expect(screen.getByRole('switch', { name: "Demandes d'intervention : Actif" })).toBeDisabled();
    expect(screen.queryByRole('switch', { name: /Véhicules/ })).toBeNull();
    expect(screen.getByText('À venir')).toBeInTheDocument();
    expect(screen.getByText('Noyau')).toBeInTheDocument();
    expect(screen.getByText('Prévu à l’étape 35 du planning.')).toBeInTheDocument();
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  it('module Patrimoine éteint : absent du menu et de l’aide', async () => {
    modules = modulesActifs.map((m) => (m.code === 'patrimoine' ? { ...m, actif: false } : m));
    reloadModules();
    render(wrap(AppLayout, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: 'Ouvrir ou fermer le menu' }));
    expect(await screen.findByText('Accueil')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Patrimoine')).toBeNull());
    const help = render(wrap(HelpPage, 'fr'));
    await waitFor(() => expect(help.container.querySelector('h1')).toBeTruthy());
    expect(within(help.container).queryByText('Patrimoine')).toBeNull();
    expect(within(help.container).queryByText(/Le même bâtiment sert/)).toBeNull();
    reloadModules();
  });

  it('les réglages de l’entité montrent l’entité active, le téléphone et le délai en nombre', async () => {
    render(wrap(ReglagesEntitePage, 'fr'));
    expect(await screen.findByDisplayValue('02 000 00 00')).toHaveAttribute('type', 'tel');
    expect(screen.getByText('AA · Administration fictive')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue('7');
    expect(screen.getByText('Contact du service technique')).toBeInTheDocument();
  });

  it('0.7.0 (RGPD-10) : réglages « Protection des données », texte long avec variables permises, variable inconnue signalée', async () => {
    const { container } = render(wrap(ReglagesEntitePage, 'fr'));
    expect(await screen.findByText('Protection des données')).toBeInTheDocument();
    const zone = screen.getByDisplayValue('{entite} traite vos données. {dpo}');
    expect(zone.tagName).toBe('TEXTAREA');
    expect(zone).toHaveAttribute('lang', 'fr');
    expect(screen.getByText('Variables permises : {entite}, {dpo}')).toBeInTheDocument();
    fireEvent.change(zone, { target: { value: 'Contact : {dp0}' } });
    const carte = zone.closest('.ant-card') as HTMLElement;
    fireEvent.click(within(carte).getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Variable inconnue {dp0} : voir les variables permises sous le champ.')).toBeInTheDocument();
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')}`)).toEqual([]);
  }, 30000);

  it('0.7.0 (RGPD-10) : l’aide donne la mention complète de l’entité et le DPO, ou le renvoi au responsable, en FR et en NL', async () => {
    const { unmount } = render(wrap(HelpPage, 'fr'));
    fireEvent.click(await screen.findByText('Protection de vos données'));
    expect(await screen.findByText('Administration fictive traite les données de cette demande.')).toBeInTheDocument();
    expect(screen.getByText(/Délégué à la protection des données \(DPO\) : pas encore renseigné/)).toBeInTheDocument();
    unmount();
    render(wrap(HelpPage, 'nl'));
    fireEvent.click(await screen.findByText('Bescherming van uw gegevens'));
    expect(await screen.findByText('Fictief bestuur verwerkt de gegevens van deze aanvraag.')).toBeInTheDocument();
  });

  it('l’aide donne le contact du service technique de l’entité active et le support', async () => {
    render(wrap(HelpPage, 'fr'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Contact' }));
    expect(await screen.findByText('Service technique fictif')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '02 000 00 00' })).toHaveAttribute('href', 'tel:020000000');
    expect(screen.getByText('Support informatique (compte, accès)')).toBeInTheDocument();
  });

  it('le journal traduit les actions, garde le code d’une action inconnue et nomme le système', async () => {
    render(wrap(JournalPage, 'fr'));
    // jsdom n'a pas de largeur d'écran : la vue est celle du téléphone, une seule colonne empilée.
    expect(await screen.findByText('Lieu modifié · AA')).toBeInTheDocument();
    expect(screen.getByText('action.nouvelle')).toBeInTheDocument();
    expect(screen.getByText(/· Système$/)).toBeInTheDocument();
    expect(screen.getAllByText(/· Ada Admin$/)).toHaveLength(5);
  });

  it('le détail du journal nomme le lieu et la catégorie au lieu de leur identifiant, en FR (DV-50)', async () => {
    const { container } = render(wrap(JournalPage, 'fr'));
    await screen.findByText('Lieu modifié · BB');
    container.querySelectorAll<HTMLButtonElement>('button.ant-table-row-expand-icon').forEach((b) => fireEvent.click(b));
    expect(await screen.findByText('MC-A-12 — Bureau 12 (#12)')).toBeInTheDocument();
    expect(screen.getByText('eclairage — Éclairage (#9)')).toBeInTheDocument();
    // 0.7.5 : cases à cocher en « Oui » ou « Non », champs vides masqués, nombre gardé tel quel.
    expect(within(screen.getByText('Danger signalé').closest('tr') as HTMLElement).getByText('Non')).toBeInTheDocument();
    expect(within(screen.getByText('Bénéficiaire en texte libre').closest('tr') as HTMLElement).getByText('Oui')).toBeInTheDocument();
    expect(within(screen.getByText('Réponses aux questions').closest('tr') as HTMLElement).getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('Bénéficiaire (identifiant)')).toBeNull();
    expect(screen.queryByText('Date souhaitée')).toBeNull();
    expect(screen.getByText('Rattaché à : MC — Maison communale (#2)')).toBeInTheDocument();
    expect(screen.getByText('Rattaché à : #404 (fiche introuvable)')).toBeInTheDocument();
    expect(screen.queryByText(/lieu_id|categorie_id|parent_id/)).toBeNull();
  });

  it('le détail du journal nomme le lieu et la catégorie en néerlandais (DV-50)', async () => {
    const { container } = render(wrap(JournalPage, 'nl'));
    await screen.findByText('Plaats gewijzigd · BB');
    container.querySelectorAll<HTMLButtonElement>('button.ant-table-row-expand-icon').forEach((b) => fireEvent.click(b));
    expect(await screen.findByText('MC-A-12 — Kantoor 12 (#12)')).toBeInTheDocument();
    expect(screen.getByText('eclairage — Verlichting (#9)')).toBeInTheDocument();
    expect(screen.getByText('Hangt af van : #404 (fiche niet gevonden)')).toBeInTheDocument();
    expect(within(screen.getByText('Gevaar gemeld').closest('tr') as HTMLElement).getByText('Nee')).toBeInTheDocument();
  });

  for (const [lang, a, q, inconnu] of [['fr', 'À qualifier', 'Qualifiée', 'etat_futur'], ['nl', 'Te kwalificeren', 'Gekwalificeerd', 'etat_futur']] as const) {
    it(`R2 (0.9.1, DV-94) : l’état d’une demande s’affiche par son libellé du service dans « Avant » et « Après » (${lang})`, async () => {
      const { container } = render(wrap(JournalPage, lang));
      await screen.findAllByText(lang === 'fr' ? /Demande qualifiée/ : /Aanvraag gekwalificeerd/);
      container.querySelectorAll<HTMLButtonElement>('button.ant-table-row-expand-icon').forEach((b) => fireEvent.click(b));
      expect((await screen.findAllByText(new RegExp(`: ${a}( ·|$)`))).length).toBeGreaterThan(0);
      expect(screen.getAllByText(new RegExp(`: ${q}( ·|$)`)).length).toBe(2);
      expect(screen.queryByText(/a_qualifier|: qualifiee/)).toBeNull();
      expect(screen.getByText(new RegExp(`: ${inconnu}$`))).toBeInTheDocument();
    });
  }

  it('0.20.0 (DV-159) : une liste vide du détail est masquée (membres, corps de métier) ; « Avant » vide dit « aucun » (« aucune » au féminin depuis la 0.21.0)', async () => {
    const qui = { entite_id: 1, entite_code: 'AA', user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin' };
    const ajout = [
      { id: 90, created_at: '2026-11-19 08:00:00', action: 'equipe.update', entity_type: 'equipe', entity_id: 3, channel: 'api', details: { membres_ajoutes: [9], membres_retires: [] }, ...qui,
        noms: { 'membres_ajoutes.0': { type: 'user', id: 9, code: 'Olivier Ouvrier', nom_fr: 'Olivier Ouvrier', nom_nl: 'Olivier Ouvrier' } } },
      { id: 91, created_at: '2026-11-19 08:10:00', action: 'prestataire.create', entity_type: 'prestataire', entity_id: 4, channel: 'api', details: { nom: 'Toiture fictive', numero_entreprise: null, corps_metier: [] }, ...qui },
      { id: 92, created_at: '2026-11-19 08:20:00', action: 'ouvrier.update', entity_type: 'ouvrier', entity_id: 9, channel: 'api', details: { avant: { competences: [] }, apres: { competences: ['BA4'] } }, ...qui },
    ];
    (journal as unknown as Record<string, unknown>[]).push(...ajout);
    try {
      const { container } = render(wrap(JournalPage, 'fr'));
      await screen.findByText(/Prestataire ajouté/);
      container.querySelectorAll<HTMLButtonElement>('button.ant-table-row-expand-icon').forEach((b) => fireEvent.click(b));
      expect(await screen.findByText('Membres ajoutés')).toBeInTheDocument();
      expect(screen.queryByText('Membres retirés')).toBeNull();
      expect(screen.getByText('Toiture fictive')).toBeInTheDocument();
      expect(screen.queryByText('Corps de métier')).toBeNull();
      expect(screen.getByText('Compétences : aucune')).toBeInTheDocument(); // 0.21.0 (R4) : accord au féminin
      expect(screen.getByText('Compétences : BA4')).toBeInTheDocument();
    } finally { journal.splice(journal.length - ajout.length, ajout.length); }
  });

  it('0.21.0 (R4) : date prévue d’une tâche au format de la langue (jj/mm/aaaa, dd-mm-jjjj) ; vide d’un champ féminin dit « aucune » (FR), « geen » (NL)', async () => {
    const qui = { entite_id: 1, entite_code: 'AA', user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin' };
    const ajout = [
      { id: 95, created_at: '2026-11-20 09:00:00', action: 'tache.affecter', entity_type: 'tache', entity_id: 7, channel: 'api',
        details: { avant: { date_prevue: null, heure_debut: null, ouvriers: [] }, apres: { date_prevue: '2026-11-23', heure_debut: '09:00', ouvriers: [] } }, ...qui },
    ];
    (journal as unknown as Record<string, unknown>[]).push(...ajout);
    try {
      for (const lang of ['fr', 'nl'] as const) {
        const { container, unmount } = render(wrap(JournalPage, lang));
        await screen.findAllByText(lang === 'fr' ? /Tâche affectée/ : /Taak toegewezen/);
        container.querySelectorAll<HTMLButtonElement>('button.ant-table-row-expand-icon').forEach((b) => fireEvent.click(b));
        const dp = translations['audit.detail.date_prevue'][lang];
        expect(await screen.findByText(new RegExp(`${dp} : ${lang === 'fr' ? '23/11/2026' : '23-11-2026'}`))).toBeInTheDocument();
        expect(screen.getByText(new RegExp(`${dp} : ${lang === 'fr' ? 'aucune' : 'geen'}`))).toBeInTheDocument();
        expect(screen.queryByText(/2026-11-23/)).toBeNull();
        if (lang === 'fr') {
          expect(screen.queryByText(/Date prévue : aucun( ·|$)/)).toBeNull();
          expect(screen.getByText(/Heure de début : aucune/)).toBeInTheDocument();
        }
        unmount();
      }
    } finally { journal.splice(journal.length - ajout.length, ajout.length); }
  });

  it('0.21.0 (point 1, R5) : heures réelles d’une tâche au journal, à l’heure du poste, en FR et en NL', async () => {
    const qui = { entite_id: 1, entite_code: 'AA', user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin' };
    const ajout = [{ id: 96, created_at: '2026-11-20 10:00:00', action: 'tache.etat', entity_type: 'tache', entity_id: 7, channel: 'api',
      details: { numero: 'AA-DI-2026-00002', rang: 2, de: 'a_faire', vers: 'terminee', motif_donne: 0, debut_reel: '2026-11-19 07:00:00', fin_reelle: '2026-11-19 09:30:00' }, ...qui }];
    (journal as unknown as Record<string, unknown>[]).push(...ajout);
    const h = (sql: string, lang: string) => dayjs(`${sql.replace(' ', 'T')}Z`).locale(lang).format('L LT');
    try {
      for (const lang of ['fr', 'nl'] as const) {
        const { container, unmount } = render(wrap(JournalPage, lang));
        await screen.findAllByText(new RegExp(translations['audit.action.tache.etat'][lang]));
        container.querySelectorAll<HTMLButtonElement>('button.ant-table-row-expand-icon').forEach((b) => fireEvent.click(b));
        await waitFor(() => expect(container.textContent).toContain(`${translations['audit.detail.debut_reel'][lang]}${h('2026-11-19 07:00:00', lang)}`));
        expect(container.textContent).toContain(`${translations['audit.detail.fin_reelle'][lang]}${h('2026-11-19 09:30:00', lang)}`);
        expect(screen.queryByText(/2026-11-19 07:00:00/)).toBeNull();
        unmount();
      }
    } finally { journal.splice(journal.length - ajout.length, ajout.length); }
  });

  it('le journal lit ses filtres dans l’adresse de la page et les envoie à l’API', async () => {
    render(wrap(JournalPage, 'nl', FALLBACK_SETTINGS, ['/journal?action=lieu&canal=mcp&du=2026-10-01']));
    expect(await screen.findByText('Plaats gewijzigd · AA')).toBeInTheDocument();
    const calls = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls.map((c) => c[0]).filter((u) => u.startsWith('/api/audit'));
    expect(calls.some((u) => u.includes('action=lieu') && u.includes('channel=mcp') && u.includes('du=2026-'))).toBe(true);
  });

  it('la note de version s’affiche quand le profil a des nouveautés ; « J’ai lu » la marque lue', async () => {
    user.nouveautes = [notesVersion[0]];
    try {
      render(wrap(AppLayout, 'fr'));
      expect(await screen.findByText('Nouveautés de la version 0.3.0')).toBeInTheDocument();
      expect(screen.getByText('Nouveauté fictive A')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: "J'ai lu" }));
      expect(nouveautesLues).toHaveBeenCalled();
    } finally { delete user.nouveautes; }
  });

  it('nouveautés (0.11.0) : un clic hors de la fenêtre ne la ferme pas ; la langue se change dans la fenêtre sans la marquer lue', async () => {
    user.nouveautes = [notesVersion[0]];
    nouveautesLues.mockClear();
    savePreferences.mockClear();
    try {
      render(wrap(AppLayout, 'fr'));
      expect(await screen.findByText('Nouveauté fictive A')).toBeInTheDocument();
      const fond = document.querySelector('.ant-modal-wrap') as HTMLElement;
      fireEvent.mouseDown(fond);
      fireEvent.mouseUp(fond);
      fireEvent.click(fond);
      expect(nouveautesLues).not.toHaveBeenCalled();
      const groupe = screen.getByRole('dialog').querySelector('[aria-label="Langue"]') as HTMLElement;
      fireEvent.click(within(groupe).getByText('NL'));
      expect(await screen.findByText('Fictieve nieuwigheid A')).toBeInTheDocument();
      expect(savePreferences).toHaveBeenCalledWith({ preferred_lang: 'nl' });
      expect(nouveautesLues).not.toHaveBeenCalled();
      expect(screen.getByText('Nieuwigheden van versie 0.3.0')).toBeInTheDocument();
    } finally { delete user.nouveautes; }
  });

  it('tickets (0.11.0) : « Signaler » dans l’en-tête joint l’écran et le contexte ; titre obligatoire ; file annoncée selon le type', async () => {
    render(wrap(AppLayout, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: /Signaler/ }));
    expect(await screen.findByText('Accueil', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Traité par le service technique de votre entité.')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Bug'));
    expect(await screen.findByText("Traité par l'administrateur de l'application.")).toBeInTheDocument();
    expect(screen.getByLabelText("Ce que j'attendais")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findByText('Ce champ est obligatoire')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'La liste ne se charge pas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect((fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls.some(([u, o]) => u === '/api/tickets' && o?.method === 'POST')).toBe(true));
    const [, o] = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls.find(([u, x]) => u === '/api/tickets' && x?.method === 'POST')!;
    const corps = JSON.parse(String(o!.body));
    expect(corps).toMatchObject({ type: 'bug', title: 'La liste ne se charge pas', impact: 'person', urgency: 'annoying', screen: '/' });
    expect(corps.context).toMatchObject({ path: '/', screen: 'Accueil', lang: 'fr' });
    expect('lastApiError' in corps.context).toBe(true);
    expect(corps.screenshot).toBeUndefined();
  });

  it('tickets (0.11.0) : le traitant prend en charge ; le demandeur annule avec un motif ; un transfert hors de sa file ferme le panneau', async () => {
    render(wrap(TicketsPage, 'fr', FALLBACK_SETTINGS, ['/tickets?id=7']));
    expect(await screen.findByText('Je qualifiais une demande')).toBeInTheDocument();
    expect(screen.getByText('AA', { selector: '.ant-descriptions-item-content' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Prendre en charge' }));
    await waitFor(() => expect((fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls
      .some(([u, o]) => u === '/api/tickets/7/status' && o?.method === 'POST' && JSON.parse(String(o.body)).to === 'in_progress')).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: "Transférer vers l'autre file" }));
    const motif = await screen.findByLabelText('Motif');
    fireEvent.change(motif, { target: { value: 'Problème technique' } });
    fireEvent.click(within(dernierDialogue()).getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText("Ticket transféré vers l'autre file.")).toBeInTheDocument();
    cleanupAll();
    ticketDetail = { ...ticketBase, can_handle: false, requester_id: 1 };
    render(wrap(TicketsPage, 'nl', FALLBACK_SETTINGS, ['/tickets?id=7']));
    expect(await screen.findByText('Je qualifiais une demande')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'In behandeling nemen' })).toBeNull();
    expect(screen.queryByText('Interne nota')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ticket annuleren' }));
    const reden = await screen.findByLabelText('Reden');
    const ok = within(dernierDialogue()).getByRole('button', { name: 'Opslaan' });
    expect(ok).toBeDisabled();
    fireEvent.change(reden, { target: { value: 'Dubbel' } });
    fireEvent.click(ok);
    await waitFor(() => expect((fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls
      .some(([u, o]) => u === '/api/tickets/7/status' && JSON.parse(String(o!.body)).to === 'cancelled' && JSON.parse(String(o!.body)).reason === 'Dubbel')).toBe(true));
  });

  it('sans nouveautés, aucune fenêtre', async () => {
    render(wrap(AppLayout, 'fr'));
    await screen.findByLabelText('Entité active');
    expect(screen.queryByText(/Nouveautés de la version/)).toBeNull();
  });

  it('l’aide garde toutes les nouveautés, en néerlandais, et la question sur l’appareil photo de l’iPhone', async () => {
    render(wrap(HelpPage, 'nl', FALLBACK_SETTINGS, ['/help?onglet=nouveautes']));
    expect(await screen.findByText('Fictieve nieuwigheid A')).toBeInTheDocument();
    expect(screen.getByText('Fictieve nieuwigheid B')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Veelgestelde vragen' }));
    expect(await screen.findByText('De camera blijft zwart of gaat niet open wanneer ik een foto toevoeg. Wat moet ik doen?')).toBeInTheDocument();
  });

  it('l’aide explique à tous le calcul des délais et répond sur la date convenue (0.4.0)', async () => {
    render(wrap(HelpPage, 'fr'));
    fireEvent.click(await screen.findByText('Délais des demandes'));
    expect(await screen.findByText(/Une demande P1 compte en heures, jour et nuit/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Questions fréquentes' }));
    expect(await screen.findByText('Que veut dire « date convenue » ?')).toBeInTheDocument();
    expect(screen.queryByText(/La garde et les balayeurs/)).toBeNull();
  });

  it('l’assistant d’installation propose la langue par défaut et les modules disponibles, cochés par défaut', async () => {
    const modules_installables = [{ code: 'patrimoine', libelle_fr: 'Patrimoine', libelle_nl: 'Patrimonium', description_fr: 'Lieux.', description_nl: 'Plaatsen.', actif_defaut: true }];
    const { container } = render(wrap(LoginPage, 'fr', { ...FALLBACK_SETTINGS, installed: false, modules_installables }));
    expect(await screen.findByRole('radio', { name: 'Français' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Néerlandais' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Patrimoine/ })).toBeChecked();
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  it('l’assistant d’installation demande le pouvoir local et la première entité', async () => {
    render(wrap(LoginPage, 'fr', { ...FALLBACK_SETTINGS, installed: false }));
    expect(await screen.findByLabelText('Nom du pouvoir local en français')).toBeInTheDocument();
    expect(screen.getByLabelText('Code court')).toBeInTheDocument();
    expect(screen.getByLabelText('Nom en néerlandais')).toBeInTheDocument();
  });

  it('les entités de la personne se choisissent en boutons, sans violation axe-core ; sur téléphone, dans le menu (0.17.0)', async () => {
    const { container } = render(wrap(AppLayout, 'fr'));
    // jsdom a la mise en page du téléphone : l'en-tête montre le code actif, le choix est en tête du menu (0.17.0, point 1).
    expect((await screen.findByLabelText('Entité active')).textContent).toBe('AA');
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir ou fermer le menu' }));
    const selector = (await screen.findAllByLabelText('Entité active')).find((e) => e.querySelector('input[type="radio"]')) as HTMLElement;
    expect(within(selector).getByText('AA')).toBeInTheDocument();
    expect(within(selector).getByText('BB')).toBeInTheDocument();
    expect(selector.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.map((n) => n.html.slice(0, 200)).join(" | ")}`)).toEqual([]);
  });
  // 0.5.1 (recette du 26/10/2026) : un champ obligatoire vide ou fait seulement d'espaces montre « Ce champ est obligatoire »
  // sous le champ, avant l'envoi ; rien ne part au serveur, qui refuse de toute façon (DV-37).
  const posts = () => (fetch as unknown as { mock: { calls: [string, { method?: string }?][] } }).mock.calls.filter((c) => c[1]?.method && c[1].method !== 'GET');

  it('champ obligatoire (0.5.1) : listes de valeurs, libellé fait d’espaces et motif fait d’espaces, en français', async () => {
    render(wrap(ListesValeursPage, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: /Créer/ }));
    const libelle = await screen.findByLabelText('Libellé en français');
    fireEvent.change(libelle, { target: { value: '   ' } });
    expect(await screen.findByText('Ce champ est obligatoire')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(screen.getAllByText('Ce champ est obligatoire').length).toBeGreaterThanOrEqual(2));
    expect(screen.queryByText(/Données invalides/)).toBeNull();
    expect(posts()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    fireEvent.click(screen.getByText('Bureau'));
    const motif = await screen.findByLabelText('Motif de la désactivation');
    fireEvent.change(motif, { target: { value: '  \n ' } });
    expect(motif).toHaveAttribute('aria-invalid', 'true');
    expect(motif.getAttribute('aria-describedby')).toBe('motif-listes-erreur');
    expect(document.getElementById('motif-listes-erreur')).toHaveTextContent('Ce champ est obligatoire');
    expect(screen.getByRole('button', { name: 'Désactiver cette valeur' })).toBeDisabled();
    fireEvent.change(motif, { target: { value: 'Valeur en double' } });
    expect(document.getElementById('motif-listes-erreur')).toBeNull();
  });

  it('champ obligatoire (0.5.1) : entités en néerlandais, « Dit veld is verplicht » sous le nom fait d’espaces', async () => {
    render(wrap(EntitesPage, 'nl'));
    await screen.findByText('Fictief centrum');
    fireEvent.click(screen.getByRole('button', { name: /Aanmaken/ }));
    const nom = (await screen.findAllByLabelText('Naam in het Nederlands'))[0];
    fireEvent.change(nom, { target: { value: '    ' } });
    expect(await screen.findByText('Dit veld is verplicht')).toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });

  it('champ obligatoire (0.5.1) : assistant d’installation, nom du pouvoir local fait d’espaces', async () => {
    render(wrap(LoginPage, 'fr', { ...FALLBACK_SETTINGS, installed: false }));
    fireEvent.change(await screen.findByLabelText('Nom du pouvoir local en français'), { target: { value: '  ' } });
    expect(await screen.findByText('Ce champ est obligatoire')).toBeInTheDocument();
  });
  it('champ obligatoire (0.5.1) : un nombre vidé dans les réglages de l’entité montre le message, un nombre rempli l’efface', async () => {
    render(wrap(ReglagesEntitePage, 'fr'));
    const nombre = await screen.findByRole('spinbutton');
    fireEvent.change(nombre, { target: { value: '' } });
    expect(await screen.findByText('Ce champ est obligatoire')).toBeInTheDocument();
    fireEvent.change(nombre, { target: { value: '5' } });
    await waitFor(() => expect(screen.queryByText('Ce champ est obligatoire')).toBeNull());
  });
});

describe('champs sur téléphone (0.5.2)', () => {
  const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
  const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');

  it('sur petit écran, le texte saisi est en 16 px : l’iPhone n’agrandit plus la page au toucher d’un champ', () => {
    const blocs = [...css.matchAll(/@media \(max-width: 768px\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]);
    const regle = blocs.find((b) => /font-size: 16px !important/.test(b)) ?? '';
    for (const sel of ['input', 'textarea', 'select', '.ant-select-selection-search-input', '.ant-picker input', '.ant-input-number-input']) {
      expect(regle.includes(sel), sel).toBe(true);
    }
  });

  it('le zoom à deux doigts reste permis (WCAG 1.4.4) : ni maximum-scale ni user-scalable dans la balise viewport', () => {
    const viewport = /<meta name="viewport" content="([^"]*)"/.exec(html)?.[1] ?? '';
    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toMatch(/maximum-scale|user-scalable/);
  });
});

describe('adresse e-mail (0.5.2) : un seul message sous le champ, en FR et en NL', () => {
  const erreurs = (champ: HTMLElement) => [...(champ.closest('.ant-form-item') as HTMLElement).querySelectorAll('.ant-form-item-explain-error')].map((e) => e.textContent);

  it('Utilisateurs et rôles : vide, « Ce champ est obligatoire » seul ; mal formée, « Adresse e-mail non valide »', async () => {
    render(wrap(UsersPage, 'fr'));
    await screen.findByText('BB · Responsable du service technique');
    fireEvent.click(screen.getByRole('button', { name: /Créer/ }));
    const email = await screen.findByLabelText('Adresse e-mail');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(erreurs(email)).toEqual(['Ce champ est obligatoire']));
    fireEvent.change(email, { target: { value: '  ' } });
    await waitFor(() => expect(erreurs(email)).toEqual(['Ce champ est obligatoire']));
    fireEvent.change(email, { target: { value: 'jean.dupont' } });
    await waitFor(() => expect(erreurs(email)).toEqual(['Adresse e-mail non valide']));
    fireEvent.change(email, { target: { value: 'jean.dupont@exemple.test' } });
    await waitFor(() => expect(erreurs(email)).toEqual([]));
  });

  it('assistant d’installation, en néerlandais : vide, « Dit veld is verplicht » seul ; mal formée, « Ongeldig e-mailadres »', async () => {
    render(wrap(LoginPage, 'nl', { ...FALLBACK_SETTINGS, installed: false }));
    const email = await screen.findByLabelText('E-mailadres');
    fireEvent.click(screen.getByRole('button', { name: /Beheerder aanmaken/ }));
    await waitFor(() => expect(erreurs(email)).toEqual(['Dit veld is verplicht']));
    fireEvent.change(email, { target: { value: 'jan@' } });
    await waitFor(() => expect(erreurs(email)).toEqual(['Ongeldig e-mailadres']));
  });

  it('connexion (DV-53) : le bandeau d’échec s’efface quand l’adresse change et quand un essai est arrêté par le contrôle du format', async () => {
    login.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'Identifiants incorrects.'));
    try {
      render(wrap(LoginPage, 'fr'));
      const email = await screen.findByLabelText('Adresse e-mail');
      fireEvent.change(email, { target: { value: 'agent.ac@demo.invalid' } });
      fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'faux' } });
      fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
      expect(await screen.findByText('Identifiants incorrects.')).toBeInTheDocument();
      fireEvent.change(email, { target: { value: 'agent2.ac@demo.invalid' } });
      await waitFor(() => expect(screen.queryByText('Identifiants incorrects.')).toBeNull());
      fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
      expect(await screen.findByText('Identifiants incorrects.')).toBeInTheDocument();
      // Essai arrêté par le contrôle du formulaire (mot de passe vidé), sans changer l'adresse : le bandeau s'efface.
      const mdp = screen.getByLabelText('Mot de passe');
      fireEvent.change(mdp, { target: { value: '' } });
      expect(screen.getByText('Identifiants incorrects.')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
      await waitFor(() => expect(erreurs(mdp)).toEqual(['Ce champ est obligatoire']));
      expect(screen.queryByText('Identifiants incorrects.')).toBeNull();
      expect(login).toHaveBeenCalledTimes(2);
    } finally { login.mockReset(); login.mockImplementation(async () => {}); }
  }, 30000);

  it('connexion : vide, « Ce champ est obligatoire » seul ; mal formée, « Adresse e-mail non valide », sans appel au serveur', async () => {
    render(wrap(LoginPage, 'fr'));
    const email = await screen.findByLabelText('Adresse e-mail');
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    await waitFor(() => expect(erreurs(email)).toEqual(['Ce champ est obligatoire']));
    fireEvent.change(email, { target: { value: '   ' } });
    await waitFor(() => expect(erreurs(email)).toEqual(['Ce champ est obligatoire']));
    fireEvent.change(email, { target: { value: 'agent.ac' } });
    await waitFor(() => expect(erreurs(email)).toEqual(['Adresse e-mail non valide']));
  });
});

describe('connexion Microsoft compatible avec Portal (0.10.0, section 8.6)', () => {
  it('départ automatique en mode sso, sauf déconnexion, erreur ou accès de secours (test du gabarit 1.3.0)', () => {
    const sso = { mode: 'sso' as const, microsoft: true, installed: true };
    expect(autoSsoAllowed(sso, new URLSearchParams(''))).toBe(true);
    expect(autoSsoAllowed(sso, new URLSearchParams('deconnecte=1'))).toBe(false);
    expect(autoSsoAllowed(sso, new URLSearchParams('erreur=SSO_TOKEN'))).toBe(false);
    expect(autoSsoAllowed(sso, new URLSearchParams('local=1'))).toBe(false);
    expect(autoSsoAllowed({ ...sso, mode: 'sso_optional' }, new URLSearchParams(''))).toBe(false);
    expect(autoSsoAllowed({ ...sso, microsoft: false }, new URLSearchParams(''))).toBe(false);
    expect(ssoStartUrl('/demandes?id=3')).toBe('/api/auth/sso/start?next=%2Fdemandes%3Fid%3D3');
    expect(ssoStartUrl('https://exemple.com')).toBe('/api/auth/sso/start?next=%2F');
  });

  it('retour après une connexion par mot de passe : chemin douteux ramené à /', () => {
    for (const next of ['https://exemple.com', '//exemple.com', '/\\exemple.com', '/demandes?x=<script>', null]) expect(safeNext(next)).toBe('/');
    expect(safeNext('/demandes-entite')).toBe('/demandes-entite');
  });

  it('mode sso : la page de connexion part vers Microsoft sans clic, avec l’écran demandé', async () => {
    authConfig = { mode: 'sso', microsoft: true, installed: true };
    const vers = vi.spyOn(redirection, 'vers').mockImplementation(() => {});
    try {
      render(wrap(LoginPage, 'fr', FALLBACK_SETTINGS, ['/login?next=%2Fdemandes']));
      await waitFor(() => expect(vers).toHaveBeenCalledWith('/api/auth/sso/start?next=%2Fdemandes'));
      expect(screen.getByText('Connexion avec votre compte Microsoft…')).toBeInTheDocument();
      expect(screen.queryByLabelText('Mot de passe')).toBeNull();
    } finally { vers.mockRestore(); }
  });

  for (const [query, attendu] of [
    ['deconnecte=1', 'Vous êtes déconnecté.'],
    ['erreur=SSO_UNKNOWN_ACCOUNT', "Aucun compte actif ne correspond à votre compte Microsoft. Contactez l'administrateur de l'application."],
    ['local=1', null],
  ] as const) {
    it(`mode sso, ?${query} : aucune redirection`, async () => {
      authConfig = { mode: 'sso', microsoft: true, installed: true };
      const vers = vi.spyOn(redirection, 'vers').mockImplementation(() => {});
      try {
        const { container } = render(wrap(LoginPage, 'fr', FALLBACK_SETTINGS, [`/login?${query}`]));
        expect(await screen.findByRole('button', { name: /Se connecter avec Microsoft/ })).toBeInTheDocument();
        if (attendu) expect(screen.getByText(attendu)).toBeInTheDocument();
        // Formulaire par mot de passe seulement pour l'accès de secours.
        expect(!!screen.queryByLabelText('Mot de passe')).toBe(query === 'local=1');
        expect(vers).not.toHaveBeenCalled();
        const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
        expect(r.violations.map((v) => v.id)).toEqual([]);
      } finally { vers.mockRestore(); }
    });
  }

  it('mode sso_optional : bouton Microsoft et mot de passe, sans départ automatique ; en NL', async () => {
    authConfig = { mode: 'sso_optional', microsoft: true, installed: true };
    const vers = vi.spyOn(redirection, 'vers').mockImplementation(() => {});
    try {
      render(wrap(LoginPage, 'nl', FALLBACK_SETTINGS, ['/login']));
      fireEvent.click(await screen.findByRole('button', { name: /Aanmelden met Microsoft/ }));
      expect(vers).toHaveBeenCalledWith('/api/auth/sso/start?next=%2F');
      expect(screen.getByLabelText('Wachtwoord')).toBeInTheDocument();
      expect(screen.getByText('of met uw wachtwoord')).toBeInTheDocument();
    } finally { vers.mockRestore(); }
  });

  it('Paramètres › Connexion Microsoft : adresse de retour affichée, secret jamais réaffiché, sans violation axe-core', async () => {
    const { container } = render(wrap(ParametresPage, 'fr', FALLBACK_SETTINGS, ['/parametres?onglet=connexion']));
    expect(await screen.findByText('https://gmao.exemple.test/api/auth/callback')).toBeInTheDocument();
    expect(screen.getByText(/Un secret est enregistré ; laissez vide pour le garder\./)).toBeInTheDocument();
    expect((screen.getByLabelText('Secret client') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText("Annuaire (locataire)") as HTMLInputElement).value).toBe('locataire-fictif');
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')}`)).toEqual([]);
  });

  it('Paramètres › Connexion Microsoft (0.11.0) : colonne Valeur, ID du secret refusé avant l’envoi, « Enregistré le … par … » en FR et en NL', async () => {
    render(wrap(ParametresPage, 'fr', FALLBACK_SETTINGS, ['/parametres?onglet=connexion']));
    expect(await screen.findByText('Enregistré le 05/11/2026 à 12:24 par Ada Admin')).toBeInTheDocument();
    expect(screen.getByText(/copiez la colonne Valeur, jamais l'ID du secret/)).toBeInTheDocument();
    const appels = () => (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls
      .filter(([u, o]) => u.startsWith('/api/settings/auth') && o && o.method === 'PUT').length;
    const avant = appels();
    fireEvent.change(screen.getByLabelText('Secret client'), { target: { value: '3f2b8c1e-9a4d-4e7b-b1c2-0d5e6f7a8b9c' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText("Cette valeur est l'ID du secret. Copiez la colonne Valeur.")).toBeInTheDocument();
    expect(appels()).toBe(avant);
    cleanupAll();
    render(wrap(ParametresPage, 'nl', FALLBACK_SETTINGS, ['/parametres?onglet=connexion']));
    expect(await screen.findByText('Opgeslagen op 05/11/2026 om 12:24 door Ada Admin')).toBeInTheDocument();
  });

  it('Utilisateurs : compte rattaché à Microsoft et accès de secours visibles ; case de secours sur la fiche', async () => {
    render(wrap(UsersPage, 'fr'));
    expect(await screen.findByText('Microsoft')).toBeInTheDocument();
    expect(screen.getByText('Accès de secours')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Rôles' })[0]);
    const caseSecours = await screen.findByRole('checkbox', { name: 'Accès de secours par mot de passe' });
    expect(caseSecours).toBeChecked();
  });

  it('sans session, l’écran demandé passe à la connexion (?next=) ; après le mot de passe, retour à cet écran s’il est sûr', async () => {
    const Ici = () => { const l = useLocation(); return <p>{`${l.pathname}${l.search}`}</p>; };
    const routes = (entree: string, login: React.ReactNode) => render(
      <MemoryRouter initialEntries={[entree]}><Routes><Route path="/login" element={login} /><Route path="*" element={entree.startsWith('/login') ? <Ici /> : <ToLogin />} /></Routes></MemoryRouter>);
    routes('/demandes-entite', <Ici />);
    expect(await screen.findByText('/login?next=%2Fdemandes-entite')).toBeInTheDocument();
    cleanupAll();
    routes('/login?next=%2Fdemandes-entite', <AfterLogin />);
    expect(await screen.findByText('/demandes-entite')).toBeInTheDocument();
    cleanupAll();
    routes('/login?next=https%3A%2F%2Fexemple.com', <AfterLogin />);
    expect(await screen.findByText('/')).toBeInTheDocument();
  });
});

describe('remarques de la recette de la 0.11.0 (0.12.0, DV-109)', () => {
  const appels = () => (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;

  it('R1 : « valeur par défaut » est un texte discret à côté du libellé, pas une étiquette qui ressemble à un bouton (FR et NL)', async () => {
    const { container, unmount } = render(wrap(ReglagesEntitePage, 'fr'));
    const etat = (await screen.findAllByText('(valeur par défaut)'))[0];
    expect(etat.closest('.ant-tag')).toBeNull();
    expect(etat.closest('button')).toBeNull();
    expect(container.querySelector('.ant-form .ant-tag')).toBeNull();
    unmount();
    render(wrap(ReglagesEntitePage, 'nl'));
    expect((await screen.findAllByText('(standaardwaarde)')).length).toBeGreaterThan(0);
  });

  it('0.14.0 (DV-119) : motifs qui suspendent le délai en cases à cocher (valeurs actives) ; enregistrés en codes rangés', async () => {
    render(wrap(ReglagesEntitePage, 'fr'));
    const groupe = await screen.findByRole('group', { name: "Motifs d'attente qui suspendent le délai" });
    await waitFor(() => expect(within(groupe).getAllByRole('checkbox')).toHaveLength(3));
    expect(within(groupe).getByRole('checkbox', { name: 'Accès impossible' })).toBeChecked();
    expect(within(groupe).getByRole('checkbox', { name: 'Réponse du demandeur attendue' })).toBeChecked();
    expect(within(groupe).getByRole('checkbox', { name: 'Pièce à commander' })).not.toBeChecked();
    expect(within(groupe).queryByRole('checkbox', { name: 'Budget à obtenir' })).toBeNull();
    fireEvent.click(within(groupe).getByRole('checkbox', { name: 'Pièce à commander' }));
    fireEvent.click(within(groupe.closest('.ant-card') as HTMLElement).getByRole('button', { name: 'Enregistrer' }));
    const appels = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
    await waitFor(() => expect(appels.some(([u, i]) => u === '/api/parametres-entite/demandes.attente_suspend' && i?.method === 'PUT')).toBe(true));
    const [, init] = appels.find(([u, i]) => u === '/api/parametres-entite/demandes.attente_suspend' && i?.method === 'PUT')!;
    expect(JSON.parse(String(init!.body))).toEqual({ valeur: 'acces,demandeur,piece' });
  });

  it('R2 : un refus du serveur s’affiche sous le réglage refusé avec le message qui nomme le réglage et la valeur', async () => {
    const avant = fetch as unknown as (u: string, i?: RequestInit) => Promise<unknown>;
    const refus = 'Valeur refusée pour « Nom du service en français » : 200 caractères au plus (201 tapés).';
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => (url.startsWith('/api/parametres-entite/') && init?.method === 'PUT'
      ? { ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ error: true, code: 'VALIDATION', message: refus, details: ['valeur: 200 caractères au plus (201 tapés)'] }) }
      : avant(url, init))));
    render(wrap(ReglagesEntitePage, 'fr'));
    const champ = await screen.findByDisplayValue('Service technique fictif');
    fireEvent.change(champ, { target: { value: 'Service corrigé' } });
    fireEvent.click(within(champ.closest('.ant-card') as HTMLElement).getByRole('button', { name: 'Enregistrer' }));
    const sous = await waitFor(() => { const e = champ.closest('.ant-form-item')!.querySelector('.ant-form-item-explain-error'); expect(e).not.toBeNull(); return e!; });
    expect(sous.textContent).toBe(refus);
    expect(screen.queryByText(/Données invalides/)).toBeNull();
  });

  for (const [lang, attendus, absents] of [
    ['fr', ['Mode de connexion', 'Microsoft facultatif', 'Annuaire (locataire)', 'Secret client', 'masqué', "Adresse publique de l'application", 'Bug', 'Champs modifiés', 'Gravité, File', 'Compte Microsoft', 'Adresse hors des domaines acceptés'], ['mode', 'tenant', 'client_id', 'public_url', 'bug', 'sso_optional', '***', 'urgency, queue', 'domain']],
    ['nl', ['Aanmeldmodus', 'Microsoft facultatief', 'Clientgeheim', 'verborgen', 'Bug', 'Ernst, Wachtrij', 'Microsoft-account'], ['tenant', 'client_id', 'sso_optional', 'urgency, queue']],
  ] as const) {
    it(`R4 : le détail du journal ne montre ni clé ni code brut (${lang})`, async () => {
      const ada = { entite_id: null, entite_code: null, user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin', channel: 'api', entity_id: null };
      const lignes = [
        { ...ada, id: 91, created_at: '2026-11-06 07:00:00', action: 'settings.auth', entity_type: 'settings', details: { mode: 'sso_optional', tenant: 'locataire-fictif', client_id: 'application-fictive', client_secret: '***', public_url: 'https://gmao.exemple.test' } },
        { ...ada, id: 92, created_at: '2026-11-06 07:10:00', action: 'ticket.create', entity_type: 'ticket', entity_id: 2, details: { type: 'bug', priority: 'P3' } },
        { ...ada, id: 93, created_at: '2026-11-06 07:20:00', action: 'ticket.update', entity_type: 'ticket', entity_id: 2, details: { fields: ['urgency', 'queue'] } },
        { ...ada, id: 94, created_at: '2026-11-06 07:30:00', action: 'login.success', entity_type: 'user', details: { method: 'sso' } },
        { ...ada, id: 95, created_at: '2026-11-06 07:40:00', action: 'sso.refused', entity_type: 'user', user_id: null, details: { reason: 'domain' } },
      ];
      (journal as unknown as Record<string, unknown>[]).push(...lignes);
      try {
        const { container } = render(wrap(JournalPage, lang));
        await screen.findAllByText(lang === 'fr' ? /Réglages de la connexion Microsoft modifiés/ : /Instellingen van de Microsoft-aanmelding gewijzigd/);
        container.querySelectorAll<HTMLButtonElement>('button.ant-table-row-expand-icon').forEach((b) => fireEvent.click(b));
        await screen.findByText('locataire-fictif');
        const cellules = [...container.querySelectorAll('.ant-descriptions-item-label, .ant-descriptions-item-content')].map((c) => c.textContent);
        for (const a of attendus) expect(cellules, a).toContain(a);
        for (const a of absents) expect(cellules, a).not.toContain(a);
      } finally { journal.splice(journal.length - lignes.length, lignes.length); }
    });
  }

  it('R6 : la page Tickets ne demande les compteurs qu’à qui traite une file', async () => {
    const files = user.files_tickets;
    user.files_tickets = [];
    try {
      render(wrap(TicketsPage, 'fr', FALLBACK_SETTINGS, ['/tickets']));
      expect(await screen.findByText('Comment changer la catégorie ?')).toBeInTheDocument();
      expect(appels().some(([u]) => u.startsWith('/api/tickets/stats'))).toBe(false);
      cleanupAll();
      user.files_tickets = ['business'];
      render(wrap(TicketsPage, 'fr', FALLBACK_SETTINGS, ['/tickets']));
      await waitFor(() => expect(appels().some(([u]) => u.startsWith('/api/tickets/stats'))).toBe(true));
    } finally { user.files_tickets = files; }
  });
});

describe('aide par écran (0.12.0, standard 13.1, DV-100)', () => {
  const appels = () => (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;

  it('bouton « Aide » de l’en-tête : fiche de l’écran Tickets, question locale de l’écran, lien vers le mode d’emploi complet', async () => {
    const { container } = render(wrap(AppLayout, 'fr', FALLBACK_SETTINGS, ['/tickets']));
    fireEvent.click(await screen.findByRole('button', { name: /Aide/ }));
    const panneau = await screen.findByRole('dialog');
    expect(within(panneau).getByRole('heading', { name: 'Tickets', level: 2 })).toBeInTheDocument();
    expect(within(panneau).getByText('Signaler un problème depuis un écran')).toBeInTheDocument();
    expect(within(panneau).getByText('Traiter un ticket de sa file')).toBeInTheDocument();
    expect(await within(panneau).findByText('Où voir la réponse à ma question ?')).toBeInTheDocument();
    expect(appels().some(([u]) => u.startsWith('/api/faq?') && u.includes('topic_id=tickets'))).toBe(true);
    expect(within(panneau).getByRole('link', { name: "Mode d'emploi complet" })).toHaveAttribute('href', '/help?fiche=tickets');
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')}`)).toEqual([]);
  }, 30000);

  it('« Signaler » nomme l’écran par le titre de sa fiche ; « ? » à côté de chaque champ du formulaire (fin d’E-39)', async () => {
    render(wrap(AppLayout, 'nl', FALLBACK_SETTINGS, ['/tickets']));
    fireEvent.click(await screen.findByRole('button', { name: /Melden/ }));
    const d = await screen.findByRole('dialog');
    expect(within(d).getByText('Tickets', { selector: 'strong' })).toBeInTheDocument();
    expect(d.querySelectorAll('.ant-form-item-tooltip').length).toBeGreaterThanOrEqual(6);
  });

  it('procédure réservée masquée à qui ne traite aucune file', async () => {
    const files = user.files_tickets;
    user.files_tickets = [];
    try {
      render(wrap(HelpPage, 'fr', FALLBACK_SETTINGS, ['/help?fiche=tickets']));
      expect(await screen.findByText('Signaler un problème depuis un écran')).toBeInTheDocument();
      expect(screen.queryByText('Traiter un ticket de sa file')).toBeNull();
    } finally { user.files_tickets = files; }
  });

  it('centre d’aide : recherche sans accents dans les fiches et les questions, en FR et en NL', async () => {
    const { unmount } = render(wrap(HelpPage, 'fr'));
    const champ = await screen.findByRole('searchbox', { name: "Chercher dans l'aide" });
    fireEvent.change(champ, { target: { value: 'IMPRIMER' } });
    expect(await screen.findByText("Imprimer le mode d'emploi", { selector: '.ant-collapse-header-text' })).toBeInTheDocument();
    expect(screen.queryByText('Signaler un problème depuis un écran')).toBeNull();
    fireEvent.change(champ, { target: { value: 'delais des demandes' } });
    expect(await screen.findByText('Délais des demandes', { selector: '.ant-collapse-header-text' })).toBeInTheDocument();
    fireEvent.change(champ, { target: { value: 'week-end' } });
    fireEvent.click(screen.getByRole('tab', { name: /Questions fréquentes \(\d+\)/ }));
    expect(await screen.findByText('Qui contacter le week-end ?')).toBeInTheDocument();
    fireEvent.change(champ, { target: { value: 'zzzz' } });
    expect((await screen.findAllByText('Rien ne correspond à la recherche.')).length).toBeGreaterThan(0);
    unmount();
    render(wrap(HelpPage, 'nl'));
    fireEvent.change(await screen.findByRole('searchbox', { name: 'Zoeken in de hulp' }), { target: { value: 'afdrukken' } });
    expect(await screen.findByText('De handleiding afdrukken', { selector: '.ant-collapse-header-text' })).toBeInTheDocument();
  });

  it('FAQ locale : ajout par qui la gère, retrait avec motif obligatoire, sans violation axe-core', async () => {
    render(wrap(HelpPage, 'fr', FALLBACK_SETTINGS, ['/help?onglet=faq']));
    fireEvent.click(await screen.findByText('Qui contacter le week-end ?'));
    fireEvent.click(await screen.findByRole('button', { name: /Retirer/ }));
    const d = await screen.findByRole('dialog');
    fireEvent.click(within(d).getByRole('button', { name: /Retirer/ }));
    expect(await within(d).findByText('Ce champ est obligatoire')).toBeInTheDocument();
    expect(appels().some(([u, o]) => u === '/api/faq/1' && o?.method === 'DELETE')).toBe(false);
    fireEvent.change(within(d).getByLabelText('Motif du retrait'), { target: { value: 'Réponse dépassée' } });
    fireEvent.click(within(d).getByRole('button', { name: /Retirer/ }));
    await waitFor(() => expect(appels().some(([u, o]) => u === '/api/faq/1' && o?.method === 'DELETE' && JSON.parse(String(o.body)).motif === 'Réponse dépassée')).toBe(true));
    cleanupAll();
    const { container } = render(wrap(HelpPage, 'fr', FALLBACK_SETTINGS, ['/help?onglet=faq']));
    fireEvent.click(await screen.findByRole('button', { name: /Ajouter une question/ }));
    const ajout = await screen.findByRole('dialog');
    expect(within(ajout).getByText('Les deux entités')).toBeInTheDocument();
    fireEvent.change(within(ajout).getByLabelText('Question en français'), { target: { value: 'Q ?' } });
    fireEvent.change(within(ajout).getByLabelText('Question en néerlandais'), { target: { value: 'V?' } });
    fireEvent.change(within(ajout).getByLabelText('Réponse en français'), { target: { value: 'R.' } });
    fireEvent.change(within(ajout).getByLabelText('Réponse en néerlandais'), { target: { value: 'A.' } });
    fireEvent.click(within(ajout).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(appels().some(([u, o]) => u === '/api/faq' && o?.method === 'POST' && JSON.parse(String(o.body)).portee === 'commune')).toBe(true));
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')}`)).toEqual([]);
  }, 30000);

  it('impression : tout déplié, sans onglets ni recherche, impression lancée', async () => {
    const imprimer = vi.spyOn(window, 'print').mockImplementation(() => {});
    // 0.13.0 (M1) : l'impression attend les captures ; jsdom ne les charge pas, elles sont dites chargées.
    const complete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete');
    Object.defineProperty(HTMLImageElement.prototype, 'complete', { configurable: true, get: () => true });
    try {
      render(wrap(HelpPage, 'fr', FALLBACK_SETTINGS, ['/help?print=1']));
      expect(await screen.findByText('Signaler un problème depuis un écran')).toBeInTheDocument();
      expect(screen.queryByRole('tab')).toBeNull();
      expect(screen.queryByRole('searchbox')).toBeNull();
      expect(screen.getByText(/Mode d'emploi imprimé le/)).toBeInTheDocument();
      expect(screen.getAllByText('Ouvrez le ticket et cliquez sur', { exact: false }).length).toBeGreaterThan(0);
      await waitFor(() => expect(imprimer).toHaveBeenCalled(), { timeout: 2000 });
    } finally {
      imprimer.mockRestore();
      if (complete) Object.defineProperty(HTMLImageElement.prototype, 'complete', complete);
    }
  });

  it('question métier résolue : « Ajouter à la FAQ » préremplit la question et l’envoie au ticket', async () => {
    ticketDetail = { ...ticketBase, status: 'resolved', resolution: 'Menu Catégorie, puis Enregistrer.', can_faq: true };
    render(wrap(TicketsPage, 'fr', FALLBACK_SETTINGS, ['/tickets?id=7']));
    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter à la FAQ' }));
    await screen.findByText(/La question deviendra une entrée de la FAQ de AA/);
    const d = dernierDialogue();
    expect(within(d).getByLabelText('Question en français')).toHaveValue('Comment changer la catégorie ?');
    expect(within(d).getByLabelText('Réponse en français')).toHaveValue('Menu Catégorie, puis Enregistrer.');
    expect(within(d).queryByText('Les deux entités')).toBeNull();
    fireEvent.change(within(d).getByLabelText('Question en néerlandais'), { target: { value: 'Hoe wijzig ik de categorie?' } });
    fireEvent.change(within(d).getByLabelText('Réponse en néerlandais'), { target: { value: 'Menu Categorie.' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(appels().some(([u, o]) => u === '/api/tickets/7/faq' && o?.method === 'POST')).toBe(true));
    cleanupAll();
    ticketDetail = { ...ticketBase, status: 'closed', faq_id: 3, can_faq: false };
    render(wrap(TicketsPage, 'fr', FALLBACK_SETTINGS, ['/tickets?id=7']));
    expect(await screen.findByRole('link', { name: 'Entrée de la FAQ' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter à la FAQ' })).toBeNull();
  });
});

describe('fiches des écrans du demandeur (0.12.0, point 3)', () => {
  for (const [lang, chemin, titre, procedure] of [
    ['fr', '/', 'Accueil', 'Choisir son lieu de travail habituel'],
    ['fr', '/demandes/nouvelle', 'Nouvelle demande', 'Signaler un danger'],
    ['fr', '/demandes', 'Mes demandes', 'Retrouver une demande et voir où elle en est'],
    ['fr', '/accessibility', 'Accessibilité', 'Signaler un obstacle d’accessibilité'],
    ['nl', '/', 'Startpagina', 'Van actieve entiteit wisselen'],
    ['nl', '/demandes/nouvelle', 'Nieuwe aanvraag', 'Hetzelfde probleem is al gemeld: « Ik ook »'],
    ['nl', '/demandes', 'Mijn aanvragen', 'Een per vergissing toegevoegde foto verwijderen'],
  ] as const) {
    it(`bouton « Aide » sur ${chemin} (${lang}) : la fiche de l’écran`, async () => {
      render(wrap(AppLayout, lang, FALLBACK_SETTINGS, [chemin]));
      fireEvent.click(await screen.findByRole('button', { name: lang === 'fr' ? /^Aide$/ : /^Help$/ }));
      const panneau = await screen.findByRole('dialog');
      expect(within(panneau).getByRole('heading', { name: titre, level: 2 })).toBeInTheDocument();
      expect(within(panneau).getByText(procedure)).toBeInTheDocument();
      expect(within(panneau).queryByText(/\{\{|\[\[/)).toBeNull();
    });
  }

  it('centre d’aide : les anciennes rubriques du demandeur ont laissé place aux fiches ; la page de connexion a la sienne', async () => {
    render(wrap(HelpPage, 'fr'));
    expect(await screen.findByText('Demander et suivre')).toBeInTheDocument();
    expect(screen.queryByText('Mon lieu de travail', { selector: '.ant-collapse-header-text' })).toBeNull();
    expect(screen.getByText('Connexion', { selector: '.ant-collapse-header-text' })).toBeInTheDocument();
  });
});

describe('fiches du service technique et de l’administration (0.12.0, point 4)', () => {
  // Modules rechargés : un test précédent peut avoir éteint le patrimoine dans le cache de moduleMap.
  beforeEach(() => { reloadModules(); });
  for (const [lang, chemin, titre, procedure] of [
    ['fr', '/patrimoine', 'Patrimoine', 'Ajouter la photo d’un lieu'],
    ['fr', '/users', 'Utilisateurs et rôles', 'Donner ou retirer un rôle'],
    ['nl', '/parametres', 'Parameters', 'Een module uit- of inschakelen'],
    ['nl', '/journal', 'Auditlogboek', 'Een wijziging terugvinden'],
    ['nl', '/entites', 'Entiteiten', 'Een entiteit aanmaken'],
  ] as const) {
    it(`bouton « Aide » sur ${chemin} (${lang}) : la fiche de l’écran`, async () => {
      render(wrap(AppLayout, lang, FALLBACK_SETTINGS, [chemin]));
      fireEvent.click(await screen.findByRole('button', { name: lang === 'fr' ? /^Aide$/ : /^Help$/ }));
      const panneau = await screen.findByRole('dialog');
      expect(within(panneau).getByRole('heading', { name: titre, level: 2 })).toBeInTheDocument();
      expect(within(panneau).getByText(procedure)).toBeInTheDocument();
      expect(within(panneau).queryByText(/\{\{|\[\[/)).toBeNull();
    });
  }

  it('sans le droit de l’écran (catalogue de test : ni catégories, ni listes, ni réglages de l’entité), « Aide » mène au mode d’emploi, sans la fiche', async () => {
    const Ici = () => { const l = useLocation(); return <p data-testid="ici">{l.pathname}</p>; };
    render(
      <SettingsProvider value={{ settings: FALLBACK_SETTINGS, reload: async () => {} }}>
        <I18nProvider defaultLang="fr"><MemoryRouter initialEntries={['/referentiel']}><Routes><Route path="/" element={<AppLayout />}><Route path="*" element={<Ici />} /></Route></Routes></MemoryRouter></I18nProvider>
      </SettingsProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Aide$/ }));
    expect(await screen.findByText('/help')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('centre d’aide : fiches rangées en trois groupes, plus aucune ancienne rubrique d’écran ; « ? » sur le formulaire d’une entité', async () => {
    const { unmount } = render(wrap(HelpPage, 'fr'));
    for (const g of ['Demander et suivre', 'Service technique', 'Administration', 'Aide']) expect(await screen.findByText(g, { selector: 'h2' })).toBeInTheDocument();
    const autres = screen.getByRole('region', { name: 'Pour tous les écrans' });
    expect(within(autres).getAllByRole('button').map((b) => b.textContent)).toEqual(['Protection de vos données', 'Délais des demandes']);
    unmount();
    render(wrap(EntitesPage, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: /Créer/ }));
    const d = await screen.findByRole('dialog');
    expect(d.querySelectorAll('.ant-form-item-tooltip').length).toBe(3);
  });
});

describe('téléphones et lien « Voir aussi » (0.13.0, point 1 ; défauts D1 et D4 du contrôle DV-113)', () => {
  it('D1 : sur téléphone, la langue quitte l’en-tête et passe dans le menu de la personne, sous le nom de l’autre langue', async () => {
    // Le simulacre de matchMedia ne répond à aucune requête : Ant Design voit un écran de moins de 576 px (téléphone).
    savePreferences.mockClear();
    render(wrap(AppLayout, 'fr'));
    const entete = await screen.findByRole('banner');
    expect(within(entete).queryByRole('combobox', { name: 'Langue' })).toBeNull();
    fireEvent.click(within(entete).getByRole('button', { name: /Mon compte/ }));
    const choix = await screen.findByText('Nederlands');
    expect(choix.closest('[lang]')?.getAttribute('lang')).toBe('nl');
    fireEvent.click(choix);
    await waitFor(() => expect(savePreferences).toHaveBeenCalledWith({ preferred_lang: 'nl' }));
    expect(await within(entete).findByRole('button', { name: /Mijn account/ })).toBeInTheDocument();
  });

  it('D1 : sur grand écran, le sélecteur de langue reste dans l’en-tête et le menu de la personne ne le répète pas', async () => {
    const avant = window.matchMedia;
    window.matchMedia = ((query: string) => ({ ...avant(query), matches: true })) as typeof window.matchMedia;
    try {
      render(wrap(AppLayout, 'nl'));
      const entete = await screen.findByRole('banner');
      expect(within(entete).getByRole('combobox', { name: 'Taal' })).toBeInTheDocument();
      fireEvent.click(within(entete).getByRole('button', { name: /Mijn account/ }));
      await screen.findByText('Mijn wachtwoord wijzigen');
      expect(screen.queryByText('Français')).toBeNull();
    } finally { window.matchMedia = avant; }
  });

  it('D4 : dans le mode d’emploi, un lien « Voir aussi » ouvre la fiche liée et referme la précédente', async () => {
    const { container } = render(wrap(HelpPage, 'fr', FALLBACK_SETTINGS, ['/help?fiche=journal']));
    const ouverte = () => [...container.querySelectorAll('.ant-collapse-item-active > .ant-collapse-header')].map((e) => e.textContent);
    await waitFor(() => expect(ouverte()).toEqual(["Journal d'audit"]));
    const lien = [...container.querySelectorAll('.ant-collapse-item-active a[href="/help?fiche=parametres"]')][0] as HTMLElement;
    expect(lien).toBeTruthy();
    fireEvent.click(lien);
    await waitFor(() => expect(ouverte()).toEqual(['Paramètres']));
  });
});

describe('journal d’audit sans code brut (0.13.0, point 2 ; défauts D2, D3, D9, M5 et D8 du contrôle DV-113)', () => {
  // Champs que le serveur peut écrire au journal : colonnes modifiables des tables suivies par changements() (audit.js)
  // et clés écrites en clair par logAudit() dans les services. Un champ nouveau sans libellé fait échouer ce test.
  const CHAMPS_ECRITS: Record<string, string> = {
    jours_non_ouvres: 'nature mois_jour date_debut date_fin libelle_fr libelle_nl is_active motif_desactivation',
    categories: 'parent_id code libelle_fr libelle_nl icone priorite_defaut validation delai_fin_jours ordre is_active motif_desactivation',
    entites: 'code nom_fr nom_nl is_active motif_desactivation',
    help_faq: 'topic_id question_fr question_nl answer_fr answer_nl is_active motif_desactivation',
    lieux: 'parent_id nature code nom_fr nom_nl type_id adresse code_postal commune surface_m2 statut is_active motif_desactivation',
    listes_valeurs: 'liste code libelle_fr libelle_nl ordre is_active motif_desactivation',
    questions_categorie: 'categorie question_fr question_nl type reponses_json obligatoire ordre is_active motif_desactivation',
    priorites: 'code libelle_fr libelle_nl description_fr description_nl couleur unite prise_en_charge fin',
    horaires: 'jour debut fin',
    users: 'email first_name last_name user_role entite_id preferred_lang ui_mode theme must_change_password is_active lieu_habituel_id is_admin_local service_id',
    nettoyage: 'valeur value cle',
    services: 'email role entite_id user_id from to motif module type priority fields internal motif_donne liste code version nom filtres niveau obligatoire octets largeur hauteur demande_id numero brouillon comptes lieux entite langue modules remarque microsoft_code method avant apres ticket reason danger beneficiaire_id beneficiaire_texte date_souhaitee reponses pieces premiere priorite_confirmee etat motif_priorite duree_estimee_minutes consignes photos_visibles date_convenue lieu_id categorie_id de vers motif_id commentaire_donne compte_rendu_donne suspendu echeance_le complement_id longueur note message_id interne mentions source',
    demande_etats: 'libelle_fr libelle_nl grc_fr grc_nl',
    // 0.15.0 (point 4) : modèles de réponse.
    modeles_reponse: 'titre_fr titre_nl texte_fr texte_nl ordre is_active motif_desactivation',
    // 0.16.0 (point 1) : services des entités et leur valideur ; service d'un compte ; circuit noté au dépôt.
    services_entite: 'code nom_fr nom_nl valideur_id suppleant_id suppleant_du suppleant_au ordre is_active motif_desactivation',
    validation: 'service_id validation services',
    // 0.19.0 (point 4) : corps de métier d'une catégorie et d'une demande qualifiée.
    corps_categorie: 'corps_metier_id',
    // 0.16.0 (point 3) : demande encodée pour un agent.
    encodage: 'demandeur_id canal',
    // 0.16.0 (point 4) : fusion de doublons.
    fusion: 'principale_id principale_numero personnes_reportees',
    decoupage: 'issue_de nouvelles',
    // 0.18.0 (point 2) : export d'une liste (jamais le contenu).
    exports: 'liste format lignes',
    // 0.19.0 (étape 15) : équipes (création, champs changés, membres, horaire) et profil d'un ouvrier ; chargement de démonstration.
    equipes: 'code nom_fr nom_nl chef_id ordre is_active motif_desactivation membres horaire membres_ajoutes membres_retires',
    ouvriers: 'corps_metier competences',
    demo: 'equipes prestataires',
    // 0.19.0 (point 3) : prestataires externes (création, champs changés, corps de métier).
    // 0.21.0 (point 1, R5) : heures réelles d'une tâche au passage.
    taches_heures: 'debut_reel fin_reelle',
    prestataires: 'nom numero_entreprise langue contact_nom telephone courriel adresse code_postal commune reference_marche is_active motif_desactivation corps_metier',
  };
  it('chaque champ écrit au journal a son libellé, en FR et en NL', () => {
    const manquants = [...new Set(Object.values(CHAMPS_ECRITS).join(' ').split(' '))]
      .filter((k) => !translations[`audit.detail.${k}`]?.fr || !translations[`audit.detail.${k}`]?.nl);
    expect(manquants).toEqual([]);
  });

  it('mode Complet : la colonne Objet nomme l’objet au lieu de son code', async () => {
    const ligneObjet = { id: 201, created_at: '2026-11-08 07:10:00', action: 'parametre_entite.update', entity_type: 'parametre_entite', entity_id: null, channel: 'api', entite_id: 1, entite_code: 'AA',
      user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin', details: { cle: 'urgence.telephone', avant: null, apres: '02 000 00 00' } };
    (journal as unknown as Record<string, unknown>[]).push(ligneObjet);
    const mode = user.ui_mode;
    user.ui_mode = 'complet';
    // Grand écran : la colonne Objet n'existe qu'au-dessus de 768 px.
    const avant = window.matchMedia;
    window.matchMedia = ((query: string) => ({ ...avant(query), matches: true })) as typeof window.matchMedia;
    try {
      const { container } = render(wrap(JournalPage, 'fr'));
      await waitFor(() => expect([...container.querySelectorAll('td')].map((c) => c.textContent)).toContain("Réglage de l'entité"));
      expect([...container.querySelectorAll('td')].map((c) => c.textContent)).not.toContain('parametre_entite');
    } finally { window.matchMedia = avant; user.ui_mode = mode; journal.splice(journal.length - 1, 1); }
  });

  for (const [lang, attendus] of [
    ['fr', ['Libellé en français : Mobilier de bureau', 'Nom du pouvoir local en français', 'Photo JPEG', 'Mes demandes', 'Motif donné', 'Oui',
      'Gestionnaire technique', 'Jour', 'Lundi', 'Heure de début : 07:45', 'Type de lieu : Bureau', 'Congé', '8 mai', 'Nature', 'Bâtiment', 'Pictogramme : Éclair',
      'État de départ', 'Qualifiée', "État d'arrivée", 'Pièce à commander', 'Commentaire donné', 'Délai suspendu', 'Échéance de fin']],
    ['nl', ['Benaming in het Frans : Mobilier de bureau', 'Naam van het lokaal bestuur in het Frans', 'JPEG-foto', 'Mijn aanvragen', 'Reden opgegeven', 'Ja',
      'Technisch beheerder', 'Maandag', 'Beginuur : 07:45', 'Soort plaats : Kantoor', 'Jaarlijkse verlofdag', '8 mei', 'Gebouw',
      'Beginstatus', 'Gekwalificeerd', 'Onderdeel te bestellen', 'Opmerking gegeven', 'Termijn opgeschort', 'Einddatum']],
  ] as const) {
    it(`détail des lignes sans clé ni code brut (${lang})`, async () => {
      const ada = { entite_id: 1, entite_code: 'AA', user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin', channel: 'api', entity_id: 3 };
      const lignes = [
        { ...ada, id: 191, created_at: '2026-11-08 07:00:00', action: 'categorie.update', entity_type: 'categorie', details: { code: 'mobilier', avant: { libelle_fr: 'Mobilier de bureau', icone: 'mobilier' }, apres: { libelle_fr: 'Mobilier', icone: 'eclair' } } },
        { ...ada, id: 192, created_at: '2026-11-08 07:01:00', action: 'parametre.update', entity_type: 'parametre', entite_id: null, entite_code: null, details: { cle: 'app.organisation_fr', avant: 'A', apres: 'B' },
          noms: { cle: { type: 'reglage', code: 'app.organisation_fr', nom_fr: 'Nom du pouvoir local en français', nom_nl: 'Naam van het lokaal bestuur in het Frans' } } },
        { ...ada, id: 193, created_at: '2026-11-08 07:02:00', action: 'piece.add', entity_type: 'piece', details: { type: 'image/jpeg', octets: 1000, brouillon: 1 } },
        { ...ada, id: 194, created_at: '2026-11-08 07:03:00', action: 'faq.create', entity_type: 'faq', details: { topic_id: 'mes-demandes', ticket: 'TCK-2026-00001' } },
        { ...ada, id: 195, created_at: '2026-11-08 07:04:00', action: 'ticket.resolved', entity_type: 'ticket', details: { motif_donne: 1 } },
        { ...ada, id: 196, created_at: '2026-11-08 07:05:00', action: 'role.grant', entity_type: 'user_role', details: { user_id: 4, entite_id: 1, role: 'gestionnaire' } },
        { ...ada, id: 197, created_at: '2026-11-08 07:06:00', action: 'horaire.update', entity_type: 'horaire', details: { jour: 1, avant: { debut: '08:00', fin: '16:30' }, apres: { debut: '07:45', fin: '16:15' } } },
        { ...ada, id: 198, created_at: '2026-11-08 07:07:00', action: 'lieu.update', entity_type: 'lieu', details: { code: 'AA-B1-L02', avant: { type_id: 2 }, apres: { type_id: 1 } },
          noms: { 'avant.type_id': { type: 'valeur', id: 2, code: 'salle_reunion', nom_fr: 'Salle de réunion', nom_nl: 'Vergaderzaal' }, 'apres.type_id': { type: 'valeur', id: 1, code: 'bureau', nom_fr: 'Bureau', nom_nl: 'Kantoor' } } },
        { ...ada, id: 199, created_at: '2026-11-08 07:08:00', action: 'jour_non_ouvre.create', entity_type: 'jour_non_ouvre', details: { nature: 'conge', mois_jour: '05-08', date_debut: null, date_fin: null } },
        { ...ada, id: 200, created_at: '2026-11-08 07:09:00', action: 'lieu.create', entity_type: 'lieu', details: { code: 'AA-B9', nature: 'batiment' } },
        // 0.14.0 : changement d'état d'une demande, motif nommé par le serveur.
        { ...ada, id: 202, created_at: '2026-11-08 07:11:00', action: 'demande.transition', entity_type: 'demande',
          details: { numero: 'AA-DI-2026-00009', de: 'qualifiee', vers: 'en_attente', motif_id: 41, commentaire_donne: 1, suspendu: 1, avant: { echeance_le: '2026-11-09 13:05:00' }, apres: { echeance_le: '2026-11-10 09:35:00' } },
          noms: { motif_id: { type: 'valeur', id: 41, code: 'piece', nom_fr: 'Pièce à commander', nom_nl: 'Onderdeel te bestellen', entite_code: 'AA' } } },
        // 0.16.1 (R4 de la recette 0.16.0) : regroupement ; état de départ traduit, principale nommée une seule fois.
        { ...ada, id: 203, created_at: '2026-11-08 07:12:00', action: 'demande.fusion', entity_type: 'demande',
          details: { numero: 'AA-DI-2026-00012', de: 'a_qualifier', principale_id: 77, principale_numero: 'AA-DI-2026-00011', personnes_reportees: 1, commentaire_donne: 0 },
          noms: { principale_id: { type: 'demande', id: 77, code: 'AA-DI-2026-00011' } } },
      ];
      (journal as unknown as Record<string, unknown>[]).push(...lignes);
      try {
        const { container } = render(wrap(JournalPage, lang));
        await screen.findAllByText(lang === 'fr' ? /Catégorie d'intervention modifiée/ : /Interventiecategorie gewijzigd/);
        container.querySelectorAll<HTMLButtonElement>('button.ant-table-row-expand-icon').forEach((b) => fireEvent.click(b));
        await waitFor(() => expect(container.querySelectorAll('.ant-descriptions-item-content').length).toBeGreaterThan(15));
        const cellules = [...container.querySelectorAll('.ant-descriptions-item-label, .ant-descriptions-item-content')].map((c) => c.textContent || '');
        const tout = cellules.join(' ¦ ');
        for (const a of attendus) expect(tout, a).toContain(a);
        // R4 : la principale d'un regroupement n'apparaît qu'une fois, sous « Demande principale ».
        expect(cellules.filter((c) => c === 'AA-DI-2026-00011')).toHaveLength(1);
        expect(cellules).toContain(lang === 'fr' ? 'Demande principale' : 'Hoofdaanvraag');
        expect(cellules).not.toContain(lang === 'fr' ? 'Demande principale (identifiant)' : 'Hoofdaanvraag (id)');
        expect(cellules, 'état de départ du regroupement traduit').toContain(lang === 'fr' ? 'À qualifier' : 'Te kwalificeren');
        for (const brut of ['a_qualifier', 'libelle_fr', 'app.organisation_fr', 'image/jpeg', 'mes-demandes', 'motif_donne', 'type_id', 'mois_jour', '05-08', 'conge', 'batiment', 'icone', 'salle_reunion', 'qualifiee', 'en_attente', 'commentaire_donne', 'motif_id', '41', 'echeance_le', '13:05:00']) {
          expect(cellules.some((c) => c.split(/[\s:·,()]+/).includes(brut)), brut).toBe(false);
        }
      } finally { journal.splice(journal.length - lignes.length, lignes.length); }
    });
  }
});

describe('textes et accessibilité (0.13.0, point 3 ; D5, D7, M4)', () => {
  it('D5 : délai au singulier pour 1, au pluriel sinon, en FR et en NL', async () => {
    const { texteDelai } = await import('../components/referentiel/PrioritesTab');
    const tr = (lang: 'fr' | 'nl') => (k: string) => translations[k]?.[lang] ?? k;
    expect(texteDelai(tr('fr'), 1, 'heures_calendaires')).toBe('1 heure calendaire');
    expect(texteDelai(tr('fr'), 4, 'heures_calendaires')).toBe('4 heures calendaires');
    expect(texteDelai(tr('fr'), 1, 'jours_ouvrables')).toBe('1 jour ouvrable');
    expect(texteDelai(tr('fr'), 1, 'heures_ouvrables')).toBe('1 heure ouvrable');
    expect(texteDelai(tr('nl'), 1, 'jours_ouvrables')).toBe('1 werkdag');
    expect(texteDelai(tr('nl'), 2, 'jours_ouvrables')).toBe('2 werkdagen');
    expect(texteDelai(tr('nl'), 1, 'heures_calendaires')).toBe('1 kalenderuur');
    expect(texteDelai(tr('fr'), null, 'jours_ouvrables')).toBe(translations['ref.prio.convenue'].fr);
    for (const k of ['gest.total', 'gest.total.un', 'demande.pieces.trop', 'demande.pieces.trop.un']) {
      expect(`${translations[k].fr} ${translations[k].nl}`, k).not.toMatch(/\((s|en)\)|\//);
    }
  });

  it('D7 : retrait d’un rôle sans motif : message sous le champ, focus sur le champ, rien d’envoyé', async () => {
    const appels = () => (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
    render(wrap(UsersPage, 'fr'));
    await screen.findByText('Microsoft');
    fireEvent.click(screen.getAllByRole('button', { name: 'Rôles' })[0]);
    const tiroir = await screen.findByRole('dialog');
    const cases = within(tiroir).getAllByRole('checkbox', { name: 'Responsable du service technique' });
    const cochee = cases.find((c) => (c as HTMLInputElement).checked) as HTMLElement;
    fireEvent.click(cochee);
    const avant = appels().length;
    fireEvent.click(within(tiroir).getByRole('button', { name: 'Enregistrer' }));
    const champ = await within(tiroir).findByLabelText('Motif du retrait des rôles décochés');
    const erreur = await within(tiroir).findByText('Un motif est demandé pour retirer un rôle');
    expect(erreur.closest('[role="alert"]')).toBeTruthy();
    expect(champ).toHaveAttribute('aria-invalid', 'true');
    expect(champ.getAttribute('aria-describedby')).toBe(erreur.closest('[id]')?.id);
    expect(document.activeElement).toBe(champ);
    expect(appels().slice(avant).some(([, o]) => o?.method && o.method !== 'GET')).toBe(false);
    fireEvent.change(champ, { target: { value: 'Fin du remplacement' } });
    expect(within(tiroir).queryByText('Un motif est demandé pour retirer un rôle')).toBeNull();
  });

  it('M4 : une question de la FAQ propre à une entité dit « Entité AA seulement », plus « L’entité AA »', async () => {
    (faqLocale as unknown as Record<string, unknown>[]).push({ id: 9, entite_id: 1, entite_code: 'AA', topic_id: null, question_fr: 'Où garer le vélo ?', question_nl: 'Waar de fiets stallen?', answer_fr: 'Au local vélo.', answer_nl: 'In het fietslokaal.', is_active: 1, motif_desactivation: null, can_manage: true, source_ticket_reference: null });
    try {
      render(wrap(HelpPage, 'fr', FALLBACK_SETTINGS, ['/help?onglet=faq']));
      fireEvent.click(await screen.findByText('Où garer le vélo ?'));
      expect(await screen.findByText(/Entité AA seulement/)).toBeInTheDocument();
      expect(screen.queryByText(/L'entité AA/)).toBeNull();
      fireEvent.click(screen.getByText('Qui contacter le week-end ?'));
      expect(await screen.findByText(/Commune aux deux entités/)).toBeInTheDocument();
    } finally { faqLocale.splice(faqLocale.findIndex((f) => f.id === 9), 1); }
  });
});

describe('aide et FAQ (0.13.0, point 4 ; M1, M2, M3 de la recette de la 0.12.0)', () => {
  it('M1 : impression : captures chargées d’emblée, impression lancée une seule fois, une fois la FAQ et les notes reçues', async () => {
    const impression = vi.spyOn(window, 'print').mockImplementation(() => {});
    // jsdom ne charge pas les images : elles sont dites chargées, comme dans le navigateur une fois reçues.
    const complete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete');
    Object.defineProperty(HTMLImageElement.prototype, 'complete', { configurable: true, get: () => true });
    try {
      const { container } = render(wrap(HelpPage, 'fr', FALLBACK_SETTINGS, ['/help?print=1']));
      await waitFor(() => expect(impression).toHaveBeenCalledTimes(1), { timeout: 5000 });
      const images = [...container.querySelectorAll('img.help-shot')];
      expect(images.length).toBeGreaterThan(0);
      expect(images.every((i) => i.getAttribute('loading') === 'eager')).toBe(true);
      const appels = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls.map((c) => c[0]);
      expect(appels.some((u) => u.startsWith('/api/faq'))).toBe(true);
      expect(appels.some((u) => u.startsWith('/api/notes-version'))).toBe(true);
      await new Promise((r) => setTimeout(r, 400));
      expect(impression).toHaveBeenCalledTimes(1);
    } finally {
      impression.mockRestore();
      if (complete) Object.defineProperty(HTMLImageElement.prototype, 'complete', complete);
    }
  }, 15000);

  it('M1 : à l’écran, les captures restent chargées au fil du défilement', async () => {
    const { container } = render(wrap(HelpPage, 'fr', FALLBACK_SETTINGS, ['/help?fiche=journal']));
    await waitFor(() => expect(container.querySelectorAll('img.help-shot').length).toBeGreaterThan(0));
    expect([...container.querySelectorAll('img.help-shot')].every((i) => i.getAttribute('loading') === 'lazy')).toBe(true);
  });

  it('M2 : « Ajouter à la FAQ » préremplit la dernière réponse du service, pas le motif de la clôture', async () => {
    const { reponseDuService } = await import('../help/FaqModal');
    const base = { id: 7, reference: 'TCK-2026-00007', title: 'Comment changer la catégorie ?', resolution: 'Réponse donnée', requester_id: 5 };
    const m = (body: string, author_id: number, is_internal = 0, kind = 'message') => ({ kind, body, is_internal, author_id });
    expect(reponseDuService({ ...base, messages: [m('Je ne trouve pas le menu', 5), m('Ouvrez la fiche, puis Catégorie.', 1), m('Note pour l’équipe', 1, 1), m('Réponse donnée', 1), m('resolved', 1, 0, 'event')] }))
      .toBe('Ouvrez la fiche, puis Catégorie.');
    expect(reponseDuService({ ...base, messages: [m('Je ne trouve pas le menu', 5), m('Réponse donnée', 1)] })).toBe('Réponse donnée');
    expect(reponseDuService({ ...base, resolution: null, messages: [] })).toBe('');
    ticketDetail = { ...ticketBase, status: 'resolved', resolution: 'Réponse donnée', can_faq: true, requester_id: 5,
      messages: [{ id: 2, kind: 'message', body: 'Menu Catégorie, puis Enregistrer.', is_internal: 0, created_at: '2026-11-05 11:00:00', author_name: 'Service', author_id: 1 },
        { id: 3, kind: 'message', body: 'Réponse donnée', is_internal: 0, created_at: '2026-11-05 11:05:00', author_name: 'Service', author_id: 1 }] };
    try {
      render(wrap(TicketsPage, 'fr', FALLBACK_SETTINGS, ['/tickets?id=7']));
      fireEvent.click(await screen.findByRole('button', { name: 'Ajouter à la FAQ' }));
      await screen.findByText(/La question deviendra une entrée de la FAQ de AA/);
      expect(within(dernierDialogue()).getByLabelText('Réponse en français')).toHaveValue('Menu Catégorie, puis Enregistrer.');
    } finally { ticketDetail = { ...ticketBase }; }
  });

  it('M3 : l’onglet Questions fréquentes montre aussi une question rattachée à un écran, avec le nom de l’écran (FR et NL)', async () => {
    render(wrap(HelpPage, 'fr', FALLBACK_SETTINGS, ['/help?onglet=faq']));
    expect(await screen.findByText('Où voir la réponse à ma question ?')).toBeInTheDocument();
    expect(screen.getByText('Écran : Tickets')).toBeInTheDocument();
    cleanupAll();
    render(wrap(HelpPage, 'nl', FALLBACK_SETTINGS, ['/help?onglet=faq']));
    expect(await screen.findByText('Scherm: Tickets')).toBeInTheDocument();
  });
});

describe('Patrimoine : filtre « Sans photo » (0.13.0, point 6, DV-101)', () => {
  const Ici = () => { const l = useLocation(); return <p data-testid="adresse">{l.search}</p>; };
  const rendre = (lang: 'fr' | 'nl', entree: string) => render(
    <SettingsProvider value={{ settings: FALLBACK_SETTINGS, reload: async () => {} }}>
      <I18nProvider defaultLang={lang}><MemoryRouter initialEntries={[entree]}><PatrimoinePage /><Ici /></MemoryRouter></I18nProvider>
    </SettingsProvider>);

  it('filtre dans l’adresse : seuls les lieux actifs sans photo, avec leur nombre et leur marque ; le lieu choisi garde le filtre', async () => {
    const { container } = rendre('fr', '/patrimoine?photo=sans');
    const filtre = await screen.findByRole('checkbox', { name: 'Sans photo (3)' });
    expect(filtre).toBeChecked();
    await screen.findByText('AA-B1');
    expect(screen.queryByText('AA-B1-L02')).toBeNull();
    expect(screen.getAllByText('Sans photo')).toHaveLength(3);
    fireEvent.click(screen.getByText('AA-B1'));
    await waitFor(() => expect(screen.getByTestId('adresse').textContent).toContain('lieu=2'));
    expect(screen.getByTestId('adresse').textContent).toContain('photo=sans');
    fireEvent.click(filtre);
    await waitFor(() => expect(screen.queryAllByText('Sans photo')).toHaveLength(0));
    expect(screen.getByRole('checkbox', { name: 'Sans photo (3)' })).not.toBeChecked();
    expect(screen.getByTestId('adresse').textContent).not.toContain('photo=');
    expect(screen.getByTestId('adresse').textContent).toContain('lieu=2');
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it('en néerlandais', async () => {
    rendre('nl', '/patrimoine?photo=sans');
    expect(await screen.findByRole('checkbox', { name: 'Zonder foto (3)' })).toBeChecked();
    expect((await screen.findAllByText('Zonder foto')).length).toBe(3);
  });
});

describe('services et valideurs (0.16.0, point 2 ; ROL-04)', () => {
  let appels: { url: string; method: string; body: Record<string, unknown> }[] = [];
  let reponse: { status: number; json: unknown } | null = null;
  beforeEach(() => {
    appels = [];
    reponse = null;
    const avant = globalThis.fetch as unknown as (u: string, i?: RequestInit) => Promise<unknown>;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method && init.method !== 'GET') {
        appels.push({ url, method: init.method, body: JSON.parse(String(init.body || '{}')) });
        if (reponse) { const r = reponse; return { ok: r.status < 400, status: r.status, statusText: 'x', json: async () => r.json }; }
        return { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: servicesListe[0], meta: { envelope: 1 } }) };
      }
      if (url.startsWith('/api/users')) return { ok: true, status: 200, statusText: 'OK', json: async () => page([...users.map((u) => ({ ...u, service_id: null })), ...chefs]) };
      return avant(url, init);
    }));
  });

  it('liste par entité : chef, suppléant, membres, service désactivé ; candidats : rôle « Valideur » dans l’entité seulement', async () => {
    render(wrap(ServicesPage, 'fr'));
    expect(await screen.findByRole('button', { name: 'Secrétariat' })).toBeInTheDocument();
    expect(screen.getByText('Valérie Chef')).toBeInTheDocument();
    expect(screen.getByText('Pas de valideur')).toBeInTheDocument();
    expect(screen.getByText('Désactivé')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Secrétariat' }));
    const d = await screen.findByRole('dialog');
    expect((within(d).getByLabelText('Code') as HTMLInputElement).value).toBe('SEC');
    expect(within(d).getByText('Membres (1)')).toBeInTheDocument();
    fireEvent.mouseDown(within(d).getByLabelText('Suppléant'));
    expect(await screen.findByTitle('Sam Suppléant')).toBeInTheDocument();
    expect(screen.queryByTitle('Odile AutreEntite'), 'valideur de l’autre entité absent').toBeNull();
    expect(screen.queryByTitle('Ada Admin'), 'sans le rôle : absent').toBeNull();
  });

  it('suppléant : les deux dates sont exigées ; enregistrement avec la période au format du serveur', async () => {
    render(wrap(ServicesPage, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: 'Secrétariat' }));
    const d = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(d).getByLabelText('Suppléant'));
    fireEvent.click(await screen.findByTitle('Sam Suppléant'));
    fireEvent.click(within(d).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(within(d).getAllByText('Ce champ est obligatoire').length).toBe(2));
    expect(appels.length).toBe(0);
  });

  it('un refus du serveur s’affiche dans le volet, la saisie reste ; désactivation : motif exigé', async () => {
    reponse = { status: 409, json: { error: { code: 'VALIDEUR_SANS_ROLE', message: 'Cette personne ne peut pas valider.' }, meta: { envelope: 1 } } };
    render(wrap(ServicesPage, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: 'Secrétariat' }));
    const d = await screen.findByRole('dialog');
    fireEvent.change(within(d).getByLabelText('Nom en français'), { target: { value: 'Secrétariat communal' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(appels.find((a) => a.url === '/api/services/3')?.body).toEqual({ code: 'SEC', nom_fr: 'Secrétariat communal', nom_nl: 'Secretariaat', valideur_id: 5, suppleant_id: null }));
    expect(await within(d).findByRole('alert')).toBeInTheDocument();
    expect((within(d).getByLabelText('Nom en français') as HTMLInputElement).value).toBe('Secrétariat communal');
    reponse = null;
    fireEvent.click(within(d).getByRole('button', { name: 'Désactiver' }));
    const champ = await screen.findByLabelText('Motif de la désactivation');
    const m = champ.closest('.ant-modal') as HTMLElement;
    const ok = within(m).getAllByRole('button', { name: 'Désactiver' }).slice(-1)[0];
    expect(ok).toBeDisabled();
    fireEvent.change(within(m).getByLabelText('Motif de la désactivation'), { target: { value: 'Service fusionné' } });
    fireEvent.click(ok);
    await waitFor(() => expect(appels.find((a) => a.method === 'DELETE')).toEqual({ url: '/api/services/3', method: 'DELETE', body: { motif: 'Service fusionné' } }));
  });

  it('journal : chef de service nommé, circuit d’une demande dit en clair', async () => {
    const lignes = [
      { id: 301, created_at: '2026-11-10 08:00:00', action: 'service.create', entity_type: 'service', entity_id: 3, channel: 'api', entite_id: 1, entite_code: 'AA',
        user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin', details: { code: 'SEC', valideur_id: 5 },
        noms: { valideur_id: { type: 'personne', id: 5, code: 'chef@exemple.test', nom_fr: 'Valérie Chef', nom_nl: 'Valérie Chef', entite_code: null } } },
      { id: 302, created_at: '2026-11-10 08:05:00', action: 'demande.create', entity_type: 'demande', entity_id: 9, channel: 'api', entite_id: 1, entite_code: 'AA',
        user_id: 7, user_email: 'x@exemple.test', user_first_name: 'Xavier', user_last_name: 'X', details: { numero: 'AA-DI-2026-00009', validation: 'sans_valideur' }, noms: {} },
    ];
    (journal as unknown as Record<string, unknown>[]).push(...lignes);
    try {
      const { container } = render(wrap(JournalPage, 'fr'));
      await screen.findByText(/Service ajouté/);
      container.querySelectorAll<HTMLButtonElement>('button.ant-table-row-expand-icon').forEach((b) => fireEvent.click(b));
      expect(await screen.findByText('Valérie Chef (chef@exemple.test)')).toBeInTheDocument();
      expect(screen.getByText(/Sans valideur : envoyée au service technique/)).toBeInTheDocument();
      expect(screen.getByText(/Service ajouté/)).toBeInTheDocument();
    } finally { (journal as unknown as unknown[]).splice(-2, 2); }
  });

  it('Utilisateurs et rôles : service de l’entité de rattachement, enregistré avec les rôles', async () => {
    render(wrap(UsersPage, 'fr'));
    expect(await screen.findByText('Service : Secrétariat')).toBeInTheDocument();
    const ligne = screen.getByText(/Sam/).closest('tr') as HTMLElement;
    fireEvent.click(within(ligne).getByRole('button', { name: /rôles/i }));
    const d = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(d).getByRole('combobox', { name: 'Service' }));
    expect(await screen.findByTitle('Secrétariat (SEC)')).toBeInTheDocument();
    expect(screen.queryByTitle('Personnel (RH)'), 'service désactivé non proposé').toBeNull();
    fireEvent.click(screen.getByTitle('Secrétariat (SEC)'));
    fireEvent.click(within(d).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(appels.find((a) => a.url === '/api/users/6')?.body).toEqual({ service_id: 3 }));
  });
});

describe('cloche de notifications (0.17.0, étape 13, point 1 ; NOT-01, NOT-02)', () => {
  const appels = () => (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls.map(([url, init]) => ({ url, method: init?.method || 'GET' }));

  it('en-tête : la cloche dit le nombre de non lues ; le volet liste les notifications, les non lues annoncées', async () => {
    const { container } = render(wrap(AppLayout, 'fr'));
    const cloche = await screen.findByRole('button', { name: 'Notifications, 2 non lues' });
    fireEvent.click(cloche);
    const d = await screen.findByRole('dialog', { name: 'Notifications' });
    const liste = await within(d).findByRole('list', { name: 'Notifications' });
    expect(within(liste).getAllByRole('button')).toHaveLength(3);
    expect(within(liste).getByRole('button', { name: /^Non lue : Votre demande AA-DI-2026-00012 est bien reçue/ })).toBeInTheDocument();
    expect(within(liste).getByRole('button', { name: /^Votre demande AA-DI-2026-00010/ })).toBeInTheDocument();
    expect(within(d).getByText('Vous avez 1 notification non lue dans une autre entité : choisissez-la en haut de l\'écran pour la voir.')).toBeInTheDocument();
    const r = await axe.run(container.ownerDocument.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')}`)).toEqual([]);
  });

  it('ouvrir une notification non lue la marque lue et ferme le volet ; « Tout marquer comme lu » ; filtre « Non lues »', async () => {
    render(wrap(AppLayout, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: 'Notifications, 2 non lues' }));
    const d = await screen.findByRole('dialog', { name: 'Notifications' });
    fireEvent.click(within(d).getByRole('radio', { name: 'Non lues (2)' }));
    await waitFor(() => expect(appels().some((a) => a.url.startsWith('/api/notifications?') && a.url.includes('non_lues=1'))).toBe(true));
    await waitFor(() => expect(within(d).getAllByRole('button', { name: /^Non lue :/ })).toHaveLength(2));
    fireEvent.click(within(d).getByRole('button', { name: 'Tout marquer comme lu' }));
    await waitFor(() => expect(appels().some((a) => a.url === '/api/notifications/lues' && a.method === 'PUT')).toBe(true));
    fireEvent.click(within(d).getAllByRole('button', { name: /AA-DI-2026-00012/ })[0]);
    await waitFor(() => expect(appels().some((a) => a.url === '/api/notifications/12/lue' && a.method === 'PUT')).toBe(true));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Notifications' })).toBeNull());
  });

  it('en néerlandais ; sans non lue, la cloche n’annonce pas de nombre et « Tout marquer comme lu » est grisé ; relue au retour sur l’onglet', async () => {
    compteurNotifs = { non_lues: 0, autres_entites: 0 };
    render(wrap(AppLayout, 'nl'));
    const cloche = await screen.findByRole('button', { name: 'Meldingen' });
    const avant = appels().filter((a) => a.url === '/api/notifications/compteur').length;
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(appels().filter((a) => a.url === '/api/notifications/compteur').length).toBeGreaterThan(avant));
    fireEvent.click(cloche);
    const d = await screen.findByRole('dialog', { name: 'Meldingen' });
    expect(await within(d).findByRole('button', { name: /Uw aanvraag AA-DI-2026-00012/ })).toBeInTheDocument();
    expect(within(d).getByRole('button', { name: 'Alles als gelezen markeren' })).toBeDisabled();
    expect(within(d).queryByText(/andere entiteit/)).toBeNull();
  });
});

describe('Paramètres › Courriel (0.17.0, étape 13, point 2 ; NOT-02, NOT-04)', () => {
  const appels = () => (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls.map(([url, init]) => ({ url, method: init?.method || 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined }));

  for (const lang of ['fr', 'nl'] as const) {
    it(`onglet Courriel (${lang}) sans violation axe-core ; mode test annoncé « simulé »`, async () => {
      const { container } = render(wrap(ParametresPage, lang, FALLBACK_SETTINGS, ['/parametres?onglet=courriel']));
      expect(await screen.findByText(lang === 'fr' ? 'Mode test (simulé) : aucun courriel ne part.' : 'Testmodus (gesimuleerd): er vertrekt geen enkele e-mail.')).toBeInTheDocument();
      await screen.findByText('agent@exemple.test');
      const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')}`)).toEqual([]);
    });
  }

  it('journal : un courriel retenu s’ouvre avec son texte et la mention « Simulé » ; essai en mode test retenu', async () => {
    render(wrap(ParametresPage, 'fr', FALLBACK_SETTINGS, ['/parametres?onglet=courriel']));
    fireEvent.click(await screen.findByRole('button', { name: 'Courriel d’essai de GMAO' }));
    const d = await screen.findByRole('dialog', { name: 'Courriel d’essai de GMAO' });
    expect(await within(d).findByText(/Ce courriel confirme que GMAO peut envoyer des courriels/)).toBeInTheDocument();
    expect(within(d).getByText('Simulé : ce courriel n’est pas parti (mode test).')).toBeInTheDocument();
    fireEvent.click(within(d).getByRole('button', { name: 'Fermer' }));
    fireEvent.click(screen.getByRole('button', { name: /Envoyer un courriel d’essai/ }));
    await waitFor(() => expect(appels().find((a) => a.url === '/api/settings/courriel/essai')?.body).toEqual({}));
    expect(await screen.findByText('Mode test : le courriel pour a@exemple.test est retenu dans le journal, rien n’est parti.')).toBeInTheDocument();
  });

  it('envoi réel : serveur et expéditeur exigés avant l’envoi ; mot de passe vide non envoyé ; essai en échec expliqué', async () => {
    render(wrap(ParametresPage, 'fr', FALLBACK_SETTINGS, ['/parametres?onglet=courriel']));
    fireEvent.click(await screen.findByText('Envoi réel (SMTP)'));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(screen.getAllByText('Ce champ est obligatoire')).toHaveLength(2));
    expect(appels().some((a) => a.url === '/api/settings/courriel' && a.method === 'PUT')).toBe(false);
    fireEvent.change(screen.getByLabelText('Serveur SMTP'), { target: { value: 'smtp.exemple.be' } });
    fireEvent.change(screen.getByLabelText('Adresse de l’expéditeur'), { target: { value: 'gmao@exemple.be' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(appels().find((a) => a.url === '/api/settings/courriel' && a.method === 'PUT')?.body).toMatchObject({ mode: 'smtp', host: 'smtp.exemple.be', from: 'gmao@exemple.be', port: 587 }));
    expect(appels().find((a) => a.url === '/api/settings/courriel' && a.method === 'PUT')?.body.password).toBeUndefined();
    essaiReponse = { id: 6, mode: 'smtp', resultat: 'echec', erreur: 'EAUTH', destinataire: 'a@exemple.test' };
    fireEvent.click(screen.getByRole('button', { name: /Envoyer un courriel d’essai/ }));
    expect(await screen.findByText('Le courriel pour a@exemple.test n’est pas parti.')).toBeInTheDocument();
    expect(screen.getByText('EAUTH : le serveur refuse le compte ou le mot de passe.')).toBeInTheDocument();
  });
});

describe('Paramètres › Courriel › Modèles de courriel (0.17.0, étape 13, point 3 ; NOT-04, LNG-05)', () => {
  const appels = () => (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls.map(([url, init]) => ({ url, method: init?.method || 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined }));

  it('liste « Texte livré » ou « Modifié » ; fiche FR et NL ; aperçu du texte en cours, en néerlandais, sans enregistrer', async () => {
    render(wrap(ParametresPage, 'fr', FALLBACK_SETTINGS, ['/parametres?onglet=courriel']));
    const liste = (await screen.findByText('Modèles de courriel')).closest('.ant-card') as HTMLElement;
    await within(liste).findByText('Texte livré');
    expect(within(liste).getByText('Texte livré')).toBeInTheDocument();
    expect(within(liste).getByText('Modifié')).toBeInTheDocument();
    fireEvent.click(within(liste).getByRole('button', { name: 'Accusé de réception d’une demande' }));
    const d = await screen.findByRole('dialog', { name: 'Accusé de réception d’une demande' });
    expect(within(d).getByLabelText('Sujet en néerlandais')).toHaveValue('Aanvraag {numero} ontvangen');
    expect(within(d).getByText(/\{numero\}\s+\{lieu\}/)).toBeInTheDocument();
    fireEvent.change(within(d).getByLabelText('Texte en néerlandais'), { target: { value: 'Uw aanvraag {numero}.' } });
    fireEvent.click(within(d).getByRole('button', { name: /Aperçu en néerlandais/ }));
    await waitFor(() => expect(appels().find((a) => a.url === '/api/modeles-courriel/demande.recue/apercu')?.body).toEqual({ langue: 'nl', sujet: 'Aanvraag {numero} ontvangen', corps: 'Uw aanvraag {numero}.' }));
    expect(await within(d).findByText('Aanvraag AC-DI-2026-00042 ontvangen')).toBeInTheDocument();
    expect(within(d).getByText(/Automatische e-mail van GMAO/)).toBeInTheDocument();
    expect(appels().some((a) => a.url === '/api/modeles-courriel/demande.recue' && a.method === 'PUT')).toBe(false);
  });

  it('enregistrer : refus du serveur affiché dans la fiche ; puis enregistré ; « Rétablir le texte livré » après confirmation', async () => {
    render(wrap(ParametresPage, 'fr', FALLBACK_SETTINGS, ['/parametres?onglet=courriel']));
    fireEvent.click(await screen.findByRole('button', { name: 'Demande en retard' }));
    const d = await screen.findByRole('dialog', { name: 'Demande en retard' });
    expect(within(d).getByText(/Modifié le 16\/11\/2026 à 11:00 par Ada Admin/)).toBeInTheDocument();
    modeleReponse = { status: 409, json: { error: true, code: 'MODELE_VARIABLE', message: 'Variable inconnue dans le modèle : {prenom}.' } };
    fireEvent.change(within(d).getByLabelText('Texte en français'), { target: { value: 'Bonjour {prenom}, {numero}' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Enregistrer' }));
    expect(await within(d).findByText('Variable inconnue dans le modèle : {prenom}.')).toBeInTheDocument();
    modeleReponse = null;
    fireEvent.change(within(d).getByLabelText('Texte en français'), { target: { value: 'Retard : {numero}' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(appels().filter((a) => a.url === '/api/modeles-courriel/demande.retard' && a.method === 'PUT').slice(-1)[0]?.body).toMatchObject({ corps_fr: 'Retard : {numero}' }));
    fireEvent.click(await within(d).findByRole('button', { name: /Rétablir le texte livré/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Rétablir le texte livré' }));
    await waitFor(() => expect(appels().some((a) => a.url === '/api/modeles-courriel/demande.recue/retablir' || a.url === '/api/modeles-courriel/demande.retard/retablir')).toBe(true));
  });
});

// Recherche globale de l'en-tête (0.18.0, point 1, ERG-04) : listes existantes interrogées selon les droits, sans route nouvelle.
describe('recherche globale (0.18.0, point 1 ; ERG-04)', () => {
  const dem = (id: number, numero: string, etat: string, extra: Record<string, unknown> = {}) => ({ id, entite_id: 1, numero, etat, lieu_code: 'AA-B1-L02',
    lieu_nom_fr: 'Salle du conseil', lieu_nom_nl: 'Raadzaal', etat_libelle_fr: null, etat_libelle_nl: null, ...extra });
  const miennes = [dem(12, 'AA-DI-2026-00012', 'a_qualifier')];
  const entiteListe = [dem(12, 'AA-DI-2026-00012', 'a_qualifier'), dem(14, 'AA-DI-2026-00014', 'qualifiee')];
  const urls = () => (fetch as unknown as { mock: { calls: [string][] } }).mock.calls.map(([u]) => u);
  const avecRecherche = () => {
    const base = fetch as unknown as (u: string, i?: RequestInit) => Promise<unknown>;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const rep = (data: unknown[]) => ({ ok: true, status: 200, statusText: 'OK', json: async () => page(data) });
      if (url.startsWith('/api/demandes?') && url.includes('q=')) {
        if (url.includes('q=rien')) return rep([]);
        return rep(url.includes('perimetre=entite') ? entiteListe : miennes);
      }
      if (url.startsWith('/api/lieux?') && url.includes('q=')) return rep(url.includes('q=rien') ? [] : [local]);
      return base(url, init);
    }));
  };
  const Ici = () => { const l = useLocation(); return <p data-testid="adresse-recherche">{`${l.pathname}${l.search}`}</p>; };
  const rendre = (lang: 'fr' | 'nl') => render(
    <SettingsProvider value={{ settings: FALLBACK_SETTINGS, reload: async () => {} }}>
      <I18nProvider defaultLang={lang}><MemoryRouter initialEntries={['/']}>
        <Routes><Route element={<AppLayout />}><Route path="*" element={<Ici />} /></Route></Routes>
      </MemoryRouter></I18nProvider>
    </SettingsProvider>,
  );

  it('sansDoublons : une demande de « Mes demandes » n’est pas répétée dans celles de l’entité', () => {
    const r = sansDoublons({ miennes: miennes as never, entite: entiteListe as never, lieux: [] });
    expect(r.entite.map((d) => d.id)).toEqual([14]);
  });

  it('avec « demandes:entite » : trois groupes, doublon retiré, un résultat ouvre sa fiche et ferme la fenêtre ; sans violation axe-core', async () => {
    const gestionnaire = roles.find((r) => r.code === 'gestionnaire')!;
    gestionnaire.permissions.push('demandes:entite');
    try {
      avecRecherche();
      const { container } = rendre('fr');
      fireEvent.click(await screen.findByRole('button', { name: 'Rechercher' }));
      const d = await screen.findByRole('dialog', { name: 'Rechercher une demande ou un lieu' });
      const champ = within(d).getByRole('textbox', { name: 'Rechercher une demande ou un lieu' });
      fireEvent.change(champ, { target: { value: 'f' } });
      expect(within(d).getByText('Tapez au moins 2 caractères.')).toBeInTheDocument();
      await new Promise((ok) => setTimeout(ok, 400));
      expect(urls().some((u) => u.startsWith('/api/demandes?') && u.includes('q=')), 'rien sous 2 caractères').toBe(false);
      fireEvent.change(champ, { target: { value: 'conseil' } });
      const mes = await within(d).findByRole('region', { name: 'Mes demandes' });
      expect(within(mes).getByText('AA-DI-2026-00012')).toBeInTheDocument();
      expect(within(mes).getByText('Reçue par le service technique')).toBeInTheDocument();
      const ent = within(d).getByRole('region', { name: "Demandes de l'entité" });
      expect(within(ent).queryByText('AA-DI-2026-00012'), 'doublon retiré').toBeNull();
      expect(within(ent).getByText('AA-DI-2026-00014')).toBeInTheDocument();
      expect(within(ent).getByText('Qualifiée')).toBeInTheDocument();
      const pat = within(d).getByRole('region', { name: 'Patrimoine' });
      expect(within(pat).getByText('AA-B1-L02 · Salle du conseil')).toBeInTheDocument();
      expect(urls().some((u) => u.includes('perimetre=miennes') && u.includes('q=conseil') && u.includes('limit=5'))).toBe(true);
      expect(urls().some((u) => u.includes('perimetre=entite') && u.includes('q=conseil'))).toBe(true);
      expect(urls().some((u) => u.startsWith('/api/lieux?') && u.includes('q=conseil'))).toBe(true);
      const r = await axe.run(container.ownerDocument.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')}`)).toEqual([]);
      fireEvent.click(within(ent).getByRole('button', { name: /AA-DI-2026-00014/ }));
      await waitFor(() => expect(screen.getByTestId('adresse-recherche').textContent).toBe('/demandes-entite?demande=14'));
            // Fenêtre fermée et remise à zéro : rouverte, elle est vide (dans jsdom, rc-dialog garde le contenu figé pendant
      // l'animation de fermeture, qui ne se termine pas).
      fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));
      await waitFor(() => expect(within(dernierDialogue()).getByRole('textbox', { name: 'Rechercher une demande ou un lieu' })).toHaveValue(''));
      expect(within(dernierDialogue()).getByText('Tapez au moins 2 caractères.')).toBeInTheDocument();
    } finally {
      gestionnaire.permissions.splice(gestionnaire.permissions.indexOf('demandes:entite'), 1);
    }
  });

  it('sous 360 px : pas de loupe dans l’en-tête, « Rechercher » en tête du menu latéral ouvre la même fenêtre', async () => {
    const avant = window.matchMedia;
    window.matchMedia = ((query: string) => ({ ...avant(query), matches: query === '(max-width: 359px)' })) as typeof window.matchMedia;
    try {
      avecRecherche();
      rendre('fr');
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvrir ou fermer le menu' }));
      const bouton = await screen.findByRole('button', { name: 'Rechercher' });
      expect(bouton.closest('header'), 'hors de l’en-tête').toBeNull();
      expect(bouton.closest('.ant-drawer'), 'dans le menu latéral').not.toBeNull();
      fireEvent.click(bouton);
      const d = await screen.findByRole('dialog', { name: 'Rechercher une demande ou un lieu' });
      fireEvent.change(within(d).getByRole('textbox', { name: 'Rechercher une demande ou un lieu' }), { target: { value: 'conseil' } });
      expect(await within(d).findByRole('region', { name: 'Mes demandes' })).toBeInTheDocument();
    } finally { window.matchMedia = avant; }
  });

  it('en néerlandais, sans « demandes:entite » ni Patrimoine : la liste de l’entité et les lieux ne sont pas interrogés ; Entrée ouvre le premier résultat', async () => {
    modules = modulesActifs.map((m) => (m.code === 'patrimoine' ? { ...m, actif: false } : m));
    reloadModules();
    try {
      avecRecherche();
      rendre('nl');
      fireEvent.click(await screen.findByRole('button', { name: 'Zoeken' }));
      const d = await screen.findByRole('dialog', { name: 'Een aanvraag of een plaats zoeken' });
      const champ = within(d).getByRole('textbox', { name: 'Een aanvraag of een plaats zoeken' });
      fireEvent.change(champ, { target: { value: 'rien' } });
      expect(await within(d).findByText('Geen resultaten')).toBeInTheDocument();
      fireEvent.change(champ, { target: { value: 'raad' } });
      expect(await within(d).findByRole('region', { name: 'Mijn aanvragen' })).toBeInTheDocument();
      expect(urls().some((u) => u.includes('perimetre=entite')), 'liste de l’entité non interrogée').toBe(false);
      expect(urls().some((u) => u.startsWith('/api/lieux?') && u.includes('q=')), 'lieux non interrogés').toBe(false);
      fireEvent.keyDown(champ, { key: 'Enter' });
      await waitFor(() => expect(screen.getByTestId('adresse-recherche').textContent).toBe('/demandes?demande=12'));
    } finally {
      reloadModules();
    }
  });
});

// Export des listes (0.18.0, point 2, IMP-03) : fichier produit par le serveur avec les filtres affichés.
describe('bouton « Exporter » (0.18.0, point 2 ; IMP-03)', () => {
  it('adresseExport : filtres gardés, pagination retirée, format ajouté', () => {
    expect(adresseExport('/demandes/export', { perimetre: 'entite', etats: 'a_qualifier,rouverte', q: undefined, limit: 20, offset: 40 }, 'csv'))
      .toBe('/demandes/export?perimetre=entite&etats=a_qualifier%2Crouverte&format=csv');
  });

  it('Excel : appelle l’export avec les filtres, remet le fichier sous le nom du serveur ; une erreur s’affiche', async () => {
    const base = fetch as unknown as (u: string, i?: RequestInit) => Promise<unknown>;
    const appelsExport: string[] = [];
    let reponse: 'ok' | 'trop' = 'ok';
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (!url.includes('/export')) return base(url, init);
      appelsExport.push(url);
      return reponse === 'ok'
        ? { ok: true, status: 200, headers: new Headers({ 'Content-Disposition': 'attachment; filename="tickets-AA-2026-11-17.xlsx"' }), blob: async () => new Blob(['x']) }
        : { ok: false, status: 400, statusText: 'Bad Request', headers: new Headers(), json: async () => ({ error: true, code: 'EXPORT_TROP', message: 'Plus de 5 000 lignes : affinez les filtres avant d’exporter.' }) };
    }));
    const creer = vi.fn(() => 'blob:fictif');
    const revoquer = vi.fn();
    Object.assign(URL, { createObjectURL: creer, revokeObjectURL: revoquer });
    const cliques: string[] = [];
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { cliques.push(this.download); });
    try {
      render(wrap(TicketsPage, 'fr'));
      fireEvent.click(await screen.findByRole('button', { name: /Exporter/ }));
      fireEvent.click(await screen.findByText('Excel (.xlsx)'));
      await waitFor(() => expect(cliques).toEqual(['tickets-AA-2026-11-17.xlsx']));
      expect(appelsExport[0]).toBe('/api/tickets/export?open_only=true&format=xlsx');
      expect(creer).toHaveBeenCalled();
      reponse = 'trop';
      fireEvent.click(screen.getByRole('button', { name: /Exporter/ }));
      fireEvent.click(await screen.findByText('CSV (texte, séparé par « ; »)'));
      expect(await screen.findByText('Plus de 5 000 lignes : affinez les filtres avant d’exporter.')).toBeInTheDocument();
      expect(appelsExport[1]).toBe('/api/tickets/export?open_only=true&format=csv');
      expect(cliques).toHaveLength(1);
    } finally { clic.mockRestore(); }
  });
});

// Chatbot (0.18.0, point 3 ; AID-02, AID-03, DV-150) : suivi lu par l'API, écrans selon le rôle, fiches d'aide citées.
describe('chatbot (0.18.0, point 3 ; AID-02, AID-03)', () => {
  const dem = (id: number, numero: string, etat: string) => ({ id, numero, etat, etat_libelle_fr: null, etat_libelle_nl: null });
  const urls = () => (fetch as unknown as { mock: { calls: [string][] } }).mock.calls.map(([u]) => u);
  const Ici = () => { const l = useLocation(); return <p data-testid="adresse-chat">{`${l.pathname}${l.search}`}</p>; };
  const rendre = () => {
    const base = fetch as unknown as (u: string, i?: RequestInit) => Promise<unknown>;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/demandes?') && url.includes('perimetre=miennes') && url.includes('limit=3')) {
        const data = url.includes('q=00099') ? [] : url.includes('q=') ? [dem(12, 'AA-DI-2026-00012', 'qualifiee')] : [dem(12, 'AA-DI-2026-00012', 'qualifiee'), dem(10, 'AA-DI-2026-00010', 'a_qualifier')];
        return { ok: true, status: 200, statusText: 'OK', json: async () => page(data) };
      }
      return base(url, init);
    }));
    return render(
      <SettingsProvider value={{ settings: FALLBACK_SETTINGS, reload: async () => {} }}>
        <I18nProvider defaultLang="fr"><MemoryRouter initialEntries={['/']}>
          <Routes><Route element={<AppLayout />}><Route path="*" element={<Ici />} /></Route></Routes>
        </MemoryRouter></I18nProvider>
      </SettingsProvider>,
    );
  };
  const demander = async (texte: string) => {
    const d = screen.getByRole('dialog', { name: 'Assistant' });
    fireEvent.change(within(d).getByRole('textbox', { name: 'Votre question' }), { target: { value: texte } });
    fireEvent.click(within(d).getByRole('button', { name: 'Envoyer' }));
    return d;
  };

  it('« où en est ma demande » : demandes ouvertes lues par l’API, lien vers la fiche ; numéro introuvable dit tel quel ; sans violation axe-core', async () => {
    const { container } = rendre();
    fireEvent.click(await screen.findByRole('button', { name: "Ouvrir l'assistant" }));
    const d = await demander('où en est ma demande ?');
    expect(await within(d).findByText('Vos demandes ouvertes les plus récentes :')).toBeInTheDocument();
    expect(within(d).getByRole('button', { name: 'AA-DI-2026-00012 : Prise en charge' })).toBeInTheDocument();
    expect(within(d).getByRole('button', { name: 'AA-DI-2026-00010 : Reçue par le service technique' })).toBeInTheDocument();
    expect(urls().some((u) => u.includes('perimetre=miennes') && u.includes('ouvertes=1') && u.includes('limit=3'))).toBe(true);
    await demander('où en est la 00099 ?');
    expect(await within(d).findByText('Je ne trouve pas la demande 00099 parmi les vôtres. Toutes vos demandes sont dans « Mes demandes ».')).toBeInTheDocument();
    const r = await axe.run(container.ownerDocument.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')}`)).toEqual([]);
    expect(answer('fuite au local 104').key).toBe('chat.intent.demande');
    // Numéro complet avec une autre intention (« demande ») : le suivi l'emporte.
    expect(answer('ma demande AA-DI-2026-00012').key).toBe('chat.intent.demande');
    await demander('ma demande AA-DI-2026-00012');
    await waitFor(() => expect(urls().some((u) => u.includes('perimetre=miennes') && u.includes('q=AA-DI-2026-00012'))).toBe(true));
    const trouvees = await within(d).findAllByRole('button', { name: 'AA-DI-2026-00012 : Prise en charge' });
    fireEvent.click(trouvees[trouvees.length - 1]);
    await waitFor(() => expect(screen.getByTestId('adresse-chat').textContent).toBe('/demandes?demande=12'));
  });

  it('écran proposé selon le rôle : pas de bouton vers « Demandes de l’entité » sans « demandes:entite », bouton avec', async () => {
    rendre();
    fireEvent.click(await screen.findByRole('button', { name: "Ouvrir l'assistant" }));
    let d = await demander('comment qualifier une demande');
    expect(await within(d).findByText(/cliquez sur le numéro de la demande puis sur « Qualifier »/)).toBeInTheDocument();
    expect(within(d).queryByRole('button', { name: "Ouvrir l'écran" }), 'écran non ouvert à la personne').toBeNull();
    cleanupAll();
    const gestionnaire = roles.find((r) => r.code === 'gestionnaire')!;
    gestionnaire.permissions.push('demandes:entite');
    try {
      rendre();
      fireEvent.click(await screen.findByRole('button', { name: "Ouvrir l'assistant" }));
      d = await demander('comment qualifier une demande');
      fireEvent.click(await within(d).findByRole('button', { name: "Ouvrir l'écran" }));
      await waitFor(() => expect(screen.getByTestId('adresse-chat').textContent).toBe('/demandes-entite'));
    } finally { gestionnaire.permissions.splice(gestionnaire.permissions.indexOf('demandes:entite'), 1); }
  });

  it('question sans intention : fiches d’aide proposées par leur titre, lien vers la fiche', async () => {
    rendre();
    fireEvent.click(await screen.findByRole('button', { name: "Ouvrir l'assistant" }));
    const d = await demander('imprimer');
    expect(await within(d).findByText("Je n'ai pas de réponse directe, mais le mode d'emploi en parle ici :")).toBeInTheDocument();
    const liens = within(d).getAllByRole('button', { name: /^Mode d’emploi : / });
    expect(liens.length).toBeGreaterThan(0);
    expect(liens.length).toBeLessThanOrEqual(3);
    fireEvent.click(liens[0]);
    await waitFor(() => expect(screen.getByTestId('adresse-chat').textContent).toMatch(/^\/help\?fiche=/));
  });

  it('une fiche d’aide que la personne ne voit pas n’est pas proposée (Catégories et délais sans « categories:gerer »)', async () => {
    rendre();
    fireEvent.click(await screen.findByRole('button', { name: "Ouvrir l'assistant" }));
    const d = await demander('simulateur');
    expect(await within(d).findByText("Je n'ai pas trouvé de réponse. Consultez le mode d'emploi ou contactez le support.")).toBeInTheDocument();
    expect(within(d).queryByRole('button', { name: /^Mode d’emploi : / })).toBeNull();
  });
});

// Visite guidée (0.18.0, point 4 ; ERG-07 ; DV-151) : première ouverture propre aux rôles, revue depuis l'Aide.
describe('visite guidée (0.18.0, point 4 ; ERG-07)', () => {
  const cle = 'gmao.visite.v1.1.demandeur+admin';
  const rendre = (entree = '/') => render(
    <SettingsProvider value={{ settings: FALLBACK_SETTINGS, reload: async () => {} }}>
      <I18nProvider defaultLang="fr"><MemoryRouter initialEntries={[entree]}>
        <Routes><Route element={<AppLayout />}><Route path="/help" element={<HelpPage />} /><Route path="*" element={<p>écran</p>} /></Route></Routes>
      </MemoryRouter></I18nProvider>
    </SettingsProvider>,
  );
  const titre = () => document.querySelector('.visite-guidee .ant-tour-title')?.textContent;
  const suivant = () => fireEvent.click(document.querySelector('.visite-guidee .ant-tour-next-btn')!);

  it('première ouverture : accueil, une étape par profil, éléments de l’en-tête ; « déjà vue » retenue ; sans violation axe-core', async () => {
    window.localStorage.removeItem('gmao.visite.auto');
    window.localStorage.removeItem(cle);
    try {
      const { container, unmount } = rendre();
      await waitFor(() => expect(titre()).toBe('Bienvenue'), { timeout: 3000 });
      const r = await axe.run(container.ownerDocument.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')}`)).toEqual([]);
      // 0.19.0 (point 0) : compteur au lieu des points, libellés courts (défaut 2 de la recette de la 0.18.0).
      const compteur = () => document.querySelector('.visite-guidee .visite-compteur');
      const bouton = (c: string) => document.querySelector(`.visite-guidee .ant-tour-${c}-btn`)?.textContent;
      expect(compteur()?.textContent).toBe('1 / 9');
      expect(compteur()?.getAttribute('aria-label')).toBe('Étape 1 sur 9');
      expect(document.querySelector('.visite-guidee .ant-tour-indicator'), 'plus de points d’avancement').toBeNull();
      expect(bouton('next')).toBe('Suivant');
      const vus: string[] = [titre()!];
      for (let i = 0; i < 7; i += 1) { suivant(); await waitFor(() => expect(titre()).not.toBe(vus[vus.length - 1])); vus.push(titre()!); }
      // Profils du compte des tests : demandeur et administrateur (pas « demandes:entite » ni « demandes:valider »).
      expect(vus).toEqual(['Bienvenue', 'Vos demandes', 'Administration', 'Nouvelle demande', 'Rechercher', 'Notifications', 'Aide', 'Signaler']);
      suivant();
      await waitFor(() => expect(titre()).toBe('Assistant'));
      expect(compteur()?.textContent).toBe('9 / 9');
      expect([bouton('prev'), bouton('next')]).toEqual(['Précédent', 'Terminer']);
      fireEvent.click(document.querySelector('.visite-guidee .ant-tour-next-btn')!); // « Terminer »
      await waitFor(() => expect(window.localStorage.getItem(cle)).toBeTruthy());
      unmount();
      rendre();
      await new Promise((ok) => setTimeout(ok, 900));
      expect(document.querySelector('.visite-guidee .ant-tour-title'), 'déjà vue : pas d’ouverture').toBeNull();
    } finally {
      window.localStorage.setItem('gmao.visite.auto', '0');
      window.localStorage.removeItem(cle);
    }
  });

  it('un rôle nouveau la relance ; elle attend la fenêtre « Nouveautés »', async () => {
    window.localStorage.removeItem('gmao.visite.auto');
    window.localStorage.setItem('gmao.visite.v1.1.demandeur', 'vue avec un seul profil');
    const avant = user.nouveautes;
    user.nouveautes = [{ version: '0.18.0', lignes: [{ fr: 'Recherche', nl: 'Zoeken' }] }];
    try {
      rendre();
      await new Promise((ok) => setTimeout(ok, 900));
      expect(titre(), 'pas pendant les nouveautés').toBeUndefined();
      cleanupAll();
      user.nouveautes = [];
      rendre();
      await waitFor(() => expect(titre()).toBe('Bienvenue'), { timeout: 3000 });
    } finally {
      user.nouveautes = avant;
      window.localStorage.setItem('gmao.visite.auto', '0');
      window.localStorage.removeItem('gmao.visite.v1.1.demandeur');
    }
  });

  it('0.20.0 (DV-159) : le menu ouvert sur téléphone ferme la visite, notée vue', async () => {
    window.localStorage.removeItem(cle);
    try {
      rendre('/help');
      fireEvent.click(await screen.findByRole('button', { name: /Revoir la visite guidée/ }));
      await waitFor(() => expect(titre()).toBe('Bienvenue'));
      fireEvent.click(screen.getByRole('button', { name: 'Ouvrir ou fermer le menu' }));
      await waitFor(() => expect(titre(), 'visite fermée par le menu').toBeUndefined());
      expect(window.localStorage.getItem(cle), 'notée vue').toBeTruthy();
      expect(document.querySelector('.ant-drawer-open'), 'menu ouvert').not.toBeNull();
    } finally { window.localStorage.removeItem(cle); }
  });

  it('ouverture automatique coupée (contrôles automatiques) : rien ne s’ouvre seul ; l’Aide l’ouvre quand même', async () => {
    window.localStorage.removeItem(cle);
    try {
      rendre('/help');
      await new Promise((ok) => setTimeout(ok, 900));
      expect(titre(), 'jamais vue, mais « gmao.visite.auto » = 0').toBeUndefined();
      fireEvent.click(await screen.findByRole('button', { name: /Revoir la visite guidée/ }));
      await waitFor(() => expect(titre()).toBe('Bienvenue'));
    } finally { window.localStorage.removeItem(cle); }
  });
});

describe('équipes et ouvriers (0.19.0, point 2 ; ROL-05, DV-28)', () => {
  const rendre = (entree = '/equipes') => render(
    <SettingsProvider value={{ settings: FALLBACK_SETTINGS, reload: async () => {} }}>
      <I18nProvider defaultLang="fr"><MemoryRouter initialEntries={[entree]}><EquipesPage /></MemoryRouter></I18nProvider>
    </SettingsProvider>,
  );
  const ent = () => (user.entites as { roles: string[] }[])[0];
  const appels = () => (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;

  it('liste : chef, membres, horaire de l’entité ou du week-end ; lecture seule pour le gestionnaire', async () => {
    rendre();
    expect(await screen.findByText('Propreté du week-end')).toBeInTheDocument();
    expect(screen.getByText('Sam. 07:00–13:00 · Dim. 07:00–13:00')).toBeInTheDocument();
    expect(screen.getByText("Horaire de l'entité")).toBeInTheDocument();
    expect(screen.getByText('Oscar Ouvrier, Olga Ouvrière')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nouvelle équipe/ }), 'le gestionnaire ne crée pas').toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Bâtiment' }));
    expect(await screen.findByText(/Lecture seule/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).toBeNull();
  });

  it('responsable : nouvelle équipe avec un horaire propre (samedi), envoyé au serveur', async () => {
    const avant = ent().roles;
    ent().roles = ['responsable'];
    try {
      rendre();
      fireEvent.click(await screen.findByRole('button', { name: /Nouvelle équipe/ }));
      const volet = await screen.findByRole('dialog');
      fireEvent.change(within(volet).getByLabelText('Code'), { target: { value: 'VOIRIE' } });
      fireEvent.change(within(volet).getByLabelText('Nom en français'), { target: { value: 'Voirie' } });
      fireEvent.change(within(volet).getByLabelText('Nom en néerlandais'), { target: { value: 'Wegen' } });
      fireEvent.click(within(volet).getByLabelText('Horaire propre à l’équipe'));
      fireEvent.click(within(volet).getByRole('checkbox', { name: 'Samedi' }));
      fireEvent.change(within(volet).getByLabelText('Samedi : fin'), { target: { value: '12:00' } });
      fireEvent.click(within(volet).getByRole('button', { name: 'Enregistrer' }));
      await waitFor(() => expect(appels().some(([u, i]) => u === '/api/equipes' && i?.method === 'POST')).toBe(true));
      const [, init] = appels().find(([u, i]) => u === '/api/equipes' && i?.method === 'POST')!;
      expect(JSON.parse(String(init!.body))).toEqual({ code: 'VOIRIE', nom_fr: 'Voirie', nom_nl: 'Wegen', chef_id: null, membres: [], horaire: [{ jour: 6, debut: '07:00', fin: '12:00' }] });
    } finally { ent().roles = avant; }
  });

  it('responsable : un créneau dont la fin précède le début est refusé avant l’envoi', async () => {
    const avant = ent().roles;
    ent().roles = ['responsable'];
    try {
      rendre();
      fireEvent.click(await screen.findByRole('button', { name: 'Propreté du week-end' }));
      const volet = await screen.findByRole('dialog');
      fireEvent.change(within(volet).getByLabelText('Dimanche : début'), { target: { value: '14:00' } });
      fireEvent.click(within(volet).getByRole('button', { name: 'Enregistrer' }));
      expect(await within(volet).findByText(/Horaire invalide/)).toBeInTheDocument();
      expect(appels().some(([u, i]) => u.startsWith('/api/equipes/') && i?.method === 'PUT')).toBe(false);
    } finally { ent().roles = avant; }
  });

  it('onglet Ouvriers : métier, compétences, équipes et chef ; filtre par équipe ; sans violation axe-core', async () => {
    const { container } = rendre('/equipes?onglet=ouvriers');
    expect(await screen.findByText('Électricité')).toBeInTheDocument();
    expect(screen.getByText('BA4 : personne avertie (électricité)')).toBeInTheDocument();
    expect(screen.getByText('Bâtiment (chef)')).toBeInTheDocument();
    expect(screen.getByText('Non précisé')).toBeInTheDocument();
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')}`)).toEqual([]);
  });
});

describe('planning (0.21.0, point 3 ; PLA-03)', () => {
  const rendre = (entree = '/planning?du=2026-12-07', lang: 'fr' | 'nl' = 'fr') => render(
    <SettingsProvider value={{ settings: FALLBACK_SETTINGS, reload: async () => {} }}>
      <I18nProvider defaultLang={lang}><MemoryRouter initialEntries={[entree]}><PlanningPage /></MemoryRouter></I18nProvider>
    </SettingsProvider>,
  );
  const ent = () => (user.entites as { roles: string[] }[])[0];
  const appels = () => (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
  const corpsPut = (id: number) => { const c = appels().filter(([u, i]) => u === `/api/taches/${id}/affectation` && i?.method === 'PUT'); return c.length ? JSON.parse(String(c[c.length - 1][1]!.body)) : null; };
  const cellule = (c: HTMLElement, cle: string) => c.querySelector(`[data-case="${cle}"]`) as HTMLElement;
  // Le simulacre de matchMedia ne répond à aucune requête : Ant Design voit un écran étroit, d'où la vue jour par défaut ; la
  // semaine se contrôle en forçant un grand écran.
  // Gestionnaire du planning : lecture, déplacement et lien vers la demande (permissions réelles du rôle).
  let rolesAvant: string[] = [];
  beforeEach(() => {
    rolesAvant = ent().roles;
    ent().roles = ['planif'];
    roles.push({ code: 'planif', portee: 'entite', defaut: false, label_fr: 'Gestionnaire', label_nl: 'Beheerder', description_fr: 'd', description_nl: 'd', permissions: ['equipes:lire', 'demandes:traiter', 'demandes:entite'] });
  });
  afterEach(() => { ent().roles = rolesAvant; const i = roles.findIndex((r) => r.code === 'planif'); if (i >= 0) roles.splice(i, 1); });
  const grandEcran = () => {
    const avant = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: /min-width/.test(q), media: q, onchange: null, addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
    return () => { window.matchMedia = avant; };
  };

  it('semaine par ouvrier : jours, non ouvrés, charge, indisponibilité sans cause, « via l’équipe », sans affectation ; axe-core FR et NL', async () => {
    const remettre = grandEcran();
    try {
      const { container } = rendre();
      await screen.findByRole('table', { name: 'Planning' });
      expect(appels().some(([u]) => u === '/api/planning?du=2026-12-07&au=2026-12-13')).toBe(true);
      expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Ouvrier', 'lun. 7/12', 'mar. 8/12', 'mer. 9/12', 'jeu. 10/12', 'ven. 11/12', 'sam. 12/12 · non ouvré', 'dim. 13/12 · non ouvré']);
      expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toEqual(['Oscar Ouvrier', 'Olga Ouvrière', 'Sans affectation']);
      expect(cellule(container, 'o22|2026-12-07').textContent).toContain('Prévu : 10 h');
      expect(cellule(container, 'o22|2026-12-07').textContent).toContain('via l’équipe');
      expect(cellule(container, 'o22|2026-12-08').textContent).toContain('Indisponible');
      expect(cellule(container, 'o22|2026-12-08')).toHaveClass('planning-ferme');
      expect(cellule(container, 'o23|2026-12-09').textContent).toContain('Contrôler le tableau');
      expect(cellule(container, 'o23|2026-12-09').textContent).not.toContain('via l’équipe');
      expect(cellule(container, 'aucun|2026-12-10').textContent).toContain('Reboucher le trou');
      expect(screen.getAllByRole('link', { name: 'AA-DI-2026-00007 · 1' })[0]).toHaveAttribute('href', '/demandes-entite?demande=7');
      const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')}`)).toEqual([]);
      cleanupAll();
      const n = rendre('/planning?du=2026-12-07', 'nl');
      await screen.findByRole('table', { name: 'Planning' });
      expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toContain('Zonder toewijzing');
      const rn = await axe.run(n.container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      expect(rn.violations).toEqual([]);
    } finally { remettre(); }
  });

  it('glisser-déposer : tâche d’un ouvrier vers un autre et un autre jour ; tâche d’équipe chez un membre : jour seul ; chez un non-membre : refusée', async () => {
    const remettre = grandEcran();
    const sauve = planningData.ouvriers.slice();
    planningData.ouvriers.push({ id: 24, prenom: 'Paul', nom: 'Propre', equipes: [], jours: Object.fromEntries(semaineP.map((d) => [d, jourP(1)])) });
    try {
      const { container } = rendre();
      await screen.findByRole('table', { name: 'Planning' });
      const glisser = (tache: number, depuis: string, vers: string) => {
        const donnees: Record<string, string> = {};
        const dt = { setData: (k: string, v: string) => { donnees[k] = v; }, getData: (k: string) => donnees[k], effectAllowed: '' };
        const carte = cellule(container, depuis).querySelector(`[data-tache="${tache}"]`) as HTMLElement;
        fireEvent.dragStart(carte, { dataTransfer: dt });
        fireEvent.dragOver(cellule(container, vers.split('#')[0]), { dataTransfer: dt });
        fireEvent.drop(cellule(container, vers.split('#')[0]), { dataTransfer: dt });
      };
      glisser(52, 'o23|2026-12-09', 'o24|2026-12-10');
      await waitFor(() => expect(corpsPut(52)).toEqual({ ouvriers: [24], equipe_id: null, date_prevue: '2026-12-10', heure_debut: null, duree_estimee_min: 60 }));
      glisser(51, 'o22|2026-12-07', 'o23|2026-12-09');
      await waitFor(() => expect(corpsPut(51)).toEqual({ ouvriers: [], equipe_id: 4, date_prevue: '2026-12-09', heure_debut: '08:00', duree_estimee_min: 90 }));
      const avant = appels().length;
      glisser(51, 'o22|2026-12-07', 'o24|2026-12-09');
      expect(await screen.findByText(/Cette tâche est confiée à une équipe/)).toBeInTheDocument();
      expect(appels().slice(avant).some(([u]) => u.includes('/affectation'))).toBe(false);
      glisser(53, 'aucun|2026-12-10', 'o22|2026-12-11');
      await waitFor(() => expect(corpsPut(53)).toEqual({ ouvriers: [22], equipe_id: null, date_prevue: '2026-12-11', heure_debut: null, duree_estimee_min: null }));
    } finally { planningData.ouvriers.splice(0, planningData.ouvriers.length, ...sauve); remettre(); }
  });

  it('téléphone : vue jour ; « Déplacer » change le jour et l’équipe par la fenêtre (vue par équipe)', async () => {
    rendre('/planning?du=2026-12-07&lignes=equipes');
    await screen.findByRole('table', { name: 'Planning' });
    expect(appels().some(([u]) => u === '/api/planning?du=2026-12-07&au=2026-12-07')).toBe(true);
    expect(screen.getByText('lundi 7 décembre 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Déplacer AA-DI-2026-00007 · 1' }));
    const fenetre = (await screen.findByText('Déplacer · AA-DI-2026-00007 · 1')).closest('.ant-modal') as HTMLElement;
    const champ = within(fenetre).getByLabelText('Nouveau jour') as HTMLInputElement;
    expect(champ.value).toBe('07/12/2026');
    fireEvent.mouseDown(champ); fireEvent.focus(champ);
    fireEvent.change(champ, { target: { value: '09/12/2026' } });
    fireEvent.keyDown(champ, { key: 'Enter' });
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Déplacer' }));
    await waitFor(() => expect(corpsPut(51)).toEqual({ ouvriers: [], equipe_id: 4, date_prevue: '2026-12-09', heure_debut: '08:00', duree_estimee_min: 90 }));
  });

  it('0.21.0 (point 4) : conflits dits en mots ; tâches non planifiées glissées sur un ouvrier ou « Planifier » ; conflits rendus après l’enregistrement', async () => {
    const remettre = grandEcran();
    conflitsReponse = [{ ouvrier_id: 23, prenom: 'Olga', nom: 'Ouvrière', conflits: ['trop_charge'], charge_min: 630, capacite_min: 510 }];
    try {
      const { container } = rendre();
      await screen.findByRole('table', { name: 'Planning' });
      expect(cellule(container, 'o22|2026-12-07').querySelector('.planning-conflit')?.textContent).toContain('Trop chargé (10 h prévues pour 8 h 30)');
      expect(cellule(container, 'o22|2026-12-08').querySelector('.planning-conflit')?.textContent).toContain('Absent');
      expect(cellule(container, 'o23|2026-12-07').querySelector('.planning-conflit')).toBeNull();
      const liste = screen.getByRole('list', { name: 'Tâches non planifiées' });
      expect(screen.getByText('Tâches non planifiées (1)')).toBeInTheDocument();
      expect(within(liste).getByText('Repeindre la porte')).toBeInTheDocument();
      expect(within(liste).getByText('P2')).toBeInTheDocument();
      // Glissée sur Olga mercredi : confiée à elle seule, datée.
      const donnees: Record<string, string> = {};
      const dt = { setData: (k: string, v: string) => { donnees[k] = v; }, getData: (k: string) => donnees[k], effectAllowed: '' };
      fireEvent.dragStart(liste.querySelector('[data-tache="54"]') as HTMLElement, { dataTransfer: dt });
      fireEvent.drop(cellule(container, 'o23|2026-12-09'), { dataTransfer: dt });
      await waitFor(() => expect(corpsPut(54)).toEqual({ ouvriers: [23], equipe_id: null, date_prevue: '2026-12-09', heure_debut: null, duree_estimee_min: 120 }));
      expect(await screen.findByText('Attention : Olga Ouvrière : Trop chargé (10 h 30 prévues pour 8 h 30)')).toBeInTheDocument();
      // « Planifier » : Oscar proposé (seul ouvrier de la tâche), jour de la période.
      fireEvent.click(within(liste).getByRole('button', { name: 'Planifier AA-DI-2026-00009 · 1' }));
      const fenetre = (await screen.findByText('Planifier · AA-DI-2026-00009 · 1')).closest('.ant-modal') as HTMLElement;
      expect((within(fenetre).getByLabelText('Nouveau jour') as HTMLInputElement).value).toBe('08/12/2026');
      fireEvent.click(within(fenetre).getByRole('button', { name: 'Planifier' }));
      await waitFor(() => expect(corpsPut(54)).toEqual({ ouvriers: [22], equipe_id: null, date_prevue: '2026-12-08', heure_debut: null, duree_estimee_min: 120 }));
    } finally { conflitsReponse = []; remettre(); }
  });

  it('chef d’équipe (lecture) : ni glisser, ni « Déplacer », ni lien vers la demande', async () => {
    const avant = ent().roles;
    ent().roles = ['chef_lecture'];
    roles.push({ code: 'chef_lecture', portee: 'entite', defaut: false, label_fr: 'Chef', label_nl: 'Chef', description_fr: 'd', description_nl: 'd', permissions: ['equipes:lire'] });
    try {
      const { container } = rendre();
      await screen.findByRole('table', { name: 'Planning' });
      expect(screen.getByText(/Planning en lecture seule/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Déplacer/ })).toBeNull();
      expect(container.querySelector('[draggable="true"]')).toBeNull();
      expect(screen.queryByRole('link', { name: /AA-DI-2026-00007/ })).toBeNull();
    } finally { ent().roles = avant; roles.pop(); }
  });
});

describe('indisponibilités d’un ouvrier (0.21.0, point 2 ; PLA-04)', () => {
  const rendre = (entree = '/equipes?onglet=ouvriers') => render(
    <SettingsProvider value={{ settings: FALLBACK_SETTINGS, reload: async () => {} }}>
      <I18nProvider defaultLang="fr"><MemoryRouter initialEntries={[entree]}><EquipesPage /></MemoryRouter></I18nProvider>
    </SettingsProvider>,
  );
  const ent = () => (user.entites as { roles: string[] }[])[0];
  const appels = () => (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
  const ouvrirOscar = async () => {
    rendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Oscar Ouvrier' }));
    const volet = await screen.findByRole('dialog');
    return within(volet).findByText('Indisponibilités').then(() => volet);
  };

  it('gestionnaire : liste avec le motif ; ajout d’une demi-journée sur un jour, envoyé au serveur ; sans violation axe-core', async () => {
    const volet = await ouvrirOscar();
    expect(await within(volet).findByText(/Du lundi 21 décembre 2026 au jeudi 24 décembre 2026/)).toBeInTheDocument();
    expect(within(volet).getByText('Congé')).toBeInTheDocument();
    fireEvent.click(within(volet).getByRole('button', { name: /Ajouter/ }));
    const form = volet.querySelector('.indispo-form') as HTMLElement;
    fireEvent.click(within(form).getByRole('button', { name: 'Enregistrer' }));
    expect((await within(form).findAllByText('Ce champ est obligatoire')).length).toBeGreaterThan(0);
    expect(appels().some(([u, i]) => u === '/api/indisponibilites' && i?.method === 'POST')).toBe(false);
    const du = within(form).getAllByRole('textbox')[0];
    fireEvent.mouseDown(du); fireEvent.focus(du);
    fireEvent.change(du, { target: { value: '08/01/2027' } });
    fireEvent.keyDown(du, { key: 'Enter' });
    fireEvent.click(within(form).getByRole('radio', { name: 'Matin' }));
    fireEvent.click(within(form).getByRole('radio', { name: 'Formation' }));
    const r = await axe.run(volet, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')}`)).toEqual([]);
    fireEvent.click(within(form).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(appels().some(([u, i]) => u === '/api/indisponibilites' && i?.method === 'POST')).toBe(true));
    const [, init] = appels().find(([u, i]) => u === '/api/indisponibilites' && i?.method === 'POST')!;
    expect(JSON.parse(String(init!.body))).toEqual({ user_id: 22, du: '2027-01-08', au: '2027-01-08', periode: 'matin', motif: 'formation' });
  });

  it('demi-journée impossible sur plusieurs jours ; suppression avec confirmation', async () => {
    const volet = await ouvrirOscar();
    fireEvent.click(within(volet).getByRole('button', { name: /Ajouter/ }));
    const form = volet.querySelector('.indispo-form') as HTMLElement;
    const [du, au] = within(form).getAllByRole('textbox');
    for (const [champ, v] of [[du, '08/01/2027'], [au, '12/01/2027']] as const) {
      fireEvent.mouseDown(champ); fireEvent.focus(champ); fireEvent.change(champ, { target: { value: v } }); fireEvent.keyDown(champ, { key: 'Enter' });
    }
    await waitFor(() => expect(within(form).getByRole('radio', { name: 'Matin' })).toBeDisabled());
    fireEvent.click(within(volet).getByRole('button', { name: 'Supprimer' }));
    await screen.findByText('Supprimer cette indisponibilité saisie par erreur ?');
    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' }).slice(-1)[0]);
    await waitFor(() => expect(appels().some(([u, i]) => u === '/api/indisponibilites/91' && i?.method === 'DELETE')).toBe(true));
  });

  it('chef d’équipe (lecture) : la cause n’est jamais montrée ; ni ajout ni suppression', async () => {
    const avant = ent().roles;
    const liste = [...indisposListe];
    ent().roles = ['chef_lecture'];
    indisposListe.splice(0, 1, { id: 91, user_id: 22, du: '2026-12-21', au: '2026-12-24', periode: 'journee' });
    roles.push({ code: 'chef_lecture', portee: 'entite', defaut: false, label_fr: 'Chef', label_nl: 'Chef', description_fr: 'd', description_nl: 'd', permissions: ['equipes:lire'] });
    try {
      const volet = await ouvrirOscar();
      expect(await within(volet).findByText(/Du lundi 21 décembre 2026/)).toBeInTheDocument();
      expect(within(volet).getByText('Indisponible')).toBeInTheDocument();
      expect(within(volet).queryByText('Congé')).toBeNull();
      expect(within(volet).getByText(/La cause n’est pas montrée/)).toBeInTheDocument();
      expect(within(volet).queryByRole('button', { name: /Ajouter/ })).toBeNull();
      expect(within(volet).queryByRole('button', { name: 'Supprimer' })).toBeNull();
    } finally { ent().roles = avant; indisposListe.splice(0, 1, ...liste); roles.pop(); }
  });
});

describe('prestataires externes (0.19.0, point 3 ; REF-07, EXT-03)', () => {
  const rendre = (entree = '/equipes?onglet=prestataires') => render(
    <SettingsProvider value={{ settings: FALLBACK_SETTINGS, reload: async () => {} }}>
      <I18nProvider defaultLang="fr"><MemoryRouter initialEntries={[entree]}><EquipesPage /></MemoryRouter></I18nProvider>
    </SettingsProvider>,
  );
  const ent = () => (user.entites as { roles: string[] }[])[0];
  const appels = () => (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;

  it('onglet : nom, numéro, langue, métiers, contact et référence ; lecture seule pour le gestionnaire ; sans violation axe-core', async () => {
    const { container } = rendre();
    expect(await screen.findByText('Chauffagiste fictif')).toBeInTheDocument();
    expect(screen.getByText('0123.456.749')).toBeInTheDocument();
    expect(screen.getByText('Chauffage et ventilation')).toBeInTheDocument();
    expect(screen.getByText('Claire Fictive · 02 000 00 00 · c@fictif.invalid')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Prestataires (1)' })).toBeChecked();
    expect(screen.queryByRole('button', { name: /Nouveau prestataire/ })).toBeNull();
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')}`)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Chauffagiste fictif' }));
    expect(await screen.findByText(/Lecture seule : le responsable du service technique règle les prestataires/)).toBeInTheDocument();
  });

  it('responsable : nouveau prestataire, champs vides envoyés à null, langue néerlandaise', async () => {
    const avant = ent().roles;
    ent().roles = ['responsable'];
    try {
      rendre();
      fireEvent.click(await screen.findByRole('button', { name: /Nouveau prestataire/ }));
      const volet = await screen.findByRole('dialog');
      fireEvent.change(within(volet).getByLabelText('Nom'), { target: { value: '  Elektriciens  ' } });
      fireEvent.change(within(volet).getByLabelText("Numéro d'entreprise"), { target: { value: '0999.999.922' } });
      fireEvent.click(within(volet).getByRole('radio', { name: 'Néerlandais' }));
      fireEvent.click(within(volet).getByRole('button', { name: 'Enregistrer' }));
      await waitFor(() => expect(appels().some(([u, i]) => u === '/api/prestataires' && i?.method === 'POST')).toBe(true));
      const [, init] = appels().find(([u, i]) => u === '/api/prestataires' && i?.method === 'POST')!;
      expect(JSON.parse(String(init!.body))).toEqual({ nom: 'Elektriciens', numero_entreprise: '0999.999.922', langue: 'nl', contact_nom: null, telephone: null,
        courriel: null, adresse: null, code_postal: null, commune: null, reference_marche: null, corps_metier: [] });
    } finally { ent().roles = avant; }
  });

  it('chef d’équipe : pas d’onglet Prestataires, même par l’adresse', async () => {
    const avant = ent().roles;
    ent().roles = ['chef_equipe'];
    try {
      rendre();
      expect(await screen.findByText('Propreté du week-end')).toBeInTheDocument();
      expect(screen.queryByRole('radio', { name: /Prestataires/ })).toBeNull();
    } finally { ent().roles = avant; }
  });
});

describe('assistant : planning, absences, heures et date déplacée (0.21.0, point 7)', () => {
  it('chaque question trouve sa réponse et son écran, en FR et en NL ; les questions d’avant gardent la leur', () => {
    for (const [q, key, route] of [
      ['où voir le planning de la semaine ?', 'chat.intent.planning', '/planning'],
      ['hoe een taak verplaatsen?', 'chat.intent.planning', '/planning'],
      ['où noter le congé d’un ouvrier ?', 'chat.intent.absences', '/equipes?onglet=ouvriers'],
      ['arbeider afwezig volgende week', 'chat.intent.absences', '/equipes?onglet=ouvriers'],
      ['comment corriger l’heure de début ?', 'chat.intent.heures', '/demandes-entite'],
      ['einduur van een taak', 'chat.intent.heures', '/demandes-entite'],
      ['pourquoi la date a changé ?', 'chat.intent.datemodifiee', '/demandes'],
      ['datum gewijzigd op mijn aanvraag', 'chat.intent.datemodifiee', '/demandes'],
    ] as const) {
      const r = answer(q);
      expect(r.key, q).toBe(key);
      expect((r as { route?: string }).route, q).toBe(route);
    }
    expect(answer('jours fériés de la commune').key).toBe('chat.intent.calendrier');
    expect(answer('congé de la commune').key).toBe('chat.intent.calendrier');
    expect(answer('comment créer une équipe ?').key).toBe('chat.intent.equipes');
    expect(answer('ma demande est planifiée').key).not.toBe('chat.intent.planning');
    expect(accesEcran('/planning?vue=jour')).toEqual({ permission: 'equipes:lire' });
  });
});

describe('assistant : équipes, métiers et prestataires (0.19.0, point 5)', () => {
  it('chaque question trouve sa réponse et son écran, en FR et en NL ; les questions d’avant gardent la leur', () => {
    for (const [q, key, route] of [
      ['comment créer une équipe ?', 'chat.intent.equipes', '/equipes'],
      ['hoe maak ik een ploeg aan?', 'chat.intent.equipes', '/equipes'],
      ['où noter la compétence BA4 d’un ouvrier ?', 'chat.intent.metiers', '/equipes?onglet=ouvriers'],
      ['welk vakgebied voor een arbeider?', 'chat.intent.metiers', '/equipes?onglet=ouvriers'],
      ['ajouter un prestataire', 'chat.intent.prestataires', '/equipes?onglet=prestataires'],
      ['ondernemingsnummer van een aannemer', 'chat.intent.prestataires', '/equipes?onglet=prestataires'],
    ] as const) {
      const r = answer(q);
      expect(r.key, q).toBe(key);
      expect((r as { route?: string }).route, q).toBe(route);
    }
    expect(answer('fuite au local 104').key).toBe('chat.intent.demande');
  });
});
