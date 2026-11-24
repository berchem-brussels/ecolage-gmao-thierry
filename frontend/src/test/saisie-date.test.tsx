import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KeyboardEvent } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { Form } from 'antd';
import { champDateActif, ecranTactile, entreeSansEnvoi, retenirSaisieAvant } from '../saisieDate';
import { ChampDate } from '../components/ChampDate';
import { I18nProvider } from '../contexts/I18nContext';

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

  const monterChamp = () => render(<I18nProvider><Form><Form.Item name="d" label="Date"><ChampDate format="DD/MM/YYYY" /></Form.Item></Form></I18nProvider>);
  const calendrierAffiche = () => {
    const d = document.querySelector<HTMLElement>('.ant-picker-dropdown');
    return !!d && d.style.display !== 'none' && !d.className.includes('ant-picker-dropdown-hidden');
  };
  afterEach(() => { document.body.innerHTML = ''; });

  it('lecture seule sur écran tactile seulement', () => {
    ecran(true);
    expect(ecranTactile()).toBe(true);
    const { container, unmount } = monterChamp();
    expect(container.querySelector('input')?.readOnly).toBe(true);
    unmount();
    ecran(false);
    const r = monterChamp();
    expect(r.container.querySelector('input')?.readOnly).toBe(false);
  });

  // 0.21.2 (DV-177, recette de la 0.21.1 sur NIXUS) : sur PC, le calendrier ne s'affiche pas de lui-même ; il ne
  // recouvre donc plus le champ suivant ni le bouton d'envoi. Il s'affiche par l'icône ou Alt+Flèche bas.
  it('PC : calendrier caché au toucher et à la frappe, affiché par l’icône et par Alt+Flèche bas', async () => {
    ecran(false);
    const { container } = monterChamp();
    const champ = container.querySelector('input') as HTMLInputElement;
    await act(async () => { fireEvent.mouseDown(champ); fireEvent.click(champ); champ.focus(); fireEvent.change(champ, { target: { value: '01/12/2026' } }); });
    expect(calendrierAffiche()).toBe(false);
    const icone = container.querySelector('.champ-date-icone') as HTMLElement;
    expect(icone.getAttribute('aria-label')).toBe('Ouvrir le calendrier');
    await act(async () => { fireEvent.mouseDown(icone); fireEvent.click(icone); });
    expect(calendrierAffiche()).toBe(true);
    await act(async () => { fireEvent.keyDown(champ, { key: 'Escape' }); fireEvent.mouseDown(document.body); champ.blur(); });
    expect(calendrierAffiche()).toBe(false);
    await act(async () => { champ.focus(); fireEvent.click(champ); fireEvent.keyDown(champ, { key: 'ArrowDown', altKey: true }); });
    expect(calendrierAffiche()).toBe(true);
  });

  it('écran tactile : calendrier au toucher, comme avant', async () => {
    ecran(true);
    const { container } = monterChamp();
    const champ = container.querySelector('input') as HTMLInputElement;
    await act(async () => { fireEvent.mouseDown(champ); fireEvent.click(champ); champ.focus(); });
    expect(calendrierAffiche()).toBe(true);
  });

  it('Entrée n’envoie pas le formulaire ; les autres touches passent', () => {
    const entree = { key: 'Enter', preventDefault: vi.fn() };
    entreeSansEnvoi(entree as unknown as KeyboardEvent);
    expect(entree.preventDefault).toHaveBeenCalledTimes(1);
    const autre = { key: 'Tab', preventDefault: vi.fn() };
    entreeSansEnvoi(autre as unknown as KeyboardEvent);
    expect(autre.preventDefault).not.toHaveBeenCalled();
  });

  const fichiers = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? (n === 'test' ? [] : fichiers(p)) : p.endsWith('.tsx') ? [p] : [];
  });

  // 0.21.2 (DV-177) : tout champ de date, d'heure ou de période passe par ChampDate, ChampHeure ou ChampPeriode
  // (calendrier par l'icône sur PC, lecture seule sur écran tactile, Entrée sans envoi).
  it('aucun DatePicker, TimePicker ni RangePicker direct hors de ChampDate.tsx, ni inputReadOnly en dur', () => {
    const racine = join(__dirname, '..');
    const fautes: string[] = [];
    for (const f of fichiers(racine)) {
      const rel = relative(racine, f).replace(/\\/g, '/');
      if (rel === 'components/ChampDate.tsx') continue;
      const src = readFileSync(f, 'utf8');
      if (/\binputReadOnly\b/.test(src)) fautes.push(`${rel} : inputReadOnly écrit en dur`);
      for (const m of src.matchAll(/<(DatePicker\.RangePicker|DatePicker|TimePicker)\b/g)) fautes.push(`${rel} : <${m[1]}> (utiliser ChampDate, ChampHeure ou ChampPeriode)`);
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

    // 0.21.2 (DV-177) : un vrai clic de souris retire le focus dès l'appui, avant « click » : la règle joue à l'appui.
    it('appui de la souris (pointerdown, mousedown) sur un bouton : Entrée au champ avant qu’il perde le focus', () => {
      const { champ, touches } = monter();
      champ.focus();
      const b = document.getElementById('b') as HTMLButtonElement;
      fireEvent.pointerDown(b);
      expect(touches).toEqual(['Enter']);
      expect(document.activeElement).not.toBe(champ);
      champ.focus();
      fireEvent.mouseDown(b);
      expect(touches).toEqual(['Enter', 'Enter']);
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

