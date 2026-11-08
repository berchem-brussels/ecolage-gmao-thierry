/** Fiche d'aide « Patrimoine » : sites, bâtiments, niveaux, locaux et photos (REF-01 à 08 ; 0.12.0 ; filtre « Sans photo », 0.13.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'patrimoine', path: '/patrimoine', group: 'service', titleKey: 'nav.patrimoine', roles: ['gestionnaire', 'responsable', 'agent'],
  acces: { module: 'patrimoine', permission: 'lieux:lire' },
  purpose: {
    fr: "Le patrimoine de l'entité active, rangé en arbre : sites, bâtiments, niveaux et locaux, avec leur type, leur statut, leur adresse et une photo. Tout agent le consulte ; le gestionnaire technique et le responsable le tiennent à jour.",
    nl: 'Het patrimonium van de actieve entiteit, in een boom: sites, gebouwen, verdiepingen en lokalen, met hun soort, status, adres en een foto. Elke medewerker raadpleegt het; de technisch beheerder en de verantwoordelijke houden het bij.',
  },
  layout: [
    { fr: '[[1]] La recherche par code, nom ou adresse.', nl: '[[1]] Zoeken op code, naam of adres.' },
    { fr: '[[2]] L’arbre : un clic déplie un site ou un bâtiment, un clic sur un lieu ouvre sa fiche.', nl: '[[2]] De boom: een klik klapt een site of een gebouw open, een klik op een plaats opent de fiche.' },
  ],
  overviewShot: 'patrimoine-overview',
  procedures: [
    {
      title: { fr: 'Trouver un lieu et voir sa fiche', nl: 'Een plaats vinden en de fiche bekijken' },
      when: { fr: 'Pour connaître le code, l’adresse ou la photo d’un local.', nl: 'Om de code, het adres of de foto van een lokaal te kennen.' },
      steps: [
        { fr: 'Tapez un code, un nom ou une adresse dans la recherche, ou dépliez l’arbre.', nl: 'Typ een code, een naam of een adres in het zoekveld, of klap de boom open.' },
        { fr: 'Cliquez sur le lieu : la fiche montre type, statut, adresse, surface et photo.', nl: 'Klik op de plaats: de fiche toont soort, status, adres, oppervlakte en foto.' },
      ],
      result: { fr: 'La fiche s’ouvre à droite ; sur téléphone, en plein écran.', nl: 'De fiche opent rechts; op een telefoon schermvullend.' },
    },
    {
      title: { fr: 'Ajouter ou modifier un lieu', nl: 'Een plaats toevoegen of wijzigen' }, acces: { permission: 'lieux:gerer' },
      when: { fr: 'Quand un local, un niveau ou un bâtiment manque ou a changé.', nl: 'Wanneer een lokaal, een verdieping of een gebouw ontbreekt of veranderd is.' },
      steps: [
        { fr: '{{lieux.add.site}} pour un site nouveau ; sinon, ouvrez la fiche du lieu parent et cliquez sur le bouton « Ajouter » qui convient.', nl: '{{lieux.add.site}} voor een nieuwe site; anders opent u de fiche van de bovenliggende plaats en klikt u op de passende knop « Toevoegen ».' },
        { fr: 'Encodez un code court unique, les noms en français et en néerlandais et, pour un local, son type.', nl: 'Vul een unieke korte code in, de namen in het Frans en het Nederlands en, voor een lokaal, de soort.' },
        { fr: 'Pour corriger, ouvrez la fiche et cliquez sur {{common.edit}} ; {{lieux.field.parent}} déplace le lieu dans l’arbre.', nl: 'Om te verbeteren, opent u de fiche en klikt u op {{common.edit}}; {{lieux.field.parent}} verplaatst de plaats in de boom.' },
      ],
      result: { fr: 'Le lieu est proposé tout de suite dans les demandes. En mode Complet, un lieu vide se désactive avec un motif ; rien n’est supprimé.', nl: 'De plaats wordt meteen voorgesteld in de aanvragen. In de modus Volledig wordt een lege plaats gedeactiveerd met een reden; niets wordt verwijderd.' },
    },
    {
      title: { fr: 'Ajouter la photo d’un lieu', nl: 'De foto van een plaats toevoegen' }, acces: { permission: 'lieux:gerer' },
      when: { fr: 'Pour que le service technique et les ouvriers reconnaissent l’endroit.', nl: 'Opdat de technische dienst en de arbeiders de plek herkennen.' },
      steps: [
        { fr: 'Ouvrez la fiche du lieu et cliquez sur {{lieux.photo.add}}.', nl: 'Open de fiche van de plaats en klik op {{lieux.photo.add}}.' },
        { fr: 'Prenez la photo au téléphone ou choisissez un fichier ; ni personne ni plaque lisible.', nl: 'Neem de foto met de telefoon of kies een bestand; geen personen, geen leesbare nummerplaat.' },
      ],
      result: { fr: 'La photo est réduite et débarrassée de ses informations cachées (lieu GPS, appareil) avant l’envoi ; elle remplace la précédente.', nl: 'De foto wordt verkleind en ontdaan van haar verborgen informatie (gps-locatie, toestel) voor het verzenden; ze vervangt de vorige.' },
    },
    {
      // 0.13.0 (étape 8 ter, DV-101) : retrouver les lieux à photographier.
      title: { fr: 'Retrouver les lieux sans photo', nl: 'De plaatsen zonder foto terugvinden' },
      when: { fr: 'Pour savoir quels lieux il reste à photographier, par exemple avant une tournée.', nl: 'Om te weten welke plaatsen nog gefotografeerd moeten worden, bijvoorbeeld voor een ronde.' },
      steps: [
        { fr: 'Cochez {{lieux.sans_photo.tag}} au-dessus de l’arbre : le nombre entre parenthèses compte les lieux actifs sans photo.', nl: 'Vink {{lieux.sans_photo.tag}} aan boven de boom: het getal tussen haakjes telt de actieve plaatsen zonder foto.' },
        { fr: 'L’arbre ne garde que ces lieux, marqués {{lieux.sans_photo.tag}}, avec leurs parents pour vous y retrouver ; ouvrez un lieu pour ajouter sa photo.', nl: 'De boom houdt enkel die plaatsen over, gemarkeerd {{lieux.sans_photo.tag}}, met hun bovenliggende plaatsen om u te oriënteren; open een plaats om haar foto toe te voegen.' },
      ],
      result: { fr: 'Le filtre reste dans l’adresse de la page : vous pouvez l’envoyer à un collègue. Décochez la case pour revoir tout l’arbre.', nl: 'De filter blijft in het adres van de pagina: u kunt het naar een collega sturen. Vink het vakje uit om de hele boom terug te zien.' },
    },
  ],
  faq: [],
  seeAlso: ['listes', 'demandes-entite'],
  shots: [{ id: 'patrimoine-overview', path: '/patrimoine', marks: [{ sel: '.ant-input-search' }, { sel: '.ant-tree' }], caption: { fr: 'Patrimoine', nl: 'Patrimonium' } }],
};
export default topic;
