/**
 * Schéma des fiches d'aide (standard, section 13.1 ; gabarit 1.3.0, help/types.ts) : une fiche par écran, FR et NL côte
 * à côte. Dans les textes : {{clé}} affiche le libellé réel de l'interface, [[n]] le repère n de la capture, **texte** le gras.
 *
 * GMAO (0.12.0, E-44) : les rôles du gabarit (« agent », « admin ») deviennent les codes de config/roles.json, affichés
 * par leur libellé ; une fiche ou une procédure peut être réservée (acces) à un module actif, à une permission dans
 * l'entité active, à l'administrateur ou à qui traite une file de tickets, comme le menu.
 */
export interface L { fr: string; nl: string }

/** Condition d'affichage, comme celle du menu ; plusieurs conditions se cumulent. */
export interface Acces {
  module?: string;
  permission?: string;
  admin?: boolean;
  /** Une entité active (tout écran métier). */
  entite?: boolean;
  /** Traite au moins une file de tickets (R6, 0.12.0). */
  traitant?: boolean;
  /** L'une des conditions suffit (par exemple : administrateur ou permission). */
  ou?: Acces[];
}

/** scrollSel (0.15.0) : fait défiler la page ou le volet jusqu'à l'élément (le fil de messages sous la fiche). */
export interface ShotAction { click?: string; clickSel?: string; fill?: { sel: string; value: string }; wait?: number; scrollSel?: string }

/** Capture produite par le script help-capture : jamais à la main. */
export interface Shot {
  id: string;
  path: string;
  actions?: ShotAction[];
  clip?: 'page' | 'modal' | 'drawer';
  marks?: { sel: string }[];
  caption: L;
  /**
   * Compte de démonstration à utiliser (0.16.0) : code d'un rôle (« valideur ») pour un écran que le compte
   * administrateur ne voit pas ; le script lit HELP_USER_<CODE> (par exemple HELP_USER_VALIDEUR). Absent : HELP_USER.
   */
  compte?: string;
}

export interface Procedure {
  title: L;
  when: L;
  steps: L[];
  result: L;
  errors?: { problem: L; solution: L }[];
  acces?: Acces;
  shots?: string[];
}

export interface HelpTopic {
  id: string;
  /** Adresse de l'écran ; « :param » pour une partie variable. */
  path: string;
  group: 'demandeur' | 'service' | 'admin' | 'aide';
  titleKey: string;
  /** Codes des rôles à qui l'écran sert (config/roles.json), affichés par leur libellé. */
  roles: string[];
  acces?: Acces;
  purpose: L;
  layout: L[];
  overviewShot?: string;
  procedures: Procedure[];
  faq: { q: L; a: L; acces?: Acces }[];
  seeAlso: string[];
  shots: Shot[];
}
