/**
 * Contrôle des téléphones (0.13.0, point 1 ; DV-102 : tout doit marcher sur iPhone et Android).
 * Parcourt chaque écran du menu en FR et en NL aux largeurs des téléphones courants et signale : défilement
 * horizontal, texte qui sort de l'écran, champ en moins de 16 px (l'iPhone agrandirait la page), en-tête trop large,
 * erreur de la console et appel refusé de l'API. Lecture seule, sauf la langue de la personne, remise à la fin.
 * À lancer sur un poste avec navigateur, contre une installation d'acceptance garnie des données de démonstration :
 *   npx playwright install chromium   (une fois)
 *   MOBILE_BASE_URL=https://… MOBILE_USER=… MOBILE_PASSWORD=… npm run mobile:check
 * MOBILE_CHROMIUM : chemin d'un Chromium déjà installé (facultatif). Code de sortie 1 si un défaut est trouvé.
 * 0.14.0 (point 7) : ouvre aussi la fiche (volet latéral) d'une demande de la personne et d'une demande de l'entité, si
 * elles existent, et signale un volet plus large que l'écran (un tableau qui déborde sans faire défiler la page).
 * 0.15.0 (point 6) : parmi les demandes lues, ouvre celles dont le fil est le plus garni (messages, note interne avec
 * mention, pièce jointe) ; le volet du service est mesuré une seconde fois en « Note interne au service », avec les
 * champs « Prévenir un collègue » et le fil complet (défaut de la 0.15.0 vu à la main : étiquette de mention plus large
 * que le volet de 3 px à 360 px) ; signale aussi un contenu plus large que sa bulle de message.
 * 0.16.0 (point 7) : écrans nouveaux du service technique (encoder une demande reçue, colonnes par état et bouton
 * « Déplacer », formulaires « Regrouper » et « Découper » d'une demande « À qualifier ») et deux comptes de plus,
 * facultatifs, pour les écrans que le service technique ne voit pas :
 *   MOBILE_VALIDEUR_USER (chef de service : « Demandes à valider », la fiche et le refus avec motif) ;
 *   MOBILE_ADMIN_USER (administrateur : « Services et valideurs » et sa fiche, le volet des rôles et du service d'une
 *   personne) ; mot de passe : MOBILE_VALIDEUR_PASSWORD et MOBILE_ADMIN_PASSWORD, sinon MOBILE_PASSWORD.
 * Un compte absent est signalé « non contrôlé » à la fin. Les formulaires sont ouverts, jamais envoyés.
 * 0.16.1 (méthode convenue le 14/11/2026, après la recette de la 0.16.0) :
 *   - moteur WebKit en plus de Chromium : celui de Safari et d'Edge sur iPhone, à 320 et 390 px ; Chromium garde les quatre
 *     largeurs (Android). MOBILE_MOTEURS=chromium ou =webkit pour n'en jouer qu'un (les deux par défaut) ;
 *     `npx playwright install webkit` une fois ;
 *   - image qui ne s'affiche pas (photo, vignette, capture) signalée ;
 *   - MOBILE_PARCOURS=1 : parcours complets au doigt sur chaque moteur (mobile-check/parcours.mjs), qui ÉCRIVENT dans la
 *     base : refusés hors d'une copie locale (localhost) ; compte de plus MOBILE_AGENT_USER (agent du service du chef).
 *     MOBILE_ECRANS=0 : parcours seuls, sans le tour des écrans.
 */

import { chromium, webkit, devices } from '@playwright/test';
import { parcours, hoteLocal } from './parcours.mjs';

const B = (process.env.MOBILE_BASE_URL || 'https://localhost:18443').replace(/\/$/, '');
const USER = process.env.MOBILE_USER;
const PASSWORD = process.env.MOBILE_PASSWORD;
if (!USER || !PASSWORD) { console.error('MOBILE_USER et MOBILE_PASSWORD sont requis.'); process.exit(2); }

