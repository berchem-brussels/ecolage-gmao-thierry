/**
 * Chaque écran s'affiche et passe l'audit axe-core, en FR et en NL (patron SAGA a11y.test.tsx).
 * La règle color-contrast est désactivée : jsdom ne calcule pas les couleurs rendues ; le contraste se vérifie à l'écran.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { I18nProvider } from '../contexts/I18nContext';
import { SettingsProvider, FALLBACK_SETTINGS } from '../contexts/SettingsContext';

const entites = [
  { id: 1, code: 'AA', nom_fr: 'Administration fictive', nom_nl: 'Fictief bestuur', is_active: 1, motif_desactivation: null, created_at: '2026-10-15 10:00:00', updated_at: '2026-10-15 10:00:00' },
  { id: 2, code: 'BB', nom_fr: 'Centre fictif', nom_nl: 'Fictief centrum', is_active: 1, motif_desactivation: null, created_at: '2026-10-15 10:00:00', updated_at: '2026-10-15 10:00:00' },
];
const user: Record<string, unknown> & { nouveautes?: unknown[] } = {
  id: 1, email: 'a@exemple.test', first_name: 'Ada', last_name: 'Admin', user_role: 'admin', entite_id: 1, preferred_lang: 'fr', ui_mode: 'simple', theme: 'clair', must_change_password: 0,
  entites: [{ ...entites[0], roles: ['agent', 'gestionnaire'] }, { ...entites[1], roles: ['responsable'] }], entite_active_id: 1,
  protection_donnees: { mention_courte_fr: 'Vos données servent à traiter votre demande.', mention_courte_nl: 'Uw gegevens dienen voor uw aanvraag.',
    mention_fr: 'Administration fictive traite les données de cette demande.', mention_nl: 'Fictief bestuur verwerkt de gegevens van deze aanvraag.', dpo_contact: null },
};
const roles = [
  { code: 'agent', portee: 'entite', defaut: true, label_fr: 'Demandeur', label_nl: 'Aanvrager', description_fr: 'd', description_nl: 'd', permissions: ['lieux:lire', 'listes:lire'] },
  { code: 'gestionnaire', portee: 'entite', defaut: false, label_fr: 'Gestionnaire technique', label_nl: 'Technisch beheerder', description_fr: 'd', description_nl: 'd', permissions: ['entites:membres', 'lieux:lire', 'lieux:gerer', 'listes:lire'] },
  { code: 'responsable', portee: 'entite', defaut: false, label_fr: 'Responsable du service technique', label_nl: 'Verantwoordelijke technische dienst', description_fr: 'd', description_nl: 'd', permissions: ['entites:membres', 'lieux:lire', 'lieux:gerer', 'listes:lire', 'listes:gerer'] },
  { code: 'admin', portee: 'instance', defaut: false, label_fr: 'Administrateur', label_nl: 'Beheerder', description_fr: 'd', description_nl: 'd', permissions: [] },
];
const users = [{ ...user, is_active: 1, is_demo: 1, roles: [{ id: 1, entite_id: 1, role: 'agent', entite_code: 'AA' }, { id: 2, entite_id: 2, role: 'responsable', entite_code: 'BB' }] }];
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
];
const journal = [
  { id: 2, created_at: '2026-10-22 08:30:00', action: 'lieu.update', entity_type: 'lieu', entity_id: 4, channel: 'mcp', details: { nom_fr: 'Salle du conseil' }, entite_id: 1, entite_code: 'AA', user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin' },
  { id: 4, created_at: '2026-10-22 09:30:00', action: 'demande.create', entity_type: 'demande', entity_id: 7, channel: 'api', details: { numero: 'AA-DI-2026-00007', lieu_id: 12, categorie_id: 9, beneficiaire_id: 5 }, entite_id: 1, entite_code: 'AA', user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin',
    noms: { lieu_id: { type: 'lieu', id: 12, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Kantoor 12', entite_code: 'AA' }, categorie_id: { type: 'categorie', id: 9, code: 'eclairage', nom_fr: 'Éclairage', nom_nl: 'Verlichting', entite_code: 'AA' } } },
  { id: 3, created_at: '2026-10-22 09:00:00', action: 'lieu.update', entity_type: 'lieu', entity_id: 5, channel: 'api', details: { code: 'MC-A', avant: { parent_id: 2 }, apres: { parent_id: 404 } }, entite_id: 2, entite_code: 'BB', user_id: 1, user_email: 'a@exemple.test', user_first_name: 'Ada', user_last_name: 'Admin',
    noms: { 'avant.parent_id': { type: 'lieu', id: 2, code: 'MC', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis', entite_code: 'AA' }, 'apres.parent_id': { type: 'lieu', id: 404, introuvable: 1 } } },
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
const nouveautesLues = vi.fn(async () => {});
const notesVersion = [
  { version: '0.3.0', date: '2026-10-22', lignes: [{ fr: 'Nouveauté fictive A', nl: 'Fictieve nieuwigheid A' }] },
  { version: '0.2.0', date: '2026-10-21', lignes: [{ fr: 'Nouveauté fictive B', nl: 'Fictieve nieuwigheid B' }] },
];
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user, loading: false, isAdmin: true, login: async () => {}, logout: async () => {}, refresh: async () => {}, savePreferences: async () => {},
    setEntite, nouveautesLues, entite: (user.entites as { roles: string[] }[])[0], roles: (user.entites as { roles: string[] }[])[0].roles,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const page = (data: unknown[]) => ({ data, meta: { envelope: 1 }, pagination: { total: data.length, limit: 200, offset: 0 } });
beforeEach(() => {
  modules = modulesActifs;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true, status: 200, statusText: 'OK',
    json: async () => (url.includes('/membres') ? { data: membres, meta: { envelope: 1 } }
      : url.startsWith('/api/lieux/arbre') ? { data: arbre, meta: { envelope: 1 } }
      : url.startsWith('/api/listes-valeurs') ? page(valeurs)
      : url.startsWith('/api/categories/arbre') ? { data: arbreCategories, meta: { envelope: 1 } }
      : /^\/api\/categories\/10\/questions/.test(url) ? { data: questionsPlomberie, meta: { envelope: 1, max_actives: 10 } }
      : /^\/api\/categories\/\d+\/questions/.test(url) ? { data: [], meta: { envelope: 1, max_actives: 10 } }
      : url.startsWith('/api/priorites') ? page(priorites)
      : url.startsWith('/api/horaires') ? page(horaires)
      : url.startsWith('/api/jours-non-ouvres') ? page(joursNonOuvres)
      : url.startsWith('/api/jours-feries') ? page(feries)
      : url.startsWith('/api/demandes') ? page([])
      : url.startsWith('/api/echeances') ? { data: echeance, meta: { envelope: 1 } }
      : url.startsWith('/api/parametres-entite') ? page(parametresEntite)
      : url.startsWith('/api/parametres') ? page(parametres)
      : url.startsWith('/api/modules') ? page(modules)
      : url.startsWith('/api/notes-version') ? page(notesVersion)
      : url.startsWith('/api/audit') ? { ...page(journal), meta: { envelope: 1, actions: ['action.nouvelle', 'lieu.update'] } }
      : url.startsWith('/api/entites') ? page(entites)
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
import LoginPage from '../pages/LoginPage';
import PatrimoinePage from '../pages/PatrimoinePage';
import ListesValeursPage from '../pages/ListesValeursPage';
import AppLayout from '../components/AppLayout';
import ParametresPage from '../pages/ParametresPage';
import ReglagesEntitePage from '../pages/ReglagesEntitePage';
import JournalPage from '../pages/JournalPage';
import ReferentielPage from '../pages/ReferentielPage';
import { reloadModules } from '../moduleMap';

const PAGES: [string, React.ComponentType][] = [
  ['Home', HomePage], ['Entites', EntitesPage], ['Users', UsersPage], ['Help', HelpPage], ['Accessibility', AccessibilityPage], ['Login', LoginPage],
  ['Patrimoine', PatrimoinePage], ['ListesValeurs', ListesValeursPage], ['Parametres', ParametresPage], ['ReglagesEntite', ReglagesEntitePage], ['Journal', JournalPage], ['Referentiel', ReferentielPage],
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

  it('le menu propose le patrimoine au gestionnaire, mais pas les listes de valeurs réservées au responsable', async () => {
    render(wrap(AppLayout, 'fr'));
    // jsdom n'a pas de largeur d'écran : la mise en page est celle du téléphone, le menu s'ouvre par son bouton.
    fireEvent.click(await screen.findByRole('button', { name: 'Ouvrir ou fermer le menu' }));
    expect(await screen.findByText('Patrimoine')).toBeInTheDocument();
    expect(screen.queryByText('Listes de valeurs')).toBeNull();
    expect(screen.queryByText('Catégories et délais')).toBeNull();
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
      expect(screen.getByRole('checkbox', { name: fr ? 'Obligatoire' : 'Verplicht' })).not.toBeChecked();
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
    expect(screen.getByText(/Geleverde waarden : Tenlasteneming 1 kalenderuren · Einde van de werken 4 kalenderuren/)).toBeInTheDocument();
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
    expect(screen.getAllByText(/· Ada Admin$/)).toHaveLength(3);
  });

  it('le détail du journal nomme le lieu et la catégorie au lieu de leur identifiant, en FR (DV-50)', async () => {
    const { container } = render(wrap(JournalPage, 'fr'));
    await screen.findByText('Lieu modifié · BB');
    container.querySelectorAll<HTMLButtonElement>('button.ant-table-row-expand-icon').forEach((b) => fireEvent.click(b));
    expect(await screen.findByText('MC-A-12 — Bureau 12 (#12)')).toBeInTheDocument();
    expect(screen.getByText('eclairage — Éclairage (#9)')).toBeInTheDocument();
    expect(screen.getByText('Bénéficiaire (identifiant)')).toBeInTheDocument();
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

  it('l’en-tête propose les entités de la personne en boutons et sans violation axe-core', async () => {
    const { container } = render(wrap(AppLayout, 'fr'));
    const selector = await screen.findByLabelText('Entité active');
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
