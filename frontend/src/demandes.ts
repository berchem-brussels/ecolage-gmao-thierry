/**
 * Demandes d'intervention côté interface (version 0.5.0 ; cahier des charges DEM-01 à 03, SUI-01, ERG-08).
 * Types de l'API, libellé simple et couleur de chaque état tels que le demandeur les voit (cahier des charges,
 * section 8.1 ; les libellés réglables par état arrivent à l'étape 9, CYC-04). Les règles font foi côté serveur
 * (backend/src/services/demandes.js).
 */
import dayjs from 'dayjs';

export type Etat = 'brouillon' | 'en_validation' | 'refusee_validation' | 'a_qualifier' | 'qualifiee' | 'planifiee' | 'en_cours'
  | 'en_attente' | 'externe' | 'terminee' | 'cloturee' | 'rouverte' | 'refusee' | 'fusionnee' | 'annulee';

export const ETATS: Etat[] = ['brouillon', 'en_validation', 'refusee_validation', 'a_qualifier', 'qualifiee', 'planifiee', 'en_cours',
  'en_attente', 'externe', 'terminee', 'cloturee', 'rouverte', 'refusee', 'fusionnee', 'annulee'];

/** Couleur Ant Design de l'étiquette d'état ; le libellé dit toujours l'état, la couleur ne fait que l'appuyer. */
export const COULEUR_ETAT: Record<Etat, string> = {
  brouillon: 'default', en_validation: 'gold', refusee_validation: 'red', a_qualifier: 'blue', qualifiee: 'cyan',
  planifiee: 'geekblue', en_cours: 'purple', en_attente: 'orange', externe: 'purple', terminee: 'green', cloturee: 'default',
  rouverte: 'volcano', refusee: 'red', fusionnee: 'default', annulee: 'default',
};

export interface Etape { id: number; code: string; nom_fr: string; nom_nl: string; nature?: string }

export interface DelaiAnnonce {
  priorite: string; unite: string; delai_fin: number | null; date_convenue: boolean;
  fin_le: { utc: string; local: string } | null;
}

export interface Demande {
  id: number; entite_id: number; numero: string; annee: number; sequence: number; description: string; langue: 'fr' | 'nl';
  etat: Etat; ouverte: 0 | 1; priorite: string | null; canal: string;
  /** « Danger pour les personnes ou les biens » (0.7.0, DEM-06) : P1, sans heure promise au demandeur. */
  danger: 0 | 1;
  /** « Pour » (0.7.0, DEM-07) : un collègue ou un texte ; date souhaitée et créneau (DEM-08). */
  beneficiaire_id?: number | null; beneficiaire_prenom?: string | null; beneficiaire_nom?: string | null; beneficiaire_texte?: string | null;
  date_souhaitee?: string | null; creneau?: string | null; pour_moi?: 0 | 1;
  lieu_id: number; lieu_code: string; lieu_nom_fr: string; lieu_nom_nl: string; lieu_nature: string; lieu_chemin: Etape[];
  categorie_id: number; categorie_code: string; categorie_libelle_fr: string; categorie_libelle_nl: string; categorie_icone: string;
  domaine_libelle_fr: string | null; domaine_libelle_nl: string | null;
  /** Nuls pour une personne qui suit la demande d'un autre (« Moi aussi », 0.7.0) : le nom du demandeur ne lui est pas rendu. */
  demandeur_id: number | null; demandeur_prenom: string | null; demandeur_nom: string | null;
  is_demo: number; created_at: string; updated_at: string; delai_annonce: DelaiAnnonce | null;
  /** 1 si la personne suit cette demande sans l'avoir déposée (0.7.0). */
  suivie: 0 | 1;
  nb_suiveurs: number;
  /** Réponses aux questions de la catégorie (0.7.0, DEM-05), telles qu'au dépôt ; rendues par la fiche seulement. */
  reponses?: ReponseDemande[];
  /** Personnes qui suivent la demande, avec leur remarque : pour le gestionnaire et le responsable seulement. */
  suiveurs?: { user_id: number; prenom: string; nom: string; remarque: string | null; created_at: string }[];
  /** Pièces jointes (0.8.0) : rendues au demandeur, au bénéficiaire et au service technique ; null pour qui suit seulement. */
  pieces?: Piece[] | null;
  /**
   * Qualification et échéances (0.9.0, GES-04, PRI-01, PRI-03). Les champs internes (priorité proposée, motif, durée,
   * consignes, qui a qualifié) et l'échéance qui compte ne sont rendus qu'au service technique.
   */
  priorite_proposee?: string | null; motif_priorite?: string | null;
  prise_en_charge_le?: string | null; echeance_le?: string | null; date_convenue?: string | null;
  duree_estimee_minutes?: number | null; consignes?: string | null; photos_visibles?: 0 | 1;
  qualifiee_par?: number | null; qualifiee_par_prenom?: string | null; qualifiee_par_nom?: string | null; qualifiee_le?: string | null;
  echeance_type?: 'prise_en_charge' | 'fin' | null; echeance_courante?: string | null; retard?: 0 | 1;
}

