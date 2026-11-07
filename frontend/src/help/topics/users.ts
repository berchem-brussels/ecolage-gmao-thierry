/** Fiche d'aide « Utilisateurs et rôles » (ROL-01 à 06, TEC-03 ; 0.12.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'users', path: '/users', group: 'admin', titleKey: 'nav.users', roles: ['admin'],
  acces: { admin: true },
  purpose: {
    fr: "Les comptes des personnes et leurs rôles, entité par entité : demandeur, gestionnaire technique, responsable, ouvrier, lecteur… L'accès à l'administration se règle à part et ne donne aucun accès métier.",
    nl: 'De accounts van de personen en hun rollen, entiteit per entiteit: aanvrager, technisch beheerder, verantwoordelijke, arbeider, lezer… De toegang tot het beheer wordt apart ingesteld en geeft geen toegang tot vakgegevens.',
  },
  layout: [
    { fr: '[[1]] Le bouton {{common.create}}.', nl: '[[1]] De knop {{common.create}}.' },
    { fr: '[[2]] La liste : compte Microsoft rattaché, accès de secours, rôles par entité ; {{users.roles.edit}} dans chaque ligne.', nl: '[[2]] De lijst: gekoppeld Microsoft-account, noodtoegang, rollen per entiteit; {{users.roles.edit}} in elke rij.' },
  ],
  overviewShot: 'users-overview',
  procedures: [
    {
      title: { fr: 'Créer un compte', nl: 'Een account aanmaken' },
      when: { fr: 'Pour une personne qui n’a pas encore de compte.', nl: 'Voor een persoon die nog geen account heeft.' },
      steps: [
        { fr: 'Cliquez sur {{common.create}} ; encodez l’adresse professionnelle, le prénom, le nom et l’entité de rattachement.', nl: 'Klik op {{common.create}}; vul het professionele adres, de voornaam, de naam en de entiteit van aansluiting in.' },
        { fr: 'Choisissez {{users.password.generated}} ou un mot de passe encodé, puis enregistrez.', nl: 'Kies {{users.password.generated}} of een ingegeven wachtwoord, en sla op.' },
        { fr: 'Transmettez le mot de passe généré : il ne s’affiche qu’une fois. Avec Microsoft, la personne se connecte par son compte de l’administration.', nl: 'Geef het gegenereerde wachtwoord door: het verschijnt maar één keer. Met Microsoft meldt de persoon aan met haar account van het bestuur.' },
      ],
      result: { fr: 'La personne est demandeur dans son entité de rattachement.', nl: 'De persoon is aanvrager in haar entiteit van aansluiting.' },
    },
    {
      title: { fr: 'Donner ou retirer un rôle', nl: 'Een rol geven of intrekken' },
      when: { fr: 'Quand une personne rejoint le service technique, ou le quitte.', nl: 'Wanneer een persoon bij de technische dienst komt, of hem verlaat.' },
      steps: [
        { fr: 'Cliquez sur {{users.roles.edit}} dans la ligne de la personne.', nl: 'Klik op {{users.roles.edit}} in de rij van de persoon.' },
        { fr: 'Cochez ses rôles dans chaque entité ; réglez à part l’accès à l’administration.', nl: 'Vink haar rollen aan in elke entiteit; stel de toegang tot het beheer apart in.' },
        { fr: 'Un rôle décoché demande le motif du retrait.', nl: 'Een uitgevinkte rol vraagt de reden van de intrekking.' },
      ],
      result: { fr: 'Le changement vaut à la prochaine action de la personne. Le dernier administrateur actif ne peut être ni désactivé ni rétrogradé.', nl: 'De wijziging geldt bij de volgende actie van de persoon. De laatste actieve beheerder kan niet gedeactiveerd of gedegradeerd worden.' },
    },
  ],
  faq: [{ q: { fr: 'Qu’est-ce que l’accès de secours ?', nl: 'Wat is de noodtoegang?' }, a: { fr: 'En mode Microsoft obligatoire, un ou deux administrateurs gardent la connexion par mot de passe, au cas où Microsoft serait indisponible.', nl: 'In de modus Microsoft verplicht behouden een of twee beheerders de aanmelding met wachtwoord, voor het geval Microsoft onbeschikbaar is.' } }],
  seeAlso: ['entites', 'parametres'],
  shots: [{ id: 'users-overview', path: '/users', marks: [{ sel: '.page-header button' }, { sel: '.ant-table' }], caption: { fr: 'Utilisateurs et rôles', nl: 'Gebruikers en rollen' } }],
};
export default topic;
