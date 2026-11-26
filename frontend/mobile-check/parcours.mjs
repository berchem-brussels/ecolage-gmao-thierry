/**
 * Parcours complets sur téléphone (0.16.1 ; méthode convenue avec Thierry le 14/11/2026 après la recette de la 0.16.0) :
 * les écrans sont utilisés comme une personne le ferait, au doigt (tap), à 320 px pour le moteur WebKit (iPhone, Safari et
 * Edge) et à 360 px pour Chromium (Android) :
 *   1. l'agent dépose une demande d'aménagement avec une photo : écran de confirmation « accord du chef de service » (R1) ;
 *   2. le chef de service ouvre la demande à valider, voit la photo (R5) et la valide ;
 *   3. le service technique regroupe une demande en double dans la demande validée ;
 *   4. il découpe la demande validée en deux ;
 *   5. il déplace une demande d'une colonne à l'autre (« Déplacer », puis le passage confirmé dans la fiche).
 * 0.17.0 (point 7) : à l'étape 2, le chef ouvre la demande depuis la cloche ; étape 2 bis, l'agent apprend la validation
 * par la cloche et arrive sur sa demande.
 * 0.18.0 (point 6) : étape 6, le service technique retrouve la demande par la recherche globale (loupe, ou menu sous
 * 360 px) et ouvre sa fiche ; étape 7, il exporte la liste de l'entité en Excel (fichier téléchargé, nom contrôlé) ;
 * étape 8, l'agent demande à l'assistant où en est sa demande et ouvre la fiche depuis la réponse.
 * 0.18.0 (point 0) : toute ouverture d'écran (goto, reload) attend que la page ait fini de charger ses modules (réseau au
 * repos) avant la suite. Sans cela, une ouverture faite aussitôt après une autre coupait les modules encore en chargement,
 * et WebKit, lui seul, l'écrivait en erreur de console (« Importing a module script failed ») : défaut du contrôle, pas de
 * l'application, vu un passage sur quatre environ, reproduit à coup sûr en retardant les modules de 400 ms.
 * À chaque étape : défilement horizontal, texte hors de l'écran, image qui ne s'affiche pas, erreur de la console, appel
 * refusé de l'API ; le résultat est relu par l'API.
 * Ces parcours ÉCRIVENT dans la base : ils ne tournent que sur une copie locale jetable (adresse localhost ou 127.0.0.1),
 * jamais sur l'acceptance ni la production. Comptes : MOBILE_AGENT_USER (agent membre du service du chef),
 * MOBILE_VALIDEUR_USER (chef de ce service), MOBILE_USER (service technique, rôle de gestionnaire) ; mot de passe :
 * MOBILE_AGENT_PASSWORD, MOBILE_VALIDEUR_PASSWORD, sinon MOBILE_PASSWORD.
 */
import zlib from 'node:zlib';

/** Photo PNG réelle (96 × 64, dégradé) : le navigateur doit pouvoir l'afficher, le serveur la contrôle. */
export function photoPng() {
  const w = 96; const h = 64;
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 40 + x; raw[o + 1] = 90 + y; raw[o + 2] = 160; }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Copie locale seulement : les parcours écrivent dans la base. */
export function hoteLocal(base) {
  const h = new URL(base).hostname;
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(h);
}

/**
 * 0.18.0 (point 0) : attend la fin du chargement d'un écran (modules et premiers appels de l'API). La cloche relit son
 * compteur toutes les 60 secondes : le réseau passe bien au repos. Au-delà de 15 secondes, on continue : les contrôles de
 * l'écran disent alors ce qui ne va pas.
 */
