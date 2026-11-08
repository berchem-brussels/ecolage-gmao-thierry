/**
 * Contrôle des téléphones (0.13.0, point 1 ; DV-102 : tout doit marcher sur iPhone et Android).
 * Parcourt chaque écran du menu en FR et en NL aux largeurs des téléphones courants et signale : défilement
 * horizontal, texte qui sort de l'écran, champ en moins de 16 px (l'iPhone agrandirait la page), en-tête trop large,
 * erreur de la console et appel refusé de l'API. Lecture seule, sauf la langue de la personne, remise à la fin.
 * À lancer sur un poste avec navigateur, contre une installation d'acceptance garnie des données de démonstration :
 *   npx playwright install chromium   (une fois)
 *   MOBILE_BASE_URL=https://… MOBILE_USER=… MOBILE_PASSWORD=… npm run mobile:check
 * MOBILE_CHROMIUM : chemin d'un Chromium déjà installé (facultatif). Code de sortie 1 si un défaut est trouvé.
 */
import { chromium, devices } from '@playwright/test';

const B = (process.env.MOBILE_BASE_URL || 'https://localhost:18443').replace(/\/$/, '');
const USER = process.env.MOBILE_USER;
const PASSWORD = process.env.MOBILE_PASSWORD;
if (!USER || !PASSWORD) { console.error('MOBILE_USER et MOBILE_PASSWORD sont requis.'); process.exit(2); }

const ROUTES = ['/', '/demandes/nouvelle', '/demandes', '/demandes-entite', '/patrimoine', '/listes',
  '/referentiel', '/referentiel?onglet=priorites', '/referentiel?onglet=calendrier', '/referentiel?onglet=simulateur',
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
  return { large: document.documentElement.scrollWidth, W, sort, petits, entete: h ? h.scrollWidth - h.clientWidth : 0 };
};

const navigateur = await chromium.launch(process.env.MOBILE_CHROMIUM ? { executablePath: process.env.MOBILE_CHROMIUM } : {});
const defauts = [];
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
    for (const r of ROUTES) {
      await page.goto(B + r);
      await page.waitForTimeout(1200);
      const m = await page.evaluate(mesurer);
      const pb = [];
      if (m.large > m.W + 1) pb.push(`défilement horizontal (${m.large} px pour ${m.W})`);
      if (m.sort.length) pb.push(`sort de l'écran : ${m.sort.join(', ')}`);
      if (m.petits) pb.push(`${m.petits} champ(s) en moins de 16 px`);
      if (m.entete > 1) pb.push(`en-tête trop large de ${m.entete} px`);
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
console.log(defauts.length ? defauts.join('\n') : `Aucun défaut : ${ROUTES.length} écrans, ${APPAREILS.length} largeurs, FR et NL.`);
process.exit(defauts.length ? 1 : 0);
