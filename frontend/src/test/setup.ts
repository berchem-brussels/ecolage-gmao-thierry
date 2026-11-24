/** Polyfills nécessaires à Ant Design 5 en jsdom (patron SAGA src/test/setup.ts). */
import '@testing-library/jest-dom/vitest';

window.matchMedia = window.matchMedia || ((query: string) => ({
  matches: false, media: query, onchange: null,
  addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;
class RO { observe() {} unobserve() {} disconnect() {} }
(window as unknown as { ResizeObserver: unknown }).ResizeObserver = (window as unknown as { ResizeObserver?: unknown }).ResizeObserver || RO;
window.scrollTo = window.scrollTo || (() => {});
// 0.18.0 (point 4) : pas de visite guidée automatique pendant les tests (VisiteGuidee.tsx) ; les tests de la visite l'ouvrent eux-mêmes.
window.localStorage.setItem('gmao.visite.auto', '0');
// 0.20.0 (livraison, travail `tests` de GitHub) : la machine de GitHub est plus lente que le bac à sable ; une attente
// `findBy…`/`waitFor` de 1 s (défaut) y échouait (accueil du service, compteur « à qualifier »). Attente portée à 5 s.
import { configure } from '@testing-library/react';
configure({ asyncUtilTimeout: 5000 });
// 0.21.1 (DV-173) : règle des champs de date et d'heure posée comme au démarrage de l'application (main.tsx).
import { installerSaisieDate } from '../saisieDate';
installerSaisieDate();
