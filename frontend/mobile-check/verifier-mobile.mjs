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
 */
import { chromium, devices } from '@playwright/test';

const B = (process.env.MOBILE_BASE_URL || 'https://localhost:18443').replace(/\/$/, '');
const USER = process.env.MOBILE_USER;
const PASSWORD = process.env.MOBILE_PASSWORD;
if (!USER || !PASSWORD) { console.error('MOBILE_USER et MOBILE_PASSWORD sont requis.'); process.exit(2); }

const ROUTES = ['/', '/demandes/nouvelle', '/demandes', '/demandes-entite', '/patrimoine', '/listes',
  '/referentiel', '/referentiel?onglet=priorites', '/referentiel?onglet=calendrier', '/referentiel?onglet=simulateur', '/referentiel?onglet=etats', '/referentiel?onglet=modeles',
  '/patrimoine?photo=sans', '/reglages-entite', '/entites', '/users', '/parametres', '/parametres?onglet=modules', '/parametres?onglet=connexion',
  '/parametres?onglet=tickets', '/journal', '/tickets', '/help', '/help?fiche=journal', '/accessibility'];
const APPAREILS = [
  ['iPhone SE (320 px)', devices['iPhone SE']],
  ['Android 360 px', { ...devices['Galaxy S9+'], viewport: { width: 360, height: 740 } }],
  ['iPhone 13 (390 px)', devices['iPhone 13']],
  ['Pixel 7 (412 px)', devices['Pixel 7']],
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
  return { large: document.documentElement.scrollWidth, W, sort, petits, entete: h ? h.scrollWidth - h.clientWidth : 0,
    volet: volet ? volet.scrollWidth - volet.clientWidth : 0, bulles };
};

const navigateur = await chromium.launch(process.env.MOBILE_CHROMIUM ? { executablePath: process.env.MOBILE_CHROMIUM } : {});
const defauts = [];
let nbEcrans = ROUTES.length;
let langueInitiale = null;
for (const [nom, appareil] of APPAREILS) {
  for (const lang of ['fr', 'nl']) {
    const ctx = await navigateur.newContext({ ...appareil, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const erreurs = [];
    let connecte = false;
    page.on('console', (m) => { if (connecte && m.type() === 'error') erreurs.push(m.text().slice(0, 140)); });
    page.on('response', (r) => { if (connecte && r.url().includes('/api/') && r.status() >= 400) erreurs.push(`${r.status()} ${r.url().replace(B, '')}`); });
    await page.goto(`${B}/login?local=1`);
    await page.fill('input[type=email], input#email, input[autocomplete=username]', USER);
    await page.fill('input[type=password]', PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
    connecte = true;
    langueInitiale = langueInitiale || await page.evaluate(async () => (await fetch('/api/auth/me').then((r) => r.json())).data.preferred_lang);
    await page.evaluate(async (lg) => {
      const me = await fetch('/api/auth/me').then((r) => r.json());
      await fetch('/api/auth/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': me.data.csrf_token }, body: JSON.stringify({ preferred_lang: lg }) });
    }, lang);
    // Fiches (volets) : une demande de la personne, une demande de l'entité (service technique), lues par l'API ; de
    // préférence celle dont le fil est le plus garni (0.15.0).
    const fiches = await page.evaluate(async () => {
      const score = async (id) => {
        const r = await fetch(`/api/demandes/${id}/messages`); if (!r.ok) return 0;
        const m = (await r.json()).data || [];
        return m.length + 5 * m.some((x) => x.mentions && x.mentions.length) + 3 * m.some((x) => x.pieces && x.pieces.length) + 2 * m.some((x) => x.interne);
      };
      const meilleure = async (u) => {
        const r = await fetch(u); if (!r.ok) return null;
        const ids = ((await r.json()).data || []).map((d) => d.id);
        let best = ids[0] ?? null; let max = -1;
        for (const id of ids) { const s = await score(id); if (s > max) { max = s; best = id; } }
        return best;
      };
      return { mienne: await meilleure('/api/demandes?limit=20'), entite: await meilleure('/api/demandes?perimetre=entite&limit=20') };
    });
    const routes = [...ROUTES, ...(fiches.mienne ? [`/demandes?demande=${fiches.mienne}`] : []),
      ...(fiches.entite ? [`/demandes-entite?demande=${fiches.entite}`, `/demandes-entite?demande=${fiches.entite}#note-interne`] : [])];
    if (nom === APPAREILS[0][0] && lang === 'fr') nbEcrans = routes.length;
    for (const r of routes) {
      await page.goto(B + r);
      await page.waitForTimeout(1200);
      // 0.15.0 : « Note interne au service » choisi, pour mesurer les champs propres à la note (mention).
      if (r.endsWith('#note-interne')) {
        const choix = page.locator('.fil-saisie .ant-radio-button-wrapper').nth(1);
        if (await choix.count()) { await choix.click(); await page.waitForTimeout(600); }
      }
      const m = await page.evaluate(mesurer);
      const pb = [];
      if (m.large > m.W + 1) pb.push(`défilement horizontal (${m.large} px pour ${m.W})`);
      if (m.sort.length) pb.push(`sort de l'écran : ${m.sort.join(', ')}`);
      if (m.petits) pb.push(`${m.petits} champ(s) en moins de 16 px`);
      if (m.entete > 1) pb.push(`en-tête trop large de ${m.entete} px`);
      if (m.volet > 1) pb.push(`volet trop large de ${m.volet} px`);
      if (m.bulles) pb.push(`${m.bulles} message(s) plus large(s) que leur bulle`);
      if (pb.length) defauts.push(`${nom} · ${lang.toUpperCase()} · ${r} : ${pb.join(' ; ')}`);
    }
    if (erreurs.length) defauts.push(`${nom} · ${lang.toUpperCase()} · erreurs : ${[...new Set(erreurs)].join(' ; ')}`);
    if (nom === APPAREILS.at(-1)[0] && lang === 'nl' && langueInitiale) {
      await page.evaluate(async (lg) => {
        const me = await fetch('/api/auth/me').then((r) => r.json());
        await fetch('/api/auth/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': me.data.csrf_token }, body: JSON.stringify({ preferred_lang: lg }) });
      }, langueInitiale);
    }
    await ctx.close();
  }
}
await navigateur.close();
console.log(defauts.length ? defauts.join('\n') : `Aucun défaut : ${nbEcrans} écrans, ${APPAREILS.length} largeurs, FR et NL.`);
process.exit(defauts.length ? 1 : 0);