export async function charge(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

/** Ouvre un écran et attend la fin de son chargement (0.18.0, point 0). */
export async function ouvrir(page, url) {
  await page.goto(url);
  await charge(page);
}

/**
 * Lance les parcours sur un moteur. outils : { B, connecter(navigateur, appareil, user, password) → { ctx, page, erreurs },
 * controler(page, quoi) → défauts de l'écran }. Rend la liste des défauts.
 */
export async function parcours(navigateur, moteur, appareil, comptes, outils) {
  const { B, connecter, controler } = outils;
  const defauts = [];
  const etape = (n, txt) => `parcours ${moteur} · ${n}. ${txt}`;
  const api = (page, url, opts = {}) => page.evaluate(async ([u, o]) => {
    const me = await fetch('/api/auth/me').then((r) => r.json());
    const r = await fetch(u, { ...o, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': me.data.csrf_token }, body: o.body ? JSON.stringify(o.body) : undefined });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, [url, opts]);
  const attendre = (page, ms = 900) => page.waitForTimeout(ms);
  /** Les libellés cherchés sont en français : compte mis en FR pour le parcours, sa langue lui est rendue à la fin. */
  const enFrancais = async (page) => {
    const avant = (await api(page, '/api/auth/me')).body?.data?.preferred_lang;
    if (avant !== 'fr') { await api(page, '/api/auth/preferences', { method: 'PUT', body: { preferred_lang: 'fr' } }); await page.reload(); await charge(page); }
    return async () => { if (avant && avant !== 'fr') await api(page, '/api/auth/preferences', { method: 'PUT', body: { preferred_lang: avant } }); };
  };
  const tap = async (loc, quoi) => {
    if (!(await loc.count())) throw new Error(`${quoi} introuvable`);
    await loc.first().scrollIntoViewIfNeeded();
    await loc.first().tap();
  };
  /**
   * 0.17.0 (point 7) : cloche de l'en-tête au doigt ; la notification de la demande (texte attendu facultatif) mène à son
   * écran (lien attendu) et n'est plus comptée non lue.
   */
  const ouvrirDepuisCloche = async (n, page, erreurs, numero, lien, texte = null) => {
    const cloche = page.locator('header button[aria-label^="Notifications"]');
    const avant = (await cloche.getAttribute('aria-label')) || '';
    if (!/non lue/.test(avant)) defauts.push(etape(n, `cloche sans notification non lue (« ${avant} »)`));
    await tap(cloche, 'cloche');
    await attendre(page, 1200);
    await verifier(n, 'volet de la cloche', page, erreurs);
    const ligne = page.locator('.ant-drawer-open .notif-item').filter({ hasText: numero || '' }).filter(texte ? { hasText: texte } : {});
    await tap(ligne, `notification de ${numero}`);
    await attendre(page, 1500);
    const ici = new URL(page.url());
    if (`${ici.pathname}${ici.search}` !== lien) defauts.push(etape(n, `la notification mène à ${ici.pathname}${ici.search} au lieu de ${lien}`));
  };
  const verifier = async (n, txt, page, erreurs) => {
    const pb = await controler(page);
    if (erreurs.length) pb.push(`erreurs : ${[...new Set(erreurs)].join(' ; ')}`);
    erreurs.length = 0;
    if (pb.length) defauts.push(`${etape(n, txt)} : ${pb.join(' ; ')}`);
  };

  // 1. Dépôt par l'agent, avec photo, dans une catégorie à valider.
  let demandeId = null;
  let lieuId = null;
  let numeroDemande = null;
  {
    const { ctx, page, erreurs, suivi } = await connecter(navigateur, appareil, comptes.agent.user, comptes.agent.password);
    const rendre = await enFrancais(page);
    suivi.connecte = true; // erreurs de la console et appels refusés comptés dès la connexion
    suivi.sansNouveautes = true; // fenêtre « Nouveautés » retirée, rien n'est marqué lu
    try {
      await ouvrir(page, `${B}/demandes/nouvelle`);
      await attendre(page, 1500);
      if (await page.getByLabel('Chercher un lieu').count()) {
        await page.getByLabel('Chercher un lieu').fill('bureau');
        await attendre(page, 1200);
        await tap(page.locator('.dem-resultats button, .dem-resultat'), 'lieu trouvé');
        await attendre(page);
      }
      // 0.21.5 (R2, DV-201) : un lieu proposé d'office se confirme d'un clic avant l'envoi.
      const oui = page.getByRole('button', { name: /Oui, c.est ici/ });
      if (await oui.count()) { await tap(oui, '« Oui, c’est ici »'); await attendre(page); }
      await tap(page.getByRole('button', { name: /Aménagement, déménagement, achat : voir les natures/ }), 'domaine « Aménagement »');
      await attendre(page, 500);
      await tap(page.getByRole('button', { name: "Aménagement d'un local", exact: true }), 'nature « Aménagement d’un local »');
      await page.getByLabel('3. Décrivez le problème').fill(`Parcours ${moteur} : aménager le local, photo de l’emplacement jointe.`);
      await page.locator('input[type=file]').first().setInputFiles({ name: 'emplacement.png', mimeType: 'image/png', buffer: photoPng() });
      await attendre(page, 2500);
      await verifier(1, 'formulaire rempli avec la photo', page, erreurs);
      await tap(page.getByRole('button', { name: /Envoyer la demande/ }), '« Envoyer la demande »');
      await page.getByText('Demande envoyée').waitFor({ timeout: 10000 });
      if (!(await page.getByText(/doit d'abord donner son accord/).count())) defauts.push(etape(1, 'confirmation : accord du chef de service non annoncé (R1)'));
      if (await page.getByText(/Délai indicatif/).count()) defauts.push(etape(1, 'confirmation : délai annoncé avant la validation (R1)'));
      await verifier(1, 'confirmation', page, erreurs);
      const numero = (await page.locator('.dem-numero').first().textContent())?.trim();
      const liste = await api(page, '/api/demandes?limit=5');
      const d = (liste.body?.data || []).find((x) => x.numero === numero);
      demandeId = d?.id ?? null;
      lieuId = d?.lieu_id ?? null;
      numeroDemande = numero;
      if (!d || d.etat !== 'en_validation') defauts.push(etape(1, `demande ${numero} pas « En validation » (${d?.etat})`));
    } catch (e) { defauts.push(etape(1, `dépôt interrompu : ${e.message.split('\n')[0]}`)); } finally { await rendre().catch(() => {}); await ctx.close(); }
  }
  if (!demandeId) return defauts;

  // 2. Le chef de service voit la photo et valide.
  {
    const { ctx, page, erreurs, suivi } = await connecter(navigateur, appareil, comptes.valideur.user, comptes.valideur.password);
    const rendre = await enFrancais(page);
    suivi.connecte = true;
    suivi.sansNouveautes = true;
    try {
      // 0.17.0 (point 7) : le chef ouvre la demande depuis la cloche (« La demande … attend votre accord »).
      await ouvrir(page, `${B}/`);
      await attendre(page, 1500);
      await ouvrirDepuisCloche(2, page, erreurs, numeroDemande, `/a-valider?demande=${demandeId}`);
      if (!(await page.locator('.ant-drawer-open').filter({ hasText: /Valider et transmettre/ }).count())) await ouvrir(page, `${B}/a-valider?demande=${demandeId}`);
      await page.locator('.ant-drawer-open').waitFor({ timeout: 10000 });
      await attendre(page, 2500);
      const photos = await page.evaluate(() => [...document.querySelectorAll('.ant-drawer-open img')].map((i) => ({ ok: i.complete && i.naturalWidth > 0, src: i.getAttribute('src') || '' })));
      if (!photos.length) defauts.push(etape(2, 'aucune vignette de photo dans la fiche du chef de service (R5)'));
      await verifier(2, 'fiche à valider avec la photo', page, erreurs);
      await tap(page.locator('.ant-drawer-open button').filter({ hasText: /Valider et transmettre/ }), '« Valider et transmettre »');
      await attendre(page, 700);
      await tap(page.locator('.ant-drawer-open form button[type=submit]'), 'confirmation de la validation');
      await attendre(page, 1500);
      await verifier(2, 'validation', page, erreurs);
    } catch (e) { defauts.push(etape(2, `validation interrompue : ${e.message.split('\n')[0]}`)); } finally { await rendre().catch(() => {}); await ctx.close(); }
  }

  // 2 bis (0.17.0, point 7) : l'agent apprend la validation par la cloche et arrive sur sa demande.
  {
    const { ctx, page, erreurs, suivi } = await connecter(navigateur, appareil, comptes.agent.user, comptes.agent.password);
    const rendre = await enFrancais(page);
    suivi.connecte = true;
    suivi.sansNouveautes = true;
    try {
      await ouvrir(page, `${B}/`);
      await attendre(page, 1500);
      await ouvrirDepuisCloche('2 bis', page, erreurs, numeroDemande, `/demandes?demande=${demandeId}`, /a validé la demande/);
      await page.locator('.ant-drawer-open').waitFor({ timeout: 10000 });
      await attendre(page, 1200);
      await verifier('2 bis', 'fiche ouverte depuis la cloche', page, erreurs);
    } catch (e) { defauts.push(etape('2 bis', `cloche de l'agent : ${e.message.split('\n')[0]}`)); } finally { await rendre().catch(() => {}); await ctx.close(); }
  }

  // 3 à 5. Service technique : regrouper un doublon, découper, déplacer.
  {
    const { ctx, page, erreurs, suivi } = await connecter(navigateur, appareil, comptes.service.user, comptes.service.password);
    const rendre = await enFrancais(page);
    suivi.connecte = true;
    suivi.sansNouveautes = true;
    try {
      const d = (await api(page, `/api/demandes/${demandeId}`)).body?.data;
      if (d?.etat !== 'a_qualifier') defauts.push(etape(2, `après validation, état ${d?.etat} au lieu de « À qualifier »`));
      // Doublon déposé au même endroit par le service (encodé pour l'agent), puis regroupé dans la demande validée.
      const cat = (await api(page, '/api/categories?niveau=nature&q=eclairage')).body?.data?.[0];
      const doublon = (await api(page, '/api/demandes', { method: 'POST', body: { lieu_id: lieuId, categorie_id: cat?.id, description: `Parcours ${moteur} : même demande, en double.`, langue: 'fr', demandeur_id: d?.demandeur_id, canal: 'telephone' } })).body?.data;
      if (!doublon?.id) throw new Error('doublon non créé');
      await ouvrir(page, `${B}/demandes-entite?demande=${doublon.id}`);
      await page.locator('.ant-drawer-open').waitFor({ timeout: 10000 });
      await attendre(page, 1200);
      await tap(page.locator('.ant-drawer-open button').filter({ hasText: /Regrouper avec/ }), '« Regrouper avec une autre demande »');
      await attendre(page);
      await tap(page.locator('.ant-drawer-open .dem-resultat').filter({ hasText: d.numero }), `principale ${d.numero}`);
      await attendre(page, 500);
      await verifier(3, 'regroupement choisi', page, erreurs);
      await tap(page.locator('.ant-drawer-open button').filter({ hasText: `Regrouper dans ${d.numero}` }), '« Regrouper dans … »');
      await attendre(page, 1500);
      await verifier(3, 'regroupement fait', page, erreurs);
      const r3 = (await api(page, `/api/demandes/${doublon.id}`)).body?.data;
      if (r3?.etat !== 'fusionnee') defauts.push(etape(3, `doublon ${doublon.numero} pas regroupé (${r3?.etat})`));

      // 4. Découpage de la demande validée.
      await ouvrir(page, `${B}/demandes-entite?demande=${demandeId}`);
      await page.locator('.ant-drawer-open').waitFor({ timeout: 10000 });
      await attendre(page, 1200);
      await tap(page.locator('.ant-drawer-open button:has(.anticon-scissor)'), '« Découper »');
      await attendre(page);
      await page.locator('.ant-drawer-open textarea[id$="-description"]').first().fill(`Parcours ${moteur} : deuxième problème, l’armoire est cassée.`);
      await attendre(page, 400);
      await verifier(4, 'découpage rempli', page, erreurs);
      await tap(page.locator('.ant-drawer-open button').filter({ hasText: /Créer la demande|Créer les \d+ demandes/ }), '« Créer la demande »');
      await attendre(page, 1500);
      await verifier(4, 'découpage fait', page, erreurs);
      const issues = (await api(page, `/api/demandes?perimetre=entite&limit=50`)).body?.data?.filter((x) => x.issue_de === demandeId) || [];
      const nouvelles = issues.length || (await api(page, `/api/demandes/${demandeId}`)).body?.data?.issues?.length || 0;
      if (!nouvelles) defauts.push(etape(4, 'aucune demande nouvelle issue du découpage'));

      // 5. « Déplacer » dans les colonnes : la carte de la demande validée, vers le premier état permis.
      await ouvrir(page, `${B}/demandes-entite?affichage=colonnes`);
      await attendre(page, 2000);
      const carte = page.locator('.col-carte').filter({ hasText: d.numero });
      await tap(carte.locator('button:has(.anticon-drag)'), `« Déplacer » de ${d.numero}`);
      await attendre(page, 500);
      await tap(page.locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item'), 'état permis');
      await page.locator('.ant-drawer-open').waitFor({ timeout: 10000 });
      await attendre(page, 1200);
      await verifier(5, 'passage proposé dans la fiche', page, erreurs);
      const avant = (await api(page, `/api/demandes/${demandeId}`)).body?.data?.etat;
      const form = page.locator('.ant-drawer-open form').filter({ has: page.locator('button[type=submit]') }).last();
      if (await form.locator('#motif_id, [id$=motif_id]').count()) throw new Error('le passage demande un motif : choisir un autre état');
      await tap(form.locator('button[type=submit]'), 'confirmation du passage');
      await attendre(page, 1500);
      await verifier(5, 'passage fait', page, erreurs);
      const apres = (await api(page, `/api/demandes/${demandeId}`)).body?.data?.etat;
      if (apres === avant) defauts.push(etape(5, `état inchangé (${avant})`));

      // 6 (0.18.0, point 6) : la recherche globale retrouve la demande par son numéro et ouvre sa fiche. Sous 360 px, la
      // loupe est en tête du menu latéral.
      await ouvrir(page, `${B}/`);
      await attendre(page, 800);
      const loupe = page.locator('header .recherche-globale');
      if (await loupe.count()) await tap(loupe, 'loupe de la recherche');
      else {
        await tap(page.locator('header button').first(), 'menu');
        await attendre(page, 600);
        await tap(page.locator('.ant-drawer-open .recherche-menu'), '« Rechercher » du menu');
      }
      await attendre(page, 500);
      await page.locator('.ant-modal-wrap input').first().fill(d.numero);
      await page.locator('.ant-modal-wrap .recherche-resultat').filter({ hasText: d.numero }).first().waitFor({ timeout: 8000 });
      await verifier(6, 'résultats de la recherche', page, erreurs);
      await tap(page.locator('.ant-modal-wrap .recherche-resultat').filter({ hasText: d.numero }), `résultat ${d.numero}`);
      await page.locator('.ant-drawer-open').waitFor({ timeout: 10000 });
      await attendre(page, 1200);
      const ici6 = new URL(page.url());
      if (`${ici6.pathname}${ici6.search}` !== `/demandes-entite?demande=${demandeId}`) defauts.push(etape(6, `la recherche mène à ${ici6.pathname}${ici6.search}`));
      await verifier(6, 'fiche ouverte depuis la recherche', page, erreurs);

      // 7 (0.18.0, point 6) : export Excel de la liste de l'entité, téléchargé au doigt.
      await ouvrir(page, `${B}/demandes-entite`);
      await attendre(page, 800);
      await tap(page.locator('.bouton-export'), '« Exporter »');
      await attendre(page, 400);
      const [fichier] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        tap(page.locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item').first(), 'Excel'),
      ]);
      if (!/^demandes-entite-[A-Z]+-\d{4}-\d{2}-\d{2}\.xlsx$/.test(fichier.suggestedFilename())) defauts.push(etape(7, `nom du fichier exporté : ${fichier.suggestedFilename()}`));
      await attendre(page, 500);
      await verifier(7, 'liste après l’export', page, erreurs);
    } catch (e) { defauts.push(etape('3-7', `parcours du service interrompu : ${e.message.split('\n')[0]}`)); } finally { await rendre().catch(() => {}); await ctx.close(); }
  }

  // 8 (0.18.0, point 6) : l'agent demande à l'assistant où en est sa demande et ouvre la fiche depuis la réponse.
  {
    const { ctx, page, erreurs, suivi } = await connecter(navigateur, appareil, comptes.agent.user, comptes.agent.password);
    const rendre = await enFrancais(page);
    suivi.connecte = true;
    suivi.sansNouveautes = true;
    try {
      await ouvrir(page, `${B}/`);
      await attendre(page, 800);
      await tap(page.locator('.chatbot-widget button[aria-label="Ouvrir l\'assistant"]'), 'bouton de l’assistant');
      await attendre(page, 400);
      await page.locator('.chatbot-widget input').first().fill(`où en est ${numeroDemande}`);
      await tap(page.locator('.chatbot-widget .ant-space-compact .ant-btn-primary'), '« Envoyer »');
      const lien = page.locator('.chatbot-messages li button').filter({ hasText: numeroDemande });
      await lien.first().waitFor({ timeout: 8000 });
      await verifier(8, 'réponse de l’assistant', page, erreurs);
      await tap(lien, `demande ${numeroDemande} dans la réponse`);
      await page.locator('.ant-drawer-open').waitFor({ timeout: 10000 });
      await attendre(page, 1200);
      const ici8 = new URL(page.url());
      if (`${ici8.pathname}${ici8.search}` !== `/demandes?demande=${demandeId}`) defauts.push(etape(8, `l’assistant mène à ${ici8.pathname}${ici8.search}`));
      await verifier(8, 'fiche ouverte depuis l’assistant', page, erreurs);
    } catch (e) { defauts.push(etape(8, `assistant de l'agent : ${e.message.split('\n')[0]}`)); } finally { await rendre().catch(() => {}); await ctx.close(); }
  }
  return defauts;
}
