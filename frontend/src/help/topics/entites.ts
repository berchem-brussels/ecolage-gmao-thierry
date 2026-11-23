/** Fiche d'aide « Entités » (ADM-04, NUM-01 ; 0.12.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'entites', path: '/entites', group: 'admin', titleKey: 'nav.entites', roles: ['admin'],
  acces: { admin: true },
  purpose: {
    fr: "Les entités servies par l'application, par exemple l'administration communale (AC) et le CPAS. Chacune a ses registres, sa numérotation et ses réglages ; les données d'une entité ne se voient jamais depuis l'autre.",
    nl: 'De entiteiten die de toepassing bedient, bijvoorbeeld het gemeentebestuur (AC) en het OCMW. Elk heeft eigen registers, nummering en instellingen; de gegevens van een entiteit zijn nooit zichtbaar vanuit de andere.',
  },
  layout: [
    { fr: '[[1]] Le bouton {{common.create}}.', nl: '[[1]] De knop {{common.create}}.' },
    { fr: '[[2]] La liste des entités ; un clic ouvre la fiche.', nl: '[[2]] De lijst van de entiteiten; een klik opent de fiche.' },
  ],
  overviewShot: 'entites-overview',
  procedures: [
    {
      title: { fr: 'Créer une entité', nl: 'Een entiteit aanmaken' },
      when: { fr: 'Quand une nouvelle institution rejoint l’application.', nl: 'Wanneer een nieuwe instelling bij de toepassing komt.' },
      steps: [
        { fr: 'Cliquez sur {{common.create}}.', nl: 'Klik op {{common.create}}.' },
        { fr: 'Donnez un code court en majuscules (il préfixe les numéros des demandes) et le nom en français et en néerlandais.', nl: 'Geef een korte code in hoofdletters (hij staat voor de nummers van de aanvragen) en de naam in het Frans en het Nederlands.' },
      ],
      result: { fr: 'L’entité reçoit les catégories, priorités et calendrier livrés ; donnez ensuite des rôles à ses personnes dans {{nav.users}}.', nl: 'De entiteit krijgt de geleverde categorieën, prioriteiten en kalender; geef daarna rollen aan haar personen in {{nav.users}}.' },
    },
    {
      title: { fr: 'Modifier ou désactiver une entité', nl: 'Een entiteit wijzigen of deactiveren' },
      when: { fr: 'Quand le nom change, ou quand une entité ne sert plus.', nl: 'Wanneer de naam verandert, of wanneer een entiteit niet meer dient.' },
      steps: [
        { fr: 'Cliquez sur la ligne de l’entité.', nl: 'Klik op de rij van de entiteit.' },
        { fr: 'Changez les noms, ou donnez un motif et cliquez sur {{entites.deactivate}}.', nl: 'Wijzig de namen, of geef een reden en klik op {{entites.deactivate}}.' },
      ],
      result: { fr: 'Une entité désactivée reste en base et peut être réactivée ; ses numéros ne changent pas.', nl: 'Een gedeactiveerde entiteit blijft in de databank en kan opnieuw geactiveerd worden; haar nummers veranderen niet.' },
    },
  ],
  faq: [],
  seeAlso: ['users', 'parametres'],
  shots: [{ id: 'entites-overview', path: '/entites', marks: [{ sel: '.page-header button' }, { sel: '.ant-table' }], caption: { fr: 'Entités', nl: 'Entiteiten' } }],
};
export default topic;
