/**
 * Liste des fiches d'aide, fiche d'un écran (adresses à paramètre comprises) et droit de voir une fiche ou une
 * procédure (gabarit 1.3.0, help/index.ts ; accès propres à la GMAO, E-44).
 */
import { useCallback } from 'react';
import type { Acces, HelpTopic } from './types';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, useRoles } from '../useRoles';
import { moduleActif, useModules } from '../moduleMap';
import accueil from './topics/accueil';
import nouvelleDemande from './topics/nouvelle-demande';
import mesDemandes from './topics/mes-demandes';
import tickets from './topics/tickets';
import help from './topics/help';
import accessibilite from './topics/accessibilite';
import connexion from './topics/connexion';
import demandesEntite from './topics/demandes-entite';
import patrimoine from './topics/patrimoine';
import listes from './topics/listes';
import referentiel from './topics/referentiel';
import reglagesEntite from './topics/reglages-entite';
import entites from './topics/entites';
import users from './topics/users';
import parametres from './topics/parametres';
import journal from './topics/journal';

/** Fiches dans l'ordre du menu : demandeur, service technique, administration, aide. */
export const TOPICS: HelpTopic[] = [
  accueil, nouvelleDemande, mesDemandes, tickets,
  demandesEntite, patrimoine, referentiel, listes, reglagesEntite,
  entites, users, parametres, journal,
  help, accessibilite, connexion,
];

export function topicForPath(path: string): HelpTopic | undefined {
  return TOPICS.find((t) => new RegExp(`^${t.path.replace(/:[^/]+/g, '[^/]+')}/?$`).test(path));
}

export function topicById(id: string | null | undefined): HelpTopic | undefined {
  return TOPICS.find((t) => t.id === id);
}

/** Vrai si la personne voit ce qui est soumis à « acces » (confort d'affichage ; le serveur contrôle chaque appel). */
export function useHelpAccess(): (acces?: Acces) => boolean {
  const { isAdmin, roles, entite, user } = useAuth();
  const catalogue = useRoles();
  const { modules } = useModules();
  const ok = useCallback((a?: Acces): boolean => {
    if (!a) return true;
    if (a.module && !moduleActif(modules, a.module)) return false;
    if (a.admin && !isAdmin) return false;
    if (a.entite && !entite) return false;
    if (a.permission && !hasPermission(catalogue, roles || [], a.permission)) return false;
    if (a.traitant && !(user?.files_tickets?.length)) return false;
    if (a.ou && !a.ou.some((x) => ok(x))) return false;
    return true;
  }, [modules, isAdmin, entite, catalogue, roles, user?.files_tickets]);
  return ok;
}
