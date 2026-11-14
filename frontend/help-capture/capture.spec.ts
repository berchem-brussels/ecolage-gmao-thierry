/**
 * Captures annotées de l'aide, en français et en néerlandais, produites depuis l'application avec les données de
 * démonstration (standard, section 13.1 ; gabarit 1.3.0, help-capture/capture.spec.ts ; 0.12.0). Jamais de capture
 * à la main, jamais de photo réelle (DV-12) : la base est celle d'une démonstration, aux noms fictifs.
 *
 * Variables : HELP_BASE_URL, HELP_USER et HELP_PASSWORD (compte de démonstration administrateur, avec le rôle de
 * responsable dans l'entité active, pour voir tous les écrans), HELP_ONLY (identifiants séparés par des virgules),
 * HELP_LANGS (fr, nl ou fr,nl). Le mot de passe se passe par l'environnement, jamais dans un fichier.
 * 0.16.0 : une capture peut demander un autre compte (shot.compte, code d'un rôle) pour un écran que l'administrateur
 * ne voit pas (« Demandes à valider » du chef de service) : HELP_USER_<CODE> et, s'il diffère, HELP_PASSWORD_<CODE>
 * (par défaut HELP_PASSWORD). Sans ce compte, la capture est notée FAIL avec la variable qui manque.
 *
 * GMAO : la fenêtre « Nouveautés » est marquée lue avant les captures ; la langue se règle par le profil ; une
 * capture dont un repère manque est notée FAIL avec le repère, sans arrêter les autres.
 * Résultat : public/aide-captures/<langue>/<id>.jpg (pas public/help : voir shotSrc dans TopicView.tsx) ; rapport OK ou FAIL par capture dans help-capture/rapport-<langue>.txt
 * (hors de public/ : il n'est pas servi aux agents ; hors du dépôt, .gitignore).
 */
import { test, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TOPICS } from '../src/help';
import { translations } from '../src/i18n';

const LANGS = (process.env.HELP_LANGS || 'fr,nl').split(',') as ('fr' | 'nl')[];
const ONLY = process.env.HELP_ONLY ? new Set(process.env.HELP_ONLY.split(',')) : null;
// Paquet en modules ES : __dirname n'existe pas (le script du gabarit 1.3.0 s'arrête là, E-37).
const HAUTEUR_MAX = 1500;
const ICI = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(ICI, '..', 'public', 'aide-captures');

async function api(page: Page, method: string, url: string, body?: unknown) {
  await page.evaluate(async ({ method, url, body }) => {
    const me = await (await fetch('/api/auth/me')).json();
    await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': me.data.csrf_token }, body: JSON.stringify(body ?? {}) });
  }, { method, url, body });
}

/**
 * Repère numéroté. Dans une fenêtre ou un panneau (conteneur), le repère est posé dans le conteneur même : il suit le
 * conteneur quand Playwright le fait défiler pour la capture. Sinon, il est posé dans la page.
 */
async function mark(page: Page, sel: string, n: number, conteneur: string | null = null) {
  await page.evaluate(({ sel, n, conteneur }) => {
    const el = [...document.querySelectorAll(sel)].find((x) => (x as HTMLElement).offsetParent !== null) as HTMLElement | undefined;
    if (!el) throw new Error(`repère introuvable : ${sel}`);
    const hote = conteneur ? ([...document.querySelectorAll(conteneur)].pop() as HTMLElement | undefined) : null;
    const r = el.getBoundingClientRect();
    let x = r.left + window.scrollX;
    let y = r.top + window.scrollY;
    if (hote) {
      if (getComputedStyle(hote).position === 'static') hote.style.position = 'relative';
      const h = hote.getBoundingClientRect();
      x = r.left - h.left + hote.scrollLeft;
      y = r.top - h.top + hote.scrollTop;
    }
    const box = document.createElement('div');
    box.className = 'help-capture-mark';
    Object.assign(box.style, { position: 'absolute', left: `${x - 3}px`, top: `${y - 3}px`, width: `${r.width + 6}px`, height: `${r.height + 6}px`, border: '3px solid #cf1322', borderRadius: '6px', zIndex: '99999', pointerEvents: 'none' });
    const badge = document.createElement('div');
    badge.textContent = String(n);
    Object.assign(badge.style, { position: 'absolute', left: '-14px', top: '-14px', width: '24px', height: '24px', borderRadius: '12px', background: '#cf1322', color: '#fff', font: '600 13px Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' });
    box.appendChild(badge);
    (hote || document.body).appendChild(box);
  }, { sel, n, conteneur });
}

async function connecter(page: Page, user: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', user);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await api(page, 'PUT', '/api/auth/nouveautes', {});
}

