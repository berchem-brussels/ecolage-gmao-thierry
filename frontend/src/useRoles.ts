/** Catalogue des rôles (libellés FR et NL servis par l'API depuis config/roles.json), chargé une fois par session d'onglet. */
import { useEffect, useState } from 'react';
import api from './api';

export interface Role { code: string; portee: 'entite' | 'instance'; defaut: boolean; label_fr: string; label_nl: string; description_fr: string; description_nl: string; permissions: string[] }

let cache: Promise<Role[]> | null = null;

export function useRoles(): Role[] {
  const [roles, setRoles] = useState<Role[]>([]);
  useEffect(() => {
    if (!cache) cache = api.get<Role[]>('/roles').catch(() => { cache = null; return []; });
    let alive = true;
    cache.then((r) => { if (alive) setRoles(r); });
    return () => { alive = false; };
  }, []);
  return roles;
}

export function resetRolesCache() { cache = null; }

/**
 * Vrai si l'un des rôles de la personne dans l'entité active porte la permission du catalogue (config/roles.json).
 * Confort d'affichage seulement : le serveur contrôle chaque écriture (standard v3.2, section 8.4).
 */
export function hasPermission(catalogue: Role[], roles: string[], permission: string): boolean {
  return catalogue.some((r) => r.portee === 'entite' && roles.includes(r.code) && r.permissions.includes(permission));
}
