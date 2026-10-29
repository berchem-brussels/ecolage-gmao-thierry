/** Chargement des paramètres publics de l'instance et pose des couleurs en variables CSS. */
import { FALLBACK_SETTINGS, type InstanceSettings } from './contexts/SettingsContext';

export async function loadSettings(): Promise<InstanceSettings> {
  try {
    const res = await fetch('/api/settings/public', { headers: { Accept: 'application/json' } });
    const json = await res.json();
    return json.data as InstanceSettings;
  } catch {
    return FALLBACK_SETTINGS;
  }
}

export function applyThemeVariables(s: InstanceSettings) {
  const r = document.documentElement.style;
  r.setProperty('--app-primary', s.theme.primary);
  r.setProperty('--app-primary-text', s.theme.primary);
  r.setProperty('--app-primary-text-dark', s.theme.primary_text_dark);
  r.setProperty('--app-menu-bg', s.theme.menu_bg);
  r.setProperty('--app-selection', s.theme.selection);
  r.setProperty('--app-selection-dark', s.theme.selection_dark);
}
