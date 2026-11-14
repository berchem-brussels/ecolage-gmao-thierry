/** Parité FR/NL et absence de texte en dur dans les écrans (patron SAGA i18n-parity.test.ts, PILOT i18n-audit). */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { translations, intents } from '../i18n';
import { answer } from '../components/Chatbot';
import { ICONE_CODES } from '../referentiel';
import { ETATS } from '../demandes';
import { GROUPES as GROUPES_REGLAGES } from '../pages/ReglagesEntitePage';
import { topicById } from '../help';
import type { L } from '../help/types';

/**
 * Texte complet d'une fiche d'aide dans une langue, libellés {{clé}} remplacés (0.12.0) : les rubriques help.guide.*
 * des versions précédentes sont devenues des fiches par écran ; leurs contrôles portent maintenant sur les fiches.
 */
const fiche = (id: string): { fr: string; nl: string } => {
  const tp = topicById(id)!;
  const tous: L[] = [tp.purpose, ...tp.layout, ...tp.procedures.flatMap((p) => [p.title, p.when, p.result, ...p.steps, ...(p.errors || []).flatMap((e) => [e.problem, e.solution])]), ...tp.faq.flatMap((f) => [f.q, f.a])];
  const txt = (lang: 'fr' | 'nl') => tous.map((l) => l[lang]).join(' ').replace(/\{\{([a-z0-9_.]+)\}\}/g, (_, k) => translations[k]?.[lang] || k);
  return { fr: txt('fr'), nl: txt('nl') };
};
const AIDE: Record<string, string> = {
  'help.guide.demande': 'nouvelle-demande', 'help.guide.mesdemandes': 'mes-demandes', 'help.guide.lieuhabituel': 'accueil',
  'help.guide.demandesentite': 'demandes-entite', 'help.guide.numerotation': 'reglages-entite', 'help.guide.reglages': 'reglages-entite',
  'help.guide.referentiel': 'referentiel', 'help.guide.journal': 'journal', 'help.guide.tickets': 'tickets',
};
/** Texte d'aide : la fiche qui a remplacé une ancienne rubrique, sinon la clé de traduction. */
const aide = (k: string): { fr: string; nl: string } => (AIDE[k] ? fiche(AIDE[k]) : translations[k]);

const SRC = path.resolve(process.cwd(), 'src');
const tsx = (dir: string): string[] => fs.readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  if (fs.statSync(p).isDirectory()) return f === 'test' ? [] : tsx(p);
  return p.endsWith('.tsx') ? [p] : [];
});

