/**
 * Configuration du script de captures de l'aide (standard, section 13.1 ; gabarit 1.3.0 ; 0.12.0, E-37).
 * À lancer sur un poste avec navigateur, contre une installation garnie des données de démonstration :
 *   npx playwright install chromium   (une fois)
 *   HELP_BASE_URL=https://… HELP_USER=… HELP_PASSWORD=… npm run help:capture
 * HELP_CHROMIUM : chemin d'un Chromium déjà installé, à la place de celui de Playwright (facultatif).
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'capture.spec.ts',
  timeout: 15 * 60 * 1000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.HELP_BASE_URL || 'https://localhost:18443',
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    // Un repère ou un bouton introuvable échoue vite : la capture est notée FAIL et les suivantes continuent.
    actionTimeout: 8000,
    navigationTimeout: 20000,
    launchOptions: process.env.HELP_CHROMIUM ? { executablePath: process.env.HELP_CHROMIUM } : {},
  },
});
