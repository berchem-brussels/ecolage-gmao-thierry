import type { KeyboardEvent } from 'react';

/**
 * Champs de date et d'heure (0.21.0, point 0, R1 de la recette de la 0.20.0, DV-164).
 * Défaut constaté : dans l'affectation d'une tâche, le champ date était en lecture seule partout (`inputReadOnly`) ; sur un
 * PC, une date tapée au clavier était ignorée et Entrée envoyait le formulaire sans la date (« Affectation enregistrée »).
 * Règle commune à tout champ de date ou d'heure placé dans un formulaire :
 * - lecture seule seulement sur un écran tactile (le calendrier suffit et le clavier du téléphone ne s'ouvre pas) ; au
 *   clavier d'un PC, la date se tape au format affiché ;
 * - Entrée dans le champ n'envoie jamais le formulaire : le composant retient d'abord une date tapée valide (rc-picker la
 *   valide avant d'appeler onKeyDown), puis l'envoi natif du formulaire est empêché ; on enregistre par le bouton.
 */
export function ecranTactile(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

export function entreeSansEnvoi(e: KeyboardEvent): void {
  if (e.key === 'Enter') e.preventDefault();
}

/** Propriétés à étaler sur un DatePicker ou un TimePicker d'un formulaire. */
export function saisieDate(): { inputReadOnly: boolean; onKeyDown: (e: KeyboardEvent) => void } {
  return { inputReadOnly: ecranTactile(), onKeyDown: entreeSansEnvoi };
}
