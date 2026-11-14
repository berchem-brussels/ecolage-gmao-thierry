/** Fiche d'aide « Demandes à valider » (DEM-15, ROL-04 ; 0.16.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'a-valider', path: '/a-valider', group: 'demandeur', titleKey: 'nav.avalider', roles: ['valideur'],
  acces: { module: 'demandes', permission: 'demandes:valider' },
  purpose: {
    fr: "Les demandes des agents de votre service qui ont besoin de votre accord avant de partir au service technique : aménagement d'un local, déménagement, achat de matériel. Vous les validez ou vous les refusez en disant pourquoi.",
    nl: 'De aanvragen van de medewerkers van uw dienst die uw akkoord nodig hebben voor ze naar de technische dienst gaan: inrichting van een lokaal, verhuizing, aankoop van materiaal. U keurt ze goed of u weigert ze met een reden.',
  },
  layout: [
    { fr: '[[1]] La recherche, par numéro, texte, lieu ou nom du demandeur.', nl: '[[1]] De zoekfunctie, op nummer, tekst, plaats of naam van de aanvrager.' },
    { fr: '[[2]] La liste, la plus ancienne demande en tête ; un clic sur le numéro ouvre la fiche.', nl: '[[2]] De lijst, de oudste aanvraag eerst; een klik op het nummer opent de fiche.' },
  ],
  overviewShot: 'a-valider-overview',
  procedures: [
    {
      title: { fr: 'Valider une demande', nl: 'Een aanvraag goedkeuren' },
      when: { fr: 'Quand vous êtes d’accord que le service technique s’en occupe.', nl: 'Wanneer u akkoord gaat dat de technische dienst ze behandelt.' },
      steps: [
        { fr: 'Ouvrez {{nav.avalider}} (menu ou accueil) et cliquez sur le numéro de la demande.', nl: 'Open {{nav.avalider}} (menu of startpagina) en klik op het nummer van de aanvraag.' },
        { fr: 'Lisez la demande, ses photos et ses réponses.', nl: 'Lees de aanvraag, haar foto’s en haar antwoorden.' },
        { fr: 'Cliquez sur {{cycle.action.valider}} ; ajoutez au besoin un commentaire, que le demandeur lira.', nl: 'Klik op {{cycle.action.valider}}; voeg zo nodig een commentaar toe, die de aanvrager zal lezen.' },
      ],
      result: { fr: 'La demande part au service technique ; ses délais comptent à partir de maintenant. Elle quitte votre liste.', nl: 'De aanvraag gaat naar de technische dienst; haar termijnen tellen vanaf nu. Ze verdwijnt uit uw lijst.' },
      shots: ['a-valider-fiche'],
    },
    {
      title: { fr: 'Refuser une demande', nl: 'Een aanvraag weigeren' },
      when: { fr: 'Quand la demande ne doit pas être faite (budget, autre solution, doublon).', nl: 'Wanneer de aanvraag niet uitgevoerd moet worden (budget, andere oplossing, dubbel).' },
      steps: [
        { fr: 'Ouvrez la demande et cliquez sur {{cycle.action.refusee_validation}}.', nl: 'Open de aanvraag en klik op {{cycle.action.refusee_validation}}.' },
        { fr: 'Écrivez le motif : il est obligatoire et le demandeur le lit.', nl: 'Schrijf de reden: ze is verplicht en de aanvrager leest ze.' },
      ],
      result: { fr: 'La demande est fermée : « Refusée par votre chef de service », avec votre motif. Le service technique ne la reçoit pas.', nl: 'De aanvraag is afgesloten: « Geweigerd door uw diensthoofd », met uw reden. De technische dienst krijgt ze niet.' },
      errors: [{
        problem: { fr: 'Une demande attendue n’est pas dans la liste.', nl: 'Een verwachte aanvraag staat niet in de lijst.' },
        solution: { fr: 'Le demandeur n’est peut-être pas rattaché à votre service, ou vous n’êtes suppléant que pour une autre période. L’administrateur le règle dans {{nav.services}}.', nl: 'De aanvrager is misschien niet aan uw dienst verbonden, of u bent enkel vervanger voor een andere periode. De beheerder regelt dat in {{nav.services}}.' },
      }],
    },
  ],
  faq: [
    {
      q: { fr: 'Qui voit mes demandes à valider pendant mon absence ?', nl: 'Wie ziet mijn goed te keuren aanvragen tijdens mijn afwezigheid?' },
      a: { fr: 'Votre suppléant, pendant la période que l’administrateur a réglée. Vous gardez le droit de valider vous-même.', nl: 'Uw vervanger, tijdens de periode die de beheerder heeft ingesteld. U behoudt het recht om zelf goed te keuren.' },
    },
  ],
  seeAlso: ['mes-demandes'],
  // Le compte administrateur n'est pas chef de service : captures avec le compte de démonstration « valideur ».
  shots: [
    { id: 'a-valider-overview', path: '/a-valider', compte: 'valideur', marks: [{ sel: '.ant-input-search' }, { sel: '.ant-table' }], caption: { fr: 'Demandes à valider', nl: 'Goed te keuren aanvragen' } },
    { id: 'a-valider-fiche', path: '/a-valider', compte: 'valideur', actions: [{ clickSel: '.ant-table-row .ant-btn-link' }, { wait: 800 }], clip: 'drawer', marks: [{ sel: '.ant-drawer .ant-btn-primary' }], caption: { fr: 'Votre décision sur une demande', nl: 'Uw beslissing over een aanvraag' } },
  ],
};
export default topic;
