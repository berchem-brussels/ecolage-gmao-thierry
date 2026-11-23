/** Fiche d'aide « Journal d'audit » (standard 17.3 ; 0.12.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'journal', path: '/journal', group: 'admin', titleKey: 'nav.journal', roles: ['admin'],
  acces: { admin: true },
  purpose: {
    fr: "Qui a fait quoi, quand, dans quelle entité et par quel canal (écran, assistant, ligne de commande). Le journal se lit et ne se modifie pas.",
    nl: 'Wie deed wat, wanneer, in welke entiteit en via welk kanaal (scherm, assistent, opdrachtregel). Het logboek wordt gelezen en niet gewijzigd.',
  },
  layout: [
    { fr: '[[1]] Les filtres : action ou famille, personne, entité, période, canal ; {{audit.filtre.effacer}}.', nl: '[[1]] De filters: actie of familie, persoon, entiteit, periode, kanaal; {{audit.filtre.effacer}}.' },
    { fr: '[[2]] Les lignes ; le « + » du début montre le détail.', nl: '[[2]] De rijen; de « + » vooraan toont het detail.' },
  ],
  overviewShot: 'journal-overview',
  procedures: [
    {
      title: { fr: 'Retrouver une modification', nl: 'Een wijziging terugvinden' },
      when: { fr: 'Quand vous voulez savoir qui a changé un réglage, un lieu ou une demande.', nl: 'Wanneer u wilt weten wie een instelling, een plaats of een aanvraag wijzigde.' },
      steps: [
        { fr: 'Choisissez l’action ou sa famille, et si besoin la personne, l’entité ou la période.', nl: 'Kies de actie of haar familie, en zo nodig de persoon, de entiteit of de periode.' },
        { fr: 'Cliquez sur « + » au début de la ligne.', nl: 'Klik op « + » vooraan de rij.' },
      ],
      result: { fr: 'Le détail montre seulement les champs changés, « Avant » et « Après », par leur nom ; un lieu ou une catégorie par son code et son nom.', nl: 'Het detail toont enkel de gewijzigde velden, « Voor » en « Na », bij hun naam; een plaats of een categorie bij haar code en naam.' },
    },
    {
      title: { fr: 'Partager une recherche du journal', nl: 'Een zoekopdracht in het logboek delen' },
      when: { fr: 'Pour montrer la même liste à un collègue administrateur.', nl: 'Om dezelfde lijst aan een collega-beheerder te tonen.' },
      steps: [
        { fr: 'Réglez les filtres.', nl: 'Stel de filters in.' },
        { fr: 'Copiez l’adresse de la page : les filtres y sont gardés.', nl: 'Kopieer het adres van de pagina: de filters zijn erin bewaard.' },
      ],
      result: { fr: 'En mode Complet, l’objet et le canal s’ajoutent aux colonnes.', nl: 'In de modus Volledig komen het object en het kanaal bij de kolommen.' },
    },
  ],
  faq: [{ q: { fr: 'Le texte des tickets est-il au journal ?', nl: 'Staat de tekst van de tickets in het logboek?' }, a: { fr: 'Non : le journal dit l’action et l’entité, jamais le contenu d’un ticket.', nl: 'Nee: het logboek vermeldt de actie en de entiteit, nooit de inhoud van een ticket.' } }],
  seeAlso: ['parametres', 'users'],
  shots: [{ id: 'journal-overview', path: '/journal', marks: [{ sel: '.ant-card' }, { sel: '.ant-table' }], caption: { fr: "Journal d'audit", nl: 'Auditlogboek' } }],
};
export default topic;
