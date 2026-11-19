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
 * 0.18.0 (point 0) : chaque ouverture d'écran attend la fin du chargement (ouvrir() et charge() de parcours.mjs).
 * 0.18.0 (point 1) : fenêtre de la recherche globale ouverte avec des résultats (service technique et chef de service) :
 *   47 écrans avec les trois comptes.
 * 0.18.0 (point 3) : assistant ouvert avec une réponse de suivi (service technique) : 48 écrans.
 * 0.18.0 (point 4) : visite guidée à sa dernière étape (service technique) : 49 écrans ; ouverture automatique coupée.
 * 0.19.0 (point 2) : Équipes (liste, fiche d'une équipe à horaire propre, onglet Ouvriers et fiche d'un ouvrier) : 53 écrans.
 * 0.19.0 (point 3) : onglet Prestataires et fiche d'un prestataire : 55 écrans.
 * 0.19.0 (point 4) : formulaire de qualification d'une demande « À qualifier » et fiche d'une catégorie : 57 écrans.
 * 0.19.0 (point 1) : un écran qui renvoie ailleurs (compte sans le droit) est un défaut, jamais mesuré à la place de
 *   l'écran voulu. Compte du service technique (MOBILE_USER) : administrateur avec le rôle de responsable dans l'entité,
 *   comme pour les captures de l'aide (écrans du responsable et de l'administrateur compris).
 * 0.19.0 (point 0) : chaque étape de la visite est mesurée (marges du panneau, pied sur une ligne, boutons dans le panneau),
 *   sur les six appareils, dont 320 et 390 px dans WebKit.
 * 0.17.0 (point 7) : volet de la cloche ouvert (service technique et chef de service), onglet Courriel de Paramètres et
 *   fiche d'un modèle de courriel avec son aperçu (administrateur) : 45 écrans avec les trois comptes.
 */

import { chromium, webkit, devices } from '@playwright/test';
import { parcours, hoteLocal, charge, ouvrir } from './parcours.mjs';

const B = (process.env.MOBILE_BASE_URL || 'https://localhost:18443').replace(/\/$/, '');
const USER = process.env.MOBILE_USER;
const PASSWORD = process.env.MOBILE_PASSWORD;
if (!USER || !PASSWORD) { console.error('MOBILE_USER et MOBILE_PASSWORD sont requis.'); process.exit(2); }

