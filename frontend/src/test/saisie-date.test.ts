import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KeyboardEvent } from 'react';
import { champDateActif, ecranTactile, entreeSansEnvoi, retenirSaisieAvant, saisieDate } from '../saisieDate';

/**
 * 0.21.0, point 0, R1 (DV-164) : une date tapée au clavier puis Entrée envoyait l'affectation sans la date.
 * jsdom ne fait pas l'envoi implicite d'un formulaire par Entrée : le scénario complet a été rejoué dans Chromium sur la
 * copie locale. Ici : la règle commune (saisieDate.ts) et l'inventaire des champs de date et d'heure du code.
 */
describe('Champs de date et d’heure (R1)', () => {
  const origine = window.matchMedia;
  afterEach(() => { window.matchMedia = origine; });

  const ecran = (tactile: boolean) => {
    window.matchMedia = ((q: string) => ({ matches: tactile && q === '(pointer: coarse)', media: q, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
  };

  it('lecture seule sur écran tactile seulement', () => {
    ecran(true);
    expect(ecranTactile()).toBe(true);
    expect(saisieDate().inputReadOnly).toBe(true);
    ecran(false);
    expect(saisieDate().inputReadOnly).toBe(false);
  });

  it('Entrée n’envoie pas le formulaire ; les autres touches passent', () => {
    const entree = { key: 'Enter', preventDefault: vi.fn() };
    entreeSansEnvoi(entree as unknown as KeyboardEvent);
    expect(entree.preventDefault).toHaveBeenCalledTimes(1);
    const autre = { key: 'Tab', preventDefault: vi.fn() };
    entreeSansEnvoi(autre as unknown as KeyboardEvent);
    expect(autre.preventDefault).not.toHaveBeenCalled();
    expect(saisieDate().onKeyDown).toBe(entreeSansEnvoi);
  });

  // Exceptions motivées : hors d'un formulaire à enregistrer, ou Entrée voulue.
  const EXCEPTIONS: Record<string, string> = {
    'components/referentiel/SimulateurTab.tsx': 'Entrée lance le calcul du simulateur, rien n’est enregistré',
    'pages/JournalPage.tsx': 'filtre de période du journal, rien n’est enregistré',
    'components/referentiel/CalendrierTab.tsx#TimePicker': 'heures de l’horaire, hors formulaire (bouton Enregistrer de la ligne)',
  };
  const fichiers = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? (n === 'test' ? [] : fichiers(p)) : p.endsWith('.tsx') ? [p] : [];
  });

  it('aucun champ de date ou d’heure en lecture seule partout, ni sans la règle d’Entrée', () => {
    const racine = join(__dirname, '..');
    const fautes: string[] = [];
    for (const f of fichiers(racine)) {
      const rel = relative(racine, f).replace(/\\/g, '/');
      const src = readFileSync(f, 'utf8');
      if (/\binputReadOnly\b/.test(src)) fautes.push(`${rel} : inputReadOnly écrit en dur (utiliser saisieDate())`);
      // La balise va jusqu'à « /> » (ses propriétés contiennent des flèches « => »).
      for (const m of src.matchAll(/<(DatePicker\.RangePicker|DatePicker|TimePicker)\b/g)) {
        if (EXCEPTIONS[rel] || EXCEPTIONS[`${rel}#${m[1]}`]) continue;
        const balise = src.slice(m.index, src.indexOf('/>', m.index));
        if (!/saisieDate\(\)|entreeSansEnvoi/.test(balise)) fautes.push(`${rel} : <${m[1]}> sans saisieDate() ni entreeSansEnvoi`);
      }
    }
    expect(fautes).toEqual([]);
  });

  // 0.21.1 (DV-173) : texte tapé retenu avant un clic ou un envoi qui ne passe pas par le champ (scénario complet de
  // « Terminer la tâche » dans demandes.test.tsx, et rejoué dans Chromium et WebKit sur la copie locale).
  describe('texte tapé retenu avant un clic ou un envoi (0.21.1)', () => {
    const monter = () => {
      document.body.innerHTML = '<form><div class="ant-picker"><input id="d" /></div><button id="b" type="button">OK</button></form>'
        + '<div class="ant-picker-dropdown"><button id="cellule" type="button">12</button></div>';
      const champ = document.getElementById('d') as HTMLInputElement;
      const touches: string[] = [];
      champ.addEventListener('keydown', (e) => touches.push((e as unknown as { key: string }).key));
      return { champ, touches };
    };
    afterEach(() => { document.body.innerHTML = ''; });

    it('champ de date actif : Entrée lui est envoyée puis il perd le focus, avant le clic', () => {
      const { champ, touches } = monter();
      champ.focus();
      expect(champDateActif()).toBe(champ);
      const b = document.getElementById('b') as HTMLButtonElement;
      retenirSaisieAvant({ target: b } as unknown as Event);
      expect(touches).toEqual(['Enter']);
      expect(document.activeElement).not.toBe(champ);
    });

    it('rien quand aucun champ de date n’a le focus, ni pour un clic dans le champ ou son calendrier', () => {
      const { champ, touches } = monter();
      retenirSaisieAvant({ target: document.getElementById('b') } as unknown as Event);
      champ.focus();
      retenirSaisieAvant({ target: champ } as unknown as Event);
      retenirSaisieAvant({ target: document.getElementById('cellule') } as unknown as Event);
      expect(touches).toEqual([]);
      expect(document.activeElement).toBe(champ);
    });

    it('posée pour toute l’application : un vrai clic sur un bouton passe d’abord par la règle (setup.ts, comme main.tsx)', () => {
      const { champ, touches } = monter();
      champ.focus();
      (document.getElementById('b') as HTMLButtonElement).click();
      expect(touches).toEqual(['Enter']);
      const main = readFileSync(join(__dirname, '..', 'main.tsx'), 'utf8');
      expect(main).toMatch(/installerSaisieDate\(\)/);
    });
  });
});

