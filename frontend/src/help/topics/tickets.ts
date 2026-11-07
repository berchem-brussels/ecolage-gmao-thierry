/** Fiche d'aide de l'écran Tickets (gabarit 1.3.0, adaptée aux files par entité de la GMAO, DV-97, DV-107 ; 0.12.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'tickets', path: '/tickets', group: 'demandeur', titleKey: 'nav.tickets', roles: ['agent', 'gestionnaire', 'responsable', 'admin'],
  purpose: {
    fr: "Cet écran sert à signaler un problème de l'application, poser une question sur son usage ou proposer une amélioration, puis à en suivre le traitement. Une question métier est traitée par le service technique de votre entité ; un incident, un bug ou un souhait par l'administrateur de l'application. Pour une panne dans un bâtiment, faites plutôt une {{nav.demande.nouvelle}}.",
    nl: 'Dit scherm dient om een probleem met de toepassing te melden, een vraag over het gebruik te stellen of een verbetering voor te stellen, en de behandeling ervan op te volgen. Een functionele vraag wordt behandeld door de technische dienst van uw entiteit; een incident, een bug of een wens door de beheerder van de toepassing. Voor een defect in een gebouw maakt u beter een {{nav.demande.nouvelle}}.',
  },
  layout: [
    { fr: "[[1]] Le bouton {{tickets.report}} ouvre le formulaire ; il existe aussi dans l'en-tête de chaque écran.", nl: '[[1]] De knop {{tickets.report}} opent het formulier; hij staat ook in de kop van elk scherm.' },
    { fr: '[[2]] Les filtres limitent la liste ; {{tickets.open_only}} est activé par défaut.', nl: '[[2]] De filters beperken de lijst; {{tickets.open_only}} staat standaard aan.' },
    { fr: '[[3]] La liste : un clic sur une ligne ouvre le ticket et son fil d’échanges. Qui traite une file voit aussi les compteurs au-dessus.', nl: '[[3]] De lijst: een klik op een rij opent het ticket en zijn berichten. Wie een wachtrij behandelt, ziet er ook de tellers boven.' },
  ],
  overviewShot: 'tickets-overview',
  procedures: [
    {
      title: { fr: 'Signaler un problème depuis un écran', nl: 'Een probleem melden vanuit een scherm' },
      when: { fr: "Quand un écran ne fonctionne pas comme prévu ou quand vous avez une question sur l'application.", nl: 'Wanneer een scherm niet werkt zoals verwacht of wanneer u een vraag hebt over de toepassing.' },
      steps: [
        { fr: "Restez sur l'écran concerné et cliquez sur {{tickets.report}} en haut de la page : l'écran est joint automatiquement.", nl: 'Blijf op het betrokken scherm en klik bovenaan op {{tickets.report}}: het scherm wordt automatisch toegevoegd.' },
        { fr: 'Choisissez le type, encodez un titre et décrivez ce que vous faisiez.', nl: 'Kies het soort, vul een titel in en beschrijf wat u deed.' },
        { fr: 'Indiquez qui est touché et la gravité, ajoutez une capture si elle aide, puis cliquez sur {{tickets.send}}.', nl: 'Geef aan wie getroffen is en hoe ernstig het is, voeg een schermafbeelding toe als dat helpt, en klik op {{tickets.send}}.' },
      ],
      result: { fr: 'Le ticket reçoit une référence TCK et apparaît dans votre liste.', nl: 'Het ticket krijgt een TCK-referentie en verschijnt in uw lijst.' },
      errors: [{ problem: { fr: "« Cette image ne se lit pas ».", nl: '« Deze afbeelding kan niet gelezen worden ».' }, solution: { fr: "Choisissez une capture d'écran ou une photo en PNG ou en JPEG.", nl: 'Kies een schermafbeelding of een foto in PNG of JPEG.' } }],
      shots: ['tickets-report'],
    },
    {
      title: { fr: 'Suivre son ticket, répondre, le clore ou le rouvrir', nl: 'Zijn ticket opvolgen, antwoorden, afsluiten of heropenen' },
      when: { fr: 'Quand une précision vous est demandée ou quand le ticket est résolu.', nl: 'Wanneer u om een verduidelijking wordt gevraagd of wanneer het ticket opgelost is.' },
      steps: [
        { fr: 'Ouvrez le ticket dans la liste.', nl: 'Open het ticket in de lijst.' },
        { fr: 'Pour répondre, écrivez dans {{tickets.message}} et cliquez sur {{tickets.post}}.', nl: 'Om te antwoorden, schrijft u in {{tickets.message}} en klikt u op {{tickets.post}}.' },
        { fr: 'Ticket résolu : cliquez sur {{tickets.action.close}}, ou sur {{tickets.action.reopen}} avec un motif si le problème revient.', nl: 'Opgelost ticket: klik op {{tickets.action.close}}, of op {{tickets.action.reopen}} met een reden als het probleem terugkomt.' },
      ],
      result: { fr: 'Votre réponse remet le ticket « Pris en charge » ; chaque action est notée dans le fil.', nl: 'Uw antwoord zet het ticket terug op « In behandeling »; elke actie wordt genoteerd in de berichten.' },
    },
    {
      title: { fr: 'Traiter un ticket de sa file', nl: 'Een ticket uit zijn wachtrij behandelen' }, acces: { traitant: true },
      when: { fr: 'Quand un ticket nouveau arrive dans votre file.', nl: 'Wanneer een nieuw ticket in uw wachtrij binnenkomt.' },
      steps: [
        { fr: 'Ouvrez le ticket et cliquez sur {{tickets.action.take}}.', nl: 'Open het ticket en klik op {{tickets.action.take}}.' },
        { fr: "S'il manque une information, cliquez sur {{tickets.action.wait}} et posez votre question.", nl: 'Als er informatie ontbreekt, klik op {{tickets.action.wait}} en stel uw vraag.' },
        { fr: "Une note réservée aux traitants se coche {{tickets.internal}} avant {{tickets.post}}.", nl: 'Een nota enkel voor de behandelaars vinkt u aan als {{tickets.internal}} voor {{tickets.post}}.' },
        { fr: 'Quand le problème est réglé, cliquez sur {{tickets.action.resolve}} et décrivez la solution.', nl: 'Wanneer het probleem opgelost is, klik op {{tickets.action.resolve}} en beschrijf de oplossing.' },
      ],
      result: { fr: 'Le demandeur voit la solution ; il clôt le ticket ou le rouvre avec un motif.', nl: 'De aanvrager ziet de oplossing; hij sluit het ticket of heropent het met een reden.' },
      errors: [{ problem: { fr: 'Le bouton {{common.save}} reste grisé.', nl: 'De knop {{common.save}} blijft grijs.' }, solution: { fr: 'Le motif est obligatoire pour cette action : encodez-le.', nl: 'De reden is verplicht voor deze actie: vul ze in.' } }],
    },
    {
      title: { fr: 'Faire d’une question résolue une entrée de la FAQ', nl: 'Van een opgeloste vraag een item van de FAQ maken' }, acces: { traitant: true },
      when: { fr: 'Quand la réponse à une question métier servira à d’autres agents.', nl: 'Wanneer het antwoord op een functionele vraag andere medewerkers zal helpen.' },
      steps: [
        { fr: 'Ouvrez la question métier résolue ou close et cliquez sur {{faq.depuis_ticket}}.', nl: 'Open de opgeloste of afgesloten functionele vraag en klik op {{faq.depuis_ticket}}.' },
        { fr: "Réécrivez la question et la réponse sans nom ni donnée du demandeur, en français et en néerlandais, et choisissez l'écran concerné.", nl: 'Herschrijf de vraag en het antwoord zonder naam of gegevens van de aanvrager, in het Frans en in het Nederlands, en kies het betrokken scherm.' },
        { fr: 'Cliquez sur {{common.save}}.', nl: 'Klik op {{common.save}}.' },
      ],
      result: { fr: "La question apparaît dans l'aide de votre entité et sur le bouton {{help.button}} de l'écran choisi ; le ticket ne change pas.", nl: 'De vraag verschijnt in de hulp van uw entiteit en via de knop {{help.button}} van het gekozen scherm; het ticket verandert niet.' },
    },
  ],
  faq: [
    { q: { fr: 'Qui voit mon ticket ?', nl: 'Wie ziet mijn ticket?' }, a: { fr: "Vous, et les personnes qui traitent sa file : pour une question métier, le service technique de votre entité ; pour un incident, un bug ou un souhait, l'administrateur de l'application.", nl: 'U, en de personen die de wachtrij behandelen: voor een functionele vraag de technische dienst van uw entiteit; voor een incident, een bug of een wens de beheerder van de toepassing.' } },
    { q: { fr: 'Un ticket se supprime-t-il ?', nl: 'Kan een ticket verwijderd worden?' }, a: { fr: 'Non : il se clôt, ou s’annule avec un motif. Tout reste dans le fil.', nl: 'Nee: het wordt afgesloten, of geannuleerd met een reden. Alles blijft in de berichten.' } },
  ],
  seeAlso: ['help'],
  shots: [
    { id: 'tickets-overview', path: '/tickets', marks: [{ sel: '.page-header-actions button' }, { sel: '.tickets-filters' }, { sel: '.ant-table' }], caption: { fr: 'Liste des tickets', nl: 'Lijst van de tickets' } },
    { id: 'tickets-report', path: '/tickets', actions: [{ click: 'tickets.report' }, { wait: 400 }], clip: 'modal', marks: [{ sel: '.ant-modal .ant-radio-group' }, { sel: '.ant-modal #title' }], caption: { fr: 'Signaler : type, titre, qui est touché, gravité', nl: 'Melden: soort, titel, wie getroffen is, ernst' } },
  ],
};
export default topic;