const ROUTES = ['/', '/demandes/nouvelle', '/demandes', '/demandes-entite', '/patrimoine', '/listes',
  '/referentiel', '/referentiel?onglet=priorites', '/referentiel?onglet=calendrier', '/referentiel?onglet=simulateur', '/referentiel?onglet=etats', '/referentiel?onglet=modeles',
  '/patrimoine?photo=sans', '/reglages-entite', '/entites', '/users', '/parametres', '/parametres?onglet=modules', '/parametres?onglet=connexion',
  '/parametres?onglet=tickets', '/journal', '/tickets', '/help', '/help?fiche=journal', '/accessibility',
  // 0.16.0 : encodage, colonnes par état, « Déplacer » (le formulaire du passage s'ouvre, rien n'est envoyé).
  '/demandes/encoder', '/demandes-entite?affichage=colonnes', '/demandes-entite?affichage=colonnes#deplacer',
  // 0.19.0 (étape 15) : équipes, fiche d'une équipe à horaire propre (jours et heures), ouvriers et fiche d'un ouvrier.
  '/equipes', '/equipes#equipe', '/equipes?onglet=ouvriers', '/equipes?onglet=ouvriers#ouvrier',
  // 0.19.0 (point 3) : prestataires externes et fiche d'un prestataire.
  '/equipes?onglet=prestataires', '/equipes?onglet=prestataires#prestataire'];
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
  { nom: 'service technique', user: USER, password: PASSWORD, routes: (f) => [...ROUTES, '/#cloche', '/#recherche', '/#chatbot', '/#visite',
    ...(f.mienne ? [`/demandes?demande=${f.mienne}`] : []),
    ...(f.entite ? [`/demandes-entite?demande=${f.entite}`, `/demandes-entite?demande=${f.entite}#note-interne`] : []),
    ...(f.aQualifier ? [`/demandes-entite?demande=${f.aQualifier}#regrouper`, `/demandes-entite?demande=${f.aQualifier}#decouper`,
      // 0.19.0 (point 4) : formulaire de qualification (corps de métier proposé) ; rien n'est envoyé.
      `/demandes-entite?demande=${f.aQualifier}#qualifier`] : []),
    // 0.19.0 (point 4) : fiche d'une catégorie (corps de métier par défaut).
    '/referentiel#categorie'] },
  { nom: 'chef de service', user: process.env.MOBILE_VALIDEUR_USER, password: process.env.MOBILE_VALIDEUR_PASSWORD || PASSWORD,
    routes: (f) => ['/', '/#cloche', '/#recherche', '/a-valider', '/demandes', ...(f.aValider ? [`/a-valider?demande=${f.aValider}`, `/a-valider?demande=${f.aValider}#refuser`] : [])] },
  { nom: 'administrateur', user: process.env.MOBILE_ADMIN_USER, password: process.env.MOBILE_ADMIN_PASSWORD || PASSWORD,
    // 0.17.0 (point 2) : onglet Courriel de Paramètres (réglages, essai, journal des courriels retenus).
    routes: () => ['/services', '/services#ouvrir', '/users#ouvrir', '/parametres?onglet=courriel', '/parametres?onglet=courriel#modele'] },
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
    // 0.19.0 : fiche de l'équipe qui a le plus de jours (horaire propre affiché), et fiche du premier ouvrier.
    case 'equipe': {
      const lignes = page.locator('.ant-table-row');
      const n = await lignes.count();
      let choix = -1; let max = -1;
      for (let i = 0; i < n; i += 1) {
        const jours = ((await lignes.nth(i).innerText()).match(/\d{2}:\d{2}–\d{2}:\d{2}/g) || []).length;
        if (jours > max) { max = jours; choix = i; }
      }
      if (choix < 0) return 'équipe introuvable';
      return cliquer(lignes.nth(choix).locator('.ant-btn-link'), 'équipe');
    }
    case 'ouvrier': return cliquer(page.locator('.ant-table-row .ant-btn-link'), 'ouvrier');
    case 'prestataire': return cliquer(page.locator('.ant-table-row .ant-btn-link'), 'prestataire');
    case 'qualifier': return cliquer(page.locator('.ant-drawer-open button').filter({ hasText: /^Qualifier$|^Kwalificeren$/ }), '« Qualifier »');
    case 'categorie': return cliquer(page.locator('.ant-table-row').first(), 'catégorie');
    case 'ouvrir': return cliquer(page.locator('.ant-table-row .ant-btn-link, .ant-table-row .ant-btn:not(.ant-btn-dangerous)'), 'ligne à ouvrir');
    // 0.17.0 (point 7) : volet de la cloche (en-tête) ; fiche d'un modèle de courriel et son aperçu (Paramètres › Courriel).
    case 'cloche': return cliquer(page.locator('header button[aria-label^="Notifications"], header button[aria-label^="Meldingen"]'), 'cloche');
    case 'modele': {
      const pb = await cliquer(page.locator('.ant-card').filter({ hasText: /Modèles de courriel|E-mailmodellen/ }).locator('.ant-list-item .ant-btn-link'), 'modèle de courriel');
      return pb || cliquer(page.locator('.ant-drawer-open button').filter({ hasText: /Aperçu en français|Voorbeeld in het Frans/ }), '« Aperçu »');
    }
    // 0.18.0 (point 1) : fenêtre de la recherche globale (loupe de l'en-tête), remplie de « DI- » (numéros des demandes).
    case 'recherche': {
      // Sous 360 px, la loupe est en tête du menu latéral (l'en-tête ne la contient pas).
      const loupe = page.locator('header button[aria-label="Rechercher"], header button[aria-label="Zoeken"]');
      const pb = (await loupe.count()) ? await cliquer(loupe, 'loupe de la recherche')
        : (await cliquer(page.locator('header button').first(), 'menu')) || await cliquer(page.locator('.ant-drawer-open .recherche-menu'), '« Rechercher » du menu');
      if (pb) return pb;
      await page.locator('.ant-modal-wrap input').first().fill('DI-');
      // Résultats, ou « Aucun résultat » pour un compte sans demande à lui (chef de service de démonstration).
      try { await page.locator('.ant-modal-wrap .recherche-resultat, .ant-modal-wrap .ant-empty').first().waitFor({ timeout: 8000 }); } catch { return 'recherche sans réponse pour « DI- »'; }
      return null;
    }
    // 0.18.0 (point 3) : assistant ouvert en plein écran, question de suivi posée, réponse lue par l'API (AID-03).
    case 'chatbot': {
      const pb = await cliquer(page.locator('button[aria-label="Ouvrir l\'assistant"], button[aria-label="Assistent openen"]'), 'bouton de l’assistant');
      if (pb) return pb;
      await page.locator('.chatbot-widget input').first().fill('où en est ma demande');
      await page.locator('.chatbot-widget input').first().press('Enter');
      try { await page.locator('.chatbot-messages li, .chatbot-messages .ant-btn-link').first().waitFor({ timeout: 8000 }); } catch { return 'assistant sans réponse au suivi'; }
      return null;
    }
    // 0.18.0 (point 4) : visite guidée ouverte (comme « Revoir la visite guidée ») et menée jusqu'à sa dernière étape,
    // l'assistant en bas à droite, la plus exposée au débordement.
    // 0.19.0 (point 0, défaut 2 de la recette de la 0.18.0) : CHAQUE étape est mesurée : panneau à 8 px au moins des deux
    // bords, compteur et boutons sur une seule ligne, chaque bouton dans le panneau. La dernière reste ouverte pour la
    // mesure commune de l'écran. Passage d'une étape à l'autre attendu sur le compteur, sans attente fixe.
    case 'visite': {
      await page.evaluate(() => window.dispatchEvent(new Event('app-visite')));
      try { await page.locator('.visite-guidee .visite-compteur').first().waitFor({ timeout: 5000 }); } catch { return 'visite guidée non ouverte'; }
      const defautsVisite = [];
      for (let i = 0; i < 15; i += 1) {
        await stable(page);
        const m = await page.evaluate(() => {
          const W = window.innerWidth;
          const panneau = document.querySelector('.visite-guidee .ant-tour-content').getBoundingClientRect();
          const pied = [...document.querySelector('.visite-guidee .ant-tour-footer').querySelectorAll('.visite-compteur, .ant-btn')];
          // Une ligne de plus dès qu'un élément commence sous le bas du plus haut (aucun recouvrement vertical).
          const rects = pied.map((e) => e.getBoundingClientRect());
          const basHaut = Math.min(...rects.map((r) => r.bottom));
          const lignes = rects.some((r) => r.top >= basHaut - 1) ? 2 : 1;
          const dehors = pied.filter((e) => { const r = e.getBoundingClientRect(); return r.left < panneau.left - 1 || r.right > panneau.right + 1; })
            .map((e) => e.textContent.trim());
          const [n, total] = document.querySelector('.visite-guidee .visite-compteur').textContent.split('/').map((x) => Number(x.trim()));
          return { n, total, titre: document.querySelector('.visite-guidee .ant-tour-title')?.textContent,
            gauche: Math.round(panneau.left), droite: Math.round(W - panneau.right), lignes, dehors };
        });
        const ou = `visite, étape ${m.n}/${m.total} « ${m.titre} »`;
        if (m.gauche < 8 || m.droite < 8) defautsVisite.push(`${ou} : panneau à ${m.gauche} px du bord gauche et ${m.droite} px du bord droit (8 px au moins)`);
        if (m.lignes > 1) defautsVisite.push(`${ou} : compteur et boutons sur ${m.lignes} lignes`);
        if (m.dehors.length) defautsVisite.push(`${ou} : bouton hors du panneau (${m.dehors.join(', ')})`);
        if (!m.n || m.n >= m.total) break;
        try {
          await page.locator('.visite-guidee .ant-tour-next-btn').first().click({ timeout: 5000 });
          await page.waitForFunction((k) => document.querySelector('.visite-guidee .visite-compteur')?.textContent.trim().startsWith(`${k} /`), m.n + 1, { timeout: 5000 });
        } catch { defautsVisite.push(`${ou} : « Suivant » sans effet`); break; }
      }
      return defautsVisite.length ? defautsVisite.join(' ; ') : null;
    }
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
  // 0.18.0 (point 4) : pas de visite guidée automatique (elle couvrirait les écrans) ; l'écran #visite l'ouvre à la demande.
  await ctx.addInitScript(() => window.localStorage.setItem('gmao.visite.auto', '0'));
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
  if (sessions.has(user)) await ouvrir(page, `${B}/`);
  else {
    await page.goto(`${B}/login?local=1`);
    await page.fill('input[type=email], input#email, input[autocomplete=username]', user);
    await page.fill('input[type=password]', password);
    await page.keyboard.press('Enter');
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
    await charge(page); // 0.18.0 (point 0) : écran d'accueil chargé avant la suite
    sessions.set(user, await ctx.storageState());
  }
  return { ctx, page, erreurs, suivi };
}