const ROUTES = ['/', '/demandes/nouvelle', '/demandes', '/demandes-entite', '/patrimoine', '/listes',
  '/referentiel', '/referentiel?onglet=priorites', '/referentiel?onglet=calendrier', '/referentiel?onglet=simulateur', '/referentiel?onglet=etats', '/referentiel?onglet=modeles',
  '/patrimoine?photo=sans', '/reglages-entite', '/entites', '/users', '/parametres', '/parametres?onglet=modules', '/parametres?onglet=connexion',
  '/parametres?onglet=tickets', '/journal', '/tickets', '/help', '/help?fiche=journal', '/accessibility',
  // 0.16.0 : encodage, colonnes par état, « Déplacer » (le formulaire du passage s'ouvre, rien n'est envoyé).
  '/demandes/encoder', '/demandes-entite?affichage=colonnes', '/demandes-entite?affichage=colonnes#deplacer'];
const MOTEURS = (process.env.MOBILE_MOTEURS || 'chromium,webkit').split(',').map((m) => m.trim()).filter(Boolean);
const TOUS = [
  ['iPhone SE (320 px)', devices['iPhone SE'], 'chromium'],
  ['Android 360 px', { ...devices['Galaxy S9+'], viewport: { width: 360, height: 740 } }, 'chromium'],
  ['iPhone 13 (390 px)', devices['iPhone 13'], 'chromium'],
  ['Pixel 7 (412 px)', devices['Pixel 7'], 'chromium'],
  // 0.16.1 : moteur de Safari et d'Edge sur iPhone.
  ['iPhone SE · WebKit (320 px)', devices['iPhone SE'], 'webkit'],
  ['iPhone 13 · WebKit (390 px)', devices['iPhone 13'], 'webkit'],
];
const APPAREILS = TOUS.filter(([, , m]) => MOTEURS.includes(m));
if (!APPAREILS.length) { console.error(`MOBILE_MOTEURS inconnu : ${MOTEURS.join(', ')} (chromium, webkit).`); process.exit(2); }
const PARCOURS = process.env.MOBILE_PARCOURS === '1';
if (PARCOURS && !hoteLocal(B)) { console.error('MOBILE_PARCOURS=1 écrit dans la base : réservé à une copie locale (localhost).'); process.exit(2); }

/**
 * Comptes contrôlés et leurs écrans ; « fiches » est lu par l'API avec le compte (0.16.0). Après « # » : une action
 * faite avant la mesure (voir agir()).
 */
const COMPTES = [
  { nom: 'service technique', user: USER, password: PASSWORD, routes: (f) => [...ROUTES,
    ...(f.mienne ? [`/demandes?demande=${f.mienne}`] : []),
    ...(f.entite ? [`/demandes-entite?demande=${f.entite}`, `/demandes-entite?demande=${f.entite}#note-interne`] : []),
    ...(f.aQualifier ? [`/demandes-entite?demande=${f.aQualifier}#regrouper`, `/demandes-entite?demande=${f.aQualifier}#decouper`] : [])] },
  { nom: 'chef de service', user: process.env.MOBILE_VALIDEUR_USER, password: process.env.MOBILE_VALIDEUR_PASSWORD || PASSWORD,
    routes: (f) => ['/', '/a-valider', '/demandes', ...(f.aValider ? [`/a-valider?demande=${f.aValider}`, `/a-valider?demande=${f.aValider}#refuser`] : [])] },
  { nom: 'administrateur', user: process.env.MOBILE_ADMIN_USER, password: process.env.MOBILE_ADMIN_PASSWORD || PASSWORD,
    routes: () => ['/services', '/services#ouvrir', '/users#ouvrir'] },
];

