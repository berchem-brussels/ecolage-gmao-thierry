/**
 * Écrans des demandes d'intervention (0.5.0) : accueil adapté au rôle, nouvelle demande, « Mes demandes »,
 * « Demandes de l'entité ». Rendu, audit axe-core en FR et en NL, parcours de dépôt et règles d'affichage.
 * Le simulacre de matchMedia ne répond à aucune requête : la mise en page est celle du téléphone (cartes).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axe from 'axe-core';
import { I18nProvider } from '../contexts/I18nContext';
import { SettingsProvider, FALLBACK_SETTINGS } from '../contexts/SettingsContext';
import { translations } from '../i18n';
import { ETATS, cheminTexte } from '../demandes';

const chemin = [
  { id: 1, code: 'MC', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' },
  { id: 2, code: 'MC-A', nom_fr: 'Aile A', nom_nl: 'Vleugel A' },
  { id: 3, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12' },
];
const entite = { id: 1, code: 'AA', nom_fr: 'Administration fictive', nom_nl: 'Fictief bestuur', roles: ['agent', 'gestionnaire'] };
const user: Record<string, unknown> = {
  id: 7, email: 'agent@exemple.test', first_name: 'Agathe', last_name: 'Agent', user_role: 'agent', entite_id: 1, preferred_lang: 'fr',
  ui_mode: 'simple', theme: 'clair', must_change_password: 0, entites: [entite], entite_active_id: 1, nouveautes: [],
  lieu_habituel_id: null, lieu_propose: { id: 3, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12', chemin, source: 'derniere_demande' },
};
const roles = [
  { code: 'agent', portee: 'entite', defaut: true, label_fr: 'Demandeur', label_nl: 'Aanvrager', description_fr: 'd', description_nl: 'd', permissions: ['lieux:lire', 'categories:lire', 'demandes:creer'] },
  { code: 'gestionnaire', portee: 'entite', defaut: false, label_fr: 'Gestionnaire technique', label_nl: 'Technisch beheerder', description_fr: 'd', description_nl: 'd', permissions: ['lieux:lire', 'entites:membres', 'demandes:creer', 'demandes:entite'] },
];
const cat = (id: number, parent: number | null, fr: string, nl: string, icone: string, natures?: unknown[]) => ({
  id, entite_id: 1, parent_id: parent, niveau: parent ? 'nature' : 'domaine', code: `c${id}`, libelle_fr: fr, libelle_nl: nl, icone,
  priorite_defaut: 'P3', validation: 0, delai_fin_jours: null, ordre: 10, priorite_effective: 'P3', validation_effective: 0, delai_fin_jours_effectif: null,
  parent_code: null, parent_libelle_fr: null, parent_libelle_nl: null, is_active: 1, motif_desactivation: null, created_at: '', updated_at: '', ...(natures ? { natures } : {}),
});
const arbreCategories = { total: 4, domaines: [
  cat(10, null, 'Électricité et éclairage', 'Elektriciteit en verlichting', 'eclair', [cat(11, 10, 'Lampe ou éclairage en panne', 'Lamp of verlichting defect', 'ampoule')]),
  cat(20, null, 'Divers', 'Diversen', 'autre', []),
] };
const demande = (id: number, numero: string, etat: string, extra: Record<string, unknown> = {}) => ({
  id, entite_id: 1, numero, annee: 2026, sequence: id, description: 'La lampe du bureau 12 ne s’allume plus.', langue: 'fr', etat,
  ouverte: ['cloturee', 'annulee', 'refusee'].includes(etat) ? 0 : 1, priorite: 'P3', canal: 'ecran',
  lieu_id: 3, lieu_code: 'MC-A-12', lieu_nom_fr: 'Bureau 12', lieu_nom_nl: 'Bureau 12', lieu_nature: 'local', lieu_chemin: chemin,
  categorie_id: 11, categorie_code: 'c11', categorie_libelle_fr: 'Lampe ou éclairage en panne', categorie_libelle_nl: 'Lamp of verlichting defect', categorie_icone: 'ampoule',
  domaine_libelle_fr: 'Électricité et éclairage', domaine_libelle_nl: 'Elektriciteit en verlichting',
  demandeur_id: 7, demandeur_prenom: 'Agathe', demandeur_nom: 'Agent', is_demo: 0, created_at: '2026-10-26 13:05:00', updated_at: '2026-10-26 13:05:00',
  delai_annonce: { priorite: 'P3', unite: 'jours_ouvrables', delai_fin: 10, date_convenue: false, fin_le: { utc: '2026-11-10T06:45:00.000Z', local: '2026-11-10 07:45' } },
  ...extra,
});
const demandes = [demande(2, 'AA-DI-2026-00002', 'a_qualifier'), demande(1, 'AA-DI-2026-00001', 'cloturee', { delai_annonce: null })];
const lieuxTrouves = [{ id: 9, entite_id: 1, parent_id: 2, nature: 'local', code: 'ALC-21', nom_fr: 'Salle n°21', nom_nl: 'Zaal nr. 21', is_active: 1,
  chemin: [{ id: 8, code: 'ALC', nom_fr: 'Alcyons', nom_nl: 'Alcyons' }, { id: 9, code: 'ALC-21', nom_fr: 'Salle n°21', nom_nl: 'Zaal nr. 21' }] }];

const arbreLieux = [{ id: 8, entite_id: 1, parent_id: null, nature: 'site', code: 'ALC', nom_fr: 'Alcyons', nom_nl: 'Alcyons', is_active: 1,
  enfants: [{ id: 9, entite_id: 1, parent_id: 8, nature: 'local', code: 'ALC-21', nom_fr: 'Salle n°21', nom_nl: 'Zaal nr. 21', is_active: 1, enfants: [] }] }];

const refresh = vi.fn(async () => {});
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user, loading: false, isAdmin: false, login: async () => {}, logout: async () => {}, refresh, savePreferences: async () => {},
    setEntite: async () => {}, nouveautesLues: async () => {}, entite, roles: entite.roles }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const page = (data: unknown[], total = data.length) => ({ data, meta: { envelope: 1 }, pagination: { total, limit: 20, offset: 0 } });
let posts: { url: string; body: Record<string, unknown> }[] = [];
let gets: string[] = [];
// 0.7.0 (DEM-04) : demandes ouvertes du même bâtiment ; aucune par défaut.
const batiment = { id: 2, nature: 'batiment', code: 'MC-A', nom_fr: 'Maison communale', nom_nl: 'Gemeentehuis' };
const voisine = (id: number, numero: string, extra: Record<string, unknown> = {}) => ({
  id, numero, etat: 'a_qualifier', created_at: '2026-10-27 08:30:00', lieu_id: 4, lieu_code: 'MC-A-POP', lieu_nom_fr: 'Accueil Population', lieu_nom_nl: 'Onthaal Bevolking',
  categorie_id: 11, categorie_libelle_fr: 'Lampe ou éclairage en panne', categorie_libelle_nl: 'Lamp of verlichting defect', categorie_icone: 'ampoule',
  extrait: 'Le néon de l’accueil Population clignote depuis lundi matin…', meme_lieu: 0, propre: 0, suivie: 0, ...extra,
});
let voisinesData: unknown = { batiment, total: 0, demandes: [] };
// 0.7.0 (DEM-11) : brouillon du formulaire ; aucun par défaut.
let brouillonData: unknown = null;
let puts: { url: string; method: string; body: Record<string, unknown> }[] = [];
// 0.7.0 (DEM-05) : arbre sans questions par défaut ; le bloc des questions le remplace.
let arbreData: unknown = arbreCategories;
let reponsePost: { status: number; json: unknown } = { status: 201, json: { data: demande(3, 'AA-DI-2026-00003', 'a_qualifier'), meta: { envelope: 1 } } };

beforeEach(() => {
  posts = [];
  gets = [];
  voisinesData = { batiment, total: 0, demandes: [] };
  brouillonData = null;
  arbreData = arbreCategories;
  puts = [];
  reponsePost = { status: 201, json: { data: demande(3, 'AA-DI-2026-00003', 'a_qualifier'), meta: { envelope: 1 } } };
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    if (init?.method === 'POST') {
      posts.push({ url, body: JSON.parse(init.body || '{}') });
      return { ok: reponsePost.status < 400, status: reponsePost.status, statusText: 'x', json: async () => reponsePost.json };
    }
    gets.push(url);
    if (init?.method === 'PUT' || init?.method === 'DELETE') puts.push({ url, method: init.method, body: JSON.parse(init.body || '{}') });
    const json = url.startsWith('/api/demandes/brouillon') ? { data: init?.method && init.method !== 'GET' ? { efface: 1 } : brouillonData, meta: { envelope: 1 } }
      : url.startsWith('/api/demandes/voisines') ? { data: voisinesData, meta: { envelope: 1 } }
      : url.startsWith('/api/demandes/beneficiaires') ? { data: [{ id: 9, prenom: 'Hélène', nom: 'Dupré' }], meta: { envelope: 1 } }
      : url.startsWith('/api/categories/arbre') ? { data: arbreData, meta: { envelope: 1 } }
      : url.startsWith('/api/lieux/arbre') ? { data: { racines: arbreLieux, total: 2 }, meta: { envelope: 1 } }
      : url.startsWith('/api/lieux') ? page(lieuxTrouves)
      : url.match(/^\/api\/demandes\/\d+/) ? { data: demandes[0], meta: { envelope: 1 } }
      : url.startsWith('/api/demandes') ? (url.includes('etat=a_qualifier') ? page([demandes[0]], 4) : page(demandes))
      : url.startsWith('/api/roles') ? { data: roles, meta: { envelope: 1 } }
      : url.includes('/membres') ? { data: [], meta: { envelope: 1 } }
      : { data: [], meta: { envelope: 1 }, pagination: { total: 0, limit: 20, offset: 0 } };
    return { ok: true, status: 200, statusText: 'OK', json: async () => json };
  }));
});

import HomePage from '../pages/HomePage';
import NouvelleDemandePage from '../pages/NouvelleDemandePage';
import DemandesPage from '../pages/DemandesPage';

const MesDemandes = () => <DemandesPage perimetre="miennes" />;
const DemandesEntite = () => <DemandesPage perimetre="entite" />;

function wrap(C: React.ComponentType, lang: 'fr' | 'nl', entries: string[] = ['/']) {
  return (
    <SettingsProvider value={{ settings: FALLBACK_SETTINGS, reload: async () => {} }}>
      <I18nProvider defaultLang={lang}><MemoryRouter initialEntries={entries}><C /></MemoryRouter></I18nProvider>
    </SettingsProvider>
  );
}
const audit = async (container: HTMLElement) => {
  const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')}`)).toEqual([]);
};

describe('demandes (0.5.0, 0.5.1)', () => {
  beforeEach(() => { user.lieu_propose = { id: 3, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12', chemin, source: 'derniere_demande' }; });

  for (const lang of ['fr', 'nl'] as const) {
    for (const [nom, C] of [['Accueil', HomePage], ['Nouvelle demande', NouvelleDemandePage], ['Mes demandes', MesDemandes], ["Demandes de l'entité", DemandesEntite]] as [string, React.ComponentType][]) {
      it(`${nom} (${lang}) s'affiche sans violation axe-core`, async () => {
        const { container } = render(wrap(C, lang));
        await waitFor(() => expect(container.querySelector('h1')).toBeTruthy());
        await waitFor(() => expect(container.querySelector('.ant-spin-spinning')).toBeNull());
        await audit(container);
      }, 30000);
    }
  }

  it('chaque état a son libellé simple en FR et en NL (ERG-08 : jamais « DI » ni « GMAO »)', () => {
    for (const e of ETATS) {
      const tr = translations[`demande.etat.${e}`];
      expect(tr?.fr && tr?.nl, e).toBeTruthy();
      expect(`${tr.fr} ${tr.nl}`).not.toMatch(/\bDI\b|GMAO|\bOT\b/);
    }
  });

  it('accueil du demandeur : gros boutons « Nouvelle demande » et « Mes demandes », demandes en cours ; à qualifier pour le gestionnaire (ERG-03)', async () => {
    render(wrap(HomePage, 'fr'));
    expect(await screen.findByRole('link', { name: /Nouvelle demande/ })).toHaveAttribute('href', '/demandes/nouvelle');
    expect(screen.getByRole('link', { name: /^Mes demandes$/ })).toHaveAttribute('href', '/demandes');
    expect(await screen.findByRole('link', { name: /Demandes de l'entité \(4 à qualifier\)/ })).toHaveAttribute('href', '/demandes-entite');
    expect(await screen.findByText('AA-DI-2026-00002')).toBeInTheDocument();
    expect(screen.getByText('Reçue par le service technique')).toBeInTheDocument();
    expect(screen.getByText('Administration fictive')).toBeInTheDocument();
  });

  it('nouvelle demande : lieu proposé d’office avec son chemin, envoi bloqué tant qu’il manque la catégorie et 10 caractères', async () => {
    render(wrap(NouvelleDemandePage, 'fr'));
    expect(await screen.findByText(cheminTexte(chemin, 'fr'))).toBeInTheDocument();
    expect(screen.getByText('Le lieu de votre dernière demande')).toBeInTheDocument();
    const envoyer = screen.getByRole('button', { name: /Envoyer la demande/ });
    expect(envoyer).toBeDisabled();
    expect(screen.getByText(/le type de problème, une description de 10 caractères au moins/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Électricité et éclairage : voir les natures' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Lampe ou éclairage en panne' }));
    expect(screen.getByRole('button', { name: 'Lampe ou éclairage en panne' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('3. Décrivez le problème'), { target: { value: '   court   ' } });
    expect(envoyer).toBeDisabled();
    fireEvent.change(screen.getByLabelText('3. Décrivez le problème'), { target: { value: '  La lampe ne marche plus.  ' } });
    expect(envoyer).toBeEnabled();
  });

  it('nouvelle demande (0.5.1) : une description faite d’espaces montre « Ce champ est obligatoire » sous le champ, en FR et en NL', async () => {
    for (const [lang, label, msg] of [['fr', '3. Décrivez le problème', 'Ce champ est obligatoire'], ['nl', '3. Beschrijf het probleem', 'Dit veld is verplicht']] as const) {
      const { container, unmount } = render(wrap(NouvelleDemandePage, lang));
      const champ = await screen.findByLabelText(label);
      expect(screen.queryByText(msg)).toBeNull();
      fireEvent.change(champ, { target: { value: '     ' } });
      expect(screen.getByText(msg)).toBeInTheDocument();
      expect(champ).toHaveAttribute('aria-invalid', 'true');
      expect(champ.getAttribute('aria-describedby')).toContain('dem-description-erreur');
      await waitFor(() => expect(container.querySelector('.ant-spin-spinning')).toBeNull());
      await audit(container);
      fireEvent.change(champ, { target: { value: 'La porte grince fort.' } });
      expect(screen.queryByText(msg)).toBeNull();
      expect(posts).toHaveLength(0);
      unmount();
    }
  }, 30000);

  it('nouvelle demande : envoi, puis numéro, lieu, délai indicatif et liens de suite (DEM-12 écran)', async () => {
    render(wrap(NouvelleDemandePage, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: 'Divers' }));
    fireEvent.change(screen.getByLabelText('3. Décrivez le problème'), { target: { value: '  La porte du local grince fort.  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer la demande/ }));
    expect(await screen.findByText('Demande envoyée')).toBeInTheDocument();
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ lieu_id: 3, categorie_id: 20, description: 'La porte du local grince fort.', langue: 'fr' });
    expect(screen.getByText('AA-DI-2026-00003')).toBeInTheDocument();
    expect(screen.getByText(/Délai indicatif : au plus tard le mardi 10 novembre 2026/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mes demandes/ })).toHaveAttribute('href', '/demandes');
    expect(refresh).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Faire une autre demande/ }));
    expect(await screen.findByRole('button', { name: /Envoyer la demande/ })).toBeDisabled();
  });

  it('nouvelle demande (0.5.2) : après l’envoi, « Mes demandes » et « Faire une autre demande » gardent un espace quand ils passent l’un sous l’autre', async () => {
    render(wrap(NouvelleDemandePage, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: 'Divers' }));
    fireEvent.change(screen.getByLabelText('3. Décrivez le problème'), { target: { value: 'La porte du local grince fort.' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer la demande/ }));
    expect(await screen.findByText('Demande envoyée')).toBeInTheDocument();
    const mes = screen.getByRole('link', { name: /Mes demandes/ });
    const autre = screen.getByRole('button', { name: /Faire une autre demande/ });
    const suite = mes.closest('.dem-suite') as HTMLElement;
    expect(suite).not.toBeNull();
    expect(suite).toContainElement(autre);
    expect(suite.style.flexWrap).toBe('wrap');
    expect(suite.style.rowGap).toBe('12px');
    fireEvent.click(autre);
    expect(await screen.findByRole('button', { name: /Envoyer la demande/ })).toBeDisabled();
  });

  it('nouvelle demande : une erreur du serveur s’affiche et la saisie reste (ERG-09)', async () => {
    reponsePost = { status: 409, json: { error: true, code: 'DEMANDE_LIEU_INACTIF', message: "Ce lieu n'est plus actif : choisissez-en un autre." } };
    render(wrap(NouvelleDemandePage, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: 'Divers' }));
    fireEvent.change(screen.getByLabelText('3. Décrivez le problème'), { target: { value: 'Texte qui ne doit pas se perdre.' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer la demande/ }));
    expect(await screen.findByText("Ce lieu n'est plus actif : choisissez-en un autre.")).toBeInTheDocument();
    expect(screen.getByLabelText('3. Décrivez le problème')).toHaveValue('Texte qui ne doit pas se perdre.');
    expect(screen.getByRole('button', { name: 'Divers' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('nouvelle demande : changer de lieu par la recherche, résultats en boutons avec leur chemin, en néerlandais', async () => {
    render(wrap(NouvelleDemandePage, 'nl'));
    fireEvent.click(await screen.findByRole('button', { name: /Andere plaats/ }));
    fireEvent.change(screen.getByLabelText('Een plaats zoeken'), { target: { value: 'alcyons 21' } });
    const liste = await screen.findByRole('list', { name: 'Gevonden plaatsen' }, { timeout: 2000 });
    const bouton = within(liste).getByRole('button', { name: /Zaal nr\. 21/ });
    expect(bouton).toHaveTextContent('Alcyons › Zaal nr. 21');
    const appel = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls.map((c) => c[0]).find((u) => u.startsWith('/api/lieux?'));
    expect(appel).toContain('q=alcyons+21');
    expect(appel).toContain('is_active=1');
    fireEvent.click(bouton);
    expect(await screen.findByText('Alcyons › Zaal nr. 21')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Gevonden plaatsen' })).toBeNull();
  });

  it('« Mes demandes » : numéro, état simple, délai annoncé ou « À convenir » ; la fiche s’ouvre au clic (SUI-01)', async () => {
    render(wrap(MesDemandes, 'fr'));
    expect(await screen.findByRole('button', { name: 'AA-DI-2026-00002' })).toBeInTheDocument();
    expect(screen.getByText('Clôturée')).toBeInTheDocument();
    expect(screen.getByText(/Délai annoncé : mardi 10 novembre 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Délai annoncé : À convenir/)).toBeInTheDocument();
    expect(screen.queryByText('Agathe Agent')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'AA-DI-2026-00002' }));
    expect(await screen.findByText('Demande AA-DI-2026-00002')).toBeInTheDocument();
    expect(screen.getByText('Électricité et éclairage › Lampe ou éclairage en panne')).toBeInTheDocument();
  });

  it('« Mes demandes » (0.5.1) : pas de bouton « Nouvelle demande » dans la page, en FR et en NL (celui du haut de l’écran et celui du menu suffisent)', async () => {
    for (const [lang, nom] of [['fr', /Nouvelle demande/], ['nl', /Nieuwe aanvraag/]] as const) {
      const { unmount } = render(wrap(MesDemandes, lang));
      await screen.findByRole('button', { name: 'AA-DI-2026-00002' });
      expect(screen.queryByRole('link', { name: nom })).toBeNull();
      expect(screen.queryByRole('button', { name: nom })).toBeNull();
      unmount();
    }
  }, 30000);

  it('« Mes demandes » : le filtre « En cours » demande les seules ouvertes', async () => {
    render(wrap(MesDemandes, 'fr'));
    await screen.findByRole('button', { name: 'AA-DI-2026-00002' });
    fireEvent.click(screen.getByText('En cours', { selector: '.ant-segmented-item-label' }));
    await waitFor(() => {
      const urls = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls.map((c) => c[0]);
      expect(urls.some((u) => u.startsWith('/api/demandes?') && u.includes('ouvertes=1') && u.includes('perimetre=miennes'))).toBe(true);
    });
  });

  it('« Demandes de l’entité » : périmètre entité et nom du demandeur, sans bouton de dépôt', async () => {
    render(wrap(DemandesEntite, 'fr'));
    expect(await screen.findAllByText('Agathe Agent')).not.toHaveLength(0);
    const urls = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls.map((c) => c[0]);
    expect(urls.some((u) => u.includes('perimetre=entite'))).toBe(true);
    expect(screen.queryByRole('link', { name: /Nouvelle demande/ })).toBeNull();
  });
  it('liste des bâtiments (0.5.1) : « Parcourir » ouvre et referme, « Masquer la liste » referme et rend le focus', async () => {
    render(wrap(NouvelleDemandePage, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: /Changer de lieu/ }));
    const parcourir = screen.getByRole('button', { name: /Parcourir la liste des bâtiments/ });
    expect(parcourir).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(parcourir);
    expect(await screen.findByText('Alcyons (ALC)')).toBeInTheDocument();
    expect(parcourir).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Masquer la liste/ }));
    expect(screen.queryByText('Alcyons (ALC)')).toBeNull();
    expect(parcourir).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(parcourir);
    fireEvent.click(parcourir);
    expect(await screen.findByText('Alcyons (ALC)')).toBeInTheDocument();
    fireEvent.click(parcourir);
    expect(screen.queryByText('Alcyons (ALC)')).toBeNull();
    fireEvent.click(parcourir);
    fireEvent.click(await screen.findByText('Alcyons (ALC)'));
    expect(await screen.findAllByText('Alcyons')).not.toHaveLength(0);
    expect(screen.queryByText('Alcyons (ALC)')).toBeNull();
    expect(screen.queryByRole('button', { name: /Masquer la liste/ })).toBeNull();
  }, 30000);

  it('liste des bâtiments (0.5.1) : sans lieu proposé, « Annuler » referme la liste ; en néerlandais, sans violation axe-core', async () => {
    user.lieu_propose = null;
    const { container } = render(wrap(NouvelleDemandePage, 'nl'));
    const parcourir = await screen.findByRole('button', { name: /De lijst van de gebouwen doorlopen/ });
    expect(screen.queryByRole('button', { name: 'Annuleren' })).toBeNull();
    fireEvent.click(parcourir);
    expect(await screen.findByText('Alcyons (ALC)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lijst verbergen/ })).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector('.ant-spin-spinning')).toBeNull());
    await audit(container);
    fireEvent.click(screen.getByRole('button', { name: 'Annuleren' }));
    expect(screen.queryByText('Alcyons (ALC)')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Annuleren' })).toBeNull();
    expect(screen.getByLabelText('Een plaats zoeken')).toBeInTheDocument();
  }, 30000);
});

describe('demandes du même bâtiment et « Moi aussi » (0.7.0, DEM-04)', () => {
  beforeEach(() => { user.lieu_propose = { id: 3, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12', chemin, source: 'derniere_demande' }; });

  it('aucune demande ouverte dans le bâtiment : rien ne s’affiche', async () => {
    render(wrap(NouvelleDemandePage, 'fr'));
    await screen.findByRole('button', { name: 'Divers' });
    await waitFor(() => expect(gets.some((u) => u.startsWith('/api/demandes/voisines?lieu_id=3'))).toBe(true));
    expect(screen.queryByText(/déjà ouverte/)).toBeNull();
  });

  it('bloc replié, puis cartes sans nom de demandeur, « Votre demande » pour la sienne ; catégorie choisie passée au serveur', async () => {
    voisinesData = { batiment, total: 2, demandes: [voisine(5, 'AA-DI-2026-00005'), voisine(6, 'AA-DI-2026-00006', { propre: 1, extrait: 'Ma propre demande.' })] };
    render(wrap(NouvelleDemandePage, 'fr'));
    const bascule = await screen.findByRole('button', { name: /2 demandes déjà ouvertes dans ce bâtiment \(Maison communale\)/ });
    expect(bascule).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/néon/)).toBeNull();
    fireEvent.click(bascule);
    expect(bascule).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText(/Le néon de l’accueil Population/)).toBeInTheDocument();
    expect(screen.getByText('Votre demande')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Moi aussi/ })).toHaveLength(1);
    expect(screen.queryByText(/Agathe|Agent\b/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Électricité et éclairage/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^Lampe ou éclairage en panne$/ }));
    await waitFor(() => expect(gets.some((u) => u.includes('/api/demandes/voisines?lieu_id=3&categorie_id=11'))).toBe(true));
  });

  it('« Moi aussi » : confirmation avec le numéro, texte joint pour le service technique, puis écran « Vous suivez cette demande »', async () => {
    voisinesData = { batiment, total: 1, demandes: [voisine(5, 'AA-DI-2026-00005')] };
    reponsePost = { status: 200, json: { data: demande(5, 'AA-DI-2026-00005', 'a_qualifier', { suivie: 1, demandeur_id: null, demandeur_prenom: null, demandeur_nom: null }), meta: { envelope: 1 } } };
    render(wrap(NouvelleDemandePage, 'fr'));
    fireEvent.change(await screen.findByLabelText('3. Décrivez le problème'), { target: { value: '  Chez nous aussi, guichet 4.  ' } });
    fireEvent.click(await screen.findByRole('button', { name: /1 demande déjà ouverte/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^Moi aussi/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Vous suivrez la demande AA-DI-2026-00005 \(Lampe ou éclairage en panne · Accueil Population\)/)).toBeInTheDocument();
    expect(within(dialog).getByText(/sera joint pour le service technique/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Moi aussi' }));
    expect(await screen.findByText('Vous suivez cette demande')).toBeInTheDocument();
    expect(posts).toEqual([{ url: '/api/demandes/5/suivre', body: { remarque: 'Chez nous aussi, guichet 4.' } }]);
    expect(screen.getByText('AA-DI-2026-00005')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Faire une autre demande/ }));
    expect(await screen.findByRole('button', { name: /Envoyer la demande/ })).toBeDisabled();
  });

  it('« Voir les autres (N) » demande la liste complète ; en néerlandais, sans violation axe-core', async () => {
    voisinesData = { batiment, total: 7, demandes: [1, 2, 3, 4, 5].map((i) => voisine(10 + i, `AA-DI-2026-0001${i}`)) };
    const { container } = render(wrap(NouvelleDemandePage, 'nl'));
    fireEvent.click(await screen.findByRole('button', { name: /7 aanvragen al open in dit gebouw \(Gemeentehuis\)/ }));
    expect(await screen.findAllByRole('button', { name: /^Ik ook/ })).toHaveLength(5);
    await audit(container);
    fireEvent.click(screen.getByRole('button', { name: 'De andere bekijken (2)' }));
    await waitFor(() => expect(gets.some((u) => u.includes('limit=50'))).toBe(true));
  }, 30000);

  it('« Mes demandes » : une demande suivie porte « Vous suivez aussi cette demande », sa fiche le redit, sans demandeur', async () => {
    const suivie = demande(5, 'AA-DI-2026-00005', 'a_qualifier', { suivie: 1, demandeur_id: null, demandeur_prenom: null, demandeur_nom: null });
    demandes.splice(0, demandes.length, suivie, demande(1, 'AA-DI-2026-00001', 'cloturee', { delai_annonce: null }));
    try {
      render(wrap(MesDemandes, 'fr', ['/demandes?demande=5']));
      expect(await screen.findAllByText('Vous suivez aussi cette demande')).toHaveLength(1);
      expect(await screen.findByText(/déposée par un collègue/)).toBeInTheDocument();
    } finally {
      demandes.splice(0, demandes.length, demande(2, 'AA-DI-2026-00002', 'a_qualifier'), demande(1, 'AA-DI-2026-00001', 'cloturee', { delai_annonce: null }));
    }
  });

  it('« Demandes de l’entité » : la fiche cite les personnes qui suivent et leur remarque', async () => {
    const avec = demande(2, 'AA-DI-2026-00002', 'a_qualifier', { nb_suiveurs: 1,
      suiveurs: [{ user_id: 9, prenom: 'Bruno', nom: 'Collègue', remarque: 'Chez nous aussi, guichet 4.', created_at: '2026-10-27 09:00:00' }] });
    demandes.splice(0, 1, avec);
    try {
      render(wrap(DemandesEntite, 'fr', ['/demandes-entite?demande=2']));
      expect(await screen.findByText('Suivie aussi par')).toBeInTheDocument();
      expect(screen.getByText(/Bruno Collègue/)).toBeInTheDocument();
      expect(screen.getByText('Chez nous aussi, guichet 4.')).toBeInTheDocument();
    } finally {
      demandes.splice(0, 1, demande(2, 'AA-DI-2026-00002', 'a_qualifier'));
    }
  });
});

describe('case « Danger » (0.7.0, DEM-06)', () => {
  beforeEach(() => {
    user.lieu_propose = { id: 3, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12', chemin, source: 'derniere_demande' };
    user.telephone_urgence = '02 464 04 11';
  });

  it('cochée : numéro à appeler en lien « tel: », envoi avec danger, écran « priorité absolue » sans heure', async () => {
    reponsePost = { status: 201, json: { data: demande(3, 'AA-DI-2026-00003', 'a_qualifier', { danger: 1, priorite: 'P1', delai_annonce: null }), meta: { envelope: 1 } } };
    render(wrap(NouvelleDemandePage, 'fr'));
    const caseDanger = await screen.findByRole('checkbox', { name: 'Danger pour les personnes ou les biens' });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(caseDanger);
    const alerte = await screen.findByRole('alert');
    expect(within(alerte).getByRole('link', { name: '02 464 04 11' })).toHaveAttribute('href', 'tel:024640411');
    expect(within(alerte).getByText('Votre demande sera traitée en priorité absolue.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Divers' }));
    fireEvent.change(screen.getByLabelText('3. Décrivez le problème'), { target: { value: 'Câble électrique à nu dans le couloir.' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer la demande/ }));
    expect(await screen.findByText('Traitée en priorité absolue par le service technique.')).toBeInTheDocument();
    expect(posts[0].body).toMatchObject({ danger: 1 });
    expect(screen.queryByText(/Délai indicatif/)).toBeNull();
    expect(screen.getByRole('link', { name: '02 464 04 11' })).toBeInTheDocument();
  });

  it('non cochée : rien n’est envoyé pour le danger ; sans numéro, consigne de prévenir son responsable (NL, axe-core)', async () => {
    user.telephone_urgence = null;
    const { container } = render(wrap(NouvelleDemandePage, 'nl'));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Gevaar voor personen of goederen' }));
    expect(await screen.findByText(/Verwittig bij onmiddellijk gevaar meteen uw verantwoordelijke/)).toBeInTheDocument();
    await audit(container);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Gevaar voor personen of goederen' }));
    expect(screen.queryByRole('alert')).toBeNull();
  }, 30000);

  it('« Mes demandes » : mention « Danger » et « Priorité absolue » au lieu d’un délai', async () => {
    demandes.splice(0, 1, demande(2, 'AA-DI-2026-00002', 'a_qualifier', { danger: 1, priorite: 'P1', delai_annonce: null }));
    try {
      render(wrap(MesDemandes, 'fr'));
      expect(await screen.findByText('Danger')).toBeInTheDocument();
      expect(screen.getByText(/Priorité absolue/)).toBeInTheDocument();
    } finally {
      demandes.splice(0, 1, demande(2, 'AA-DI-2026-00002', 'a_qualifier'));
    }
  });
});

describe('« Pour », date souhaitée et créneau (0.7.0, DEM-07, DEM-08)', () => {
  beforeEach(() => { user.lieu_propose = { id: 3, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12', chemin, source: 'derniere_demande' }; });

  const remplir = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Divers' }));
    fireEvent.change(screen.getByLabelText('3. Décrivez le problème'), { target: { value: 'Chaise cassée au bureau 12.' } });
  };

  it('pour un collègue : recherche, choix en bouton, envoi de beneficiaire_id, rappel après l’envoi', async () => {
    reponsePost = { status: 201, json: { data: demande(3, 'AA-DI-2026-00003', 'a_qualifier', { beneficiaire_id: 9, beneficiaire_prenom: 'Hélène', beneficiaire_nom: 'Dupré' }), meta: { envelope: 1 } } };
    render(wrap(NouvelleDemandePage, 'fr'));
    await remplir();
    const lien = screen.getByRole('button', { name: /Pour quelqu'un d'autre/ });
    expect(lien).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(lien);
    fireEvent.change(screen.getByLabelText('Nom du collègue'), { target: { value: 'hel' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Hélène Dupré' }));
    expect(screen.getByText('Hélène Dupré')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retirer/ })).toBeInTheDocument();
    await waitFor(() => expect(gets.some((u) => u.startsWith('/api/demandes/beneficiaires?q=hel'))).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: /Envoyer la demande/ }));
    expect(await screen.findByText('Pour : Hélène Dupré')).toBeInTheDocument();
    expect(posts[0].body).toMatchObject({ beneficiaire_id: 9 });
    expect(posts[0].body).not.toHaveProperty('beneficiaire_texte');
  });

  it('pour un service sans compte, avec un moment à respecter : texte et créneau envoyés, champs vides omis', async () => {
    render(wrap(NouvelleDemandePage, 'fr'));
    await remplir();
    fireEvent.click(screen.getByRole('button', { name: /Pour quelqu'un d'autre/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Un service ou une personne sans compte' }));
    fireEvent.change(screen.getByLabelText('Pour qui ?'), { target: { value: '  Service Population ' } });
    fireEvent.click(screen.getByRole('button', { name: /Une date ou un moment à respecter/ }));
    expect(screen.getByLabelText('Date souhaitée')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Moment à respecter'), { target: { value: 'pas pendant les permanences' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer la demande/ }));
    await screen.findByText('Demande envoyée');
    expect(posts[0].body).toMatchObject({ beneficiaire_texte: 'Service Population', creneau: 'pas pendant les permanences' });
    expect(posts[0].body).not.toHaveProperty('beneficiaire_id');
    expect(posts[0].body).not.toHaveProperty('date_souhaitee');
  });

  it('sections ouvertes en néerlandais, sans violation axe-core', async () => {
    const { container } = render(wrap(NouvelleDemandePage, 'nl'));
    fireEvent.click(await screen.findByRole('button', { name: /Voor iemand anders/ }));
    fireEvent.click(screen.getByRole('button', { name: /Een datum of moment/ }));
    expect(screen.getByLabelText('Naam van de collega')).toBeInTheDocument();
    await audit(container);
  }, 30000);

  it('fiche : pour qui, date souhaitée et moment ; « Faite pour vous » pour le bénéficiaire', async () => {
    demandes.splice(0, 1, demande(2, 'AA-DI-2026-00002', 'a_qualifier', { pour_moi: 1, demandeur_prenom: 'Bruno', demandeur_nom: 'Collègue',
      date_souhaitee: '2026-11-06', creneau: 'après 16 h' }));
    try {
      render(wrap(MesDemandes, 'fr', ['/demandes?demande=2']));
      expect(await screen.findAllByText('Faite pour vous')).toHaveLength(1);
      expect(await screen.findByText(/Cette demande a été faite pour vous par Bruno Collègue/)).toBeInTheDocument();
      expect(screen.getByText('vendredi 6 novembre 2026')).toBeInTheDocument();
      expect(screen.getByText('après 16 h')).toBeInTheDocument();
    } finally {
      demandes.splice(0, 1, demande(2, 'AA-DI-2026-00002', 'a_qualifier'));
    }
  });
});

describe('brouillon (0.7.0, DEM-11)', () => {
  beforeEach(() => { user.lieu_propose = { id: 3, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12', chemin, source: 'derniere_demande' }; });
  const enregistre = { entite_id: 1, updated_at: '2026-10-28 09:05:00', contenu: { danger: 1, lieu: { id: 3, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12', chemin },
    categorie: { id: 20, libelle_fr: 'Divers', libelle_nl: 'Diversen', icone: 'autre', domaine_fr: null, domaine_nl: null },
    description: 'La porte du local commence à', pour_mode: 'texte', collegue: null, beneficiaire_texte: 'Service Population', date_souhaitee: null, creneau: 'après 16 h' } };

  it('brouillon trouvé : bandeau, rien n’est enregistré avant le choix ; « Reprendre » remet tout le formulaire', async () => {
    brouillonData = enregistre;
    render(wrap(NouvelleDemandePage, 'fr'));
    expect(await screen.findByText(/Vous aviez commencé une demande le \d\d\/10\/2026 à \d\d:05/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('3. Décrivez le problème'), { target: { value: 'Je tape sans choisir.' } });
    await new Promise((r) => { setTimeout(r, 1800); });
    expect(puts).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre' }));
    expect(screen.queryByText(/Vous aviez commencé/)).toBeNull();
    expect(screen.getByLabelText('3. Décrivez le problème')).toHaveValue('La porte du local commence à');
    expect(screen.getByRole('checkbox', { name: 'Danger pour les personnes ou les biens' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /Pour quelqu'un d'autre/ }));
    expect(screen.getByLabelText('Pour qui ?')).toHaveValue('Service Population');
  }, 15000);

  it('« Recommencer à zéro » efface le brouillon sur le serveur', async () => {
    brouillonData = enregistre;
    render(wrap(NouvelleDemandePage, 'fr'));
    fireEvent.click(await screen.findByRole('button', { name: 'Recommencer à zéro' }));
    await waitFor(() => expect(puts).toEqual([{ url: '/api/demandes/brouillon', method: 'DELETE', body: {} }]));
    expect(screen.getByLabelText('3. Décrivez le problème')).toHaveValue('');
  });

  it('enregistrement automatique après un changement, avec l’heure ; formulaire vide : rien n’est envoyé', async () => {
    // Lieu proposé tel que le serveur le rend, nature comprise (défaut de recette 0.7.0) : seuls les champs du schéma partent.
    user.lieu_propose = { id: 3, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12', nature: 'local', chemin: chemin.map((e) => ({ ...e, nature: 'site' })), source: 'habituel' };
    render(wrap(NouvelleDemandePage, 'fr'));
    await screen.findByRole('button', { name: 'Divers' });
    await new Promise((r) => { setTimeout(r, 1800); });
    expect(puts).toEqual([]);
    fireEvent.change(screen.getByLabelText('3. Décrivez le problème'), { target: { value: 'Une lampe' } });
    await waitFor(() => expect(puts.length).toBe(1), { timeout: 4000 });
    expect(puts[0]).toMatchObject({ url: '/api/demandes/brouillon', method: 'PUT' });
    expect((puts[0].body.contenu as Record<string, unknown>).description).toBe('Une lampe');
    expect((puts[0].body.contenu as Record<string, unknown>).lieu).toEqual({ id: 3, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12', source: 'habituel',
      chemin: chemin.map((e) => ({ ...e, nature: 'site' })) });
    expect(await screen.findByText(/Brouillon enregistré à \d\d:\d\d/)).toBeInTheDocument();
  }, 15000);
});

describe('questions propres à la catégorie (0.7.0, DEM-05)', () => {
  const ouiNon = [{ valeur: 'oui', fr: 'Oui', nl: 'Ja' }, { valeur: 'non', fr: 'Non', nl: 'Nee' }];
  const qDomaine = { id: 31, categorie_id: 10, origine: 'domaine', question_fr: 'Est-ce tout le bâtiment ?', question_nl: 'Is het hele gebouw getroffen?', type: 'oui_non', reponses: ouiNon, obligatoire: 0 };
  const qNature = { id: 32, categorie_id: 11, origine: 'nature', question_fr: 'Combien de lampes ?', question_nl: 'Hoeveel lampen?', type: 'choix', obligatoire: 1,
    reponses: [{ valeur: '1', fr: 'Une', nl: 'Eén' }, { valeur: '2', fr: 'Plusieurs', nl: 'Meerdere' }] };
  const avecQuestions = { total: 4, domaines: [
    { ...cat(10, null, 'Électricité et éclairage', 'Elektriciteit en verlichting', 'eclair', [{ ...cat(11, 10, 'Lampe ou éclairage en panne', 'Lamp of verlichting defect', 'ampoule'), questions: [qDomaine, qNature] }]), questions: [qDomaine] },
    { ...cat(20, null, 'Divers', 'Diversen', 'autre', []), questions: [] },
  ] };
  beforeEach(() => {
    user.lieu_propose = { id: 3, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12', chemin, source: 'derniere_demande' };
    arbreData = avecQuestions;
  });
  const choisirLampe = async () => {
    fireEvent.click(await screen.findByRole('button', { name: /Électricité et éclairage/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Lampe ou éclairage en panne' }));
  };

  it('après le choix : questions du domaine puis de la nature, en boutons ; l’obligatoire bloque l’envoi, puis les réponses partent avec la demande', async () => {
    reponsePost = { status: 201, json: { data: demande(3, 'AA-DI-2026-00003', 'a_qualifier', { reponses: [
      { question_id: 32, question_fr: 'Combien de lampes ?', question_nl: 'Hoeveel lampen?', valeur: '2', reponse_fr: 'Plusieurs', reponse_nl: 'Meerdere' }] }), meta: { envelope: 1 } } };
    render(wrap(NouvelleDemandePage, 'fr'));
    expect(screen.queryByRole('group', { name: /Combien de lampes/ })).toBeNull();
    await choisirLampe();
    await screen.findByRole('group', { name: /Combien de lampes/ });
    const groupes = screen.getAllByRole('group').filter((g) => /^dem-q-/.test(g.getAttribute('aria-labelledby') || ''));
    expect(groupes.map((g) => g.getAttribute('aria-labelledby'))).toEqual(['dem-q-31', 'dem-q-32']);
    expect(screen.getByText('(obligatoire)')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('3. Décrivez le problème'), { target: { value: 'Les néons du couloir ne marchent plus.' } });
    expect(screen.getByRole('button', { name: /Envoyer la demande/ })).toBeDisabled();
    expect(screen.getByText(/la réponse aux questions obligatoires/)).toBeInTheDocument();
    expect(within(groupes[1]).getByText('Ce champ est obligatoire')).toBeInTheDocument();
    const plusieurs = within(groupes[1]).getByRole('button', { name: 'Plusieurs' });
    fireEvent.click(plusieurs);
    expect(plusieurs).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(plusieurs);
    expect(plusieurs).toHaveAttribute('aria-pressed', 'true'); // une question obligatoire garde sa réponse
    const oui = within(groupes[0]).getByRole('button', { name: 'Oui' });
    fireEvent.click(oui);
    fireEvent.click(oui);
    expect(oui).toHaveAttribute('aria-pressed', 'false'); // une question facultative se relâche
    fireEvent.click(screen.getByRole('button', { name: /Envoyer la demande/ }));
    expect(await screen.findByText('Demande envoyée')).toBeInTheDocument();
    expect(posts[0].body.reponses).toEqual([{ question_id: 32, valeur: '2' }]);
    expect(screen.getByText('Combien de lampes ? Plusieurs')).toBeInTheDocument();
  }, 20000);

  it('sans questions : rien ne s’affiche et rien n’est envoyé ; changer de catégorie retire les réponses qui ne valent plus', async () => {
    render(wrap(NouvelleDemandePage, 'fr'));
    await choisirLampe();
    fireEvent.click(within(await screen.findByRole('group', { name: /Combien de lampes/ })).getByRole('button', { name: 'Une' }));
    fireEvent.click(screen.getByRole('button', { name: /Revenir aux domaines/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Divers' }));
    expect(screen.queryByRole('group', { name: /Combien de lampes/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('3. Décrivez le problème'), { target: { value: 'Une chaise est cassée.' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer la demande/ }));
    await waitFor(() => expect(posts.length).toBe(1));
    expect(posts[0].body).not.toHaveProperty('reponses');
  }, 20000);

  it('brouillon : réponses enregistrées sans les questions ; à la reprise, la catégorie retrouve ses questions et les réponses reviennent', async () => {
    render(wrap(NouvelleDemandePage, 'fr'));
    await choisirLampe();
    fireEvent.click(within(await screen.findByRole('group', { name: /Combien de lampes/ })).getByRole('button', { name: 'Une' }));
    await waitFor(() => expect(puts.length).toBe(1), { timeout: 4000 });
    const contenu = puts[0].body.contenu as Record<string, unknown>;
    expect(contenu.reponses).toEqual([{ question_id: 32, valeur: '1' }]);
    expect(contenu.categorie).not.toHaveProperty('questions');
  }, 15000);

  it('reprise d’un brouillon avec réponses ; en néerlandais, sans violation axe-core', async () => {
    brouillonData = { entite_id: 1, updated_at: '2026-10-28 09:05:00', contenu: { categorie: { id: 11, libelle_fr: 'Lampe ou éclairage en panne', libelle_nl: 'Lamp of verlichting defect', icone: 'ampoule', domaine_fr: 'Électricité et éclairage', domaine_nl: 'Elektriciteit en verlichting' },
      reponses: [{ question_id: 31, valeur: 'non' }, { question_id: 32, valeur: '2' }], description: 'Plus de lumière.' } };
    const { container } = render(wrap(NouvelleDemandePage, 'nl'));
    fireEvent.click(await screen.findByRole('button', { name: 'Verdergaan' }));
    const groep = await screen.findByRole('group', { name: /Hoeveel lampen/ });
    expect(within(groep).getByRole('button', { name: 'Meerdere' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: /hele gebouw/ })).getByRole('button', { name: 'Nee' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('(verplicht)')).toBeInTheDocument();
    await audit(container);
  }, 20000);

  it('fiche : les réponses sont lues par le demandeur, dans sa langue', async () => {
    const avec = demande(2, 'AA-DI-2026-00002', 'a_qualifier', { reponses: [
      { question_id: 31, question_fr: 'Est-ce tout le bâtiment ?', question_nl: 'Is het hele gebouw getroffen?', valeur: 'non', reponse_fr: 'Non', reponse_nl: 'Nee' }] });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, status: 200, statusText: 'OK',
      json: async () => (url.match(/^\/api\/demandes\/\d+/) ? { data: avec, meta: { envelope: 1 } } : page([avec])) })));
    render(wrap(MesDemandes, 'nl', ['/demandes?demande=2']));
    expect(await screen.findByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Is het hele gebouw getroffen?', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Nee')).toBeInTheDocument();
  });
});

describe('mentions RGPD et consigne (0.7.0, RGPD-10, DEM-16)', () => {
  beforeEach(() => {
    user.lieu_propose = { id: 3, code: 'MC-A-12', nom_fr: 'Bureau 12', nom_nl: 'Bureau 12', chemin, source: 'derniere_demande' };
    user.protection_donnees = {
      mention_courte_fr: 'Vos données servent uniquement à traiter votre demande.', mention_courte_nl: 'Uw gegevens dienen enkel om uw aanvraag te behandelen.',
      mention_fr: 'Administration fictive traite les données de cette demande. DPO : dpo@exemple.test.', mention_nl: 'Fictief bestuur verwerkt de gegevens. DPO: dpo@exemple.test.', dpo_contact: 'dpo@exemple.test',
    };
  });

  it('mention courte au-dessus du bouton d’envoi ; « En savoir plus » déplie le texte complet sans quitter la page', async () => {
    render(wrap(NouvelleDemandePage, 'fr'));
    expect(await screen.findByText(/Vos données servent uniquement à traiter votre demande\./)).toBeInTheDocument();
    const plus = screen.getByRole('button', { name: 'En savoir plus' });
    expect(plus).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(/Administration fictive traite les données/)).not.toBeVisible();
    fireEvent.click(plus);
    expect(screen.getByRole('button', { name: 'Masquer' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Administration fictive traite les données/)).toBeVisible();
    // DEM-16 : l'aide de la description rappelle de ne citer personne.
    expect(screen.getByText(/Ne citez pas de nom ni de donnée personnelle sur une autre personne\./)).toBeInTheDocument();
  });

  it('en néerlandais, texte complet ouvert, sans violation axe-core', async () => {
    const { container } = render(wrap(NouvelleDemandePage, 'nl'));
    fireEvent.click(await screen.findByRole('button', { name: 'Meer weten' }));
    expect(screen.getByText(/Fictief bestuur verwerkt de gegevens/)).toBeVisible();
    expect(screen.getByText(/Vermeld geen naam of persoonsgegevens van een andere persoon\./)).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector('.ant-spin-spinning')).toBeNull());
    await audit(container);
  }, 30000);
});