const defauts = [];
let nbEcrans = 0;
const nonControles = COMPTES.filter((c) => !c.user).map((c) => c.nom);
// MOBILE_ECRANS=0 : parcours seuls, sans le tour des écrans (mise au point des parcours).
const ECRANS = process.env.MOBILE_ECRANS !== '0';
// 0.19.0 (point 0) : MOBILE_ROUTES=/#visite,/demandes (liste exacte, séparée par des virgules) ne joue que ces écrans,
// pour rejouer vite un contrôle ; le passage de référence se fait toujours sans ce filtre (le résumé le signale).
const FILTRE = (process.env.MOBILE_ROUTES || '').split(',').map((r) => r.trim()).filter(Boolean);
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
      const routes = compte.routes(fiches).filter((r) => !FILTRE.length || FILTRE.includes(r));
      if (nom === APPAREILS[0][0] && lang === 'fr') nbEcrans += routes.length;
      for (const r of routes) {
        const [adresse, action] = r.split('#');
        await ouvrir(page, B + adresse);
        await page.waitForTimeout(1200);
        // 0.19.0 (point 1) : un écran refusé au compte renvoie ailleurs (accueil) ; il n'est pas compté comme contrôlé.
        const voulu = new URL(B + adresse).pathname;
        const arrive = new URL(page.url()).pathname;
        if (arrive !== voulu) { defauts.push(`${quoi} · ${r} : écran non ouvert, renvoyé vers ${arrive} (compte sans le droit ?)`); continue; }
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
  : `Aucun défaut : ${nbEcrans} écrans, ${APPAREILS.length} appareils (${moteurs}), FR et NL${nbParcours ? ` ; parcours complets sur ${nbParcours} moteur(s)` : ''}${FILTRE.length ? ` (filtre MOBILE_ROUTES : passage partiel)` : ''}.`);
if (nonControles.length) console.log(`Non contrôlé (compte non fourni) : ${nonControles.join(', ')}.`);
process.exit(defauts.length ? 1 : 0);
