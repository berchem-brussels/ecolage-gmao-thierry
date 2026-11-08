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
    { q: { fr: 'Une fenêtre « Nouveautés » s’ouvre à la connexion.', nl: 'Bij het aanmelden opent een venster « Nieuwigheden ».' }, a: { fr: 'Elle présente ce qui change pour vous dans la nouvelle version ; fermée, elle ne revient pas. Tout reste dans l’aide, onglet {{help.nouveautes}}.', nl: 'Het toont wat er voor u verandert in de nieuwe versie; eenmaal gesloten komt het niet terug. Alles blijft in de hulp, tabblad {{help.nouveautes}}.' } },
    // 0.13.0 (D1) : sur téléphone, la langue est dans le menu de la personne.
    { q: { fr: 'Sur téléphone, où changer la langue ?', nl: 'Waar wijzig ik de taal op een telefoon?' }, a: { fr: 'Touchez vos initiales en haut à droite : le menu propose l’autre langue, avec le niveau de détail et le thème. Sur un grand écran, la langue reste dans l’en-tête.', nl: 'Tik op uw initialen rechtsboven: het menu stelt de andere taal voor, met het detailniveau en het thema. Op een groot scherm blijft de taal in de kop.' } },
    { q: { fr: 'Comment passer en mode Complet ?', nl: 'Hoe schakel ik naar de modus Volledig?' }, a: { fr: '{{layout.mode}} en haut de l’écran : Complet montre plus de colonnes et de détails ; sur téléphone, il est dans le menu de votre nom.', nl: '{{layout.mode}} bovenaan het scherm: Volledig toont meer kolommen en details; op een telefoon staat het in het menu van uw naam.' } },
  ],
  seeAlso: ['nouvelle-demande', 'mes-demandes', 'help'],
  shots: [
    { id: 'accueil-overview', path: '/', marks: [{ sel: '.home-action-primaire' }, { sel: '.ant-list' }, { sel: '.home-entite' }], caption: { fr: 'Accueil', nl: 'Startpagina' } },
  ],
};
export default topic;
