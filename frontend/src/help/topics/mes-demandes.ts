/** Fiche d'aide « Mes demandes » (SUI-01, DEM-04 ; 0.12.0), reprise de l'ancienne rubrique help.guide.mesdemandes. 0.14.0 : ligne du temps, compléter, annuler, avis, rouvrir (SUI-02, SUI-05, SUI-06). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'mes-demandes', path: '/demandes', group: 'demandeur', titleKey: 'nav.demandes', roles: ['agent'],
  acces: { module: 'demandes', entite: true },
  purpose: {
    fr: 'Cet écran montre vos demandes au service technique dans l’entité active : celles que vous avez faites, celles faites pour vous par un collègue, et celles que vous suivez par « Moi aussi ». Les demandes en cours viennent en premier.',
    nl: 'Dit scherm toont uw aanvragen aan de technische dienst in de actieve entiteit: die u zelf indiende, die een collega voor u indiende, en die u volgt via « Ik ook ». De lopende aanvragen staan bovenaan.',
  },
  layout: [
    { fr: '[[1]] {{demande.filtre}} : {{demande.filtre.ouvertes}}, {{demande.filtre.closes}} ou {{demande.filtre.toutes}}.', nl: '[[1]] {{demande.filtre}}: {{demande.filtre.ouvertes}}, {{demande.filtre.closes}} of {{demande.filtre.toutes}}.' },
    { fr: '[[2]] {{demande.chercher}} : par numéro, mot de la description ou lieu.', nl: '[[2]] {{demande.chercher}}: op nummer, woord uit de beschrijving of plaats.' },
    { fr: '[[3]] La liste : numéro, problème, lieu, état en clair et délai annoncé ; sur téléphone, une carte par demande.', nl: '[[3]] De lijst: nummer, probleem, plaats, status in gewone woorden en aangekondigde termijn; op een telefoon een kaart per aanvraag.' },
  ],
  overviewShot: 'mes-demandes-overview',
  procedures: [
    {
      title: { fr: 'Retrouver une demande et voir où elle en est', nl: 'Een aanvraag terugvinden en zien hoever ze staat' },
      when: { fr: 'Quand vous voulez savoir si votre demande avance.', nl: 'Wanneer u wilt weten of uw aanvraag vordert.' },
      steps: [
        { fr: 'Ouvrez {{nav.demandes}} dans le menu ou sur l’accueil.', nl: 'Open {{nav.demandes}} in het menu of op de startpagina.' },
        { fr: 'Choisissez {{demande.filtre.ouvertes}} ou {{demande.filtre.closes}}, ou tapez un numéro, un mot ou un lieu dans {{demande.chercher}}.', nl: 'Kies {{demande.filtre.ouvertes}} of {{demande.filtre.closes}}, of typ een nummer, een woord of een plaats in {{demande.chercher}}.' },
        { fr: 'Cliquez sur le numéro pour ouvrir la fiche : état, délai annoncé, précisions, photos et documents.', nl: 'Klik op het nummer om de fiche te openen: status, aangekondigde termijn, verduidelijkingen, foto’s en documenten.' },
        { fr: 'Sous la fiche, {{cycle.historique}} montre chaque étape avec sa date : reçue, prise en charge, en attente (avec le motif), travaux terminés, clôturée.', nl: 'Onder de fiche toont {{cycle.historique}} elke stap met de datum: ontvangen, in behandeling, in wacht (met de reden), werken beëindigd, afgesloten.' },
      ],
      result: { fr: 'L’état se lit en clair, par exemple « Reçue par le service technique », avec la date limite annoncée et les explications du service technique.', nl: 'De status staat in gewone woorden, bijvoorbeeld « Ontvangen door de technische dienst », met de aangekondigde uiterste datum en de uitleg van de technische dienst.' },
      shots: ['mes-demandes-fiche'],
    },
    // 0.14.0 (étape 9, point 7) : compléter, annuler, avis, rouvrir.
    {
      title: { fr: 'Compléter ma demande', nl: 'Mijn aanvraag aanvullen' },
      when: { fr: 'Quand vous avez oublié une précision ou une photo, ou que le service technique vous en demande une.', nl: 'Wanneer u een verduidelijking of een foto vergat, of de technische dienst er een vraagt.' },
      steps: [
        { fr: 'Ouvrez la fiche et cliquez sur {{demandeur.completer}}.', nl: 'Open de fiche en klik op {{demandeur.completer}}.' },
        { fr: 'Écrivez la précision ; ajoutez au besoin une photo ou un document (ils partent aussitôt).', nl: 'Schrijf de verduidelijking; voeg zo nodig een foto of een document toe (ze vertrekken meteen).' },
        { fr: 'Cliquez sur {{demandeur.completer.envoyer}}.', nl: 'Klik op {{demandeur.completer.envoyer}}.' },
      ],
      result: { fr: 'Le complément apparaît sous {{demande.champ.complements}}, avec sa date ; votre description de départ ne change pas.', nl: 'De aanvulling verschijnt onder {{demande.champ.complements}}, met de datum; uw oorspronkelijke beschrijving verandert niet.' },
      errors: [{ problem: { fr: 'Le bouton {{demandeur.completer}} n’apparaît pas.', nl: 'De knop {{demandeur.completer}} verschijnt niet.' }, solution: { fr: 'La demande est fermée (clôturée, refusée ou annulée) : faites une nouvelle demande.', nl: 'De aanvraag is gesloten (afgesloten, geweigerd of geannuleerd): dien een nieuwe aanvraag in.' } }],
    },
    {
      title: { fr: 'Annuler ma demande', nl: 'Mijn aanvraag annuleren' },
      when: { fr: 'Quand le problème a disparu ou que la demande était une erreur.', nl: 'Wanneer het probleem verdwenen is of de aanvraag een vergissing was.' },
      steps: [
        { fr: 'Ouvrez la fiche et cliquez sur {{demandeur.annuler}}.', nl: 'Open de fiche en klik op {{demandeur.annuler}}.' },
        { fr: 'Dites pourquoi, puis cliquez de nouveau sur {{demandeur.annuler}}.', nl: 'Zeg waarom, en klik opnieuw op {{demandeur.annuler}}.' },
      ],
      result: { fr: 'La demande reste dans votre liste avec l’état « Annulée » ; le service technique lit votre motif.', nl: 'De aanvraag blijft in uw lijst met de status « Geannuleerd »; de technische dienst leest uw reden.' },
      errors: [{ problem: { fr: 'Le bouton {{demandeur.annuler}} n’apparaît pas.', nl: 'De knop {{demandeur.annuler}} verschijnt niet.' }, solution: { fr: 'Les travaux ont commencé : prévenez le service technique (téléphone dans l’onglet {{help.contact}} de l’aide).', nl: 'De werken zijn begonnen: verwittig de technische dienst (telefoon in het tabblad {{help.contact}} van de hulp).' } }],
    },
    {
      title: { fr: 'Donner mon avis ou rouvrir la demande', nl: 'Mijn beoordeling geven of de aanvraag heropenen' },
      when: { fr: 'Quand la demande est clôturée.', nl: 'Wanneer de aanvraag afgesloten is.' },
      steps: [
        { fr: 'Ouvrez la fiche : sous {{avis.titre}}, choisissez une réponse de « Très insatisfait » à « Très satisfait », ajoutez un commentaire si vous le souhaitez, puis {{avis.envoyer}}.', nl: 'Open de fiche: onder {{avis.titre}} kiest u een antwoord van « Zeer ontevreden » tot « Zeer tevreden », voegt u eventueel een opmerking toe en klikt u op {{avis.envoyer}}.' },
        { fr: 'Si le problème n’est pas réglé, cliquez plutôt sur {{demandeur.reouvrir}}, avant la date indiquée, et dites ce qui ne va pas.', nl: 'Is het probleem niet opgelost, klik dan liever op {{demandeur.reouvrir}}, vóór de vermelde datum, en zeg wat er niet in orde is.' },
      ],
      result: { fr: 'Votre avis aide le service technique ; une demande rouverte lui revient avec vos explications.', nl: 'Uw beoordeling helpt de technische dienst; een heropende aanvraag gaat naar hem terug met uw uitleg.' },
      shots: ['mes-demandes-avis'],
    },
    {
      title: { fr: 'Retirer une photo jointe par erreur', nl: 'Een per vergissing toegevoegde foto verwijderen' },
      when: { fr: 'Quand une photo ne devait pas être jointe à votre demande.', nl: 'Wanneer een foto niet bij uw aanvraag hoorde.' },
      steps: [
        { fr: 'Ouvrez la fiche de la demande.', nl: 'Open de fiche van de aanvraag.' },
        { fr: 'Sous la photo, cliquez sur {{demande.pieces.retirer}} et confirmez.', nl: 'Onder de foto klikt u op {{demande.pieces.retirer}} en bevestigt u.' },
      ],
      result: { fr: 'La pièce est effacée définitivement.', nl: 'Het stuk wordt definitief gewist.' },
      errors: [{ problem: { fr: 'Le bouton {{demande.pieces.retirer}} n’apparaît pas.', nl: 'De knop {{demande.pieces.retirer}} verschijnt niet.' }, solution: { fr: 'Une fois la demande prise en main par le service technique, demandez-lui de retirer la pièce, par {{tickets.report}}.', nl: 'Zodra de technische dienst de aanvraag behandelt, vraagt u hem het stuk te verwijderen, via {{tickets.report}}.' } }],
    },
  ],
  faq: [
    { q: { fr: 'Pourquoi une demande que je n’ai pas faite est-elle dans ma liste ?', nl: 'Waarom staat er een aanvraag in mijn lijst die ik niet indiende?' }, a: { fr: 'Elle a été faite pour vous par un collègue ({{demande.pour_moi.tag}}), ou vous la suivez par « Moi aussi » ({{demande.suivie.tag}}).', nl: 'Een collega diende ze voor u in ({{demande.pour_moi.tag}}), of u volgt ze via « Ik ook » ({{demande.suivie.tag}}).' } },
    { q: { fr: 'Je ne vois pas mes demandes de l’autre entité.', nl: 'Ik zie mijn aanvragen van de andere entiteit niet.' }, a: { fr: 'La liste suit l’entité active : changez d’entité dans l’en-tête.', nl: 'De lijst volgt de actieve entiteit: wissel van entiteit in de kop.' } },
    { q: { fr: 'Jusqu’à quand puis-je rouvrir une demande clôturée ?', nl: 'Tot wanneer kan ik een afgesloten aanvraag heropenen?' }, a: { fr: 'Pendant le délai fixé par votre entité (7 jours par défaut) : la fiche dit la date limite. Après, faites une nouvelle demande.', nl: 'Tijdens de termijn die uw entiteit vastlegt (standaard 7 dagen): de fiche vermeldt de uiterste datum. Daarna dient u een nieuwe aanvraag in.' } },
    { q: { fr: 'Ma demande est « En attente » : que dois-je faire ?', nl: 'Mijn aanvraag staat « In wacht »: wat moet ik doen?' }, a: { fr: 'La ligne du temps dit pourquoi. Si le service technique attend une réponse de votre part, utilisez {{demandeur.completer}}.', nl: 'De tijdlijn zegt waarom. Wacht de technische dienst op een antwoord van u, gebruik dan {{demandeur.completer}}.' } },
  ],
  seeAlso: ['nouvelle-demande', 'accueil'],
  shots: [
    { id: 'mes-demandes-overview', path: '/demandes', marks: [{ sel: '.ant-segmented' }, { sel: '.ant-input-search' }, { sel: '.ant-table, .ant-list' }], caption: { fr: 'Mes demandes', nl: 'Mijn aanvragen' } },
    { id: 'mes-demandes-fiche', path: '/demandes', actions: [{ clickSel: '.ant-table-row .ant-btn-link' }, { wait: 800 }], clip: 'drawer', caption: { fr: 'Fiche d’une demande et ses boutons', nl: 'Fiche van een aanvraag en haar knoppen' } },
    { id: 'mes-demandes-avis', path: '/demandes', actions: [{ clickSel: '.dem-close .ant-btn-link' }, { wait: 800 }], clip: 'drawer', caption: { fr: 'Avis et réouverture d’une demande clôturée', nl: 'Beoordeling en heropening van een afgesloten aanvraag' } },
  ],
};
export default topic;
