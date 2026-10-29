/** Polyfills nécessaires à Ant Design 5 en jsdom (patron SAGA src/test/setup.ts). */
import '@testing-library/jest-dom/vitest';

window.matchMedia = window.matchMedia || ((query: string) => ({
  matches: false, media: query, onchange: null,
  addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;
class RO { observe() {} unobserve() {} disconnect() {} }
(window as unknown as { ResizeObserver: unknown }).ResizeObserver = (window as unknown as { ResizeObserver?: unknown }).ResizeObserver || RO;
window.scrollTo = window.scrollTo || (() => {});