const mesurer = () => {
  const W = innerWidth;
  const sort = [...document.querySelectorAll('body *')].filter((e) => {
    const b = e.getBoundingClientRect(); const s = getComputedStyle(e);
    if (!b.width || s.visibility === 'hidden' || s.display === 'none') return false;
    if (e.closest('.ant-table-content, .ant-table-body, .ant-tabs-nav-wrap, .ant-drawer:not(.ant-drawer-open), .ant-select-dropdown, .ant-tooltip')) return false;
    return b.right > W + 2 && e.childElementCount === 0 && (e.textContent || '').trim();
  }).slice(0, 3).map((e) => `« ${(e.textContent || '').trim().slice(0, 30)} »`);
  const petits = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), textarea')]
    .filter((i) => i.getBoundingClientRect().width && parseFloat(getComputedStyle(i).fontSize) < 16).length;
  const h = document.querySelector('header');
  const volet = document.querySelector('.ant-drawer-open .ant-drawer-body');
  // 0.15.0 (point 6) : contenu plus large que sa bulle de message (étiquette de mention, mot long, vignette).
  const bulles = [...document.querySelectorAll('.fil-bulle')].filter((b) => b.scrollWidth > b.clientWidth + 1).length;
  // 0.16.1 : image chargée mais vide (fichier refusé, introuvable ou illisible par le moteur).
  const images = [...document.querySelectorAll('img')].filter((i) => i.getBoundingClientRect().width && i.complete && i.naturalWidth === 0)
    .slice(0, 3).map((i) => (i.getAttribute('alt') || i.getAttribute('src') || '').slice(0, 40));
  return { large: document.documentElement.scrollWidth, W, sort, petits, entete: h ? h.scrollWidth - h.clientWidth : 0,
    volet: volet ? volet.scrollWidth - volet.clientWidth : 0, bulles, images };
};

/** Action avant la mesure ; rend un texte si l'élément attendu manque (signalé comme défaut). */
async function agir(page, action) {
  const cliquer = async (loc, quoi) => {
    if (!(await loc.count())) return `${quoi} introuvable`;
    // 0.16.1 : un élément couvert (fenêtre ouverte par-dessus) est un défaut signalé, pas un arrêt du contrôle.
    try { await loc.first().click({ timeout: 5000 }); } catch (e) { return `${quoi} : clic impossible (${e.message.split('\n').find((l) => /intercepts/.test(l))?.trim() || 'délai dépassé'})`; }
    await page.waitForTimeout(700); return null;
  };
  switch (action) {
    // 0.15.0 : « Note interne au service » choisi, pour mesurer les champs propres à la note (mention).
    case 'note-interne': return cliquer(page.locator('.fil-saisie .ant-radio-button-wrapper').nth(1), '« Note interne »');
    case 'regrouper': return cliquer(page.locator('.ant-drawer-open button').filter({ hasText: /Regrouper avec|Samenvoegen met/ }), '« Regrouper »');
    case 'decouper': return cliquer(page.locator('.ant-drawer-open button:has(.anticon-scissor)'), '« Découper »');
    case 'refuser': return cliquer(page.locator('.ant-drawer-open button').filter({ hasText: /Refuser la demande|De aanvraag weigeren/ }), '« Refuser »');
    case 'deplacer': {
      const pb = await cliquer(page.locator('.col-carte button:has(.anticon-drag)'), '« Déplacer »');
      return pb || cliquer(page.locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item'), 'état permis');
    }
    case 'ouvrir': return cliquer(page.locator('.ant-table-row .ant-btn-link, .ant-table-row .ant-btn:not(.ant-btn-dangerous)'), 'ligne à ouvrir');
    default: return null;
  }
}

const preferer = (page, lg) => page.evaluate(async (l) => {
  const me = await fetch('/api/auth/me').then((r) => r.json());
  await fetch('/api/auth/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': me.data.csrf_token }, body: JSON.stringify({ preferred_lang: l }) });
}, lg);

/**
 * Attend la fin des animations (0.16.1) : dans WebKit, le volet latéral glisse encore depuis la droite plus d'une seconde
 * après l'ouverture, et sa mesure ferait croire à du texte hors de l'écran. Rend un défaut si rien ne s'est arrêté en 5 s.
 */
