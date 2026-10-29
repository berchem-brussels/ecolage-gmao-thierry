/**
 * Types et règles du référentiel des lieux côté interface. Les règles font foi côté serveur (services/lieux.js) ;
 * elles servent ici à ne proposer que les gestes permis.
 */
export type Nature = 'site' | 'batiment' | 'niveau' | 'local';
export type Statut = 'en_service' | 'hors_service' | 'cede';

export interface Lieu {
  id: number; entite_id: number; parent_id: number | null; nature: Nature; code: string; nom_fr: string; nom_nl: string;
  type_id: number | null; type_code: string | null; type_libelle_fr: string | null; type_libelle_nl: string | null;
  adresse: string | null; code_postal: string | null; commune: string | null; surface_m2: number | null; statut: Statut;
  has_photo: number; photo_at: string | null; photo_octets: number | null;
  is_active: number; motif_desactivation: string | null; is_demo: number; created_at: string; updated_at: string;
  enfants?: Lieu[];
}

export interface Valeur {
  id: number; entite_id: number; liste: string; code: string; libelle_fr: string; libelle_nl: string; ordre: number;
  is_active: number; motif_desactivation: string | null; created_at: string; updated_at: string;
}

export const NATURES: Nature[] = ['site', 'batiment', 'niveau', 'local'];
export const STATUTS: Statut[] = ['en_service', 'hors_service', 'cede'];

/** Natures que l'on peut créer sous un lieu (règles 1 et 2). */
export const ENFANTS: Record<Nature, Nature[]> = { site: ['batiment', 'local'], batiment: ['niveau', 'local'], niveau: ['local'], local: [] };
/** Natures admises comme parent (règles 1 et 2). */
export const PARENTS: Record<Nature, Nature[]> = { site: [], batiment: ['site'], niveau: ['batiment'], local: ['site', 'batiment', 'niveau'] };

/** Aplatit l'arbre rendu par GET /api/lieux/arbre. */
export function flatten(nodes: Lieu[], out: Lieu[] = []): Lieu[] {
  for (const n of nodes) { out.push(n); if (n.enfants) flatten(n.enfants, out); }
  return out;
}

/** Ancêtres d'un lieu, du site jusqu'à son parent. */
export function ancestors(id: number, byId: Map<number, Lieu>): Lieu[] {
  const out: Lieu[] = [];
  let cur = byId.get(id);
  while (cur && cur.parent_id) {
    const p = byId.get(cur.parent_id);
    if (!p) break;
    out.unshift(p);
    cur = p;
  }
  return out;
}

/** Recherche insensible aux accents et à la casse. */
export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Code proposé pour un enfant : code du parent suivi d'un tiret. */
export const codeSuggestion = (parent: Lieu | null) => (parent ? `${parent.code}-` : '');

/** Code d'une valeur de liste tiré de son libellé : minuscules sans accent, mots joints par un souligné. */
export function codeFromLabel(label: string): string {
  const c = normalize(label).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  return /^[a-z]/.test(c) ? c : `v_${c}`.slice(0, 40);
}
