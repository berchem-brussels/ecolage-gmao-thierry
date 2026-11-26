/** Fiche d'aide de l'accueil (ERG-03, ROL-03 ; 0.12.0), avec le profil : lieu de travail, mot de passe, entité active. */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'accueil', path: '/', group: 'demandeur', titleKey: 'nav.home', roles: ['agent', 'gestionnaire', 'responsable', 'admin'],
  purpose: {
    fr: "L'accueil mène en un clic à ce que vous faites le plus : {{nav.demande.nouvelle}} et {{nav.demandes}}, puis vos demandes en cours. Le service technique y voit en plus son tableau de bord. En bas : l'entité pour laquelle vous travaillez et vos rôles.",
    nl: 'De startpagina brengt u met één klik naar wat u het vaakst doet: {{nav.demande.nouvelle}} en {{nav.demandes}}, daarna uw lopende aanvragen. De technische dienst ziet er ook zijn dashboard. Onderaan: de entiteit waarvoor u werkt en uw rollen.',
  },
  layout: [
    { fr: '[[1]] Les deux gros boutons {{nav.demande.nouvelle}} et {{nav.demandes}}.', nl: '[[1]] De twee grote knoppen {{nav.demande.nouvelle}} en {{nav.demandes}}.' },
    { fr: '[[2]] {{home.encours}}, avec {{home.encours.tout}}.', nl: '[[2]] {{home.encours}}, met {{home.encours.tout}}.' },
    { fr: '[[3]] {{home.entite}} et {{home.roles}}.', nl: '[[3]] {{home.entite}} en {{home.roles}}.' },
  ],
  overviewShot: 'accueil-overview',
  procedures: [
    // 0.18.0 (point 5 ; ERG-04) : recherche globale, sur chaque écran.
    {
      title: { fr: 'Retrouver une demande ou un lieu', nl: 'Een aanvraag of een plaats terugvinden' },
      when: { fr: 'Quand vous connaissez un numéro, un lieu ou un mot de la description, depuis n’importe quel écran.', nl: 'Wanneer u een nummer, een plaats of een woord uit de beschrijving kent, vanuit om het even welk scherm.' },
      steps: [
        { fr: 'Cliquez sur la loupe {{recherche.bouton}} en haut de l’écran ; sur un petit téléphone, ouvrez le menu : {{recherche.bouton}} est en tête.', nl: 'Klik op het vergrootglas {{recherche.bouton}} bovenaan het scherm; op een kleine telefoon opent u het menu: {{recherche.bouton}} staat bovenaan.' },
        { fr: 'Tapez au moins 2 caractères : numéro (même partiel), nom du lieu ou mot de la description.', nl: 'Typ minstens 2 tekens: nummer (ook gedeeltelijk), naam van de plaats of woord uit de beschrijving.' },
        { fr: 'Cliquez sur un résultat, ou appuyez sur Entrée pour ouvrir le premier.', nl: 'Klik op een resultaat, of druk op Enter om het eerste te openen.' },
      ],
      result: { fr: 'La fiche s’ouvre dans son écran. Vous ne trouvez que ce que vous voyez déjà : vos demandes, celles de l’entité pour le service technique, les lieux du patrimoine si vous y avez accès.', nl: 'De fiche opent in haar scherm. U vindt alleen wat u al ziet: uw aanvragen, die van de entiteit voor de technische dienst, de plaatsen van het patrimonium als u er toegang toe hebt.' },
      errors: [{ problem: { fr: '{{recherche.vide}}', nl: '{{recherche.vide}}' }, solution: { fr: 'Vérifiez l’entité active en haut de l’écran : la recherche ne porte que sur elle.', nl: 'Controleer de actieve entiteit bovenaan het scherm: het zoeken gebeurt alleen daarin.' } }],
      acces: { entite: true },
      shots: ['accueil-recherche'],
    },
    {
      title: { fr: 'Choisir son lieu de travail habituel', nl: 'Zijn gewone werkplek kiezen' },
      when: { fr: 'Pour que votre bureau soit proposé d’office dans chaque demande.', nl: 'Opdat uw bureau standaard in elke aanvraag wordt voorgesteld.' },
      steps: [
        { fr: 'Cliquez sur votre nom en haut à droite, puis sur {{profil.lieu.title}}.', nl: 'Klik op uw naam rechtsboven en dan op {{profil.lieu.title}}.' },
        { fr: 'Cherchez votre bureau ou votre salle et choisissez-le.', nl: 'Zoek uw bureau of zaal en kies het.' },
        { fr: 'Cliquez sur {{common.save}}.', nl: 'Klik op {{common.save}}.' },
      ],
      result: { fr: 'Ce lieu est proposé d’office ; vous pouvez toujours en choisir un autre. {{profil.lieu.effacer}} retire ce choix.', nl: 'Deze plaats wordt standaard voorgesteld; u kunt altijd een andere kiezen. {{profil.lieu.effacer}} verwijdert die keuze.' },
      acces: { entite: true },
    },
    {
      title: { fr: 'Changer d’entité active', nl: 'Van actieve entiteit wisselen' },
      when: { fr: 'Quand vous avez des rôles à l’administration communale et au CPAS.', nl: 'Wanneer u rollen hebt bij het gemeentebestuur en bij het OCMW.' },
      steps: [
        { fr: 'Regardez en haut de l’écran le code de l’entité active.', nl: 'Bekijk bovenaan het scherm de code van de actieve entiteit.' },
        { fr: 'Cliquez sur le code de l’autre entité.', nl: 'Klik op de code van de andere entiteit.' },
      ],
      result: { fr: 'Chaque écran ne montre plus que les données de cette entité : demandes, lieux, questions de l’aide.', nl: 'Elk scherm toont dan alleen de gegevens van die entiteit: aanvragen, plaatsen, vragen van de hulp.' },
    },
    {
      title: { fr: 'Changer son mot de passe', nl: 'Zijn wachtwoord wijzigen' },
      when: { fr: 'Quand vous vous connectez par mot de passe et voulez en changer, ou quand l’application vous le demande.', nl: 'Wanneer u met een wachtwoord aanmeldt en het wilt wijzigen, of wanneer de toepassing erom vraagt.' },
      steps: [
        { fr: 'Cliquez sur votre nom en haut à droite, puis sur {{layout.password}}.', nl: 'Klik op uw naam rechtsboven en dan op {{layout.password}}.' },
        { fr: 'Encodez {{password.current}}, puis deux fois le nouveau, 12 caractères au moins.', nl: 'Vul {{password.current}} in, daarna tweemaal het nieuwe, minstens 12 tekens.' },
      ],
      result: { fr: '{{password.changed}}. Avec un compte Microsoft, le mot de passe se change chez Microsoft, pas ici.', nl: '{{password.changed}}. Met een Microsoft-account wijzigt u het wachtwoord bij Microsoft, niet hier.' },
    },
  ],
  faq: [
    // 0.18.0 (point 5 ; ERG-07).
    { q: { fr: 'La visite guidée s’ouvre de nouveau sur mon téléphone.', nl: 'De rondleiding opent opnieuw op mijn telefoon.' }, a: { fr: 'Elle s’ouvre une fois sur chaque appareil, et de nouveau quand vous recevez un rôle. Fermez-la par la croix ; vous la revoyez quand vous voulez dans {{nav.help}}, bouton {{visite.revoir}}.', nl: 'Ze opent eenmaal op elk toestel, en opnieuw wanneer u een rol krijgt. Sluit ze met het kruisje; u bekijkt ze opnieuw wanneer u wilt in {{nav.help}}, knop {{visite.revoir}}.' } },
    // 0.17.0 (étape 13) : cloche de notifications ; 0.21.3 (DV-180) : demande qui arrive au service technique.
    { q: { fr: 'À quoi sert la cloche en haut de l’écran ?', nl: 'Waarvoor dient de bel bovenaan het scherm?' }, a: { fr: 'Elle montre le nombre d’avis non lus de l’entité active : votre demande reçue, validée ou prise en charge, un nouveau message, une demande à valider, une échéance proche ; pour le service technique, chaque demande qui arrive (un danger est annoncé en priorité absolue). Touchez-la, puis touchez un avis pour ouvrir la demande. Les mêmes avis arrivent par courriel, dans votre langue.', nl: 'Ze toont het aantal ongelezen meldingen van de actieve entiteit: uw aanvraag ontvangen, goedgekeurd of in behandeling, een nieuw bericht, een goed te keuren aanvraag, een nabije vervaldag; voor de technische dienst elke aanvraag die binnenkomt (een gevaar wordt gemeld met absolute voorrang). Tik erop en tik dan op een melding om de aanvraag te openen. Dezelfde meldingen komen per e-mail, in uw taal.' } },
    { q: { fr: 'Une fenêtre « Nouveautés » s’ouvre à la connexion.', nl: 'Bij het aanmelden opent een venster « Nieuwigheden ».' }, a: { fr: 'Elle présente ce qui change pour vous dans la nouvelle version ; fermée, elle ne revient pas. Tout reste dans l’aide, onglet {{help.nouveautes}}.', nl: 'Het toont wat er voor u verandert in de nieuwe versie; eenmaal gesloten komt het niet terug. Alles blijft in de hulp, tabblad {{help.nouveautes}}.' } },
    // 0.13.0 (D1) : sur téléphone, la langue est dans le menu de la personne ; 0.21.5 (D-0.21.5-1) : aussi sur tablette et dans une fenêtre de moins de 1200 px.
    { q: { fr: 'Sur téléphone ou sur tablette, où changer la langue ?', nl: 'Waar wijzig ik de taal op een telefoon of een tablet?' }, a: { fr: 'Touchez vos initiales en haut à droite : le menu propose l’autre langue, avec le niveau de détail et le thème. C’est pareil sur une tablette ou dans une fenêtre réduite, où les boutons du haut gardent seulement leur icône (leur nom s’affiche au survol). Sur un grand écran, la langue reste dans l’en-tête.', nl: 'Tik op uw initialen rechtsboven: het menu stelt de andere taal voor, met het detailniveau en het thema. Dat geldt ook op een tablet of in een verkleind venster, waar de knoppen bovenaan enkel hun pictogram behouden (hun naam verschijnt als u erover beweegt). Op een groot scherm blijft de taal in de kop.' } },
    // 0.21.2 (DV-177) : saisie des dates sur ordinateur et sur téléphone ; 0.21.3 : icône à gauche, saisie non retenue (DV-176, DV-182) ; 0.21.4 : signalée dès la sortie du champ.
    { q: { fr: 'Comment saisir une date ou une heure ?', nl: 'Hoe geef ik een datum of uur in?' }, a: { fr: 'Sur ordinateur, tapez-la directement dans le champ, au format affiché (par exemple 24/11/2026 ou 24/11/2026 09:30) ; pour choisir dans le calendrier, cliquez sur l’icône à gauche du champ (la croix à droite efface la date). Sur téléphone, touchez le champ : le calendrier s’ouvre. Si le texte tapé n’est pas une date ou une heure valable, rien n’est enregistré : dès que vous quittez le champ, ou au plus tard quand vous enregistrez, le message « Date ou heure non retenue » s’affiche et le champ est entouré de rouge ; corrigez-le et recommencez.', nl: 'Op de computer typt u ze rechtstreeks in het veld, in de getoonde vorm (bijvoorbeeld 24/11/2026 of 24/11/2026 09:30); om in de kalender te kiezen, klikt u op het pictogram links van het veld (het kruisje rechts wist de datum). Op een telefoon tikt u op het veld: de kalender opent. Is de getypte tekst geen geldige datum of uur, dan wordt niets opgeslagen: zodra u het veld verlaat, of uiterlijk wanneer u opslaat, verschijnt de melding « Datum of uur niet aanvaard » en het veld wordt rood omrand; verbeter het en probeer opnieuw.' } },
    { q: { fr: 'Comment passer en mode Complet ?', nl: 'Hoe schakel ik naar de modus Volledig?' }, a: { fr: '{{layout.mode}} en haut de l’écran : Complet montre plus de colonnes et de détails ; sur téléphone, sur tablette ou dans une fenêtre réduite, il est dans le menu de votre nom.', nl: '{{layout.mode}} bovenaan het scherm: Volledig toont meer kolommen en details; op een telefoon, een tablet of in een verkleind venster staat het in het menu van uw naam.' } },
  ],
  seeAlso: ['nouvelle-demande', 'mes-demandes', 'help'],
  shots: [
    // 0.18.0 (point 5) : fenêtre de la recherche, remplie de « DI- ».
    { id: 'accueil-recherche', path: '/', actions: [{ clickSel: 'header .recherche-globale' }, { wait: 400 }, { fill: { sel: '.ant-modal input', value: 'DI-' } }, { wait: 1200 }], clip: 'modal', marks: [{ sel: '.ant-modal input' }, { sel: '.ant-modal section' }], caption: { fr: 'Rechercher une demande ou un lieu', nl: 'Een aanvraag of een plaats zoeken' } },
    { id: 'accueil-overview', path: '/', marks: [{ sel: '.home-action-primaire' }, { sel: '.ant-list' }, { sel: '.home-entite' }], caption: { fr: 'Accueil', nl: 'Startpagina' } },
  ],
};
export default topic;