async function stable(page) {
  try {
    await page.waitForFunction(() => [...document.querySelectorAll('.ant-drawer-open .ant-drawer-content-wrapper, .ant-modal-wrap .ant-modal')]
      .every((e) => ['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(e).transform))
      && document.getAnimations().every((a) => a.playState !== 'running'), null, { timeout: 5000, polling: 100 });
    return null;
  } catch { return 'animation encore en cours après 5 s'; }
}

/** Défauts d'un écran mesuré (commun aux écrans et aux parcours). */
const problemes = (m) => {
  const pb = [];
  if (m.large > m.W + 1) pb.push(`défilement horizontal (${m.large} px pour ${m.W})`);
  if (m.sort.length) pb.push(`sort de l'écran : ${m.sort.join(', ')}`);
  if (m.petits) pb.push(`${m.petits} champ(s) en moins de 16 px`);
  if (m.entete > 1) pb.push(`en-tête trop large de ${m.entete} px`);
  if (m.volet > 1) pb.push(`volet trop large de ${m.volet} px`);
  if (m.bulles) pb.push(`${m.bulles} message(s) plus large(s) que leur bulle`);
  if (m.images.length) pb.push(`image(s) qui ne s'affiche(nt) pas : ${m.images.join(', ')}`);
  return pb;
};

const navigateurs = {};
const lancer = async (m) => {
  navigateurs[m] = navigateurs[m] || await (m === 'webkit' ? webkit.launch()
    : chromium.launch(process.env.MOBILE_CHROMIUM ? { executablePath: process.env.MOBILE_CHROMIUM } : {}));
  return navigateurs[m];
};
/** Sessions par compte, reprises d'un moteur à l'autre : une seule connexion par compte (limite de 15 par quart d'heure). */
const sessions = new Map();
async function connecter(navigateur, appareil, user, password) {
  const ctx = await navigateur.newContext({ ...appareil, ignoreHTTPSErrors: true, ...(sessions.has(user) ? { storageState: sessions.get(user) } : {}) });
  const page = await ctx.newPage();
  const erreurs = [];
  const suivi = { connecte: false, sansNouveautes: false };
  // 0.16.1 : après le premier écran, la fenêtre « Nouveautés » d'une version non encore lue est retirée des réponses,
  // dans ce navigateur seulement : rien n'est marqué lu (le contrôle 1 de la recette reste possible).
  await page.route('**/api/auth/me', async (route) => {
    const r = await route.fetch();
    if (!suivi.sansNouveautes) return route.fulfill({ response: r });
    const j = await r.json().catch(() => null);
    if (j?.data) j.data.nouveautes = [];
    return route.fulfill({ response: r, json: j });
  });
  page.on('console', (m) => { if (suivi.connecte && m.type() === 'error') erreurs.push(m.text().slice(0, 140)); });
  page.on('response', (r) => { if (suivi.connecte && r.url().includes('/api/') && r.status() >= 400) erreurs.push(`${r.status()} ${r.url().replace(B, '')}`); });
  if (sessions.has(user)) await page.goto(`${B}/`);
  else {
    await page.goto(`${B}/login?local=1`);
    await page.fill('input[type=email], input#email, input[autocomplete=username]', user);
    await page.fill('input[type=password]', password);
    await page.keyboard.press('Enter');
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
    sessions.set(user, await ctx.storageState());
  }
  return { ctx, page, erreurs, suivi };
}

const defauts = [];
let nbEcrans = 0;
const nonControles = COMPTES.filter((c) => !c.user).map((c) => c.nom);
// MOBILE_ECRANS=0 : parcours seuls, sans le tour des écrans (mise au point des parcours).
const ECRANS = process.env.MOBILE_ECRANS !== '0';
for (const compte of COMPTES.filter((c) => c.user && ECRANS)) {
  let langueInitiale = null;
  // Une seule connexion par compte, reprise par chaque appareil et chaque moteur (0.16.0, 0.16.1).
  for (const [nom, appareil, moteur] of APPAREILS) {
    for (const lang of ['fr', 'nl']) {
      const { ctx, page, erreurs, suivi } = await connecter(await lancer(moteur), appareil, compte.user, compte.password);
      const quoi = `${compte.nom} · ${nom} · ${lang.toUpperCase()}`;
      langueInitiale = langueInitiale || await page.evaluate(async () => (await fetch('/api/auth/me').then((r) => r.json())).data.preferred_lang);
      await preferer(page, lang);
      // Fiches (volets) lues par l'API : une demande de la personne et une de l'entité, celle dont le fil est le plus
      // garni (0.15.0) ; une demande « À qualifier » (regrouper, découper) et une demande à valider (0.16.0).
      const fiches = await page.evaluate(async () => {
        const score = async (id) => {
          const r = await fetch(`/api/demandes/${id}/messages`); if (!r.ok) return 0;
          const m = (await r.json()).data || [];
          return m.length + 5 * m.some((x) => x.mentions && x.mentions.length) + 3 * m.some((x) => x.pieces && x.pieces.length) + 2 * m.some((x) => x.interne);
        };
        const ids = async (u) => { const r = await fetch(u); return r.ok ? ((await r.json()).data || []).map((d) => d.id) : []; };
        const meilleure = async (u) => {
          let best = null; let max = -1;
          for (const id of await ids(u)) { const s = await score(id); if (s > max) { max = s; best = id; } }
          return best;
        };
        return { mienne: await meilleure('/api/demandes?limit=20'), entite: await meilleure('/api/demandes?perimetre=entite&limit=20'),
          aQualifier: (await ids('/api/demandes?perimetre=entite&etats=a_qualifier&limit=1'))[0] ?? null,
          aValider: (await ids('/api/demandes/a-valider?limit=1'))[0] ?? null };
      });
      // Les erreurs comptent à partir d'ici : la lecture des fiches ci-dessus essaie des listes que le compte n'a pas
      // toujours le droit de lire (le chef de service n'a pas les demandes de l'entité).
      suivi.connecte = true;
      const routes = compte.routes(fiches);
      if (nom === APPAREILS[0][0] && lang === 'fr') nbEcrans += routes.length;
      for (const r of routes) {
        const [adresse, action] = r.split('#');
        await page.goto(B + adresse);
        await page.waitForTimeout(1200);
        const manque = action ? await agir(page, action) : null;
        const fige = await stable(page);
        const m = await page.evaluate(mesurer);
        const pb = [...(manque ? [manque] : []), ...(fige ? [fige] : []), ...problemes(m)];
        if (pb.length) defauts.push(`${quoi} · ${r} : ${pb.join(' ; ')}`);
        suivi.sansNouveautes = true;
      }
      if (erreurs.length) defauts.push(`${quoi} · erreurs : ${[...new Set(erreurs)].join(' ; ')}`);
      if (nom === APPAREILS.at(-1)[0] && lang === 'nl' && langueInitiale) await preferer(page, langueInitiale);
      await ctx.close();
    }
  }
}
// 0.16.1 : parcours complets, un par moteur (WebKit en iPhone SE à 320 px, Chromium en Android à 360 px).
let nbParcours = 0;
if (PARCOURS) {
  const agent = process.env.MOBILE_AGENT_USER;
  const valideur = process.env.MOBILE_VALIDEUR_USER;
  if (!agent || !valideur) defauts.push('parcours : MOBILE_AGENT_USER et MOBILE_VALIDEUR_USER sont requis');
  else {
    const comptes = {
      agent: { user: agent, password: process.env.MOBILE_AGENT_PASSWORD || PASSWORD },
      valideur: { user: valideur, password: process.env.MOBILE_VALIDEUR_PASSWORD || PASSWORD },
      service: { user: USER, password: PASSWORD },
    };
    const controler = async (page) => { const fige = await stable(page); return [...(fige ? [fige] : []), ...problemes(await page.evaluate(mesurer))]; };
    for (const [moteur, appareil] of [['chromium', TOUS[1][1]], ['webkit', TOUS[4][1]]].filter(([m]) => MOTEURS.includes(m))) {
      defauts.push(...await parcours(await lancer(moteur), moteur, appareil, comptes, { B, connecter, controler }));
      nbParcours += 1;
    }
  }
}
for (const n of Object.values(navigateurs)) await n.close();
const moteurs = [...new Set(APPAREILS.map(([, , m]) => m))].join(' et ');
console.log(defauts.length ? defauts.join('\n')
  : `Aucun défaut : ${nbEcrans} écrans, ${APPAREILS.length} appareils (${moteurs}), FR et NL${nbParcours ? ` ; parcours complets sur ${nbParcours} moteur(s)` : ''}.`);
if (nonControles.length) console.log(`Non contrôlé (compte non fourni) : ${nonControles.join(', ')}.`);
process.exit(defauts.length ? 1 : 0);
