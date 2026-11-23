/** Paramètres publics de l'instance (nom, organisation, couleurs, état d'installation), chargés avant le rendu. */
import React, { createContext, useContext } from 'react';

export interface InstanceSettings {
  app: { name_fr: string; name_nl: string; organisation_fr: string; organisation_nl: string; default_lang: 'fr' | 'nl'; support_contact: string };
  theme: { primary: string; menu_bg: string; primary_text_dark: string; selection: string; selection_dark: string; login_gradient_end: string };
  auth: { mode: 'local' | 'sso' | 'sso_optional' };
  installed: boolean;
  version: string;
  /** Avant l'installation seulement : modules que l'assistant peut activer ou laisser éteints. */
  modules_installables?: { code: string; libelle_fr: string; libelle_nl: string; description_fr: string; description_nl: string; actif_defaut: boolean }[];
}

export const FALLBACK_SETTINGS: InstanceSettings = {
  app: { name_fr: 'Application', name_nl: 'Toepassing', organisation_fr: '', organisation_nl: '', default_lang: 'fr', support_contact: '' },
  theme: { primary: '#444444', menu_bg: '#333333', primary_text_dark: '#cccccc', selection: '#dddddd', selection_dark: '#555555', login_gradient_end: '#222222' },
  auth: { mode: 'local' },
  installed: true,
  version: '',
};

const SettingsContext = createContext<{ settings: InstanceSettings; reload: () => Promise<void> }>({ settings: FALLBACK_SETTINGS, reload: async () => {} });

export function SettingsProvider({ value, children }: { value: { settings: InstanceSettings; reload: () => Promise<void> }; children: React.ReactNode }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