/** Tableau de bord du service technique (0.9.0, GES-01). */
export interface TableauBord { a_qualifier: number; en_retard: number; p1_p2: number; echeance_proche: number; limite_proche: string; jours_proches: number }

/** Filtres de la liste du service technique (0.9.0, GES-02) ; les mêmes clés forment une vue enregistrée. */
export interface FiltresGestion {
  etats?: string; priorites?: string; categorie_id?: number; batiment_id?: number; echeance?: 'retard' | 'proche' | 'sans';
  canal?: string; danger?: 0 | 1; q?: string; ouvertes?: 0 | 1; tri?: 'depot' | 'numero' | 'echeance' | 'priorite'; ordre?: 'asc' | 'desc';
}
export interface VueDemandes { id: number; nom: string; filtres: FiltresGestion; created_at: string; updated_at: string }

const NOMBRES: (keyof FiltresGestion)[] = ['categorie_id', 'batiment_id', 'danger', 'ouvertes'];
export const CLES_FILTRES: (keyof FiltresGestion)[] = ['etats', 'priorites', 'categorie_id', 'batiment_id', 'echeance', 'canal', 'danger', 'q', 'ouvertes', 'tri', 'ordre'];
export const CANAUX = ['ecran', 'telephone', 'courriel', 'grc', 'mcp', 'api', 'preventif'];
/** États où le service technique peut qualifier une demande en 0.9.0 ; les autres attendent le cycle de vie (étape 9). */
export const QUALIFIABLES: Etat[] = ['a_qualifier', 'qualifiee'];

/**
 * Filtres lus dans l'adresse de la page. Sans « ouvertes » dans l'adresse, la liste montre les demandes en cours ;
 * « ouvertes=tout » montre aussi les fermées.
 */
export function filtresDepuisUrl(p: URLSearchParams): FiltresGestion {
  const f: Record<string, unknown> = {};
  for (const k of CLES_FILTRES) {
    const v = p.get(k);
    if (v === null || v === '' || v === 'tout') continue;
    f[k] = NOMBRES.includes(k) ? Number(v) : v;
  }
  if (!p.has('ouvertes')) f.ouvertes = 1;
  return f as FiltresGestion;
}

/** Adresse de la liste du service pour des filtres donnés (compteurs du tableau de bord, vues). */
export function urlGestion(f: FiltresGestion, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  for (const k of CLES_FILTRES) { const v = f[k]; if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); }
  if (f.ouvertes === undefined) p.set('ouvertes', 'tout');
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return `/demandes-entite?${p.toString()}`;
}

/** Filtres de chaque compteur du tableau de bord : un clic ouvre la liste filtrée, avec le même total. */
export const COMPTEURS: { cle: 'a_qualifier' | 'en_retard' | 'p1_p2' | 'echeance_proche'; filtres: FiltresGestion }[] = [
  { cle: 'a_qualifier', filtres: { etats: 'a_qualifier', tri: 'echeance', ordre: 'asc' } },
  { cle: 'en_retard', filtres: { echeance: 'retard', tri: 'echeance', ordre: 'asc' } },
  { cle: 'p1_p2', filtres: { priorites: 'P1,P2', ouvertes: 1, tri: 'echeance', ordre: 'asc' } },
  { cle: 'echeance_proche', filtres: { echeance: 'proche', tri: 'echeance', ordre: 'asc' } },
];

/** Instant de la base (UTC, « 2026-11-05 07:00:00 ») à l'heure du poste : « 05/11/2026 08:00 ». */
export const instant = (sql: string) => dayjs(`${sql.replace(' ', 'T')}Z`).format('DD/MM/YYYY HH:mm');

