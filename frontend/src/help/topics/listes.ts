/** Fiche d'aide « Listes de valeurs » (ADM-03 ; 0.12.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'listes', path: '/listes', group: 'service', titleKey: 'nav.listes', roles: ['responsable'],
  acces: { permission: 'listes:gerer' },
  purpose: {
    fr: "Les listes de choix propres à l'entité active : types de lieux, motifs d'attente, motifs de refus et causes de panne. Le responsable du service technique les adapte sans livraison.",
    nl: 'De keuzelijsten eigen aan de actieve entiteit: soorten plaatsen, redenen van wachten, redenen van weigering en oorzaken van defect. De verantwoordelijke van de technische dienst past ze aan zonder levering.',
  },
  layout: [
    { fr: '[[1]] Le choix de la liste, en boutons.', nl: '[[1]] De keuze van de lijst, met knoppen.' },
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
  faq: [
    { q: { fr: 'À quoi servent les motifs et les causes ?', nl: 'Waartoe dienen de redenen en de oorzaken?' }, a: { fr: 'Depuis la 0.14.0, le service technique les choisit quand il met une demande en attente ({{listes.liste.motif_attente}}), la refuse ({{listes.liste.motif_refus}}) ou la clôture ({{listes.liste.cause_panne}}). Ils serviront aux statistiques.', nl: 'Sinds 0.14.0 kiest de technische dienst ze wanneer hij een aanvraag in wacht zet ({{listes.liste.motif_attente}}), weigert ({{listes.liste.motif_refus}}) of afsluit ({{listes.liste.cause_panne}}). Ze zullen dienen voor de statistieken.' } },
  ],
  seeAlso: ['patrimoine', 'referentiel', 'demandes-entite'],
  shots: [{ id: 'listes-overview', path: '/listes', marks: [{ sel: '.ant-radio-group' }, { sel: '.ant-table' }], caption: { fr: 'Listes de valeurs', nl: 'Waardelijsten' } }],
};
export default topic;
