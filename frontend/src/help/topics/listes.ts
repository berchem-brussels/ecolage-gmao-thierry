/** Fiche d'aide « Listes de valeurs » (ADM-03 ; 0.12.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'listes', path: '/listes', group: 'service', titleKey: 'nav.listes', roles: ['responsable'],
  acces: { permission: 'listes:gerer' },
  purpose: {
    fr: "Les listes de choix propres à l'entité active, par exemple les types de lieux. Le responsable du service technique les adapte sans livraison.",
    nl: 'De keuzelijsten eigen aan de actieve entiteit, bijvoorbeeld de soorten plaatsen. De verantwoordelijke van de technische dienst past ze aan zonder levering.',
  },
  layout: [
    { fr: '[[1]] Le choix de la liste.', nl: '[[1]] De keuze van de lijst.' },
    { fr: '[[2]] Les valeurs, actives puis désactivées ; un clic ouvre la fiche.', nl: '[[2]] De waarden, actieve en daarna gedeactiveerde; een klik opent de fiche.' },
  ],
  overviewShot: 'listes-overview',
  procedures: [
    {
      title: { fr: 'Ajouter une valeur', nl: 'Een waarde toevoegen' },
      when: { fr: 'Quand un choix manque dans un écran, par exemple un type de local.', nl: 'Wanneer een keuze ontbreekt in een scherm, bijvoorbeeld een soort lokaal.' },
      steps: [
        { fr: 'Choisissez la liste et cliquez sur {{common.create}}.', nl: 'Kies de lijst en klik op {{common.create}}.' },
        { fr: 'Encodez le libellé en français et en néerlandais ; l’ordre et le code sont facultatifs.', nl: 'Vul het label in het Frans en het Nederlands in; de volgorde en de code zijn facultatief.' },
      ],
      result: { fr: 'La valeur est proposée tout de suite dans les écrans de l’entité.', nl: 'De waarde wordt meteen voorgesteld in de schermen van de entiteit.' },
    },
    {
      title: { fr: 'Retirer une valeur', nl: 'Een waarde intrekken' },
      when: { fr: 'Quand un choix ne doit plus être proposé.', nl: 'Wanneer een keuze niet meer voorgesteld mag worden.' },
      steps: [
        { fr: 'Ouvrez la valeur, donnez un motif et cliquez sur {{listes.deactivate}}.', nl: 'Open de waarde, geef een reden en klik op {{listes.deactivate}}.' },
      ],
      result: { fr: 'Elle n’est plus proposée ; les lieux qui la portent la gardent. Elle peut être réactivée.', nl: 'Ze wordt niet meer voorgesteld; de plaatsen die ze dragen, behouden ze. Ze kan opnieuw geactiveerd worden.' },
    },
  ],
  faq: [],
  seeAlso: ['patrimoine', 'referentiel'],
  shots: [{ id: 'listes-overview', path: '/listes', marks: [{ sel: '.ant-select' }, { sel: '.ant-table' }], caption: { fr: 'Listes de valeurs', nl: 'Waardelijsten' } }],
};
export default topic;