/** Durée estimée lisible : « 45 min », « 1 h 30 », « 2 h ». */
export function duree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** Pièce jointe d'une demande ou du brouillon (0.8.0, DEM-09) ; le fichier se lit par /api/pieces/:id/fichier. */
export interface Piece {
  id: number; entite_id: number; demande_id: number | null; auteur_id: number; nom: string;
  type: 'image/jpeg' | 'image/png' | 'application/pdf'; octets: number; largeur: number | null; hauteur: number | null;
  canal: string; created_at: string; brouillon: 0 | 1;
  /** Droit de la personne de retirer la pièce (DV-84), calculé par le serveur ; confort d'affichage. */
  peut_retirer?: 0 | 1;
}

/** Plafonds de l'entité pour les pièces jointes (Réglages de l'entité, DV-83). */
export interface PlafondsPieces { nombre: number; octets: number; types: string[] }

/** Adresse du fichier d'une pièce (cookie de session ; téléchargement en pièce jointe, aperçu par une balise image). */
export const fichierPiece = (id: number) => `/api/pieces/${id}/fichier`;

/** Taille lisible : « 850 ko », « 2,4 Mo ». */
export function taille(octets: number, lang: 'fr' | 'nl'): string {
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} ${lang === 'nl' ? 'kB' : 'ko'}`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} ${lang === 'nl' ? 'MB' : 'Mo'}`;
}

/** Réponse à une question de la catégorie, avec le texte de la question et de la réponse au moment du dépôt. */
export interface ReponseDemande { question_id: number; question_fr: string; question_nl: string; valeur: string; reponse_fr: string; reponse_nl: string }

/** Demande ouverte du même bâtiment, vue avant l'envoi (DEM-04, 0.7.0) : sans le nom du demandeur. */
export interface DemandeVoisine {
  id: number; numero: string; etat: Etat; danger: 0 | 1; created_at: string;
  lieu_id: number; lieu_code: string; lieu_nom_fr: string; lieu_nom_nl: string;
  categorie_id: number; categorie_libelle_fr: string; categorie_libelle_nl: string; categorie_icone: string;
  extrait: string; meme_lieu: 0 | 1; propre: 0 | 1; suivie: 0 | 1;
}

export interface Voisines {
  batiment: { id: number; nature: string; code: string; nom_fr: string; nom_nl: string };
  total: number;
  demandes: DemandeVoisine[];
}

/** Lieu proposé d'office (profil) ou choisi : identifiant et chemin de la racine au lieu. */
export interface LieuChoisi { id: number; code: string; nom_fr: string; nom_nl: string; chemin: Etape[]; source?: 'habituel' | 'derniere_demande' }

/** Chemin lisible d'un lieu : « Site › Bâtiment › Local » dans la langue de l'écran. */
export function cheminTexte(chemin: Etape[], lang: 'fr' | 'nl'): string {
  return chemin.map((e) => (lang === 'nl' ? e.nom_nl : e.nom_fr) || e.code).join(' › ');
}

/** Date et heure de dépôt (UTC en base) à l'heure du poste : « 26/10/2026 14:05 ». */
export function dateDepot(sql: string): string {
  return dayjs(`${sql.replace(' ', 'T')}Z`).format('DD/MM/YYYY HH:mm');
}

/** Échéance annoncée : « mardi 10 novembre », ou null pour une date à convenir ou un délai incalculable. */
export function finAnnoncee(d: DelaiAnnonce | null, lang: 'fr' | 'nl'): string | null {
  if (!d || d.date_convenue || !d.fin_le) return null;
  return dayjs(d.fin_le.utc).locale(lang).format('dddd D MMMM YYYY');
}

/** Bénéficiaire lisible : « Hélène Dupré » ou le texte saisi ; null s'il n'y en a pas. */
export const beneficiaireTexte = (d: Demande): string | null => (d.beneficiaire_id && d.beneficiaire_nom
  ? `${d.beneficiaire_prenom || ''} ${d.beneficiaire_nom}`.trim() : d.beneficiaire_texte || null);

/** Date souhaitée lisible : « vendredi 6 novembre 2026 ». */
export const dateSouhaitee = (iso: string, lang: 'fr' | 'nl') => dayjs(iso).locale(lang).format('dddd D MMMM YYYY');

/** Lien « tel: » d'un numéro saisi librement (espaces, points, barres retirés). */
export const lienTel = (n: string) => `tel:${n.replace(/[^+0-9]/g, '')}`;

/** Début d'un texte, pour les listes. */
export const extrait = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Longueur minimale de la description, comptée sans les espaces autour (même règle que le serveur, DV-37). */
export const DESCRIPTION_MIN = 10;
