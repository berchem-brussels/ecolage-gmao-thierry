/** Parité FR/NL et absence de texte en dur dans les écrans (patron SAGA i18n-parity.test.ts, PILOT i18n-audit). */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { translations, intents } from '../i18n';
import { answer } from '../components/Chatbot';
import { ICONE_CODES } from '../referentiel';

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
    expect(translations['help.guide.journal'].fr).toMatch(/seuls les champs changés/);
    expect(translations['ref.trace.retablie'].nl).toBe('Geleverde waarde, hersteld op {date} om {heure}');
  });

  it('les intentions du chatbot renvoient à des clés existantes', () => {
    for (const i of intents) expect(translations[i.answer]).toBeTruthy();
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

  it('0.7.0 : aide du formulaire complet, questions 20 à 24, réponses de l’assistant, sans jargon', () => {
    for (const k of ['help.faq.q20', 'help.faq.a20', 'help.faq.q21', 'help.faq.a21', 'help.faq.q22', 'help.faq.a22', 'help.faq.q23', 'help.faq.a23', 'help.faq.q24', 'help.faq.a24']) {
      expect(translations[k]?.fr && translations[k]?.nl, k).toBeTruthy();
      expect(`${translations[k].fr} ${translations[k].nl}`, k).not.toMatch(/GMAO|\bOT\b|RGPD|AVG|MCP/);
    }
    for (const [m, fr, nl] of [['help.guide.demande', /Moi aussi/, /Ik ook/], ['help.guide.demande', /Danger pour les personnes/, /Gevaar voor personen/], ['help.guide.demande', /Reprendre/, /Verdergaan/],
      ['help.guide.referentiel', /Ajouter une question/, /Een vraag toevoegen/], ['help.guide.reglages', /\{dpo\}/, /\{dpo\}/]] as [string, RegExp, RegExp][]) {
      expect(translations[m].fr, m).toMatch(fr);
      expect(translations[m].nl, m).toMatch(nl);
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
      expect(translations[k]?.fr && translations[k]?.nl, k).toBeTruthy();
    }
    for (const k of ['help.guide.demande', 'help.guide.mesdemandes', 'help.faq.a16', 'help.faq.a17', 'help.faq.a18']) {
      expect(`${translations[k].fr} ${translations[k].nl}`, k).not.toMatch(/GMAO|\bOT\b/);
    }
    expect(translations['help.guide.demande'].fr).toMatch(/AC-DI-2026-00001/);
  });
});