describe('traductions', () => {
  it('chaque clé a un FR et un NL non vides', () => {
    for (const [k, v] of Object.entries(translations)) {
      expect(v.fr?.trim(), `${k} fr`).toBeTruthy();
      expect(v.nl?.trim(), `${k} nl`).toBeTruthy();
    }
  });

  it('chaque clé appelée par t() existe', () => {
    for (const f of tsx(SRC)) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/\bt\('([a-z0-9_.]+)'\)/g)) expect(translations[m[1]], `${path.basename(f)} : ${m[1]}`).toBeTruthy();
    }
  });

  it('aucun texte accentué en dur dans le JSX des écrans', () => {
    for (const f of tsx(SRC)) {
      const src = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
      const hits = [...src.matchAll(/>\s*([^<>{}]*[éèêàçùôîÉÈ][^<>{}]*)\s*</g)].map((m) => m[1].trim()).filter(Boolean);
      expect(hits, path.basename(f)).toEqual([]);
    }
  });

  it('chaque action écrite au journal d’audit par le serveur a son libellé FR et NL', () => {
    const backend = path.resolve(process.cwd(), '..', 'backend', 'src');
    const js = (dir: string): string[] => fs.readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return fs.statSync(p).isDirectory() ? js(p) : p.endsWith('.js') ? [p] : [];
    });
    const codes = new Set<string>();
    for (const f of js(backend)) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/logAudit\([^,]+,\s*([^,]+),/g)) {
        for (const c of m[1].matchAll(/'([a-z_.]+)'/g)) codes.add(c[1]);
      }
    }
    expect(codes.size).toBeGreaterThan(25);
    for (const c of codes) expect(translations[`audit.action.${c}`], c).toBeTruthy();
  });

  it('0.9.0 (contrôle 7 de la 0.8.0) : chaque groupe du catalogue des réglages de l’entité est affiché, avec son titre FR et NL', () => {
    const catalogue = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '..', 'backend', 'config', 'parametres-entite.json'), 'utf8'));
    const codes = catalogue.groupes.map((g: { code: string }) => g.code);
    expect(GROUPES_REGLAGES).toEqual(codes);
    for (const c of codes) expect(translations[`reglages.groupe.${c}`]?.fr && translations[`reglages.groupe.${c}`]?.nl, c).toBeTruthy();
    for (const p of catalogue.parametres) expect(codes, p.cle).toContain(p.groupe);
  });

  it('0.9.0 : chaque famille d’actions du journal d’audit a son libellé FR et NL (filtre du journal)', () => {
    const backend = path.resolve(process.cwd(), '..', 'backend', 'src');
    const js = (dir: string): string[] => fs.readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return fs.statSync(p).isDirectory() ? js(p) : p.endsWith('.js') ? [p] : [];
    });
    const familles = new Set<string>();
    for (const f of js(backend)) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/logAudit\([^,]+,\s*([^,]+),/g)) {
        for (const c of m[1].matchAll(/'([a-z_.]+)'/g)) familles.add(c[1].split('.')[0]);
      }
    }
    expect(familles.has('piece')).toBe(true);
    for (const f of familles) expect(translations[`audit.famille.${f}`]?.fr && translations[`audit.famille.${f}`]?.nl, f).toBeTruthy();
  });

  it('0.9.0 : chaque état a son libellé pour le service technique, en FR et en NL, distinct de celui du demandeur pour « À qualifier »', () => {
    for (const e of ETATS) expect(translations[`demande.etat_service.${e}`]?.fr && translations[`demande.etat_service.${e}`]?.nl, e).toBeTruthy();
    expect(translations['demande.etat_service.a_qualifier'].fr).toBe('À qualifier');
    expect(translations['demande.etat.a_qualifier'].fr).not.toBe('À qualifier');
  });

  it('chaque icône du catalogue des catégories a son pictogramme et son libellé FR et NL (0.4.0)', () => {
    const catalogue = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '..', 'backend', 'config', 'categories.json'), 'utf8'));
    expect([...ICONE_CODES].sort()).toEqual(catalogue.icones.map((i: { code: string }) => i.code).sort());
    for (const c of ICONE_CODES) expect(translations[`ref.icone.${c}`], c).toBeTruthy();
  });

  it('la FAQ de l’appareil photo couvre Android (Chrome) et l’iPhone, en FR et en NL (0.3.1)', () => {
    const a = translations['help.faq.a7'];
    expect(a.fr).toMatch(/Android/);
    expect(a.fr).toMatch(/Chrome/);
    expect(a.fr).toMatch(/iPhone/);
    expect(a.nl).toMatch(/Android/);
    expect(a.nl).toMatch(/iPhone/);
    expect(translations['help.faq.q7'].fr).not.toMatch(/iPhone/);
  });

  it('0.4.1 : la question 15 explique la mention « Modifié le … par … » en FR et en NL ; le journal parle des champs changés', () => {
    expect(translations['help.faq.a15'].fr).toMatch(/Modifié le JJ\/MM\/AAAA à HH:MM par/);
    expect(translations['help.faq.a15'].nl).toMatch(/Gewijzigd op DD\/MM\/JJJJ om UU:MM door/);
    expect(aide('help.guide.journal').fr).toMatch(/champs changés/);
    expect(translations['ref.trace.retablie'].nl).toBe('Geleverde waarde, hersteld op {date} om {heure}');
  });

  it('les intentions du chatbot renvoient à des clés existantes', () => {
    for (const i of intents) expect(translations[i.answer]).toBeTruthy();
    // 0.15.0 (point 6) : fil de messages, mentions, modèles, suivi ; « précision » reste au cycle, « où en est » au suivi.
    const cle = (q: string) => intents.find((i) => i.keys.some((k) => q.toLowerCase().includes(k)))?.answer;
    expect(cle('comment répondre au demandeur ?')).toBe('chat.intent.messages');
    expect(cle('hoe een collega vermelden')).toBe('chat.intent.mentions');
    expect(cle('où sont les modèles de réponse ?')).toBe('chat.intent.modeles');
    expect(cle('je veux ne plus suivre cette demande')).toBe('chat.intent.abonnement');
    expect(cle('ajouter une précision')).toBe('chat.intent.cycle');
    expect(cle('où en est ma demande')).toBe('chat.intent.suivi');
    // 0.16.0 (point 7) : validation, services, encodage, regroupement, découpage, colonnes.
    expect(cle('ma demande attend l’accord de mon chef')).toBe('chat.intent.validation');
    expect(cle('hoe een aanvraag goedkeuren')).toBe('chat.intent.validation');
    expect(cle('désigner un suppléant pendant mes congés')).toBe('chat.intent.services');
    expect(cle('encoder un appel')).toBe('chat.intent.encodage');
    expect(cle('een aanvraag per telefoon ontvangen')).toBe('chat.intent.encodage');
    expect(cle('ma demande est regroupée')).toBe('chat.intent.fusion');
    expect(cle('twee aanvragen samenvoegen')).toBe('chat.intent.fusion');
    expect(cle('la demande signale plusieurs problèmes')).toBe('chat.intent.decoupage');
    expect(cle('vue en colonnes')).toBe('chat.intent.colonnes');
    expect(cle('kaart slepen naar een andere kolom')).toBe('chat.intent.colonnes');
    expect(answer('comment changer d’entité').key).toBe('chat.intent.entite');
    expect(answer('wie geeft de rollen').key).toBe('chat.intent.roles');
    expect(answer('wachtwoord wijzigen').key).toBe('chat.intent.password');
    expect(answer('zzz').key).toBe('chat.unknown');
    expect(answer('mon appareil photo reste noir').key).toBe('chat.intent.camera');
    expect(answer('photo sur mon Samsung').key).toBe('chat.intent.camera');
    expect(answer('camera op android').key).toBe('chat.intent.camera');
    expect(answer('qui a modifié ce réglage').key).toBe('chat.intent.journal');
    expect(answer('naam van het lokaal bestuur').key).toBe('chat.intent.parametres');
    expect(answer('numéro de téléphone du service').key).toBe('chat.intent.contact');
    expect(answer('quoi de neuf dans cette version').key).toBe('chat.intent.nouveautes');
    expect(answer('où est le bâtiment').key).toBe('chat.intent.patrimoine');
    expect(answer('quel est le délai de ma demande').key).toBe('chat.intent.delais');
    expect(answer('welke termijn voor P2').key).toBe('chat.intent.delais');
    expect(answer('le 15 novembre est-il un jour férié').key).toBe('chat.intent.calendrier');
    expect(answer('verlofdag toevoegen').key).toBe('chat.intent.calendrier');
    expect(answer('ajouter une catégorie').key).toBe('chat.intent.categories');
    expect(answer('où est le bâtiment', (m) => m !== 'patrimoine').key).toBe('chat.unknown'); // intention d’un module éteint ignorée
    // 0.5.0 : demandes d'intervention
    expect(answer('où en est ma demande').key).toBe('chat.intent.suivi');
    expect(answer('waar staat mijn aanvraag, opvolging').key).toBe('chat.intent.suivi');
    expect(answer('signaler une fuite dans le local').key).toBe('chat.intent.demande');
    expect(answer('de lamp is kapot').key).toBe('chat.intent.demande');
    expect(answer('changer mon lieu de travail').key).toBe('chat.intent.lieuhabituel');
    expect(answer('mijn werkplek').key).toBe('chat.intent.lieuhabituel');
  });

  it('0.8.0 : aide des photos, questions 25 et 26, assistant (photo d’une demande, photo d’un lieu), sans jargon', () => {
    for (const k of ['help.faq.q25', 'help.faq.a25', 'help.faq.q26', 'help.faq.a26', 'chat.intent.piecesdemande', 'demande.pieces.consigne']) {
      expect(translations[k]?.fr && translations[k]?.nl, k).toBeTruthy();
      expect(`${translations[k].fr} ${translations[k].nl}`, k).not.toMatch(/GMAO|\bOT\b|RGPD|AVG|MCP|multer/);
    }
    for (const [m, fr, nl] of [['help.guide.demande', /Ajouter une photo ou un document/, /Foto of document toevoegen/], ['help.guide.demande', /plaque d.immatriculation/, /nummerplaat/],
      ['help.guide.reglages', /Pièces jointes/, /Bijlagen/]] as [string, RegExp, RegExp][]) {
      expect(aide(m).fr, m).toMatch(fr);
      expect(aide(m).nl, m).toMatch(nl);
    }
    expect(answer('comment ajouter une photo à ma demande').key).toBe('chat.intent.piecesdemande');
    expect(answer('bijlage toevoegen').key).toBe('chat.intent.piecesdemande');
    expect(answer("changer la photo d'un lieu").key).toBe('chat.intent.photo');
  });

  it('0.7.0 : aide du formulaire complet, questions 20 à 24, réponses de l’assistant, sans jargon', () => {
    for (const k of ['help.faq.q20', 'help.faq.a20', 'help.faq.q21', 'help.faq.a21', 'help.faq.q22', 'help.faq.a22', 'help.faq.q23', 'help.faq.a23', 'help.faq.q24', 'help.faq.a24']) {
      expect(translations[k]?.fr && translations[k]?.nl, k).toBeTruthy();
      expect(`${translations[k].fr} ${translations[k].nl}`, k).not.toMatch(/GMAO|\bOT\b|RGPD|AVG|MCP/);
    }
    for (const [m, fr, nl] of [['help.guide.demande', /Moi aussi/, /Ik ook/], ['help.guide.demande', /Danger pour les personnes/, /Gevaar voor personen/], ['help.guide.demande', /Reprendre/, /Verdergaan/],
      ['help.guide.referentiel', /Ajouter une question/, /Een vraag toevoegen/], ['help.guide.reglages', /\{dpo\}/, /\{dpo\}/]] as [string, RegExp, RegExp][]) {
      expect(aide(m).fr, m).toMatch(fr);
      expect(aide(m).nl, m).toMatch(nl);
    }
    expect(answer('moi aussi, déjà signalé').key).toBe('chat.intent.moiaussi');
    expect(answer('il y a un danger, câble à nu').key).toBe('chat.intent.danger');
    expect(answer('urgence').key).toBe('chat.intent.contact');
    expect(answer('mon brouillon a disparu').key).toBe('chat.intent.brouillon');
    expect(answer('wie is de dpo').key).toBe('chat.intent.rgpd');
    expect(answer('signaler une fuite dans le local').key).toBe('chat.intent.demande');
  });

  it('0.5.0 : aide des demandes, questions 16 à 19 et rubriques en FR et en NL, sans jargon (ERG-08)', () => {
    for (const k of ['help.guide.demande', 'help.guide.mesdemandes', 'help.guide.lieuhabituel', 'help.guide.demandesentite', 'help.guide.numerotation',
      'help.faq.q16', 'help.faq.a16', 'help.faq.q17', 'help.faq.a17', 'help.faq.q18', 'help.faq.a18', 'help.faq.q19', 'help.faq.a19']) {
      expect(aide(k)?.fr && aide(k)?.nl, k).toBeTruthy();
    }
    for (const k of ['help.guide.demande', 'help.guide.mesdemandes', 'help.faq.a16', 'help.faq.a17', 'help.faq.a18']) {
      expect(`${aide(k).fr} ${aide(k).nl}`, k).not.toMatch(/GMAO|\bOT\b/);
    }
    expect(aide('help.guide.demande').fr).toMatch(/AC-DI-2026-00001/);
  });

  it('0.11.0 : aide, FAQ et chatbot des tickets en FR et en NL ; « bug » et « l’application » mènent à Tickets, pas une panne', () => {
    for (const k of ['help.faq.q29', 'help.faq.a29', 'help.faq.q30', 'help.faq.a30', 'help.guide.tickets', 'chat.intent.tickets', 'nav.tickets', 'tickets.report']) {
      expect(aide(k)?.fr, k).toBeTruthy();
      expect(aide(k)?.nl, k).toBeTruthy();
    }
    expect(translations['help.faq.a29'].fr).toMatch(/« Signaler »/);
    expect(translations['help.faq.a29'].nl).toMatch(/« Melden »/);
    for (const q of ["j'ai trouvé un bug", "la recherche de l'application ne fonctionne pas", 'de toepassing werkt niet', 'ik heb een suggestie']) {
      const r = answer(q);
      expect(r.key, q).toBe('chat.intent.tickets');
      expect(r.route, q).toBe('/tickets');
    }
    expect(answer('où en est ma demande').key).not.toBe('chat.intent.tickets');
    expect(answer('le chauffage ne fonctionne pas').key, 'une panne reste une demande d’intervention').not.toBe('chat.intent.tickets');
  });
});

// 0.16.0, point 0 (R1 de la recette de la 0.15.0) : le journal nomme la note interne comme les écrans.
describe('libellé de la note interne', () => {
  it('le détail « interne » du journal dit « Note interne », comme le fil, en FR et en NL', () => {
    expect(translations['audit.detail.interne']).toEqual(translations['fil.interne']);
    expect(translations['audit.detail.interne'].fr).toBe('Note interne');
    expect(translations['audit.detail.interne'].nl).toBe('Interne nota');
  });
});
