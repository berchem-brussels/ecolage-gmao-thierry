/** Fiche d'aide « Nouvelle demande » (DEM-01 à DEM-16 ; 0.12.0), reprise de l'ancienne rubrique help.guide.demande. */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'nouvelle-demande', path: '/demandes/nouvelle', group: 'demandeur', titleKey: 'nav.demande.nouvelle', roles: ['agent'],
  acces: { module: 'demandes', entite: true },
  purpose: {
    fr: "Cet écran sert à signaler au service technique un problème dans un bâtiment ou sur un équipement : une lampe, une fuite, une porte, un chauffage. Trois étapes : où, quoi, et quelques mots. La demande part au service technique de l'entité active, qui choisit lui-même l'ouvrier.",
    nl: 'Dit scherm dient om de technische dienst een probleem in een gebouw of aan een uitrusting te melden: een lamp, een lek, een deur, een verwarming. Drie stappen: waar, wat, en enkele woorden. De aanvraag gaat naar de technische dienst van de actieve entiteit, die zelf de arbeider kiest.',
  },
  layout: [
    { fr: '[[1]] {{demande.ou.title}} le lieu, déjà proposé : votre lieu de travail ou celui de votre dernière demande.', nl: '[[1]] {{demande.ou.title}} de plaats, al voorgesteld: uw werkplek of die van uw laatste aanvraag.' },
    { fr: '[[2]] {{demande.quoi.title}} une tuile par domaine, puis une par problème.', nl: '[[2]] {{demande.quoi.title}} een tegel per domein, daarna een per probleem.' },
    { fr: '[[3]] {{demande.description.title}} quelques mots, et des photos si elles aident.', nl: '[[3]] {{demande.description.title}} enkele woorden, en foto’s als ze helpen.' },
    { fr: 'En bas, le bouton {{demande.envoyer}}, avec ce qui manque encore s’il est grisé.', nl: 'Onderaan de knop {{demande.envoyer}}, met wat nog ontbreekt als hij grijs is.' },
  ],
  overviewShot: 'demande-overview',
  procedures: [
    {
      title: { fr: 'Faire une demande', nl: 'Een aanvraag indienen' },
      when: { fr: 'Quand quelque chose est en panne ou abîmé dans un bâtiment de votre entité.', nl: 'Wanneer iets defect of beschadigd is in een gebouw van uw entiteit.' },
      steps: [
        { fr: 'Cliquez sur {{nav.demande.nouvelle}}, en haut de chaque écran ou sur l’accueil.', nl: 'Klik op {{nav.demande.nouvelle}}, bovenaan elk scherm of op de startpagina.' },
        { fr: 'Où ? Gardez le lieu proposé, ou cliquez sur {{demande.lieu.changer}} : choisissez dans {{demande.lieu.recents}}, tapez quelques mots du bâtiment ou de la salle (en français ou en néerlandais, avec ou sans accents), ou {{demande.lieu.arbre}}.', nl: 'Waar? Behoud de voorgestelde plaats, of klik op {{demande.lieu.changer}}: kies in {{demande.lieu.recents}}, typ enkele woorden van het gebouw of de zaal (in het Frans of het Nederlands, met of zonder accenten), of {{demande.lieu.arbre}}.' },
        { fr: 'Quoi ? Touchez la tuile du domaine, puis celle du problème ; répondez, si vous savez, aux questions qui apparaissent dessous.', nl: 'Wat? Tik op de tegel van het domein, daarna op die van het probleem; beantwoord, als u het weet, de vragen die eronder verschijnen.' },
        { fr: 'Décrivez le problème en quelques mots, 10 caractères au moins, dans votre langue, sans nom ni donnée personnelle sur une autre personne.', nl: 'Beschrijf het probleem in enkele woorden, minstens 10 tekens, in uw taal, zonder naam of persoonsgegevens over een andere persoon.' },
        { fr: 'Cliquez sur {{demande.envoyer}}.', nl: 'Klik op {{demande.envoyer}}.' },
      ],
      result: { fr: "L'écran donne votre numéro, par exemple AC-DI-2026-00001, et le délai indicatif. Vous suivez la demande dans {{nav.demandes}}.", nl: 'Het scherm geeft uw nummer, bijvoorbeeld AC-DI-2026-00001, en de indicatieve termijn. U volgt de aanvraag op in {{nav.demandes}}.' },
      errors: [
        { problem: { fr: 'Le bouton {{demande.envoyer}} est grisé.', nl: 'De knop {{demande.envoyer}} is grijs.' }, solution: { fr: 'Lisez {{demande.manque}} juste au-dessus : il manque le lieu, le type de problème, une réponse obligatoire ou une description assez longue.', nl: 'Lees {{demande.manque}} er net boven: de plaats, het soort probleem, een verplicht antwoord of een lang genoeg beschrijving ontbreekt.' } },
        { problem: { fr: 'Le lieu est introuvable.', nl: 'De plaats is niet te vinden.' }, solution: { fr: 'Essayez le nom du bâtiment seul, ou {{demande.lieu.arbre}} ; pour plusieurs salles d’un même bâtiment, choisissez le bâtiment et citez les salles dans la description.', nl: 'Probeer enkel de naam van het gebouw, of {{demande.lieu.arbre}}; voor meerdere zalen van eenzelfde gebouw kiest u het gebouw en noemt u de zalen in de beschrijving.' } },
      ],
    },
    {
      title: { fr: 'Signaler un danger', nl: 'Een gevaar melden' },
      when: { fr: 'Quand des personnes ou des biens sont en danger : câble à nu, odeur de gaz, fuite importante, vitre cassée.', nl: 'Wanneer personen of goederen in gevaar zijn: blootliggende kabel, gasgeur, groot lek, gebroken ruit.' },
      steps: [
        { fr: 'Cochez d’abord {{demande.danger.case}} : le numéro à appeler s’affiche.', nl: 'Vink eerst {{demande.danger.case}} aan: het nummer om te bellen verschijnt.' },
        { fr: 'Appelez ce numéro tout de suite.', nl: 'Bel dat nummer meteen.' },
        { fr: 'Finissez ensuite la demande et cliquez sur {{demande.envoyer}}.', nl: 'Vervolledig daarna de aanvraag en klik op {{demande.envoyer}}.' },
      ],
      result: { fr: 'La demande est traitée en priorité absolue (P1), comptée en heures, jour et nuit.', nl: 'De aanvraag wordt met absolute voorrang behandeld (P1), geteld in uren, dag en nacht.' },
    },
    {
      title: { fr: 'Le même problème est déjà signalé : « Moi aussi »', nl: 'Hetzelfde probleem is al gemeld: « Ik ook »' },
      when: { fr: 'Quand, sous le lieu choisi, des demandes déjà ouvertes dans le même bâtiment apparaissent.', nl: 'Wanneer onder de gekozen plaats al open aanvragen in hetzelfde gebouw verschijnen.' },
      steps: [
        { fr: 'Lisez les demandes proposées ; {{demande.voisines.voir}} en montre le détail.', nl: 'Lees de voorgestelde aanvragen; {{demande.voisines.voir}} toont het detail.' },
        { fr: 'Si votre problème y est, cliquez sur {{demande.voisines.moiaussi}} et confirmez.', nl: 'Als uw probleem erbij staat, klik op {{demande.voisines.moiaussi}} en bevestig.' },
      ],
      result: { fr: 'Aucune nouvelle demande n’est créée : vous suivez celle-là dans {{nav.demandes}}. Le texte déjà tapé est joint pour le service technique.', nl: 'Er wordt geen nieuwe aanvraag aangemaakt: u volgt die aanvraag in {{nav.demandes}}. De al getypte tekst wordt toegevoegd voor de technische dienst.' },
    },
    {
      title: { fr: 'Joindre une photo ou un document', nl: 'Een foto of een document toevoegen' },
      when: { fr: 'Quand une photo aide à comprendre ou à trouver l’endroit.', nl: 'Wanneer een foto helpt om het te begrijpen of de plek te vinden.' },
      steps: [
        { fr: 'Cliquez sur {{demande.pieces.ajouter}} : sur téléphone, prenez la photo ou choisissez-la dans la galerie ; un devis ou un plan en PDF passe aussi.', nl: 'Klik op {{demande.pieces.ajouter}}: op een telefoon neemt u de foto of kiest u ze in de galerij; een offerte of een plan in pdf kan ook.' },
        { fr: 'Ne photographiez ni personne, ni plaque d’immatriculation lisible, ni caméra ou alarme.', nl: 'Fotografeer geen personen, geen leesbare nummerplaat, geen camera of alarm.' },
        { fr: '{{demande.pieces.retirer}} efface une pièce jointe par erreur.', nl: '{{demande.pieces.retirer}} wist een per vergissing toegevoegd stuk.' },
      ],
      result: { fr: 'Cinq pièces au plus, sauf autre réglage de votre entité ; les photos sont réduites et débarrassées de leurs informations cachées avant l’envoi.', nl: 'Hoogstens vijf stukken, tenzij uw entiteit anders instelde; de foto’s worden verkleind en ontdaan van hun verborgen informatie voor het verzenden.' },
    },
    {
      title: { fr: 'Demander pour un collègue, donner une date, reprendre un brouillon', nl: 'Aanvragen voor een collega, een datum geven, een kladversie hernemen' },
      when: { fr: 'Quand la demande n’est pas pour vous, quand un moment compte, ou quand vous revenez sur une demande commencée.', nl: 'Wanneer de aanvraag niet voor u is, wanneer een moment belangrijk is, of wanneer u terugkomt op een begonnen aanvraag.' },
      steps: [
        { fr: '{{demande.pour.lien}} : un collègue (il suivra la demande) ou un service ou une personne sans compte.', nl: '{{demande.pour.lien}}: een collega (hij volgt de aanvraag op) of een dienst of persoon zonder account.' },
        { fr: '{{demande.quand.lien}} : une date souhaitée ou un moment à respecter ; le délai annoncé reste celui de la priorité.', nl: '{{demande.quand.lien}}: een gewenste datum of een moment om te respecteren; de aangekondigde termijn blijft die van de prioriteit.' },
        { fr: 'Le formulaire est gardé si vous le quittez avant l’envoi, photos comprises : en revenant, {{demande.brouillon.reprendre}} ou {{demande.brouillon.zero}}.', nl: 'Het formulier wordt bewaard als u het verlaat voor het verzenden, foto’s inbegrepen: bij terugkomst {{demande.brouillon.reprendre}} of {{demande.brouillon.zero}}.' },
      ],
      result: { fr: '{{demande.brouillon.zero}} efface aussi les photos déjà ajoutées.', nl: '{{demande.brouillon.zero}} wist ook de al toegevoegde foto’s.' },
    },
  ],
  faq: [
    { q: { fr: 'Puis-je choisir l’ouvrier ?', nl: 'Kan ik de arbeider kiezen?' }, a: { fr: 'Non : le service technique choisit l’ouvrier et le corps de métier.', nl: 'Nee: de technische dienst kiest de arbeider en het vakgebied.' } },
    { q: { fr: 'Que deviennent mes données ?', nl: 'Wat gebeurt er met mijn gegevens?' }, a: { fr: '{{demande.rgpd.plus}}, au-dessus du bouton d’envoi, explique l’usage de vos données ; le texte complet est dans l’aide, {{help.guide.rgpd.titre}}.', nl: '{{demande.rgpd.plus}}, boven de verzendknop, legt het gebruik van uw gegevens uit; de volledige tekst staat in de hulp, {{help.guide.rgpd.titre}}.' } },
  ],
  seeAlso: ['mes-demandes', 'accueil'],
  shots: [
    { id: 'demande-overview', path: '/demandes/nouvelle', marks: [{ sel: '.ant-card:has(#dem-ou)' }, { sel: '.ant-card:has(#dem-quoi)' }, { sel: '.ant-card:has(textarea)' }], caption: { fr: 'Nouvelle demande : où, quoi, description', nl: 'Nieuwe aanvraag: waar, wat, beschrijving' } },
  ],
};
export default topic;
