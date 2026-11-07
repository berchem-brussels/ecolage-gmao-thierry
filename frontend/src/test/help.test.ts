/**
 * Contrôles bloquants de l'aide par écran et des explications de champs (standard, section 13.1 ; gabarit 1.3.0,
 * test/help.test.ts ; 0.12.0) : chaque écran du menu a sa fiche, chaque fiche est complète en FR et en NL, chaque champ
 * nommé avec un libellé a son « ? ». Un écran ou un champ nouveau sans aide fait échouer la suite.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TOPICS, topicForPath, topicById } from '../help';
import type { L } from '../help/types';
import { translations } from '../i18n';
import { hints } from '../hints';

const SRC = path.resolve(process.cwd(), 'src');
const tsx = (dir: string): string[] => fs.readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  if (fs.statSync(p).isDirectory()) return f === 'test' ? [] : tsx(p);
  return p.endsWith('.tsx') ? [p] : [];
});
const texts = (l: L) => [l.fr, l.nl];
const roles = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '..', 'backend', 'config', 'roles.json'), 'utf8')).roles.map((r: { code: string }) => r.code);

describe('fiches d’aide', () => {
  it('chaque écran de l’application a sa fiche (routes de App.tsx, connexion comprise)', () => {
    const app = fs.readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
    const routes = [...app.matchAll(/<Route (?:path="([a-z/-]*)"|index)/g)].map((m) => (m[1] === undefined ? '/' : m[1].startsWith('/') ? m[1] : `/${m[1]}`));
    const ecrans = [...new Set(routes)].filter((r) => r !== '*');
    expect(ecrans.length).toBeGreaterThan(15);
    for (const r of ecrans) expect(topicForPath(r), r).toBeTruthy();
  });

  it('aucun jargon dans les fiches (ERG-08) : ni GMAO, ni MCP, ni API, ni code technique', () => {
    for (const tp of TOPICS) {
      const all: L[] = [tp.purpose, ...tp.layout, ...tp.procedures.flatMap((p) => [p.title, p.when, p.result, ...p.steps, ...(p.errors || []).flatMap((e) => [e.problem, e.solution])]), ...tp.faq.flatMap((f) => [f.q, f.a])];
      for (const l of all) for (const x of texts(l)) expect(x, tp.id).not.toMatch(/\bGMAO\b|\bMCP\b|\bAPI\b|\bOT\b|\bSSO\b|business_roles|it_roles|undefined/);
    }
  });

  it('identifiants et adresses uniques ; chaque adresse retrouve sa fiche', () => {
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
    expect(new Set(TOPICS.map((t) => t.path)).size).toBe(TOPICS.length);
    for (const tp of TOPICS) expect(topicForPath(tp.path.replace(/:[^/]+/g, '7'))?.id, tp.id).toBe(tp.id);
    expect(topicForPath('/tickets/')?.id).toBe('tickets');
    expect(topicForPath('/inconnu')).toBeUndefined();
  });

  it('chaque fiche : titre traduit, rôles du catalogue, au moins deux procédures, FR et NL non vides, clés connues, renvois et captures définis', () => {
    for (const tp of TOPICS) {
      expect(translations[tp.titleKey], tp.id).toBeTruthy();
      expect(tp.roles.length, tp.id).toBeGreaterThan(0);
      for (const r of tp.roles) expect(roles, `${tp.id} : ${r}`).toContain(r);
      expect(tp.procedures.length, tp.id).toBeGreaterThanOrEqual(2);
      const all: L[] = [tp.purpose, ...tp.layout, ...tp.procedures.flatMap((p) => [p.title, p.when, p.result, ...p.steps, ...(p.errors || []).flatMap((e) => [e.problem, e.solution])]), ...tp.faq.flatMap((f) => [f.q, f.a])];
      for (const l of all) for (const s of texts(l)) {
        expect(s.trim(), tp.id).toBeTruthy();
        for (const m of s.matchAll(/\{\{([a-z0-9_.]+)\}\}/g)) expect(translations[m[1]], `${tp.id} : ${m[1]}`).toBeTruthy();
      }
      // Même nombre de repères [[n]] en FR et en NL : la légende de la capture vaut pour les deux langues.
      for (const l of tp.layout) expect((l.nl.match(/\[\[\d+\]\]/g) || []).join(), tp.id).toBe((l.fr.match(/\[\[\d+\]\]/g) || []).join());
      for (const s of tp.seeAlso) expect(topicById(s), `${tp.id} → ${s}`).toBeTruthy();
      const shots = new Set(tp.shots.map((s) => s.id));
      for (const id of [tp.overviewShot, ...tp.procedures.flatMap((p) => p.shots || [])].filter(Boolean)) expect(shots.has(id as string), `${tp.id} : ${id}`).toBe(true);
    }
  });

  it('identifiants de capture uniques et légendes FR et NL', () => {
    const ids = TOPICS.flatMap((tp) => tp.shots.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of TOPICS.flatMap((tp) => tp.shots)) for (const c of texts(s.caption)) expect(c.trim(), s.id).toBeTruthy();
  });

  it('un identifiant de fiche respecte la forme acceptée par le serveur pour topic_id', () => {
    for (const tp of TOPICS) expect(tp.id).toMatch(/^[a-z][a-z0-9_.-]{0,59}$/);
  });
});

describe('captures présentes (npm run help:check, après npm run help:capture)', () => {
  it.runIf(process.env.HELP_STRICT === '1')('chaque capture existe en FR et en NL', () => {
    for (const s of TOPICS.flatMap((tp) => tp.shots)) for (const l of ['fr', 'nl']) {
      expect(fs.existsSync(path.resolve(process.cwd(), 'public', 'aide-captures', l, `${s.id}.jpg`)), `${l}/${s.id}.jpg`).toBe(true);
    }
  });
});

describe('explication des champs', () => {
  it('chaque clé appelée existe ; chaque explication fait 12 caractères au moins en FR et en NL', () => {
    let appels = 0;
    for (const f of tsx(SRC)) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bhint\('([a-z0-9_.]+)'\)/g)) { appels += 1; expect(hints[m[1]], `${path.basename(f)} : ${m[1]}`).toBeTruthy(); }
    }
    expect(appels).toBeGreaterThan(20);
    for (const [k, v] of Object.entries(hints)) { expect(v.fr.length, k).toBeGreaterThanOrEqual(12); expect(v.nl.length, k).toBeGreaterThanOrEqual(12); }
  });

  it('tout Form.Item nommé porte son « ? », sauf la ligne d’une liste sans libellé (réponses d’une question), expliquée par son groupe', () => {
    let n = 0;
    for (const f of tsx(SRC)) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/<Form\.Item\b[^>]*\bname=[^>]*>/g)) {
        if (/\bname=\{\[/.test(m[0]) && !/\blabel=/.test(m[0])) continue;
        n += 1;
        expect(m[0], `${path.basename(f)} : ${m[0].slice(0, 80)}`).toMatch(/tooltip=/);
      }
    }
    expect(n).toBeGreaterThan(90);
  });
});

describe('captures servies sans masquer l’écran /help', () => {
  it('aucun dossier public/help : nginx servirait le dossier au lieu de l’écran (try_files $uri $uri/)', () => {
    expect(fs.existsSync(path.resolve(process.cwd(), 'public', 'help'))).toBe(false);
    expect(fs.readFileSync(path.join(SRC, 'help', 'TopicView.tsx'), 'utf8')).toMatch(/\/aide-captures\/\$\{lang\}\//);
  });
});
