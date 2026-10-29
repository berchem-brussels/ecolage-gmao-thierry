/**
 * Démarrage : police Inter embarquée (patron STEGA), paramètres publics de l'instance chargés avant le rendu,
 * couleurs de l'institution posées en variables CSS (standard v3.2, section 12).
 */
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { loadSettings, applyThemeVariables } from './settings';

(async () => {
  const settings = await loadSettings();
  applyThemeVariables(settings);
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App initialSettings={settings} />
    </React.StrictMode>,
  );
})();
