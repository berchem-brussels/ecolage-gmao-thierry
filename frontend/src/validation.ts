/**
 * Règles communes des champs obligatoires (version 0.5.1, recette du 26/10/2026).
 *
 * Un champ obligatoire vide, ou fait seulement d'espaces, montre « Ce champ est obligatoire » sous le champ, avant
 * l'envoi, dans tous les formulaires. Le serveur continue de refuser ces valeurs (DV-37) : ces règles évitent
 * seulement le message vague « Données invalides ».
 *
 * - texteObligatoire : champ de texte (libellé, nom, code, adresse électronique) ; les espaces seuls sont refusés.
 * - obligatoire : choix, nombre, date et mot de passe ; un mot de passe garde ses espaces (DV-37), il n'est donc
 *   refusé que vide. Pour un nombre ou une date, async-validator n'accepte pas le contrôle des espaces.
 * - courriel (0.5.2) : adresse e-mail mal formée, « Adresse e-mail non valide ». Le champ porte validateFirst : vide ou
 *   fait d'espaces, il ne montre que « Ce champ est obligatoire », jamais en plus le message d'Ant Design sur le type email.
 * - seulementEspaces : pour les champs hors formulaire Ant Design (motifs de désactivation, description d'une demande).
 */
import type { Rule } from 'antd/es/form';

type Traduire = (cle: string) => string;

export const texteObligatoire = (t: Traduire): Rule => ({ required: true, whitespace: true, message: t('form.obligatoire') });

export const obligatoire = (t: Traduire): Rule => ({ required: true, message: t('form.obligatoire') });

export const courriel = (t: Traduire): Rule => ({ type: 'email', message: t('form.courriel') });

/** Vrai quand quelque chose a été tapé, mais seulement des espaces (y compris retours à la ligne et tabulations). */
export const seulementEspaces = (v: string | null | undefined): boolean => !!v && v.trim() === '';
