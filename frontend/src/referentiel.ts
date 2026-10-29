/**
 * Référentiel des demandes côté interface (version 0.4.0) : types des catégories, priorités, horaires, congés et
 * fermetures, échéances ; pictogrammes des tuiles. Les règles font foi côté serveur (services/categories.js,
 * priorites.js, calendrier.js, echeances.js) ; elles servent ici à ne proposer que les gestes permis.
 * Le catalogue des icônes est celui de backend/config/categories.json : un code inconnu prend l'icône « autre ».
 */
import React from 'react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/fr';
import 'dayjs/locale/nl';
import {
  ThunderboltOutlined, BulbOutlined, ApiOutlined, PoweroffOutlined, ControlOutlined, ToolOutlined, AlertOutlined,
  WarningOutlined, FireOutlined, DashboardOutlined, CloudOutlined, HomeOutlined, LockOutlined, KeyOutlined, BorderOutlined,
  BuildOutlined, SafetyOutlined, BellOutlined, AppstoreOutlined, EnvironmentOutlined, SunOutlined, FlagOutlined,
  LayoutOutlined, SwapOutlined, ShoppingCartOutlined, ClearOutlined, FormatPainterOutlined, CarOutlined, QuestionCircleOutlined,
} from '@ant-design/icons';

dayjs.extend(customParseFormat);

export type Priorite = 'P1' | 'P2' | 'P3' | 'P4';
export type Unite = 'heures_calendaires' | 'heures_ouvrables' | 'jours_ouvrables';

/** Trace d'une fiche (0.4.1) : livrée, créée, modifiée ou rétablie ; date UTC ISO ; nom rendu aux personnes de l'entité. */
export interface Trace { etat: 'livree' | 'creee' | 'modifiee' | 'retablie'; le: string | null; par: string | null }

export interface Categorie {
  id: number; entite_id: number; parent_id: number | null; niveau: 'domaine' | 'nature'; code: string;
  libelle_fr: string; libelle_nl: string; icone: string;
  priorite_defaut: Priorite | null; validation: 0 | 1 | null; delai_fin_jours: number | null; ordre: number;
  priorite_effective: Priorite; validation_effective: 0 | 1; delai_fin_jours_effectif: number | null;
  parent_code: string | null; parent_libelle_fr: string | null; parent_libelle_nl: string | null;
  is_active: number; motif_desactivation: string | null; created_at: string; updated_at: string;
  natures?: Categorie[]; trace?: Trace;
  /** Questions posées dans le formulaire pour cette catégorie (DEM-05, 0.7.0) : celles du domaine, puis les siennes. */
  questions?: QuestionPosee[];
}

/** Réponse proposée : « oui », « non », ou le rang de « 1 » à « 6 » pour une question à choix (DEM-05, 0.7.0). */
export interface ReponseProposee { valeur: string; fr: string; nl: string }

/** Question telle que le formulaire de demande la pose (arbre des catégories). */
export interface QuestionPosee {
  id: number; categorie_id: number; origine: 'domaine' | 'nature'; question_fr: string; question_nl: string;
  type: 'oui_non' | 'choix'; reponses: ReponseProposee[]; obligatoire: 0 | 1;
}

/** Question propre d'une catégorie, telle que le responsable la règle (fiche de la catégorie). */
export interface QuestionCategorie {
  id: number; entite_id: number; categorie_id: number; categorie_code: string; categorie_niveau: 'domaine' | 'nature';
  question_fr: string; question_nl: string; type: 'oui_non' | 'choix'; reponses: ReponseProposee[]; obligatoire: 0 | 1;
  ordre: number; is_active: number; motif_desactivation: string | null; trace?: Trace;
}

/** Réponse donnée dans une demande ou un brouillon. */
export interface ReponseDonnee { question_id: number; valeur: string }

export interface ArbreCategories { domaines: Categorie[]; total: number }

export interface PrioriteFiche {
  id: number; entite_id: number; code: Priorite; libelle_fr: string; libelle_nl: string;
  description_fr: string | null; description_nl: string | null; couleur: string; unite: Unite;
  prise_en_charge: number; fin: number | null; updated_at: string;
  defaut: Omit<PrioriteFiche, 'id' | 'entite_id' | 'code' | 'updated_at' | 'defaut' | 'est_defaut' | 'trace'>; est_defaut: boolean; trace?: Trace;
}

export interface Horaire { id: number; entite_id: number; jour: number; debut: string | null; fin: string | null; ouvre: number; defaut: { debut: string | null; fin: string | null }; est_defaut: boolean; trace?: Trace }

export interface JourNonOuvre {
  id: number; entite_id: number; nature: 'conge' | 'fermeture'; mois_jour: string | null; date_debut: string | null; date_fin: string | null;
  libelle_fr: string; libelle_nl: string; is_active: number; motif_desactivation: string | null; created_at: string; updated_at: string;
  trace?: Trace;
}

export interface Ferie { date: string; code: string; libelle_fr: string; libelle_nl: string }

export interface Instant { utc: string; local: string }
export interface Echeance {
  priorite: Priorite; unite: Unite; recu_le: Instant; debut_decompte: Instant; delai_prise_en_charge: number;
  prise_en_charge_le: Instant; delai_fin: number | null; delai_fin_source: 'priorite' | 'categorie' | null;
  fin_le: Instant | null; date_convenue: boolean;
  categorie: { id: number; code: string; libelle_fr: string; libelle_nl: string } | null;
}

export const PRIORITES: Priorite[] = ['P1', 'P2', 'P3', 'P4'];
export const UNITES: Unite[] = ['heures_calendaires', 'heures_ouvrables', 'jours_ouvrables'];
export const COULEURS = ['red', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple', 'magenta', 'default'];
export const JOURS = [1, 2, 3, 4, 5, 6, 7];

/** Pictogramme de chaque code d'icône du catalogue serveur. */
export const ICONES: Record<string, React.ComponentType> = {
  eclair: ThunderboltOutlined, ampoule: BulbOutlined, prise: ApiOutlined, courant: PoweroffOutlined, commande: ControlOutlined,
  outil: ToolOutlined, alerte: AlertOutlined, avertissement: WarningOutlined, feu: FireOutlined, thermometre: DashboardOutlined,
  nuage: CloudOutlined, maison: HomeOutlined, serrure: LockOutlined, cle: KeyOutlined, cadre: BorderOutlined,
  construction: BuildOutlined, securite: SafetyOutlined, cloche: BellOutlined, mobilier: AppstoreOutlined, exterieur: EnvironmentOutlined,
  soleil: SunOutlined, drapeau: FlagOutlined, amenagement: LayoutOutlined, deplacement: SwapOutlined, achat: ShoppingCartOutlined,
  nettoyage: ClearOutlined, peinture: FormatPainterOutlined, vehicule: CarOutlined, autre: QuestionCircleOutlined,
};
export const ICONE_CODES = Object.keys(ICONES);

export function Icone({ code, style }: { code: string; style?: React.CSSProperties }) {
  const C = (ICONES[code] || ICONES.autre) as React.ComponentType<{ style?: React.CSSProperties; 'aria-hidden'?: boolean }>;
  return React.createElement(C, { style, 'aria-hidden': true });
}

/** « 05-08 » vers une date de l'année donnée (pour l'afficher avec le mois en toutes lettres). */
export const moisJourDate = (mj: string, annee = 2026) => `${annee}-${mj}`;
