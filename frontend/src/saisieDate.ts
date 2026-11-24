import type { KeyboardEvent } from 'react';
import type { Dayjs } from 'dayjs';

/**
 * Champs de date et d'heure (0.21.0, point 0, R1 de la recette de la 0.20.0, DV-164).
 * Défaut constaté : dans l'affectation d'une tâche, le champ date était en lecture seule partout (`inputReadOnly`) ; sur un
 * PC, une date tapée au clavier était ignorée et Entrée envoyait le formulaire sans la date (« Affectation enregistrée »).
 * Règle commune à tout champ de date ou d'heure placé dans un formulaire :
 * - lecture seule seulement sur un écran tactile (le calendrier suffit et le clavier du téléphone ne s'ouvre pas) ; au
 *   clavier d'un PC, la date se tape au format affiché ;
 * - Entrée dans le champ n'envoie jamais le formulaire : le composant retient d'abord une date tapée valide (rc-picker la
 *   valide avant d'appeler onKeyDown), puis l'envoi natif du formulaire est empêché ; on enregistre par le bouton.
 *
 * 0.21.1 (anomalie de la recette de la 0.21.0, DV-173) : le composant de date d'Ant Design ne retient le texte tapé qu'à
 * Entrée ou quand le champ perd le focus. Un bouton activé sans que le champ perde d'abord le focus (clic piloté par la
 * page, assistance, certains claviers virtuels) envoyait donc l'ancienne valeur alors que l'écran montrait la nouvelle :
 * « Terminer la tâche » a enregistré une fin à l'heure préremplie au lieu de l'heure tapée. La perte du focus ne suffit
 * pas : rc-picker ne retient le texte que deux images plus tard, après la lecture des valeurs par le bouton. Règle ajoutée
 * pour toute l'application : avant tout clic et tout envoi de formulaire venus d'ailleurs que du champ, le champ de date
 * ou d'heure qui a encore le focus reçoit Entrée, que rc-picker traite tout de suite (texte valide retenu, texte invalide
 * ignoré puis remis à la dernière valeur retenue à la sortie du champ), puis perd le focus. Ce qui est envoyé est donc
 * ce qui est affiché. L'Entrée simulée n'est pas une frappe réelle : elle n'envoie jamais un formulaire.
 * Un texte que rc-picker refuse (format faux, date interdite) n'est pas retenu : le composant garde l'ancienne valeur et
 * remet l'ancien texte deux images plus tard. Le formulaire qui enregistre des heures vérifie donc, avant l'envoi, que le
 * texte affiché au moment du clic est bien la valeur retenue (texteNonRetenu) ; sinon rien ne part et le champ le dit.
 *
 * 0.21.2 (recette de la 0.21.1 sur NIXUS, DV-177) : un vrai clic de souris fait perdre le focus au champ dès l'appui du
 * bouton, avant l'événement « click » ; la règle ne s'appliquait donc qu'aux clics pilotés. Le premier clic sur
 * « Terminer » partait avec l'ancienne valeur, était refusé en silence, puis la valeur tapée arrivait : il fallait cliquer
 * deux fois. La règle s'applique maintenant dès l'appui (pointerdown, mousedown). Le calendrier ne s'affiche plus de
 * lui-même sur PC (components/ChampDate.tsx).
 */
export function ecranTactile(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

export function entreeSansEnvoi(e: KeyboardEvent): void {
  if (e.key === 'Enter') e.preventDefault();
}

/** Champ de date ou d'heure d'Ant Design (rc-picker) qui a le focus, s'il y en a un. */
export function champDateActif(doc: Document = document): HTMLInputElement | null {
  const a = doc.activeElement;
  return a instanceof HTMLInputElement && a.closest('.ant-picker') ? a : null;
}

/**
 * Avant un clic ou un envoi venu d'ailleurs que du champ lui-même (ni le champ, ni son calendrier ouvert), le champ de
 * date ou d'heure actif reçoit Entrée (rc-picker retient le texte tapé s'il est valide, de façon synchrone), puis perd
 * le focus, avant que le bouton ou le formulaire ne lise les valeurs.
 */
export function retenirSaisieAvant(e: Event): void {
  const doc = e.target instanceof Node && e.target.ownerDocument ? e.target.ownerDocument : document;
  const champ = champDateActif(doc);
  if (!champ) return;
  const cible = e.target instanceof Element ? e.target : null;
  if (cible && (champ.closest('.ant-picker')?.contains(cible) || cible.closest('.ant-picker-dropdown'))) return;
  textes.set(champ, { texte: champ.value, quand: Date.now() });
  const Clavier = doc.defaultView?.KeyboardEvent ?? KeyboardEvent;
  champ.dispatchEvent(new Clavier('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
  champ.blur();
}

/** Texte de chaque champ au moment du dernier clic ou envoi (avant qu'un texte refusé ne soit remis à l'ancien). */
const textes = new WeakMap<HTMLInputElement, { texte: string; quand: number }>();

/** Texte affiché d'un champ (par son id) au moment du clic qui envoie, sinon son texte actuel ; null s'il n'existe pas. */
export function texteAffiche(id: string, doc: Document = document): string | null {
  const el = doc.getElementById(id);
  if (!(el instanceof HTMLInputElement)) return null;
  const garde = textes.get(el);
  return garde && Date.now() - garde.quand < 2000 ? garde.texte : el.value;
}

/** Vrai quand le champ montrait un texte que le composant n'a pas retenu (autre que la valeur envoyée). */
export function texteNonRetenu(id: string, valeur: Dayjs | null | undefined, format: string, doc: Document = document): boolean {
  const texte = (texteAffiche(id, doc) ?? '').trim();
  if (!texte) return false;
  return !valeur || valeur.format(format) !== texte;
}

let installe = false;
/** Pose la règle pour toute l'application (au démarrage, une seule fois). Écoute en capture, avant React. */
export function installerSaisieDate(doc: Document = document): void {
  if (installe && doc === document) return;
  if (doc === document) installe = true;
  // 0.21.2 (DV-177) : dès l'appui (pointerdown, mousedown), avant que le champ ne perde le focus ; le clic et l'envoi
  // restent pour un clic piloté par la page ou l'assistance, sans appui.
  for (const ev of ['pointerdown', 'mousedown', 'click', 'submit']) doc.addEventListener(ev, retenirSaisieAvant, true);
}
