/**
 * Conflits du planning (0.21.0, étape 17, point 4 ; PLA-06) : types et texte communs au planning et à la fiche d'une
 * demande (affectation). Règle du serveur : services/planning.js, règle 8.
 */
import { duree } from './demandes';

export type Conflit = 'absent' | 'jour_non_travaille' | 'trop_charge';
/** Conflit rendu par l'affectation d'une tâche : une personne concernée, ou l'équipe. */
export interface ConflitAffectation { ouvrier_id?: number; equipe_id?: number; prenom?: string; nom?: string; conflits: Conflit[]; charge_min?: number; capacite_min?: number }

/** Texte des conflits rendus par l'affectation (planning et fiche de la demande). */
export function texteConflits(liste: ConflitAffectation[], t: (k: string) => string, lang: 'fr' | 'nl', equipes?: { id: number; nom_fr: string; nom_nl: string }[]): string {
  return `${t('planning.conflit.titre')} ${liste.map((c) => {
    const qui = c.ouvrier_id ? `${c.prenom} ${c.nom}` : (() => { const q = equipes?.find((x) => x.id === c.equipe_id); return q ? (lang === 'nl' ? q.nom_nl : q.nom_fr) : t('planning.equipe'); })();
    const quoi = c.conflits.map((k) => (k === 'trop_charge' && c.capacite_min !== undefined && c.charge_min !== undefined
      ? `${t('planning.conflit.trop_charge')} (${duree(c.charge_min)} ${t('planning.conflit.pour')} ${duree(c.capacite_min)})` : t(`planning.conflit.${k}`))).join(', ');
    return `${qui} : ${quoi}`;
  }).join(' ; ')}`;
}

