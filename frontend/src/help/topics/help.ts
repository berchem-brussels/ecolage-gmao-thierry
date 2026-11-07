/** Fiche d'aide du centre d'aide lui-même (gabarit 1.3.0, adaptée à la FAQ locale par entité ; 0.12.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'help', path: '/help', group: 'aide', titleKey: 'nav.help', roles: ['agent', 'gestionnaire', 'responsable', 'admin'],
  purpose: {
    fr: "Le mode d'emploi complet : une fiche par écran, les questions fréquentes, les nouveautés et les contacts. La fiche de l'écran où vous êtes s'ouvre aussi par le bouton {{help.button}} en haut de chaque page.",
    nl: 'De volledige handleiding: een fiche per scherm, de veelgestelde vragen, de nieuwigheden en de contacten. De fiche van het scherm waar u bent, opent ook via de knop {{help.button}} bovenaan elke pagina.',
  },
  layout: [
    { fr: '[[1]] La recherche dans toutes les fiches et toutes les questions.', nl: '[[1]] Zoeken in alle fiches en alle vragen.' },
    { fr: '[[2]] Les onglets : {{help.guide}}, {{help.faq}}, {{help.nouveautes}} et {{help.contact}}.', nl: '[[2]] De tabbladen: {{help.guide}}, {{help.faq}}, {{help.nouveautes}} en {{help.contact}}.' },
    { fr: '[[3]] Les fiches, rangées comme le menu ; seules celles des écrans que vous pouvez ouvrir apparaissent.', nl: '[[3]] De fiches, gerangschikt zoals het menu; alleen die van de schermen die u kunt openen, verschijnen.' },
  ],
  overviewShot: 'help-overview',
  procedures: [
    {
      title: { fr: 'Trouver comment faire', nl: 'Vinden hoe iets moet' },
      when: { fr: 'Quand vous ne savez pas où trouver une fonction.', nl: 'Wanneer u niet weet waar een functie staat.' },
      steps: [
        { fr: 'Encodez un mot dans {{help.search}}, avec ou sans accents.', nl: 'Typ een woord in {{help.search}}, met of zonder accenten.' },
        { fr: 'Ouvrez la fiche proposée et suivez la procédure.', nl: 'Open de voorgestelde fiche en volg de procedure.' },
      ],
      result: { fr: 'La procédure dit chaque clic et ce que vous verrez à la fin.', nl: 'De procedure beschrijft elke klik en wat u op het einde ziet.' },
      errors: [{ problem: { fr: 'Rien ne correspond.', nl: 'Niets komt overeen.' }, solution: { fr: 'Essayez un autre mot, ou posez la question par {{tickets.report}}, type « Question métier ».', nl: 'Probeer een ander woord, of stel de vraag via {{tickets.report}}, soort « Functionele vraag ».' } }],
    },
    {
      title: { fr: "Imprimer le mode d'emploi", nl: 'De handleiding afdrukken' },
      when: { fr: 'Pour une formation ou une lecture sur papier.', nl: 'Voor een opleiding of om op papier te lezen.' },
      steps: [
        { fr: 'Cliquez sur {{help.print}} : une page s’ouvre avec tout déplié.', nl: 'Klik op {{help.print}}: een pagina opent met alles uitgeklapt.' },
        { fr: "Choisissez l'imprimante ou l'enregistrement en PDF.", nl: 'Kies de printer of opslaan als pdf.' },
      ],
      result: { fr: 'Les fiches de vos écrans, les questions et les contacts sont imprimés, procédures dépliées.', nl: 'De fiches van uw schermen, de vragen en de contacten worden afgedrukt, met uitgeklapte procedures.' },
    },
    {
      title: { fr: 'Ajouter, corriger ou retirer une question de la FAQ', nl: 'Een vraag van de FAQ toevoegen, verbeteren of intrekken' },
      acces: { ou: [{ admin: true }, { permission: 'faq:gerer' }] },
      when: { fr: 'Quand une même question revient souvent.', nl: 'Wanneer dezelfde vraag vaak terugkomt.' },
      steps: [
        { fr: 'Onglet {{help.faq}}, cliquez sur {{help.faq.add}}.', nl: 'Tabblad {{help.faq}}, klik op {{help.faq.add}}.' },
        { fr: "Choisissez l'écran concerné, encodez la question et la réponse en français et en néerlandais, puis {{common.save}}.", nl: 'Kies het betrokken scherm, vul de vraag en het antwoord in het Frans en in het Nederlands in, en daarna {{common.save}}.' },
        { fr: 'Pour corriger ou retirer, ouvrez la question : {{common.edit}} ou {{faq.remove}} avec un motif ; {{faq.voir_retirees}} permet de la rétablir.', nl: 'Om te verbeteren of in te trekken, opent u de vraag: {{common.edit}} of {{faq.remove}} met een reden; {{faq.voir_retirees}} laat toe ze te herstellen.' },
      ],
      result: { fr: "Le service technique écrit pour son entité active ; l'administrateur aussi pour les deux entités à la fois. Rien n'est supprimé.", nl: 'De technische dienst schrijft voor zijn actieve entiteit; de beheerder ook voor beide entiteiten tegelijk. Niets wordt verwijderd.' },
    },
  ],
  faq: [],
  seeAlso: ['tickets'],
  shots: [{ id: 'help-overview', path: '/help', marks: [{ sel: '.help-search' }, { sel: '.ant-tabs-nav' }, { sel: '.help-topics' }], caption: { fr: "Mode d'emploi", nl: 'Handleiding' } }],
};
export default topic;
