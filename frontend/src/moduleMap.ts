/**
 * Modules de l'instance côté interface (patron SAGA moduleMap.ts ; standard v3.2, section 6.2 ; cahier des charges ADM-02).
 * L'état vient de GET /api/modules, chargé une fois puis rechargé quand l'administrateur change un module.
 * Confort d'affichage seulement : un module éteint disparaît du menu, de l'aide et de l'assistant, et son écran renvoie
 * à l'accueil ; le serveur refuse ses opérations (403 MODULE_DISABLED) quoi que fasse l'interface.
 */
import { useEffect, useState } from 'react';
import api, { qs } from './api';

export interface Module {
  code: string; libelle_fr: string; libelle_nl: string; description_fr: string; description_nl: string;
  ferme_fr: string | null; ferme_nl: string | null; noyau: boolean; disponible: boolean; etape: number; actif: boolean;
  updated_at: string | null;
}

/** Écran de l'interface et module qui l'ouvre ; un écran absent de la table appartient au noyau. */
export const ROUTE_MODULE: Record<string, string> = {
  '/patrimoine': 'patrimoine',
  '/demandes': 'demandes',
  '/demandes/nouvelle': 'demandes',
  '/demandes-entite': 'demandes',
};

const EVENT = 'app-modules-changed';
let cache: Promise<Module[]> | null = null;

function charger(): Promise<Module[]> {
  if (!cache) cache = api.page<Module>(`/modules${qs({ limit: 200 })}`).then((r) => r.data).catch(() => { cache = null; return []; });
  return cache;
}

/** Recharge l'état des modules dans tous les écrans ouverts (après un réglage par l'administrateur). */
export function reloadModules() {
  cache = null;
  window.dispatchEvent(new Event(EVENT));
}

/** Liste des modules et indicateur de chargement. */
export function useModules(): { modules: Module[]; loaded: boolean } {
  const [state, setState] = useState<{ modules: Module[]; loaded: boolean }>({ modules: [], loaded: false });
  useEffect(() => {
    let alive = true;
    const load = () => charger().then((m) => { if (alive) setState({ modules: m, loaded: true }); });
    load();
    window.addEventListener(EVENT, load);
    return () => { alive = false; window.removeEventListener(EVENT, load); };
  }, []);
  return state;
}

/** Vrai si le module est actif. Tant que l'état n'est pas connu, ou pour un code absent, le module est réputé actif. */
export function moduleActif(modules: Module[], code: string | undefined): boolean {
  if (!code) return true;
  const m = modules.find((x) => x.code === code);
  return m ? m.actif : true;
}

/** Vrai si l'écran est ouvert par un module actif (ou appartient au noyau). */
export function routeActive(modules: Module[], route: string): boolean {
  return moduleActif(modules, ROUTE_MODULE[route]);
}