test('captures de l’aide', async ({ page, browser }) => {
  await connecter(page, process.env.HELP_USER || '', process.env.HELP_PASSWORD || '');
  // Sessions des autres comptes (0.16.0), ouvertes à la première capture qui les demande.
  const sessions = new Map<string, Page>();
  const session = async (compte?: string): Promise<Page> => {
    if (!compte) return page;
    if (!sessions.has(compte)) {
      const v = compte.toUpperCase();
      const user = process.env[`HELP_USER_${v}`];
      if (!user) throw new Error(`HELP_USER_${v} manque`);
      const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL, ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
      const p = await ctx.newPage();
      await connecter(p, user, process.env[`HELP_PASSWORD_${v}`] || process.env.HELP_PASSWORD || '');
      sessions.set(compte, p);
    }
    return sessions.get(compte)!;
  };
  for (const lang of LANGS) {
    const report: string[] = [];
    await api(page, 'PUT', '/api/auth/preferences', { preferred_lang: lang, ui_mode: 'simple', theme: 'clair' });
    fs.mkdirSync(path.join(OUT, lang), { recursive: true });
    for (const shot of TOPICS.flatMap((t) => t.shots)) {
      if (ONLY && !ONLY.has(shot.id)) continue;
      let page: Page | null = null;
      try {
        if (shot.path === '/login') {
          // Page de connexion : capturée dans un contexte sans session, dans la langue de la capture.
          const autre = await browser.newContext({ viewport: { width: 1280, height: 800 }, ignoreHTTPSErrors: true, baseURL: test.info().project.use.baseURL, locale: lang === 'nl' ? 'nl-BE' : 'fr-BE' });
          const p2 = await autre.newPage();
          await p2.goto('/login');
          await p2.waitForLoadState('load'); await p2.waitForTimeout(800);
          await p2.evaluate(() => document.querySelector<HTMLElement>('.ant-select')?.blur());
          if (lang === 'nl') { await p2.locator('.ant-select').first().click(); await p2.getByTitle('Nederlands').or(p2.getByText('NL', { exact: true })).first().click().catch(() => {}); await p2.waitForTimeout(300); }
          for (const [i, m] of (shot.marks || []).entries()) await mark(p2, m.sel, i + 1);
          await p2.screenshot({ path: path.join(OUT, lang, `${shot.id}.jpg`), type: 'jpeg', quality: 70 });
          await autre.close();
          report.push(`OK ${shot.id}`);
          continue;
        }
        page = await session(shot.compte);
        // Langue de l'autre compte, réglée par son profil comme pour le compte principal.
        if (shot.compte) await api(page, 'PUT', '/api/auth/preferences', { preferred_lang: lang, ui_mode: 'simple', theme: 'clair' });
        await page.goto(shot.path);
        // Pas de « networkidle » : le serveur de développement garde une connexion ouverte. On attend la fin des chargements.
        await page.waitForLoadState('load');
        await page.locator('.ant-spin-spinning').first().waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(700);
        // Le bouton flottant de l'assistant masquerait une partie de l'écran : il n'apparaît pas sur les captures.
        await page.addStyleTag({ content: '.chatbot-widget { display: none !important; }' });
        for (const a of shot.actions || []) {
          if (a.wait) await page.waitForTimeout(a.wait);
          if (a.clickSel) await page.locator(a.clickSel).first().click();
          if (a.click) await page.getByRole('button', { name: translations[a.click]?.[lang] || a.click }).first().click();
          if (a.fill) await page.fill(a.fill.sel, a.fill.value);
          // 0.15.0 : le fil de messages est sous la fiche, hors de la partie visible du volet.
          if (a.scrollSel) await page.locator(a.scrollSel).first().scrollIntoViewIfNeeded();
        }
        // Fenêtre ou panneau : on attend la fin de son animation d'ouverture avant de poser les repères.
        if (shot.clip === 'modal' || shot.clip === 'drawer') await page.waitForTimeout(600);
        const clip = shot.clip === 'modal' ? '.ant-modal-content' : shot.clip === 'drawer' ? '.ant-drawer-content-wrapper' : null;
        for (const [i, m] of (shot.marks || []).entries()) await mark(page, m.sel, i + 1, clip);
        const file = path.join(OUT, lang, `${shot.id}.jpg`);
        if (clip) await page.locator(clip).last().screenshot({ path: file, type: 'jpeg', quality: 70 });
        else {
          // Page entière jusqu'à 1 500 px de haut, par une fenêtre agrandie (le menu fixe garde toute sa hauteur) :
          // les repères bas de page restent dans l'image (0.12.0).
          const haut = await page.evaluate(() => document.documentElement.scrollHeight);
          await page.setViewportSize({ width: 1280, height: Math.min(Math.max(haut, 800), HAUTEUR_MAX) });
          await page.waitForTimeout(250);
          await page.screenshot({ path: file, type: 'jpeg', quality: 70 });
          await page.setViewportSize({ width: 1280, height: 800 });
        }
        report.push(`OK ${shot.id}`);
      } catch (e) {
        report.push(`FAIL ${shot.id} ${(e as Error).message.split('\n')[0]}`);
      } finally {
        if (page) {
          await page.evaluate(() => document.querySelectorAll('.help-capture-mark').forEach((n) => n.remove())).catch(() => {});
          await page.keyboard.press('Escape').catch(() => {});
        }
      }
    }
    fs.writeFileSync(path.join(ICI, `rapport-${lang}.txt`), report.join('\n') + '\n');
  }
});
